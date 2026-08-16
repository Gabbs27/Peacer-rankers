"use client";

import type { MatchData } from "@/lib/types";
import { computeWinFormula, formulaHeadline } from "@/lib/win-formula";

interface Props {
  matches: MatchData[];
  puuid: string;
}

/** Bar showing where the win average sits vs the loss average. */
function CompareBar({
  winAvg,
  lossAvg,
  higherIsBetter,
}: {
  winAvg: number;
  lossAvg: number;
  higherIsBetter: boolean;
}) {
  const max = Math.max(Math.abs(winAvg), Math.abs(lossAvg)) || 1;
  const winPct = Math.min(100, Math.round((Math.abs(winAvg) / max) * 100));
  const lossPct = Math.min(100, Math.round((Math.abs(lossAvg) / max) * 100));
  return (
    <div className="space-y-1 min-w-[7rem]" aria-hidden>
      <div className="h-1.5 rounded bg-gray-800 overflow-hidden">
        <div className="h-full rounded bg-blue-400" style={{ width: `${winPct}%` }} />
      </div>
      <div className="h-1.5 rounded bg-gray-800 overflow-hidden">
        <div className="h-full rounded bg-red-400/80" style={{ width: `${lossPct}%` }} />
      </div>
      <span className="sr-only">
        {higherIsBetter ? "mayor es mejor" : "menor es mejor"}
      </span>
    </div>
  );
}

export default function WinFormulaPanel({ matches, puuid }: Props) {
  const formula = computeWinFormula(matches, puuid);
  if (!formula || !formula.topWeakness) return null;

  const { topWeakness, topStrength, wins, losses, rows } = formula;
  const shown = rows.filter((r) => r.helps).slice(0, 6);

  return (
    <section aria-label="Tu fórmula de victoria" className="panel p-5 rise rise-3">
      <h3 className="section-title text-lg font-bold text-gray-100 mb-3">
        Tu fórmula de victoria
        <span className="text-xs text-gray-500 font-sans font-normal">
          ({wins}V vs {losses}D analizadas)
        </span>
      </h3>

      {/* Headline: the single lever that most separates your wins from losses */}
      <div className="rounded-lg border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 p-4 mb-4">
        <p className="text-xs uppercase tracking-wider text-[#c8aa6e] mb-1">
          Lo que más cambia entre ganar y perder
        </p>
        <p className="text-base font-semibold text-gray-100">{topWeakness.label}</p>
        <p className="text-sm text-gray-300 mt-1">{formulaHeadline(topWeakness)}</p>
        {topWeakness.hint && (
          <p className="text-xs text-gray-400 mt-2 border-t border-[#c8aa6e]/15 pt-2">
            💡 {topWeakness.hint}
          </p>
        )}
      </div>

      {topStrength && (
        <p className="text-xs text-gray-400 mb-3">
          También pesa: <span className="text-gray-200 font-medium">{topStrength.label}</span> —{" "}
          {formulaHeadline(topStrength)}
        </p>
      )}

      {/* Full comparison table */}
      <ul className="space-y-2">
        <li className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-gray-500">
          <span className="flex-1">Métrica</span>
          <span className="w-16 text-right text-blue-400">Victorias</span>
          <span className="w-16 text-right text-red-400">Derrotas</span>
          <span className="min-w-[7rem]" />
        </li>
        {shown.map((row) => (
          <li key={row.key} className="flex items-center gap-3 text-sm">
            <span className="flex-1 text-gray-300 truncate">{row.label}</span>
            <span className="w-16 text-right text-blue-300 font-semibold">
              {row.format(row.winAvg)}
            </span>
            <span className="w-16 text-right text-red-300 font-semibold">
              {row.format(row.lossAvg)}
            </span>
            <CompareBar
              winAvg={row.winAvg}
              lossAvg={row.lossAvg}
              higherIsBetter={row.higherIsBetter}
            />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-500 mt-3">
        Barras: arriba tu promedio en victorias, abajo en derrotas. Calculado solo con tus partidas.
      </p>
    </section>
  );
}
