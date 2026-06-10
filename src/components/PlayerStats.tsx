import Image from "next/image";
import { LeagueEntry } from "@/lib/types";
import { getProfileIconUrl } from "@/lib/data-dragon";
import FavoriteButton from "./FavoriteButton";

interface Props {
  ranked: LeagueEntry[];
  summonerLevel: number;
  profileIconId: number;
  gameName: string;
  tagLine: string;
  region: string;
  ddragonVersion: string;
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

export default function PlayerStats({
  ranked,
  summonerLevel,
  profileIconId,
  gameName,
  tagLine,
  region,
  ddragonVersion,
}: Props) {
  const soloQ = ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const flex = ranked.find((r) => r.queueType === "RANKED_FLEX_SR");

  function renderRank(entry: LeagueEntry | undefined, label: string) {
    if (!entry) {
      return (
        <div className="panel p-4 min-w-[10rem]">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
          <p className="text-gray-400">Sin clasificar</p>
        </div>
      );
    }

    const winrate = ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(1);

    return (
      <div className="panel p-4 min-w-[10rem]">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`font-display text-2xl font-bold ${tierColors[entry.tier] || "text-white"}`}>
          {entry.tier} {entry.rank}
        </p>
        <p className="text-gray-300">{entry.leaguePoints} LP</p>
        <p className="text-sm text-gray-300">
          {entry.wins}V {entry.losses}D ({winrate}%)
        </p>
        {entry.hotStreak && (
          <p className="text-sm text-orange-400 mt-1">¡Racha de victorias!</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start rise">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="rounded-full p-[2px] bg-gradient-to-b from-[#f0e6d2] via-[#c8aa6e] to-[#785a28]">
            <Image
              src={getProfileIconUrl(profileIconId, ddragonVersion)}
              alt={`Icono de perfil de ${gameName}`}
              width={80}
              height={80}
              className="rounded-full border-2 border-gray-950 w-16 h-16 sm:w-20 sm:h-20"
            />
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gray-950 border border-[#c8aa6e]/50 text-[#e3c98a] text-[11px] font-semibold px-2 py-[1px] rounded-full">
            {summonerLevel}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-3xl font-bold truncate text-[#f0e6d2]">
              {gameName}
              <span className="text-gray-400 text-base sm:text-xl font-sans font-normal">
                {" "}#{tagLine}
              </span>
            </h1>
            <FavoriteButton region={region} gameName={gameName} tagLine={tagLine} />
          </div>
          <p className="text-gray-400 text-sm mt-1">Nivel {summonerLevel}</p>
        </div>
      </div>
      <div className="flex gap-3 sm:gap-4 flex-wrap">
        {renderRank(soloQ, "Solo/Duo")}
        {renderRank(flex, "Flex")}
      </div>
    </div>
  );
}
