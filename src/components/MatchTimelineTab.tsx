"use client";

import type { GoldDiffPoint } from "@/lib/timeline-insights";
import type { TimelineState } from "@/lib/use-timeline-insights";
import ItemIcon from "./ItemIcon";
import DeathMap from "./DeathMap";

interface Props {
  timeline: TimelineState;
  mapId: number;
}

function GoldDiffSparkline({ series, opponent }: { series: GoldDiffPoint[]; opponent: string | null }) {
  if (series.length < 2) return null;

  const W = 320;
  const H = 80;
  const PAD = 4;
  const maxMinute = series[series.length - 1].minute || 1;
  const maxAbs = Math.max(500, ...series.map((p) => Math.abs(p.diff)));

  const x = (minute: number) => PAD + (minute / maxMinute) * (W - PAD * 2);
  const y = (diff: number) => H / 2 - (diff / maxAbs) * (H / 2 - PAD);

  const points = series.map((p) => `${x(p.minute).toFixed(1)},${y(p.diff).toFixed(1)}`).join(" ");
  const last = series[series.length - 1].diff;
  const stroke = last >= 0 ? "#34d399" : "#f87171";

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-20 bg-gray-900/50 rounded"
        role="img"
        aria-label={`Diferencia de oro vs ${opponent ?? "rival de línea"} a lo largo de la partida`}
      >
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#4b5563" strokeDasharray="3 3" strokeWidth="1" />
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <figcaption className="text-[11px] text-gray-400 mt-1">
        Oro vs {opponent ?? "rival de línea"} ·{" "}
        <span className={last >= 0 ? "text-emerald-300" : "text-red-300"}>
          {last >= 0 ? "+" : ""}
          {last} al final
        </span>
      </figcaption>
    </figure>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{children}</p>;
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-900/60 px-2 py-1 text-xs">
      <span className="text-gray-400">{label} </span>
      {children}
    </span>
  );
}

export default function MatchTimelineTab({ timeline, mapId }: Props) {
  if (timeline.status === "disabled") return null;
  if (timeline.status === "loading") {
    return <p className="text-sm text-gray-500 animate-pulse">Cargando la línea de tiempo…</p>;
  }
  if (timeline.status === "error") {
    return <p className="text-sm text-gray-400">{timeline.message}</p>;
  }

  const { goldDiffSeries, buildOrder, opponentChampion, deaths, skillOrder, wards, objectives, plates } =
    timeline.data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto] items-start">
        <div className="space-y-5 min-w-0">
          {goldDiffSeries && goldDiffSeries.length > 1 && (
            <GoldDiffSparkline series={goldDiffSeries} opponent={opponentChampion} />
          )}

          {objectives.length > 0 && (
            <div>
              <Label>Objetivos</Label>
              <ul className="flex flex-wrap gap-1.5">
                {objectives.map((o, i) => (
                  <li
                    key={i}
                    className={`text-[11px] rounded px-2 py-0.5 border ${
                      o.byMyTeam
                        ? "border-blue-500/40 bg-blue-950/30 text-blue-200"
                        : "border-red-500/40 bg-red-950/30 text-red-200"
                    }`}
                    title={o.byMyTeam ? "Tu equipo" : "Equipo enemigo"}
                  >
                    {o.minute}&apos; {o.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Label>Visión y placas</Label>
            <div className="flex flex-wrap gap-1.5">
              <Chip label="Wards">
                <span className="text-gray-100 font-semibold">{wards.placed}</span>
                {wards.controlWards > 0 && <span className="text-gray-500"> ({wards.controlWards} control)</span>}
              </Chip>
              <Chip label="Destruidos">
                <span className="text-gray-100 font-semibold">{wards.killed}</span>
              </Chip>
              {wards.firstWardMinute !== null && (
                <Chip label="Primer ward">
                  <span className="text-gray-100 font-semibold">min {wards.firstWardMinute}</span>
                </Chip>
              )}
              {(plates.taken > 0 || plates.conceded > 0) && (
                <Chip label="Placas">
                  <span className="text-emerald-300 font-semibold">{plates.taken}</span>
                  <span className="text-gray-500"> / </span>
                  <span className="text-red-300 font-semibold">{plates.conceded}</span>
                  <span className="text-gray-500"> cedidas</span>
                </Chip>
              )}
            </div>
          </div>

          {skillOrder && skillOrder.sequence.length > 0 && (
            <div>
              <Label>
                Habilidades
                {skillOrder.maxOrder && (
                  <span className="text-[#e3c98a] normal-case tracking-normal ml-2">maxeo {skillOrder.maxOrder}</span>
                )}
              </Label>
              <ol className="flex flex-wrap gap-1">
                {skillOrder.sequence.map((slot, i) => (
                  <li
                    key={i}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                      slot === 4 ? "bg-[#c8aa6e] text-gray-950" : "bg-gray-800 text-gray-200"
                    }`}
                    title={`Nivel ${i + 1}`}
                  >
                    {slot === 1 ? "Q" : slot === 2 ? "W" : slot === 3 ? "E" : "R"}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {deaths.length > 0 && <DeathMap deaths={deaths} mapId={mapId} />}
      </div>

      {buildOrder.length > 0 && (
        <div>
          <Label>Orden de compra</Label>
          <ol className="flex flex-wrap items-end gap-1.5">
            {buildOrder.slice(0, 18).map((b, i) => (
              <li key={`${b.itemId}-${i}`} className="flex flex-col items-center gap-0.5">
                <ItemIcon itemId={b.itemId} size={26} />
                <span className="text-[10px] text-gray-500">{b.minute}&apos;</span>
              </li>
            ))}
            {buildOrder.length > 18 && (
              <li className="text-xs text-gray-500 self-center">+{buildOrder.length - 18} más</li>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}
