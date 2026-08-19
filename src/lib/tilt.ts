// Session and fatigue analysis: does the player get worse the longer they play,
// and at which hours do they perform best? Pure arithmetic over gameCreation —
// no extra API calls, and it answers a question no tracker usually asks:
// "when should I stop?".

import type { MatchData } from "./types";
import { isRemake } from "./scoring";

/** Games further apart than this start a new session. */
export const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

export interface Bucket {
  label: string;
  games: number;
  wins: number;
  winrate: number; // 0-100
}

export interface HourBucket extends Bucket {
  hour: number;
}

export interface TiltStats {
  totalGames: number;
  sessions: number;
  /** Winrate by how deep into a session the game was (1st, 2nd, 3rd, 4th+). */
  byDepth: Bucket[];
  /** Winrate in games played right after two consecutive losses. */
  afterTwoLosses: Bucket | null;
  /** Winrate by local hour of day, only hours with games. */
  byHour: HourBucket[];
  /** Actionable sentence, or null when nothing stands out. */
  verdict: string | null;
}

interface Game {
  win: boolean;
  createdAt: number;
}

function bucket(label: string, games: Game[]): Bucket {
  const wins = games.filter((g) => g.win).length;
  return {
    label,
    games: games.length,
    wins,
    winrate: games.length > 0 ? Math.round((wins / games.length) * 100) : 0,
  };
}

/**
 * @param matches newest-first, as Riot returns them
 * @param hourOf resolves a timestamp to an hour; injected so callers can decide
 *        between local and UTC (the default is the runtime's local hour)
 */
export function analyzeTilt(
  matches: MatchData[],
  puuid: string,
  hourOf: (timestamp: number) => number = (t) => new Date(t).getHours()
): TiltStats | null {
  const games: Game[] = [];
  for (const m of matches) {
    if (isRemake(m.info)) continue;
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (!player) continue;
    games.push({ win: player.win, createdAt: m.info.gameCreation });
  }
  if (games.length < 6) return null;

  // Oldest first, so "depth within a session" counts forward in time.
  const chronological = [...games].sort((a, b) => a.createdAt - b.createdAt);

  const depthBuckets: Game[][] = [[], [], [], []]; // 1st, 2nd, 3rd, 4th+
  const afterTwoLosses: Game[] = [];
  let sessions = 0;
  let depth = 0;
  let lastAt: number | null = null;
  let lossStreak = 0;

  for (const game of chronological) {
    const newSession = lastAt === null || game.createdAt - lastAt > SESSION_GAP_MS;
    if (newSession) {
      sessions++;
      depth = 0;
      lossStreak = 0; // a break resets the tilt streak
    }
    depthBuckets[Math.min(depth, 3)].push(game);

    if (lossStreak >= 2) afterTwoLosses.push(game);

    lossStreak = game.win ? 0 : lossStreak + 1;
    depth++;
    lastAt = game.createdAt;
  }

  const byDepth = [
    bucket("1ª de la sesión", depthBuckets[0]),
    bucket("2ª", depthBuckets[1]),
    bucket("3ª", depthBuckets[2]),
    bucket("4ª o más", depthBuckets[3]),
  ].filter((b) => b.games > 0);

  // Hour buckets
  const byHourMap = new Map<number, Game[]>();
  for (const game of chronological) {
    const h = hourOf(game.createdAt);
    byHourMap.set(h, [...(byHourMap.get(h) ?? []), game]);
  }
  const byHour: HourBucket[] = [...byHourMap.entries()]
    .map(([hour, list]) => ({ hour, ...bucket(`${hour}:00`, list) }))
    .sort((a, b) => a.hour - b.hour);

  return {
    totalGames: games.length,
    sessions,
    byDepth,
    afterTwoLosses: afterTwoLosses.length >= 3 ? bucket("Tras 2 derrotas seguidas", afterTwoLosses) : null,
    byHour,
    verdict: buildVerdict(byDepth, afterTwoLosses.length >= 3 ? bucket("x", afterTwoLosses) : null),
  };
}

function buildVerdict(byDepth: Bucket[], afterTwoLosses: Bucket | null): string | null {
  const early = byDepth.filter((b) => b.label === "1ª de la sesión" || b.label === "2ª");
  const late = byDepth.filter((b) => b.label === "3ª" || b.label === "4ª o más");

  const sum = (list: Bucket[]) =>
    list.reduce((acc, b) => ({ games: acc.games + b.games, wins: acc.wins + b.wins }), {
      games: 0,
      wins: 0,
    });

  const e = sum(early);
  const l = sum(late);

  if (e.games >= 4 && l.games >= 4) {
    const eWr = Math.round((e.wins / e.games) * 100);
    const lWr = Math.round((l.wins / l.games) * 100);
    if (eWr - lWr >= 15) {
      return `Tu winrate cae de ${eWr}% en las 2 primeras partidas a ${lWr}% de la 3ª en adelante. Considera parar tras 2 partidas seguidas.`;
    }
    if (lWr - eWr >= 15) {
      return `Rindes mejor cuando llevas rato jugando (${lWr}% de la 3ª en adelante vs ${eWr}% al empezar). Dedica las primeras partidas a calentar.`;
    }
  }

  if (afterTwoLosses && afterTwoLosses.games >= 3 && afterTwoLosses.winrate <= 35) {
    return `Después de 2 derrotas seguidas ganas solo ${afterTwoLosses.winrate}% (${afterTwoLosses.games} partidas). Ese es el momento de cerrar el cliente.`;
  }

  return null;
}
