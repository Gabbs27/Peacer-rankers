import { getChampionIconUrl } from "@/lib/data-dragon";

interface Props {
  championName: string;
  size?: number;
  className?: string;
}

export default function ChampionIcon({
  championName,
  size = 48,
  className = "",
}: Props) {
  return (
    <img
      src={getChampionIconUrl(championName)}
      alt={`Campeón ${championName}`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
