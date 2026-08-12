// Shared client-side loader for Data Dragon champion.json with a per-session
// module cache. Previously FOUR components (LiveGame, ChampionMastery, Guides,
// Planner) each downloaded their own copy (~200KB) — now they all share ONE
// fetch per DDragon version, and the id→name map derives from the same promise.

import { getChampionDataUrl } from "./data-dragon";

export interface ChampionListEntry {
  id: string; // DDragon id, e.g. "MonkeyKing"
  name: string; // localized display name, e.g. "Wukong"
  key: string; // numeric id as string, e.g. "62"
}

const listCache = new Map<string, Promise<ChampionListEntry[]>>();

/** All champions (es_MX), sorted by display name. One network fetch per version. */
export function loadChampionList(version: string): Promise<ChampionListEntry[]> {
  const cached = listCache.get(version);
  if (cached) return cached;

  const promise = fetch(getChampionDataUrl(version, "es_MX"))
    .then((res) => res.json())
    .then((data) => {
      const champs = Object.values(data.data) as ChampionListEntry[];
      champs.sort((a, b) => a.name.localeCompare(b.name));
      return champs;
    })
    .catch((error) => {
      listCache.delete(version); // allow retry on a later call
      throw error;
    });

  listCache.set(version, promise);
  return promise;
}

/** Numeric championId -> DDragon id (for spectator/mastery payloads). */
export function loadChampionIdMap(version: string): Promise<Record<number, string>> {
  return loadChampionList(version).then((list) => {
    const map: Record<number, string> = {};
    for (const champ of list) {
      map[parseInt(champ.key, 10)] = champ.id;
    }
    return map;
  });
}
