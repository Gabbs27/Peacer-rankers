import { EventEmitter } from "node:events";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  addGame,
  emptyStore,
  MAYHEM_QUEUE,
  patchesNewestFirst,
  totalGames,
  type ClientGame,
  type MayhemStore,
} from "@/lib/mayhem";
import type { LcuClient } from "../actions";
import { LcuError } from "../lcu/http";
import type { MayhemStatus } from "../../shared/types";

interface HistoryPage {
  games?: { games?: { gameId: number; queueId: number }[] };
}

interface GameDetail extends ClientGame {
  participantIdentities?: { player?: { puuid?: string } }[];
}

export interface CollectorOptions {
  /** Pause between requests to the client while following other players. */
  delayMs: number;
  /** New games per "Analizar más" run. */
  perRun: number;
  ownHistory: number;
  theirHistory: number;
  saveEvery: number;
}

const DEFAULTS: CollectorOptions = { delayMs: 1200, perRun: 250, ownHistory: 100, theirHistory: 20, saveEvery: 10 };
const MAX_FAILURES = 5;
/** Enough players for many runs; more would only grow memory. */
const MAX_QUEUE = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** User-facing message plus what the client answered, to make failures diagnosable. */
function describe(message: string, error: unknown): string {
  if (error instanceof LcuError) return `${message} (${error.status}: ${error.message})`;
  return error instanceof Error ? `${message} (${error.message})` : message;
}

/**
 * Reads ARAM: Mayhem games from the League client (Riot's public API doesn't
 * serve them) and accumulates them into a local JSON file. Your own games are
 * read on every connection; "analizar más" follows the players of those games,
 * slowly and only while you're not playing. Only counts and game ids are
 * stored: the queue of players to visit lives in memory, so each run picks up
 * where the last one stopped until the app closes.
 */
export class MayhemCollector extends EventEmitter<{ status: [MayhemStatus] }> {
  private store: MayhemStore = emptyStore();
  private seen = new Set<number>();
  private running = false;
  private stopRequested = false;
  private runAdded = 0;
  private runTarget = 0;
  private error: string | null = null;
  private unsaved = 0;
  private queue: string[] = [];
  private visited = new Set<string>();

  constructor(
    private readonly file: string,
    private readonly opts: CollectorOptions = DEFAULTS
  ) {
    super();
  }

  async load(): Promise<void> {
    try {
      const data = JSON.parse(await readFile(this.file, "utf8")) as MayhemStore;
      if (data?.version === 1 && Array.isArray(data.seen) && data.patches && typeof data.patches === "object") {
        this.store = data;
        this.seen = new Set(data.seen);
      }
    } catch {
      // First run, or an unreadable file: start empty rather than crash.
    }
    this.emitStatus();
  }

  get data(): MayhemStore {
    return this.store;
  }

  status(): MayhemStatus {
    return {
      games: totalGames(this.store),
      patch: patchesNewestFirst(this.store)[0] ?? null,
      running: this.running,
      runAdded: this.runAdded,
      runTarget: this.runTarget,
      error: this.error,
    };
  }

  stop(): void {
    this.stopRequested = true;
  }

  /** Forgets the players to visit: another account may log in next. */
  forgetPlayers(): void {
    this.queue = [];
    this.visited.clear();
  }

  /** Your own recent Mayhem games: a few requests, run on connect and after each game. */
  async collectOwn(client: LcuClient): Promise<number> {
    if (this.running) return 0;
    const before = totalGames(this.store);
    try {
      const page = await client.get<HistoryPage>(
        `/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=${this.opts.ownHistory}`
      );
      for (const g of page.games?.games ?? []) {
        if (g.queueId !== MAYHEM_QUEUE || this.seen.has(g.gameId)) continue;
        await this.fetchGame(client, g.gameId);
        await sleep(this.opts.delayMs / 4);
      }
      this.error = null;
    } catch (error) {
      this.error = describe("No se pudo leer tu historial de Mayhem del cliente", error);
    }
    await this.save();
    this.emitStatus();
    return totalGames(this.store) - before;
  }

  /** Follows the players of your recent games to find more Mayhem games. */
  async expand(client: LcuClient, canRun: () => boolean): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopRequested = false;
    this.runAdded = 0;
    this.runTarget = this.opts.perRun;
    this.error = null;
    this.emitStatus();

    const enqueue = (game: GameDetail | null) => {
      for (const identity of game?.participantIdentities ?? []) {
        const puuid = identity.player?.puuid;
        if (puuid && !this.visited.has(puuid) && this.queue.length < MAX_QUEUE) {
          this.visited.add(puuid);
          this.queue.push(puuid);
        }
      }
    };
    const keepGoing = () => !this.stopRequested && this.runAdded < this.runTarget && canRun();

    try {
      // Seed with the players of your own recent Mayhem games, unless a previous run left some to visit.
      if (this.queue.length === 0) {
        const own = await client.get<HistoryPage>(
          `/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=${this.opts.theirHistory}`
        );
        for (const g of own.games?.games ?? []) {
          if (!keepGoing()) break;
          if (g.queueId !== MAYHEM_QUEUE) continue;
          enqueue(await this.fetchGame(client, g.gameId));
          await sleep(this.opts.delayMs);
        }
      }

      let failures = 0;
      while (this.queue.length > 0 && keepGoing()) {
        const puuid = this.queue.shift()!;
        try {
          const page = await client.get<HistoryPage>(
            `/lol-match-history/v1/products/lol/${encodeURIComponent(puuid)}/matches?begIndex=0&endIndex=${this.opts.theirHistory}`
          );
          failures = 0;
          await sleep(this.opts.delayMs);
          for (const g of page.games?.games ?? []) {
            if (!keepGoing()) break;
            if (g.queueId !== MAYHEM_QUEUE || this.seen.has(g.gameId)) continue;
            enqueue(await this.fetchGame(client, g.gameId));
            await sleep(this.opts.delayMs);
          }
        } catch {
          if (++failures >= MAX_FAILURES) {
            this.error = "El cliente dejó de responder; vuelve a intentarlo más tarde.";
            break;
          }
          await sleep(this.opts.delayMs * 5);
        }
      }
      if (this.runAdded === 0 && !this.error && keepGoing()) {
        this.error = "No aparecieron partidas nuevas de Mayhem; prueba después de jugar alguna más.";
      }
    } catch (error) {
      this.error = describe("No se pudo leer el historial del cliente", error);
    } finally {
      this.running = false;
      await this.save().catch(() => {});
      this.emitStatus();
    }
  }

  private async fetchGame(client: LcuClient, gameId: number): Promise<GameDetail | null> {
    try {
      const game = await client.get<GameDetail>(`/lol-match-history/v1/games/${gameId}`);
      if (addGame(this.store, this.seen, game)) {
        if (this.running) this.runAdded++;
        if (++this.unsaved >= this.opts.saveEvery) await this.save();
        this.emitStatus();
      }
      return game;
    } catch {
      return null;
    }
  }

  private async save(): Promise<void> {
    if (this.unsaved === 0) return;
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify(this.store));
    await rename(tmp, this.file);
    this.unsaved = 0;
  }

  private emitStatus(): void {
    this.emit("status", this.status());
  }
}
