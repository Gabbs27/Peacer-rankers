import { afterEach, describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ClientGame } from "@/lib/mayhem";
import { LcuError } from "../lcu/http";
import type { LcuClient } from "../actions";
import { MayhemCollector } from "./collector";
import { parseAugmentCatalog, cdragonUrl } from "../../shared/augments";
import { championInsights } from "./insights";

const FAST = { delayMs: 0, perRun: 100, ownHistory: 100, theirHistory: 20, saveEvery: 2 };
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function tempFile() {
  const dir = await mkdtemp(join(tmpdir(), "mayhem-"));
  dirs.push(dir);
  return join(dir, "mayhem-stats.json");
}

/** A Mayhem game where every participant is a different player id (p<gameId>-<i>). */
function game(gameId: number, opts: { queueId?: number; championId?: number; augment?: number } = {}): ClientGame & {
  participantIdentities: { player: { puuid: string } }[];
} {
  return {
    gameId,
    queueId: opts.queueId ?? 2400,
    gameVersion: "16.20.824.8524",
    gameDuration: 1200,
    participants: Array.from({ length: 10 }, (_, i) => ({
      championId: i === 0 ? (opts.championId ?? 233) : 100 + i,
      spell1Id: 4,
      spell2Id: 32,
      stats: { win: i < 5, playerAugment1: opts.augment ?? 1152 },
    })),
    participantIdentities: Array.from({ length: 10 }, (_, i) => ({ player: { puuid: `p${gameId}-${i}` } })),
  };
}

/** Fake client: your history, other players' histories and game details. */
function fakeClient(opts: { own: number[]; others?: Record<string, number[]>; games: Record<number, ReturnType<typeof game>> }) {
  const calls: string[] = [];
  const history = (ids: number[]) => ({ games: { games: ids.map((id) => ({ gameId: id, queueId: opts.games[id]?.queueId ?? 2400 })) } });
  const client: LcuClient = {
    get: async <T,>(path: string) => {
      calls.push(path);
      if (path.startsWith("/lol-match-history/v1/products/lol/current-summoner/")) return history(opts.own) as T;
      const other = /\/products\/lol\/([^/]+)\/matches/.exec(path);
      if (other) return history(opts.others?.[decodeURIComponent(other[1])] ?? []) as T;
      const detail = /\/lol-match-history\/v1\/games\/(\d+)$/.exec(path);
      if (detail && opts.games[Number(detail[1])]) return opts.games[Number(detail[1])] as T;
      throw new LcuError(404, "not found");
    },
    request: async () => {
      throw new Error("the collector must never write to the client");
    },
  };
  return { client, calls };
}

describe("MayhemCollector", () => {
  it("adds your own Mayhem games once, ignores other queues and persists to disk", async () => {
    const file = await tempFile();
    const games = { 1: game(1), 2: game(2), 3: game(3, { queueId: 450 }) };
    const { client, calls } = fakeClient({ own: [1, 2, 3], games });

    const collector = new MayhemCollector(file, FAST);
    await collector.load();
    expect(await collector.collectOwn(client)).toBe(2);
    expect(await collector.collectOwn(client)).toBe(0); // nothing new the second time
    expect(calls.filter((c) => c.includes("/games/"))).toEqual(["/lol-match-history/v1/games/1", "/lol-match-history/v1/games/2"]);

    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.seen).toEqual([1, 2]);
    expect(saved.patches["16.20"].games).toBe(2);
    // Only counts: no player ids are written.
    expect(JSON.stringify(saved)).not.toContain("p1-");

    const reloaded = new MayhemCollector(file, FAST);
    await reloaded.load();
    expect(reloaded.status()).toMatchObject({ games: 2, patch: "16.20" });
  });

  it("follows the players of your games to find more, up to the run size", async () => {
    const file = await tempFile();
    const games = { 1: game(1), 10: game(10), 11: game(11), 12: game(12) };
    const { client } = fakeClient({ own: [1], others: { "p1-3": [10, 11], "p10-4": [12] }, games });

    const collector = new MayhemCollector(file, { ...FAST, perRun: 3 });
    await collector.load();
    await collector.collectOwn(client);
    await collector.expand(client, () => true);
    expect(collector.status()).toMatchObject({ games: 4, running: false, runAdded: 3, runTarget: 3 });
  });

  it("picks up where the previous run stopped, until the account changes", async () => {
    const file = await tempFile();
    const games = { 1: game(1), 10: game(10), 11: game(11) };
    const { client, calls } = fakeClient({ own: [1], others: { "p1-3": [10], "p1-4": [11] }, games });
    const collector = new MayhemCollector(file, { ...FAST, perRun: 1 });
    await collector.load();
    await collector.collectOwn(client);
    await collector.expand(client, () => true);
    expect(collector.status()).toMatchObject({ games: 2, runAdded: 1 });

    const before = calls.length;
    await collector.expand(client, () => true);
    expect(collector.status()).toMatchObject({ games: 3, runAdded: 1, error: null });
    expect(calls.slice(before).some((c) => c.includes("current-summoner"))).toBe(false); // no starting over

    collector.forgetPlayers();
    await collector.expand(client, () => true);
    expect(calls.at(-1)).toContain("/products/lol/p1-9/"); // seeded again from your games
    expect(collector.status()).toMatchObject({ games: 3, runAdded: 0, error: expect.stringContaining("No aparecieron") });
  });

  it("stops following players as soon as you start playing", async () => {
    const file = await tempFile();
    const games = { 1: game(1), 10: game(10), 11: game(11) };
    const { client } = fakeClient({ own: [1], others: { "p1-3": [10, 11] }, games });
    let idle = true;
    const collector = new MayhemCollector(file, FAST);
    await collector.load();
    await collector.collectOwn(client); // the app always does this on connect
    collector.on("status", (s) => {
      if (s.runAdded === 1) idle = false; // a game starts after the first new game
    });
    await collector.expand(client, () => idle);
    expect(collector.status()).toMatchObject({ games: 2, running: false, runAdded: 1 });
  });
});

describe("augment catalog and insights", () => {
  it("maps client asset paths to CommunityDragon and rarities to names", () => {
    const catalog = parseAugmentCatalog([
      { id: 1152, nameTRA: "Steel Your Heart", rarity: "kGold", augmentSmallIconPath: "/lol-game-data/assets/ASSETS/UX/Cherry/Augments/Icons/Quest_SteelYourHeart_small.png" },
      { id: 1413, nameTRA: "Stuck In Here With Me", rarity: "kPrismatic" },
      { nope: true },
    ]);
    expect(catalog.get(1152)).toEqual({
      name: "Steel Your Heart",
      rarity: "gold",
      icon: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/ux/cherry/augments/icons/quest_steelyourheart_small.png",
    });
    expect(catalog.get(1413)).toMatchObject({ rarity: "prismatic", icon: null });
    expect(catalog.size).toBe(2);
    expect(cdragonUrl("https://evil.example/x.png")).toBeNull();
  });

  it("joins the stats with names, and falls back when the catalog lacks an augment", async () => {
    const file = await tempFile();
    const games = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i + 1, game(i + 1, { augment: i < 5 ? 1152 : 9999 })]));
    const { client } = fakeClient({ own: Object.keys(games).map(Number), games });
    const collector = new MayhemCollector(file, FAST);
    await collector.load();
    await collector.collectOwn(client);
    const catalog = parseAugmentCatalog([{ id: 1152, nameTRA: "Steel Your Heart", rarity: "kGold" }]);
    const [briar] = championInsights(collector.data, catalog, [233]);
    expect(briar).toMatchObject({ championId: 233, games: 6, winrate: 100 });
    expect(briar.augments[0]).toMatchObject({ augmentId: 1152, name: "Steel Your Heart", rarity: "gold", games: 5 });
  });
});
