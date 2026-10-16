import type { Me } from "../../../shared/types";
import { bridge } from "../bridge";
import { profilePath } from "../data";
import { Button, Section } from "../components/ui";

export default function PostGame({ me }: { me: Me }) {
  return (
    <div className="space-y-3 p-3">
      <Section title="Partida terminada">
        <p className="text-sm text-gray-300">
          Tu análisis completo está en la web: puntuación, fase de líneas, momentos clave, mapa de muertes y build.
        </p>
        <p className="mt-1 text-[11px] text-gray-500">Riot tarda un par de minutos en publicar la partida.</p>
        <div className="mt-3">
          <Button onClick={() => void bridge.openWeb(profilePath(me))}>Ver mi análisis ↗</Button>
        </div>
      </Section>
    </div>
  );
}
