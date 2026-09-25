import Image from "next/image";
import { LeagueEntry, REGION_LABELS, isValidRegion, type PlayerChallenges } from "@/lib/types";
import { getProfileIconUrl } from "@/lib/data-dragon";
import { getTierLabel } from "@/lib/scoring";
import FavoriteButton from "./FavoriteButton";

interface Props {
  ranked: LeagueEntry[];
  summonerLevel: number;
  profileIconId: number;
  gameName: string;
  tagLine: string;
  region: string;
  ddragonVersion: string;
  challenges?: PlayerChallenges | null;
}

const tierColors: Record<string, string> = {
  IRON: "text-gray-300",
  BRONZE: "text-amber-600",
  SILVER: "text-gray-200",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-400",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-yellow-300",
};

function RankTile({ entry, label }: { entry: LeagueEntry | undefined; label: string }) {
  if (!entry) {
    return (
      <div className="rounded-lg bg-gray-900/50 border border-white/5 px-3 py-2 min-w-[9.5rem]">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-sm text-gray-400 mt-0.5">Sin clasificar</p>
      </div>
    );
  }

  const games = entry.wins + entry.losses;
  const winrate = games > 0 ? Math.round((entry.wins / games) * 100) : 0;

  return (
    <div className="rounded-lg bg-gray-900/50 border border-white/5 px-3 py-2 min-w-[9.5rem]">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
        {label}
        {entry.hotStreak && (
          <span className="normal-case tracking-normal text-orange-400" title="Racha de victorias">
            🔥 racha
          </span>
        )}
      </p>
      <p className={`font-display text-base sm:text-lg font-bold leading-tight ${tierColors[entry.tier] || "text-white"}`}>
        {getTierLabel(entry.tier)} {entry.rank}
      </p>
      <p className="text-xs text-gray-400">
        {entry.leaguePoints} LP ·{" "}
        <span className={winrate >= 50 ? "text-blue-300" : "text-red-300"}>{winrate}%</span>{" "}
        <span className="text-gray-500">({games}j)</span>
      </p>
    </div>
  );
}

const CHALLENGE_LEVELS: Record<string, string> = {
  IRON: "Hierro",
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  PLATINUM: "Platino",
  DIAMOND: "Diamante",
  MASTER: "Master",
  GRANDMASTER: "Grand Master",
  CHALLENGER: "Challenger",
};

export default function PlayerStats({
  ranked,
  summonerLevel,
  profileIconId,
  gameName,
  tagLine,
  region,
  ddragonVersion,
  challenges,
}: Props) {
  const soloQ = ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const flex = ranked.find((r) => r.queueType === "RANKED_FLEX_SR");
  const challengeLevel = challenges ? CHALLENGE_LEVELS[challenges.totalPoints.level] : undefined;

  return (
    <header className="panel p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 rise">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative shrink-0">
          <div className="rounded-full p-[2px] bg-gradient-to-b from-[#f0e6d2] via-[#c8aa6e] to-[#785a28]">
            <Image
              src={getProfileIconUrl(profileIconId, ddragonVersion)}
              alt={`Icono de perfil de ${gameName}`}
              width={72}
              height={72}
              className="rounded-full border-2 border-gray-950 w-14 h-14 sm:w-[72px] sm:h-[72px]"
            />
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gray-950 border border-[#c8aa6e]/50 text-[#e3c98a] text-[11px] font-semibold px-2 py-[1px] rounded-full">
            {summonerLevel}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-bold truncate text-[#f0e6d2]">
              {gameName}
              <span className="text-gray-400 text-base sm:text-lg font-sans font-normal"> #{tagLine}</span>
            </h1>
            <FavoriteButton region={region} gameName={gameName} tagLine={tagLine} />
          </div>
          <p className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2">
            <span>{isValidRegion(region) ? REGION_LABELS[region] : region.toUpperCase()}</span>
            {challenges && (
              <>
                <span aria-hidden>·</span>
                <span>
                  Desafíos{" "}
                  <span className="text-[#e3c98a]">{challengeLevel ?? "—"}</span>{" "}
                  <span className="text-gray-500">{challenges.totalPoints.current.toLocaleString("es")} pts</span>
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:flex">
        <RankTile entry={soloQ} label="Solo/Duo" />
        <RankTile entry={flex} label="Flex" />
      </div>
    </header>
  );
}
