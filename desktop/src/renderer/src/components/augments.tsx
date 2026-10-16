import { useState } from "react";
import type { AugmentInsight, AugmentRarity } from "../../../shared/types";

const GROUPS: { rarity: AugmentRarity; label: string; ring: string }[] = [
  { rarity: "prismatic", label: "Prismáticos", ring: "ring-fuchsia-400/50" },
  { rarity: "gold", label: "Oro", ring: "ring-amber-400/50" },
  { rarity: "silver", label: "Plata", ring: "ring-slate-300/40" },
];

function Verdict({ augment, compact }: { augment: AugmentInsight; compact: boolean }) {
  if (!augment.verdict) return null;
  const up = augment.verdict === "up";
  const title = `En ${augment.allGames.toLocaleString("es")} partidas con cualquier campeón gana claramente ${up ? "más" : "menos"} de lo normal`;
  return (
    <span title={title} className={`font-semibold ${up ? "text-emerald-300" : "text-red-300"}`}>
      {up ? "▲" : "▼"}
      {!compact && (up ? " gana más" : " gana menos")}
    </span>
  );
}

/**
 * Augments grouped like the in-game offers (each offer has one rarity), the
 * most picked first. `perGroup` keeps it short; the windows can open the rest,
 * the overlay (`compact`) can't be clicked.
 */
export function AugmentGroups({
  augments,
  championName,
  perGroup = 4,
  compact = false,
}: {
  augments: AugmentInsight[];
  championName?: string;
  perGroup?: number;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const groups = GROUPS.map((g) => ({ ...g, items: augments.filter((a) => a.rarity === g.rarity) })).filter(
    (g) => g.items.length > 0
  );
  if (groups.length === 0) return null;
  const canExpand = !compact && groups.some((g) => g.items.length > perGroup);
  const size = compact ? 22 : 28;
  const who = championName ?? "este campeón";
  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      {groups.map((group) => (
        <div key={group.rarity}>
          <p className="label mb-1">{group.label}</p>
          <ul className={compact ? "space-y-1" : "space-y-1.5"}>
            {(expanded ? group.items : group.items.slice(0, perGroup)).map((a) => (
              <li key={a.augmentId} className="flex items-center gap-2">
                {a.icon ? (
                  <img
                    src={a.icon}
                    alt=""
                    width={size}
                    height={size}
                    draggable={false}
                    style={{ width: size, height: size }}
                    className={`shrink-0 rounded ring-1 ${group.ring}`}
                  />
                ) : (
                  <span className={`shrink-0 rounded bg-gray-800 ring-1 ${group.ring}`} style={{ width: size, height: size }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-gray-100 ${compact ? "text-[12px]" : "text-[13px]"}`}>{a.name}</span>
                  {!compact && (
                    <span className="block truncate text-[11px] text-gray-500">
                      {a.wins}V-{a.games - a.wins}D con {who}
                      {a.verdict && " · "}
                      <Verdict augment={a} compact={false} />
                    </span>
                  )}
                </span>
                {compact && (
                  <span className="text-[11px]">
                    <Verdict augment={a} compact />
                  </span>
                )}
                <span className="text-[11px] font-semibold text-gray-300" title={`Lo llevan el ${a.pickRate}% de las partidas de ${who}`}>
                  {a.pickRate}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-semibold text-gold-400 transition-colors hover:text-gold-100"
        >
          {expanded ? "Ver menos" : "Ver todos"}
        </button>
      )}
    </div>
  );
}
