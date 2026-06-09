import { unstable_cache } from "next/cache";
import {
  RiotAccount,
  Summoner,
  LeagueEntry,
  MatchData,
  Region,
  REGION_TO_ROUTE,
  REGION_TO_ACCOUNT_ROUTE,
  isValidRegion,
  CurrentGameInfo,
} from "./types";

const API_KEY = process.env.RIOT_API_KEY;

/**
 * Typed error for every Riot API failure.
 *
 * `message` is detailed (status + url + upstream body) and is for SERVER-SIDE logs only.
 * `publicMessage` is a generic, safe string that route handlers surface to the client —
 * so we never leak the request URL or Riot's raw error body to the browser (fixes M6).
 */
export class RiotApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RiotApiError";
    this.status = status;
  }

  get publicMessage(): string {
    switch (this.status) {
      case 400:
        return "Solicitud inválida.";
      case 401:
      case 403:
        return "El servicio de Riot rechazó la petición (API key inválida o sin permisos).";
      case 404:
        return "No encontrado.";
      case 429:
        return "Demasiadas solicitudes a Riot. Intenta de nuevo en unos segundos.";
      default:
        return this.status >= 500
          ? "El servicio de Riot no está disponible ahora mismo."
          : "No se pudieron obtener los datos.";
    }
  }
}

// Cache lifetimes (seconds), tuned to how mutable each resource is.
// Caching is done with unstable_cache, which only stores SUCCESSFUL results —
// a throw (404/429/5xx) is never cached.
const TTL = {
  account: 60 * 60, // riot-id -> puuid almost never changes
  summoner: 10 * 60, // level / profile icon change slowly
  league: 5 * 60, // rank / LP
  matchIds: 60, // recent match list
  match: 24 * 60 * 60, // a finished match is immutable
} as const;

const MAX_RETRIES = 2;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Raw Riot fetch. Caching is intentionally OFF here (`cache: "no-store"`) — the
 * unstable_cache wrappers below own persistence so that failures are never cached.
 * Handles 429 by honoring Retry-After with a bounded number of retries.
 */
async function fetchRiotRaw<T>(url: string): Promise<T> {
  if (!API_KEY) {
    throw new RiotApiError("RIOT_API_KEY is not configured on the server", 500);
  }

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "X-Riot-Token": API_KEY },
      cache: "no-store",
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "1", 10);
      const seconds = Number.isFinite(retryAfter) ? Math.min(retryAfter, 5) : 1;
      await delay(seconds * 1000);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Detailed, server-only message. Routes surface `publicMessage`, not this.
      throw new RiotApiError(
        `Riot API ${res.status} ${res.statusText} for ${url} :: ${body.slice(0, 300)}`,
        res.status
      );
    }

    return (await res.json()) as T;
  }
}

// Host builders. Each validates `region` BEFORE interpolating it into a hostname,
// so an unvalidated value can never produce `https://undefined.api...` or, worse,
// `https://attacker.com/...` that would leak the X-Riot-Token header (SSRF — fixes A2).
function platformHost(region: Region): string {
  if (!isValidRegion(region)) throw new RiotApiError(`Invalid region: ${String(region)}`, 400);
  return `https://${region}.api.riotgames.com`;
}

function matchHost(region: Region): string {
  if (!isValidRegion(region)) throw new RiotApiError(`Invalid region: ${String(region)}`, 400);
  return `https://${REGION_TO_ROUTE[region]}.api.riotgames.com`;
}

function accountHost(region: Region): string {
  if (!isValidRegion(region)) throw new RiotApiError(`Invalid region: ${String(region)}`, 400);
  return `https://${REGION_TO_ACCOUNT_ROUTE[region]}.api.riotgames.com`;
}

// --- Cached endpoint wrappers (unstable_cache keys on the function args automatically) ---

const cachedAccount = unstable_cache(
  (gameName: string, tagLine: string, region: Region) =>
    fetchRiotRaw<RiotAccount>(
      `${accountHost(region)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    ),
  ["riot-account"],
  { revalidate: TTL.account }
);

const cachedSummoner = unstable_cache(
  (puuid: string, region: Region) =>
    fetchRiotRaw<Summoner>(
      `${platformHost(region)}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`
    ),
  ["riot-summoner"],
  { revalidate: TTL.summoner }
);

const cachedLeague = unstable_cache(
  (puuid: string, region: Region) =>
    fetchRiotRaw<LeagueEntry[]>(
      `${platformHost(region)}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`
    ),
  ["riot-league"],
  { revalidate: TTL.league }
);

const cachedMatchIds = unstable_cache(
  (puuid: string, region: Region, count: number, start: number, queue?: number) => {
    let url = `${matchHost(region)}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?count=${count}&start=${start}`;
    if (queue) url += `&queue=${queue}`;
    return fetchRiotRaw<string[]>(url);
  },
  ["riot-match-ids"],
  { revalidate: TTL.matchIds }
);

const cachedMatch = unstable_cache(
  (matchId: string, region: Region) =>
    fetchRiotRaw<MatchData>(
      `${matchHost(region)}/lol/match/v5/matches/${encodeURIComponent(matchId)}`
    ),
  ["riot-match"],
  { revalidate: TTL.match }
);

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  region: Region
): Promise<RiotAccount> {
  return cachedAccount(gameName, tagLine, region);
}

export async function getSummonerByPuuid(puuid: string, region: Region): Promise<Summoner> {
  return cachedSummoner(puuid, region);
}

export async function getLeagueEntries(puuid: string, region: Region): Promise<LeagueEntry[]> {
  return cachedLeague(puuid, region);
}

export async function getMatchIds(
  puuid: string,
  region: Region,
  count: number = 20,
  start: number = 0,
  queue?: number
): Promise<string[]> {
  return cachedMatchIds(puuid, region, count, start, queue);
}

export async function getMatch(matchId: string, region: Region): Promise<MatchData> {
  return cachedMatch(matchId, region);
}

export async function getCurrentGame(
  puuid: string,
  region: Region
): Promise<CurrentGameInfo | null> {
  // Live data — fetched fresh (not cached) so "in game" status is accurate.
  try {
    return await fetchRiotRaw<CurrentGameInfo>(
      `${platformHost(region)}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`
    );
  } catch (error) {
    if (error instanceof RiotApiError && error.status === 404) {
      return null; // not in a game
    }
    throw error;
  }
}

/**
 * Fetch many matches with bounded concurrency. Uses allSettled so that a single
 * failed match (a purged 404, a transient 5xx) degrades the history to the matches
 * that DID load instead of throwing away all of them (fixes A3). No fixed sleep:
 * cache hits resolve instantly and real rate limits are handled by 429 backoff (M1).
 */
export async function getMatches(matchIds: string[], region: Region): Promise<MatchData[]> {
  const out: MatchData[] = [];
  for (let i = 0; i < matchIds.length; i += 5) {
    const batch = matchIds.slice(i, i + 5);
    const settled = await Promise.allSettled(batch.map((id) => getMatch(id, region)));
    for (const result of settled) {
      if (result.status === "fulfilled") out.push(result.value);
    }
  }
  return out;
}
