// Contract between the main process (League client, overlay) and the windows.
// Only plain data crosses this boundary.

import type { Role } from "@/lib/draft";
import type { RunePage } from "@/lib/rune-pages";
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
}

export interface CompanionState {
  status: "searching" | "connected";
  phase: GameflowPhase;
  me: Me | null;
  champSelect: ChampSelectView | null;
  overlayEnabled: boolean;
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
}

export const IPC = {
  getState: "companion:get-state",
  state: "companion:state",
  api: "companion:api",
  importRunePage: "companion:import-rune-page",
  setSpells: "companion:set-spells",
  setOverlayEnabled: "companion:set-overlay-enabled",
  openWeb: "companion:open-web",
} as const;

export const INITIAL_STATE: CompanionState = {
  status: "searching",
  phase: "None",
  me: null,
  champSelect: null,
  overlayEnabled: true,
};
