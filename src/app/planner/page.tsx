"use client";

import { useState, useEffect, useMemo } from "react";
import { getChampionIconUrl, getItemIconUrl, getMobafireSearchUrl, getUGGChampionUrl } from "@/lib/data-dragon";
import { getRuneRecommendation } from "@/lib/runes";
import { getBuildPath } from "@/lib/build-paths";
import type { RuneRecommendation } from "@/lib/runes";
import type { BuildPath } from "@/lib/build-paths";

interface ChampionData {
  id: string;
  name: string;
  key: string;
}

const ROLES = [
  { key: "TOP", label: "TOP" },
  { key: "JG", label: "JG" },
  { key: "MID", label: "MID" },
  { key: "ADC", label: "ADC" },
  { key: "SUP", label: "SUP" },
];

// Simple enemy comp analysis for display
function analyzeEnemyDisplay(enemies: ChampionData[]) {
  const DAMAGE: Record<string, string> = {
    Ahri: "AP", Akali: "AP", Anivia: "AP", Annie: "AP", AurelionSol: "AP",
    Aurora: "AP", Azir: "AP", Brand: "AP", Cassiopeia: "AP", Diana: "AP",
    Ekko: "AP", Elise: "AP", Evelynn: "AP", Fiddlesticks: "AP", Fizz: "AP",
    Gragas: "AP", Hwei: "AP", Ivern: "AP", Karma: "AP", Karthus: "AP",
    Kassadin: "AP", Katarina: "AP", Kennen: "AP", Leblanc: "AP", Lillia: "AP",
    Lissandra: "AP", Lulu: "AP", Lux: "AP", Malzahar: "AP", Morgana: "AP",
    Nami: "AP", Neeko: "AP", Nidalee: "AP", Orianna: "AP", Rumble: "AP",
    Ryze: "AP", Seraphine: "AP", Sona: "AP", Soraka: "AP", Swain: "AP",
    Syndra: "AP", Taliyah: "AP", Teemo: "AP", TwistedFate: "AP",
    Veigar: "AP", Velkoz: "AP", Vex: "AP", Viktor: "AP", Vladimir: "AP",
    Xerath: "AP", Ziggs: "AP", Zilean: "AP", Zoe: "AP", Zyra: "AP",
    Sylas: "AP", Smolder: "AP", Milio: "AP", Renata: "AP", Gwen: "AP",
    Mordekaiser: "AP", Singed: "AP", Heimerdinger: "AP",
    Alistar: "TANK", Amumu: "TANK", Blitzcrank: "TANK", Braum: "TANK",
    DrMundo: "TANK", Leona: "TANK", Malphite: "TANK", Maokai: "TANK",
    Nautilus: "TANK", Ornn: "TANK", Poppy: "TANK", Rammus: "TANK",
    Sejuani: "TANK", Shen: "TANK", Sion: "TANK", TahmKench: "TANK",
    Taric: "TANK", Thresh: "TANK", KSante: "TANK", Ksante: "TANK",
    Rell: "TANK", Zac: "AP", Chogath: "AP", Galio: "AP", Nunu: "AP",
  };

  let ap = 0, ad = 0, tank = 0;
  enemies.forEach((e) => {
    const t = DAMAGE[e.id] || "AD";
    if (t === "AP") ap++;
    else if (t === "TANK") tank++;
    else ad++;
  });
  return { ap, ad, tank };
}

export default function PlannerPage() {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChampion, setSelectedChampion] = useState<ChampionData | null>(null);
  const [selectedRole, setSelectedRole] = useState("MID");
  const [enemies, setEnemies] = useState<ChampionData[]>([]);
  const [pickingMode, setPickingMode] = useState<"player" | "enemy">("player");

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/cdn/16.6.1/data/es_MX/champion.json")
      .then((res) => res.json())
      .then((data) => {
        const champs = Object.values(data.data) as ChampionData[];
        champs.sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      champions.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase())
      ),
    [champions, search]
  );

  const handleChampionClick = (champ: ChampionData) => {
    if (pickingMode === "player") {
      setSelectedChampion(champ);
      setPickingMode("enemy");
      setSearch("");
    } else {
      if (enemies.length >= 5) return;
      if (enemies.some((e) => e.id === champ.id)) return;
      if (selectedChampion && champ.id === selectedChampion.id) return;
      setEnemies([...enemies, champ]);
      setSearch("");
    }
  };

  const removeEnemy = (id: string) => {
    setEnemies(enemies.filter((e) => e.id !== id));
  };

  const resetAll = () => {
    setSelectedChampion(null);
    setEnemies([]);
    setPickingMode("player");
    setSearch("");
  };

  const hasResults = selectedChampion && enemies.length >= 1;

  const runes: RuneRecommendation | null = useMemo(() => {
    if (!hasResults || !selectedChampion) return null;
    return getRuneRecommendation(selectedChampion.id, selectedRole, enemies.map((e) => e.id));
  }, [selectedChampion, selectedRole, enemies, hasResults]);

  const build: BuildPath | null = useMemo(() => {
    if (!hasResults || !selectedChampion) return null;
    return getBuildPath(selectedChampion.id, selectedRole, enemies.map((e) => e.id));
  }, [selectedChampion, selectedRole, enemies, hasResults]);

  const compAnalysis = useMemo(() => {
    if (enemies.length === 0) return null;
    return analyzeEnemyDisplay(enemies);
  }, [enemies]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Planificador <span className="text-orange-400">Pre-Game</span>
        </h1>
        <p className="text-gray-300">
          Selecciona tu campeón y los enemigos para recibir recomendaciones de runas y build
        </p>
      </div>

      {/* Selection Summary Bar */}
      <div className="bg-gray-700/50 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Your champion */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 font-medium">Tu Campeón:</span>
            {selectedChampion ? (
              <div className="flex items-center gap-2">
                <img
                  src={getChampionIconUrl(selectedChampion.id)}
                  alt={selectedChampion.name}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-orange-500"
                />
                <span className="text-white font-medium">{selectedChampion.name}</span>
              </div>
            ) : (
              <span className="text-gray-500 italic text-sm">Ninguno</span>
            )}
          </div>

          {/* Role selector */}
          <div className="flex items-center gap-1">
            {ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => setSelectedRole(role.key)}
                aria-pressed={selectedRole === role.key}
                className={`px-3 py-2 rounded text-xs font-bold transition-colors ${
                  selectedRole === role.key
                    ? "bg-orange-500 text-white"
                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Reset */}
          {selectedChampion && (
            <button
              onClick={resetAll}
              className="ml-auto text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Reiniciar
            </button>
          )}
        </div>

        {/* Enemies */}
        {selectedChampion && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-400 font-medium">Enemigos:</span>
            {enemies.length === 0 ? (
              <span className="text-gray-500 italic text-sm">Selecciona enemigos abajo</span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {enemies.map((enemy) => (
                  <button
                    key={enemy.id}
                    onClick={() => removeEnemy(enemy.id)}
                    className="flex items-center gap-1 bg-gray-600 rounded-full pr-3 py-1 hover:bg-red-900/50 transition-colors group"
                    aria-label={`Quitar ${enemy.name} del equipo enemigo`}
                    title={`Quitar ${enemy.name}`}
                  >
                    <img
                      src={getChampionIconUrl(enemy.id)}
                      alt={enemy.name}
                      width={32}
                      height={32}
                      className="rounded-full border border-gray-500 group-hover:border-red-500"
                    />
                    <span className="text-xs text-gray-300 group-hover:text-red-400">
                      {enemy.name}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-red-400 ml-1">x</span>
                  </button>
                ))}
                {enemies.length < 5 && (
                  <span className="text-xs text-gray-500">
                    ({5 - enemies.length} restantes)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Picking mode tabs */}
      {selectedChampion && (
        <div className="flex gap-2">
          <button
            onClick={() => { setPickingMode("player"); setSearch(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pickingMode === "player"
                ? "bg-orange-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Cambiar Campeón
          </button>
          <button
            onClick={() => { setPickingMode("enemy"); setSearch(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pickingMode === "enemy"
                ? "bg-orange-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Seleccionar Enemigos {enemies.length > 0 && `(${enemies.length}/5)`}
          </button>
        </div>
      )}

      {/* Champion search & grid */}
      <div className="space-y-3">
        <div className="text-sm text-gray-400 font-medium">
          {pickingMode === "player"
            ? "Elige tu campeón:"
            : `Elige campeones enemigos (${enemies.length}/5):`}
        </div>
        <label htmlFor="champion-search" className="sr-only">Buscar campeón</label>
        <input
          id="champion-search"
          type="text"
          placeholder="Buscar campeón..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-gray-700 border border-gray-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto pr-1" role="grid" aria-label="Selección de campeones">
            {filtered.map((champ) => {
              const isSelected = selectedChampion?.id === champ.id;
              const isEnemy = enemies.some((e) => e.id === champ.id);
              const isDisabled =
                pickingMode === "enemy" && (enemies.length >= 5 || isEnemy || isSelected);

              return (
                <button
                  key={champ.id}
                  onClick={() => !isDisabled && handleChampionClick(champ)}
                  disabled={isDisabled}
                  aria-label={`${pickingMode === "player" ? "Seleccionar" : "Agregar enemigo"} ${champ.name}`}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-orange-500/20 ring-2 ring-orange-500"
                      : isEnemy
                      ? "bg-red-500/20 ring-1 ring-red-500/50 opacity-60"
                      : isDisabled
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-gray-700/50 cursor-pointer"
                  }`}
                >
                  <img
                    src={getChampionIconUrl(champ.id)}
                    alt={champ.name}
                    width={44}
                    height={44}
                    className={`rounded-full border-2 transition-colors ${
                      isSelected
                        ? "border-orange-500"
                        : isEnemy
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                  />
                  <span className="text-xs text-gray-300 text-center truncate w-full leading-tight">
                    {champ.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-4">No se encontraron campeones</p>
        )}
      </div>

      {/* Results Panel */}
      {hasResults && runes && build && compAnalysis && selectedChampion && (
        <section aria-label="Recomendaciones de build" className="bg-gray-700/50 rounded-xl p-5 space-y-6">
          <h2 className="text-xl font-bold text-orange-400">Recomendaciones</h2>

          {/* Enemy Comp Analysis */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Composición Enemiga
            </h3>
            <div className="flex gap-4 text-sm">
              <span className="text-purple-400 font-medium">{compAnalysis.ap} AP</span>
              <span className="text-gray-400">|</span>
              <span className="text-red-400 font-medium">{compAnalysis.ad} AD</span>
              <span className="text-gray-400">|</span>
              <span className="text-blue-400 font-medium">{compAnalysis.tank} Tank</span>
            </div>
          </div>

          {/* Runes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Runas Recomendadas
            </h3>
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-bold text-lg">{runes.keystone}</span>
                <span className="text-gray-400 text-sm">({runes.primaryTree})</span>
              </div>
              <div className="text-sm text-gray-300">
                {runes.primaryRunes.join(" > ")}
              </div>
              <div className="text-sm text-gray-400">
                Secundario: <span className="text-gray-300">{runes.secondaryTree}</span> -{" "}
                <span className="text-gray-300">{runes.secondaryRunes.join(" + ")}</span>
              </div>
              <div className="text-sm text-gray-400">
                Shards: <span className="text-gray-300">{runes.shards.join(" | ")}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 italic">{runes.reasoning}</p>
            </div>
          </div>

          {/* Build Path */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Build Path
            </h3>
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
              {/* Starter */}
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Starter</span>
                <div className="flex items-center gap-2 mt-1">
                  {build.starter.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <img
                        src={getItemIconUrl(item.itemId)}
                        alt={item.name}
                        width={28}
                        height={28}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boots */}
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Botas</span>
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={getItemIconUrl(build.boots.itemId)}
                    alt={build.boots.name}
                    width={28}
                    height={28}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">{build.boots.name}</span>
                  <span className="text-xs text-gray-500">- {build.boots.reason}</span>
                </div>
              </div>

              {/* Core */}
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">Core</span>
                <div className="space-y-1.5 mt-1">
                  {build.core.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <img
                        src={getItemIconUrl(item.itemId)}
                        alt={item.name}
                        width={28}
                        height={28}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">{item.name}</span>
                      <span className="text-xs text-gray-500">- {item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Situational */}
              {build.situational.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Situacional</span>
                  <div className="space-y-1.5 mt-1">
                    {build.situational.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <img
                          src={getItemIconUrl(item.itemId)}
                          alt={item.name}
                          width={28}
                          height={28}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-300">{item.name}</span>
                        <span className="text-xs text-gray-500">- {item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 italic">{build.reasoning}</p>
            </div>
          </div>

          {/* External Links */}
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href={getMobafireSearchUrl(selectedChampion.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Guías en Mobafire
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href={getUGGChampionUrl(selectedChampion.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Build en u.gg
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
