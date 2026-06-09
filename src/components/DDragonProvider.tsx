"use client";

import { createContext, useContext, ReactNode } from "react";
import { FALLBACK_DDRAGON_VERSION } from "@/lib/data-dragon";

const DDragonContext = createContext<string>(FALLBACK_DDRAGON_VERSION);

export function DDragonProvider({
  version,
  children,
}: {
  version: string;
  children: ReactNode;
}) {
  return (
    <DDragonContext.Provider value={version}>{children}</DDragonContext.Provider>
  );
}

export function useDDragonVersion(): string {
  return useContext(DDragonContext);
}
