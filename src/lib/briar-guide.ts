// Scraped from: https://www.mobafire.com/league-of-legends/build/26-05-rank-1-briar-all-matchups-briar-jungle-all-builds-check-notes-629922
// Rank 1 Briar guide - All Matchups, All Builds

export interface BriarBuild {
  name: string;
  tag: string;
  items: { name: string; itemId: number }[];
  runes: {
    keystone: string;
    primaryTree: string;
    primary: string[];
    secondaryTree: string;
    secondary: string[];
    shards: string[];
  };
  summonerSpells: string;
}

export interface BriarMatchup {
  champion: string;
  threat: "extreme" | "major" | "minor" | "tiny";
  tips: string;
}

export const BRIAR_BUILDS: BriarBuild[] = [
  {
    name: "Tanky Bruiser",
    tag: "Recomendado",
    items: [
      { name: "Titanic Hydra", itemId: 3748 },
      { name: "Plated Steelcaps", itemId: 3047 },
      { name: "Black Cleaver", itemId: 3071 },
      { name: "Sundered Sky", itemId: 226631 },
      { name: "Spirit Visage", itemId: 3065 },
      { name: "Sterak's Gage", itemId: 3053 },
    ],
    runes: {
      keystone: "Press the Attack",
      primaryTree: "Precision",
      primary: ["Triumph", "Legend: Haste", "Coup de Grace"],
      secondaryTree: "Inspiration",
      secondary: ["Magical Footwear", "Cosmic Insight"],
      shards: ["Adaptive +9", "Adaptive +9", "HP +10-180"],
    },
    summonerSpells: "Flash + Smite",
  },
  {
    name: "BC + BOTRK",
    tag: "Segundo mejor",
    items: [
      { name: "Blade of the Ruined King", itemId: 3153 },
      { name: "Black Cleaver", itemId: 3071 },
      { name: "Plated Steelcaps", itemId: 3047 },
      { name: "Sundered Sky", itemId: 226631 },
      { name: "Sterak's Gage", itemId: 3053 },
      { name: "Spirit Visage", itemId: 3065 },
    ],
    runes: {
      keystone: "Press the Attack",
      primaryTree: "Precision",
      primary: ["Triumph", "Legend: Haste", "Coup de Grace"],
      secondaryTree: "Inspiration",
      secondary: ["Magical Footwear", "Cosmic Insight"],
      shards: ["Adaptive +9", "Adaptive +9", "HP +10-180"],
    },
    summonerSpells: "Flash + Smite",
  },
  {
    name: "Crit Hail of Blades",
    tag: "Snowball",
    items: [
      { name: "The Collector", itemId: 6676 },
      { name: "Infinity Edge", itemId: 3031 },
      { name: "Plated Steelcaps", itemId: 3047 },
      { name: "Immortal Shieldbow", itemId: 6673 },
      { name: "Lord Dominik's Regards", itemId: 3036 },
      { name: "Guardian Angel", itemId: 3026 },
    ],
    runes: {
      keystone: "Hail of Blades",
      primaryTree: "Domination",
      primary: ["Sudden Impact", "Sixth Sense", "Treasure Hunter"],
      secondaryTree: "Inspiration",
      secondary: ["Magical Footwear", "Cosmic Insight"],
      shards: ["Adaptive +9", "Adaptive +9", "HP +10-180"],
    },
    summonerSpells: "Flash + Smite",
  },
  {
    name: "Lethality Assassin",
    tag: "Burst",
    items: [
      { name: "Profane Hydra", itemId: 6698 },
      { name: "The Collector", itemId: 6676 },
      { name: "Edge of Night", itemId: 3814 },
      { name: "Plated Steelcaps", itemId: 3047 },
      { name: "Serylda's Grudge", itemId: 6694 },
      { name: "Guardian Angel", itemId: 3026 },
    ],
    runes: {
      keystone: "Hail of Blades",
      primaryTree: "Domination",
      primary: ["Sudden Impact", "Sixth Sense", "Treasure Hunter"],
      secondaryTree: "Inspiration",
      secondary: ["Magical Footwear", "Cosmic Insight"],
      shards: ["Adaptive +9", "Adaptive +9", "HP +10-180"],
    },
    summonerSpells: "Flash + Smite",
  },
  {
    name: "Lethal Tempo Crit",
    tag: "DPS",
    items: [
      { name: "Yun Tal Wildarrows", itemId: 226675 },
      { name: "Infinity Edge", itemId: 3031 },
      { name: "Immortal Shieldbow", itemId: 6673 },
      { name: "Mortal Reminder", itemId: 3033 },
      { name: "Plated Steelcaps", itemId: 3047 },
      { name: "Guardian Angel", itemId: 3026 },
    ],
    runes: {
      keystone: "Lethal Tempo",
      primaryTree: "Precision",
      primary: ["Triumph", "Legend: Alacrity", "Coup de Grace"],
      secondaryTree: "Inspiration",
      secondary: ["Magical Footwear", "Cosmic Insight"],
      shards: ["AS +10%", "Adaptive +9", "HP +10-180"],
    },
    summonerSpells: "Flash + Smite",
  },
];

export const BRIAR_MATCHUPS: BriarMatchup[] = [
  // EXTREME
  { champion: "Elise", threat: "extreme", tips: "Escóndete en arbustos o acércate lo suficiente para W1>Q instantáneo. Su cocoon te destruye si te atrapa." },
  { champion: "Taliyah", threat: "extreme", tips: "Posiciónate bien, carga E completo. Cuidado con su E como contra-juego a tu dash." },
  { champion: "Cassiopeia", threat: "extreme", tips: "Su W te impide usar W y Q (grounding). Evita peleas frontales, busca flancos con R." },
  { champion: "Braum", threat: "extreme", tips: "Su pasiva y escudo anulan tu engage. No pelees cuando tiene escudo activo." },
  { champion: "Neeko", threat: "extreme", tips: "Su R + CC chain te destruye. Usa E durante su engage para interrumpirla." },
  { champion: "Akali", threat: "extreme", tips: "Muy elusiva, su W (shroud) rompe tu targeting. Intenta usar R para revelarla." },
  { champion: "Lissandra", threat: "extreme", tips: "Su R y CC chain te anulan completamente. No hagas engage frontal." },
  { champion: "Fizz", threat: "extreme", tips: "Su E esquiva todo tu daño. Espera a que la use antes de hacer all-in." },
  { champion: "Qiyana", threat: "extreme", tips: "Mucho burst y CC. Usa E para frenar su engage." },
  { champion: "Poppy", threat: "extreme", tips: "Su W bloquea tu W y Q (son dashes). No pelees si tiene W activo." },
  { champion: "Nidalee", threat: "extreme", tips: "Te kitea y hace daño desde lejos. Necesitas cerrar distancia con R." },

  // MAJOR
  { champion: "Rengar", threat: "major", tips: "Peligroso en arbustos. Evita pelear cerca de arbustos. Usa E para interrumpir su salto." },
  { champion: "Gragas", threat: "major", tips: "Su R te aleja y su E interrumpe tu engage. Guarda E para cuando él engage." },
  { champion: "Ekko", threat: "major", tips: "Mucho daño de pasiva con 3 hechizos. Usa E durante su burst. Puedes cancelar su R con Q." },
  { champion: "Graves", threat: "major", tips: "Mucho daño early y resistente con True Grit. No pelees 1v1 temprano." },
  { champion: "Jax", threat: "major", tips: "Su E (Counter Strike) bloquea tus autos. Espera a que termine antes de hacer daño." },
  { champion: "Lee Sin", threat: "major", tips: "Siempre E su Q reactivación. Si te pega contra pared, es kill gratis para él." },
  { champion: "Nocturne", threat: "major", tips: "Usa W para saltar paredes y romper su E tether. Smite su W shield antes de E." },
  { champion: "Viego", threat: "major", tips: "Cuidado con su R reset. Usa E para frenar sus engages." },
  { champion: "Kha'Zix", threat: "major", tips: "Peligroso aislado. Pelea siempre cerca de minions o aliados." },
  { champion: "Kindred", threat: "major", tips: "Su R te niega kills. Guarda E para cuando use R y sacalos del círculo." },
  { champion: "Master Yi", threat: "major", tips: "Haz plays con el equipo. Usa Q inmediatamente cuando aterriza de su dash." },
  { champion: "Kayn", threat: "major", tips: "Peligroso cuando evoluciona. Early puedes ganarle. Trackea su forma." },
  { champion: "Diana", threat: "major", tips: "Sé creativo con E para frenar sus engages. W1 lateral para esquivar su Q." },
  { champion: "Morgana", threat: "major", tips: "Usa W1 para esquivar su Q. Tu Q se come su Black Shield pero estarás melee." },
  { champion: "Vayne", threat: "major", tips: "Te kitea con E (condemn). No pelees cerca de paredes." },
  { champion: "Fiora", threat: "major", tips: "Su W (riposte) bloquea tu stun. Finta tu E para que desperdicie W." },

  // MINOR
  { champion: "Warwick", threat: "minor", tips: "Puedes ganarle 1v1 temprano si usas E bien. Cuidado con su R suppress." },
  { champion: "Amumu", threat: "minor", tips: "Fácil de invadir early. Cuidado con su R en teamfights." },
  { champion: "Sejuani", threat: "minor", tips: "Gánale early antes de que escale. Tu movilidad te da ventaja." },
  { champion: "Rammus", threat: "minor", tips: "Siempre E su engage. Espera que termine W antes de W>Q. Black Cleaver obligatorio." },
  { champion: "Yone", threat: "minor", tips: "W1>Q, hazle daño con tu compañero. Su E back te favorece porque tu Q lo pega melee." },
  { champion: "Twitch", threat: "minor", tips: "Big chomp. Su Q stealth puede romper tu frenzy. Esquiva su W con tu W. R landing = kill gratis." },
  { champion: "Lux", threat: "minor", tips: "Usa W1 para esquivar su Q binding. Revisa tu HP antes de R porque puede combo mid-flight." },
  { champion: "Quinn", threat: "minor", tips: "Chomp fácil si le llegas. W1 para cerrar distancia." },
  { champion: "Ezreal", threat: "minor", tips: "Puede kitear con E sobre paredes pero generalmente lo revientas con tu combo." },
  { champion: "Jinx", threat: "minor", tips: "Esquiva sus trampas E y es kill fácil. R para cerrar distancia." },
  { champion: "Ashe", threat: "minor", tips: "Cuidado con su R stun. Después de esquivarlo, es kill gratis." },
];

export const BRIAR_TIPS = {
  general: [
    "Combo principal: W1 > Q > auto > W2 para trade corto",
    "Para robar objetivos: W1 sobre pared > Q al dragón/barón > W2 + Smite",
    "Usa E para interrumpir dashes enemigos y empujarlos contra paredes",
    "R da true sight - úsalo para revelar campeones invisibles (Twitch, Akali, etc.)",
    "En teamfights, busca flancos creativos. No entres de frente contra CC",
  ],
  earlyGame: [
    "Tu ganking es superior a la mayoría de junglers pre-6",
    "Prioriza lanes con CC para ganks exitosos",
    "Invade junglers débiles early (Amumu, Sejuani, Karthus)",
  ],
  jungleItem: {
    gustwalker: "Mejor opción cuando el jungla enemigo no te invade. Más tempo y movilidad para ganks.",
    mosstomper: "Úsalo contra junglers agresivos que te invaden (Lee Sin, Rek'Sai, Elise). El escudo te salva en 1v1.",
  },
  boots: {
    steelcaps: "Contra comps AD heavy o ADCs fed. Reduce daño de autoataques.",
    mercs: "Contra mucho AP o CC (Morgana Q, Ekko stun, etc.). La tenacidad es clave.",
  },
};

export function getBriarMatchup(enemyChampion: string): BriarMatchup | null {
  return BRIAR_MATCHUPS.find(
    (m) => m.champion.toLowerCase() === enemyChampion.toLowerCase()
  ) || null;
}

export function getBriarBuildForComp(enemyChampions: string[]): BriarBuild {
  // Default to Tanky Bruiser (most versatile)
  // If enemy is squishy (lots of ADCs/mages), consider crit/lethality
  let squishyCount = 0;
  let tankCount = 0;
  enemyChampions.forEach((name) => {
    const lower = name.toLowerCase();
    if (["malphite", "ornn", "sion", "chogath", "drmundo", "rammus", "sejuani", "amumu", "leona", "nautilus", "braum", "taric", "alistar", "rell"].includes(lower)) {
      tankCount++;
    } else {
      squishyCount++;
    }
  });

  if (tankCount >= 2) return BRIAR_BUILDS[1]; // BC + BOTRK for tank shred
  if (squishyCount >= 4) return BRIAR_BUILDS[2]; // Crit for squishy burst
  return BRIAR_BUILDS[0]; // Tanky Bruiser default
}
