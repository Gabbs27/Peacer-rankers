"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Region, REGION_LABELS } from "@/lib/types";

const regions = Object.entries(REGION_LABELS) as [Region, string][];

export default function SearchBar() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState<Region>("la1");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameName.trim() || !tagLine.trim()) return;
    router.push(
      `/summoner/${region}/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
      <label htmlFor="region-select" className="sr-only">Región</label>
      <select
        id="region-select"
        aria-label="Seleccionar región"
        value={region}
        onChange={(e) => setRegion(e.target.value as Region)}
        className="w-full sm:w-auto bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white focus-ring"
      >
        {regions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label htmlFor="game-name" className="sr-only">Nombre de invocador</label>
      <input
        id="game-name"
        type="text"
        placeholder="Nombre (ej: xicebriel)"
        aria-label="Nombre de invocador"
        value={gameName}
        onChange={(e) => setGameName(e.target.value)}
        className="w-full sm:flex-1 bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus-ring"
      />
      <label htmlFor="tag-line" className="sr-only">Tag</label>
      <input
        id="tag-line"
        type="text"
        placeholder="Tag (ej: LAN)"
        aria-label="Tag"
        value={tagLine}
        onChange={(e) => setTagLine(e.target.value)}
        className="w-full sm:w-32 bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus-ring"
      />
      <button
        type="submit"
        className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors focus-ring"
      >
        Buscar
      </button>
    </form>
  );
}
