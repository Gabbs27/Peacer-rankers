import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildTodayPlan } from "@/lib/today-plan";
import { analyzeChampionComp, getDefensiveRecommendations } from "@/lib/builds";
import { bridge } from "./bridge";
import { useApiPuuid, useChampions, useCompanionState, useGameGeneration, useHistory } from "./data";
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
function Overlay() {
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
    <div className="m-1 rounded-xl border border-gold-500/25 bg-gray-950/80 p-3 shadow-2xl backdrop-blur-sm">
      <p className="mb-2 flex items-center gap-1.5">
        <Sigil className="h-3.5 w-3.5" />
        <span className="font-display text-[11px] font-bold tracking-wide text-gold-100">LoL Tracker</span>
      </p>
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
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Overlay />
  </StrictMode>
);
