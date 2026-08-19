"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * True only after hydration. Use to gate UI that depends on the browser's
 * locale or clock, which the server cannot know — reading those during SSR
 * produces a hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
