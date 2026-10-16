# LoL Tracker para Mac

App de escritorio para macOS que acompaña al cliente de League of Legends mientras
juegas, con los datos de tus propias partidas:

| Fase | Qué hace |
|---|---|
| **Selección de campeones** | Ordena tu pool con tu récord en tu rol, contra el tipo de composición enemiga y contra los campeones rivales revelados, más el balance de daño con tu equipo. Para tu campeón: tu página de runas y tus hechizos con mejor balance (se aplican al cliente con un clic) y la build contra su composición. |
| **Pantalla de carga / partida** | Scouting de los 10 jugadores: rango, winrate y señales como "primera vez con X", "especialista en X" o "en racha". Overlay opcional con tu prioridad y tu build. |
| **Fin de partida** | Enlace a tu análisis completo en la web. |

Todo se calcula con tu historial (no hay IA ni estadísticas globales), y cada
recomendación dice con cuántas partidas está respaldada.

## Requisitos

- macOS con Apple Silicon y League of Legends instalado.
- Node 20 o superior para compilarla.

## Uso

```bash
npm install
npm run dist
```

La app queda en `release/mac-arm64/LoL Tracker.app` (firmada ad-hoc, para tu propio
Mac). Ábrela, abre League y se conecta sola.

Para desarrollo: `npm run dev` (Electron con recarga en caliente).

## Cómo funciona

- **Cliente de League**: la app lee el puerto y el token del proceso `LeagueClientUx`
  (o del `lockfile`) y usa su API local: REST para leer la selección de campeones y
  aplicar runas/hechizos, y WebSocket (WAMP) para enterarse de cada cambio de fase.
- **Datos de Riot**: la app no guarda ninguna API key. Tu historial, la partida en
  vivo y el scouting vienen de la API web de LoL Tracker, que guarda la key en el
  servidor. Solo se permiten unas pocas rutas de lectura.
- **Seguridad**: ventanas aisladas (sin Node, `contextIsolation`, sandbox), cada
  mensaje de la interfaz se valida en el proceso principal y la interfaz solo puede
  cargar recursos propios y de Data Dragon (CSP).
- La lógica (recomendaciones, runas, scouting, plan) es la misma de la web:
  `../src/lib`.

## Reglas de Riot

- El overlay solo muestra información estática de antes de la partida: nada de
  temporizadores, seguimiento de cooldowns ni avisos que te digan qué hacer.
- En la selección de campeones no se muestran ni se buscan nombres (Riot los oculta
  en Solo/Duo); el scouting empieza cuando la partida carga.
- Las runas solo se escriben al pulsar el botón, y la app solo reemplaza la página
  que creó ella (o una que renombres a «LoL Tracker…»): nunca borra tus páginas.
- Para distribuirla a otras personas hace falta la aprobación de Riot (proceso de
  aplicaciones de terceros) y un Developer ID de Apple para firmarla y notarizarla.

## Desarrollo

- `npm run web`: la interfaz en el navegador con datos reales y una fase simulada:
  `http://localhost:5173/?scenario=champselect` (también `home`, `ingame`,
  `postgame`) y `/overlay.html?scenario=ingame`.
- `LOL_TRACKER_LCU=<puerto>:<token>`: conecta la app a un cliente concreto (por
  ejemplo uno falso para pruebas) aunque el real esté abierto.
- `LOL_TRACKER_WEB=http://localhost:3000`: usa una API web local en vez de producción.
- `npm run typecheck` y `npm test`.
