"use client";

import type { DeathPoint } from "@/lib/timeline-insights";
import { getMapImageUrl } from "@/lib/data-dragon";
import { useDDragonVersion } from "./DDragonProvider";

interface Props {
  deaths: DeathPoint[];
  mapId: number;
}

// Summoner's Rift playable area in Riot's coordinate space. Riot's Y grows
// upward (north), the opposite of SVG, so we flip it when projecting.
const MAP_MIN = -120;
const MAP_MAX = 14870;
const SIZE = 240;

function project(x: number, y: number): { cx: number; cy: number } {
  const span = MAP_MAX - MAP_MIN;
  const nx = (x - MAP_MIN) / span;
  const ny = (y - MAP_MIN) / span;
  return { cx: nx * SIZE, cy: (1 - ny) * SIZE };
}

/** Colour by game phase so early deaths read differently from late ones. */
function phaseColor(minute: number): string {
  if (minute < 10) return "#f87171"; // early — laning mistakes
  if (minute < 20) return "#fbbf24"; // mid
  return "#a78bfa"; // late
}

export default function DeathMap({ deaths, mapId }: Props) {
  const version = useDDragonVersion();

  // Only Summoner's Rift has a meaningful lane/jungle layout to read.
  if (mapId !== 11 || deaths.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-gray-300 uppercase mb-1.5">
        Dónde moriste ({deaths.length})
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="relative rounded-lg overflow-hidden border border-gray-700 shrink-0"
          style={{ width: SIZE, height: SIZE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static CDN minimap, no optimization needed */}
          <img
            src={getMapImageUrl(mapId, version)}
            alt="Mapa de la Grieta del Invocador"
            width={SIZE}
            height={SIZE}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0 w-full h-full"
            role="img"
            aria-label={`Mapa con ${deaths.length} muertes marcadas`}
          >
            {deaths.map((d, i) => {
              const { cx, cy } = project(d.x, d.y);
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={7} fill={phaseColor(d.minute)} opacity={0.25} />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill={phaseColor(d.minute)}
                    stroke="#0b1120"
                    strokeWidth={1}
                  >
                    <title>{`Muerte al minuto ${d.minute}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="text-xs space-y-1.5">
          <p className="text-gray-400 uppercase tracking-wider text-[10px]">Fase de la partida</p>
          {[
            { label: "Early (0-10 min)", color: "#f87171", count: deaths.filter((d) => d.minute < 10).length },
            { label: "Mid (10-20 min)", color: "#fbbf24", count: deaths.filter((d) => d.minute >= 10 && d.minute < 20).length },
            { label: "Late (20+ min)", color: "#a78bfa", count: deaths.filter((d) => d.minute >= 20).length },
          ].map((row) => (
            <p key={row.label} className="flex items-center gap-2 text-gray-300">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              {row.label}
              <span className="text-gray-500">· {row.count}</span>
            </p>
          ))}
          <p className="text-gray-500 pt-1 max-w-[14rem]">
            Azul abajo-izquierda, rojo arriba-derecha. Muchos puntos en la jungla enemiga o
            en el río sin visión suelen indicar sobreextensión.
          </p>
        </div>
      </div>
    </div>
  );
}
