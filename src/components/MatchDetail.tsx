"use client";

import { useState } from "react";
import type { LeagueEntry, MatchData, MatchParticipant } from "@/lib/types";
import { isRemake } from "@/lib/scoring";
import { useTimelineInsights } from "@/lib/use-timeline-insights";
import TabBar, { tabPanelProps, type TabDef } from "./TabBar";
import MatchIdBadge from "./MatchIdBadge";
import MatchAnalysisTab from "./MatchAnalysisTab";
import MatchTeamsTab from "./MatchTeamsTab";
import MatchTimelineTab from "./MatchTimelineTab";
import MatchBuildTab from "./MatchBuildTab";

interface Props {
  match: MatchData;
  player: MatchParticipant;
  puuid: string;
  region: string;
  ranked?: LeagueEntry[];
}

type DetailTab = "analisis" | "equipos" | "timeline" | "build";

const FULL_TABS: TabDef<DetailTab>[] = [
  { id: "analisis", label: "Análisis" },
  { id: "equipos", label: "Equipos" },
  { id: "timeline", label: "Timeline" },
  { id: "build", label: "Build" },
];

// A remake is too short to analyse: only the lobby and the builds are useful.
const REMAKE_TABS: TabDef<DetailTab>[] = [
  { id: "equipos", label: "Equipos" },
  { id: "build", label: "Build" },
];

/** Expanded body of a match card. Mounted on expand, so the timeline fetch happens then. */
export default function MatchDetail({ match, player, puuid, region, ranked }: Props) {
  const remake = isRemake(match.info);
  const [tab, setTab] = useState<DetailTab>(remake ? "equipos" : "analisis");
  const timeline = useTimelineInsights(match.metadata.matchId, region, puuid, !remake);
  const idPrefix = `match-${match.metadata.matchId}`;

  return (
    <section aria-label="Detalles de la partida" className="border-t border-white/10 bg-gray-950/25">
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 pt-3">
        <TabBar
          size="sm"
          label="Detalles de la partida"
          idPrefix={idPrefix}
          tabs={remake ? REMAKE_TABS : FULL_TABS}
          value={tab}
          onChange={setTab}
        />
        {/* Beside the tabs when there is room; at the foot of the panel on phones. */}
        <div className="hidden sm:flex ml-auto">
          <MatchIdBadge matchId={match.metadata.matchId} />
        </div>
      </div>

      {remake && (
        <p className="px-3 sm:px-4 pt-3 text-xs text-gray-400">
          Remake: la partida fue demasiado corta para puntuarla o analizarla.
        </p>
      )}

      <div key={tab} {...tabPanelProps(idPrefix, tab)} className="p-3 sm:p-4 tab-enter">
        {tab === "analisis" && (
          <MatchAnalysisTab player={player} info={match.info} ranked={ranked} timeline={timeline} />
        )}
        {tab === "equipos" && <MatchTeamsTab match={match} player={player} puuid={puuid} region={region} />}
        {tab === "timeline" && <MatchTimelineTab timeline={timeline} mapId={match.info.mapId} />}
        {tab === "build" && <MatchBuildTab player={player} info={match.info} />}
      </div>

      <div className="sm:hidden flex justify-end px-3 pb-2">
        <MatchIdBadge matchId={match.metadata.matchId} />
      </div>
    </section>
  );
}
