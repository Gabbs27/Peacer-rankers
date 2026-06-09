"use client";

import { getChampionIconUrl } from "@/lib/data-dragon";
import { useDDragonVersion } from "./DDragonProvider";

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
  const version = useDDragonVersion();
  return (
    <img
      src={getChampionIconUrl(championName, version)}
      alt={`Campeón ${championName}`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
