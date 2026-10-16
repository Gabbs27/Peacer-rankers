import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IPC, type CompanionBridge, type CompanionState } from "../shared/types";

// The only surface the pages get: no Node, no raw ipcRenderer.
const bridge: CompanionBridge = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: CompanionState) => listener(state);
    ipcRenderer.on(IPC.state, handler);
    return () => ipcRenderer.removeListener(IPC.state, handler);
  },
  api: (path) => ipcRenderer.invoke(IPC.api, path),
  importRunePage: (page) => ipcRenderer.invoke(IPC.importRunePage, page),
  setSpells: (spell1Id, spell2Id) => ipcRenderer.invoke(IPC.setSpells, spell1Id, spell2Id),
  setOverlayEnabled: (enabled) => ipcRenderer.invoke(IPC.setOverlayEnabled, enabled),
  openWeb: (path) => ipcRenderer.invoke(IPC.openWeb, path),
};

contextBridge.exposeInMainWorld("companion", bridge);
