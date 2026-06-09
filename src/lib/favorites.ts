// Client-side persistence (localStorage) for favorite summoners and recent searches,
// exposed as an external store so components can read it with useSyncExternalStore
// (no setState-in-effect, and updates propagate live across components and tabs).
// All functions are safe to import on the server; reads return empty there.

export interface SavedSummoner {
  region: string;
  gameName: string;
  tagLine: string;
}

const RECENT_KEY = "lol:recent";
const FAV_KEY = "lol:favorites";
const MAX_RECENT = 8;

export function summonerKey(s: SavedSummoner): string {
  return `${s.region}:${s.gameName}:${s.tagLine}`.toLowerCase();
}

export function summonerHref(s: SavedSummoner): string {
  return `/summoner/${s.region}/${encodeURIComponent(s.gameName)}-${encodeURIComponent(s.tagLine)}`;
}

function read(key: string): SavedSummoner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key: string, list: SavedSummoner[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // storage full / disabled — ignore
  }
}

// --- External store (stable snapshots; new references only when data changes) ---
const EMPTY: readonly SavedSummoner[] = [];
let recentSnapshot: SavedSummoner[] = [];
let favSnapshot: SavedSummoner[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  recentSnapshot = read(RECENT_KEY);
  favSnapshot = read(FAV_KEY);
  hydrated = true;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  if (!hydrated) hydrate();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === RECENT_KEY || e.key === FAV_KEY || e.key === null) {
      hydrate();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getRecentSnapshot(): SavedSummoner[] {
  return recentSnapshot;
}

export function getFavoritesSnapshot(): SavedSummoner[] {
  return favSnapshot;
}

export function getServerSnapshot(): SavedSummoner[] {
  return EMPTY as SavedSummoner[];
}

export function isFavorite(s: SavedSummoner): boolean {
  const k = summonerKey(s);
  return favSnapshot.some((x) => summonerKey(x) === k);
}

export function addRecent(s: SavedSummoner): void {
  const k = summonerKey(s);
  recentSnapshot = [s, ...read(RECENT_KEY).filter((x) => summonerKey(x) !== k)].slice(0, MAX_RECENT);
  write(RECENT_KEY, recentSnapshot);
  notify();
}

/** Toggles favorite state and returns the NEW state (true = now a favorite). */
export function toggleFavorite(s: SavedSummoner): boolean {
  const k = summonerKey(s);
  const current = read(FAV_KEY);
  const exists = current.some((x) => summonerKey(x) === k);
  favSnapshot = exists ? current.filter((x) => summonerKey(x) !== k) : [s, ...current];
  write(FAV_KEY, favSnapshot);
  notify();
  return !exists;
}
