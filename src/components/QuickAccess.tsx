"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  subscribe,
  getFavoritesSnapshot,
  getRecentSnapshot,
  getServerSnapshot,
  summonerHref,
  summonerKey,
  type SavedSummoner,
} from "@/lib/favorites";

function ChipRow({ title, items }: { title: string; items: SavedSummoner[] }) {
  if (items.length === 0) return null;
  return (
    <div className="w-full">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((s) => (
          <li key={summonerKey(s)}>
            <Link
              href={summonerHref(s)}
              className="inline-flex items-center gap-1 rounded-full bg-gray-700/70 hover:bg-gray-600 px-3 py-1.5 text-sm text-gray-100 transition-colors focus-ring"
            >
              <span className="font-medium">{s.gameName}</span>
              <span className="text-gray-400">#{s.tagLine}</span>
              <span className="text-[10px] uppercase text-gray-500 ml-1">{s.region}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function QuickAccess() {
  const favorites = useSyncExternalStore(subscribe, getFavoritesSnapshot, getServerSnapshot);
  const recent = useSyncExternalStore(subscribe, getRecentSnapshot, getServerSnapshot);

  if (favorites.length === 0 && recent.length === 0) return null;

  return (
    <div className="w-full max-w-2xl space-y-4">
      <ChipRow title="★ Favoritos" items={favorites} />
      <ChipRow title="Búsquedas recientes" items={recent} />
    </div>
  );
}
