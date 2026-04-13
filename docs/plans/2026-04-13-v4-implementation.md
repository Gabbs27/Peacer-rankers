# LoL Tracker V4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add paginated match history with filters, player comparator, live game spectator, and UI/UX improvements to the LoL Tracker app.

**Architecture:** Next.js App Router with API routes proxying Riot API. The summoner page needs a client wrapper for pagination state. New pages for `/compare`. New API route for spectator. UI polish across all components.

**Tech Stack:** Next.js 16, TypeScript, TailwindCSS v4, Riot Games API (MATCH-V5, SPECTATOR-V5, LEAGUE-V4), Data Dragon

---

## Task 1: UI/UX — Color Contrast & Typography

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Add focus ring utility and improve base styles**

In `src/app/globals.css`, after `@import "tailwindcss";` add:

```css
@layer base {
  .skip-link {
    @apply absolute -top-10 left-4 bg-blue-600 text-white px-4 py-2 rounded z-50 transition-all;
  }
  .skip-link:focus {
    @apply top-4;
  }
}

@layer utilities {
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800;
  }
}
```

**Step 2: Update layout background for better contrast**

In `src/app/layout.tsx`, change body class:
- `bg-gray-800` → `bg-gray-900`
- Keep `text-white`

**Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: improve base colors, add focus ring utility"
```

---

## Task 2: UI/UX — MatchCard Responsive & Contrast Fix

**Files:**
- Modify: `src/components/MatchCard.tsx`

**Step 1: Fix text-[10px] instances**

Search for all `text-[10px]` in MatchCard.tsx and replace with `text-xs`.

**Step 2: Add map + duration to collapsed card**

In the collapsed summary (the button), after the items row, add:

```tsx
<span className="text-xs text-gray-400 hidden sm:inline">
  {getQueueName(match.info.queueId)}
</span>
<span className="text-xs text-gray-400">
  {formatDuration(match.info.gameDuration)}
</span>
```

**Step 3: Add map image to expanded header**

At the top of the expanded section, add:

```tsx
<div className="flex items-center gap-3 mb-4 p-3 bg-gray-700/30 rounded-lg">
  <img
    src={getMapImageUrl(match.info.mapId)}
    alt={getMapName(match.info.mapId)}
    width={48}
    height={48}
    className="rounded"
  />
  <div>
    <p className="text-sm font-semibold text-gray-100">
      {getQueueName(match.info.queueId)}
    </p>
    <p className="text-xs text-gray-400">
      {getMapName(match.info.mapId)} · {formatDuration(match.info.gameDuration)} · {timeSince}
    </p>
  </div>
</div>
```

**Step 4: Add aria-expanded to toggle button**

Add `aria-expanded={expanded}` to the main MatchCard button element.

**Step 5: Increase touch target on expand button**

Ensure the button has `min-h-[56px]` for touch accessibility.

**Step 6: Commit**

```bash
git add src/components/MatchCard.tsx
git commit -m "style: improve MatchCard contrast, add map info, fix touch targets"
```

---

## Task 3: UI/UX — MatchOverview & Other Components Polish

**Files:**
- Modify: `src/components/MatchOverview.tsx`
- Modify: `src/components/PerformanceScore.tsx`
- Modify: `src/components/BuildRecommendation.tsx`
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/PlayerStats.tsx`

**Step 1: Fix text-[10px] in MatchOverview**

Replace all `text-[10px]` with `text-xs` in MatchOverview.tsx.

**Step 2: Add aria-expanded to toggle buttons**

In MatchOverview.tsx, add `aria-expanded={showChampions}` to the Stats por Campeón button and `aria-expanded={showFeedback}` to the feedback button.

**Step 3: Add labels to SearchBar inputs**

Add `aria-label="Nombre de invocador"` to gameName input, `aria-label="Tag"` to tagLine input, `aria-label="Región"` to select.

**Step 4: Add focus-ring class to all interactive elements**

Add `focus-ring` class to: SearchBar button, SearchBar select, MatchOverview toggle buttons, PerformanceScore toggle button.

**Step 5: Commit**

```bash
git add src/components/MatchOverview.tsx src/components/PerformanceScore.tsx src/components/BuildRecommendation.tsx src/components/SearchBar.tsx src/components/PlayerStats.tsx
git commit -m "style: polish components - a11y, contrast, focus rings"
```

---

## Task 4: Paginated History — API Changes

**Files:**
- Modify: `src/lib/riot-api.ts:76-84`
- Modify: `src/app/api/matches/route.ts`

**Step 1: Add start and queue params to getMatchIds**

```typescript
export async function getMatchIds(
  puuid: string,
  region: Region,
  count: number = 20,
  start: number = 0,
  queue?: number
): Promise<string[]> {
  const route = REGION_TO_ROUTE[region];
  let url = `${regionalUrl(route)}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}&start=${start}`;
  if (queue) url += `&queue=${queue}`;
  return fetchRiot<string[]>(url);
}
```

**Step 2: Update API route to pass start and queue**

In `src/app/api/matches/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") as Region;
  const count = parseInt(searchParams.get("count") || "10");
  const start = parseInt(searchParams.get("start") || "0");
  const queue = searchParams.get("queue") ? parseInt(searchParams.get("queue")!) : undefined;

  if (!puuid || !region) {
    return NextResponse.json(
      { error: "puuid and region are required" },
      { status: 400 }
    );
  }

  try {
    const matchIds = await getMatchIds(puuid, region, count, start, queue);
    const matches = await getMatches(matchIds, region);
    return NextResponse.json({ matches, hasMore: matchIds.length === count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/riot-api.ts src/app/api/matches/route.ts
git commit -m "feat: add pagination and queue filter to matches API"
```

---

## Task 5: Paginated History — Client Wrapper

**Files:**
- Create: `src/components/SummonerContent.tsx`
- Modify: `src/app/summoner/[region]/[riotId]/page.tsx`

**Step 1: Create client component for match history with state**

Create `src/components/SummonerContent.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { MatchData, LeagueEntry } from "@/lib/types";
import MatchOverview from "./MatchOverview";
import MatchCard from "./MatchCard";

interface Props {
  initialMatches: MatchData[];
  puuid: string;
  region: string;
  ranked: LeagueEntry[];
}

const QUEUE_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "Ranked Solo/Duo", value: "420" },
  { label: "Ranked Flex", value: "440" },
  { label: "Normal Draft", value: "400" },
  { label: "Normal Blind", value: "430" },
  { label: "ARAM", value: "450" },
];

export default function SummonerContent({ initialMatches, puuid, region, ranked }: Props) {
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMatches.length === 10);
  const [queueFilter, setQueueFilter] = useState("");
  const [champFilter, setChampFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<"" | "win" | "loss">("");

  const fetchMatches = useCallback(async (start: number, queue: string, replace: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ puuid, region, count: "10", start: String(start) });
      if (queue) params.set("queue", queue);
      const res = await fetch(`/api/matches?${params}`);
      const data = await res.json();
      if (data.matches) {
        setMatches((prev) => replace ? data.matches : [...prev, ...data.matches]);
        setHasMore(data.hasMore ?? data.matches.length === 10);
      }
    } catch (e) {
      console.error("Error fetching matches:", e);
    } finally {
      setLoading(false);
    }
  }, [puuid, region]);

  const handleQueueChange = (value: string) => {
    setQueueFilter(value);
    setChampFilter("");
    setResultFilter("");
    fetchMatches(0, value, true);
  };

  const handleLoadMore = () => {
    fetchMatches(matches.length, queueFilter, false);
  };

  // Client-side filters
  const filteredMatches = matches.filter((m) => {
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (!player) return false;
    if (champFilter && player.championName !== champFilter) return false;
    if (resultFilter === "win" && !player.win) return false;
    if (resultFilter === "loss" && player.win) return false;
    return true;
  });

  // Get unique champions from loaded matches
  const champions = [...new Set(
    matches.map((m) => m.info.participants.find((p) => p.puuid === puuid)?.championName).filter(Boolean)
  )] as string[];

  return (
    <>
      <MatchOverview matches={matches} puuid={puuid} />

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">Historial de Partidas</h2>

          {/* Queue filter */}
          <select
            value={queueFilter}
            onChange={(e) => handleQueueChange(e.target.value)}
            aria-label="Filtrar por cola"
            className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
          >
            {QUEUE_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>

          {/* Champion filter */}
          {champions.length > 1 && (
            <select
              value={champFilter}
              onChange={(e) => setChampFilter(e.target.value)}
              aria-label="Filtrar por campeón"
              className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
            >
              <option value="">Todos los campeones</option>
              {champions.sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Result filter */}
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as "" | "win" | "loss")}
            aria-label="Filtrar por resultado"
            className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
          >
            <option value="">Todas</option>
            <option value="win">Victorias</option>
            <option value="loss">Derrotas</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.metadata.matchId}
              match={match}
              puuid={puuid}
              ranked={ranked}
            />
          ))}
        </div>

        {filteredMatches.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            No se encontraron partidas con estos filtros
          </p>
        )}

        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full mt-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 focus-ring"
          >
            {loading ? "Cargando..." : "Cargar 10 partidas más"}
          </button>
        )}
      </div>
    </>
  );
}
```

**Step 2: Simplify summoner page to use client wrapper**

Update `src/app/summoner/[region]/[riotId]/page.tsx`:

```tsx
import { Region } from "@/lib/types";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
  getMatchIds,
  getMatches,
} from "@/lib/riot-api";
import PlayerStats from "@/components/PlayerStats";
import SummonerContent from "@/components/SummonerContent";

interface PageProps {
  params: Promise<{ region: string; riotId: string }>;
}

export default async function SummonerPage({ params }: PageProps) {
  const { region, riotId } = await params;
  const [gameName, tagLine] = decodeURIComponent(riotId).split("-");

  if (!gameName || !tagLine) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Formato inválido</h1>
        <p className="text-gray-300 mt-2">Usa el formato: Nombre-Tag</p>
      </div>
    );
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region as Region);
    const summoner = await getSummonerByPuuid(account.puuid, region as Region);
    const ranked = await getLeagueEntries(account.puuid, region as Region);
    const matchIds = await getMatchIds(account.puuid, region as Region, 10);
    const matches = await getMatches(matchIds, region as Region);

    return (
      <div className="space-y-8">
        <PlayerStats
          ranked={ranked}
          summonerLevel={summoner.summonerLevel}
          profileIconId={summoner.profileIconId}
          gameName={account.gameName}
          tagLine={account.tagLine}
        />
        <SummonerContent
          initialMatches={matches}
          puuid={account.puuid}
          region={region}
          ranked={ranked}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl text-red-400">Error</h1>
        <p className="text-gray-300 mt-2">
          {error instanceof Error ? error.message : "No se pudo cargar el perfil"}
        </p>
        <a href="/" className="text-blue-400 hover:underline mt-4 inline-block">
          Volver al inicio
        </a>
      </div>
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/components/SummonerContent.tsx src/app/summoner/\[region\]/\[riotId\]/page.tsx
git commit -m "feat: paginated match history with queue, champion, and result filters"
```

---

## Task 6: Live Game — API Route & Riot Client

**Files:**
- Modify: `src/lib/riot-api.ts`
- Modify: `src/lib/types.ts`
- Create: `src/app/api/live-game/route.ts`

**Step 1: Add spectator types to types.ts**

At the end of `src/lib/types.ts`, add:

```typescript
// Spectator V5 types
export interface CurrentGameParticipant {
  puuid: string;
  teamId: number;
  championId: number;
  spell1Id: number;
  spell2Id: number;
  perks: {
    perkIds: number[];
    perkStyle: number;
    perkSubStyle: number;
  };
}

export interface CurrentGameInfo {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  gameMode: string;
  gameQueueConfigId: number;
  participants: CurrentGameParticipant[];
}
```

**Step 2: Add getCurrentGame to riot-api.ts**

```typescript
export async function getCurrentGame(
  puuid: string,
  region: Region
): Promise<CurrentGameInfo | null> {
  try {
    return await fetchRiot<CurrentGameInfo>(
      `${platformUrl(region)}/lol/spectator/v5/active-games/by-summoner/${puuid}`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null; // Not in game
    }
    throw error;
  }
}
```

**Step 3: Create live-game API route**

Create `src/app/api/live-game/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getCurrentGame, getLeagueEntries, getSummonerByPuuid } from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") as Region;

  if (!puuid || !region) {
    return NextResponse.json({ error: "puuid and region required" }, { status: 400 });
  }

  try {
    const game = await getCurrentGame(puuid, region);
    if (!game) {
      return NextResponse.json({ inGame: false });
    }

    // Fetch ranks for all participants in batches
    const ranks: Record<string, { tier: string; rank: string; lp: number } | null> = {};
    const summoners: Record<string, { name: string; level: number }> = {};

    for (let i = 0; i < game.participants.length; i += 5) {
      const batch = game.participants.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (p) => {
          const [entries, summoner] = await Promise.all([
            getLeagueEntries(p.puuid, region),
            getSummonerByPuuid(p.puuid, region),
          ]);
          const soloQ = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
          ranks[p.puuid] = soloQ ? { tier: soloQ.tier, rank: soloQ.rank, lp: soloQ.leaguePoints } : null;
          summoners[p.puuid] = { name: summoner.puuid, level: summoner.summonerLevel };
        })
      );
      if (i + 5 < game.participants.length) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    return NextResponse.json({
      inGame: true,
      game,
      ranks,
      summoners,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("403")) {
      return NextResponse.json({ error: "Spectator API not available with current API key" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/riot-api.ts src/app/api/live-game/route.ts
git commit -m "feat: add live game spectator API route with rank fetching"
```

---

## Task 7: Live Game — UI Component

**Files:**
- Create: `src/components/LiveGame.tsx`
- Modify: `src/app/summoner/[region]/[riotId]/page.tsx`

**Step 1: Create LiveGame component**

Create `src/components/LiveGame.tsx` — a client component that polls `/api/live-game` every 30 seconds. Shows:
- Green pulsing banner when in game
- 5v5 grid with champion icons (use championId → Data Dragon mapping)
- Rank badge per player
- Summoner spells
- "Ver build sugerida" link to `/planner?enemies=champ1,champ2,...`

If not in game, render nothing. If API error (403), show small "Spectator no disponible" notice.

**Step 2: Add LiveGame to summoner page**

In `src/app/summoner/[region]/[riotId]/page.tsx`, after `<PlayerStats>` add:

```tsx
<LiveGame puuid={account.puuid} region={region} />
```

**Step 3: Commit**

```bash
git add src/components/LiveGame.tsx src/app/summoner/\[region\]/\[riotId\]/page.tsx
git commit -m "feat: add live game banner with team comps and ranks"
```

---

## Task 8: Comparador — Page & UI

**Files:**
- Create: `src/app/compare/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create compare page**

Create `src/app/compare/page.tsx` — client component with:
- Two summoner inputs (gameName + tag + region each)
- "Comparar" button
- Fetches both summoners and their matches via existing API routes
- Stats table side-by-side: Winrate, KDA, CS/min, Vision, Damage, Gold, Score
- Green highlight on the "winner" of each stat
- Head-to-head section: compare matchIds, find common games, show each player's stats

**Step 2: Add nav link**

In `src/app/layout.tsx`, after the Planner link add:

```tsx
<a href="/compare" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
  Comparar
</a>
```

**Step 3: Commit**

```bash
git add src/app/compare/page.tsx src/app/layout.tsx
git commit -m "feat: add player comparison page with head-to-head stats"
```

---

## Task 9: Final Build & Push

**Step 1: Run build**

```bash
cd /Users/gabriel/Desktop/lol-tracker
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Fix any build errors**

If TypeScript or build errors, fix them.

**Step 3: Commit any fixes and push**

```bash
git add -A
git commit -m "fix: resolve build errors for V4 features"
git push origin master
```
