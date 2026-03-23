import { MatchParticipant, MatchInfo } from "./types";

// Champion damage type classification
// AP = ability power, AD = attack damage, TANK = primarily tank, HYBRID = mixed
type DamageType = "AP" | "AD" | "TANK" | "HYBRID";

const CHAMPION_TYPES: Record<string, DamageType> = {
  // AP mages & AP assassins
  Ahri: "AP", Akali: "AP", Anivia: "AP", Annie: "AP", AurelionSol: "AP",
  Aurora: "AP", Azir: "AP", Brand: "AP", Cassiopeia: "AP", Diana: "AP",
  Ekko: "AP", Elise: "AP", Evelynn: "AP", Fiddlesticks: "AP", Fizz: "AP",
  Gragas: "AP", Hwei: "AP", Ivern: "AP", Karma: "AP", Karthus: "AP",
  Kassadin: "AP", Katarina: "AP", Kennen: "AP", Leblanc: "AP", Lillia: "AP",
  Lissandra: "AP", Lulu: "AP", Lux: "AP", Malzahar: "AP", Morgana: "AP",
  Nami: "AP", Neeko: "AP", Nidalee: "AP", Orianna: "AP", Rumble: "AP",
  Ryze: "AP", Seraphine: "AP", Shaco: "AP", Sona: "AP", Soraka: "AP",
  Swain: "AP", Syndra: "AP", Taliyah: "AP", Teemo: "AP", TwistedFate: "AP",
  Veigar: "AP", Velkoz: "AP", Vex: "AP", Viktor: "AP", Vladimir: "AP",
  Xerath: "AP", Ziggs: "AP", Zilean: "AP", Zoe: "AP", Zyra: "AP",
  Sylas: "AP", Smolder: "AP", Naafiri: "AP", Milio: "AP", Briar: "AD",
  Belveth: "AD", Nilah: "AD", Zeri: "AD", Renata: "AP", Viego: "AD",
  Gwen: "AP", Yone: "HYBRID", Samira: "AD", Rell: "TANK", Seraphine2: "AP",

  // AD fighters & assassins
  Aatrox: "AD", Camille: "AD", Darius: "AD", Draven: "AD", Fiora: "AD",
  Gangplank: "AD", Garen: "AD", Hecarim: "AD", Illaoi: "AD", Irelia: "AD",
  JarvanIV: "AD", Jax: "HYBRID", Jayce: "AD", Kayn: "AD", Khazix: "AD",
  Kled: "AD", LeeSin: "AD", MasterYi: "AD", Nocturne: "AD", Olaf: "AD",
  Pantheon: "AD", Pyke: "AD", Qiyana: "AD", RekSai: "AD", Renekton: "AD",
  Rengar: "AD", Riven: "AD", Sett: "AD", Talon: "AD", Tryndamere: "AD",
  Udyr: "AD", Urgot: "AD", Vi: "AD", Warwick: "AD", Wukong: "AD",
  XinZhao: "AD", Yasuo: "AD", Zed: "AD", Ambessa: "AD",

  // ADCs
  Aphelios: "AD", Ashe: "AD", Caitlyn: "AD", Corki: "HYBRID", Ezreal: "HYBRID",
  Jhin: "AD", Jinx: "AD", KaiSa: "HYBRID", Kalista: "AD", Kindred: "AD",
  KogMaw: "HYBRID", Lucian: "AD", MissFortune: "AD", Quinn: "AD",
  Sivir: "AD", Tristana: "AD", Twitch: "AD", Varus: "HYBRID", Vayne: "AD",
  Xayah: "AD",

  // Tanks
  Alistar: "TANK", Amumu: "TANK", Blitzcrank: "TANK", Braum: "TANK",
  Chogath: "AP", DrMundo: "TANK", Galio: "AP", Leona: "TANK",
  Malphite: "TANK", Maokai: "TANK", Nautilus: "TANK", Nunu: "AP",
  Ornn: "TANK", Poppy: "TANK", Rammus: "TANK", Sejuani: "TANK",
  Shen: "TANK", Singed: "AP", Sion: "TANK", TahmKench: "TANK",
  Taric: "TANK", Thresh: "TANK", Volibear: "HYBRID", Yorick: "AD",
  Zac: "AP", KSante: "TANK",

  // Others
  Bard: "AP", Heimerdinger: "AP", Janna: "AP", Kayle: "HYBRID",
  Mordekaiser: "AP", Nasus: "AD", Rakan: "AP", Senna: "AD",
  Shyvana: "HYBRID", Trundle: "AD", Veigar2: "AP", Yuumi: "AP",
  Ksante: "TANK", Naafiri2: "AD",
};

function getChampionType(championName: string): DamageType {
  return CHAMPION_TYPES[championName] || "AD";
}

export interface TeamAnalysis {
  apCount: number;
  adCount: number;
  tankCount: number;
  apPercent: number;
  adPercent: number;
  isApHeavy: boolean;
  isAdHeavy: boolean;
  isMixed: boolean;
  isTankHeavy: boolean;
}

export interface BuildRecommendation {
  title: string;
  items: RecommendedItem[];
  reasoning: string;
}

export interface RecommendedItem {
  name: string;
  itemId: number;
  reason: string;
}

export function analyzeEnemyTeam(
  matchInfo: MatchInfo,
  playerTeamId: number
): TeamAnalysis {
  const enemies = matchInfo.participants.filter((p) => p.teamId !== playerTeamId);

  let apCount = 0;
  let adCount = 0;
  let tankCount = 0;

  enemies.forEach((e) => {
    const type = getChampionType(e.championName);
    switch (type) {
      case "AP": apCount++; break;
      case "AD": adCount++; break;
      case "TANK": tankCount++; break;
      case "HYBRID": apCount += 0.5; adCount += 0.5; break;
    }
  });

  const total = apCount + adCount + tankCount || 1;
  const apPercent = (apCount / total) * 100;
  const adPercent = (adCount / total) * 100;

  return {
    apCount: Math.round(apCount),
    adCount: Math.round(adCount),
    tankCount,
    apPercent,
    adPercent,
    isApHeavy: apPercent >= 55,
    isAdHeavy: adPercent >= 55,
    isMixed: apPercent >= 30 && apPercent <= 55,
    isTankHeavy: tankCount >= 2,
  };
}

export function getDefensiveRecommendations(
  analysis: TeamAnalysis,
  position: string
): BuildRecommendation {
  const items: RecommendedItem[] = [];
  const isCarry = ["MIDDLE", "BOTTOM", "TOP"].includes(position);
  const isSupport = position === "UTILITY";
  const isJungle = position === "JUNGLE";

  if (analysis.isApHeavy) {
    // Anti-AP items
    items.push({
      name: "Mercury's Treads",
      itemId: 3111,
      reason: "Resistencia mágica + tenacidad vs comp AP",
    });
    if (isCarry) {
      items.push({
        name: "Maw of Malmortius",
        itemId: 3156,
        reason: "Escudo mágico que salva vs burst AP",
      });
      items.push({
        name: "Wit's End",
        itemId: 3091,
        reason: "RM + velocidad de ataque, bueno vs AP",
      });
    }
    items.push({
      name: "Spirit Visage",
      itemId: 3065,
      reason: "RM + curación aumentada, ideal vs mucho AP",
    });
    if (isSupport) {
      items.push({
        name: "Mikael's Blessing",
        itemId: 3222,
        reason: "Limpia CC y da RM, clave como soporte vs AP/CC",
      });
    }
  }

  if (analysis.isAdHeavy) {
    // Anti-AD items
    items.push({
      name: "Plated Steelcaps",
      itemId: 3047,
      reason: "Armadura + reducción de autoataques vs comp AD",
    });
    if (isCarry || isJungle) {
      items.push({
        name: "Guardian Angel",
        itemId: 3026,
        reason: "Resurrección + armadura, te salva de assassins AD",
      });
      items.push({
        name: "Death's Dance",
        itemId: 6333,
        reason: "Armadura + daño diferido, muy fuerte vs AD",
      });
    }
    items.push({
      name: "Randuin's Omen",
      itemId: 3143,
      reason: "Reduce daño crítico, ideal vs ADCs y AD crit",
    });
    if (isSupport) {
      items.push({
        name: "Frozen Heart",
        itemId: 3110,
        reason: "Reduce velocidad de ataque enemiga, clave vs ADCs",
      });
    }
  }

  if (analysis.isMixed) {
    // Mixed defense
    if (isCarry) {
      items.push({
        name: "Guardian Angel",
        itemId: 3026,
        reason: "Bueno en comps mixtas por la resurrección",
      });
    }
    items.push({
      name: "Gargoyle Stoneplate",
      itemId: 3193,
      reason: "Armadura + RM + escudo, ideal vs daño mixto",
    });
  }

  if (analysis.isTankHeavy) {
    // Anti-tank items
    items.push({
      name: "Black Cleaver",
      itemId: 3071,
      reason: "Reduce armadura progresivamente, clave vs tanques",
    });
    items.push({
      name: "Blade of the Ruined King",
      itemId: 3153,
      reason: "Daño basado en % de vida, destruye tanques",
    });
    if (position === "MIDDLE" || getChampionType("") === "AP") {
      items.push({
        name: "Void Staff",
        itemId: 3135,
        reason: "Penetración mágica vs tanques con RM",
      });
    }
  }

  // Determine title and reasoning
  let title: string;
  let reasoning: string;
  if (analysis.isApHeavy) {
    title = `Comp enemiga AP heavy (${analysis.apCount} AP)`;
    reasoning = "Prioriza resistencia mágica. Mercury's Treads es casi obligatorio. Spirit Visage si necesitas sustain.";
  } else if (analysis.isAdHeavy) {
    title = `Comp enemiga AD heavy (${analysis.adCount} AD)`;
    reasoning = "Prioriza armadura. Plated Steelcaps + un item de armadura temprano. Randuin's si hay ADC fed.";
  } else if (analysis.isTankHeavy) {
    title = `Comp enemiga con ${analysis.tankCount} tanques`;
    reasoning = "Necesitas penetración y daño %vida. Black Cleaver o BOTRK son clave para pelear peleas largas.";
  } else {
    title = "Comp enemiga mixta";
    reasoning = "Daño balanceado del enemigo. Adapta tus defensivos según quién esté más fed en la partida.";
  }

  return { title, items: items.slice(0, 4), reasoning };
}

export function analyzeBuildEfficiency(
  player: MatchParticipant,
  analysis: TeamAnalysis
): { verdict: string; level: "good" | "ok" | "bad" } {
  const items = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5];

  // Known defensive item IDs (approximate - covers most common ones)
  const armorItems = new Set([3047, 3143, 3110, 3075, 3068, 6333, 3026, 3742]);
  const mrItems = new Set([3111, 3065, 3156, 3091, 3194, 3222, 3102]);

  const hasArmor = items.some((id) => armorItems.has(id));
  const hasMR = items.some((id) => mrItems.has(id));

  if (analysis.isApHeavy && !hasMR) {
    return {
      verdict: "No compraste resistencia mágica contra una comp AP heavy",
      level: "bad",
    };
  }
  if (analysis.isAdHeavy && !hasArmor) {
    return {
      verdict: "No compraste armadura contra una comp AD heavy",
      level: "bad",
    };
  }
  if (analysis.isApHeavy && hasMR) {
    return {
      verdict: "Buena elección de resistencia mágica contra comp AP",
      level: "good",
    };
  }
  if (analysis.isAdHeavy && hasArmor) {
    return {
      verdict: "Buena elección de armadura contra comp AD",
      level: "good",
    };
  }
  return {
    verdict: "Build adaptada a la composición enemiga",
    level: "ok",
  };
}
