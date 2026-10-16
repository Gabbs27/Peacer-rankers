import { app, BrowserWindow, desktopCapturer, ipcMain, screen, shell, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { Companion } from "./companion";
import { importRunePage, setSpells, validateRunePage, validateSpells } from "./actions";
import { apiGet, isAllowedApiPath, webUrl } from "./backend";
import { MayhemCollector } from "./mayhem/collector";
import { loadAugmentCatalog } from "./mayhem/catalog";
import { championInsights } from "./mayhem/insights";
import { LiveClient } from "./live-client";
import { matchOffer, nameIndex, offerInsights } from "./mayhem/offer";
import { ScreenReader, screenAccess } from "./screen-reader";
import { MAYHEM_QUEUE } from "@/lib/mayhem";
import type { AugmentInfo } from "../shared/augments";
import { IPC, type CompanionState } from "../shared/types";

const companion = new Companion();
const live = new LiveClient();
const collector = new MayhemCollector(join(app.getPath("userData"), "mayhem-stats.json"));
let augmentCatalog = new Map<number, AugmentInfo>();
let augmentNames = new Map<string, number[]>();
const reader = new ScreenReader(
  app.isPackaged ? join(process.resourcesPath, "ocr") : join(app.getAppPath(), "resources", "ocr"),
  () => overlayLeft()
);

/** Following other players only happens while you're not in a game. */
const IDLE_PHASES = new Set(["None", "Lobby", "EndOfGame", "PreEndOfGame", "WaitingForStats", "TerminatedInError"]);
let previous: CompanionState | null = null;

let ownGamesRead = false;
let ownRetries = 0;
const OWN_RETRY_MS = 30_000;
const OWN_MAX_RETRIES = 3;

/** Reads your own games; the client's history service can lag right after login, so retry a few times. */
async function readOwnGames(): Promise<void> {
  const client = companion.client;
  if (!client) return;
  await collector.collectOwn(client);
  if (collector.status().error && ownRetries < OWN_MAX_RETRIES) {
    ownRetries++;
    setTimeout(() => {
      if (companion.client && IDLE_PHASES.has(companion.getState().phase)) void readOwnGames();
    }, OWN_RETRY_MS);
  }
}

/**
 * Mayhem data upkeep on client events: your own games once per connection
 * (only outside a game) and again after each game.
 */
function onStateForMayhem(state: CompanionState): void {
  const client = companion.client;
  if (client && state.status === "connected" && previous?.status !== "connected") {
    ownGamesRead = false;
    ownRetries = 0;
    loadAugmentCatalog(client)
      .then((catalog) => {
        augmentCatalog = catalog;
        augmentNames = nameIndex(catalog);
      })
      .catch(() => {});
  }
  if (client && state.status === "connected" && !ownGamesRead && IDLE_PHASES.has(state.phase)) {
    ownGamesRead = true;
    void readOwnGames();
  }
  if (state.phase === "EndOfGame" && previous?.phase !== "EndOfGame") {
    // The finished game takes a moment to show up in the client's history: look again later if it wasn't there.
    const readFinished = (delays: number[]) => {
      const [delay, ...rest] = delays;
      setTimeout(() => {
        const current = companion.client;
        if (!current) return;
        void collector.collectOwn(current).then((added) => {
          if (added === 0 && rest.length > 0) readFinished(rest);
        });
      }, delay);
    };
    readFinished([15_000, 60_000, 180_000]);
  }
  if (state.status !== "connected") {
    collector.stop();
    collector.forgetPlayers();
  }
  previous = state;
}
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

const IN_GAME = new Set(["InProgress", "Reconnect"]);

function load(win: BrowserWindow, page: "index" | "overlay"): void {
  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer) void win.loadURL(`${devServer}/${page}.html`);
  else void win.loadFile(join(__dirname, `../renderer/${page}.html`));
}

/** Windows show our own pages only: no popups, no navigation away. */
function harden(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
}

const webPreferences = {
  preload: join(__dirname, "../preload/index.js"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 460,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    title: "LoL Tracker",
    backgroundColor: "#060a14",
    titleBarStyle: "hiddenInset",
    show: false,
    webPreferences,
  });
  harden(win);
  win.once("ready-to-show", () => win.show());
  // The companion is useless without its window: closing it quits the app.
  win.on("closed", () => app.quit());
  load(win, "index");
  return win;
}

/**
 * A small click-through panel above the game, including full-screen spaces.
 * It only shows pre-game information (plan, build, runes): Riot forbids
 * overlays with live timers or calls that dictate what to do.
 */
function createOverlayWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay();
  // Transparent and click-through: only the panel drawn in it is visible. A
  // narrow column at the right edge stays clear of Mayhem's augment cards.
  const width = 300;
  const height = 620;
  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 16,
    y: workArea.y + 72,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences,
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true);
  harden(win);
  load(win, "overlay");
  return win;
}

/** Only Mayhem uses the game's live data: the overlay grows while you're dead (when augments are picked). */
function syncLive(state: CompanionState): void {
  if (state.status === "connected" && IN_GAME.has(state.phase) && state.queueId === MAYHEM_QUEUE) live.start();
  else live.stop();
}

/** Mayhem lets you pick an augment while you're dead, and at the start. */
const isPickTime = (live: CompanionState["live"]) => !!live && (live.dead || live.gameTime < 90);

/** Where the overlay starts, 0-1 of the screen width: the screen reader ignores what's right of it. */
function overlayLeft(): number {
  const display = screen.getPrimaryDisplay();
  if (!overlayWindow || overlayWindow.isDestroyed()) return 1;
  return (overlayWindow.getBounds().x - display.bounds.x) / display.bounds.width;
}

let emptyReads = 0;

/** Reads the augments on offer while you pick, if macOS lets the app see the screen. */
function syncReader(state: CompanionState): void {
  const reading =
    state.status === "connected" &&
    IN_GAME.has(state.phase) &&
    state.queueId === MAYHEM_QUEUE &&
    !!state.gameChampionId &&
    isPickTime(state.live) &&
    state.screenAccess === "granted";
  if (reading) {
    reader.start();
    return;
  }
  reader.stop();
  emptyReads = 0;
  if (state.offer) companion.setOffer(null);
}

function onScreenLines(lines: Parameters<typeof matchOffer>[0]): void {
  const championId = companion.getState().gameChampionId;
  const matches = matchOffer(lines, augmentNames);
  if (!championId || matches.length < 2) {
    // A read can miss the cards mid-animation: only clear after two misses in a row.
    if (++emptyReads >= 2 && companion.getState().offer) companion.setOffer(null);
    return;
  }
  emptyReads = 0;
  const offer = offerInsights(collector.data, augmentCatalog, championId, matches);
  const before = companion.getState().offer;
  if (JSON.stringify(before?.map((o) => o.augmentId)) !== JSON.stringify(offer.map((o) => o.augmentId))) {
    companion.setOffer(offer);
  }
}

let lastPhase = "None";

/** In champion select the window comes up above the League client, without taking the focus. */
function syncMainWindow(state: CompanionState): void {
  const win = mainWindow;
  if (!win || win.isDestroyed() || state.phase === lastPhase) return;
  const leaving = lastPhase === "ChampSelect";
  lastPhase = state.phase;
  if (state.phase === "ChampSelect") {
    if (win.isMinimized()) win.restore();
    win.setAlwaysOnTop(true, "floating");
    win.showInactive();
    win.moveTop();
  } else if (leaving) {
    win.setAlwaysOnTop(false);
  }
}

function syncOverlay(state: CompanionState): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const visible = state.overlayEnabled && state.status === "connected" && IN_GAME.has(state.phase);
  if (visible && !overlayWindow.isVisible()) overlayWindow.showInactive();
  if (!visible && overlayWindow.isVisible()) overlayWindow.hide();
}

function broadcast(state: CompanionState): void {
  for (const win of [mainWindow, overlayWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send(IPC.state, state);
  }
}

/** IPC is only answered for our own pages. */
function trusted(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? "";
  const devServer = process.env.ELECTRON_RENDERER_URL;
  return url.startsWith("file://") || (!!devServer && url.startsWith(devServer));
}

function registerIpc(): void {
  ipcMain.handle(IPC.getState, (event) => (trusted(event) ? companion.getState() : null));

  ipcMain.handle(IPC.api, async (event, path: unknown) => {
    if (!trusted(event) || !isAllowedApiPath(path)) throw new Error("Ruta de API no permitida");
    return apiGet(path);
  });

  ipcMain.handle(IPC.importRunePage, async (event, value: unknown) => {
    const page = validateRunePage(value);
    const client = companion.client;
    if (!trusted(event) || !page) return { ok: false, message: "Página de runas no válida." };
    if (!client) return { ok: false, message: "El cliente de League no está abierto." };
    return importRunePage(client, page);
  });

  ipcMain.handle(IPC.setSpells, async (event, a: unknown, b: unknown) => {
    const spells = validateSpells(a, b);
    const client = companion.client;
    if (!trusted(event) || !spells) return { ok: false, message: "Hechizos no válidos." };
    if (!client || companion.getState().phase !== "ChampSelect") {
      return { ok: false, message: "Solo se pueden cambiar en la selección de campeones." };
    }
    return setSpells(client, spells[0], spells[1]);
  });

  ipcMain.handle(IPC.setOverlayEnabled, (event, enabled: unknown) => {
    if (trusted(event) && typeof enabled === "boolean") companion.setOverlayEnabled(enabled);
  });

  ipcMain.handle(IPC.openWeb, async (event, path: unknown) => {
    const url = webUrl(path);
    if (trusted(event) && url) await shell.openExternal(url);
  });

  ipcMain.handle(IPC.mayhemInsights, (event, ids: unknown) => {
    if (!trusted(event) || !Array.isArray(ids)) return [];
    const championIds = ids.filter((n): n is number => Number.isInteger(n) && n > 0 && n < 10_000).slice(0, 12);
    return championInsights(collector.data, augmentCatalog, championIds);
  });

  ipcMain.handle(IPC.collectMayhem, (event) => {
    const client = companion.client;
    if (!trusted(event) || !client) return;
    void collector.expand(client, () => companion.client === client && IDLE_PHASES.has(companion.getState().phase));
  });

  ipcMain.handle(IPC.stopMayhem, (event) => {
    if (trusted(event)) collector.stop();
  });

  ipcMain.handle(IPC.requestScreenAccess, async (event) => {
    if (!trusted(event)) return screenAccess();
    if (screenAccess() !== "granted") {
      // A first capture makes macOS ask and list the app in its settings.
      await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 1, height: 1 } }).catch(() => []);
      if (screenAccess() !== "granted") {
        await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture");
      }
    }
    companion.setScreenAccess(screenAccess());
    return screenAccess();
  });
}

app.whenReady().then(async () => {
  registerIpc();
  mainWindow = createMainWindow();
  overlayWindow = createOverlayWindow();
  companion.on("state", (state) => {
    broadcast(state);
    syncMainWindow(state);
    syncOverlay(state);
    syncLive(state);
    syncReader(state);
    onStateForMayhem(state);
  });
  collector.on("status", (status) => companion.setMayhemStatus(status));
  live.on("snapshot", (snapshot) => companion.setLive(snapshot));
  reader.on("lines", onScreenLines);
  companion.setScreenAccess(screenAccess());
  // Coming back from System Settings: pick up a permission just granted.
  mainWindow.on("focus", () => companion.setScreenAccess(screenAccess()));
  await collector.load();
  companion.start();
});

app.on("before-quit", () => {
  reader.dispose();
  live.stop();
  collector.stop();
  companion.stop();
});
