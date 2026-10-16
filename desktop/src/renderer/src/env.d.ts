/// <reference types="vite/client" />
import type { CompanionBridge } from "../../shared/types";

declare global {
  interface Window {
    /** Exposed by the preload script; absent in the browser preview. */
    companion?: CompanionBridge;
  }
  // The shared data-dragon helper passes Next.js' cache hint to fetch;
  // browsers ignore it.
  interface RequestInit {
    next?: { revalidate?: number | false; tags?: string[] };
  }
}

export {};
