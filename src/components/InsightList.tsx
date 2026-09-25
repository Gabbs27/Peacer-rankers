export type InsightLevel = "good" | "warn" | "bad";

export interface Insight {
  level: InsightLevel;
  text: string;
  /** Extra context shown on hover. */
  hint?: string;
}

const STYLES: Record<InsightLevel, { dot: string; sr: string }> = {
  good: { dot: "bg-emerald-400", sr: "Bien:" },
  warn: { dot: "bg-yellow-400", sr: "Atención:" },
  bad: { dot: "bg-red-400", sr: "A mejorar:" },
};

/** Dot-led list of short findings; the one visual language for all feedback. */
export default function InsightList({ items, className = "" }: { items: Insight[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-gray-200" title={item.hint}>
          <span className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${STYLES[item.level].dot}`} aria-hidden />
          <span>
            <span className="sr-only">{STYLES[item.level].sr} </span>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
