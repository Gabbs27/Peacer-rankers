import { useState } from "react";
import type { AugmentInsight, AugmentRarity, OfferedAugment } from "../../../shared/types";
import type { ItemInfo } from "../data";
import { pairedFinished } from "./builds";
import { ItemIcon } from "./ui";

const GROUPS: { rarity: AugmentRarity; label: string; ring: string }[] = [
  { rarity: "prismatic", label: "Prismáticos", ring: "ring-fuchsia-400/50" },
  { rarity: "gold", label: "Oro", ring: "ring-amber-400/50" },
  { rarity: "silver", label: "Plata", ring: "ring-slate-300/40" },
];

function groupsOf(augments: AugmentInsight[]) {
  return GROUPS.map((g) => ({ ...g, items: augments.filter((a) => a.rarity === g.rarity) })).filter((g) => g.items.length > 0);
}

function AugmentIcon({ augment, size, ring }: { augment: { icon: string | null }; size: number; ring: string }) {
  return augment.icon ? (
    <img
      src={augment.icon}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded ring-1 ${ring}`}
    />
  ) : (
    <span className={`shrink-0 rounded bg-gray-800 ring-1 ${ring}`} style={{ width: size, height: size }} />
  );
}

function Verdict({ augment, compact }: { augment: Pick<AugmentInsight, "verdict"> & { allGames?: number }; compact: boolean }) {
  if (!augment.verdict) return null;
  const up = augment.verdict === "up";
  const where = augment.allGames ? `En ${augment.allGames.toLocaleString("es")} partidas con cualquier campeón g` : "G";
  const title = `${where}ana claramente ${up ? "más" : "menos"} de lo normal`;
  return (
    <span title={title} className={`font-semibold ${up ? "text-emerald-300" : "text-red-300"}`}>
      {up ? "▲" : "▼"}
      {!compact && (up ? " gana más" : " gana menos")}
    </span>
  );
}

/** Items its takers build more than usual: what to buy if you take it. */
function PairedItems({
  augment,
  items,
  version,
  size,
  limit = 2,
}: {
  augment: { items: number[] };
  items: Map<number, ItemInfo> | null;
  version: string | undefined;
  size: number;
  limit?: number;
}) {
  const ids = version ? pairedFinished(augment.items, items, limit) : [];
  if (ids.length === 0) return null;
  return (
    <span className="flex shrink-0 gap-0.5" title={`Quien lo toma suele armar: ${ids.map((id) => items?.get(id)?.name).join(", ")}`}>
      {ids.map((id) => (
        <ItemIcon key={id} itemId={id} version={version!} size={size} />
      ))}
    </span>
  );
}

/**
 * Augments grouped like the in-game offers (each offer has one rarity), the
 * most picked first, with the items that go with each. `perGroup` keeps it
 * short; the windows can open the rest, the overlay (`compact`) can't be clicked.
 */
export function AugmentGroups({
  augments,
  championName,
  items = null,
  version,
  perGroup = 4,
  compact = false,
  ranked = false,
}: {
  augments: AugmentInsight[];
  championName?: string;
  items?: Map<number, ItemInfo> | null;
  version?: string;
  perGroup?: number;
  compact?: boolean;
  /** Numbers each row (the overlay's tier list, to find the cards on offer by position). */
  ranked?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const groups = groupsOf(augments);
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
            {(expanded ? group.items : group.items.slice(0, perGroup)).map((a, i) => (
              <li key={a.augmentId} className="flex items-center gap-2">
                {ranked && <span className="w-3 shrink-0 text-right text-[10px] tabular-nums text-gray-500">{i + 1}</span>}
                <AugmentIcon augment={a} size={size} ring={group.ring} />
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
                <PairedItems augment={a} items={items} version={version} size={compact ? 16 : 20} limit={compact ? 1 : 2} />
                <span className="w-8 text-right text-[11px] font-semibold text-gray-300" title={`Lo llevan el ${a.pickRate}% de las partidas de ${who}`}>
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

/**
 * The augments the game is offering you, read from the screen: where each
 * stands among the ones your champion's players pick, and the best bet.
 */
export function OfferPanel({
  offer,
  championName,
  items,
  version,
}: {
  offer: OfferedAugment[];
  championName?: string;
  items: Map<number, ItemInfo> | null;
  version: string | undefined;
}) {
  const group = GROUPS.find((g) => g.rarity === offer[0]?.rarity);
  const who = championName ?? "tu campeón";
  const anyData = offer.some((o) => o.rank !== null);
  return (
    <div>
      <p className="label mb-1.5">Te ofrecen{group ? ` · ${group.label}` : ""}</p>
      <ul className="space-y-1">
        {offer.map((o) => (
          <li
            key={o.augmentId}
            className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${o.best ? "bg-gold-500/15 ring-1 ring-gold-400/60" : ""}`}
          >
            <AugmentIcon augment={o} size={26} ring={group?.ring ?? "ring-white/10"} />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[12.5px] ${o.best ? "font-semibold text-gold-100" : "text-gray-100"}`}>{o.name}</span>
              <span className="block truncate text-[10.5px] text-gray-400">
                {o.best && <span className="font-bold text-gold-100">★ Mejor · </span>}
                {o.rank !== null ? `#${o.rank} de ${o.ranked} con ${who} · ${o.pickRate}%` : `Casi no lo eligen con ${who}`}
                {o.verdict && " · "}
                <Verdict augment={o} compact={false} />
              </span>
            </span>
            <PairedItems augment={o} items={items} version={version} size={16} />
          </li>
        ))}
      </ul>
      {!anyData && <p className="mt-1.5 text-[10.5px] text-gray-500">Aún no hay datos de {who} con estos aumentos.</p>}
    </div>
  );
}
