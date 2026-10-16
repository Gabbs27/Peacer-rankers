# LoL Tracker para Mac

App de escritorio para macOS que acompaña al cliente de League of Legends mientras
juegas, con los datos de tus propias partidas:

| Fase | Qué hace |
|---|---|
| **Selección de campeones** | Ordena tu pool con tu récord en tu rol, contra el tipo de composición enemiga y contra los campeones rivales revelados, más el balance de daño con tu equipo. Para tu campeón: tu página de runas y tus hechizos con mejor balance (se aplican al cliente con un clic) y la build contra su composición. |
| **Pantalla de carga / partida** | Scouting de los 10 jugadores: rango, winrate y señales como "primera vez con X", "especialista en X" o "en racha". Overlay opcional con tu prioridad y tu build. |
| **ARAM: Mayhem** | Los aumentos que más eligen los jugadores de tu campeón, por rareza (como te los ofrece el juego) y con los objetos que arma quien los toma; la build más usada, los hechizos más elegidos y tu banquillo. En la partida, todo en la ventana y en el overlay, que despliega la tier list completa mientras estás muerto (cuando Mayhem te deja elegir). |
| **Fin de partida** | Enlace a tu análisis completo en la web. |

Todo se calcula con tu historial, salvo Mayhem, que usa las partidas que la app lee
de tu cliente (ver abajo). No hay IA, y cada recomendación dice con cuántas
partidas está respaldada. Al entrar a la selección de campeones, la ventana se pone
encima del cliente sin quitarle el foco.

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
  cargar recursos propios, de Data Dragon y los iconos de CommunityDragon (CSP).
- La lógica (recomendaciones, runas, scouting, plan) es la misma de la web:
  `../src/lib`.

## ARAM: Mayhem

Riot no publica las partidas de Mayhem (cola 2400) en su API pública, pero el
cliente sí las tiene. La app las lee de ahí y las va sumando a un JSON local:

- **Qué lee**: tus partidas de Mayhem al conectar y al terminar cada partida. Con
  «Analizar más partidas», las de los jugadores de esas partidas: 250 nuevas por
  pulsación, una petición cada ~1,2 s, y se detiene sola en cuanto entras a la cola
  o a una partida. Cada pulsación sigue donde se quedó la anterior.
- **Qué guarda**: `~/Library/Application Support/LoL Tracker/mayhem-stats.json`, con
  conteos por parche y campeón (partidas, victorias, aumentos, pares de hechizos y
  objetos finales), qué objetos terminan llevando quienes toman cada aumento y los
  ids de las partidas ya contadas para no repetirlas. Ni nombres ni ids de
  jugadores: la lista de jugadores por visitar solo vive en memoria. Unas 600
  partidas ocupan ~250 KB. Un JSON de antes de guardar objetos se actualiza solo: la
  siguiente pulsación vuelve a leer esas partidas para completarlos.
- **Cómo ordena**: por lo que más eligen los jugadores de ese campeón en los dos
  parches más recientes. Distinguir aumentos por winrate necesita miles de partidas
  por aumento (una partida mueve un winrate 50 puntos); con unos cientos, las
  diferencias son ruido. Por eso ▲/▼ solo aparece cuando, con todos los campeones,
  un aumento gana claramente más o menos (3 errores estándar y 2+ puntos).
- **Objetos**: la build son los objetos terminados (según Data Dragon) que más
  llevan los jugadores de ese campeón al final. Junto a cada aumento, los que su
  gente arma más de lo que esos mismos campeones suelen armar; así un aumento de AP
  no sale «emparejado» con objetos de AP solo porque lo toman magos.
- **En la partida**: la app lee de la API local oficial del juego (Live Client
  Data, `127.0.0.1:2999`) solo si estás muerto, tu nivel y el tiempo de partida.
  Mayhem te deja elegir aumento al morir, así que el overlay muestra la tier list
  completa mientras estás muerto y al empezar, y un resumen el resto del tiempo.
- **Nombres e iconos**: el catálogo de aumentos del propio cliente e iconos de
  CommunityDragon.
- Seguir historiales ajenos desde el cliente no es una API oficial de Riot: por eso
  va despacio, solo cuando lo pides y nunca mientras juegas.

## Reglas de Riot

- El overlay solo muestra información estática de antes de la partida: nada de
  temporizadores, seguimiento de cooldowns ni avisos que te digan qué hacer. En
  Mayhem cambia cuánto muestra (más mientras estás muerto), no qué dice: no lee los
  aumentos que te ofrece el juego ni te dice cuál tomar.
- En la selección de campeones no se muestran ni se buscan nombres (Riot los oculta
  en Solo/Duo); el scouting empieza cuando la partida carga.
- Las runas solo se escriben al pulsar el botón, y la app solo reemplaza la página
  que creó ella (o una que renombres a «LoL Tracker…»): nunca borra tus páginas.
  Los hechizos también se aplican con un botón y respetan la tecla (D/F) de los que
  ya tienes.
- Para distribuirla a otras personas hace falta la aprobación de Riot (proceso de
  aplicaciones de terceros) y un Developer ID de Apple para firmarla y notarizarla.

## Desarrollo

- `npm run web`: la interfaz en el navegador con datos reales y una fase simulada:
  `http://localhost:5173/?scenario=champselect` (también `home`, `ingame`,
  `postgame`, `mayhem` y `mayhemgame`) y `/overlay.html?scenario=ingame` (o
  `mayhemgame`, y `mayhemdead` para el overlay desplegado).
- `LOL_TRACKER_LCU=<puerto>:<token>`: conecta la app a un cliente concreto (por
  ejemplo uno falso para pruebas) aunque el real esté abierto.
- `LOL_TRACKER_WEB=http://localhost:3000`: usa una API web local en vez de producción.
- `npm run typecheck` y `npm test`.
