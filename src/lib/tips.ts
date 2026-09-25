import { MatchParticipant, MatchInfo, Tip } from "./types";

export function generateTips(
  player: MatchParticipant,
  matchInfo: MatchInfo
): Tip[] {
  const tips: Tip[] = [];
  const gameDurationMinutes = matchInfo.gameDuration / 60;
  const position = player.individualPosition;

  // CS/min (skip for supports and junglers)
  if (position !== "UTILITY" && position !== "JUNGLE") {
    const totalCS = player.totalMinionsKilled + player.neutralMinionsKilled;
    const csPerMin = totalCS / gameDurationMinutes;

    if (csPerMin >= 8) {
      tips.push({
        category: "cs",
        level: "good",
        message: `Excelente farmeo: ${csPerMin.toFixed(1)} CS/min`,
        value: csPerMin,
      });
    } else if (csPerMin >= 6) {
      tips.push({
        category: "cs",
        level: "ok",
        message: `Farmeo decente: ${csPerMin.toFixed(1)} CS/min. Intenta llegar a 8+ CS/min`,
        value: csPerMin,
      });
    } else {
      tips.push({
        category: "cs",
        level: "bad",
        message: `CS bajo: ${csPerMin.toFixed(1)} CS/min. Practica last-hitting, apunta a 6+ CS/min`,
        value: csPerMin,
      });
    }
  }

  // Vision score/min
  const visionPerMin = player.visionScore / gameDurationMinutes;
  if (visionPerMin >= 0.8) {
    tips.push({
      category: "vision",
      level: "good",
      message: `Gran control de visión: ${visionPerMin.toFixed(1)} vision/min`,
      value: visionPerMin,
    });
  } else if (visionPerMin >= 0.5) {
    tips.push({
      category: "vision",
      level: "ok",
      message: `Visión aceptable: ${visionPerMin.toFixed(1)} vision/min. Coloca más wards`,
      value: visionPerMin,
    });
  } else {
    tips.push({
      category: "vision",
      level: "bad",
      message: `Visión muy baja: ${visionPerMin.toFixed(1)} vision/min. Compra wards de control y usa tu trinket`,
      value: visionPerMin,
    });
  }

  // KDA
  const kda =
    player.deaths === 0
      ? player.kills + player.assists
      : (player.kills + player.assists) / player.deaths;
  if (kda >= 4) {
    tips.push({
      category: "kda",
      level: "good",
      message: `KDA excelente: ${kda.toFixed(2)}`,
      value: kda,
    });
  } else if (kda >= 2) {
    tips.push({
      category: "kda",
      level: "ok",
      message: `KDA decente: ${kda.toFixed(2)}. Intenta morir menos en peleas de equipo`,
      value: kda,
    });
  } else {
    tips.push({
      category: "kda",
      level: "bad",
      message: `KDA bajo: ${kda.toFixed(2)}. Revisa tu posicionamiento y evita peleas desfavorables`,
      value: kda,
    });
  }

  // Kill participation
  const teamKills = matchInfo.participants
    .filter((p) => p.teamId === player.teamId)
    .reduce((sum, p) => sum + p.kills, 0);

  if (teamKills > 0) {
    const kp = ((player.kills + player.assists) / teamKills) * 100;
    if (kp >= 60) {
      tips.push({
        category: "killParticipation",
        level: "good",
        message: `Alta participación en kills: ${kp.toFixed(0)}%`,
        value: kp,
      });
    } else if (kp >= 40) {
      tips.push({
        category: "killParticipation",
        level: "ok",
        message: `Participación en kills normal: ${kp.toFixed(0)}%. Intenta rotar más al equipo`,
        value: kp,
      });
    } else {
      tips.push({
        category: "killParticipation",
        level: "bad",
        message: `Baja participación en kills: ${kp.toFixed(0)}%. Únete más a las peleas de equipo`,
        value: kp,
      });
    }
  }

  // Damage share
  const teamDamage = matchInfo.participants
    .filter((p) => p.teamId === player.teamId)
    .reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);

  if (teamDamage > 0 && position !== "UTILITY") {
    const dmgShare =
      (player.totalDamageDealtToChampions / teamDamage) * 100;
    const expectedShare = 20;

    if (dmgShare >= expectedShare + 5) {
      tips.push({
        category: "damage",
        level: "good",
        message: `Gran daño al equipo: ${dmgShare.toFixed(0)}% del daño total`,
        value: dmgShare,
      });
    } else if (dmgShare >= expectedShare - 5) {
      tips.push({
        category: "damage",
        level: "ok",
        message: `Daño promedio: ${dmgShare.toFixed(0)}% del daño total`,
        value: dmgShare,
      });
    } else {
      tips.push({
        category: "damage",
        level: "bad",
        message: `Daño bajo: ${dmgShare.toFixed(0)}% del daño total. Busca más trades y peleas`,
        value: dmgShare,
      });
    }
  }

  // Game duration analysis
  const gameDurationMin = Math.floor(matchInfo.gameDuration / 60);
  const gameDurationSec = matchInfo.gameDuration % 60;
  const durationStr = `${gameDurationMin}:${gameDurationSec.toString().padStart(2, "0")}`;

  if (gameDurationMinutes < 20) {
    if (player.win) {
      tips.push({
        category: "duration",
        level: "good",
        message: `Victoria rápida en ${durationStr}. Buen ritmo de juego temprano`,
        value: gameDurationMinutes,
      });
    } else {
      tips.push({
        category: "duration",
        level: "bad",
        message: `Derrota rápida en ${durationStr}. Mejora tu early game y objetivos tempranos`,
        value: gameDurationMinutes,
      });
    }
  } else if (gameDurationMinutes > 35) {
    if (player.win) {
      tips.push({
        category: "duration",
        level: "ok",
        message: `Partida larga (${durationStr}) pero conseguiste la victoria. Buena paciencia`,
        value: gameDurationMinutes,
      });
    } else {
      tips.push({
        category: "duration",
        level: "bad",
        message: `Partida larga (${durationStr}) terminada en derrota. Cierra partidas antes aprovechando ventajas`,
        value: gameDurationMinutes,
      });
    }
  }

  // Gold efficiency
  if (position !== "UTILITY") {
    const goldPerMin = player.goldEarned / gameDurationMinutes;
    if (goldPerMin >= 450) {
      tips.push({
        category: "gold",
        level: "good",
        message: `Gran generación de oro: ${goldPerMin.toFixed(0)} oro/min`,
        value: goldPerMin,
      });
    } else if (goldPerMin >= 350) {
      tips.push({
        category: "gold",
        level: "ok",
        message: `Oro decente: ${goldPerMin.toFixed(0)} oro/min. Mejora tu farmeo y participación`,
        value: goldPerMin,
      });
    } else {
      tips.push({
        category: "gold",
        level: "bad",
        message: `Oro bajo: ${goldPerMin.toFixed(0)} oro/min. Necesitas más CS y participación en objetivos`,
        value: goldPerMin,
      });
    }
  }

  return tips;
}
