// Build path recommendation engine based on champion type and enemy composition

export interface BuildPath {
  starter: { name: string; itemId: number }[];
  boots: { name: string; itemId: number; reason: string };
  core: { name: string; itemId: number; reason: string }[];
  situational: { name: string; itemId: number; reason: string }[];
  reasoning: string;
}

// Champion archetype for build selection
type BuildArchetype =
  | "ad_bruiser"
  | "ad_assassin"
  | "ap_mage"
  | "adc"
  | "tank"
  | "support";

const BUILD_ARCHETYPES: Record<string, BuildArchetype> = {
  // AD bruisers/fighters
  Aatrox: "ad_bruiser", Briar: "ad_bruiser", Camille: "ad_bruiser",
  Darius: "ad_bruiser", Fiora: "ad_bruiser", Gangplank: "ad_bruiser",
  Garen: "ad_bruiser", Hecarim: "ad_bruiser", Illaoi: "ad_bruiser",
  Irelia: "ad_bruiser", JarvanIV: "ad_bruiser", Jax: "ad_bruiser",
  Jayce: "ad_bruiser", Kled: "ad_bruiser", Mordekaiser: "ad_bruiser",
  Nasus: "ad_bruiser", Olaf: "ad_bruiser", Pantheon: "ad_bruiser",
  Renekton: "ad_bruiser", Riven: "ad_bruiser", Sett: "ad_bruiser",
  Trundle: "ad_bruiser", Tryndamere: "ad_bruiser", Udyr: "ad_bruiser",
  Urgot: "ad_bruiser", Vi: "ad_bruiser", Volibear: "ad_bruiser",
  Warwick: "ad_bruiser", Wukong: "ad_bruiser", XinZhao: "ad_bruiser",
  Yasuo: "ad_bruiser", Yone: "ad_bruiser", Yorick: "ad_bruiser",
  Ambessa: "ad_bruiser", Gwen: "ad_bruiser", Viego: "ad_bruiser",
  Belveth: "ad_bruiser", LeeSin: "ad_bruiser", RekSai: "ad_bruiser",

  // AD assassins
  Zed: "ad_assassin", Talon: "ad_assassin", Qiyana: "ad_assassin",
  Khazix: "ad_assassin", Rengar: "ad_assassin", Nocturne: "ad_assassin",
  Kayn: "ad_assassin", Pyke: "ad_assassin", Naafiri: "ad_assassin",
  Shaco: "ad_assassin", MasterYi: "ad_assassin",

  // AP mages (burst + scaling)
  Syndra: "ap_mage", Lux: "ap_mage", Annie: "ap_mage", Brand: "ap_mage",
  Veigar: "ap_mage", Xerath: "ap_mage", Velkoz: "ap_mage", Ziggs: "ap_mage",
  Neeko: "ap_mage", Zoe: "ap_mage", Hwei: "ap_mage", Leblanc: "ap_mage",
  Ahri: "ap_mage", Fizz: "ap_mage", Ekko: "ap_mage", Evelynn: "ap_mage",
  Katarina: "ap_mage", Kassadin: "ap_mage", Diana: "ap_mage", Akali: "ap_mage",
  Vex: "ap_mage", Elise: "ap_mage", Nidalee: "ap_mage", Viktor: "ap_mage",
  Azir: "ap_mage", Cassiopeia: "ap_mage", Orianna: "ap_mage",
  AurelionSol: "ap_mage", Ryze: "ap_mage", Anivia: "ap_mage",
  Karthus: "ap_mage", Malzahar: "ap_mage", Swain: "ap_mage",
  TwistedFate: "ap_mage", Vladimir: "ap_mage", Taliyah: "ap_mage",
  Rumble: "ap_mage", Lillia: "ap_mage", Heimerdinger: "ap_mage",
  Teemo: "ap_mage", Singed: "ap_mage", Gragas: "ap_mage",
  Kennen: "ap_mage", Sylas: "ap_mage", Smolder: "ap_mage",
  Fiddlesticks: "ap_mage", Zyra: "ap_mage",

  // ADCs
  Aphelios: "adc", Ashe: "adc", Caitlyn: "adc", Corki: "adc",
  Draven: "adc", Ezreal: "adc", Jhin: "adc", Jinx: "adc",
  KaiSa: "adc", Kalista: "adc", Kindred: "adc", KogMaw: "adc",
  Lucian: "adc", MissFortune: "adc", Quinn: "adc", Samira: "adc",
  Senna: "adc", Sivir: "adc", Tristana: "adc", Twitch: "adc",
  Varus: "adc", Vayne: "adc", Xayah: "adc", Zeri: "adc",
  Nilah: "adc",

  // Tanks
  Alistar: "tank", Amumu: "tank", Blitzcrank: "tank", Braum: "tank",
  Chogath: "tank", DrMundo: "tank", Galio: "tank", Leona: "tank",
  Malphite: "tank", Maokai: "tank", Nautilus: "tank", Nunu: "tank",
  Ornn: "tank", Poppy: "tank", Rammus: "tank", Sejuani: "tank",
  Shen: "tank", Sion: "tank", TahmKench: "tank", Taric: "tank",
  Thresh: "tank", Zac: "tank", KSante: "tank", Ksante: "tank",
  Rell: "tank",

  // Supports/enchanters
  Bard: "support", Ivern: "support", Janna: "support", Karma: "support",
  Lulu: "support", Morgana: "support", Nami: "support", Rakan: "support",
  Renata: "support", Seraphine: "support", Sona: "support", Soraka: "support",
  Yuumi: "support", Zilean: "support", Milio: "support",
};

function getArchetype(championName: string): BuildArchetype {
  return BUILD_ARCHETYPES[championName] || "ad_bruiser";
}

// Damage type for enemy comp analysis
type DamageType = "AP" | "AD" | "TANK" | "HYBRID";

const CHAMPION_DAMAGE: Record<string, DamageType> = {
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
  Sylas: "AP", Smolder: "AP", Naafiri: "AP", Milio: "AP", Renata: "AP",
  Gwen: "AP", Briar: "AD", Belveth: "AD", Nilah: "AD", Zeri: "AD",
  Viego: "AD", Yone: "HYBRID", Samira: "AD", Rell: "TANK",
  Aatrox: "AD", Camille: "AD", Darius: "AD", Draven: "AD", Fiora: "AD",
  Gangplank: "AD", Garen: "AD", Hecarim: "AD", Illaoi: "AD", Irelia: "AD",
  JarvanIV: "AD", Jax: "HYBRID", Jayce: "AD", Kayn: "AD", Khazix: "AD",
  Kled: "AD", LeeSin: "AD", MasterYi: "AD", Nocturne: "AD", Olaf: "AD",
  Pantheon: "AD", Pyke: "AD", Qiyana: "AD", RekSai: "AD", Renekton: "AD",
  Rengar: "AD", Riven: "AD", Sett: "AD", Talon: "AD", Tryndamere: "AD",
  Udyr: "AD", Urgot: "AD", Vi: "AD", Warwick: "AD", Wukong: "AD",
  XinZhao: "AD", Yasuo: "AD", Zed: "AD", Ambessa: "AD",
  Aphelios: "AD", Ashe: "AD", Caitlyn: "AD", Corki: "HYBRID", Ezreal: "HYBRID",
  Jhin: "AD", Jinx: "AD", KaiSa: "HYBRID", Kalista: "AD", Kindred: "AD",
  KogMaw: "HYBRID", Lucian: "AD", MissFortune: "AD", Quinn: "AD",
  Sivir: "AD", Tristana: "AD", Twitch: "AD", Varus: "HYBRID", Vayne: "AD",
  Xayah: "AD",
  Alistar: "TANK", Amumu: "TANK", Blitzcrank: "TANK", Braum: "TANK",
  Chogath: "AP", DrMundo: "TANK", Galio: "AP", Leona: "TANK",
  Malphite: "TANK", Maokai: "TANK", Nautilus: "TANK", Nunu: "AP",
  Ornn: "TANK", Poppy: "TANK", Rammus: "TANK", Sejuani: "TANK",
  Shen: "TANK", Singed: "AP", Sion: "TANK", TahmKench: "TANK",
  Taric: "TANK", Thresh: "TANK", Volibear: "HYBRID", Yorick: "AD",
  Zac: "AP", KSante: "TANK",
  Bard: "AP", Heimerdinger: "AP", Janna: "AP", Kayle: "HYBRID",
  Mordekaiser: "AP", Nasus: "AD", Rakan: "AP", Senna: "AD",
  Shyvana: "HYBRID", Trundle: "AD", Yuumi: "AP",
};

interface CompSummary {
  apCount: number;
  adCount: number;
  tankCount: number;
  isApHeavy: boolean;
  isAdHeavy: boolean;
  isTankHeavy: boolean;
}

function analyzeComp(enemyChampions: string[]): CompSummary {
  let apCount = 0;
  let adCount = 0;
  let tankCount = 0;

  enemyChampions.forEach((name) => {
    const type = CHAMPION_DAMAGE[name] || "AD";
    switch (type) {
      case "AP": apCount++; break;
      case "AD": adCount++; break;
      case "TANK": tankCount++; break;
      case "HYBRID": apCount++; break;
    }
  });

  return {
    apCount,
    adCount,
    tankCount,
    isApHeavy: apCount >= 3,
    isAdHeavy: adCount >= 3,
    isTankHeavy: tankCount >= 2,
  };
}

function getDefensiveBoots(comp: CompSummary): { name: string; itemId: number; reason: string } {
  if (comp.isApHeavy) {
    return { name: "Mercury's Treads", itemId: 3111, reason: "RM + tenacidad vs comp AP heavy" };
  }
  if (comp.isAdHeavy) {
    return { name: "Plated Steelcaps", itemId: 3047, reason: "Armadura + reducción de autos vs comp AD" };
  }
  return { name: "Mercury's Treads", itemId: 3111, reason: "Tenacidad es siempre útil en comp mixta" };
}

function getDefensiveSituational(comp: CompSummary, archetype: BuildArchetype): { name: string; itemId: number; reason: string }[] {
  const items: { name: string; itemId: number; reason: string }[] = [];

  if (archetype === "ad_bruiser" || archetype === "ad_assassin") {
    if (comp.isApHeavy) {
      items.push({ name: "Maw of Malmortius", itemId: 3156, reason: "Escudo mágico + AD vs burst AP" });
      items.push({ name: "Wit's End", itemId: 3091, reason: "RM + velocidad de ataque vs AP" });
    } else if (comp.isAdHeavy) {
      items.push({ name: "Death's Dance", itemId: 6333, reason: "Armadura + daño diferido vs AD" });
      items.push({ name: "Guardian Angel", itemId: 3026, reason: "Resurrección + armadura" });
    } else {
      items.push({ name: "Maw of Malmortius", itemId: 3156, reason: "Escudo mágico si hay amenaza AP" });
      items.push({ name: "Death's Dance", itemId: 6333, reason: "Armadura + sustain vs AD" });
    }
    if (comp.isTankHeavy) {
      items.push({ name: "Black Cleaver", itemId: 3071, reason: "Reduce armadura vs tanques" });
    }
  }

  if (archetype === "ap_mage") {
    if (comp.isAdHeavy) {
      items.push({ name: "Zhonya's Hourglass", itemId: 3157, reason: "Stasis + armadura vs assassins AD" });
    } else if (comp.isApHeavy) {
      items.push({ name: "Banshee's Veil", itemId: 3102, reason: "Escudo anti-habilidad + RM" });
    } else {
      items.push({ name: "Zhonya's Hourglass", itemId: 3157, reason: "Stasis siempre útil" });
    }
    if (comp.isTankHeavy) {
      items.push({ name: "Void Staff", itemId: 3135, reason: "Penetración mágica vs tanques con RM" });
    }
  }

  if (archetype === "adc") {
    if (comp.isApHeavy) {
      items.push({ name: "Maw of Malmortius", itemId: 3156, reason: "Escudo mágico para sobrevivir burst AP" });
    } else if (comp.isAdHeavy) {
      items.push({ name: "Guardian Angel", itemId: 3026, reason: "Resurrección vs assassins AD" });
    } else {
      items.push({ name: "Guardian Angel", itemId: 3026, reason: "Seguro de vida en teamfights" });
    }
    if (comp.isTankHeavy) {
      items.push({ name: "Lord Dominik's Regards", itemId: 3036, reason: "Penetración de armadura vs tanques" });
    }
  }

  if (archetype === "tank") {
    if (comp.isApHeavy) {
      items.push({ name: "Spirit Visage", itemId: 3065, reason: "RM + curación aumentada" });
      items.push({ name: "Force of Nature", itemId: 4401, reason: "RM + movimiento vs AP sostenido" });
    } else if (comp.isAdHeavy) {
      items.push({ name: "Frozen Heart", itemId: 3110, reason: "Reduce velocidad de ataque enemiga" });
      items.push({ name: "Randuin's Omen", itemId: 3143, reason: "Reduce daño crítico de ADCs" });
    } else {
      items.push({ name: "Spirit Visage", itemId: 3065, reason: "RM + curación aumentada" });
      items.push({ name: "Randuin's Omen", itemId: 3143, reason: "Armadura + anti-crit" });
    }
  }

  if (archetype === "support") {
    if (comp.isApHeavy) {
      items.push({ name: "Mikael's Blessing", itemId: 3222, reason: "Limpia CC + RM" });
    } else if (comp.isAdHeavy) {
      items.push({ name: "Frozen Heart", itemId: 3110, reason: "Reduce velocidad de ataque enemiga" });
    }
    items.push({ name: "Redemption", itemId: 3107, reason: "Curación de área en teamfights" });
  }

  return items;
}

export function getBuildPath(
  championName: string,
  position: string,
  enemyChampions: string[]
): BuildPath {
  const archetype = getArchetype(championName);
  const comp = analyzeComp(enemyChampions);
  const isJungle = position === "JG" || position === "JUNGLE";

  let starter: { name: string; itemId: number }[];
  let boots: { name: string; itemId: number; reason: string };
  let core: { name: string; itemId: number; reason: string }[];
  let reasoning: string;

  switch (archetype) {
    case "ad_bruiser": {
      starter = isJungle
        ? [{ name: "Gustwalker Hatchling", itemId: 1102 }]
        : [{ name: "Doran's Blade", itemId: 1055 }, { name: "Health Potion", itemId: 2003 }];
      boots = getDefensiveBoots(comp);
      core = [
        { name: "Trinity Force", itemId: 3078, reason: "Stats mixtas + Spellblade para burst en trades" },
        { name: "Titanic Hydra", itemId: 3748, reason: "Waveclear + daño escalado con HP" },
        { name: "Sterak's Gage", itemId: 3053, reason: "Escudo + HP, ideal para peleas de equipo" },
      ];
      reasoning = comp.isTankHeavy
        ? `Build de bruiser con penetración para romper a los ${comp.tankCount} tanques enemigos.`
        : comp.isApHeavy
        ? `Build estándar de bruiser con defensivos de RM vs ${comp.apCount} campeones AP.`
        : `Build estándar de bruiser: Trinity Force da buen burst en trades y Titanic escala con HP.`;
      break;
    }

    case "ad_assassin": {
      starter = isJungle
        ? [{ name: "Gustwalker Hatchling", itemId: 1102 }]
        : [{ name: "Long Sword", itemId: 1036 }, { name: "Refillable Potion", itemId: 2031 }];
      boots = { name: "Ionian Boots of Lucidity", itemId: 3158, reason: "CDR para más rotaciones y kills" };
      core = [
        { name: "Youmuu's Ghostblade", itemId: 3142, reason: "Lethality + movimiento para roams" },
        { name: "Hubris", itemId: 223042, reason: "AD + lethality que crece con kills" },
        { name: "Serylda's Grudge", itemId: 6694, reason: "Penetración de armadura + slow" },
      ];
      reasoning = comp.isTankHeavy
        ? `Build de lethality con Serylda's para penetrar a los tanques. Busca flanquear a los carries.`
        : `Build estándar de assassin: lethality para one-shottear carries enemigos.`;
      break;
    }

    case "ap_mage": {
      starter = isJungle
        ? [{ name: "Scorchclaw Pup", itemId: 1101 }]
        : [{ name: "Doran's Ring", itemId: 1056 }, { name: "Health Potion x2", itemId: 2003 }];
      boots = comp.isAdHeavy
        ? { name: "Plated Steelcaps", itemId: 3047, reason: "Armadura vs comp AD heavy" }
        : comp.isApHeavy
        ? { name: "Mercury's Treads", itemId: 3111, reason: "RM + tenacidad vs AP" }
        : { name: "Sorcerer's Shoes", itemId: 3020, reason: "Penetración mágica para más daño" };
      core = [
        { name: "Luden's Companion", itemId: 4005, reason: "Burst + mana + penetración mágica" },
        { name: "Shadowflame", itemId: 4645, reason: "AP + penetración mágica flat" },
        { name: "Rabadon's Deathcap", itemId: 3089, reason: "Multiplicador de AP, power spike enorme" },
      ];
      if (comp.isTankHeavy) {
        core[0] = { name: "Liandry's Torment", itemId: 6653, reason: "Daño % vida + quemadura vs tanques" };
      }
      reasoning = comp.isTankHeavy
        ? `Build con Liandry's para quemar a los ${comp.tankCount} tanques. Void Staff situacional.`
        : `Build estándar de mage: Luden's para burst, Shadowflame para penetración, Deathcap para escalar.`;
      break;
    }

    case "adc": {
      starter = [{ name: "Doran's Blade", itemId: 1055 }, { name: "Health Potion", itemId: 2003 }];
      boots = { name: "Berserker's Greaves", itemId: 3006, reason: "Velocidad de ataque para DPS" };
      core = [
        { name: "Infinity Edge", itemId: 3031, reason: "Daño crítico amplificado, core de todo ADC" },
        { name: "Collector", itemId: 6676, reason: "Lethality + ejecución para rematar kills" },
        { name: "Phantom Dancer", itemId: 3046, reason: "Crit + velocidad de ataque + movimiento" },
      ];
      if (comp.isTankHeavy) {
        core[1] = { name: "Lord Dominik's Regards", itemId: 3036, reason: "Penetración de armadura vs tanques" };
      }
      reasoning = comp.isTankHeavy
        ? `Build con Lord Dominik's para penetrar la armadura de los ${comp.tankCount} tanques.`
        : `Build estándar de ADC: IE como spike principal, luego crit para DPS máximo.`;
      break;
    }

    case "tank": {
      starter = isJungle
        ? [{ name: "Mosstomper Seedling", itemId: 1103 }]
        : [{ name: "Doran's Shield", itemId: 1054 }, { name: "Health Potion", itemId: 2003 }];
      boots = getDefensiveBoots(comp);
      if (comp.isApHeavy) {
        core = [
          { name: "Hollow Radiance", itemId: 2503, reason: "Daño de área + RM para waveclear" },
          { name: "Spirit Visage", itemId: 3065, reason: "RM + curación aumentada vs AP" },
          { name: "Force of Nature", itemId: 4401, reason: "RM + movimiento vs AP sostenido" },
        ];
      } else {
        core = [
          { name: "Sunfire Aegis", itemId: 3068, reason: "Daño de área + tanqueza para peleas" },
          { name: "Thornmail", itemId: 3075, reason: "Armadura + Grievous Wounds vs sustain" },
          { name: "Randuin's Omen", itemId: 3143, reason: "Armadura + reducción de críticos" },
        ];
      }
      reasoning = comp.isApHeavy
        ? `Build full RM para aguantar a los ${comp.apCount} campeones AP enemigos.`
        : comp.isAdHeavy
        ? `Build de armadura para resistir a los ${comp.adCount} campeones AD.`
        : `Build de tanque balanceada con resistencias mixtas.`;
      break;
    }

    case "support": {
      starter = [{ name: "World Atlas", itemId: 3870 }, { name: "Health Potion x2", itemId: 2003 }];
      boots = comp.isAdHeavy
        ? { name: "Plated Steelcaps", itemId: 3047, reason: "Armadura vs comp AD" }
        : comp.isApHeavy
        ? { name: "Mercury's Treads", itemId: 3111, reason: "RM + tenacidad vs AP" }
        : { name: "Ionian Boots of Lucidity", itemId: 3158, reason: "CDR para más habilidades de soporte" };
      core = [
        { name: "Moonstone Renewer", itemId: 6617, reason: "Curación encadenada en teamfights" },
        { name: "Staff of Flowing Water", itemId: 6616, reason: "AP + velocidad para tu carry" },
        { name: "Ardent Censer", itemId: 3504, reason: "Velocidad de ataque para tu ADC" },
      ];
      reasoning = `Build de soporte enchanter: maximiza la curación y buffos para tus carries.`;
      break;
    }

    default: {
      starter = [{ name: "Doran's Blade", itemId: 1055 }, { name: "Health Potion", itemId: 2003 }];
      boots = getDefensiveBoots(comp);
      core = [
        { name: "Trinity Force", itemId: 3078, reason: "Stats mixtas versátiles" },
        { name: "Sterak's Gage", itemId: 3053, reason: "Escudo + HP" },
        { name: "Death's Dance", itemId: 6333, reason: "Sustain + armadura" },
      ];
      reasoning = "Build genérica de bruiser AD.";
    }
  }

  const situational = getDefensiveSituational(comp, archetype);

  return {
    starter,
    boots,
    core,
    situational,
    reasoning,
  };
}
