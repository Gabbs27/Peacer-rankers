import { LeagueEntry } from "@/lib/types";

interface Props {
  ranked: LeagueEntry[];
  summonerLevel: number;
  profileIconId: number;
  gameName: string;
  tagLine: string;
}

const tierColors: Record<string, string> = {
  IRON: "text-gray-300",
  BRONZE: "text-amber-600",
  SILVER: "text-gray-300",
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
}: Props) {
  const soloQ = ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const flex = ranked.find((r) => r.queueType === "RANKED_FLEX_SR");

  function renderRank(entry: LeagueEntry | undefined, label: string) {
    if (!entry) {
      return (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-gray-300 text-sm mb-1">{label}</p>
          <p className="text-gray-400">Unranked</p>
        </div>
      );
    }

    const winrate = ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(
      1
    );

    return (
      <div className="bg-gray-700/50 rounded-lg p-4">
        <p className="text-gray-300 text-sm mb-1">{label}</p>
        <p className={`text-2xl font-bold ${tierColors[entry.tier] || "text-white"}`}>
          {entry.tier} {entry.rank}
        </p>
        <p className="text-gray-300">{entry.leaguePoints} LP</p>
        <p className="text-sm text-gray-300">
          {entry.wins}W {entry.losses}L ({winrate}%)
        </p>
        {entry.hotStreak && (
          <p className="text-sm text-orange-400 mt-1">Racha de victorias!</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="flex items-center gap-4">
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/16.6.1/img/profileicon/${profileIconId}.png`}
          alt="Profile Icon"
          width={80}
          height={80}
          className="rounded-full border-2 border-blue-500/50"
        />
        <div>
          <h1 className="text-3xl font-bold">
            {gameName}
            <span className="text-gray-300 text-xl">#{tagLine}</span>
          </h1>
          <p className="text-gray-300">Nivel {summonerLevel}</p>
        </div>
      </div>
      <div className="flex gap-4 flex-wrap">
        {renderRank(soloQ, "Solo/Duo")}
        {renderRank(flex, "Flex")}
      </div>
    </div>
  );
}
