import { describe, it, expect } from "vitest";
import {
  normalizeChampionName,
  getChampionDamageType,
  CHAMPION_DAMAGE,
} from "./champion-data";

describe("normalizeChampionName", () => {
  it("maps Data Dragon ids that differ from map keys", () => {
    // The exact bug fixed in M3: the planner passes Data Dragon ids.
    expect(normalizeChampionName("Kaisa")).toBe("KaiSa");
    expect(normalizeChampionName("MonkeyKing")).toBe("Wukong");
    expect(normalizeChampionName("FiddleSticks")).toBe("Fiddlesticks");
  });

  it("maps Riot display names with punctuation", () => {
    expect(normalizeChampionName("Kai'Sa")).toBe("KaiSa");
    expect(normalizeChampionName("Cho'Gath")).toBe("Chogath");
    expect(normalizeChampionName("Lee Sin")).toBe("LeeSin");
    expect(normalizeChampionName("Dr. Mundo")).toBe("DrMundo");
  });

  it("strips punctuation for unknown names", () => {
    expect(normalizeChampionName("Ezreal")).toBe("Ezreal");
  });
});

describe("getChampionDamageType", () => {
  it("classifies Kai'Sa as HYBRID via either id form (regression for M3)", () => {
    // Before the fix, the DDragon id 'Kaisa' fell through to the 'AD' default,
    // giving Kai'Sa a bruiser build instead of an ADC build.
    expect(getChampionDamageType("Kaisa")).toBe("HYBRID");
    expect(getChampionDamageType("KaiSa")).toBe("HYBRID");
    expect(getChampionDamageType("Kai'Sa")).toBe("HYBRID");
  });

  it("classifies Wukong correctly from its DDragon id", () => {
    expect(getChampionDamageType("MonkeyKing")).toBe("AD");
    expect(getChampionDamageType("Wukong")).toBe("AD");
  });

  it("has a single, consistent classification for Naafiri (A6 divergence fix)", () => {
    expect(getChampionDamageType("Naafiri")).toBe("AD");
    expect(CHAMPION_DAMAGE["Naafiri"]).toBe("AD");
  });

  it("defaults unknown champions to AD", () => {
    expect(getChampionDamageType("NotARealChampion")).toBe("AD");
  });
});
