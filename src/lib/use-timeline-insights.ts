"use client";

import { useEffect, useState } from "react";
import type { TimelineInsights } from "./timeline-insights";

export type TimelineState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TimelineInsights };

const FALLBACK_ERROR = "No se pudo cargar el análisis de la partida.";

/**
 * Fetches the per-minute analysis of one match. Call it from a component that
 * mounts when the match card is expanded, so each expand costs one request and
 * every tab of the card shares the result.
 */
export function useTimelineInsights(
  matchId: string,
  region: string,
  puuid: string,
  enabled: boolean
): TimelineState {
  const [state, setState] = useState<TimelineState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ region, puuid });
    fetch(`/api/timeline/${encodeURIComponent(matchId)}?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        setState(
          res.ok
            ? { status: "ready", data }
            : { status: "error", message: data?.error ?? FALLBACK_ERROR }
        );
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error", message: FALLBACK_ERROR });
      });
    return () => controller.abort();
  }, [matchId, region, puuid, enabled]);

  return enabled ? state : { status: "disabled" };
}
