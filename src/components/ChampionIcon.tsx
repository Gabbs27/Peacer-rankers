"use client";

import Image from "next/image";
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
    <Image
      src={getChampionIconUrl(championName, version)}
      alt={`Campeón ${championName}`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
