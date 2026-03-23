import { Region } from "@/lib/types";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getMatchIds,
  getMatches,
} from "@/lib/riot-api";
import PlayerStats from "@/components/PlayerStats";
import MatchCard from "@/components/MatchCard";

interface PageProps {
  params: Promise<{ region: string; riotId: string }>;
}

export default async function SummonerPage({ params }: PageProps) {
  const { region, riotId } = await params;
  const [gameName, tagLine] = decodeURIComponent(riotId).split("-");

  if (!gameName || !tagLine) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Formato inválido</h1>
        <p className="text-gray-300 mt-2">Usa el formato: Nombre-Tag</p>
      </div>
    );
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region as Region);
    const summoner = await getSummonerByPuuid(account.puuid, region as Region);
    const ranked = await getLeagueEntries(account.puuid, region as Region);
    const matchIds = await getMatchIds(account.puuid, region as Region, 10);
    const matches = await getMatches(matchIds, region as Region);

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
            {matches.map((match) => (
              <MatchCard
                key={match.metadata.matchId}
                match={match}
                puuid={account.puuid}
                ranked={ranked}
              />
            ))}
          </div>
          {matches.length === 0 && (
            <p className="text-gray-400 text-center py-8">
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
        <p className="text-gray-300 mt-2">
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
