import type { CompanionBridge } from "../../shared/types";
import { createMockBridge } from "./mock";

function unavailable(): CompanionBridge {
  const fail = () => Promise.reject(new Error("Abre esta ventana desde la app LoL Tracker."));
  return {
    getState: fail,
    onState: () => () => {},
    api: fail,
    importRunePage: fail,
    setSpells: fail,
    setOverlayEnabled: fail,
    openWeb: fail,
    mayhemInsights: fail,
    collectMayhem: fail,
    stopMayhem: fail,
  };
}

/**
 * Electron's preload bridge. In the browser preview (`npm run web`, dev only)
 * a mock plays a scenario (?scenario=champselect|ingame|home|postgame) with
 * the real account's data.
 */
export const bridge: CompanionBridge =
  window.companion ??
  (import.meta.env.DEV ? createMockBridge(new URLSearchParams(location.search).get("scenario")) : unavailable());
