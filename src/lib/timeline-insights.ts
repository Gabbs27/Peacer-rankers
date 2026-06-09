// Pure analysis over a Match-V5 TIMELINE: per-minute series, laning-phase diffs
// vs the lane opponent, item build order, and rule-based mistake flags.
// No I/O here — everything is computed from (timeline, match, puuid) so it is
// trivially unit-testable and runs server-side in the API route.

import type { MatchData, TimelineData } from "./types";

export interface TimelinePoint {
  minute: number;
  gold: number;
  xp: number;
  cs: number;
}

export interface GoldDiffPoint {
  minute: number;
  diff: number; // player gold - opponent gold
}

export interface LaningStats {
  csAt10: number;
  csAt14: number | null; // null when the game ended before minute 14
  goldDiffAt10: number | null;
  goldDiffAt14: number | null;
  xpDiffAt10: number | null;
  opponentChampion: string | null;
}

export interface BuildEvent {
  itemId: number;
  minute: number;
}

export interface TimelineFlag {
  severity: "good" | "warn" | "bad";
  message: string;
  minute?: number;
}

export interface TimelineInsights {
  playerChampion: string;
  opponentChampion: string | null;
  goldDiffSeries: GoldDiffPoint[] | null;
  laning: LaningStats | null;
  buildOrder: BuildEvent[];
  flags: TimelineFlag[];
}

// Consumables we hide from the displayed build order (they add noise, not decisions).
const HIDDEN_PURCHASES = new Set([
  2003, // Health Potion
  2010, // Biscuit
  2031, // Refillable Potion
  2033, // Corrupting Potion
  2055, // Control Ward (counted separately for the vision flag)
  2138, 2139, 2140, // Elixirs
  3340, 3363, 3364, // Trinkets
]);

const CONTROL_WARD_ID = 2055;
const LANER_POSITIONS = new Set(["TOP", "MIDDLE", "BOTTOM"]);
const SUMMONERS_RIFT_MAP_ID = 11;

// Frames sit on minute boundaries (plus a partial final frame) — round is right.
// Events happen mid-minute: 9:59 must count as minute 9, so events use floor.
function frameMinute(timestamp: number): number {
  return Math.round(timestamp / 60000);
}

function eventMinute(timestamp: number): number {
  return Math.floor(timestamp / 60000);
}

/** participantId (1-10) for a puuid. Prefers the documented info.participants
 * mapping; falls back to the metadata.participants index+1 convention. */
function participantIdFor(timeline: TimelineData, puuid: string): number | null {
  const documented = timeline.info.participants?.find((p) => p.puuid === puuid)?.participantId;
  if (typeof documented === "number") return documented;
  const idx = timeline.metadata.participants.indexOf(puuid);
  return idx === -1 ? null : idx + 1;
}

/** Per-minute series for one participant. The final timeline frame is partial
 * (timestamp = game end); when it rounds to an already-seen minute we keep the
 * later (end-of-game) values instead of emitting a duplicate point. */
function extractSeries(timeline: TimelineData, participantId: number): TimelinePoint[] {
  const series: TimelinePoint[] = [];
  for (const frame of timeline.info.frames) {
    const pf = frame.participantFrames?.[String(participantId)];
    if (!pf) continue;
    const point: TimelinePoint = {
      minute: frameMinute(frame.timestamp),
      gold: pf.totalGold,
      xp: pf.xp,
      cs: pf.minionsKilled + pf.jungleMinionsKilled,
    };
    if (series.length > 0 && series[series.length - 1].minute === point.minute) {
      series[series.length - 1] = point;
    } else {
      series.push(point);
    }
  }
  return series;
}

/** Point at `minute`, or null when the series ends BEFORE that minute — so an
 * 11-minute game can never report fabricated "at 14" numbers. */
function valueAt(series: TimelinePoint[], minute: number): TimelinePoint | null {
  if (series.length === 0 || series[series.length - 1].minute < minute) return null;
  let best: TimelinePoint | null = null;
  for (const p of series) {
    if (p.minute <= minute && (!best || p.minute > best.minute)) best = p;
  }
  return best;
}

/** All purchases for a participant with ITEM_UNDO resolved (unfiltered). */
function resolvePurchases(timeline: TimelineData, participantId: number): BuildEvent[] {
  const purchases: BuildEvent[] = [];
  for (const frame of timeline.info.frames) {
    for (const ev of frame.events ?? []) {
      if (ev.participantId !== participantId) continue;
      if (ev.type === "ITEM_PURCHASED" && typeof ev.itemId === "number") {
        purchases.push({ itemId: ev.itemId, minute: eventMinute(ev.timestamp) });
      } else if (ev.type === "ITEM_UNDO" && typeof ev.beforeId === "number" && ev.beforeId !== 0) {
        // Undo removes the most recent matching purchase.
        for (let i = purchases.length - 1; i >= 0; i--) {
          if (purchases[i].itemId === ev.beforeId) {
            purchases.splice(i, 1);
            break;
          }
        }
      }
    }
  }
  return purchases;
}

/** Displayed build order: undo-resolved purchases minus consumables/trinkets. */
export function extractBuildOrder(timeline: TimelineData, participantId: number): BuildEvent[] {
  return resolvePurchases(timeline, participantId).filter((p) => !HIDDEN_PURCHASES.has(p.itemId));
}

function playerDeaths(timeline: TimelineData, participantId: number): number[] {
  const minutes: number[] = [];
  for (const frame of timeline.info.frames) {
    for (const ev of frame.events ?? []) {
      if (ev.type === "CHAMPION_KILL" && ev.victimId === participantId) {
        minutes.push(eventMinute(ev.timestamp));
      }
    }
  }
  return minutes;
}

/** Diff at `minute`, or null when the series doesn't cover that minute. */
function goldDiffAtMinute(diffs: GoldDiffPoint[], minute: number): number | null {
  if (diffs.length === 0 || diffs[diffs.length - 1].minute < minute) return null;
  let best: GoldDiffPoint | null = null;
  for (const p of diffs) {
    if (p.minute <= minute && (!best || p.minute > best.minute)) best = p;
  }
  return best ? best.diff : null;
}

export function analyzeTimeline(
  timeline: TimelineData,
  match: MatchData,
  puuid: string
): TimelineInsights | null {
  const player = match.info.participants.find((p) => p.puuid === puuid);
  const playerId = player ? participantIdFor(timeline, puuid) : null;
  if (!player || playerId === null) return null;

  const playerSeries = extractSeries(timeline, playerId);
  if (playerSeries.length === 0) return null;

  // Lane opponent. teamPosition is Riot's constraint-solved field (exactly one
  // per role per team) — individualPosition is NOT unique per team, so matching
  // on it can pick the wrong enemy. Prefer teamPosition; if the match is still
  // ambiguous (or position data is missing), suppress diffs instead of guessing.
  const lanePositionOf = (p: typeof player) => p.teamPosition || p.individualPosition;
  const lanePos = lanePositionOf(player);
  let opponent = null;
  if (lanePos && lanePos !== "Invalid") {
    const candidates = match.info.participants.filter(
      (p) => p.teamId !== player.teamId && lanePositionOf(p) === lanePos
    );
    opponent = candidates.length === 1 ? candidates[0] : null;
  }
  const opponentId = opponent ? participantIdFor(timeline, opponent.puuid) : null;
  const opponentSeries = opponentId !== null ? extractSeries(timeline, opponentId) : null;

  // Gold diff aligned frame-by-frame: both participants share each frame, so we
  // compute the diff from the same frame object (no minute-keyed join needed).
  let goldDiffSeries: GoldDiffPoint[] | null = null;
  if (opponentId !== null) {
    const diffs: GoldDiffPoint[] = [];
    for (const frame of timeline.info.frames) {
      const a = frame.participantFrames?.[String(playerId)];
      const b = frame.participantFrames?.[String(opponentId)];
      if (!a || !b) continue;
      const point = { minute: frameMinute(frame.timestamp), diff: a.totalGold - b.totalGold };
      if (diffs.length > 0 && diffs[diffs.length - 1].minute === point.minute) {
        diffs[diffs.length - 1] = point;
      } else {
        diffs.push(point);
      }
    }
    goldDiffSeries = diffs.length > 0 ? diffs : null;
  }

  // Laning stats — only what the data actually covers (no clamped "at 14"
  // numbers for games that ended earlier).
  const gameMinutes = match.info.gameDuration / 60;
  const at10 = valueAt(playerSeries, 10);
  const at14 = valueAt(playerSeries, 14);
  const oppAt10 = opponentSeries ? valueAt(opponentSeries, 10) : null;
  let laning: LaningStats | null = null;
  if (gameMinutes >= 10 && at10) {
    laning = {
      csAt10: at10.cs,
      csAt14: at14 ? at14.cs : null,
      goldDiffAt10: goldDiffSeries ? goldDiffAtMinute(goldDiffSeries, 10) : null,
      goldDiffAt14: goldDiffSeries ? goldDiffAtMinute(goldDiffSeries, 14) : null,
      xpDiffAt10: oppAt10 ? at10.xp - oppAt10.xp : null,
      opponentChampion: opponent?.championName ?? null,
    };
  }

  const buildOrder = extractBuildOrder(timeline, playerId);

  // --- Rule-based flags ---
  const flags: TimelineFlag[] = [];
  const isLaner = LANER_POSITIONS.has(lanePos);
  const isSummonersRift = match.info.mapId === SUMMONERS_RIFT_MAP_ID;

  if (laning && isLaner) {
    const csPerMinAt10 = laning.csAt10 / 10;
    if (csPerMinAt10 >= 7) {
      flags.push({ severity: "good", message: `Excelente farmeo temprano (${laning.csAt10} CS al min 10)` });
    } else if (csPerMinAt10 < 4) {
      flags.push({ severity: "bad", message: `CS bajo en fase de líneas (${laning.csAt10} CS al min 10) — busca no perder oleadas` });
    }
  }

  if (laning && laning.goldDiffAt14 !== null) {
    if (laning.goldDiffAt14 >= 1000) {
      flags.push({ severity: "good", message: `Ganaste tu línea: +${laning.goldDiffAt14} de oro vs ${laning.opponentChampion} al min 14` });
    } else if (laning.goldDiffAt14 <= -1000) {
      flags.push({ severity: "bad", message: `Perdiste la línea: ${laning.goldDiffAt14} de oro vs ${laning.opponentChampion} al min 14` });
    }
  }

  const deaths = playerDeaths(timeline, playerId);
  const earlyDeaths = deaths.filter((m) => m < 10);
  if (earlyDeaths.length >= 2) {
    flags.push({
      severity: "bad",
      message: `${earlyDeaths.length} muertes antes del min 10 (min ${earlyDeaths.join(", ")}) — juega más seguro el early`,
      minute: earlyDeaths[0],
    });
  }

  if (goldDiffSeries) {
    // eventMinute floors, so this compares against the frame BEFORE the death —
    // the post-death gold swing can't contaminate the "was ahead" classification.
    const deathsAhead = deaths.filter((m) => {
      const diff = goldDiffAtMinute(goldDiffSeries!, m);
      return diff !== null && diff > 500;
    });
    if (deathsAhead.length > 0) {
      flags.push({
        severity: "bad",
        message: `Moriste ${deathsAhead.length === 1 ? "una vez" : `${deathsAhead.length} veces`} yendo por delante en oro (min ${deathsAhead.join(", ")}) — no regales tu ventaja`,
        minute: deathsAhead[0],
      });
    }
  }

  // Control wards only exist on Summoner's Rift — gate by map, not "not ARAM".
  if (isSummonersRift && gameMinutes >= 20) {
    const wards = resolvePurchases(timeline, playerId).filter((p) => p.itemId === CONTROL_WARD_ID).length;
    if (wards === 0) {
      flags.push({ severity: "warn", message: "No compraste ningún ward de control en toda la partida" });
    } else if (wards >= 4) {
      flags.push({ severity: "good", message: `Buena inversión en visión (${wards} wards de control)` });
    }
  }

  return {
    playerChampion: player.championName,
    opponentChampion: opponent?.championName ?? null,
    goldDiffSeries,
    laning,
    buildOrder,
    flags,
  };
}
