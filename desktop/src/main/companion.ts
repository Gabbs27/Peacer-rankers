import { EventEmitter } from "node:events";
import { findCredentials, type LcuCredentials } from "./lcu/credentials";
import { LcuHttp } from "./lcu/http";
import { subscribeEvents, topicFor, type LcuEvent } from "./lcu/events";
import { toChampSelectView } from "./lcu/champ-select";
import { regionFromClient } from "../shared/region";
import { INITIAL_STATE, type CompanionState, type Me } from "../shared/types";

const SEARCH_INTERVAL_MS = 3000;
const PICKABLE_TTL_MS = 2000;
const PHASE_PATH = "/lol-gameflow/v1/gameflow-phase";
const SESSION_PATH = "/lol-champ-select/v1/session";
const GAMEFLOW_SESSION_PATH = "/lol-gameflow/v1/session";

interface ChampionSelection {
  puuid?: string;
  championId?: number;
}

interface GameflowSession {
  gameData?: {
    queue?: { id?: number };
    playerChampionSelections?: ChampionSelection[];
    teamOne?: ChampionSelection[];
    teamTwo?: ChampionSelection[];
  };
}

interface CurrentSummoner {
  /** The client's internal PUUID: only used to find you in the client's own data. */
  puuid?: string;
  gameName?: string;
  tagLine?: string;
  displayName?: string;
  summonerId: number;
  profileIconId: number;
}

/**
 * Finds the League client, follows its gameflow and champion select, and
 * publishes one immutable state object. Reconnects on its own when the client
 * is closed and reopened.
 */
export class Companion extends EventEmitter<{ state: [CompanionState] }> {
  private state: CompanionState = { ...INITIAL_STATE };
  private http: LcuHttp | null = null;
  private disconnect: (() => void) | null = null;
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;
  private pickable: { at: number; ids: number[] | null } = { at: 0, ids: null };
  private clientPuuid: string | null = null;

  getState(): CompanionState {
    return this.state;
  }

  /** The connected client, for user-triggered actions. */
  get client(): LcuHttp | null {
    return this.http;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.search();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.disconnect?.();
    this.disconnect = null;
    this.http = null;
  }

  setOverlayEnabled(enabled: boolean): void {
    this.update({ overlayEnabled: enabled });
  }

  setMayhemStatus(mayhem: CompanionState["mayhem"]): void {
    this.update({ mayhem });
  }

  private update(patch: Partial<CompanionState>): void {
    this.state = { ...this.state, ...patch };
    this.emit("state", this.state);
  }

  private scheduleSearch(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.search(), SEARCH_INTERVAL_MS);
  }

  private async search(): Promise<void> {
    if (this.stopped) return;
    const creds = await findCredentials().catch(() => null);
    if (creds && (await this.connect(creds))) return;
    this.scheduleSearch();
  }

  private async connect(creds: LcuCredentials): Promise<boolean> {
    const http = new LcuHttp(creds);
    try {
      // Fails while the client is still booting; the next search retries.
      const me = await this.loadMe(http);
      const phase = await http.get<string>(PHASE_PATH);
      if (this.stopped) return true;
      this.http = http;
      this.pickable = { at: 0, ids: null };
      this.update({ status: "connected", me, phase, champSelect: null });
      if (phase !== "None") await this.refreshGameflow();
      if (phase === "ChampSelect") await this.refreshChampSelect();
      this.disconnect = subscribeEvents({
        creds,
        authorization: http.authorization,
        topics: [topicFor(PHASE_PATH), topicFor(SESSION_PATH)],
        onEvent: (event) => this.onEvent(event),
        onClose: () => this.onClientClosed(),
      });
      return true;
    } catch {
      return false;
    }
  }

  private async loadMe(http: LcuHttp): Promise<Me> {
    const summoner = await http.get<CurrentSummoner>("/lol-summoner/v1/current-summoner");
    this.clientPuuid = summoner.puuid ?? null;
    const platform = await http
      .get<unknown>("/lol-platform-config/v1/namespaces/LoginDataPacket/platformId")
      .catch(() => null);
    let region = regionFromClient(platform);
    if (!region) {
      const locale = await http.get<{ region?: string; webRegion?: string }>("/riotclient/region-locale").catch(() => null);
      region = regionFromClient(locale?.region) ?? regionFromClient(locale?.webRegion);
    }
    return {
      gameName: summoner.gameName ?? summoner.displayName ?? "",
      tagLine: summoner.tagLine ?? "",
      summonerId: summoner.summonerId,
      profileIconId: summoner.profileIconId,
      region,
    };
  }

  private onEvent(event: LcuEvent): void {
    if (event.uri === PHASE_PATH) {
      const phase = typeof event.data === "string" ? event.data : "None";
      const previous = this.state;
      // Keep your champion once champion select ends; forget it out of a game.
      const gameChampionId =
        phase === "None" || phase === "Lobby" || phase === "ChampSelect"
          ? null
          : previous.phase === "ChampSelect"
            ? previous.champSelect?.myChampionId || previous.gameChampionId
            : previous.gameChampionId;
      this.update({
        phase,
        champSelect: phase === "ChampSelect" ? previous.champSelect : null,
        gameChampionId,
        queueId: phase === "None" ? null : previous.queueId,
      });
      if (phase !== "None") void this.refreshGameflow();
      if (phase === "ChampSelect") void this.refreshChampSelect();
    } else if (event.uri === SESSION_PATH) {
      if (event.eventType === "Delete") this.update({ champSelect: null });
      else void this.refreshChampSelect(event.data);
    }
  }

  /** Queue of the lobby/game, and your champion if the app started mid-game. */
  private async refreshGameflow(): Promise<void> {
    const http = this.http;
    if (!http) return;
    const session = await http.get<GameflowSession>(GAMEFLOW_SESSION_PATH).catch(() => null);
    if (!session) return; // keep what we know rather than forget the queue mid-game
    const data = session.gameData;
    const queueId = typeof data?.queue?.id === "number" && data.queue.id > 0 ? data.queue.id : null;
    let gameChampionId = this.state.gameChampionId;
    if (!gameChampionId && this.clientPuuid && data) {
      const everyone = [...(data.playerChampionSelections ?? []), ...(data.teamOne ?? []), ...(data.teamTwo ?? [])];
      const mine = everyone.find((s) => s.puuid === this.clientPuuid && (s.championId ?? 0) > 0);
      if (mine?.championId && this.state.phase !== "ChampSelect") gameChampionId = mine.championId;
    }
    this.update({ queueId, gameChampionId });
  }

  private async refreshChampSelect(session?: unknown): Promise<void> {
    const http = this.http;
    if (!http) return;
    try {
      const data = session ?? (await http.get<unknown>(SESSION_PATH));
      // The session updates every second (timers); the pickable list only
      // changes on bans and picks, so it is refreshed at most every 2s.
      if (Date.now() - this.pickable.at > PICKABLE_TTL_MS) {
        const ids = await http.get<unknown>("/lol-champ-select/v1/pickable-champion-ids").catch(() => null);
        this.pickable = { at: Date.now(), ids: Array.isArray(ids) ? ids.filter((n) => typeof n === "number") : null };
      }
      const view = toChampSelectView(data, this.pickable.ids);
      if (view) this.update({ champSelect: view });
    } catch {
      // Session not ready yet; the next event retries.
    }
  }

  private onClientClosed(): void {
    this.http = null;
    this.disconnect = null;
    this.clientPuuid = null;
    this.update({ status: "searching", phase: "None", queueId: null, me: null, champSelect: null, gameChampionId: null });
    this.scheduleSearch();
  }
}
