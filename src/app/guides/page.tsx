"use client";

import { useState, useEffect } from "react";
import { getChampionIconUrl, getMobafireSearchUrl } from "@/lib/data-dragon";

interface ChampionData {
  id: string;
  name: string;
  key: string;
}

export default function GuidesPage() {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      "https://ddragon.leagueoflegends.com/cdn/16.6.1/data/es_MX/champion.json"
    )
      .then((res) => res.json())
      .then((data) => {
        const champs = Object.values(data.data) as ChampionData[];
        champs.sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = champions.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Guías de <span className="text-orange-400">Campeones</span>
        </h1>
        <p className="text-gray-300">
          Busca un campeón para ver sus guías en Mobafire
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <input
          type="text"
          placeholder="Buscar campeón..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filtered.map((champ) => (
            <a
              key={champ.id}
              href={getMobafireSearchUrl(champ.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-700/50 transition-colors group"
            >
              <img
                src={getChampionIconUrl(champ.id)}
                alt={champ.name}
                width={56}
                height={56}
                className="rounded-full border-2 border-gray-600 group-hover:border-orange-500 transition-colors"
              />
              <span className="text-xs text-gray-300 text-center truncate w-full group-hover:text-orange-400">
                {champ.name}
              </span>
            </a>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          No se encontraron campeones
        </p>
      )}
    </div>
  );
}
