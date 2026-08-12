"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ParticipantPerks } from "@/lib/types";
import { getRunesDataUrl, getRuneIconUrl } from "@/lib/data-dragon";
import { useDDragonVersion } from "./DDragonProvider";

interface RuneMeta {
  icon: string;
  name: string;
}

interface RuneTree {
  id: number;
  icon: string;
  name: string;
  slots: { runes: { id: number; icon: string; name: string }[] }[];
}

// perkId/styleId -> {icon, name}, cached per DDragon version (one fetch per session).
const runeMapCache = new Map<string, Promise<Map<number, RuneMeta>>>();

function loadRuneMap(version: string): Promise<Map<number, RuneMeta>> {
  const cached = runeMapCache.get(version);
  if (cached) return cached;

  const promise = fetch(getRunesDataUrl(version))
    .then((res) => res.json())
    .then((trees: RuneTree[]) => {
      const map = new Map<number, RuneMeta>();
      for (const tree of trees) {
        map.set(tree.id, { icon: tree.icon, name: tree.name });
        for (const slot of tree.slots) {
          for (const rune of slot.runes) {
            map.set(rune.id, { icon: rune.icon, name: rune.name });
          }
        }
      }
      return map;
    })
    .catch(() => {
      runeMapCache.delete(version); // allow retry on a later mount
      return new Map<number, RuneMeta>();
    });

  runeMapCache.set(version, promise);
  return promise;
}

interface Props {
  perks?: ParticipantPerks;
  size?: number;
}

/** Keystone rune icon (+ secondary tree, tiny) for a scoreboard row. */
export default function RuneKeystone({ perks, size = 18 }: Props) {
  const version = useDDragonVersion();
  const [runeMap, setRuneMap] = useState<Map<number, RuneMeta> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRuneMap(version).then((map) => {
      if (!cancelled) setRuneMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const keystoneId = perks?.styles?.[0]?.selections?.[0]?.perk;
  const subStyleId = perks?.styles?.[1]?.style;
  const keystone = keystoneId ? runeMap?.get(keystoneId) : undefined;
  const subStyle = subStyleId ? runeMap?.get(subStyleId) : undefined;

  // Reserve the space even while loading so rows don't shift.
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
      aria-hidden={!keystone}
    >
      {keystone && (
        <Image
          src={getRuneIconUrl(keystone.icon)}
          alt={keystone.name}
          title={keystone.name}
          width={size}
          height={size}
          className="rounded-full bg-gray-900/80"
          unoptimized
        />
      )}
      {subStyle && (
        <Image
          src={getRuneIconUrl(subStyle.icon)}
          alt={subStyle.name}
          title={subStyle.name}
          width={Math.round(size * 0.55)}
          height={Math.round(size * 0.55)}
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-gray-950 p-[1px]"
          unoptimized
        />
      )}
    </span>
  );
}
