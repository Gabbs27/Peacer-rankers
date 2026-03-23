// Rune recommendation engine based on champion type and enemy composition

export interface RuneRecommendation {
  keystone: string;
  primaryTree: string;
  primaryRunes: string[];
  secondaryTree: string;
  secondaryRunes: string[];
  shards: string[];
  reasoning: string;
}

// Champion archetype classification for rune selection
type ChampionArchetype =
  | "ad_fighter"
  | "ad_assassin"
  | "ap_burst"
  | "ap_scaling"
  | "adc"
  | "tank"
  | "enchanter";

const CHAMPION_ARCHETYPES: Record<string, ChampionArchetype> = {
  // AD fighters/bruisers
  Aatrox: "ad_fighter", Briar: "ad_fighter", Camille: "ad_fighter",
  Darius: "ad_fighter", Fiora: "ad_fighter", Gangplank: "ad_fighter",
  Garen: "ad_fighter", Hecarim: "ad_fighter", Illaoi: "ad_fighter",
  Irelia: "ad_fighter", JarvanIV: "ad_fighter", Jax: "ad_fighter",
  Jayce: "ad_fighter", Kled: "ad_fighter", Mordekaiser: "ad_fighter",
  Nasus: "ad_fighter", Olaf: "ad_fighter", Pantheon: "ad_fighter",
  Renekton: "ad_fighter", Riven: "ad_fighter", Sett: "ad_fighter",
  Trundle: "ad_fighter", Tryndamere: "ad_fighter", Udyr: "ad_fighter",
  Urgot: "ad_fighter", Vi: "ad_fighter", Volibear: "ad_fighter",
  Warwick: "ad_fighter", Wukong: "ad_fighter", XinZhao: "ad_fighter",
  Yasuo: "ad_fighter", Yone: "ad_fighter", Yorick: "ad_fighter",
  Ambessa: "ad_fighter", Gwen: "ad_fighter", Viego: "ad_fighter",
  Belveth: "ad_fighter", LeeSin: "ad_fighter", RekSai: "ad_fighter",

  // AD assassins
  Zed: "ad_assassin", Talon: "ad_assassin", Qiyana: "ad_assassin",
  Khazix: "ad_assassin", Rengar: "ad_assassin", Nocturne: "ad_assassin",
  Kayn: "ad_assassin", Pyke: "ad_assassin", Naafiri: "ad_assassin",
  Shaco: "ad_assassin", MasterYi: "ad_assassin",

  // AP burst mages
  Syndra: "ap_burst", Lux: "ap_burst", Annie: "ap_burst",
  Brand: "ap_burst", Veigar: "ap_burst", Xerath: "ap_burst",
  Velkoz: "ap_burst", Ziggs: "ap_burst", Neeko: "ap_burst",
  Zoe: "ap_burst", Hwei: "ap_burst", Leblanc: "ap_burst",
  Ahri: "ap_burst", Fizz: "ap_burst", Ekko: "ap_burst",
  Evelynn: "ap_burst", Katarina: "ap_burst", Kassadin: "ap_burst",
  Diana: "ap_burst", Akali: "ap_burst", Vex: "ap_burst",
  Elise: "ap_burst", Nidalee: "ap_burst",

  // AP scaling mages
  Viktor: "ap_scaling", Azir: "ap_scaling", Cassiopeia: "ap_scaling",
  Orianna: "ap_scaling", AurelionSol: "ap_scaling", Ryze: "ap_scaling",
  Anivia: "ap_scaling", Karthus: "ap_scaling", Malzahar: "ap_scaling",
  Swain: "ap_scaling", TwistedFate: "ap_scaling", Vladimir: "ap_scaling",
  Taliyah: "ap_scaling", Rumble: "ap_scaling", Lillia: "ap_scaling",
  Heimerdinger: "ap_scaling", Teemo: "ap_scaling", Singed: "ap_scaling",
  Gragas: "ap_scaling", Kennen: "ap_scaling", Sylas: "ap_scaling",
  Smolder: "ap_scaling", Fiddlesticks: "ap_scaling",

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

  // Enchanters/supports
  Bard: "enchanter", Ivern: "enchanter", Janna: "enchanter",
  Karma: "enchanter", Lulu: "enchanter", Morgana: "enchanter",
  Nami: "enchanter", Rakan: "enchanter", Renata: "enchanter",
  Seraphine: "enchanter", Sona: "enchanter", Soraka: "enchanter",
  Yuumi: "enchanter", Zilean: "enchanter", Milio: "enchanter",
  Zyra: "enchanter",
};

function getArchetype(championName: string): ChampionArchetype {
  return CHAMPION_ARCHETYPES[championName] || "ad_fighter";
}

// Damage type mapping for enemy comp analysis (reusing logic from builds.ts)
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

interface EnemyCompSummary {
  apCount: number;
  adCount: number;
  tankCount: number;
  isApHeavy: boolean;
  isAdHeavy: boolean;
  isTankHeavy: boolean;
  isSquishy: boolean;
}

function analyzeEnemyComp(enemyChampions: string[]): EnemyCompSummary {
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
    isSquishy: tankCount === 0 && enemyChampions.length >= 3,
  };
}

export function getRuneRecommendation(
  championName: string,
  _position: string,
  enemyChampions: string[]
): RuneRecommendation {
  const archetype = getArchetype(championName);
  const comp = analyzeEnemyComp(enemyChampions);

  let keystone: string;
  let primaryTree: string;
  let primaryRunes: string[];
  let secondaryTree: string;
  let secondaryRunes: string[];
  let shards: string[];
  let reasoning: string;

  switch (archetype) {
    case "ad_fighter": {
      // vs tanks: Conqueror for sustained fights; vs squishy: Press the Attack for burst
      if (comp.isTankHeavy) {
        keystone = "Conqueror";
        reasoning = "Conqueror es ideal vs tanques: stackeas rápido en peleas largas y te curas con el daño extra.";
      } else if (comp.isSquishy) {
        keystone = "Press the Attack";
        reasoning = "Press the Attack te da burst rápido vs una comp squishy sin tanques.";
      } else {
        keystone = "Conqueror";
        reasoning = "Conqueror es la runa estándar para fighters/bruisers: te da AD adaptativo y sustain.";
      }
      primaryTree = "Precision";
      primaryRunes = ["Triumph", "Legend: Haste", "Last Stand"];
      secondaryTree = "Resolve";
      secondaryRunes = ["Bone Plating", "Unflinching"];
      shards = ["Adaptive Force", "Adaptive Force", "HP"];
      break;
    }

    case "ad_assassin": {
      if (comp.isTankHeavy) {
        keystone = "Conqueror";
        primaryTree = "Precision";
        primaryRunes = ["Triumph", "Legend: Haste", "Coup de Grace"];
        reasoning = "Conqueror vs tanques te da más daño sostenido que Electrocute.";
      } else {
        keystone = comp.isSquishy ? "Electrocute" : "First Strike";
        primaryTree = comp.isSquishy ? "Domination" : "Inspiration";
        primaryRunes = comp.isSquishy
          ? ["Sudden Impact", "Eyeball Collection", "Treasure Hunter"]
          : ["Magical Footwear", "Future's Market", "Cosmic Insight"];
        reasoning = comp.isSquishy
          ? "Electrocute maximiza tu burst vs una comp squishy. Un combo = un kill."
          : "First Strike te da oro extra y más daño en tu all-in inicial.";
      }
      secondaryTree = keystone === "Conqueror" ? "Domination" : "Precision";
      secondaryRunes = keystone === "Conqueror"
        ? ["Sudden Impact", "Treasure Hunter"]
        : ["Triumph", "Coup de Grace"];
      shards = ["Adaptive Force", "Adaptive Force", "HP"];
      break;
    }

    case "ap_burst": {
      if (comp.isSquishy) {
        keystone = "Electrocute";
        reasoning = "Electrocute te da el máximo burst vs campeones squishy. Combo completo = kill.";
      } else if (comp.isTankHeavy) {
        keystone = "Arcane Comet";
        reasoning = "Arcane Comet te da poke constante vs tanques que no puedes one-shottear.";
      } else {
        keystone = "Electrocute";
        reasoning = "Electrocute es la runa estándar para mages de burst: maximiza tu daño en combos cortos.";
      }
      primaryTree = "Domination";
      primaryRunes = keystone === "Arcane Comet"
        ? ["Manaflow Band", "Transcendence", "Scorch"]
        : ["Sudden Impact", "Eyeball Collection", "Treasure Hunter"];
      if (keystone === "Arcane Comet") primaryTree = "Sorcery";
      secondaryTree = keystone === "Arcane Comet" ? "Domination" : "Sorcery";
      secondaryRunes = keystone === "Arcane Comet"
        ? ["Cheap Shot", "Treasure Hunter"]
        : ["Manaflow Band", "Transcendence"];
      shards = ["Adaptive Force", "Adaptive Force", comp.isAdHeavy ? "Armor" : "HP"];
      break;
    }

    case "ap_scaling": {
      if (comp.isTankHeavy) {
        keystone = "Conqueror";
        primaryTree = "Precision";
        primaryRunes = ["Presence of Mind", "Legend: Haste", "Coup de Grace"];
        reasoning = "Conqueror te da AP adaptativo en peleas largas vs tanques. Mejor que Phase Rush aquí.";
      } else {
        keystone = "Phase Rush";
        primaryTree = "Sorcery";
        primaryRunes = ["Manaflow Band", "Transcendence", "Gathering Storm"];
        reasoning = "Phase Rush te da movilidad para kitar y reposicionarte en teamfights. Escala bien.";
      }
      secondaryTree = keystone === "Conqueror" ? "Sorcery" : "Inspiration";
      secondaryRunes = keystone === "Conqueror"
        ? ["Manaflow Band", "Transcendence"]
        : ["Magical Footwear", "Cosmic Insight"];
      shards = ["Adaptive Force", "Adaptive Force", comp.isAdHeavy ? "Armor" : "HP"];
      break;
    }

    case "adc": {
      if (comp.isTankHeavy) {
        keystone = "Lethal Tempo";
        reasoning = "Lethal Tempo te da DPS sostenido para destruir tanques en peleas largas.";
      } else if (comp.isSquishy) {
        keystone = "Press the Attack";
        reasoning = "Press the Attack te da burst rápido. 3 autos y tu equipo destruye al target.";
      } else {
        keystone = "Lethal Tempo";
        reasoning = "Lethal Tempo es la runa estándar para ADCs: máximo DPS en peleas de equipo.";
      }
      primaryTree = "Precision";
      primaryRunes = ["Triumph", "Legend: Bloodline", "Coup de Grace"];
      secondaryTree = "Domination";
      secondaryRunes = ["Taste of Blood", "Treasure Hunter"];
      shards = ["Attack Speed", "Adaptive Force", comp.isApHeavy ? "Magic Resist" : "HP"];
      break;
    }

    case "tank": {
      const hasHeavyCC = true; // Tanks generally have CC
      if (hasHeavyCC && comp.isSquishy) {
        keystone = "Aftershock";
        reasoning = "Aftershock te da resistencias al meter CC, perfecto para engagear vs squishies.";
      } else {
        keystone = "Grasp of the Undying";
        reasoning = "Grasp te da sustain y HP extra en lane, ideal para tanques en peleas cortas.";
      }
      primaryTree = "Resolve";
      primaryRunes = ["Demolish", "Conditioning", "Overgrowth"];
      secondaryTree = "Inspiration";
      secondaryRunes = ["Magical Footwear", "Cosmic Insight"];
      shards = [
        comp.isApHeavy ? "Magic Resist" : "Armor",
        comp.isApHeavy ? "Magic Resist" : "Armor",
        "HP",
      ];
      break;
    }

    case "enchanter": {
      if (comp.isAdHeavy) {
        keystone = "Guardian";
        reasoning = "Guardian protege a tu carry del burst AD. El escudo escala con tu AP.";
      } else {
        keystone = "Aery";
        reasoning = "Aery mejora tus escudos y curación, y también pokea en lane.";
      }
      primaryTree = keystone === "Guardian" ? "Resolve" : "Sorcery";
      primaryRunes = keystone === "Guardian"
        ? ["Font of Life", "Bone Plating", "Revitalize"]
        : ["Manaflow Band", "Transcendence", "Scorch"];
      secondaryTree = keystone === "Guardian" ? "Sorcery" : "Resolve";
      secondaryRunes = keystone === "Guardian"
        ? ["Manaflow Band", "Transcendence"]
        : ["Font of Life", "Revitalize"];
      shards = ["Adaptive Force", "Adaptive Force", comp.isAdHeavy ? "Armor" : "HP"];
      break;
    }

    default: {
      keystone = "Conqueror";
      primaryTree = "Precision";
      primaryRunes = ["Triumph", "Legend: Haste", "Last Stand"];
      secondaryTree = "Resolve";
      secondaryRunes = ["Bone Plating", "Unflinching"];
      shards = ["Adaptive Force", "Adaptive Force", "HP"];
      reasoning = "Conqueror es una runa versátil para la mayoría de campeones.";
    }
  }

  // Adjust shards based on enemy comp
  if (comp.isApHeavy && !shards.includes("Magic Resist")) {
    shards[2] = "Magic Resist";
  }
  if (comp.isAdHeavy && !shards.includes("Armor")) {
    shards[2] = "Armor";
  }

  return {
    keystone,
    primaryTree,
    primaryRunes,
    secondaryTree,
    secondaryRunes,
    shards,
    reasoning,
  };
}
