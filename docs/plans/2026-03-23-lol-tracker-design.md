# LoL Tracker - Design Document

**Date:** 2026-03-23
**Status:** Approved

## Overview

Web app to track League of Legends match history, view player stats, get build recommendations by matchup, and receive automated feedback based on in-game performance.

**Target user:** xicebriel (LAN server), expandable to any summoner/region.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** TailwindCSS
- **APIs:**
  - Riot Games API (MATCH-V5, Summoner-V4, League-V4, Account-V1)
  - Riot Data Dragon (static assets: champion images, item icons, rune icons)
  - RapidAPI Mobafire (phase 2: community builds/guides)
- **Database:** None for MVP (all data fetched in real-time)
- **Deployment:** Local development initially

## API Architecture

### Riot API Routing (LAN)

| API | Base URL |
|-----|----------|
| Account V1 | `americas.api.riotgames.com` |
| Match V5 | `americas.api.riotgames.com` |
| Summoner V4 | `la1.api.riotgames.com` |
| League V4 | `la1.api.riotgames.com` |
| Data Dragon | `ddragon.leagueoflegends.com` (no key required) |

### Data Flow

1. `GET /riot/account/v1/accounts/by-riot-id/{name}/{tag}` → PUUID
2. `GET /lol/summoner/v4/summoners/by-puuid/{puuid}` → Summoner data
3. `GET /lol/league/v4/entries/by-summoner/{id}` → Rank, LP, winrate
4. `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?count=20` → Match ID list
5. `GET /lol/match/v5/matches/{matchId}` → Full match details

### Next.js API Routes (proxy)

All Riot API calls go through Next.js API routes to:
- Protect the API key (never exposed to client)
- Add caching headers
- Handle rate limiting (20 req/s dev key, 100 req/2min)

## Pages

### 1. Home / Search (`/`)
- Search bar: Riot ID input (e.g., "xicebriel#LAN")
- Region selector dropdown
- Recent searches (localStorage)

### 2. Profile (`/summoner/[region]/[name]-[tag]`)
- Rank badge + LP
- Win/loss record, winrate
- Top 5 most played champions with winrates
- Role distribution pie chart

### 3. Match History (embedded in profile page)
- List of last 20 matches
- Each row: champion icon, KDA, CS, result (W/L), duration, game mode
- Click to expand match details

### 4. Match Detail (`/match/[matchId]`)
- Full scoreboard (all 10 players)
- Items, runes, summoner spells for each player
- Gold/damage/vision graphs
- **Automated tips** for the searched player

### 5. Builds by Matchup (Phase 2) (`/builds/[champion]`)
- Top Mobafire guides for the champion
- Items, runes, skill order
- Filtered by matchup (enemy laner)

## Automated Tips System

Rule-based feedback using thresholds:

| Metric | Low | OK | Good |
|--------|-----|----|------|
| CS/min | < 6 | 6-8 | > 8 |
| Vision score/min | < 0.5 | 0.5-0.8 | > 0.8 |
| KDA | < 2 | 2-4 | > 4 |
| Kill participation | < 40% | 40-60% | > 60% |
| Damage share | < team avg | ~ avg | > avg |

Tips are role-aware (support won't be flagged for low CS).

## Project Structure

```
lol-tracker/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home/search
│   │   ├── layout.tsx                  # Root layout
│   │   ├── summoner/
│   │   │   └── [region]/
│   │   │       └── [riotId]/
│   │   │           └── page.tsx        # Profile + match history
│   │   ├── match/
│   │   │   └── [matchId]/
│   │   │       └── page.tsx            # Match detail
│   │   └── api/
│   │       ├── summoner/route.ts       # Summoner lookup proxy
│   │       ├── matches/route.ts        # Match list proxy
│   │       ├── match/[id]/route.ts     # Match detail proxy
│   │       └── league/route.ts         # Rank data proxy
│   ├── lib/
│   │   ├── riot-api.ts                 # Riot API client
│   │   ├── data-dragon.ts              # Data Dragon helpers
│   │   ├── tips.ts                     # Automated tips engine
│   │   └── types.ts                    # TypeScript types
│   └── components/
│       ├── SearchBar.tsx
│       ├── MatchCard.tsx
│       ├── MatchDetail.tsx
│       ├── PlayerStats.tsx
│       ├── ChampionIcon.tsx
│       ├── ItemIcon.tsx
│       └── TipsBadge.tsx
├── .env.local                          # API keys (gitignored)
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## Environment Variables

```
RIOT_API_KEY=RGAPI-xxxxx
NEXT_PUBLIC_DDRAGON_VERSION=14.x.1  # Updated from Data Dragon API
```

## Rate Limiting

Riot development API key limits:
- 20 requests every 1 second
- 100 requests every 2 minutes

Strategy: Queue API calls, cache responses in memory for 5 minutes.

## Phase 2 Additions

1. Mobafire builds integration via RapidAPI
2. AI-powered analysis (Claude API) for deeper match feedback
3. Live game lookup (spectator endpoint)
4. Champion statistics dashboard
