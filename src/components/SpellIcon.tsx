"use client";

import Image from "next/image";
import { getSummonerSpellIconUrl } from "@/lib/data-dragon";
import { useDDragonVersion } from "./DDragonProvider";

export default function SpellIcon({ spellId, size = 18 }: { spellId: number; size?: number }) {
  const version = useDDragonVersion();
  return (
    <Image
      src={getSummonerSpellIconUrl(spellId, version)}
      alt="Hechizo de invocador"
      width={size}
      height={size}
      className="rounded"
    />
  );
}
