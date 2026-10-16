import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildTodayPlan } from "@/lib/today-plan";
import { MAYHEM_QUEUE } from "@/lib/mayhem";
import { analyzeChampionComp, getDefensiveRecommendations } from "@/lib/builds";
import { bridge } from "./bridge";
import { useApiPuuid, useChampions, useCompanionState, useGameGeneration, useHistory, useItems, useMayhemInsights } from "./data";
import type { LiveSnapshot, OfferedAugment } from "../../shared/types";
import { AugmentGroups, OfferPanel } from "./components/augments";
import { BuildRow } from "./components/builds";
import { ItemIcon, Sigil } from "./components/ui";
import "./styles.css";

interface LiveGameResponse {
  inGame: boolean;
  game?: { participants: { puuid: string; teamId: number; championId: number }[] };
}

/**
 * Pre-game information only (Riot allows static data available before the
 * game): your top priority and the build against their composition. No live
 * timers and no calls telling you what to do.
 */
function Frame({ width = 288, children }: { width?: number; children: React.ReactNode }) {
  // The window is transparent and click-through: only this panel shows, at the top right.
  return (
    <div
      className="m-1 ml-auto rounded-xl border border-gold-500/25 bg-gray-950/80 p-3 shadow-2xl backdrop-blur-sm"
      style={{ width }}
    >
      <p className="mb-2 flex items-center gap-1.5">
        <Sigil className="h-3.5 w-3.5" />
        <span className="font-display text-[11px] font-bold tracking-wide text-gold-100">LoL Tracker</span>
      </p>
      {children}
    </div>
  );
}

/** While you're dead (or right at the start) is when Mayhem lets you pick an augment. */
const isPickTime = (live: LiveSnapshot | null) => !!live && (live.dead || live.gameTime < 90);

/**
 * Mayhem: your champion's most picked augments and build. While you pick
 * (dead, or at the start) it shows the cards on offer ranked, read from the
 * screen, or else the whole tier list to find them by icon; the rest of the
 * time it stays small.
 */
function MayhemOverlay({
  championId,
  games,
  live,
  offer,
}: {
  championId: number;
  games: number;
  live: LiveSnapshot | null;
  offer: OfferedAugment[] | null;
}) {
  const insights = useMayhemInsights([championId], games);
  const champs = useChampions();
  const items = useItems(champs?.version ?? null);
  const mine = insights?.[0];
  const name = champs?.byId.get(championId)?.name;
  if (isPickTime(live) && offer && offer.length >= 2) {
    return (
      <Frame>
        <OfferPanel offer={offer} championName={name} items={items} version={champs?.version} />
      </Frame>
    );
  }
  if (!mine || mine.augments.length === 0) return null;
  if (isPickTime(live)) {
    return (
      <Frame>
        <AugmentGroups augments={mine.augments} items={items} version={champs?.version} perGroup={6} compact ranked />
      </Frame>
    );
  }
  return (
    <Frame>
      <AugmentGroups augments={mine.augments} perGroup={2} compact />
      {champs && (
        <div className="mt-2 border-t border-white/5 pt-2">
          <BuildRow build={mine.build} items={items} version={champs.version} size={22} />
        </div>
      )}
    </Frame>
  );
}

function Overlay() {
  const state = useCompanionState();
  if (state.queueId === MAYHEM_QUEUE && state.gameChampionId && (state.phase === "InProgress" || state.phase === "Reconnect")) {
    return <MayhemOverlay championId={state.gameChampionId} games={state.mayhem.games} live={state.live} offer={state.offer} />;
  }
  return <RiftOverlay />;
}

function RiftOverlay() {
  const state = useCompanionState();
  const champs = useChampions();
  const me = state.me;
  const { puuid } = useApiPuuid(me);
  const region = me?.region ?? null;
  const { matches } = useHistory(puuid, region, useGameGeneration(state.phase));
  const [lineup, setLineup] = useState<{ me: string; enemies: string[] } | null>(null);
  const inGame = state.phase === "InProgress" || state.phase === "Reconnect";

  useEffect(() => {
    if (!inGame || !puuid || !region || !champs) return;
    let alive = true;
    bridge
      .api<LiveGameResponse>(`/api/live-game?puuid=${encodeURIComponent(puuid)}&region=${region}`)
      .then((live) => {
        const players = live.game?.participants ?? [];
        const mine = players.find((p) => p.puuid === puuid);
        if (!alive || !mine) return;
        const name = (id: number) => champs.byId.get(id)?.id ?? "";
        setLineup({
          me: name(mine.championId),
          enemies: players.filter((p) => p.teamId !== mine.teamId).map((p) => name(p.championId)).filter(Boolean),
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [inGame, puuid, region, champs]);

  if (!me || !puuid || !inGame) return null;
  const action = matches ? buildTodayPlan(matches, puuid)?.actions[0] : undefined;
  const build =
    lineup && lineup.enemies.length >= 2
      ? getDefensiveRecommendations(analyzeChampionComp(lineup.enemies), "", lineup.me)
      : null;
  if (!action && !build) return null;

  return (
    <Frame>
      {action && (
        <div className="mb-2.5">
          <p className="label">Tu prioridad</p>
          <p className="text-[13px] font-semibold text-gray-100">{action.title}</p>
          <p className="text-[11px] leading-snug text-gray-400">{action.detail}</p>
        </div>
      )}
      {build && champs && build.items.length > 0 && (
        <div>
          <p className="label mb-1">Build contra su composición</p>
          <div className="flex gap-1.5">
            {build.items.slice(0, 4).map((item) => (
              <ItemIcon key={item.itemId} itemId={item.itemId} version={champs.version} size={30} title={item.name} />
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Overlay />
  </StrictMode>
);
