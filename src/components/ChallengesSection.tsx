import type { PlayerChallenges } from "@/lib/types";

interface Props {
  challenges: PlayerChallenges | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  VETERANCY: "Veteranía",
  IMAGINATION: "Imaginación",
  EXPERTISE: "Maestría",
  TEAMWORK: "Trabajo en equipo",
  COLLECTION: "Colección",
};

const LEVEL_LABELS: Record<string, string> = {
  IRON: "Hierro",
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  PLATINUM: "Platino",
  DIAMOND: "Diamante",
  MASTER: "Master",
  GRANDMASTER: "Grand Master",
  CHALLENGER: "Challenger",
  NONE: "—",
};

const LEVEL_COLORS: Record<string, string> = {
  IRON: "text-gray-400",
  BRONZE: "text-amber-600",
  SILVER: "text-gray-200",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-yellow-300",
};

export default function ChallengesSection({ challenges }: Props) {
  if (!challenges) return null;

  const total = challenges.totalPoints;
  const categories = Object.entries(challenges.categoryPoints).filter(
    ([key]) => CATEGORY_LABELS[key]
  );
  if (categories.length === 0) return null;

  return (
    <section aria-label="Desafíos de Riot" className="panel p-4 rise rise-3">
      <h2 className="section-title text-lg font-semibold text-gray-100 mb-3">
        Desafíos
        <span className={`text-sm font-sans ${LEVEL_COLORS[total.level] ?? "text-gray-300"}`}>
          {LEVEL_LABELS[total.level] ?? total.level} · {total.current.toLocaleString("es")} pts
        </span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map(([key, points]) => {
          const pct = points.max > 0 ? Math.round((points.current / points.max) * 100) : 0;
          return (
            <div key={key} className="bg-gray-800/60 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">{CATEGORY_LABELS[key]}</p>
              <p className={`text-sm font-semibold ${LEVEL_COLORS[points.level] ?? "text-gray-200"}`}>
                {LEVEL_LABELS[points.level] ?? points.level}
              </p>
              <div
                className="mt-2 h-1.5 rounded bg-gray-700 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso en ${CATEGORY_LABELS[key]}`}
              >
                <div
                  className="h-full rounded bg-gradient-to-r from-[#c8aa6e] to-[#e3c98a]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
