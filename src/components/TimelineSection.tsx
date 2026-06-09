"use client";

import { useEffect, useId, useState } from "react";
import type { TimelineInsights, GoldDiffPoint, TimelineFlag } from "@/lib/timeline-insights";
import ItemIcon from "./ItemIcon";

interface Props {
  matchId: string;
  region: string;
  puuid: string;
}

const FLAG_STYLES: Record<TimelineFlag["severity"], { dot: string; text: string; srLabel: string }> = {
  good: { dot: "bg-emerald-500", text: "text-emerald-300", srLabel: "Bien:" },
  warn: { dot: "bg-yellow-500", text: "text-yellow-300", srLabel: "Atención:" },
  bad: { dot: "bg-red-500", text: "text-red-300", srLabel: "Problema:" },
};

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
    <figure className="mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-20 bg-gray-900/40 rounded"
        role="img"
        aria-label={`Diferencia de oro vs ${opponent ?? "rival de línea"} a lo largo de la partida`}
      >
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#4b5563" strokeDasharray="3 3" strokeWidth="1" />
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <figcaption className="text-xs text-gray-400 mt-1">
        Diferencia de oro vs {opponent ?? "rival de línea"} ·{" "}
        <span className={last >= 0 ? "text-emerald-300" : "text-red-300"}>
          {last >= 0 ? "+" : ""}{last} al final
        </span>
      </figcaption>
    </figure>
  );
}

function DiffChip({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <div className="bg-gray-700/40 rounded px-2 py-1 text-xs">
      <span className="text-gray-300">{label}: </span>
      <span className={positive ? "text-emerald-300 font-semibold" : "text-red-300 font-semibold"}>
        {positive ? "+" : ""}{value}
      </span>
    </div>
  );
}

export default function TimelineSection({ matchId, region, puuid }: Props) {
  const headingId = useId();
  const [insights, setInsights] = useState<TimelineInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Mounted only when the match card is expanded, so this runs once per expand;
  // `loading` starts true and no synchronous setState is needed here.
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ region, puuid });
    fetch(`/api/timeline/${encodeURIComponent(matchId)}?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "No se pudo cargar el análisis de la partida.");
        } else {
          setInsights(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("No se pudo cargar el análisis de la partida.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [matchId, region, puuid]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-600 bg-gray-700/30 p-3 text-sm text-gray-400">
        Cargando análisis de la partida…
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="rounded-lg border border-gray-600 bg-gray-700/30 p-3 text-sm text-gray-400">
        {error ?? "Análisis no disponible para esta partida."}
      </div>
    );
  }

  const { laning, goldDiffSeries, buildOrder, flags, opponentChampion } = insights;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h4 id={headingId} className="text-sm font-semibold text-gray-200">
        Análisis de la partida
      </h4>

      {laning && (
        <div className="flex flex-wrap gap-2">
          <div className="bg-gray-700/40 rounded px-2 py-1 text-xs">
            <span className="text-gray-300">CS al 10: </span>
            <span className="text-gray-100 font-semibold">{laning.csAt10}</span>
          </div>
          {laning.csAt14 !== null && (
            <div className="bg-gray-700/40 rounded px-2 py-1 text-xs">
              <span className="text-gray-300">CS al 14: </span>
              <span className="text-gray-100 font-semibold">{laning.csAt14}</span>
            </div>
          )}
          <DiffChip label="Oro al 10" value={laning.goldDiffAt10} />
          <DiffChip label="Oro al 14" value={laning.goldDiffAt14} />
          <DiffChip label="XP al 10" value={laning.xpDiffAt10} />
        </div>
      )}

      {goldDiffSeries && goldDiffSeries.length > 1 && (
        <GoldDiffSparkline series={goldDiffSeries} opponent={opponentChampion} />
      )}

      {flags.length > 0 && (
        <ul className="space-y-1">
          {flags.map((flag, i) => {
            const style = FLAG_STYLES[flag.severity];
            return (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                <span className={style.text}>
                  <span className="sr-only">{style.srLabel} </span>
                  {flag.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {buildOrder.length > 0 && (
        <div>
          <p className="text-xs text-gray-300 uppercase mb-1">Orden de compra</p>
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
    </section>
  );
}
