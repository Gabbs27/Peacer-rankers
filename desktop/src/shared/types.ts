// Contract between the main process (League client, overlay) and the windows.
// Only plain data crosses this boundary.

import type { Role } from "@/lib/draft";
import type { RunePage } from "@/lib/rune-pages";
import type { AugmentPick, ItemPick, SpellPick } from "@/lib/mayhem";
import type { Region } from "@/lib/types";

/** The client's gameflow phase, e.g. "Lobby", "ChampSelect", "InProgress", "EndOfGame". */
export type GameflowPhase = string;

/**
 * The player logged into the client. Note there is no PUUID here: the client's
 * own PUUID is an internal id that the Riot API rejects, so the windows look up
 * the API PUUID by Riot ID through the web API.
 */
export interface Me {
  gameName: string;
  tagLine: string;
  summonerId: number;
  profileIconId: number;
  /** null when the client's region is not one the web app supports. */
  region: Region | null;
}

export interface ChampSelectView {
  role: Role | null;
  /** Your locked champion, else your hover, else 0. */
  myChampionId: number;
  myChampionLocked: boolean;
  /** Teammates' picks or hovers (0s removed). */
  allyChampionIds: number[];
  /** Enemy picks revealed so far. */
  enemyChampionIds: number[];
  banIds: number[];
  /** Champions you can pick right now; null when the client didn't say. */
  pickableIds: number[] | null;
  /** ARAM bench: champions you can swap to. */
  benchIds: number[];
}

/** The local ARAM: Mayhem statistics (see main/mayhem/collector.ts). */
export interface MayhemStatus {
  /** Games counted in the local JSON. */
  games: number;
  /** Newest patch with data, e.g. "16.20". */
  patch: string | null;
  /** Following other players' histories right now. */
  running: boolean;
  runAdded: number;
  runTarget: number;
  /** Games counted before items were stored, still to be read for them. */
  itemsPending: number;
  error: string | null;
}

export type AugmentRarity = "prismatic" | "gold" | "silver" | "other";

export interface AugmentInsight extends AugmentPick {
  name: string;
  rarity: AugmentRarity;
  /** Image URL, or null when the client did not list the augment. */
  icon: string | null;
  /** Items its takers build more than usual, best first (finished or not: the window filters). */
  items: number[];
}

export interface ChampionInsight {
  championId: number;
  games: number;
  wins: number;
  winrate: number | null;
  /** Most picked by the champion's players first, up to 8 per rarity. */
  augments: AugmentInsight[];
  spells: SpellPick | null;
  /** Items the champion's players end with, most built first (the window keeps the finished ones). */
  build: ItemPick[];
}

/** What the overlay needs from the game in progress (Riot's Live Client Data API). */
export interface LiveSnapshot {
  dead: boolean;
  level: number;
  /** Seconds since the game started. */
  gameTime: number;
}

export interface CompanionState {
  status: "searching" | "connected";
  phase: GameflowPhase;
  /** Queue of the current lobby/game (2400 = ARAM: Mayhem, 450 = ARAM). */
  queueId: number | null;
  me: Me | null;
  champSelect: ChampSelectView | null;
  /** Your champion for the game in progress (kept after champion select ends). */
  gameChampionId: number | null;
  overlayEnabled: boolean;
  mayhem: MayhemStatus;
  /** Your state in the game in progress (Mayhem only), or null. */
  live: LiveSnapshot | null;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export type NamedRunePage = RunePage & { name: string };

export interface CompanionBridge {
  getState(): Promise<CompanionState>;
  onState(listener: (state: CompanionState) => void): () => void;
  /** GET to the LoL Tracker web API (allow-listed paths only). */
  api<T = unknown>(path: string): Promise<T>;
  importRunePage(page: NamedRunePage): Promise<ActionResult>;
  setSpells(spell1Id: number, spell2Id: number): Promise<ActionResult>;
  setOverlayEnabled(enabled: boolean): Promise<void>;
  /** Opens a page of the LoL Tracker website in the default browser. */
  openWeb(path: string): Promise<void>;
  /** Mayhem stats for these champions from the local JSON. */
  mayhemInsights(championIds: number[]): Promise<ChampionInsight[]>;
  /** Starts following other players' Mayhem games (stops by itself). */
  collectMayhem(): Promise<void>;
  stopMayhem(): Promise<void>;
}

export const IPC = {
  getState: "companion:get-state",
  state: "companion:state",
  api: "companion:api",
  importRunePage: "companion:import-rune-page",
  setSpells: "companion:set-spells",
  setOverlayEnabled: "companion:set-overlay-enabled",
  openWeb: "companion:open-web",
  mayhemInsights: "companion:mayhem-insights",
  collectMayhem: "companion:collect-mayhem",
  stopMayhem: "companion:stop-mayhem",
} as const;

export const INITIAL_STATE: CompanionState = {
  status: "searching",
  phase: "None",
  queueId: null,
  me: null,
  champSelect: null,
  gameChampionId: null,
  overlayEnabled: true,
  mayhem: { games: 0, patch: null, running: false, runAdded: 0, runTarget: 0, itemsPending: 0, error: null },
  live: null,
};
