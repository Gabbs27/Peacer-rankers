// The rune page and summoner spells a player has the best results with on a
// champion, taken from their own games, in the exact shape the League client
// accepts when importing them.

import type { MatchData, MatchParticipant } from "./types";
import { isRemake } from "./scoring";
import { championKey } from "./draft";

export interface RunePage {
  primaryStyleId: number;
  subStyleId: number;
  /** 4 primary runes, 2 secondary runes, then the offense, flex and defense shards. */
  selectedPerkIds: number[];
}

export interface RunePagePick extends RunePage {
  games: number;
  wins: number;
}

export interface SpellsPick {
  /** Kept in the order they were played: players have muscle memory for D/F. */
  spell1Id: number;
  spell2Id: number;
  games: number;
  wins: number;
}

/** The complete page a participant played, or null if Riot sent it incomplete. */
export function runePageOf(p: MatchParticipant): RunePage | null {
  const primary = p.perks?.styles?.find((s) => s.description === "primaryStyle");
  const sub = p.perks?.styles?.find((s) => s.description === "subStyle");
  const shards = p.perks?.statPerks;
  if (!primary || !sub || !shards) return null;
  if (primary.selections.length !== 4 || sub.selections.length !== 2) return null;
  return {
    primaryStyleId: primary.style,
    subStyleId: sub.style,
    selectedPerkIds: [
      ...primary.selections.map((s) => s.perk),
      ...sub.selections.map((s) => s.perk),
      shards.offense,
      shards.flex,
      shards.defense,
    ],
  };
}

function gamesOn(matches: MatchData[], puuid: string, championName: string): MatchParticipant[] {
  const key = championKey(championName);
  const out: MatchParticipant[] = [];
  for (const match of matches) {
    if (isRemake(match.info)) continue;
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (me && championKey(me.championName) === key) out.push(me);
  }
  return out;
}

/**
 * Picks by net wins (wins - losses), then games: rewards both volume and
 * results, so 6-4 beats a lucky 1-0 and 5-1 beats 6-4.
 */
function best<T extends { games: number; wins: number }>(candidates: T[]): T | null {
  let top: T | null = null;
  for (const c of candidates) {
    const net = 2 * c.wins - c.games;
    const topNet = top ? 2 * top.wins - top.games : -Infinity;
    if (net > topNet || (top && net === topNet && c.games > top.games)) top = c;
  }
  return top;
}

export function bestRunePage(matches: MatchData[], puuid: string, championName: string): RunePagePick | null {
  const pages = new Map<string, RunePagePick>();
  for (const me of gamesOn(matches, puuid, championName)) {
    const page = runePageOf(me);
    if (!page) continue;
    const key = [page.primaryStyleId, page.subStyleId, ...page.selectedPerkIds].join(",");
    const entry = pages.get(key) ?? { ...page, games: 0, wins: 0 };
    entry.games++;
    if (me.win) entry.wins++;
    pages.set(key, entry);
  }
  return best([...pages.values()]);
}

export function bestSpells(matches: MatchData[], puuid: string, championName: string): SpellsPick | null {
  const pairs = new Map<string, SpellsPick>();
  for (const me of gamesOn(matches, puuid, championName)) {
    const key = `${me.summoner1Id},${me.summoner2Id}`;
    const entry = pairs.get(key) ?? { spell1Id: me.summoner1Id, spell2Id: me.summoner2Id, games: 0, wins: 0 };
    entry.games++;
    if (me.win) entry.wins++;
    pairs.set(key, entry);
  }
  return best([...pairs.values()]);
}
