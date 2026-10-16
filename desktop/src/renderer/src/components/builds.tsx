import type { ItemPick } from "@/lib/mayhem";
import type { ItemInfo } from "../data";
import { ItemIcon } from "./ui";

/** The most built finished items (Data Dragon says which are finished), most built first. */
export function finishedItems(build: ItemPick[], items: Map<number, ItemInfo> | null, limit = 6): ItemPick[] {
  if (!items) return [];
  return build.filter((pick) => items.get(pick.itemId)?.finished).slice(0, limit);
}

export function BuildRow({
  build,
  items,
  version,
  size = 30,
}: {
  build: ItemPick[];
  items: Map<number, ItemInfo> | null;
  version: string;
  size?: number;
}) {
  const picks = finishedItems(build, items);
  if (picks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {picks.map((pick) => (
        <span key={pick.itemId} className="flex flex-col items-center gap-0.5">
          <ItemIcon
            itemId={pick.itemId}
            version={version}
            size={size}
            title={`${items?.get(pick.itemId)?.name ?? "Objeto"} · en el ${pick.pickRate}% de sus partidas`}
          />
          {size >= 26 && <span className="text-[10px] text-gray-500">{pick.pickRate}%</span>}
        </span>
      ))}
    </div>
  );
}

/** The finished items that go with an augment (what its takers build more than usual). */
export function pairedFinished(itemIds: number[], items: Map<number, ItemInfo> | null, limit = 2): number[] {
  if (!items) return [];
  return itemIds.filter((id) => items.get(id)?.finished).slice(0, limit);
}
