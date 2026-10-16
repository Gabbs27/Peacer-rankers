import https from "node:https";
import { EventEmitter } from "node:events";
import type { LiveSnapshot } from "../shared/types";

const POLL_MS = 2000;

interface LivePlayer {
  riotId?: string;
  riotIdGameName?: string;
  riotIdTagLine?: string;
  summonerName?: string;
  isDead?: boolean;
  level?: number;
}

/** Your entry in the player list: the API names players by Riot ID (older builds: summoner name). */
export function toLiveSnapshot(activeName: unknown, players: unknown, stats: unknown): LiveSnapshot | null {
  if (typeof activeName !== "string" || !Array.isArray(players)) return null;
  const gameName = activeName.split("#")[0];
  const list = players as LivePlayer[];
  const me =
    list.find((p) => p.riotId === activeName || p.summonerName === activeName) ??
    list.find((p) => `${p.riotIdGameName}#${p.riotIdTagLine}` === activeName) ??
    list.find((p) => p.riotIdGameName === gameName || p.summonerName === gameName);
  if (!me) return null;
  const gameTime = (stats as { gameTime?: unknown } | null)?.gameTime;
  return {
    dead: me.isDead === true,
    level: typeof me.level === "number" ? me.level : 0,
    gameTime: typeof gameTime === "number" ? gameTime : 0,
  };
}

function get(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      // The game serves Riot's Live Client Data API on 127.0.0.1:2999 with a self-signed certificate.
      { host: "127.0.0.1", port: 2999, path, rejectUnauthorized: false, timeout: 1500 },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          if ((res.statusCode ?? 0) >= 400) return reject(new Error(`live client ${res.statusCode}`));
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("live client timeout")));
    req.on("error", reject);
  });
}

/**
 * Reads, every 2 s while a game runs, whether you're dead, your level and the
 * game time, from Riot's official local API for third-party tools. Only used
 * to decide how much static information the overlay shows.
 */
export class LiveClient extends EventEmitter<{ snapshot: [LiveSnapshot | null] }> {
  private timer: NodeJS.Timeout | null = null;
  private last: string | null = null;

  start(): void {
    if (this.timer) return;
    const tick = async () => {
      const snapshot = await Promise.all([
        get("/liveclientdata/activeplayername"),
        get("/liveclientdata/playerlist"),
        get("/liveclientdata/gamestats"),
      ])
        .then(([name, players, stats]) => toLiveSnapshot(name, players, stats))
        .catch(() => null);
      if (!this.timer) return;
      this.publish(snapshot);
      this.timer = setTimeout(tick, POLL_MS);
    };
    this.timer = setTimeout(tick, 0);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.publish(null);
  }

  /** Only real changes go out: the game time moves every tick, the overlay only cares in steps. */
  private publish(snapshot: LiveSnapshot | null): void {
    const key = snapshot ? `${snapshot.dead}|${snapshot.level}|${Math.min(Math.floor(snapshot.gameTime / 30), 4)}` : null;
    if (key === this.last) return;
    this.last = key;
    this.emit("snapshot", snapshot);
  }
}
