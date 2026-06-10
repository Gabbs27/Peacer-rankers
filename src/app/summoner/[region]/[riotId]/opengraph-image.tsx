import { ImageResponse } from "next/og";
import { isValidRegion, REGION_LABELS, type Region } from "@/lib/types";
import { getAccountByRiotId, getLeagueEntries } from "@/lib/riot-api";

export const runtime = "nodejs";
export const alt = "Perfil de invocador en LoL Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#c8aa6e";
const PARCHMENT = "#f0e6d2";
const INK = "#0b1120";

function parseRiotId(riotId: string): { gameName: string; tagLine: string } {
  const decoded = decodeURIComponent(riotId);
  const sep = decoded.lastIndexOf("-");
  return {
    gameName: sep > 0 ? decoded.slice(0, sep) : decoded,
    tagLine: sep > 0 ? decoded.slice(sep + 1) : "",
  };
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ region: string; riotId: string }>;
}) {
  const { region, riotId } = await params;
  const { gameName, tagLine } = parseRiotId(riotId);

  // Best-effort rank lookup; the card still renders if Riot is unavailable.
  let rankLine = "League of Legends";
  let statsLine = "";
  if (isValidRegion(region) && gameName && tagLine) {
    try {
      const account = await getAccountByRiotId(gameName, tagLine, region);
      const entries = await getLeagueEntries(account.puuid, region);
      const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
      if (solo) {
        const winrate = ((solo.wins / (solo.wins + solo.losses)) * 100).toFixed(1);
        rankLine = `${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP`;
        statsLine = `${solo.wins}V ${solo.losses}D · ${winrate}% winrate`;
      } else {
        rankLine = "Sin clasificar";
      }
    } catch {
      // keep fallback lines
    }
  }

  const regionLabel = isValidRegion(region) ? REGION_LABELS[region as Region] : region.toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: INK,
          backgroundImage:
            "radial-gradient(800px 400px at 10% 0%, rgba(200,170,110,0.18), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(10,200,185,0.14), transparent 55%)",
          color: PARCHMENT,
          fontSize: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: GOLD, fontSize: 28, letterSpacing: 6 }}>
          LOL TRACKER · {regionLabel}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginTop: 24,
            fontSize: 84,
            fontWeight: 700,
          }}
        >
          {gameName}
          <span style={{ color: "#8b96ad", fontSize: 48 }}>#{tagLine}</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 52, color: GOLD, fontWeight: 700 }}>
          {rankLine}
        </div>
        {statsLine ? (
          <div style={{ display: "flex", marginTop: 12, fontSize: 34, color: "#b4bdd1" }}>
            {statsLine}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            width: 320,
            height: 4,
            backgroundImage: `linear-gradient(90deg, ${PARCHMENT}, ${GOLD}, transparent)`,
          }}
        />
      </div>
    ),
    size
  );
}
