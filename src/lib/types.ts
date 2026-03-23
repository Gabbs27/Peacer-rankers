// Riot Account API response
export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

// Summoner API response
export interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

// League entry (ranked data)
export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

// Match participant
export interface MatchParticipant {
  puuid: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championName: string;
  championId: number;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamId: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  individualPosition: string;
  role: string;
  totalDamageDealt: number;
  totalDamageTaken: number;
  magicDamageDealtToChampions: number;
  physicalDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  totalHeal: number;
  killingSprees: number;
  largestKillingSpree: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  firstBloodKill: boolean;
  turretKills: number;
  dragonKills: number;
  baronKills: number;
  perks: ParticipantPerks;
}

export interface ParticipantPerks {
  statPerks: {
    defense: number;
    flex: number;
    offense: number;
  };
  styles: PerkStyle[];
}

export interface PerkStyle {
  description: string;
  style: number;
  selections: PerkSelection[];
}

export interface PerkSelection {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
}

// Match team data
export interface MatchTeam {
  teamId: number;
  win: boolean;
  bans: { championId: number; pickTurn: number }[];
  objectives: {
    baron: { first: boolean; kills: number };
    champion: { first: boolean; kills: number };
    dragon: { first: boolean; kills: number };
    inhibitor: { first: boolean; kills: number };
    riftHerald: { first: boolean; kills: number };
    tower: { first: boolean; kills: number };
  };
}

// Full match info
export interface MatchInfo {
  gameCreation: number;
  gameDuration: number;
  gameId: number;
  gameMode: string;
  gameType: string;
  gameVersion: string;
  mapId: number;
  queueId: number;
  participants: MatchParticipant[];
  teams: MatchTeam[];
}

// Match metadata
export interface MatchMetadata {
  matchId: string;
  participants: string[];
}

// Full match response
export interface MatchData {
  metadata: MatchMetadata;
  info: MatchInfo;
}

// Regions
export type Region = "na1" | "euw1" | "eun1" | "kr" | "br1" | "la1" | "la2" | "oc1" | "tr1" | "ru" | "jp1" | "ph2" | "sg2" | "th2" | "tw2" | "vn2";

export type RegionalRoute = "americas" | "europe" | "asia" | "sea";

export const REGION_TO_ROUTE: Record<Region, RegionalRoute> = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  kr: "asia",
  jp1: "asia",
  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

export const REGION_LABELS: Record<Region, string> = {
  na1: "NA",
  euw1: "EUW",
  eun1: "EUNE",
  kr: "KR",
  br1: "BR",
  la1: "LAN",
  la2: "LAS",
  oc1: "OCE",
  tr1: "TR",
  ru: "RU",
  jp1: "JP",
  ph2: "PH",
  sg2: "SG",
  th2: "TH",
  tw2: "TW",
  vn2: "VN",
};

// Automated tips
export interface Tip {
  category: "cs" | "vision" | "kda" | "killParticipation" | "damage" | "duration" | "gold" | "teamAnalysis";
  level: "good" | "ok" | "bad";
  message: string;
  value: number;
}

// Performance scoring
export interface PerformanceScore {
  micro: number;
  macro: number;
  overall: number;
  rankEquivalent: string;
  rankDivision: string;
  microBreakdown: ScoreBreakdown[];
  macroBreakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

// Summoner profile (aggregated)
export interface SummonerProfile {
  account: RiotAccount;
  summoner: Summoner;
  ranked: LeagueEntry[];
  recentMatches: MatchData[];
}
