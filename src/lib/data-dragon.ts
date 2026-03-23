const DDRAGON_VERSION = "16.6.1";
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

export function getChampionIconUrl(championName: string): string {
  return `${DDRAGON_BASE}/img/champion/${championName}.png`;
}

export function getItemIconUrl(itemId: number): string {
  if (itemId === 0) return "";
  return `${DDRAGON_BASE}/img/item/${itemId}.png`;
}

export function getProfileIconUrl(iconId: number): string {
  return `${DDRAGON_BASE}/img/profileicon/${iconId}.png`;
}

export function getSummonerSpellIconUrl(spellId: number): string {
  const spellMap: Record<number, string> = {
    1: "SummonerBoost",
    3: "SummonerExhaust",
    4: "SummonerFlash",
    6: "SummonerHaste",
    7: "SummonerHeal",
    11: "SummonerSmite",
    12: "SummonerTeleport",
    13: "SummonerMana",
    14: "SummonerDot",
    21: "SummonerBarrier",
    32: "SummonerSnowball",
  };
  const name = spellMap[spellId] || "SummonerFlash";
  return `${DDRAGON_BASE}/img/spell/${name}.png`;
}

export function getQueueName(queueId: number): string {
  const queueMap: Record<number, string> = {
    420: "Ranked Solo/Duo",
    440: "Ranked Flex",
    400: "Normal Draft",
    430: "Normal Blind",
    450: "ARAM",
    900: "URF",
    1020: "One for All",
    1300: "Nexus Blitz",
    1400: "Ultimate Spellbook",
    1700: "Arena",
    1900: "URF",
  };
  return queueMap[queueId] || "Custom";
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function getKDA(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return "Perfect";
  return ((kills + assists) / deaths).toFixed(2);
}

export function getMapName(mapId: number): string {
  const mapNames: Record<number, string> = {
    11: "Grieta del Invocador",
    12: "ARAM",
    21: "Nexus Blitz",
    22: "TFT",
    30: "Arena",
  };
  return mapNames[mapId] || "Otro";
}

export function getMapImageUrl(mapId: number): string {
  return `${DDRAGON_BASE}/img/map/map${mapId}.png`;
}

// Mobafire guide search URL for a champion
export function getMobafireSearchUrl(championName: string): string {
  const slug = championName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `https://www.mobafire.com/league-of-legends/champion/${slug}`;
}

// u.gg champion build URL
export function getUGGChampionUrl(championName: string): string {
  const normalized = championName.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/'/g, "")
    .replace(/\./g, "");
  return `https://u.gg/lol/champions/${normalized}/build`;
}

export { DDRAGON_VERSION };
