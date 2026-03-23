import { MatchParticipant, MatchInfo } from "./types";

// Champion damage type classification
// AP = ability power, AD = attack damage, TANK = primarily tank, HYBRID = mixed
type DamageType = "AP" | "AD" | "TANK" | "HYBRID";

// Normalize champion names from Riot API to our map keys
const NAME_ALIASES: Record<string, string> = {
  MonkeyKing: "Wukong",
  FiddleSticks: "Fiddlesticks",
  "Nunu & Willump": "Nunu",
  NunuWillump: "Nunu",
  "Dr. Mundo": "DrMundo",
  "Cho'Gath": "Chogath",
  "Bel'Veth": "Belveth",
  "K'Sante": "KSante",
  "Kog'Maw": "KogMaw",
  "Kai'Sa": "KaiSa",
  "Kha'Zix": "Khazix",
  "Rek'Sai": "RekSai",
  "Vel'Koz": "Velkoz",
  "Xin Zhao": "XinZhao",
  "Jarvan IV": "JarvanIV",
  "Master Yi": "MasterYi",
  "Miss Fortune": "MissFortune",
  "Tahm Kench": "TahmKench",
  "Aurelion Sol": "AurelionSol",
  "Twisted Fate": "TwistedFate",
  "Lee Sin": "LeeSin",
};

function normalizeChampionName(name: string): string {
  if (NAME_ALIASES[name]) return NAME_ALIASES[name];
  // Remove spaces, apostrophes, dots for lookup
  return name.replace(/[\s'.]/g, "");
}

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
  Sylas: "AP", Smolder: "AP", Naafiri: "AD", Milio: "AP", Briar: "AD",
  Belveth: "AD", Nilah: "AD", Zeri: "AD", Renata: "AP", Viego: "AD",
  Gwen: "AP", Yone: "HYBRID", Samira: "AD", Rell: "TANK",

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
  Shyvana: "HYBRID", Trundle: "AD", Yuumi: "AP",
};

export function getChampionType(championName: string): DamageType {
  const normalized = normalizeChampionName(championName);
  return CHAMPION_TYPES[normalized] || "AD";
}

// Classify champion based on actual match damage data (fallback when not in map)
function getChampionTypeFromMatchData(p: MatchParticipant): DamageType {
  const magicDmg = p.magicDamageDealtToChampions || 0;
  const physDmg = p.physicalDamageDealtToChampions || 0;
  const totalDmg = magicDmg + physDmg || 1;

  // Check if tank: low total damage but high HP/tankiness (use damage taken as proxy)
  const totalDealt = p.totalDamageDealtToChampions || 0;
  const totalTaken = p.totalDamageTaken || 0;
  if (totalTaken > totalDealt * 1.5 && totalDealt < 15000) return "TANK";

  if (magicDmg / totalDmg > 0.65) return "AP";
  if (physDmg / totalDmg > 0.65) return "AD";
  return "HYBRID";
}

// Get champion type, using match data as fallback for unknown champions
function getChampionTypeWithFallback(championName: string, participant?: MatchParticipant): DamageType {
  const normalized = normalizeChampionName(championName);
  if (CHAMPION_TYPES[normalized]) return CHAMPION_TYPES[normalized];
  if (participant) return getChampionTypeFromMatchData(participant);
  return "AD";
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

  // Display counts: each champion counted ONCE in their PRIMARY category
  let displayAp = 0;
  let displayAd = 0;
  let displayTank = 0;

  // Threat counts: used for item recommendations (HYBRID counts both, TANK counts as AD)
  let threatAp = 0;
  let threatAd = 0;

  enemies.forEach((e) => {
    const type = getChampionTypeWithFallback(e.championName, e);

    // Display: each champ goes into exactly ONE bucket
    switch (type) {
      case "AP": displayAp++; break;
      case "AD": displayAd++; break;
      case "TANK": displayTank++; break;
      case "HYBRID": displayAd++; break; // Show hybrids as AD for simplicity
    }

    // Threat: hybrids count as both threats, tanks as AD
    switch (type) {
      case "AP": threatAp++; break;
      case "AD": threatAd++; break;
      case "TANK": threatAd++; break;
      case "HYBRID": threatAp++; threatAd++; break;
    }
  });

  const threatTotal = threatAp + threatAd || 1;

  return {
    apCount: displayAp,
    adCount: displayAd,
    tankCount: displayTank,
    apPercent: (threatAp / threatTotal) * 100,
    adPercent: (threatAd / threatTotal) * 100,
    isApHeavy: threatAp >= 3,
    isAdHeavy: threatAd >= 3,
    isMixed: threatAp >= 2 && threatAd >= 2,
    isTankHeavy: displayTank >= 2,
  };
}

export function getDefensiveRecommendations(
  analysis: TeamAnalysis,
  position: string,
  championName: string
): BuildRecommendation {
  let items: RecommendedItem[] = [];
  const champType = getChampionType(championName);
  const isAP = champType === "AP";
  const isAD = champType === "AD" || champType === "HYBRID";
  const isSupport = position === "UTILITY";
  const isTank = champType === "TANK";

  if (analysis.isApHeavy) {
    items.push({
      name: "Mercury's Treads",
      itemId: 3111,
      reason: "RM + tenacidad, obligatorio vs comp AP heavy",
    });
    if (isAD) {
      items.push({
        name: "Maw of Malmortius",
        itemId: 3156,
        reason: "Escudo mágico + AD, ideal para tu campeón vs burst AP",
      });
      items.push({
        name: "Wit's End",
        itemId: 3091,
        reason: "RM + velocidad de ataque para campeones AD",
      });
    }
    if (isAP) {
      items.push({
        name: "Banshee's Veil",
        itemId: 3102,
        reason: "RM + AP + escudo anti-habilidad, perfecto para mages",
      });
    }
    if (isTank || isSupport) {
      items.push({
        name: "Spirit Visage",
        itemId: 3065,
        reason: "RM + curación aumentada, ideal para tanques/soportes",
      });
    }
    if (isSupport) {
      items.push({
        name: "Mikael's Blessing",
        itemId: 3222,
        reason: "Limpia CC y da RM, clave como soporte vs AP/CC",
      });
    }
  }

  if (analysis.isAdHeavy) {
    items.push({
      name: "Plated Steelcaps",
      itemId: 3047,
      reason: "Armadura + reducción de autos vs comp AD heavy",
    });
    if (isAD) {
      items.push({
        name: "Death's Dance",
        itemId: 6333,
        reason: "Armadura + AD + daño diferido, perfecto para bruisers/assassins AD",
      });
      items.push({
        name: "Guardian Angel",
        itemId: 3026,
        reason: "Resurrección + armadura + AD",
      });
    }
    if (isAP) {
      items.push({
        name: "Zhonya's Hourglass",
        itemId: 3157,
        reason: "Armadura + AP + stasis, clave para mages vs assassins AD",
      });
    }
    if (isTank || isSupport) {
      items.push({
        name: "Frozen Heart",
        itemId: 3110,
        reason: "Reduce velocidad de ataque enemiga, clave vs ADCs",
      });
      items.push({
        name: "Randuin's Omen",
        itemId: 3143,
        reason: "Reduce daño crítico, ideal vs ADCs crit",
      });
    }
  }

  if (analysis.isMixed && items.length === 0) {
    if (isAD) {
      items.push({
        name: "Guardian Angel",
        itemId: 3026,
        reason: "Resurrección + armadura + AD, bueno en comps mixtas",
      });
      items.push({
        name: "Maw of Malmortius",
        itemId: 3156,
        reason: "Escudo mágico + AD para campeones AD",
      });
    }
    if (isAP) {
      items.push({
        name: "Zhonya's Hourglass",
        itemId: 3157,
        reason: "Stasis + armadura + AP, siempre útil",
      });
      items.push({
        name: "Banshee's Veil",
        itemId: 3102,
        reason: "Escudo anti-habilidad + RM + AP",
      });
    }
    if (isTank || isSupport) {
      items.push({
        name: "Gargoyle Stoneplate",
        itemId: 3193,
        reason: "Armadura + RM + escudo, ideal vs daño mixto",
      });
    }
  }

  if (analysis.isTankHeavy) {
    if (isAD) {
      items.push({
        name: "Black Cleaver",
        itemId: 3071,
        reason: "Reduce armadura progresivamente, clave para AD vs tanques",
      });
      items.push({
        name: "Blade of the Ruined King",
        itemId: 3153,
        reason: "Daño % vida máxima, destruye tanques",
      });
    }
    if (isAP) {
      items.push({
        name: "Void Staff",
        itemId: 3135,
        reason: "Penetración mágica, necesario para mages vs tanques con RM",
      });
      items.push({
        name: "Liandry's Torment",
        itemId: 6653,
        reason: "Daño % vida + quemadura, ideal vs tanques como mage",
      });
    }
  }

  // Title and reasoning
  let title: string;
  let reasoning: string;
  const champLabel = championName;

  if (analysis.isApHeavy) {
    title = `${champLabel} vs comp AP heavy (${analysis.apCount} AP)`;
    reasoning = isAD
      ? `Como campeón AD, prioriza Maw of Malmortius o Wit's End. Mercury's Treads casi obligatorio.`
      : isAP
      ? `Como mage, Banshee's Veil es tu mejor opción defensiva. Mercury's si necesitas tenacidad.`
      : `Prioriza Spirit Visage y items de RM. Mercury's Treads obligatorio.`;
  } else if (analysis.isAdHeavy) {
    title = `${champLabel} vs comp AD heavy (${analysis.adCount} AD)`;
    reasoning = isAD
      ? `Como campeón AD, Death's Dance es tu mejor defensivo. Plated Steelcaps ayudan mucho.`
      : isAP
      ? `Como mage, Zhonya's Hourglass es imprescindible vs assassins y ADCs.`
      : `Frozen Heart y Randuin's son tus mejores opciones. Plated Steelcaps obligatorio.`;
  } else if (analysis.isTankHeavy) {
    title = `${champLabel} vs ${analysis.tankCount} tanques`;
    reasoning = isAD
      ? `Necesitas Black Cleaver o BOTRK para romper tanques con penetración y daño % vida.`
      : isAP
      ? `Void Staff es obligatorio. Liandry's Torment si peleas largas. No compres Shadowflame vs tanques.`
      : `Enfócate en peeling y CC. Deja el daño a tus carries.`;
  } else {
    title = `${champLabel} vs comp mixta`;
    reasoning = isAD
      ? `Comp balanceada. Adapta según quién esté fed: Maw vs AP fed, Death's Dance vs AD fed.`
      : isAP
      ? `Comp balanceada. Zhonya's siempre es seguro. Banshee's si hay engage AP peligroso.`
      : `Adapta tus defensivos según la mayor amenaza de la partida.`;
  }

  // ========== SAFETY FILTERS ==========
  // ABSOLUTE safety: never recommend AP carry items to AD/Tank champs and vice versa
  const apOnlyItems = new Set([3157, 3102, 3135, 6653]); // Zhonya, Banshee, Void Staff, Liandry
  const adOnlyItems = new Set([3156, 3091, 6333, 3026, 3071, 3153]); // Maw, Wit's, DD, GA, BC, BOTRK

  if (!isAP) {
    items = items.filter((i) => !apOnlyItems.has(i.itemId));
  }
  if (!isAD) {
    items = items.filter((i) => !adOnlyItems.has(i.itemId));
  }
  // Supports should not get carry items - only support/tank items
  if (isSupport) {
    const carryItems = new Set([...apOnlyItems, ...adOnlyItems]);
    items = items.filter((i) => !carryItems.has(i.itemId));
  }

  // If support has no items after filtering, add support-specific defaults
  if (isSupport && items.length === 0) {
    if (analysis.isAdHeavy) {
      items.push({ name: "Frozen Heart", itemId: 3110, reason: "Reduce velocidad de ataque enemiga, clave vs ADCs" });
      items.push({ name: "Plated Steelcaps", itemId: 3047, reason: "Armadura + reducción de autos vs comp AD" });
      items.push({ name: "Locket of the Iron Solari", itemId: 3190, reason: "Escudo para tu equipo, bueno vs burst AD" });
    } else if (analysis.isApHeavy) {
      items.push({ name: "Mikael's Blessing", itemId: 3222, reason: "Limpia CC + RM, clave vs comp AP" });
      items.push({ name: "Mercury's Treads", itemId: 3111, reason: "RM + tenacidad vs comp AP" });
      items.push({ name: "Spirit Visage", itemId: 3065, reason: "RM + curación aumentada" });
    } else {
      items.push({ name: "Locket of the Iron Solari", itemId: 3190, reason: "Escudo para tu equipo en peleas" });
      items.push({ name: "Knight's Vow", itemId: 3109, reason: "Protege a tu carry, redirige daño" });
    }
  }

  // If tank has no items after filtering, add tank-specific defaults
  if (isTank && !isSupport && items.length === 0) {
    if (analysis.isApHeavy) {
      items.push({ name: "Spirit Visage", itemId: 3065, reason: "RM + curación aumentada" });
      items.push({ name: "Mercury's Treads", itemId: 3111, reason: "RM + tenacidad vs comp AP" });
    } else if (analysis.isAdHeavy) {
      items.push({ name: "Frozen Heart", itemId: 3110, reason: "Reduce velocidad de ataque enemiga" });
      items.push({ name: "Randuin's Omen", itemId: 3143, reason: "Reduce daño crítico, ideal vs ADCs" });
    } else {
      items.push({ name: "Gargoyle Stoneplate", itemId: 3193, reason: "Armadura + RM + escudo vs comp mixta" });
      items.push({ name: "Spirit Visage", itemId: 3065, reason: "RM + curación aumentada" });
    }
  }

  // Update reasoning for supports
  if (isSupport) {
    if (analysis.isAdHeavy) {
      reasoning = `Como soporte, Frozen Heart reduce el DPS enemigo. Locket protege a tu equipo del burst.`;
    } else if (analysis.isApHeavy) {
      reasoning = `Como soporte, Mikael's es clave para limpiar CC. Mercury's Treads te dan tenacidad.`;
    } else {
      reasoning = `Como soporte, prioriza items de utilidad. Locket y Knight's Vow protegen a tus carries.`;
    }
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
