// The app never holds a Riot API key: Riot data comes from the LoL Tracker web
// API, which keeps the key server-side. Only a few read-only paths are allowed.

export const WEB_BASE = (process.env.LOL_TRACKER_WEB ?? "https://peacer-rankers.vercel.app").replace(/\/+$/, "");

const API_PATHS = [
  /^\/api\/summoner\?[\w=&%.~!'()*-]+$/,
  /^\/api\/matches\?[\w=&%.-]+$/,
  /^\/api\/live-game\?[\w=&%.-]+$/,
  /^\/api\/scout\?[\w=&%.-]+$/,
];

const WEB_PATHS = /^\/summoner\/[a-z0-9]+\/[^/?#\s]+$/;

export function isAllowedApiPath(path: unknown): path is string {
  return typeof path === "string" && path.length < 4000 && !path.includes("..") && API_PATHS.some((re) => re.test(path));
}

/** Absolute URL for a profile page of the website, or null for anything else. */
export function webUrl(path: unknown): string | null {
  return typeof path === "string" && WEB_PATHS.test(path) ? `${WEB_BASE}${path}` : null;
}

export async function apiGet(path: string): Promise<unknown> {
  if (!isAllowedApiPath(path)) throw new Error("Ruta de API no permitida");
  const res = await fetch(`${WEB_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : `Error ${res.status}`;
    throw new Error(message);
  }
  return data;
}
