"use client";

import { useRef, type KeyboardEvent } from "react";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** Small counter shown next to the label. */
  count?: number;
}

interface Props<T extends string> {
  tabs: TabDef<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Namespaces the tab/panel ids; must be unique on the page. */
  idPrefix: string;
  label: string;
  size?: "md" | "sm";
  className?: string;
}

/**
 * WAI-ARIA tabs with roving focus (arrows, Home, End). The page renders a
 * single panel for the active tab — spread `tabPanelProps` onto it.
 */
export default function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
  label,
  size = "md",
  className = "",
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  const md = size === "md";

  return (
    <div
      role="tablist"
      aria-label={label}
      className={
        md
          ? `flex gap-1 border-b border-[#c8aa6e]/15 overflow-x-auto overflow-y-hidden no-scrollbar ${className}`
          : `inline-flex gap-1 rounded-lg bg-gray-900/60 p-1 overflow-x-auto max-w-full no-scrollbar ${className}`
      }
    >
      {tabs.map((tab, i) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={
              md
                ? `relative shrink-0 px-3 sm:px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-colors focus-ring rounded-t ${
                    active ? "text-[#f0e6d2]" : "text-gray-400 hover:text-[#e3c98a]"
                  }`
                : `shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors focus-ring ${
                    active
                      ? "bg-[#c8aa6e]/15 text-[#f0e6d2] shadow-[inset_0_0_0_1px_rgba(200,170,110,0.35)]"
                      : "text-gray-400 hover:text-gray-100"
                  }`
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-[10px] font-sans ${active ? "text-[#c8aa6e]" : "text-gray-500"}`}>
                {tab.count}
              </span>
            )}
            {md && active && (
              <span
                aria-hidden
                className="absolute left-2 right-2 bottom-0 h-0.5 rounded bg-gradient-to-r from-[#785a28] via-[#e3c98a] to-[#785a28]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function tabPanelProps(idPrefix: string, value: string) {
  return {
    role: "tabpanel",
    id: `${idPrefix}-panel`,
    "aria-labelledby": `${idPrefix}-tab-${value}`,
  } as const;
}
