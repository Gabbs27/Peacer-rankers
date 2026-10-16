import { describe, it, expect } from "vitest";
import type { LeagueEntry } from "./types";
import { parseScoutPlayers, scoutPlayer } from "./scouting";

const NOW = Date.UTC(2026, 9, 16);
const DAY = 86_400_000;

function solo(over: Partial<LeagueEntry> = {}): LeagueEntry {
  return {
    leagueId: "l",
    summonerId: "s",
    queueType: "RANKED_SOLO_5x5",
    tier: "GOLD",
    rank: "II",
    leaguePoints: 45,
    wins: 20,
    losses: 20,
    hotStreak: false,
    veteran: false,
    freshBlood: false,
    inactive: false,
    ...over,
  };
}

const texts = (r: ReturnType<typeof scoutPlayer>) => r.signals.map((s) => `${s.tone}: ${s.text}`);

describe("scoutPlayer", () => {
  it("flags a first-timer on their champion as an opportunity", () => {
    const report = scoutPlayer({ championName: "Kayn", soloQueue: solo(), mastery: null }, NOW);
    expect(texts(report)).toContain("opportunity: Primera vez (o casi) con Kayn");
  });

  it("flags a specialist as a threat", () => {
    const report = scoutPlayer(
      { championName: "Graves", soloQueue: solo(), mastery: { championLevel: 30, championPoints: 250_000, lastPlayTime: NOW - DAY } },
      NOW
    );
    expect(texts(report)).toContain("threat: Especialista en Graves (250k pts)");
  });

  it("notices a champion they have not played in months", () => {
    const report = scoutPlayer(
      { championName: "Vi", soloQueue: solo(), mastery: { championLevel: 8, championPoints: 50_000, lastPlayTime: NOW - 120 * DAY } },
      NOW
    );
    expect(texts(report)).toContain("opportunity: No jugaba Vi desde hace 4 meses");
  });

  it("formats the rank with and without a division", () => {
    expect(scoutPlayer({ championName: "Vi", soloQueue: solo(), mastery: null }, NOW).rank).toBe("Oro II · 45 LP");
    expect(
      scoutPlayer({ championName: "Vi", soloQueue: solo({ tier: "MASTER", rank: "I", leaguePoints: 120 }), mastery: null }, NOW).rank
    ).toBe("Master · 120 LP");
  });

  it("only calls out a winrate with a real sample", () => {
    const small = scoutPlayer({ championName: "Vi", soloQueue: solo({ wins: 28, losses: 12 }), mastery: null }, NOW);
    expect(small.signals.some((s) => s.text.includes("de victorias"))).toBe(false);
    const big = scoutPlayer({ championName: "Vi", soloQueue: solo({ wins: 60, losses: 40 }), mastery: null }, NOW);
    expect(texts(big)).toContain("threat: 60% de victorias en 100 partidas");
  });

  it("reports streaks and unranked players", () => {
    expect(texts(scoutPlayer({ championName: "Vi", soloQueue: solo({ hotStreak: true }), mastery: null }, NOW))).toContain(
      "threat: En racha de victorias"
    );
    const unranked = scoutPlayer({ championName: "Vi", soloQueue: null, mastery: null }, NOW);
    expect(unranked.rank).toBeNull();
    expect(texts(unranked)).toContain("info: Sin clasificar en Solo/Duo");
  });
});

describe("parseScoutPlayers", () => {
  const PUUID = "PPwn26d1UuILyxFOcBO2WFGyTVjC32zjOtZ9NRVsIzv5K9kBzdcdVBTbI_C2Gg3UYAW3mwV5F9PDIw";

  it("parses puuid:championId:ChampionName entries", () => {
    expect(parseScoutPlayers(`${PUUID}:233:Briar,${PUUID}:104:Graves`)).toEqual([
      { puuid: PUUID, championId: 233, championName: "Briar" },
      { puuid: PUUID, championId: 104, championName: "Graves" },
    ]);
  });

  it("rejects malformed or oversized lists instead of scouting part of them", () => {
    expect(parseScoutPlayers(null)).toBeNull();
    expect(parseScoutPlayers("")).toBeNull();
    expect(parseScoutPlayers(`${PUUID}:abc:Briar`)).toBeNull();
    expect(parseScoutPlayers(`${PUUID}:233:Bri@r`)).toBeNull();
    expect(parseScoutPlayers(`../etc:233:Briar`)).toBeNull();
    expect(parseScoutPlayers(`${PUUID}:233:Briar:extra`)).toBeNull();
    expect(parseScoutPlayers(Array(11).fill(`${PUUID}:233:Briar`).join(","))).toBeNull();
  });
});
