// Canonical champion metadata — the SINGLE source of truth for champion name
// normalization and damage-type classification. Previously this data was copy-pasted
// across builds.ts, build-paths.ts, runes.ts and planner/page.tsx and had already
// diverged (e.g. Naafiri was "AD" in one file and "AP" in two others). Import from here.
//
// NOTE: this is still hand-maintained and goes stale each patch. The proper long-term
// fix is to generate damage types from Data Dragon `championFull.json` tags at build time.

export type DamageType = "AP" | "AD" | "TANK" | "HYBRID";

// Maps the various forms a champion name can arrive in (Riot display names with
// punctuation/spaces, and Data Dragon ids) to the key used in the maps below.
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
  Kaisa: "KaiSa", // Data Dragon id for Kai'Sa is "Kaisa" (lowercase s) — without this
  // alias the planner's DDragon-id input never matched the "KaiSa" map key, so Kai'Sa
  // (an ADC) silently fell through to the bruiser default (fixes M3).
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
  Ksante: "KSante",
};

export function normalizeChampionName(name: string): string {
  if (NAME_ALIASES[name]) return NAME_ALIASES[name];
  // Strip spaces, apostrophes and dots for lookup.
  return name.replace(/[\s'.]/g, "");
}

export const CHAMPION_DAMAGE: Record<string, DamageType> = {
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
  Sylas: "AP", Smolder: "AP", Naafiri: "AD", Milio: "AP", Renata: "AP",
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

// Damage type from the static map (normalized). Defaults to "AD" for unknown champions.
export function getChampionDamageType(championName: string): DamageType {
  return CHAMPION_DAMAGE[normalizeChampionName(championName)] || "AD";
}
