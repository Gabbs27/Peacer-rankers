import { augmentItemsFor, augmentsFor, type MayhemStore } from "@/lib/mayhem";
import type { AugmentInfo } from "../../shared/augments";
import type { OfferedAugment } from "../../shared/types";

/** A line of text the screen reader found, coordinates 0-1 from the top left. */
export interface OcrLine {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** "Dawnbringer’s Resolve" -> "dawnbringer s resolve": what OCR and the catalog agree on. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Names to augment ids: Arena and Mayhem each have their own id for most names. */
export function nameIndex(catalog: Map<number, AugmentInfo>): Map<string, number[]> {
  const index = new Map<string, number[]>();
  for (const [id, info] of catalog) {
    const key = normalizeName(info.name);
    if (!key || key.startsWith("aumento ")) continue;
    index.set(key, [...(index.get(key) ?? []), id]);
  }
  return index;
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** OCR slips a letter or two on long names; short ones ("Deft", "Bonk") must match exactly. */
function lookup(text: string, index: Map<string, number[]>): { name: string; ids: number[] } | null {
  const key = normalizeName(text);
  if (key.length < 4) return null;
  const exact = index.get(key);
  if (exact) return { name: key, ids: exact };
  if (key.length < 8) return null;
  const allowed = key.length >= 16 ? 2 : 1;
  let best: { name: string; ids: number[]; d: number } | null = null;
  for (const [name, ids] of index) {
    if (Math.abs(name.length - key.length) > allowed) continue;
    const d = distance(key, name);
    if (d <= allowed && (!best || d < best.d)) best = { name, ids, d };
  }
  return best && { name: best.name, ids: best.ids };
}

export interface OfferMatch {
  /** Every catalog id with this name. */
  ids: number[];
  x: number;
}

/** The augment names among the lines read, left to right as the cards are. */
export function matchOffer(lines: OcrLine[], index: Map<string, number[]>): OfferMatch[] {
  const found = new Map<string, OfferMatch>();
  for (const line of lines) {
    const hit = lookup(line.text, index);
    if (hit && !found.has(hit.name)) found.set(hit.name, { ids: hit.ids, x: line.x });
  }
  return [...found.values()].sort((a, b) => a.x - b.x).slice(0, 4);
}

/**
 * A card is only worth a star near the top of what the champion's players
 * pick: #18 of 29 is a weak hint, even if the other cards have no data.
 */
function strongPick(o: OfferedAugment): boolean {
  if (o.rank === null) return false;
  return o.verdict === "up" || o.rank <= Math.min(10, Math.ceil(o.ranked / 2));
}

/**
 * The offered augments with where each stands among the ones this champion's
 * players pick most (by rarity, as the offers come), and which one to take:
 * the most picked, with one that clearly wins more first and one that clearly
 * loses last, and only if it's near the top.
 */
export function offerInsights(
  store: MayhemStore,
  catalog: Map<number, AugmentInfo>,
  championId: number,
  matches: OfferMatch[]
): OfferedAugment[] {
  const picks = augmentsFor(store, championId)?.picks ?? [];
  const rarityOf = (id: number) => catalog.get(id)?.rarity ?? "other";
  const offered = matches.map((match): OfferedAugment => {
    // Prefer the id the champion's games actually have (the Mayhem one).
    const id = match.ids.find((i) => picks.some((p) => p.augmentId === i)) ?? Math.max(...match.ids);
    const info = catalog.get(id);
    const sameRarity = picks.filter((p) => rarityOf(p.augmentId) === rarityOf(id));
    const at = sameRarity.findIndex((p) => p.augmentId === id);
    const pick = at >= 0 ? sameRarity[at] : null;
    return {
      augmentId: id,
      name: info?.name ?? `Aumento ${id}`,
      rarity: info?.rarity ?? "other",
      icon: info?.icon ?? null,
      rank: pick ? at + 1 : null,
      ranked: sameRarity.length,
      pickRate: pick?.pickRate ?? null,
      games: pick?.games ?? 0,
      wins: pick?.wins ?? 0,
      verdict: pick?.verdict ?? null,
      items: augmentItemsFor(store, id, { championId }).map((item) => item.itemId),
      best: false,
    };
  });
  const candidates = offered.filter((o) => o.rank !== null);
  const usable = candidates.some((o) => o.verdict !== "down") ? candidates.filter((o) => o.verdict !== "down") : candidates;
  const best = usable.sort((a, b) => (a.verdict === "up" ? -1 : 0) - (b.verdict === "up" ? -1 : 0) || a.rank! - b.rank!)[0];
  if (best && strongPick(best)) best.best = true;
  return offered;
}
