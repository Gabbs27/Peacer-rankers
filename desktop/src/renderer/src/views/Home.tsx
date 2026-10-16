import type { MatchData } from "@/lib/types";
import { buildTodayPlan } from "@/lib/today-plan";
import { recentForm } from "@/lib/social-stats";
import type { Me } from "../../../shared/types";
import { bridge } from "../bridge";
import { profilePath } from "../data";
import { Button, Section } from "../components/ui";

interface Props {
  me: Me;
  /** Riot API PUUID. */
  puuid: string;
  matches: MatchData[] | null;
  error: string | null;
}

export default function Home({ me, puuid, matches, error }: Props) {
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

      <div className="flex justify-center pt-1">
        <Button variant="ghost" onClick={() => void bridge.openWeb(profilePath(me))}>
          Abrir mi perfil completo en la web ↗
        </Button>
      </div>
    </div>
  );
}
