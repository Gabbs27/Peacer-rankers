import { describe, it, expect } from "vitest";
import { addGame, emptyStore, type ClientGame } from "@/lib/mayhem";
import type { AugmentInfo } from "../../shared/augments";
import { matchOffer, nameIndex, normalizeName, offerInsights, type OcrLine } from "./offer";

const info = (name: string, rarity: AugmentInfo["rarity"] = "gold"): AugmentInfo => ({ name, rarity, icon: null });

// Arena and Mayhem ids for the same names, as in the client's catalog.
const CATALOG = new Map<number, AugmentInfo>([
  [20, info("Dawnbringer's Resolve")],
  [1020, info("Dawnbringer's Resolve")],
  [13, info("Celestial Body")],
  [1013, info("Celestial Body")],
  [1353, info("Tank Engine")],
  [1048, info("Deft", "silver")],
  [1099, info("Escape Plan", "silver")],
]);

const line = (text: string, x: number, y = 0.48): OcrLine => ({ text, x, y, w: 0.1, h: 0.02 });

describe("matchOffer", () => {
  it("finds the card titles left to right among descriptions and other text", () => {
    const lines = [
      line("Tank Englne", 0.64), // OCR slip
      line("Resilience", 0.29, 0.51),
      line("When dropping below 50% Health, heal", 0.24, 0.56),
      line("Dawnbringer’s Resolve", 0.25), // curly apostrophe
      line("Celestial Body", 0.45),
      line("Clarin", 0.38, 0.39), // a player's name behind the cards
    ];
    expect(matchOffer(lines, nameIndex(CATALOG))).toEqual([
      { ids: [20, 1020], x: 0.25 },
      { ids: [13, 1013], x: 0.45 },
      { ids: [1353], x: 0.64 },
    ]);
  });

  it("only takes short names when they match exactly", () => {
    const index = nameIndex(CATALOG);
    expect(matchOffer([line("Deft", 0.3)], index)).toEqual([{ ids: [1048], x: 0.3 }]);
    expect(matchOffer([line("Deff", 0.3), line("Left", 0.5)], index)).toEqual([]);
    expect(normalizeName("  Café Àlo-ha! ")).toBe("cafe alo ha");
  });
});

/** A Mayhem game where Briar (233) takes `augments`; nine champions without any. */
function game(id: number, augments: number[], win = true): ClientGame {
  return {
    gameId: id,
    queueId: 2400,
    gameVersion: "16.20.1",
    gameDuration: 1200,
    participants: Array.from({ length: 10 }, (_, i) => ({
      championId: i === 0 ? 233 : 1000 + i,
      spell1Id: 4,
      spell2Id: 32,
      stats: i === 0 ? { win, ...Object.fromEntries(augments.map((a, j) => [`playerAugment${j + 1}`, a])) } : { win: i < 5 },
    })),
  };
}

describe("offerInsights", () => {
  it("ranks the offer by what the champion's players pick and marks the one to take", () => {
    const store = emptyStore();
    const seen = new Set<number>();
    let id = 1;
    for (let i = 0; i < 6; i++) addGame(store, seen, game(id++, [1020]));
    for (let i = 0; i < 3; i++) addGame(store, seen, game(id++, [1353]));

    const offer = offerInsights(store, CATALOG, 233, [
      { ids: [20, 1020], x: 0.25 },
      { ids: [13, 1013], x: 0.45 },
      { ids: [1353], x: 0.64 },
    ]);
    expect(offer.map((o) => [o.augmentId, o.rank, o.ranked, o.pickRate, o.best])).toEqual([
      [1020, 1, 2, 67, true], // the Mayhem id, the one with data
      [1013, null, 2, null, false], // never taken by Briar's players
      [1353, 2, 2, 33, false],
    ]);
  });

  it("gives no star when the best card is far from the top", () => {
    const store = emptyStore();
    const seen = new Set<number>();
    let id = 1;
    // Twelve gold augments Briar's players take more than Tank Engine (1353).
    const others = Array.from({ length: 12 }, (_, i) => 2000 + i);
    const catalog = new Map(CATALOG);
    for (const other of others) {
      catalog.set(other, info(`Other Gold ${other}`));
      for (let i = 0; i < 4; i++) addGame(store, seen, game(id++, [other]));
    }
    for (let i = 0; i < 2; i++) addGame(store, seen, game(id++, [1353]));

    const offer = offerInsights(store, catalog, 233, [
      { ids: [13, 1013], x: 0.3 },
      { ids: [1353], x: 0.6 },
    ]);
    expect(offer.map((o) => [o.augmentId, o.rank, o.best])).toEqual([
      [1013, null, false],
      [1353, 13, false], // #13 of 13: a weak hint, no star
    ]);
  });
});
