// Browser-preview bridge (dev only, `npm run web`): plays one client phase with
// the real account's data via the proxied web API, so the UI can be checked
// without League running. Never used inside the Electron app.

import type { MatchData } from "@/lib/types";
import { scoutPlayer, type ScoutedPlayer } from "@/lib/scouting";
import { parseAugmentCatalog } from "../../shared/augments";
import {
  INITIAL_STATE,
  type AugmentInsight,
  type ChampSelectView,
  type ChampionInsight,
  type CompanionBridge,
  type CompanionState,
} from "../../shared/types";

const ACCOUNT = { gameName: "xICEBRIEL", tagLine: "LAN", region: "la1" as const };

const PHASES: Record<string, string> = {
  home: "Lobby",
  champselect: "ChampSelect",
  ingame: "InProgress",
  postgame: "EndOfGame",
  mayhem: "ChampSelect",
  mayhemgame: "InProgress",
};

// Briar jungle hovering; Garen / Jinx / Lux on your team; Graves / Ahri / Darius revealed.
const CHAMP_SELECT: ChampSelectView = {
  role: "JUNGLE",
  myChampionId: 233,
  myChampionLocked: false,
  allyChampionIds: [86, 222, 99],
  enemyChampionIds: [104, 103, 122],
  banIds: [141, 64, 157, 238, 555],
  pickableIds: null,
  benchIds: [],
};

// ARAM: Mayhem with Briar rolled and two champions on the bench.
const MAYHEM_SELECT: ChampSelectView = {
  role: null,
  myChampionId: 233,
  myChampionLocked: false,
  allyChampionIds: [86, 222, 99, 54],
  enemyChampionIds: [],
  banIds: [],
  pickableIds: null,
  benchIds: [131, 19],
};

// Augment ids seen in real Mayhem games.
const MAYHEM_AUGMENTS = [1152, 1413, 1074, 2091, 1084, 1373, 1098, 1211, 1328, 1077, 1356, 2080, 2100, 2116, 1061, 1150];

/** Plausible numbers on real augment names and icons (CommunityDragon), so the layout can be checked. */
async function mayhemInsights(ids: number[]): Promise<ChampionInsight[]> {
  const catalog = parseAugmentCatalog(
    await fetch("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json").then((r) => r.json())
  );
  return ids.map((championId, c) => {
    const augments: AugmentInsight[] = MAYHEM_AUGMENTS.map((augmentId, i) => {
      const info = catalog.get(augmentId);
      const games = 12 + ((i * 37 + c * 11) % 90);
      return {
        augmentId,
        games,
        wins: Math.round((games * (44 + ((i * 13 + c * 7) % 20))) / 100),
        pickRate: Math.round((games / 340) * 100),
        allGames: games * 6,
        verdict: i % 7 === 0 ? "up" : i % 11 === 5 ? "down" : null,
        name: info?.name ?? `Aumento ${augmentId}`,
        rarity: info?.rarity ?? "other",
        icon: info?.icon ?? null,
      } satisfies AugmentInsight;
    }).sort((a, b) => b.games - a.games);
    return {
      championId,
      games: 340 - c * 90,
      wins: Math.round(((340 - c * 90) * ([53, 49, 56][c] ?? 50)) / 100),
      winrate: [53, 49, 56][c] ?? 50,
      augments,
      spells: { spell1Id: 4, spell2Id: 32, games: 210, wins: 116, pickRate: 62 },
    };
  });
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data;
}

/** A "live game" built from your latest real match. */
async function liveGame(path: string) {
  const query = new URLSearchParams(path.split("?")[1]);
  const { matches } = await getJson<{ matches: MatchData[] }>(
    `/api/matches?puuid=${encodeURIComponent(query.get("puuid") ?? "")}&region=${query.get("region")}&count=1&start=0`
  );
  const participants = matches[0].info.participants.map((p) => ({
    puuid: p.puuid,
    teamId: p.teamId,
    championId: p.championId,
    championName: p.championName,
    riotId: `${p.riotIdGameName}#${p.riotIdTagline}`,
  }));
  return { inGame: true, game: { gameQueueConfigId: 420, gameLength: 312, participants }, ranks: {} };
}

/** Your latest real match as the "live" game, with varied reports so every signal style shows. */
async function scout(path: string) {
  const { game } = await liveGame(path);
  const now = Date.now();
  const tiers = ["GOLD", "PLATINUM", "EMERALD", "SILVER", "EMERALD"];
  const players = game.participants.map((p, i): ScoutedPlayer => {
    const championName = p.championName;
    const report = scoutPlayer(
      {
        championName,
        soloQueue: {
          leagueId: "l",
          summonerId: "s",
          queueType: "RANKED_SOLO_5x5",
          tier: tiers[i % tiers.length],
          rank: ["I", "II", "III", "IV"][i % 4],
          leaguePoints: (i * 23) % 100,
          wins: 40 + i * 9,
          losses: 45 + ((i * 7) % 20),
          hotStreak: i % 5 === 1,
          veteran: i % 6 === 4,
          freshBlood: i % 7 === 2,
          inactive: false,
        },
        mastery:
          i % 4 === 0
            ? null
            : { championLevel: 10, championPoints: [0, 12_000, 260_000, 60_000][i % 4], lastPlayTime: now - (i % 3) * 70 * 86_400_000 },
      },
      now
    );
    return { puuid: p.puuid, teamId: p.teamId, championId: p.championId, championName, riotId: p.riotId, ...report };
  });
  return { inGame: true, players };
}

export function createMockBridge(scenario: string | null): CompanionBridge {
  let state: CompanionState = { ...INITIAL_STATE };
  const listeners = new Set<(s: CompanionState) => void>();
  const emit = (patch: Partial<CompanionState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  };

  const phase = scenario ? PHASES[scenario] : undefined;
  if (phase) {
    void getJson<{ account: { puuid: string; gameName: string; tagLine: string }; summoner: { profileIconId: number } }>(
      `/api/summoner?gameName=${ACCOUNT.gameName}&tagLine=${ACCOUNT.tagLine}&region=${ACCOUNT.region}`
    ).then(({ account, summoner }) => {
      emit({
        status: "connected",
        phase,
        me: {
          gameName: account.gameName,
          tagLine: account.tagLine,
          summonerId: 1,
          profileIconId: summoner.profileIconId,
          region: ACCOUNT.region,
        },
        champSelect: phase === "ChampSelect" ? (scenario === "mayhem" ? MAYHEM_SELECT : CHAMP_SELECT) : null,
        queueId: scenario?.startsWith("mayhem") ? 2400 : 420,
        gameChampionId: scenario === "mayhemgame" ? 233 : null,
        mayhem: { games: 1384, patch: "16.20", running: false, runAdded: 0, runTarget: 0, error: null },
      });
    });
  }

  return {
    getState: async () => state,
    onState: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    api: async <T>(path: string) => {
      if (path.startsWith("/api/live-game")) return (await liveGame(path)) as T;
      if (path.startsWith("/api/scout")) return (await scout(path)) as T;
      return getJson<T>(path);
    },
    importRunePage: async () => ({ ok: true, message: "Runas aplicadas en el cliente (simulado)." }),
    setSpells: async () => ({ ok: true, message: "Hechizos aplicados (simulado)." }),
    setOverlayEnabled: async (enabled) => emit({ overlayEnabled: enabled }),
    openWeb: async (path) => {
      window.open(`https://peacer-rankers.vercel.app${path}`, "_blank");
    },
    mayhemInsights,
    collectMayhem: async () => {
      // Simulated run: 40 games, one every 150 ms.
      emit({ mayhem: { ...state.mayhem, running: true, runAdded: 0, runTarget: 40, error: null } });
      const timer = setInterval(() => {
        const m = state.mayhem;
        if (!m.running) return clearInterval(timer);
        const done = m.runAdded + 1 >= m.runTarget;
        emit({ mayhem: { ...m, games: m.games + 1, runAdded: m.runAdded + 1, running: !done } });
        if (done) clearInterval(timer);
      }, 150);
    },
    stopMayhem: async () => emit({ mayhem: { ...state.mayhem, running: false } }),
  };
}
