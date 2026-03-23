# LoL Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a League of Legends match tracker web app with profile stats, match history, automated tips, and Mobafire builds (phase 2).

**Architecture:** Next.js 14+ App Router with API routes as proxy to Riot Games API. TailwindCSS for styling. Data Dragon for static assets (champion/item images). No database — all data fetched in real-time.

**Tech Stack:** Next.js 14+, TypeScript, TailwindCSS, Riot Games API (MATCH-V5, SUMMONER-V4, LEAGUE-V4, ACCOUNT-V1), Data Dragon v16.6.1

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/gabriel/Desktop/lol-tracker
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. If it asks to overwrite existing files, say yes.

**Step 2: Create `.env.local`**

Create file `.env.local`:
```
RIOT_API_KEY=RGAPI-557d9764-9772-4608-8864-7c662dfbb0a3
```

**Step 3: Verify `.gitignore` includes `.env.local`**

Check that `.gitignore` contains `.env.local`. Next.js includes this by default.

**Step 4: Run dev server to verify**

Run: `npm run dev`
Expected: App running at http://localhost:3000

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript and TailwindCSS"
```

---

## Task 2: TypeScript Types for Riot API

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Create types file**

Create `src/lib/types.ts`:
```typescript
// Riot Account API response
export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

// Summoner API response
export interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

// League entry (ranked data)
export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  queueType: string; // "RANKED_SOLO_5x5" | "RANKED_FLEX_SR"
  tier: string; // "IRON" | "BRONZE" | ... | "CHALLENGER"
  rank: string; // "I" | "II" | "III" | "IV"
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

// Match participant
export interface MatchParticipant {
  puuid: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championName: string;
  championId: number;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamId: number; // 100 = blue, 200 = red
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number; // trinket
  summoner1Id: number;
  summoner2Id: number;
  individualPosition: string; // "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY"
  role: string;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHeal: number;
  killingSprees: number;
  largestKillingSpree: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  firstBloodKill: boolean;
  turretKills: number;
  dragonKills: number;
  baronKills: number;
  perks: ParticipantPerks;
}

export interface ParticipantPerks {
  statPerks: {
    defense: number;
    flex: number;
    offense: number;
  };
  styles: PerkStyle[];
}

export interface PerkStyle {
  description: string; // "primaryStyle" | "subStyle"
  style: number; // rune tree ID
  selections: PerkSelection[];
}

export interface PerkSelection {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
}

// Match team data
export interface MatchTeam {
  teamId: number;
  win: boolean;
  bans: { championId: number; pickTurn: number }[];
  objectives: {
    baron: { first: boolean; kills: number };
    champion: { first: boolean; kills: number };
    dragon: { first: boolean; kills: number };
    inhibitor: { first: boolean; kills: number };
    riftHerald: { first: boolean; kills: number };
    tower: { first: boolean; kills: number };
  };
}

// Full match info
export interface MatchInfo {
  gameCreation: number;
  gameDuration: number; // seconds
  gameId: number;
  gameMode: string;
  gameType: string;
  gameVersion: string;
  mapId: number;
  queueId: number;
  participants: MatchParticipant[];
  teams: MatchTeam[];
}

// Match metadata
export interface MatchMetadata {
  matchId: string;
  participants: string[]; // puuids
}

// Full match response
export interface MatchData {
  metadata: MatchMetadata;
  info: MatchInfo;
}

// Regions
export type Region = "na1" | "euw1" | "eun1" | "kr" | "br1" | "la1" | "la2" | "oc1" | "tr1" | "ru" | "jp1" | "ph2" | "sg2" | "th2" | "tw2" | "vn2";

export type RegionalRoute = "americas" | "europe" | "asia" | "sea";

export const REGION_TO_ROUTE: Record<Region, RegionalRoute> = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  kr: "asia",
  jp1: "asia",
  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

export const REGION_LABELS: Record<Region, string> = {
  na1: "NA",
  euw1: "EUW",
  eun1: "EUNE",
  kr: "KR",
  br1: "BR",
  la1: "LAN",
  la2: "LAS",
  oc1: "OCE",
  tr1: "TR",
  ru: "RU",
  jp1: "JP",
  ph2: "PH",
  sg2: "SG",
  th2: "TH",
  tw2: "TW",
  vn2: "VN",
};

// Automated tips
export interface Tip {
  category: "cs" | "vision" | "kda" | "killParticipation" | "damage";
  level: "good" | "ok" | "bad";
  message: string;
  value: number;
}

// Summoner profile (aggregated)
export interface SummonerProfile {
  account: RiotAccount;
  summoner: Summoner;
  ranked: LeagueEntry[];
  recentMatches: MatchData[];
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for Riot API responses"
```

---

## Task 3: Riot API Client

**Files:**
- Create: `src/lib/riot-api.ts`

**Step 1: Create the API client**

Create `src/lib/riot-api.ts`:
```typescript
import {
  RiotAccount,
  Summoner,
  LeagueEntry,
  MatchData,
  Region,
  RegionalRoute,
  REGION_TO_ROUTE,
} from "./types";

const API_KEY = process.env.RIOT_API_KEY!;

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchRiot<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(url, {
    headers: { "X-Riot-Token": API_KEY },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Riot API error ${res.status}: ${res.statusText} - ${errorBody}`
    );
  }

  const data = await res.json();
  cache.set(url, { data, expires: Date.now() + CACHE_TTL });
  return data as T;
}

function regionalUrl(route: RegionalRoute): string {
  return `https://${route}.api.riotgames.com`;
}

function platformUrl(region: Region): string {
  return `https://${region}.api.riotgames.com`;
}

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  region: Region
): Promise<RiotAccount> {
  const route = REGION_TO_ROUTE[region];
  return fetchRiot<RiotAccount>(
    `${regionalUrl(route)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
}

export async function getSummonerByPuuid(
  puuid: string,
  region: Region
): Promise<Summoner> {
  return fetchRiot<Summoner>(
    `${platformUrl(region)}/lol/summoner/v4/summoners/by-puuid/${puuid}`
  );
}

export async function getLeagueEntries(
  summonerId: string,
  region: Region
): Promise<LeagueEntry[]> {
  return fetchRiot<LeagueEntry[]>(
    `${platformUrl(region)}/lol/league/v4/entries/by-summoner/${summonerId}`
  );
}

export async function getMatchIds(
  puuid: string,
  region: Region,
  count: number = 20
): Promise<string[]> {
  const route = REGION_TO_ROUTE[region];
  return fetchRiot<string[]>(
    `${regionalUrl(route)}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`
  );
}

export async function getMatch(
  matchId: string,
  region: Region
): Promise<MatchData> {
  const route = REGION_TO_ROUTE[region];
  return fetchRiot<MatchData>(
    `${regionalUrl(route)}/lol/match/v5/matches/${matchId}`
  );
}

// Fetch multiple matches, respecting rate limits
export async function getMatches(
  matchIds: string[],
  region: Region
): Promise<MatchData[]> {
  const results: MatchData[] = [];
  // Fetch 5 at a time to stay under rate limits
  for (let i = 0; i < matchIds.length; i += 5) {
    const batch = matchIds.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((id) => getMatch(id, region))
    );
    results.push(...batchResults);
    // Small delay between batches to respect rate limits
    if (i + 5 < matchIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
  return results;
}
```

**Step 2: Commit**

```bash
git add src/lib/riot-api.ts
git commit -m "feat: add Riot API client with caching and rate limiting"
```

---

## Task 4: Data Dragon Helpers

**Files:**
- Create: `src/lib/data-dragon.ts`

**Step 1: Create Data Dragon helper**

Create `src/lib/data-dragon.ts`:
```typescript
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
    1: "SummonerBoost",      // Cleanse
    3: "SummonerExhaust",
    4: "SummonerFlash",
    6: "SummonerHaste",      // Ghost
    7: "SummonerHeal",
    11: "SummonerSmite",
    12: "SummonerTeleport",
    13: "SummonerMana",      // Clarity
    14: "SummonerDot",       // Ignite
    21: "SummonerBarrier",
    32: "SummonerSnowball",  // Mark (ARAM)
  };
  const name = spellMap[spellId] || "SummonerFlash";
  return `${DDRAGON_BASE}/img/spell/${name}.png`;
}

// Queue ID to human-readable name
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

export { DDRAGON_VERSION };
```

**Step 2: Commit**

```bash
git add src/lib/data-dragon.ts
git commit -m "feat: add Data Dragon helpers for icons and game data formatting"
```

---

## Task 5: Automated Tips Engine

**Files:**
- Create: `src/lib/tips.ts`

**Step 1: Create tips engine**

Create `src/lib/tips.ts`:
```typescript
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
    const expectedShare = 20; // 5 players = 20% each

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

  return tips;
}
```

**Step 2: Commit**

```bash
git add src/lib/tips.ts
git commit -m "feat: add automated tips engine with role-aware feedback"
```

---

## Task 6: API Routes (Backend Proxy)

**Files:**
- Create: `src/app/api/summoner/route.ts`
- Create: `src/app/api/matches/route.ts`
- Create: `src/app/api/match/[id]/route.ts`

**Step 1: Create summoner API route**

Create `src/app/api/summoner/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
} from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameName = searchParams.get("gameName");
  const tagLine = searchParams.get("tagLine");
  const region = searchParams.get("region") as Region;

  if (!gameName || !tagLine || !region) {
    return NextResponse.json(
      { error: "gameName, tagLine, and region are required" },
      { status: 400 }
    );
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region);
    const summoner = await getSummonerByPuuid(account.puuid, region);
    const ranked = await getLeagueEntries(summoner.id, region);

    return NextResponse.json({ account, summoner, ranked });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("404") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

**Step 2: Create matches API route**

Create `src/app/api/matches/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getMatchIds, getMatches } from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") as Region;
  const count = parseInt(searchParams.get("count") || "10");

  if (!puuid || !region) {
    return NextResponse.json(
      { error: "puuid and region are required" },
      { status: 400 }
    );
  }

  try {
    const matchIds = await getMatchIds(puuid, region, count);
    const matches = await getMatches(matchIds, region);
    return NextResponse.json({ matches });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Create single match API route**

Create `src/app/api/match/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getMatch } from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const region = request.nextUrl.searchParams.get("region") as Region;

  if (!region) {
    return NextResponse.json(
      { error: "region is required" },
      { status: 400 }
    );
  }

  try {
    const match = await getMatch(id, region);
    return NextResponse.json(match);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add API routes for summoner, matches, and match detail"
```

---

## Task 7: Home Page — Search UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/components/SearchBar.tsx`

**Step 1: Create SearchBar component**

Create `src/components/SearchBar.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Region, REGION_LABELS } from "@/lib/types";

const regions = Object.entries(REGION_LABELS) as [Region, string][];

export default function SearchBar() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState<Region>("la1");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameName.trim() || !tagLine.trim()) return;
    router.push(
      `/summoner/${region}/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value as Region)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
      >
        {regions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nombre (ej: xicebriel)"
        value={gameName}
        onChange={(e) => setGameName(e.target.value)}
        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
      />
      <input
        type="text"
        placeholder="Tag (ej: LAN)"
        value={tagLine}
        onChange={(e) => setTagLine(e.target.value)}
        className="w-32 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        Buscar
      </button>
    </form>
  );
}
```

**Step 2: Update layout**

Replace contents of `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LoL Tracker",
  description: "Track your League of Legends matches and get feedback",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-4">
          <a href="/" className="text-xl font-bold text-blue-400 hover:text-blue-300">
            LoL Tracker
          </a>
        </nav>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

**Step 3: Update home page**

Replace contents of `src/app/page.tsx`:
```tsx
import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-blue-400">LoL</span> Tracker
        </h1>
        <p className="text-gray-400 text-lg">
          Busca tu perfil, revisa tus partidas y mejora tu juego
        </p>
      </div>
      <SearchBar />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add home page with summoner search bar"
```

---

## Task 8: Summoner Profile Page

**Files:**
- Create: `src/app/summoner/[region]/[riotId]/page.tsx`
- Create: `src/components/PlayerStats.tsx`
- Create: `src/components/MatchCard.tsx`
- Create: `src/components/TipsBadge.tsx`
- Create: `src/components/ChampionIcon.tsx`
- Create: `src/components/ItemIcon.tsx`

**Step 1: Create ChampionIcon component**

Create `src/components/ChampionIcon.tsx`:
```tsx
import { getChampionIconUrl } from "@/lib/data-dragon";

interface Props {
  championName: string;
  size?: number;
  className?: string;
}

export default function ChampionIcon({
  championName,
  size = 48,
  className = "",
}: Props) {
  return (
    <img
      src={getChampionIconUrl(championName)}
      alt={championName}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
```

**Step 2: Create ItemIcon component**

Create `src/components/ItemIcon.tsx`:
```tsx
import { getItemIconUrl } from "@/lib/data-dragon";

interface Props {
  itemId: number;
  size?: number;
}

export default function ItemIcon({ itemId, size = 32 }: Props) {
  if (itemId === 0) {
    return (
      <div
        className="bg-gray-700 rounded"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={getItemIconUrl(itemId)}
      alt={`Item ${itemId}`}
      width={size}
      height={size}
      className="rounded"
    />
  );
}
```

**Step 3: Create TipsBadge component**

Create `src/components/TipsBadge.tsx`:
```tsx
import { Tip } from "@/lib/types";

interface Props {
  tip: Tip;
}

const levelColors = {
  good: "bg-green-900/50 text-green-300 border-green-700",
  ok: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  bad: "bg-red-900/50 text-red-300 border-red-700",
};

const levelIcons = {
  good: "^",
  ok: "~",
  bad: "v",
};

export default function TipsBadge({ tip }: Props) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border text-sm ${levelColors[tip.level]}`}
    >
      <span className="font-mono mr-2">{levelIcons[tip.level]}</span>
      {tip.message}
    </div>
  );
}
```

**Step 4: Create PlayerStats component**

Create `src/components/PlayerStats.tsx`:
```tsx
import { LeagueEntry } from "@/lib/types";

interface Props {
  ranked: LeagueEntry[];
  summonerLevel: number;
  profileIconId: number;
  gameName: string;
  tagLine: string;
}

const tierColors: Record<string, string> = {
  IRON: "text-gray-400",
  BRONZE: "text-amber-700",
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-400",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-yellow-300",
};

export default function PlayerStats({
  ranked,
  summonerLevel,
  profileIconId,
  gameName,
  tagLine,
}: Props) {
  const soloQ = ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const flex = ranked.find((r) => r.queueType === "RANKED_FLEX_SR");

  function renderRank(entry: LeagueEntry | undefined, label: string) {
    if (!entry) {
      return (
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-gray-500">Unranked</p>
        </div>
      );
    }

    const winrate = ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(
      1
    );

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p className={`text-2xl font-bold ${tierColors[entry.tier] || "text-white"}`}>
          {entry.tier} {entry.rank}
        </p>
        <p className="text-gray-300">{entry.leaguePoints} LP</p>
        <p className="text-sm text-gray-400">
          {entry.wins}W {entry.losses}L ({winrate}%)
        </p>
        {entry.hotStreak && (
          <p className="text-sm text-orange-400 mt-1">Racha de victorias!</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="flex items-center gap-4">
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/16.6.1/img/profileicon/${profileIconId}.png`}
          alt="Profile Icon"
          width={80}
          height={80}
          className="rounded-full border-2 border-gray-600"
        />
        <div>
          <h1 className="text-3xl font-bold">
            {gameName}
            <span className="text-gray-400 text-xl">#{tagLine}</span>
          </h1>
          <p className="text-gray-400">Nivel {summonerLevel}</p>
        </div>
      </div>
      <div className="flex gap-4 flex-wrap">
        {renderRank(soloQ, "Solo/Duo")}
        {renderRank(flex, "Flex")}
      </div>
    </div>
  );
}
```

**Step 5: Create MatchCard component**

Create `src/components/MatchCard.tsx`:
```tsx
"use client";

import { useState } from "react";
import { MatchData, MatchParticipant } from "@/lib/types";
import { formatDuration, getKDA, getQueueName } from "@/lib/data-dragon";
import { generateTips } from "@/lib/tips";
import ChampionIcon from "./ChampionIcon";
import ItemIcon from "./ItemIcon";
import TipsBadge from "./TipsBadge";

interface Props {
  match: MatchData;
  puuid: string;
}

export default function MatchCard({ match, puuid }: Props) {
  const [expanded, setExpanded] = useState(false);
  const player = match.info.participants.find((p) => p.puuid === puuid);

  if (!player) return null;

  const tips = generateTips(player, match.info);
  const timeSince = getTimeSince(match.info.gameCreation);
  const items = [
    player.item0,
    player.item1,
    player.item2,
    player.item3,
    player.item4,
    player.item5,
  ];

  return (
    <div
      className={`rounded-lg border ${
        player.win
          ? "bg-blue-950/30 border-blue-800/50"
          : "bg-red-950/30 border-red-800/50"
      }`}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
      >
        {/* Win/Loss indicator */}
        <div
          className={`w-1 h-16 rounded-full ${
            player.win ? "bg-blue-500" : "bg-red-500"
          }`}
        />

        {/* Champion */}
        <div className="flex flex-col items-center gap-1">
          <ChampionIcon championName={player.championName} size={48} />
          <span className="text-xs text-gray-400">
            Lv{player.champLevel}
          </span>
        </div>

        {/* KDA */}
        <div className="min-w-[100px]">
          <p className="font-bold">
            {player.kills}/{player.deaths}/{player.assists}
          </p>
          <p className="text-sm text-gray-400">
            {getKDA(player.kills, player.deaths, player.assists)} KDA
          </p>
        </div>

        {/* CS */}
        <div className="min-w-[80px] hidden sm:block">
          <p className="text-sm">
            {player.totalMinionsKilled + player.neutralMinionsKilled} CS
          </p>
          <p className="text-xs text-gray-400">
            {(
              (player.totalMinionsKilled + player.neutralMinionsKilled) /
              (match.info.gameDuration / 60)
            ).toFixed(1)}{" "}
            /min
          </p>
        </div>

        {/* Items */}
        <div className="flex gap-1 hidden md:flex">
          {items.map((item, i) => (
            <ItemIcon key={i} itemId={item} size={28} />
          ))}
        </div>

        {/* Game info */}
        <div className="ml-auto text-right">
          <p
            className={`text-sm font-semibold ${
              player.win ? "text-blue-400" : "text-red-400"
            }`}
          >
            {player.win ? "Victoria" : "Derrota"}
          </p>
          <p className="text-xs text-gray-400">
            {getQueueName(match.info.queueId)}
          </p>
          <p className="text-xs text-gray-500">
            {formatDuration(match.info.gameDuration)} - {timeSince}
          </p>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-700 p-4">
          {/* Tips */}
          {tips.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">
                Feedback
              </h4>
              <div className="flex flex-wrap gap-2">
                {tips.map((tip, i) => (
                  <TipsBadge key={i} tip={tip} />
                ))}
              </div>
            </div>
          )}

          {/* All players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[100, 200].map((teamId) => (
              <div key={teamId}>
                <h4
                  className={`text-sm font-semibold mb-2 ${
                    teamId === 100 ? "text-blue-400" : "text-red-400"
                  }`}
                >
                  {teamId === 100 ? "Equipo Azul" : "Equipo Rojo"}
                </h4>
                <div className="space-y-1">
                  {match.info.participants
                    .filter((p) => p.teamId === teamId)
                    .map((p) => (
                      <div
                        key={p.puuid}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          p.puuid === puuid ? "bg-white/10" : ""
                        }`}
                      >
                        <ChampionIcon
                          championName={p.championName}
                          size={28}
                        />
                        <span className="flex-1 truncate">
                          {p.riotIdGameName || p.summonerName}
                        </span>
                        <span className="text-gray-400">
                          {p.kills}/{p.deaths}/{p.assists}
                        </span>
                        <span className="text-gray-500 text-xs w-16 text-right">
                          {p.totalDamageDealtToChampions.toLocaleString()} dmg
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  return `hace ${minutes}m`;
}
```

**Step 6: Create summoner profile page**

Create `src/app/summoner/[region]/[riotId]/page.tsx`:
```tsx
import { Region } from "@/lib/types";
import PlayerStats from "@/components/PlayerStats";
import MatchCard from "@/components/MatchCard";

interface PageProps {
  params: Promise<{ region: string; riotId: string }>;
}

async function fetchSummoner(gameName: string, tagLine: string, region: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/summoner?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}&region=${region}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch summoner: ${res.statusText}`);
  }
  return res.json();
}

async function fetchMatches(puuid: string, region: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/matches?puuid=${puuid}&region=${region}&count=10`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch matches: ${res.statusText}`);
  }
  return res.json();
}

export default async function SummonerPage({ params }: PageProps) {
  const { region, riotId } = await params;
  const [gameName, tagLine] = decodeURIComponent(riotId).split("-");

  if (!gameName || !tagLine) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Formato inválido</h1>
        <p className="text-gray-400 mt-2">Usa el formato: Nombre-Tag</p>
      </div>
    );
  }

  try {
    const { account, summoner, ranked } = await fetchSummoner(
      gameName,
      tagLine,
      region
    );
    const { matches } = await fetchMatches(account.puuid, region);

    return (
      <div className="space-y-8">
        <PlayerStats
          ranked={ranked}
          summonerLevel={summoner.summonerLevel}
          profileIconId={summoner.profileIconId}
          gameName={account.gameName}
          tagLine={account.tagLine}
        />

        <div>
          <h2 className="text-xl font-bold mb-4">Historial de Partidas</h2>
          <div className="space-y-3">
            {matches.map((match: import("@/lib/types").MatchData) => (
              <MatchCard
                key={match.metadata.matchId}
                match={match}
                puuid={account.puuid}
              />
            ))}
          </div>
          {matches.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No se encontraron partidas recientes
            </p>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Error</h1>
        <p className="text-gray-400 mt-2">
          {error instanceof Error
            ? error.message
            : "No se pudo cargar el perfil"}
        </p>
        <a
          href="/"
          className="text-blue-400 hover:underline mt-4 inline-block"
        >
          Volver al inicio
        </a>
      </div>
    );
  }
}
```

**Step 7: Commit**

```bash
git add src/
git commit -m "feat: add summoner profile page with match history and tips"
```

---

## Task 9: Loading State and Error Handling

**Files:**
- Create: `src/app/summoner/[region]/[riotId]/loading.tsx`
- Create: `src/app/summoner/[region]/[riotId]/error.tsx`

**Step 1: Create loading state**

Create `src/app/summoner/[region]/[riotId]/loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Cargando perfil...</p>
    </div>
  );
}
```

**Step 2: Create error boundary**

Create `src/app/summoner/[region]/[riotId]/error.tsx`:
```tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl text-red-400">Algo salió mal</h1>
      <p className="text-gray-400 mt-2">{error.message}</p>
      <div className="flex gap-4 justify-center mt-6">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/summoner/
git commit -m "feat: add loading and error states for summoner page"
```

---

## Task 10: Final Polish and Testing

**Step 1: Add next.config.ts image domains**

Modify `next.config.ts` to allow Data Dragon images:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
      },
    ],
  },
};

export default nextConfig;
```

**Step 2: Run dev server and test manually**

Run: `npm run dev`

Test flow:
1. Go to http://localhost:3000
2. Select region "LAN", enter "xicebriel" and "LAN" as tag
3. Should see profile with rank and match history
4. Click a match to expand and see tips

**Step 3: Run build to check for errors**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: add image config and polish for production build"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project setup | Next.js init, .env.local |
| 2 | TypeScript types | `src/lib/types.ts` |
| 3 | Riot API client | `src/lib/riot-api.ts` |
| 4 | Data Dragon helpers | `src/lib/data-dragon.ts` |
| 5 | Tips engine | `src/lib/tips.ts` |
| 6 | API routes | `src/app/api/` (3 routes) |
| 7 | Home page + search | `src/app/page.tsx`, `SearchBar.tsx` |
| 8 | Profile + match history | Summoner page + 5 components |
| 9 | Loading + error states | loading.tsx, error.tsx |
| 10 | Polish + testing | Config, build, manual test |
