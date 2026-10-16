import { useEffect } from "react";
import { getProfileIconUrl } from "@/lib/data-dragon";
import { useApiPuuid, useChampions, useCompanionState, useGameGeneration, useHistory } from "./data";
import Searching from "./views/Searching";
import Home from "./views/Home";
import ChampSelect from "./views/ChampSelect";
import AramSelect from "./views/AramSelect";
import InGame from "./views/InGame";
import PostGame from "./views/PostGame";
import { Sigil } from "./components/ui";

const IN_GAME = new Set(["GameStart", "InProgress", "Reconnect"]);
/** ARAM and ARAM: Mayhem: random champions, no draft. */
const ARAM_QUEUES = new Set([450, 2400]);
const POST_GAME = new Set(["WaitingForStats", "PreEndOfGame", "EndOfGame"]);

export default function App() {
  const state = useCompanionState();
  const champs = useChampions();
  const account = useApiPuuid(state.me);
  const generation = useGameGeneration(state.phase);
  const history = useHistory(account.puuid, state.me?.region ?? null, generation);
  const matches = history.matches;
  const error = account.error ?? history.error;

  useEffect(() => {
    document.title = state.me ? `LoL Tracker · ${state.me.gameName}` : "LoL Tracker";
  }, [state.me]);

  const me = state.me;
  const connected = state.status === "connected" && me;

  let body;
  if (!connected) body = <Searching />;
  else if (!me.region) {
    body = (
      <p className="p-6 text-center text-sm text-gray-400">
        Tu región todavía no está soportada por LoL Tracker.
      </p>
    );
  } else if (account.error) {
    body = <p className="p-6 text-center text-sm text-amber-300">No se pudo encontrar tu cuenta en LoL Tracker: {account.error}</p>;
  } else if (!champs || !account.puuid) {
    body = <p className="p-6 text-center text-xs text-gray-500 animate-pulse">Preparando tus datos…</p>;
  } else if (state.phase === "ChampSelect" && state.champSelect && ARAM_QUEUES.has(state.queueId ?? 0)) {
    body = <AramSelect view={state.champSelect} queueId={state.queueId!} champs={champs} mayhem={state.mayhem} />;
  } else if (state.phase === "ChampSelect" && state.champSelect) {
    body = (
      <ChampSelect puuid={account.puuid} view={state.champSelect} champs={champs} matches={matches} historyError={error} />
    );
  } else if (IN_GAME.has(state.phase)) {
    body = <InGame puuid={account.puuid} region={me.region} state={state} champs={champs} />;
  } else if (POST_GAME.has(state.phase)) body = <PostGame me={me} />;
  else
    body = (
      <Home me={me} puuid={account.puuid} matches={matches} error={error} mayhem={state.mayhem} screenAccess={state.screenAccess} />
    );

  return (
    <div className="flex h-full flex-col">
      <header className="drag flex h-12 shrink-0 items-center gap-2.5 border-b border-gold-500/15 bg-gray-950/70 pl-20 pr-3 backdrop-blur">
        <Sigil className="h-4 w-4" />
        <span className="font-display text-sm font-bold text-gold-100">LoL Tracker</span>
        <span className="ml-auto flex min-w-0 items-center gap-2">
          {connected && champs && (
            <img
              src={getProfileIconUrl(me.profileIconId, champs.version)}
              alt=""
              width={20}
              height={20}
              draggable={false}
              className="rounded-full ring-1 ring-gold-500/40"
            />
          )}
          <span className="truncate text-xs text-gray-300">
            {connected ? `${me.gameName}#${me.tagLine}` : "Sin conexión"}
          </span>
          <span
            aria-hidden
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${connected ? "bg-emerald-400" : "bg-gray-600 animate-pulse"}`}
          />
        </span>
      </header>
      <main className="flex flex-1 flex-col overflow-y-auto">{body}</main>
    </div>
  );
}
