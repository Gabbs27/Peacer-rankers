import { useEffect, useState } from "react";
import type { ScoutReport } from "@/lib/scouting";
import type { Region } from "@/lib/types";
import type { CompanionState } from "../../../shared/types";
import { bridge } from "../bridge";
import { errorMessage, type Champions } from "../data";
import { ChampIcon, Section, SignalChip } from "../components/ui";

interface LiveParticipant {
  puuid: string;
  teamId: number;
  championId: number;
  riotId?: string;
}

interface LiveGameResponse {
  inGame: boolean;
  game?: { participants: LiveParticipant[] };
}

type ScoutEntry = ScoutReport & { puuid: string; championName: string; unavailable?: true };

const RETRY_MS = 20_000;
const PUUID_RE = /^[A-Za-z0-9_-]{20,100}$/;

function PlayerRow({ p, report, champs, isMe }: { p: LiveParticipant; report?: ScoutEntry; champs: Champions; isMe: boolean }) {
  const c = champs.byId.get(p.championId);
  const name = p.riotId?.split("#")[0] || "Jugador";
  return (
    <li className={`flex gap-2.5 rounded-lg p-1.5 ${isMe ? "bg-white/[0.04]" : ""}`}>
      <ChampIcon id={c?.id} title={c?.name} version={champs.version} size={34} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-gray-100">
            {name}
            {isMe && <span className="ml-1.5 text-[11px] text-gold-400">tú</span>}
          </span>
          <span className="shrink-0 text-[11px] text-gray-400">
            {report?.rank ?? (report ? "Sin clasificar" : "…")}
            {report?.winrate != null && <span className="text-gray-500"> · {report.winrate}%</span>}
          </span>
        </p>
        {report && report.signals.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {report.signals.map((s) => (
              <SignalChip key={s.text} tone={s.tone} text={s.text} />
            ))}
          </div>
        )}
        {report?.unavailable && <p className="text-[11px] text-gray-500">Sin datos ahora mismo.</p>}
      </div>
    </li>
  );
}

interface Props {
  /** Riot API PUUID. */
  puuid: string;
  region: Region;
  state: CompanionState;
  champs: Champions;
}

export default function InGame({ puuid, region, state, champs }: Props) {
  const [participants, setParticipants] = useState<LiveParticipant[] | null>(null);
  const [reports, setReports] = useState<Map<string, ScoutEntry>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Spectator data shows up a little after the loading screen: retry until it does.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = async () => {
      try {
        const live = await bridge.api<LiveGameResponse>(
          `/api/live-game?puuid=${encodeURIComponent(puuid)}&region=${region}`
        );
        if (!alive) return;
        if (!live.inGame || !live.game) {
          timer = setTimeout(attempt, RETRY_MS);
          return;
        }
        setError(null);
        setParticipants(live.game.participants);
        const players = live.game.participants
          .filter((p) => PUUID_RE.test(p.puuid) && champs.byId.has(p.championId))
          .map((p) => `${p.puuid}:${p.championId}:${champs.byId.get(p.championId)!.id}`);
        if (players.length === 0) return;
        const scout = await bridge.api<{ reports: ScoutEntry[] }>(
          `/api/scout?region=${region}&players=${players.join(",")}`
        );
        if (alive) setReports(new Map(scout.reports.map((r) => [r.puuid, r])));
      } catch (e) {
        if (!alive) return;
        setError(errorMessage(e));
        timer = setTimeout(attempt, RETRY_MS);
      }
    };
    void attempt();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [puuid, region, champs]);

  const myTeam = participants?.find((p) => p.puuid === puuid)?.teamId;
  const enemies = participants?.filter((p) => p.teamId !== myTeam) ?? [];
  const allies = participants?.filter((p) => p.teamId === myTeam) ?? [];

  return (
    <div className="space-y-3 p-3">
      <div className="panel flex items-center justify-between gap-3 p-3.5 fade-in">
        <div>
          <p className="text-sm text-gray-100">Overlay en la partida</p>
          <p className="text-[11px] text-gray-500">Tu plan y tu build, sin temporizadores ni avisos.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.overlayEnabled}
          onClick={() => void bridge.setOverlayEnabled(!state.overlayEnabled)}
          className={`no-drag relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            state.overlayEnabled ? "bg-arcane-500/80" : "bg-gray-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${state.overlayEnabled ? "left-[18px]" : "left-0.5"}`}
          />
          <span className="sr-only">Mostrar overlay</span>
        </button>
      </div>

      {!participants && (
        <Section title="Scouting">
          <p className="text-xs text-gray-400 animate-pulse">
            Esperando los datos de la partida en Riot… suelen llegar durante la pantalla de carga.
          </p>
          {error && <p className="mt-1.5 text-[11px] text-amber-300">{error}</p>}
        </Section>
      )}

      {participants && (
        <>
          <Section title="Rivales">
            <ul className="space-y-1">
              {enemies.map((p) => (
                <PlayerRow key={p.puuid || p.championId} p={p} report={reports.get(p.puuid)} champs={champs} isMe={false} />
              ))}
            </ul>
          </Section>
          <Section title="Tu equipo">
            <ul className="space-y-1">
              {allies.map((p) => (
                <PlayerRow
                  key={p.puuid || p.championId}
                  p={p}
                  report={reports.get(p.puuid)}
                  champs={champs}
                  isMe={p.puuid === puuid}
                />
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
