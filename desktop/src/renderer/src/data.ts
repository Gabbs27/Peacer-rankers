import { useEffect, useState } from "react";
import type { MatchData, Region } from "@/lib/types";
import { FALLBACK_DDRAGON_VERSION, getRunesDataUrl, getRuneIconUrl } from "@/lib/data-dragon";
import { loadChampionList, type ChampionListEntry } from "@/lib/champion-client";
import { INITIAL_STATE, type CompanionState, type Me } from "../../shared/types";
import { bridge } from "./bridge";

export function useCompanionState(): CompanionState {
  const [state, setState] = useState<CompanionState>(INITIAL_STATE);
  useEffect(() => {
    let alive = true;
    bridge
      .getState()
      .then((initial) => {
        if (alive && initial) setState(initial);
      })
      .catch(() => {});
    const off = bridge.onState(setState);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

/** Resolves a promise into state, dropping results for stale keys. */
function useAsync<T>(key: string | null, load: () => Promise<T>): { data: T | null; error: string | null } {
  const [result, setResult] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null,
    data: null,
    error: null,
  });
  useEffect(() => {
    if (!key) return;
    let alive = true;
    load()
      .then((data) => alive && setResult({ key, data, error: null }))
      .catch((e: unknown) => alive && setResult({ key, data: null, error: errorMessage(e) }));
    return () => {
      alive = false;
    };
    // `load` is derived from `key` by every caller, so `key` is the dependency.
  }, [key]);
  return result.key === key ? result : { data: null, error: null };
}

export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  // ipcRenderer.invoke prefixes "Error invoking remote method '…': Error: ".
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}

// ---------- Data Dragon ----------

export interface Champions {
  version: string;
  byId: Map<number, ChampionListEntry>;
}

let championsPromise: Promise<Champions> | null = null;

function loadChampions(): Promise<Champions> {
  championsPromise ??= (async () => {
    const version = await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then((r) => r.json() as Promise<string[]>)
      .then((versions) => versions[0] ?? FALLBACK_DDRAGON_VERSION)
      .catch(() => FALLBACK_DDRAGON_VERSION);
    const list = await loadChampionList(version);
    return { version, byId: new Map(list.map((c) => [Number(c.key), c])) };
  })();
  championsPromise.catch(() => (championsPromise = null));
  return championsPromise;
}

export function useChampions(): Champions | null {
  return useAsync("champions", loadChampions).data;
}

export interface RuneInfo {
  name: string;
  icon: string;
}

interface RuneTree {
  id: number;
  name: string;
  icon: string;
  slots: { runes: { id: number; name: string; icon: string }[] }[];
}

const runesCache = new Map<string, Promise<Map<number, RuneInfo>>>();

/** Rune and rune-tree names/icons by id (stat shards are not in Data Dragon). */
export function useRunes(version: string | null): Map<number, RuneInfo> | null {
  return useAsync(version ? `runes:${version}` : null, () => {
    const key = version!;
    let promise = runesCache.get(key);
    if (!promise) {
      promise = fetch(getRunesDataUrl(key, "es_MX"))
        .then((r) => r.json() as Promise<RuneTree[]>)
        .then((trees) => {
          const map = new Map<number, RuneInfo>();
          for (const tree of trees) {
            map.set(tree.id, { name: tree.name, icon: getRuneIconUrl(tree.icon) });
            for (const slot of tree.slots) {
              for (const rune of slot.runes) map.set(rune.id, { name: rune.name, icon: getRuneIconUrl(rune.icon) });
            }
          }
          return map;
        });
      runesCache.set(key, promise);
      promise.catch(() => runesCache.delete(key));
    }
    return promise;
  }).data;
}

// ---------- Your account and history (through the LoL Tracker web API) ----------

const accountCache = new Map<string, Promise<string>>();

/**
 * Your Riot API PUUID. The client's own PUUID is an internal id the Riot API
 * rejects, so it is looked up by Riot ID.
 */
export function useApiPuuid(me: Me | null): { puuid: string | null; error: string | null } {
  const key = me?.region ? `${me.region}/${me.gameName}#${me.tagLine}` : null;
  const { data, error } = useAsync(key, () => {
    let promise = accountCache.get(key!);
    if (!promise) {
      const query = `gameName=${encodeURIComponent(me!.gameName)}&tagLine=${encodeURIComponent(me!.tagLine)}&region=${me!.region}`;
      promise = bridge.api<{ account: { puuid: string } }>(`/api/summoner?${query}`).then((r) => r.account.puuid);
      accountCache.set(key!, promise);
      promise.catch(() => accountCache.delete(key!));
    }
    return promise;
  });
  return { puuid: data, error };
}

const historyCache = new Map<string, Promise<MatchData[]>>();

async function fetchHistory(puuid: string, region: Region): Promise<MatchData[]> {
  const base = `/api/matches?puuid=${encodeURIComponent(puuid)}&region=${region}`;
  const [first, second] = await Promise.all([
    bridge.api<{ matches: MatchData[] }>(`${base}&count=20&start=0`),
    bridge.api<{ matches: MatchData[] }>(`${base}&count=10&start=20`).catch(() => ({ matches: [] })),
  ]);
  return [...first.matches, ...second.matches];
}

/**
 * Counts finished games while the app is open. Used as the history key so
 * every window refetches your matches after a game ends.
 */
export function useGameGeneration(phase: string): number {
  const [seen, setSeen] = useState({ phase, generation: 0 });
  if (phase !== seen.phase) {
    // Adjusting state while rendering is React's pattern for "state derived from a changing prop".
    setSeen({ phase, generation: seen.generation + (phase === "EndOfGame" ? 1 : 0) });
  }
  return seen.generation;
}

/** Your last ~30 games, refetched when `generation` changes. */
export function useHistory(
  puuid: string | null,
  region: Region | null,
  generation: number
): { matches: MatchData[] | null; error: string | null } {
  const key = puuid && region ? `${puuid}:${generation}` : null;
  const { data, error } = useAsync(key, () => {
    let promise = historyCache.get(key!);
    if (!promise) {
      promise = fetchHistory(puuid!, region!);
      historyCache.set(key!, promise);
      promise.catch(() => historyCache.delete(key!));
    }
    return promise;
  });
  return { matches: data, error };
}

export function profilePath(me: Me): string {
  return `/summoner/${me.region}/${encodeURIComponent(me.gameName)}-${encodeURIComponent(me.tagLine)}`;
}
