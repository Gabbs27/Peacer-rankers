"use client";

import { useState } from "react";
import { MatchData } from "@/lib/types";
import { getChampionIconUrl } from "@/lib/data-dragon";
import { calculatePerformanceScore } from "@/lib/scoring";

interface Props {
  matches: MatchData[];
  puuid: string;
}

interface ChampionStats {
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  totalMinutes: number;
  totalDamage: number;
  totalGold: number;
  totalVision: number;
  avgScore: number;
  positions: string[];
}

interface FeedbackItem {
  title: string;
  detail: string;
}

interface CategorizedFeedback {
  great: FeedbackItem[];
  mid: FeedbackItem[];
  bad: FeedbackItem[];
}

export default function MatchOverview({ matches, puuid }: Props) {
  const [showChampions, setShowChampions] = useState(true);
  const [showFeedback, setShowFeedback] = useState(true);

  // Calculate general stats
  const playerMatches = matches.map((m) => {
    const player = m.info.participants.find((p) => p.puuid === puuid);
    const score = player ? calculatePerformanceScore(player, m.info) : null;
    const allies = player ? m.info.participants.filter((p) => p.teamId === player.teamId) : [];
    const teamKills = allies.reduce((s, p) => s + p.kills, 0);
    return { match: m, player, score, teamKills };
  }).filter((m) => m.player != null);

  if (playerMatches.length === 0) return null;

  const totalGames = playerMatches.length;
  const wins = playerMatches.filter((m) => m.player!.win).length;
  const losses = totalGames - wins;
  const winRate = Math.round((wins / totalGames) * 100);

  const totalKills = playerMatches.reduce((s, m) => s + m.player!.kills, 0);
  const totalDeaths = playerMatches.reduce((s, m) => s + m.player!.deaths, 0);
  const totalAssists = playerMatches.reduce((s, m) => s + m.player!.assists, 0);
  const avgKDA = totalDeaths === 0 ? "Perfect" : ((totalKills + totalAssists) / totalDeaths).toFixed(2);

  const totalCS = playerMatches.reduce((s, m) => s + m.player!.totalMinionsKilled + m.player!.neutralMinionsKilled, 0);
  const totalMinutes = playerMatches.reduce((s, m) => s + m.match.info.gameDuration / 60, 0);
  const avgCSMin = (totalCS / totalMinutes).toFixed(1);

  const avgDamage = Math.round(playerMatches.reduce((s, m) => s + m.player!.totalDamageDealtToChampions, 0) / totalGames);
  const avgGold = Math.round(playerMatches.reduce((s, m) => s + m.player!.goldEarned, 0) / totalGames);
  const avgVision = (playerMatches.reduce((s, m) => s + m.player!.visionScore, 0) / totalGames).toFixed(1);

  const avgOverall = Math.round(playerMatches.reduce((s, m) => s + (m.score?.overall || 0), 0) / totalGames);
  const avgMicro = Math.round(playerMatches.reduce((s, m) => s + (m.score?.micro || 0), 0) / totalGames);
  const avgMacro = Math.round(playerMatches.reduce((s, m) => s + (m.score?.macro || 0), 0) / totalGames);

  // Additional deep stats
  const avgDeathsPerGame = totalDeaths / totalGames;
  const avgKillParticipation = playerMatches.reduce((s, m) => {
    const kp = m.teamKills > 0 ? ((m.player!.kills + m.player!.assists) / m.teamKills) * 100 : 0;
    return s + kp;
  }, 0) / totalGames;
  const avgVisionPerMin = playerMatches.reduce((s, m) => {
    const mins = m.match.info.gameDuration / 60;
    return s + (m.player!.visionScore / mins);
  }, 0) / totalGames;
  const avgWardsKilled = playerMatches.reduce((s, m) => s + m.player!.wardsKilled, 0) / totalGames;
  const avgWardsPlaced = playerMatches.reduce((s, m) => s + m.player!.wardsPlaced, 0) / totalGames;
  const avgGoldPerMin = playerMatches.reduce((s, m) => {
    const mins = m.match.info.gameDuration / 60;
    return s + (m.player!.goldEarned / mins);
  }, 0) / totalGames;
  const avgDamageShare = playerMatches.reduce((s, m) => {
    const allies = m.match.info.participants.filter((p) => p.teamId === m.player!.teamId);
    const teamDmg = allies.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
    return s + (teamDmg > 0 ? (m.player!.totalDamageDealtToChampions / teamDmg) * 100 : 0);
  }, 0) / totalGames;

  // Win streaks / loss streaks
  let currentStreak = 0;
  let streakType: "win" | "loss" = playerMatches[0]?.player?.win ? "win" : "loss";
  for (const m of playerMatches) {
    if (m.player!.win && streakType === "win") currentStreak++;
    else if (!m.player!.win && streakType === "loss") currentStreak++;
    else break;
  }

  // Most played positions
  const positionCount = new Map<string, number>();
  playerMatches.forEach((m) => {
    const pos = m.player!.individualPosition;
    if (pos && pos !== "Invalid") {
      positionCount.set(pos, (positionCount.get(pos) || 0) + 1);
    }
  });

  // Generate categorized feedback
  const feedback = generateCategorizedFeedback({
    winRate, avgKDA, csMin: parseFloat(avgCSMin), avgMicro, avgMacro,
    avgVisionPerMin, avgDeathsPerGame, avgKillParticipation,
    avgWardsKilled, avgWardsPlaced, avgGoldPerMin, avgDamageShare,
    currentStreak, streakType, totalGames,
  });

  // Champion grouped stats
  const champStats = new Map<string, ChampionStats>();
  playerMatches.forEach(({ player: p, match: m, score }) => {
    const name = p!.championName;
    const existing = champStats.get(name) || {
      championName: name, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0,
      cs: 0, totalMinutes: 0, totalDamage: 0, totalGold: 0, totalVision: 0, avgScore: 0,
      positions: [],
    };
    existing.games++;
    if (p!.win) existing.wins++;
    existing.kills += p!.kills;
    existing.deaths += p!.deaths;
    existing.assists += p!.assists;
    existing.cs += p!.totalMinionsKilled + p!.neutralMinionsKilled;
    existing.totalMinutes += m.info.gameDuration / 60;
    existing.totalDamage += p!.totalDamageDealtToChampions;
    existing.totalGold += p!.goldEarned;
    existing.totalVision += p!.visionScore;
    existing.avgScore += score?.overall || 0;
    if (p!.individualPosition && p!.individualPosition !== "Invalid") {
      existing.positions.push(p!.individualPosition);
    }
    champStats.set(name, existing);
  });

  const champList = Array.from(champStats.values())
    .sort((a, b) => b.games - a.games);

  return (
    <div className="space-y-4">
      {/* General Overview */}
      <div className="rounded-xl border border-gray-600 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-5">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          Overview — Últimas {totalGames} partidas
        </h3>

        {/* Win/Loss Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-blue-400 font-semibold">{wins}V</span>
            <span className={`font-bold text-lg ${winRate >= 50 ? "text-blue-400" : "text-red-400"}`}>
              {winRate}% WR
            </span>
            <span className="text-red-400 font-semibold">{losses}D</span>
          </div>
          <div className="h-3 bg-red-500/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${winRate}%` }}
            />
          </div>
          {currentStreak >= 2 && (
            <p className={`text-xs mt-1 ${streakType === "win" ? "text-blue-400" : "text-red-400"}`}>
              {streakType === "win" ? "🔥" : "💀"} {currentStreak} {streakType === "win" ? "victorias" : "derrotas"} seguidas
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <StatBox label="KDA Promedio" value={avgKDA} sub={`${(totalKills / totalGames).toFixed(1)} / ${(totalDeaths / totalGames).toFixed(1)} / ${(totalAssists / totalGames).toFixed(1)}`} />
          <StatBox label="CS/min" value={avgCSMin} sub={`${totalCS} CS total`} />
          <StatBox label="Daño Prom." value={`${(avgDamage / 1000).toFixed(1)}k`} sub={`${avgDamageShare.toFixed(0)}% del equipo`} />
          <StatBox label="Oro Prom." value={`${(avgGold / 1000).toFixed(1)}k`} sub={`${avgGoldPerMin.toFixed(0)} oro/min`} />
          <StatBox label="Visión" value={avgVision} sub={`${avgVisionPerMin.toFixed(1)}/min`} />
          <StatBox label="Rendimiento" value={`${avgOverall}`} sub={`Micro ${avgMicro} · Macro ${avgMacro}`} />
        </div>
      </div>

      {/* 3-Column Feedback: Great / Mid / Bad */}
      <div className="rounded-xl border border-gray-600 bg-gray-800/60 p-5">
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-bold text-gray-100">
            Coaching Feedback
          </h3>
          <span className="text-gray-400 text-sm">
            {showFeedback ? "▲ Ocultar" : "▼ Mostrar"}
          </span>
        </button>

        {showFeedback && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GREAT - Keep doing */}
            <div className="rounded-lg border border-green-500/30 bg-green-900/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💪</span>
                <div>
                  <h4 className="text-sm font-bold text-green-400">Keep Doing</h4>
                  <p className="text-[10px] text-green-400/60">Lo que haces bien</p>
                </div>
              </div>
              {feedback.great.length > 0 ? (
                <div className="space-y-2.5">
                  {feedback.great.map((fb, i) => (
                    <div key={i}>
                      <p className="text-sm text-green-300 font-medium">{fb.title}</p>
                      <p className="text-xs text-green-400/70">{fb.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Sigue practicando para desbloquear fortalezas</p>
              )}
            </div>

            {/* MID - Do better */}
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚡</span>
                <div>
                  <h4 className="text-sm font-bold text-yellow-400">Do Better</h4>
                  <p className="text-[10px] text-yellow-400/60">Puedes mejorar</p>
                </div>
              </div>
              {feedback.mid.length > 0 ? (
                <div className="space-y-2.5">
                  {feedback.mid.map((fb, i) => (
                    <div key={i}>
                      <p className="text-sm text-yellow-300 font-medium">{fb.title}</p>
                      <p className="text-xs text-yellow-400/70">{fb.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nada que mejorar aquí por ahora</p>
              )}
            </div>

            {/* BAD - To improve */}
            <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <div>
                  <h4 className="text-sm font-bold text-red-400">To Improve</h4>
                  <p className="text-[10px] text-red-400/60">Enfócate en esto</p>
                </div>
              </div>
              {feedback.bad.length > 0 ? (
                <div className="space-y-2.5">
                  {feedback.bad.map((fb, i) => (
                    <div key={i}>
                      <p className="text-sm text-red-300 font-medium">{fb.title}</p>
                      <p className="text-xs text-red-400/70">{fb.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No hay problemas críticos detectados</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Champion Breakdown */}
      <div className="rounded-xl border border-gray-600 bg-gray-800/60 p-5">
        <button
          onClick={() => setShowChampions(!showChampions)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-bold text-gray-100">
            Stats por Campeón
          </h3>
          <span className="text-gray-400 text-sm">
            {showChampions ? "▲ Ocultar" : "▼ Mostrar"}
          </span>
        </button>

        {showChampions && (
          <div className="mt-4 space-y-2">
            {champList.map((champ) => {
              const wr = Math.round((champ.wins / champ.games) * 100);
              const kda = champ.deaths === 0
                ? "Perfect"
                : ((champ.kills + champ.assists) / champ.deaths).toFixed(2);
              const csMin = (champ.cs / champ.totalMinutes).toFixed(1);
              const avgDmg = (champ.totalDamage / champ.games / 1000).toFixed(1);
              const champScore = Math.round(champ.avgScore / champ.games);

              return (
                <div
                  key={champ.championName}
                  className="flex items-center gap-3 bg-gray-700/40 rounded-lg p-3 hover:bg-gray-700/60 transition-colors"
                >
                  <img
                    src={getChampionIconUrl(champ.championName)}
                    alt={champ.championName}
                    width={44}
                    height={44}
                    className="rounded-full border-2 border-gray-600"
                  />

                  <div className="min-w-[100px]">
                    <p className="text-sm font-semibold text-gray-100">{champ.championName}</p>
                    <p className="text-xs text-gray-400">
                      {champ.games} {champ.games === 1 ? "partida" : "partidas"}
                    </p>
                  </div>

                  <div className="min-w-[80px]">
                    <p className={`text-sm font-bold ${wr >= 50 ? "text-blue-400" : "text-red-400"}`}>
                      {wr}% WR
                    </p>
                    <div className="h-1.5 bg-red-500/40 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${wr}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500">{champ.wins}V {champ.games - champ.wins}D</p>
                  </div>

                  <div className="min-w-[60px] text-center hidden sm:block">
                    <p className="text-sm font-medium text-gray-200">{kda}</p>
                    <p className="text-[10px] text-gray-500">KDA</p>
                  </div>

                  <div className="min-w-[50px] text-center hidden sm:block">
                    <p className="text-sm font-medium text-gray-200">{csMin}</p>
                    <p className="text-[10px] text-gray-500">CS/min</p>
                  </div>

                  <div className="min-w-[50px] text-center hidden md:block">
                    <p className="text-sm font-medium text-gray-200">{avgDmg}k</p>
                    <p className="text-[10px] text-gray-500">Daño</p>
                  </div>

                  <div className="min-w-[40px] text-center hidden md:block">
                    <p className="text-sm font-bold text-orange-400">{champScore}</p>
                    <p className="text-[10px] text-gray-500">Score</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-100">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

// =====================================================
// DEEP FEEDBACK ENGINE — Keep Doing / Do Better / Fix
// =====================================================

interface FeedbackInput {
  winRate: number;
  avgKDA: string;
  csMin: number;
  avgMicro: number;
  avgMacro: number;
  avgVisionPerMin: number;
  avgDeathsPerGame: number;
  avgKillParticipation: number;
  avgWardsKilled: number;
  avgWardsPlaced: number;
  avgGoldPerMin: number;
  avgDamageShare: number;
  currentStreak: number;
  streakType: "win" | "loss";
  totalGames: number;
}

function generateCategorizedFeedback(input: FeedbackInput): CategorizedFeedback {
  const great: FeedbackItem[] = [];
  const mid: FeedbackItem[] = [];
  const bad: FeedbackItem[] = [];

  const kda = input.avgKDA === "Perfect" ? 99 : parseFloat(input.avgKDA);

  // ========== WIN RATE ==========
  if (input.winRate >= 65) {
    great.push({ title: `Winrate dominante (${input.winRate}%)`, detail: "Estás ganando la mayoría de tus partidas. Sigue con esa consistencia." });
  } else if (input.winRate >= 50) {
    great.push({ title: `Winrate positivo (${input.winRate}%)`, detail: "Estás por encima del 50%. Buen ritmo de climb." });
  } else if (input.winRate >= 40) {
    mid.push({ title: `Winrate negativo (${input.winRate}%)`, detail: "Estás perdiendo más de lo que ganas. Revisa qué campeones y roles te dan mejores resultados." });
  } else {
    bad.push({ title: `Winrate crítico (${input.winRate}%)`, detail: "Algo no está funcionando. Considera reducir tu pool de campeones y enfocarte en 2-3 que domines." });
  }

  // ========== KDA / DEATHS ==========
  if (kda >= 5) {
    great.push({ title: `KDA excelente (${input.avgKDA})`, detail: "Mueres poco y participas en muchas kills. Tu posicionamiento es fuerte." });
  } else if (kda >= 3) {
    great.push({ title: `Buen KDA (${input.avgKDA})`, detail: "Tu balance de kills/deaths/assists es sólido." });
  } else if (kda >= 2) {
    mid.push({ title: `KDA promedio (${input.avgKDA})`, detail: "Tu KDA es funcional pero hay espacio para mejorar. Intenta morir menos en peleas innecesarias." });
  } else {
    bad.push({ title: `KDA bajo (${input.avgKDA})`, detail: "Mueres demasiado relativo a tu impacto. Enfócate en no tomar peleas que no puedes ganar." });
  }

  if (input.avgDeathsPerGame >= 7) {
    bad.push({ title: `Muchas muertes (${input.avgDeathsPerGame.toFixed(1)}/partida)`, detail: "Morir tanto te quita oro, XP y presión de mapa. Antes de pelear pregúntate: ¿puedo ganar esto?" });
  } else if (input.avgDeathsPerGame >= 5) {
    mid.push({ title: `Muertes moderadas (${input.avgDeathsPerGame.toFixed(1)}/partida)`, detail: "Algunas muertes son evitables. Revisa si mueres por overextender sin visión." });
  } else if (input.avgDeathsPerGame <= 3) {
    great.push({ title: `Pocas muertes (${input.avgDeathsPerGame.toFixed(1)}/partida)`, detail: "Moriste poco. Buen control de riesgo y posicionamiento." });
  }

  // ========== FARM / CS ==========
  if (input.csMin >= 7.5) {
    great.push({ title: `Farmeo excelente (${input.csMin} CS/min)`, detail: "Tu CS/min es de nivel alto. Sigue así, el oro del farmeo es el más consistente." });
  } else if (input.csMin >= 6) {
    mid.push({ title: `Farmeo decente (${input.csMin} CS/min)`, detail: "Tu CS es aceptable pero podrías sacar más oro. Intenta no perder CS mientras roameas." });
  } else if (input.csMin >= 4) {
    mid.push({ title: `Farmeo bajo (${input.csMin} CS/min)`, detail: "Estás dejando mucho oro en la mesa. Practica último golpe y busca waves laterales mid/late game." });
  } else if (input.csMin < 3) {
    // Probably support/ARAM, skip
  }

  // ========== KILL PARTICIPATION ==========
  if (input.avgKillParticipation >= 65) {
    great.push({ title: `Alta participación (${input.avgKillParticipation.toFixed(0)}% KP)`, detail: "Estás involucrado en la mayoría de kills de tu equipo. Buen roaming y teamfighting." });
  } else if (input.avgKillParticipation >= 50) {
    // Normal, don't mention
  } else if (input.avgKillParticipation < 40) {
    mid.push({ title: `Baja participación (${input.avgKillParticipation.toFixed(0)}% KP)`, detail: "Tu equipo está peleando sin ti. Mejora tu rotación y presta atención al mapa." });
  }

  // ========== VISION ==========
  if (input.avgVisionPerMin >= 1.2) {
    great.push({ title: `Visión excelente (${input.avgVisionPerMin.toFixed(1)}/min)`, detail: "Controlas la visión como un pro. Esto previene ganks y asegura objetivos." });
  } else if (input.avgVisionPerMin >= 0.6) {
    // Normal, skip
  } else if (input.avgVisionPerMin < 0.4) {
    bad.push({ title: `Visión muy baja (${input.avgVisionPerMin.toFixed(1)}/min)`, detail: "Casi no pones wards. Sin visión estás jugando a ciegas. Compra control wards y usa trinkets." });
  } else if (input.avgVisionPerMin < 0.6) {
    mid.push({ title: `Visión insuficiente (${input.avgVisionPerMin.toFixed(1)}/min)`, detail: "Pon más wards, especialmente antes de objetivos. Un control ward por back es buena regla." });
  }

  if (input.avgWardsKilled >= 3) {
    great.push({ title: `Buen denial de visión (${input.avgWardsKilled.toFixed(1)} wards/partida)`, detail: "Limpias la visión enemiga. Esto ayuda a tu equipo a hacer jugadas." });
  } else if (input.avgWardsKilled < 1) {
    mid.push({ title: `No limpias wards (${input.avgWardsKilled.toFixed(1)}/partida)`, detail: "Compra lentes y limpia la visión enemiga. Cada ward destruido es información que les quitas." });
  }

  // ========== GOLD EFFICIENCY ==========
  if (input.avgGoldPerMin >= 450) {
    great.push({ title: `Generación de oro alta (${input.avgGoldPerMin.toFixed(0)}/min)`, detail: "Sacas mucho oro por minuto. Buen balance entre farm, kills y objetivos." });
  } else if (input.avgGoldPerMin < 300) {
    mid.push({ title: `Oro por minuto bajo (${input.avgGoldPerMin.toFixed(0)}/min)`, detail: "Necesitas más fuentes de oro. Busca waves laterales, jungle camps cuando puedas." });
  }

  // ========== DAMAGE ==========
  if (input.avgDamageShare >= 28) {
    great.push({ title: `Alto % de daño del equipo (${input.avgDamageShare.toFixed(0)}%)`, detail: "Eres el carry de daño principal. Tu equipo depende de ti en teamfights." });
  } else if (input.avgDamageShare < 15) {
    mid.push({ title: `Bajo impacto de daño (${input.avgDamageShare.toFixed(0)}%)`, detail: "Tu daño es bajo comparado con tu equipo. Busca mejores oportunidades para tradear y pelear." });
  }

  // ========== MICRO vs MACRO ==========
  if (input.avgMicro >= 75 && input.avgMacro >= 75) {
    great.push({ title: "Micro y Macro balanceados", detail: `Micro ${input.avgMicro} + Macro ${input.avgMacro}. Eres un jugador completo.` });
  } else if (input.avgMicro >= 70 && input.avgMacro < 55) {
    mid.push({ title: `Micro fuerte (${input.avgMicro}) pero Macro débil (${input.avgMacro})`, detail: "Tus mecánicas son buenas pero tu macro no acompaña. Enfócate en: visión, rotaciones, timing de objetivos." });
  } else if (input.avgMacro >= 70 && input.avgMicro < 55) {
    mid.push({ title: `Macro fuerte (${input.avgMacro}) pero Micro débil (${input.avgMicro})`, detail: "Entiendes el juego pero tus mecánicas fallan. Practica combos, último golpe y spacing en peleas." });
  } else if (input.avgMicro < 45 && input.avgMacro < 45) {
    bad.push({ title: `Micro (${input.avgMicro}) y Macro (${input.avgMacro}) por debajo`, detail: "Ambas áreas necesitan trabajo. Empieza por lo básico: no morir, farmear bien, y poner wards." });
  }

  // ========== STREAKS ==========
  if (input.currentStreak >= 4 && input.streakType === "win") {
    great.push({ title: `Racha de ${input.currentStreak} victorias`, detail: "Estás en tu mejor momento. Aprovecha el momentum." });
  } else if (input.currentStreak >= 3 && input.streakType === "loss") {
    bad.push({ title: `Racha de ${input.currentStreak} derrotas`, detail: "Estás tilteado o algo no funciona. Toma un descanso, cambia de campeón, o juega ARAM para resetear." });
  }

  return { great, mid, bad };
}
