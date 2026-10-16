import { augmentItemsFor, augmentsFor, bestMayhemSpells, buildFor, championWinrates, type MayhemStore } from "@/lib/mayhem";
import type { AugmentInsight, AugmentRarity, ChampionInsight } from "../../shared/types";
import type { AugmentInfo } from "../../shared/augments";

/** The in-game offers come one rarity at a time, so keep the best few of each. */
const PER_RARITY = 8;

/** What the windows show for each champion, from the local Mayhem JSON. */
export function championInsights(
  store: MayhemStore,
  catalog: Map<number, AugmentInfo>,
  championIds: number[]
): ChampionInsight[] {
  const winrates = championWinrates(store, championIds);
  return championIds.map((championId, i) => {
    const kept = new Map<AugmentRarity, number>();
    const augments: AugmentInsight[] = [];
    for (const pick of augmentsFor(store, championId)?.picks ?? []) {
      const info = catalog.get(pick.augmentId);
      const rarity = info?.rarity ?? "other";
      const count = kept.get(rarity) ?? 0;
      if (count >= PER_RARITY) continue;
      kept.set(rarity, count + 1);
      augments.push({
        ...pick,
        name: info?.name ?? `Aumento ${pick.augmentId}`,
        rarity,
        icon: info?.icon ?? null,
        items: augmentItemsFor(store, pick.augmentId, { championId }).map((item) => item.itemId),
      });
    }
    return {
      championId,
      games: winrates[i].games,
      wins: winrates[i].wins,
      winrate: winrates[i].winrate,
      augments,
      spells: bestMayhemSpells(store, championId),
      build: buildFor(store, championId),
    };
  });
}
