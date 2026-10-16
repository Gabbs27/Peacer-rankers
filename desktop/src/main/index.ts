import { app, BrowserWindow, ipcMain, screen, shell, type IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { Companion } from "./companion";
import { importRunePage, setSpells, validateRunePage, validateSpells } from "./actions";
import { apiGet, isAllowedApiPath, webUrl } from "./backend";
import { MayhemCollector } from "./mayhem/collector";
import { loadAugmentCatalog } from "./mayhem/catalog";
import { championInsights } from "./mayhem/insights";
import type { AugmentInfo } from "../shared/augments";
import { IPC, type CompanionState } from "../shared/types";

const companion = new Companion();
const collector = new MayhemCollector(join(app.getPath("userData"), "mayhem-stats.json"));
let augmentCatalog = new Map<number, AugmentInfo>();

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
      .then((catalog) => (augmentCatalog = catalog))
      .catch(() => {});
  }
  if (client && state.status === "connected" && !ownGamesRead && IDLE_PHASES.has(state.phase)) {
    ownGamesRead = true;
    void readOwnGames();
  }
  if (state.phase === "EndOfGame" && previous?.phase !== "EndOfGame") {
    // The finished game takes a moment to show up in the client's history.
    setTimeout(() => {
      const current = companion.client;
      if (current) void collector.collectOwn(current);
    }, 15_000);
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
  const width = 300;
  const height = 280;
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
}

app.whenReady().then(async () => {
  registerIpc();
  mainWindow = createMainWindow();
  overlayWindow = createOverlayWindow();
  companion.on("state", (state) => {
    broadcast(state);
    syncOverlay(state);
    onStateForMayhem(state);
  });
  collector.on("status", (status) => companion.setMayhemStatus(status));
  await collector.load();
  companion.start();
});

app.on("before-quit", () => {
  collector.stop();
  companion.stop();
});
