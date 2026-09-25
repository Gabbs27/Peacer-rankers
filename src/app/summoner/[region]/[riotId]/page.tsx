import Link from "next/link";
import { isValidRegion } from "@/lib/types";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getMatchIds,
  getMatches,
  getChampionMastery,
  getPlayerChallenges,
  RiotApiError,
} from "@/lib/riot-api";
import { getDDragonVersion } from "@/lib/data-dragon";
import type { ChampionMastery, LeagueEntry, MatchData, PlayerChallenges, RiotAccount, Summoner } from "@/lib/types";
import PlayerStats from "@/components/PlayerStats";
import SummonerContent from "@/components/SummonerContent";
import LiveGame from "@/components/LiveGame";

interface PageProps {
  params: Promise<{ region: string; riotId: string }>;
}

// How many matches back the profile analyses look. Every aggregate panel (win
// formula, loss pattern, tilt, matchups, teammates, trends) reads this sample,
// so it is the single biggest lever on their quality. Kept at 30 rather than 50
// to stay well inside the development key's 100 requests / 2 min budget; the
// match cache is 24h so repeat loads are free.
const PROFILE_MATCH_SAMPLE = 30;

export async function generateMetadata({ params }: PageProps) {
  const { riotId } = await params;
  const decoded = decodeURIComponent(riotId);
  const sep = decoded.lastIndexOf("-");
  const name = sep > 0 ? `${decoded.slice(0, sep)}#${decoded.slice(sep + 1)}` : decoded;
  return {
    title: `${name} — LoL Tracker`,
    description: `Estadísticas, historial y análisis de partidas de ${name} en League of Legends.`,
  };
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl text-red-400">{title}</h1>
      <p className="text-gray-300 mt-2">{message}</p>
      <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
        Volver al inicio
      </Link>
    </div>
  );
}

interface ProfileData {
  account: RiotAccount;
  summoner: Summoner;
  ranked: LeagueEntry[];
  matches: MatchData[];
  mastery: ChampionMastery[];
  challenges: PlayerChallenges | null;
  ddragonVersion: string;
}

export default async function SummonerPage({ params }: PageProps) {
  const { region, riotId } = await params;

  if (!isValidRegion(region)) {
    return <ErrorPanel title="Región inválida" message="Selecciona una región válida desde la búsqueda." />;
  }

  // The riot id arrives as `gameName-tagLine`. Tag lines never contain a hyphen,
  // so split on the LAST hyphen — this keeps game names that contain hyphens intact (B4).
  const decoded = decodeURIComponent(riotId);
  const sep = decoded.lastIndexOf("-");
  const gameName = sep > 0 ? decoded.slice(0, sep) : "";
  const tagLine = sep > 0 ? decoded.slice(sep + 1) : "";

  if (!gameName || !tagLine) {
    return <ErrorPanel title="Formato inválido" message="Usa el formato: Nombre-Tag" />;
  }

  // Fetch outside of JSX: capture data or an error message, then render after.
  let data: ProfileData | null = null;
  let errorMessage: string | null = null;

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region);
    const [summoner, ranked, matchIds, ddragonVersion, mastery, challenges] = await Promise.all([
      getSummonerByPuuid(account.puuid, region),
      getLeagueEntries(account.puuid, region),
      getMatchIds(account.puuid, region, PROFILE_MATCH_SAMPLE),
      getDDragonVersion(),
      // Non-critical extras — degrade gracefully if the key lacks access.
      getChampionMastery(account.puuid, region, 8).catch(() => [] as ChampionMastery[]),
      getPlayerChallenges(account.puuid, region).catch(() => null),
    ]);
    const matches = await getMatches(matchIds, region);
    data = { account, summoner, ranked, matches, mastery, challenges, ddragonVersion };
  } catch (error) {
    errorMessage =
      error instanceof RiotApiError ? error.publicMessage : "No se pudo cargar el perfil.";
  }

  if (!data) {
    return <ErrorPanel title="Error" message={errorMessage ?? "No se pudo cargar el perfil."} />;
  }

  return (
    <div className="space-y-5">
      <PlayerStats
        ranked={data.ranked}
        summonerLevel={data.summoner.summonerLevel}
        profileIconId={data.summoner.profileIconId}
        gameName={data.account.gameName}
        tagLine={data.account.tagLine}
        region={region}
        ddragonVersion={data.ddragonVersion}
        challenges={data.challenges}
      />
      <LiveGame puuid={data.account.puuid} region={region} matches={data.matches} />
      <SummonerContent
        initialMatches={data.matches}
        puuid={data.account.puuid}
        region={region}
        riotId={riotId}
        ranked={data.ranked}
        mastery={data.mastery}
      />
    </div>
  );
}
