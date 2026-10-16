import type { MatchData } from "@/lib/types";
import { buildTodayPlan } from "@/lib/today-plan";
import { recentForm } from "@/lib/social-stats";
import type { MayhemStatus, Me } from "../../../shared/types";
import { bridge } from "../bridge";
import { profilePath } from "../data";
import { Button, Section } from "../components/ui";

interface Props {
  me: Me;
  /** Riot API PUUID. */
  puuid: string;
  matches: MatchData[] | null;
  error: string | null;
  mayhem: MayhemStatus;
}

function MayhemData({ mayhem }: { mayhem: MayhemStatus }) {
  const progress = mayhem.runTarget > 0 ? Math.min(100, Math.round((mayhem.runAdded / mayhem.runTarget) * 100)) : 0;
  return (
    <Section title="Datos de ARAM: Mayhem" aside={mayhem.patch ? `parche ${mayhem.patch}` : undefined}>
      <p className="text-sm text-gray-100">{mayhem.games.toLocaleString("es")} partidas analizadas</p>
      <p className="mt-1 text-[11px] leading-snug text-gray-500">
        Riot no publica Mayhem en su API, así que la app lee las partidas de tu cliente: las tuyas al conectar y, con el
        botón, las de los jugadores de tus partidas. Solo guarda conteos, en tu Mac, y nunca mientras juegas.
      </p>
      {mayhem.running ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-arcane-500/80 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Analizando… {mayhem.runAdded} de {mayhem.runTarget} partidas nuevas
            </span>
            <Button variant="ghost" onClick={() => void bridge.stopMayhem()}>
              Detener
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button onClick={() => void bridge.collectMayhem()}>Analizar más partidas</Button>
        </div>
      )}
      {mayhem.error && <p className="mt-2 text-[11px] text-amber-300">{mayhem.error}</p>}
    </Section>
  );
}

export default function Home({ me, puuid, matches, error, mayhem }: Props) {
  const plan = matches ? buildTodayPlan(matches, puuid) : null;
  const form = matches ? recentForm(matches, puuid) : [];

  return (
    <div className="space-y-3 p-3">
      <Section title="Para tu próxima partida" aside={plan ? `${plan.sampleSize} partidas` : undefined}>
        {error && <p className="text-xs text-red-300">{error}</p>}
        {!matches && !error && <p className="text-xs text-gray-500 animate-pulse">Leyendo tu historial…</p>}
        {matches && (!plan || plan.actions.length === 0) && (
          <p className="text-xs text-gray-400">Juega unas partidas más y aquí aparecerá tu plan.</p>
        )}
        {plan && (
          <ol className="space-y-2.5">
            {plan.actions.slice(0, 3).map((action) => (
              <li key={action.kind}>
                <p className="text-sm font-semibold text-gold-100">{action.title}</p>
                <p className="text-xs text-gray-400">{action.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {form.length >= 3 && (
        <Section title="Forma reciente" aside="más nueva primero">
          <div className="flex gap-1" role="img" aria-label={form.map((r) => (r === "W" ? "victoria" : "derrota")).join(", ")}>
            {form.map((r, i) => (
              <span key={i} aria-hidden className={`h-2 flex-1 rounded-full ${r === "W" ? "bg-blue-400/90" : "bg-red-400/80"}`} />
            ))}
          </div>
        </Section>
      )}

      <MayhemData mayhem={mayhem} />

      <div className="flex justify-center pt-1">
        <Button variant="ghost" onClick={() => void bridge.openWeb(profilePath(me))}>
          Abrir mi perfil completo en la web ↗
        </Button>
      </div>
    </div>
  );
}
