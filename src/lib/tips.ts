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

export function generateTeamAnalysis(
  playerTeamId: number,
  matchInfo: MatchInfo
): Tip[] {
  const tips: Tip[] = [];

  const playerTeam = matchInfo.teams.find((t) => t.teamId === playerTeamId);
  const enemyTeam = matchInfo.teams.find((t) => t.teamId !== playerTeamId);

  if (!playerTeam || !enemyTeam) return tips;

  const allies = matchInfo.participants.filter((p) => p.teamId === playerTeamId);
  const enemies = matchInfo.participants.filter((p) => p.teamId !== playerTeamId);

  // Dragon comparison
  const allyDragons = playerTeam.objectives.dragon.kills;
  const enemyDragons = enemyTeam.objectives.dragon.kills;
  if (allyDragons > enemyDragons) {
    tips.push({
      category: "teamAnalysis",
      level: "good",
      message: `Tu equipo dominó los dragones: ${allyDragons} vs ${enemyDragons}`,
      value: allyDragons,
    });
  } else if (allyDragons < enemyDragons) {
    tips.push({
      category: "teamAnalysis",
      level: "bad",
      message: `El rival controló más dragones: ${enemyDragons} vs ${allyDragons}. Prioriza dragones`,
      value: allyDragons,
    });
  }

  // Baron comparison
  const allyBarons = playerTeam.objectives.baron.kills;
  const enemyBarons = enemyTeam.objectives.baron.kills;
  if (allyBarons > 0 || enemyBarons > 0) {
    if (allyBarons > enemyBarons) {
      tips.push({
        category: "teamAnalysis",
        level: "good",
        message: `Tu equipo aseguró ${allyBarons} Baron(es) vs ${enemyBarons} del rival`,
        value: allyBarons,
      });
    } else if (allyBarons < enemyBarons) {
      tips.push({
        category: "teamAnalysis",
        level: "bad",
        message: `El rival consiguió ${enemyBarons} Baron(es) vs ${allyBarons}. Controla la visión en Baron`,
        value: allyBarons,
      });
    }
  }

  // Tower comparison
  const allyTowers = playerTeam.objectives.tower.kills;
  const enemyTowers = enemyTeam.objectives.tower.kills;
  if (allyTowers !== enemyTowers) {
    tips.push({
      category: "teamAnalysis",
      level: allyTowers > enemyTowers ? "good" : "bad",
      message: allyTowers > enemyTowers
        ? `Tu equipo destruyó más torres: ${allyTowers} vs ${enemyTowers}`
        : `El rival destruyó más torres: ${enemyTowers} vs ${allyTowers}. Presiona carriles con ventaja`,
      value: allyTowers,
    });
  }

  // Vision comparison (team totals)
  const allyVision = allies.reduce((sum, p) => sum + p.visionScore, 0);
  const enemyVision = enemies.reduce((sum, p) => sum + p.visionScore, 0);
  const visionDiff = Math.abs(allyVision - enemyVision);
  if (visionDiff > 10) {
    tips.push({
      category: "teamAnalysis",
      level: allyVision > enemyVision ? "good" : "bad",
      message: allyVision > enemyVision
        ? `Tu equipo tuvo mejor visión: ${allyVision} vs ${enemyVision}`
        : `El rival tuvo mejor visión: ${enemyVision} vs ${allyVision}. Compren más wards de control`,
      value: allyVision,
    });
  }

  // Gold comparison
  const allyGold = allies.reduce((sum, p) => sum + p.goldEarned, 0);
  const enemyGold = enemies.reduce((sum, p) => sum + p.goldEarned, 0);
  const goldDiff = allyGold - enemyGold;
  if (Math.abs(goldDiff) > 2000) {
    tips.push({
      category: "teamAnalysis",
      level: goldDiff > 0 ? "good" : "bad",
      message: goldDiff > 0
        ? `Tu equipo tuvo ${(goldDiff).toLocaleString()} de oro de ventaja`
        : `El rival tuvo ${Math.abs(goldDiff).toLocaleString()} de oro de ventaja. Mejoren el farmeo y objetivos`,
      value: goldDiff,
    });
  }

  // Kill comparison
  const allyKills = allies.reduce((sum, p) => sum + p.kills, 0);
  const enemyKills = enemies.reduce((sum, p) => sum + p.kills, 0);
  if (allyKills !== enemyKills) {
    tips.push({
      category: "teamAnalysis",
      level: allyKills > enemyKills ? "good" : "bad",
      message: allyKills > enemyKills
        ? `Tu equipo dominó en kills: ${allyKills} vs ${enemyKills}`
        : `El rival tuvo más kills: ${enemyKills} vs ${allyKills}. Eviten peleas desfavorables`,
      value: allyKills,
    });
  }

  return tips;
}
