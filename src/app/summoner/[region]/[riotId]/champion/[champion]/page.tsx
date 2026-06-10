import Link from "next/link";
import { isValidRegion } from "@/lib/types";
import {
  getAccountByRiotId,
  getMatchIds,
  getMatches,
  RiotApiError,
} from "@/lib/riot-api";
import { formatDuration, getKDA } from "@/lib/data-dragon";
import { calculatePerformanceScore, isRemake } from "@/lib/scoring";
import { normalizeChampionName } from "@/lib/champion-data";
import ChampionIcon from "@/components/ChampionIcon";
import ItemIcon from "@/components/ItemIcon";

interface PageProps {
  params: Promise<{ region: string; riotId: string; champion: string }>;
}

function ErrorPanel({ title, message, backHref }: { title: string; message: string; backHref: string }) {
  return (
    <div className="text-center py-20">
      <h1 className="font-display text-2xl text-red-400">{title}</h1>
      <p className="text-gray-300 mt-2">{message}</p>
      <Link href={backHref} className="text-blue-400 hover:underline mt-4 inline-block">
        Volver al perfil
      </Link>
    </div>
  );
}

const MATCH_SAMPLE = 30;

export default async function ChampionPage({ params }: PageProps) {
  const { region, riotId, champion } = await params;
  const profileHref = `/summoner/${region}/${riotId}`;

  if (!isValidRegion(region)) {
    return <ErrorPanel title="Región inválida" message="Selecciona una región válida." backHref="/" />;
  }

  const decoded = decodeURIComponent(riotId);
  const sep = decoded.lastIndexOf("-");
  const gameName = sep > 0 ? decoded.slice(0, sep) : "";
  const tagLine = sep > 0 ? decoded.slice(sep + 1) : "";
  const championName = decodeURIComponent(champion);

  if (!gameName || !tagLine || !championName) {
    return <ErrorPanel title="Formato inválido" message="Usa el formato: Nombre-Tag" backHref="/" />;
  }

  interface GameRow {
    match: Awaited<ReturnType<typeof getMatches>>[number];
    player: NonNullable<ReturnType<Awaited<ReturnType<typeof getMatches>>[number]["info"]["participants"]["find"]>>;
    remake: boolean;
  }

  let view: {
    accountName: string;
    accountTag: string;
    displayChampion: string;
    games: GameRow[];
    validCount: number;
    sampleSize: number;
    stats: { label: string; value: string | number }[];
    topItems: [number, number][];
  } | null = null;
  let errorMessage: string | null = null;
  let emptyMessage: string | null = null;

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region);
    const matchIds = await getMatchIds(account.puuid, region, MATCH_SAMPLE);
    const matches = await getMatches(matchIds, region);

    const target = normalizeChampionName(championName);
    const games = matches
      .map((m) => {
        const player = m.info.participants.find((p) => p.puuid === account.puuid);
        if (!player || normalizeChampionName(player.championName) !== target) return null;
        return { match: m, player, remake: isRemake(m.info) };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    const valid = games.filter((g) => !g.remake);

    if (valid.length === 0) {
      emptyMessage = `No hay partidas recientes con este campeón en las últimas ${MATCH_SAMPLE} (excluyendo remakes).`;
    } else {
      // --- Aggregates over the champion's games ---
    const wins = valid.filter((g) => g.player.win).length;
    const winrate = Math.round((wins / valid.length) * 100);
    const kills = valid.reduce((s, g) => s + g.player.kills, 0);
    const deaths = valid.reduce((s, g) => s + g.player.deaths, 0);
    const assists = valid.reduce((s, g) => s + g.player.assists, 0);
    const kda = deaths === 0 ? "Perfecto" : ((kills + assists) / deaths).toFixed(2);
    const totalMinutes = valid.reduce((s, g) => s + g.match.info.gameDuration / 60, 0);
    const csPerMin = (
      valid.reduce((s, g) => s + g.player.totalMinionsKilled + g.player.neutralMinionsKilled, 0) /
      Math.max(totalMinutes, 1)
    ).toFixed(1);
    const avgDamage = Math.round(
      valid.reduce((s, g) => s + g.player.totalDamageDealtToChampions, 0) / valid.length
    );
    const avgScore = Math.round(
      valid.reduce((s, g) => s + calculatePerformanceScore(g.player, g.match.info).overall, 0) /
        valid.length
    );

    // Most frequent completed items across these games.
    const itemCounts = new Map<number, number>();
    for (const g of valid) {
      for (const id of [g.player.item0, g.player.item1, g.player.item2, g.player.item3, g.player.item4, g.player.item5]) {
        if (id && id !== 0) itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1);
      }
    }
    const topItems = [...itemCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

      view = {
        accountName: account.gameName,
        accountTag: account.tagLine,
        displayChampion: games[0].player.championName,
        games,
        validCount: valid.length,
        sampleSize: matches.length,
        stats: [
          { label: "Winrate", value: `${winrate}%` },
          { label: "KDA", value: kda },
          { label: "CS/min", value: csPerMin },
          { label: "Daño prom.", value: `${(avgDamage / 1000).toFixed(1)}k` },
          { label: "Puntuación", value: avgScore },
        ],
        topItems,
      };
    }
  } catch (error) {
    errorMessage =
      error instanceof RiotApiError ? error.publicMessage : "No se pudo cargar la página del campeón.";
  }

  if (errorMessage) {
    return <ErrorPanel title="Error" message={errorMessage} backHref={profileHref} />;
  }
  if (emptyMessage || !view) {
    return (
      <ErrorPanel
        title={`Sin partidas de ${championName}`}
        message={emptyMessage ?? "Sin datos."}
        backHref={profileHref}
      />
    );
  }

  const { games, stats, topItems } = view;

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 rise">
          <ChampionIcon championName={view.displayChampion} size={72} className="border-2 border-[#c8aa6e]/60" />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f0e6d2]">
              {championName}
            </h1>
            <p className="text-gray-400 text-sm">
              {view.accountName}#{view.accountTag} · {view.validCount} partida{view.validCount > 1 ? "s" : ""} en las últimas {view.sampleSize}
            </p>
            <Link href={profileHref} className="text-blue-400 hover:underline text-sm focus-ring rounded">
              ← Volver al perfil
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rise rise-2">
          {stats.map((s) => (
            <div key={s.label} className="panel p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-gray-100">{s.value}</p>
            </div>
          ))}
        </div>

        {topItems.length > 0 && (
          <section aria-label="Items más usados" className="panel p-5 rise rise-3">
            <h2 className="section-title text-lg font-bold text-gray-100 mb-3">Items más usados</h2>
            <ul className="flex flex-wrap gap-3">
              {topItems.map(([itemId, count]) => (
                <li key={itemId} className="flex flex-col items-center gap-1">
                  <ItemIcon itemId={itemId} size={36} />
                  <span className="text-xs text-gray-400">{count}×</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Partidas con este campeón" className="panel p-5 rise rise-4">
          <h2 className="section-title text-lg font-bold text-gray-100 mb-3">Partidas</h2>
          <ul className="space-y-2">
            {games.map(({ match, player, remake }) => (
              <li
                key={match.metadata.matchId}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm border-l-2 ${
                  remake
                    ? "bg-gray-800/40 border-l-gray-600 text-gray-500"
                    : player.win
                      ? "bg-blue-950/30 border-l-blue-400"
                      : "bg-red-950/25 border-l-red-400"
                }`}
              >
                <span className={`w-16 shrink-0 font-semibold ${remake ? "" : player.win ? "text-blue-400" : "text-red-400"}`}>
                  {remake ? "Remake" : player.win ? "Victoria" : "Derrota"}
                </span>
                <span className="w-20 shrink-0 font-bold text-gray-100">
                  {player.kills}/{player.deaths}/{player.assists}
                </span>
                <span className="w-20 shrink-0 text-gray-300 hidden sm:inline">
                  {getKDA(player.kills, player.deaths, player.assists)} KDA
                </span>
                <span className="text-gray-400 hidden md:inline">
                  {player.totalMinionsKilled + player.neutralMinionsKilled} CS
                </span>
                <span className="ml-auto text-gray-400">{formatDuration(match.info.gameDuration)}</span>
              </li>
            ))}
          </ul>
        </section>

      </div>
  );
}
