"use client";

import type { MatchData } from "@/lib/types";
import { calculatePerformanceScore, isRemake } from "@/lib/scoring";

interface Props {
  matches: MatchData[];
  puuid: string;
}

interface Metric {
  label: string;
  values: number[]; // chronological (oldest -> newest)
  format: (v: number) => string;
  higherIsBetter: boolean;
}

function Sparkline({ values, improving }: { values: number[]; improving: boolean }) {
  const W = 140;
  const H = 36;
  const PAD = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const stroke = improving ? "#34d399" : "#f87171";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9" aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.5" fill={stroke} />
    </svg>
  );
}

/** Compares the recent half vs the older half to call a trend. */
function trendOf(values: number[], higherIsBetter: boolean): { improving: boolean; delta: number } {
  const half = Math.floor(values.length / 2);
  const older = values.slice(0, half);
  const recent = values.slice(half);
  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / Math.max(xs.length, 1);
  const delta = avg(recent) - avg(older);
  return { improving: higherIsBetter ? delta >= 0 : delta <= 0, delta };
}

export default function TrendsPanel({ matches, puuid }: Props) {
  // Chronological order (the API returns newest first).
  const games = [...matches]
    .reverse()
    .map((m) => {
      const player = m.info.participants.find((p) => p.puuid === puuid);
      if (!player || isRemake(m.info)) return null;
      const minutes = Math.max(m.info.gameDuration / 60, 1);
      return {
        score: calculatePerformanceScore(player, m.info).overall,
        deaths: player.deaths,
        csPerMin: (player.totalMinionsKilled + player.neutralMinionsKilled) / minutes,
        visionPerMin: player.visionScore / minutes,
      };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  if (games.length < 4) return null;

  const metrics: Metric[] = [
    {
      label: "Puntuación",
      values: games.map((g) => g.score),
      format: (v) => v.toFixed(0),
      higherIsBetter: true,
    },
    {
      label: "Muertes",
      values: games.map((g) => g.deaths),
      format: (v) => v.toFixed(1),
      higherIsBetter: false,
    },
    {
      label: "CS/min",
      values: games.map((g) => g.csPerMin),
      format: (v) => v.toFixed(1),
      higherIsBetter: true,
    },
    {
      label: "Visión/min",
      values: games.map((g) => g.visionPerMin),
      format: (v) => v.toFixed(2),
      higherIsBetter: true,
    },
  ];

  return (
    <section aria-label="Tendencias" className="panel p-5 rise rise-2">
      <h3 className="section-title text-lg font-bold text-gray-100 mb-3">
        Tendencias
        <span className="text-xs text-gray-500 font-sans font-normal">
          ({games.length} partidas, de más antigua a más reciente)
        </span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => {
          const { improving, delta } = trendOf(metric.values, metric.higherIsBetter);
          const last = metric.values[metric.values.length - 1];
          return (
            <div key={metric.label} className="bg-gray-800/60 rounded-lg p-3">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs text-gray-400">{metric.label}</p>
                <p
                  className={`text-xs font-semibold ${improving ? "text-emerald-300" : "text-red-300"}`}
                  title="Mitad reciente vs mitad anterior"
                >
                  {improving ? "▲" : "▼"} {Math.abs(delta).toFixed(metric.label === "Visión/min" ? 2 : 1)}
                </p>
              </div>
              <p className="text-lg font-bold text-gray-100 mb-1">{metric.format(last)}</p>
              <Sparkline values={metric.values} improving={improving} />
              <span className="sr-only">
                {metric.label}: última partida {metric.format(last)},{" "}
                {improving ? "mejorando" : "empeorando"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
