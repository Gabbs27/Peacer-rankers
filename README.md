# LoL Tracker

Buscador y analizador de partidas de League of Legends. Perfil de invocador, rango,
maestría de campeones, historial paginado con filtros, detalle de partida con
puntuación de rendimiento y consejos, partida en vivo (spectator), comparador de
jugadores, planner de builds/runas pre-partida y guías.

Construido con **Next.js 16** (App Router), **React 19**, **TypeScript** y **Tailwind 4**,
sobre la **Riot Games API** y **Data Dragon**.

## Requisitos

- Node.js 20+
- Una API key de Riot (https://developer.riotgames.com/). Las keys de desarrollo
  **expiran cada 24 h** y tienen límites de rate bajos.

## Configuración

Crea `.env.local` en la raíz:

```env
# Obligatorio
RIOT_API_KEY=RGAPI-xxxxxxxx

# Opcional — cache distribuida + rate-limit por IP (Upstash Redis o Vercel KV).
# Sin estas variables la app funciona igual: usa la Data Cache de Next y desactiva
# el rate-limit por IP. Acepta los nombres de Upstash o de Vercel KV.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# (alternativa Vercel KV)
# KV_REST_API_URL=
# KV_REST_API_TOKEN=
```

## Scripts

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest (lógica de scoring, builds y datos de campeón)
npm run check      # typecheck + lint + test
```

CI (GitHub Actions, `.github/workflows/ci.yml`) corre typecheck + lint + test + build
en cada push/PR.

## Arquitectura

```
src/
  app/
    page.tsx                        # home + búsqueda + accesos rápidos
    summoner/[region]/[riotId]/     # perfil (server component)
    compare/  planner/  guides/     # comparador, planner, guías
    api/{summoner,matches,match,live-game}/route.ts   # proxy a Riot
  components/                       # UI (MatchCard, MatchOverview, LiveGame, ...)
  lib/
    riot-api.ts        # cliente Riot: errores tipados, 429+backoff, cache, zod
    cache.ts / redis.ts# cache read-through (Upstash/KV -> fallback Data Cache)
    data-dragon.ts     # URLs de assets + versión de parche (DDragonProvider)
    scoring.ts         # algoritmo de puntuación de rendimiento (role-aware)
    builds.ts / build-paths.ts / runes.ts   # motores de recomendación
    champion-data.ts   # fuente canónica de tipos de daño + normalización de nombres
    types.ts           # DTOs de Riot + Region/route maps + isValidRegion
  middleware.ts        # rate-limit por IP en /api/*
```

### Notas de diseño

- **Caching:** las respuestas de Riot se cachean con TTL por endpoint (partidas
  inmutables 24 h, rango 5 min, etc.). Solo se cachean respuestas exitosas. En Vercel
  la Data Cache ya es compartida entre instancias; Upstash/KV añade una capa
  cross-instance opcional y habilita el rate-limit por IP.
- **Regiones:** Match-V5 usa rutas regionales (`americas/asia/europe/sea`); Account-V1
  es global y solo existe en `americas/asia/europe`. Toda entrada de región se valida
  con `isValidRegion` antes de construir cualquier URL de Riot.
- **Errores:** `RiotApiError` lleva un `publicMessage` genérico; el detalle (URL,
  cuerpo upstream) se queda en los logs del servidor.

## Búsqueda

Busca por Riot ID: nombre de invocador + tag (ej. `xicebriel` + `LAN`) y región.
