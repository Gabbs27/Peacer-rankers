"use client";

import { useState } from "react";

// Shows the Match-V5 id (e.g. "LA1_1724789348") and copies it to the clipboard.
// Useful for sharing a game, bug reports, or looking it up elsewhere.
export default function MatchIdBadge({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar ID de la partida"
      className="ml-auto shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-gray-400 hover:text-[#e3c98a] focus-ring rounded px-2 py-1 transition-colors"
    >
      <span className="text-gray-500">ID</span>
      <span className="hidden sm:inline">{matchId}</span>
      <span aria-hidden>{copied ? "✓" : "⧉"}</span>
      <span className="sr-only">
        {copied ? `ID ${matchId} copiado` : `Copiar ID de la partida ${matchId}`}
      </span>
    </button>
  );
}
