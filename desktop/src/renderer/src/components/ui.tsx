import type { ReactNode } from "react";
import { getChampionIconUrl, getItemIconUrl, getSummonerSpellIconUrl } from "@/lib/data-dragon";
import type { ScoutTone } from "@/lib/scouting";

export function ChampIcon({
  id,
  version,
  size = 36,
  title,
  className = "",
}: {
  id: string | null | undefined;
  version: string | null | undefined;
  size?: number;
  title?: string;
  className?: string;
}) {
  if (!id || !version) {
    return (
      <span
        aria-hidden
        className={`inline-block shrink-0 rounded-full bg-gray-800 ring-1 ring-white/5 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      src={getChampionIconUrl(id, version)}
      alt={title ?? id}
      title={title ?? id}
      width={size}
      height={size}
      draggable={false}
      // Fixed box: flex rows would otherwise stretch the icon to the row's height.
      style={{ width: size, height: size }}
      className={`shrink-0 self-start rounded-full object-cover ${className}`}
    />
  );
}

export function ItemIcon({ itemId, version, size = 28, title }: { itemId: number; version: string; size?: number; title?: string }) {
  return (
    <img
      src={getItemIconUrl(itemId, version)}
      alt={title ?? `Item ${itemId}`}
      title={title}
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
      className="shrink-0 rounded ring-1 ring-white/10"
    />
  );
}

export function SpellIcon({ spellId, version, size = 24 }: { spellId: number; version: string; size?: number }) {
  return (
    <img
      src={getSummonerSpellIconUrl(spellId, version)}
      alt="Hechizo de invocador"
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size }}
      className="shrink-0 rounded ring-1 ring-white/10"
    />
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-3.5 fade-in">
      <header className="flex items-baseline justify-between gap-2 mb-2.5">
        <h2 className="font-display text-[13px] font-semibold tracking-wide text-gold-100">{title}</h2>
        {aside && <span className="text-[11px] text-gray-500">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

const TONES: Record<ScoutTone, string> = {
  threat: "bg-red-500/12 text-red-300 ring-red-400/25",
  opportunity: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25",
  info: "bg-white/5 text-gray-300 ring-white/10",
};

export function SignalChip({ tone, text }: { tone: ScoutTone; text: string }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] ring-1 ${TONES[tone]}`}>{text}</span>;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-gold-500/15 text-gold-100 ring-1 ring-gold-500/40 hover:bg-gold-500/25"
      : "text-gray-300 ring-1 ring-white/10 hover:text-gold-100 hover:ring-gold-500/30";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`no-drag rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
  );
}

/** Dot-led bullet list used for reasons (good) and cautions (warn). */
export function Bullets({ items, tone }: { items: string[]; tone: "good" | "warn" }) {
  if (items.length === 0) return null;
  const dot = tone === "good" ? "bg-emerald-400" : "bg-amber-400";
  return (
    <ul className="space-y-0.5">
      {items.map((text) => (
        <li key={text} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-gray-300">
          <span aria-hidden className={`mt-[6px] h-1 w-1 shrink-0 rounded-full ${dot}`} />
          {text}
        </li>
      ))}
    </ul>
  );
}

export function Sigil({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="#c8aa6e" strokeWidth="1.4">
      <path d="M12 2 L20 7 V17 L12 22 L4 17 V7 Z" />
      <path d="M12 6.5 L16.2 9 V14.5 L12 17 L7.8 14.5 V9 Z" fill="#c8aa6e" fillOpacity="0.25" />
    </svg>
  );
}
