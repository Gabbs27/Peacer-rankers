import {
  RiotAccount,
  Summoner,
  LeagueEntry,
  MatchData,
  Region,
  RegionalRoute,
  REGION_TO_ROUTE,
} from "./types";

const API_KEY = process.env.RIOT_API_KEY!;

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchRiot<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(url, {
    headers: { "X-Riot-Token": API_KEY },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Riot API error ${res.status}: ${res.statusText} - ${errorBody}`
    );
  }

  const data = await res.json();
  cache.set(url, { data, expires: Date.now() + CACHE_TTL });
  return data as T;
}

function regionalUrl(route: RegionalRoute): string {
  return `https://${route}.api.riotgames.com`;
}

function platformUrl(region: Region): string {
  return `https://${region}.api.riotgames.com`;
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  region: Region
): Promise<RiotAccount> {
  const route = REGION_TO_ROUTE[region];
  return fetchRiot<RiotAccount>(
    `${regionalUrl(route)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
}

export async function getSummonerByPuuid(
  puuid: string,
  region: Region
): Promise<Summoner> {
  return fetchRiot<Summoner>(
    `${platformUrl(region)}/lol/summoner/v4/summoners/by-puuid/${puuid}`
  );
}

export async function getLeagueEntries(
  puuid: string,
  region: Region
): Promise<LeagueEntry[]> {
  return fetchRiot<LeagueEntry[]>(
    `${platformUrl(region)}/lol/league/v4/entries/by-puuid/${puuid}`
  );
}

export async function getMatchIds(
  puuid: string,
  region: Region,
  count: number = 20,
  start: number = 0,
  queue?: number
): Promise<string[]> {
  const route = REGION_TO_ROUTE[region];
  let url = `${regionalUrl(route)}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}&start=${start}`;
  if (queue) url += `&queue=${queue}`;
  return fetchRiot<string[]>(url);
}

export async function getMatch(
  matchId: string,
  region: Region
): Promise<MatchData> {
  const route = REGION_TO_ROUTE[region];
  return fetchRiot<MatchData>(
    `${regionalUrl(route)}/lol/match/v5/matches/${matchId}`
  );
}

// Fetch multiple matches, respecting rate limits
export async function getMatches(
  matchIds: string[],
  region: Region
): Promise<MatchData[]> {
  const results: MatchData[] = [];
  for (let i = 0; i < matchIds.length; i += 5) {
    const batch = matchIds.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((id) => getMatch(id, region))
    );
    results.push(...batchResults);
    if (i + 5 < matchIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
  return results;
}
