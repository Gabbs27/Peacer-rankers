import type { Region } from "@/lib/types";

// The client reports either a platform id ("LA1") or a short region code
// ("LAN") depending on the endpoint; both map to the web app's region ids.
const PLATFORMS: Record<string, Region> = {
  NA1: "na1",
  EUW1: "euw1",
  EUN1: "eun1",
  KR: "kr",
  BR1: "br1",
  LA1: "la1",
  LA2: "la2",
  OC1: "oc1",
  TR1: "tr1",
  RU: "ru",
  JP1: "jp1",
  PH2: "ph2",
  SG2: "sg2",
  TH2: "th2",
  TW2: "tw2",
  VN2: "vn2",
};

const REGION_CODES: Record<string, Region> = {
  NA: "na1",
  EUW: "euw1",
  EUNE: "eun1",
  KR: "kr",
  BR: "br1",
  LAN: "la1",
  LAS: "la2",
  OCE: "oc1",
  TR: "tr1",
  RU: "ru",
  JP: "jp1",
  PH: "ph2",
  SG: "sg2",
  TH: "th2",
  TW: "tw2",
  VN: "vn2",
};

export function regionFromClient(value: unknown): Region | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toUpperCase();
  return PLATFORMS[key] ?? REGION_CODES[key] ?? null;
}
