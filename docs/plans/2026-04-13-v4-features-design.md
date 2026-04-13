# LoL Tracker V4 — Feature Design

**Date:** 2026-04-13
**Status:** Approved

---

## Feature 1: Historial Profundo (Paginado + Filtros)

Load 10 matches initially, "Cargar más" button fetches 10 more using Match-V5 `start` param.

**Filters:**
- Queue filter (server-side): Todas | Ranked (420) | Normal (400/430) | ARAM (450)
- Champion filter (client-side): Dropdown populated from loaded matches
- Result filter (client-side): Todas | Victorias | Derrotas

**Behavior:**
- Queue filter resets loaded matches and fetches fresh with `queue` param
- Champion + result filters work client-side on loaded data
- "Cargar 10 más" appends to existing list with `start` offset
- MatchOverview recalculates with ALL loaded matches (not just first 10)
- Store loaded matches in client state (convert summoner page to client component or use a wrapper)

**API changes:**
- `/api/matches` — add optional `start` and `queue` query params
- `riot-api.ts` — `getMatchIds` add `start` and `queue` params

---

## Feature 2: Comparador de Jugadores

New page `/compare` with two summoner inputs side-by-side.

**Sections:**
1. **Stats generales** — Table comparing last 10 matches: winrate, KDA, CS/min, vision, damage, gold, score
2. **Head-to-head** — Find common matchIds between both players, show per-game comparison

**Data flow:**
- Fetch both summoners via existing `/api/summoner`
- Fetch both match lists via `/api/matches`
- Compare matchIds to find common games
- For common games, pull participant data for both players

**UI:** Two-column layout with green highlight on the "winner" of each stat.

---

## Feature 3: Live Game / Spectator

Use SPECTATOR-V5 API to show current game info.

**New API route:** `/api/live-game?puuid={puuid}&region={region}`
**New riot-api function:** `getCurrentGame(puuid, region)`
**Endpoint:** `GET /lol/spectator/v5/active-games/by-summoner/{puuid}` (platform URL)

**Display (when in game):**
- Green banner at top of summoner page: "En partida — {queueType}"
- 10 players grid: champion icon, summoner name, rank, summoner spells
- Mini-stats per player: winrate + KDA with that champion (requires fetching recent matches per player)
- "Ver build sugerida" button → links to /planner pre-filled with enemy comp

**Fallback:** If Spectator API returns 404 (not in game), show nothing. If 403 (key limitation), show "No disponible" message.

**Rate limit concern:** Fetching ranks for 10 players = 10 API calls. Batch in groups of 5 with delays. Cache aggressively (5 min TTL).

---

## Feature 4: UI/UX Improvements

**Colors:**
- Increase text contrast: primary text → text-gray-100, secondary → text-gray-300
- Lighten card backgrounds slightly for better readability
- Ensure all text passes WCAG AA contrast (4.5:1 ratio)

**Responsive (mobile-first):**
- All components tested at 375px width
- Touch targets minimum 44x44px
- Remove text-[10px], minimum text-xs (12px)
- Collapsible sections for dense data on mobile

**Map display:**
- Show map thumbnail (getMapImageUrl) in match card
- Show queue name + duration in collapsed match card view
- Map name in expanded view header

**Polish:**
- Focus-visible rings on all interactive elements
- Smooth transitions on expand/collapse
- Semantic HTML (article, section, nav)
- aria-expanded on toggles
- sr-only text for icon-only indicators

---

## Priority Order

1. UI/UX Improvements (foundation — makes everything else look better)
2. Historial Profundo (most requested, builds on existing code)
3. Live Game / Spectator (high impact, needs production API key)
4. Comparador (nice to have, most complex)
