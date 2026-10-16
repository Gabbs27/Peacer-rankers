import type { AugmentRarity } from "./types";

export interface AugmentInfo {
  name: string;
  rarity: AugmentRarity;
  icon: string | null;
}

interface CatalogEntry {
  id?: unknown;
  nameTRA?: string;
  augmentSmallIconPath?: string;
  rarity?: string;
}

const RARITIES: Record<string, AugmentRarity> = { kPrismatic: "prismatic", kGold: "gold", kSilver: "silver" };

/**
 * The client serves game assets under /lol-game-data/assets/…; CommunityDragon
 * mirrors the same files (lower-cased) on a public URL the windows can load.
 */
export function cdragonUrl(clientPath: string | undefined): string | null {
  const prefix = "/lol-game-data/assets/";
  if (!clientPath?.startsWith(prefix)) return null;
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${clientPath.slice(prefix.length).toLowerCase()}`;
}

/** Parses cherry-augments.json (Arena and Mayhem share it) from the client or CommunityDragon. */
export function parseAugmentCatalog(list: unknown): Map<number, AugmentInfo> {
  const catalog = new Map<number, AugmentInfo>();
  for (const a of Array.isArray(list) ? (list as CatalogEntry[]) : []) {
    if (typeof a?.id !== "number") continue;
    catalog.set(a.id, {
      name: a.nameTRA?.trim() || `Aumento ${a.id}`,
      rarity: RARITIES[a.rarity ?? ""] ?? "other",
      icon: cdragonUrl(a.augmentSmallIconPath),
    });
  }
  return catalog;
}
