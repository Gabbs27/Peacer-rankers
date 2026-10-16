// Loading-screen scouting: turns a player's solo-queue entry and their mastery
// on the champion they locked into a few readable signals. Only runs once the
// game has started, when names are public again (champion select hides them).

import type { LeagueEntry } from "./types";
import { getTierLabel } from "./scoring";

export interface ScoutMastery {
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
}

export interface ScoutInput {
  championName: string;
  soloQueue: LeagueEntry | null;
  /** null when the player has never played the champion. */
  mastery: ScoutMastery | null;
}

/** threat = watch out, opportunity = something to exploit, info = context. */
export type ScoutTone = "threat" | "opportunity" | "info";

export interface ScoutSignal {
  tone: ScoutTone;
  text: string;
}

export interface ScoutReport {
  rank: string | null;
  winrate: number | null;
  games: number;
  signals: ScoutSignal[];
}

const DAY_MS = 86_400_000;
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function points(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k pts` : `${n} pts`;
}

export function scoutPlayer(input: ScoutInput, now: number): ScoutReport {
  const { championName, soloQueue, mastery } = input;
  const signals: ScoutSignal[] = [];

  // Experience on the champion they are playing right now.
  const pts = mastery?.championPoints ?? 0;
  if (pts < 1_000) {
    signals.push({ tone: "opportunity", text: `Primera vez (o casi) con ${championName}` });
  } else if (pts < 20_000) {
    signals.push({ tone: "opportunity", text: `Poca experiencia con ${championName} (${points(pts)})` });
  } else if (pts >= 200_000) {
    signals.push({ tone: "threat", text: `Especialista en ${championName} (${points(pts)})` });
  }
  if (mastery && pts >= 20_000) {
    const days = Math.floor((now - mastery.lastPlayTime) / DAY_MS);
    if (days >= 90) {
      signals.push({
        tone: "opportunity",
        text: `No jugaba ${championName} desde hace ${Math.floor(days / 30)} meses`,
      });
    }
  }

  if (!soloQueue) {
    signals.push({ tone: "info", text: "Sin clasificar en Solo/Duo" });
    return { rank: null, winrate: null, games: 0, signals };
  }

  const games = soloQueue.wins + soloQueue.losses;
  const winrate = games > 0 ? Math.round((soloQueue.wins / games) * 100) : null;
  const division = APEX_TIERS.has(soloQueue.tier) ? "" : ` ${soloQueue.rank}`;
  const rank = `${getTierLabel(soloQueue.tier)}${division} · ${soloQueue.leaguePoints} LP`;

  if (soloQueue.hotStreak) signals.push({ tone: "threat", text: "En racha de victorias" });
  if (winrate !== null && games >= 50) {
    if (winrate >= 58) signals.push({ tone: "threat", text: `${winrate}% de victorias en ${games} partidas` });
    else if (winrate <= 45) signals.push({ tone: "opportunity", text: `${winrate}% de victorias en ${games} partidas` });
  }
  if (soloQueue.freshBlood) signals.push({ tone: "info", text: "Recién llegado a su división" });
  if (soloQueue.veteran) signals.push({ tone: "info", text: "Veterano: 100+ partidas en su división" });

  return { rank, winrate, games, signals };
}

/** One player of your current game, as returned by /api/scout. */
export interface ScoutedPlayer extends ScoutReport {
  puuid: string;
  teamId: number;
  championId: number;
  /** Localized display name, e.g. "Wukong". */
  championName: string;
  riotId: string | null;
  /** Riot data could not be read for this player right now. */
  unavailable?: true;
}

const PUUID_RE = /^[A-Za-z0-9_-]{20,100}$/;

/** Shape check for a Riot API PUUID before it goes into a Riot URL. */
export function isPuuid(value: unknown): value is string {
  return typeof value === "string" && PUUID_RE.test(value);
}
