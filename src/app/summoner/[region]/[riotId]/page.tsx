import { Region } from "@/lib/types";
import PlayerStats from "@/components/PlayerStats";
import MatchCard from "@/components/MatchCard";

interface PageProps {
  params: Promise<{ region: string; riotId: string }>;
}

async function fetchSummoner(gameName: string, tagLine: string, region: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/summoner?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}&region=${region}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch summoner: ${res.statusText}`);
  }
  return res.json();
}

async function fetchMatches(puuid: string, region: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/matches?puuid=${puuid}&region=${region}&count=10`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch matches: ${res.statusText}`);
  }
  return res.json();
}

export default async function SummonerPage({ params }: PageProps) {
  const { region, riotId } = await params;
  const [gameName, tagLine] = decodeURIComponent(riotId).split("-");

  if (!gameName || !tagLine) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Formato inválido</h1>
        <p className="text-gray-400 mt-2">Usa el formato: Nombre-Tag</p>
      </div>
    );
  }

  try {
    const { account, summoner, ranked } = await fetchSummoner(
      gameName,
      tagLine,
      region
    );
    const { matches } = await fetchMatches(account.puuid, region);

    return (
      <div className="space-y-8">
        <PlayerStats
          ranked={ranked}
          summonerLevel={summoner.summonerLevel}
          profileIconId={summoner.profileIconId}
          gameName={account.gameName}
          tagLine={account.tagLine}
        />

        <div>
          <h2 className="text-xl font-bold mb-4">Historial de Partidas</h2>
          <div className="space-y-3">
            {matches.map((match: import("@/lib/types").MatchData) => (
              <MatchCard
                key={match.metadata.matchId}
                match={match}
                puuid={account.puuid}
              />
            ))}
          </div>
          {matches.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No se encontraron partidas recientes
            </p>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Error</h1>
        <p className="text-gray-400 mt-2">
          {error instanceof Error
            ? error.message
            : "No se pudo cargar el perfil"}
        </p>
        <a
          href="/"
          className="text-blue-400 hover:underline mt-4 inline-block"
        >
          Volver al inicio
        </a>
      </div>
    );
  }
}
