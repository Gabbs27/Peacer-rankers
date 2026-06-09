"use client";

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getFavoritesSnapshot,
  getServerSnapshot,
  toggleFavorite,
  summonerKey,
  type SavedSummoner,
} from "@/lib/favorites";

export default function FavoriteButton(props: SavedSummoner) {
  const favorites = useSyncExternalStore(subscribe, getFavoritesSnapshot, getServerSnapshot);
  const fav = favorites.some((x) => summonerKey(x) === summonerKey(props));

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(props)}
      aria-pressed={fav}
      aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
      title={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
      className="focus-ring rounded p-1 text-2xl leading-none transition-colors"
    >
      <span className={fav ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"}>
        {fav ? "★" : "☆"}
      </span>
    </button>
  );
}
