import { useEffect, useState } from "react";
import type { ScoutedPlayer } from "@/lib/scouting";
import { MAYHEM_QUEUE } from "@/lib/mayhem";
import type { Region } from "@/lib/types";
import type { CompanionState } from "../../../shared/types";
import { bridge } from "../bridge";
import { errorMessage, useItems, useMayhemInsights, type Champions } from "../data";
import { AugmentGroups } from "../components/augments";
import { BuildRow, finishedItems } from "../components/builds";
import { ChampIcon, Section, SignalChip } from "../components/ui";

type ScoutResponse = { inGame: false } | { inGame: true; players: ScoutedPlayer[] };

const RETRY_MS = 20_000;

function PlayerRow({ player, champs, isMe }: { player: ScoutedPlayer; champs: Champions; isMe: boolean }) {
  const c = champs.byId.get(player.championId);
  const name = player.riotId?.split("#")[0] || "Jugador";
  return (
    <li className={`flex gap-2.5 rounded-lg p-1.5 ${isMe ? "bg-white/[0.04]" : ""}`}>
      <ChampIcon id={c?.id} title={player.championName || c?.name} version={champs.version} size={34} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-gray-100">
            {name}
            {isMe && <span className="ml-1.5 text-[11px] text-gold-400">tú</span>}
          </span>
          <span className="shrink-0 text-[11px] text-gray-400">
            {player.unavailable ? "—" : (player.rank ?? "Sin clasificar")}
            {player.winrate != null && <span className="text-gray-500"> · {player.winrate}%</span>}
          </span>
        </p>
        {player.signals.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {player.signals.map((s) => (
              <SignalChip key={s.text} tone={s.tone} text={s.text} />
            ))}
          </div>
        )}
        {player.unavailable && <p className="text-[11px] text-gray-500">Sin datos ahora mismo.</p>}
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

/** Mayhem isn't in Riot's public API (no scouting): show your champion's augments instead. */
function MayhemGame({ state, champs }: { state: CompanionState; champs: Champions }) {
  const championId = state.gameChampionId ?? 0;
  const insights = useMayhemInsights(championId > 0 ? [championId] : [], state.mayhem.games);
  const champ = champs.byId.get(championId);
  const items = useItems(champs.version);
  const mine = insights?.[0];
  return (
    <>
      {mine && finishedItems(mine.build, items).length > 0 && (
        <Section title="Build más usada" aside="% de sus partidas">
          <BuildRow build={mine.build} items={items} version={champs.version} />
        </Section>
      )}
      <Section title={champ ? `Aumentos para ${champ.name}` : "Tus aumentos"} aside={mine?.games ? `${mine.games} partidas` : undefined}>
        {championId === 0 && <p className="text-xs text-gray-400">No se pudo saber tu campeón en esta partida.</p>}
        {championId > 0 && mine && mine.augments.length > 0 && (
          <AugmentGroups augments={mine.augments} championName={champ?.name} items={items} version={champs.version} perGroup={5} />
        )}
        {championId > 0 && insights && (!mine || mine.augments.length === 0) && (
          <p className="text-xs text-gray-400">Aún no hay suficientes partidas de {champ?.name ?? "este campeón"} en tus datos.</p>
        )}
      </Section>
    </>
  );
}

export default function InGame({ puuid, region, state, champs }: Props) {
  if (state.queueId === MAYHEM_QUEUE) {
    return (
      <div className="space-y-3 p-3">
        <OverlaySwitch state={state} />
        <MayhemGame state={state} champs={champs} />
      </div>
    );
  }
  return <ScoutedGame puuid={puuid} region={region} state={state} champs={champs} />;
}

function OverlaySwitch({ state }: { state: CompanionState }) {
  return (
    <div className="panel flex items-center justify-between gap-3 p-3.5 fade-in">
      <div>
        <p className="text-sm text-gray-100">Overlay en la partida</p>
        <p className="text-[11px] text-gray-500">Tu plan, tu build o tus aumentos, sin temporizadores ni avisos.</p>
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
  );
}

function ScoutedGame({ puuid, region, state, champs }: Props) {
  const [players, setPlayers] = useState<ScoutedPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Riot publishes the live game a little after the loading screen starts:
  // retry until it shows up. One call returns the players and their reports.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = async () => {
      try {
        const res = await bridge.api<ScoutResponse>(`/api/scout?puuid=${encodeURIComponent(puuid)}&region=${region}`);
        if (!alive) return;
        if (!res.inGame) {
          timer = setTimeout(attempt, RETRY_MS);
          return;
        }
        setError(null);
        setPlayers(res.players);
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
  }, [puuid, region]);

  const myTeam = players?.find((p) => p.puuid === puuid)?.teamId;
  const enemies = players?.filter((p) => p.teamId !== myTeam) ?? [];
  const allies = players?.filter((p) => p.teamId === myTeam) ?? [];

  return (
    <div className="space-y-3 p-3">
      <OverlaySwitch state={state} />

      {!players && (
        <Section title="Scouting">
          <p className="text-xs text-gray-400 animate-pulse">
            Esperando los datos de la partida en Riot… suelen llegar durante la pantalla de carga.
          </p>
          {error && <p className="mt-1.5 text-[11px] text-amber-300">{error}</p>}
        </Section>
      )}

      {players && (
        <>
          <Section title="Rivales">
            <ul className="space-y-1">
              {enemies.map((p) => (
                <PlayerRow key={p.puuid || p.championId} player={p} champs={champs} isMe={false} />
              ))}
            </ul>
          </Section>
          <Section title="Tu equipo">
            <ul className="space-y-1">
              {allies.map((p) => (
                <PlayerRow key={p.puuid || p.championId} player={p} champs={champs} isMe={p.puuid === puuid} />
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
