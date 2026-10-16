import { LcuError, type LcuHttp } from "./lcu/http";

/** The part of the client the actions need (a stub in tests). */
export type LcuClient = Pick<LcuHttp, "get" | "request">;
import type { ActionResult, NamedRunePage } from "../shared/types";

export const PAGE_PREFIX = "LoL Tracker";

interface PerkPage {
  id: number;
  name: string;
  isDeletable: boolean;
}

const isId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) < 100_000;

/** Validates a rune page coming from the renderer before it touches the client. */
export function validateRunePage(value: unknown): NamedRunePage | null {
  const page = value as NamedRunePage | null;
  if (!page || typeof page !== "object") return null;
  if (!isId(page.primaryStyleId) || !isId(page.subStyleId)) return null;
  if (!Array.isArray(page.selectedPerkIds) || page.selectedPerkIds.length !== 9 || !page.selectedPerkIds.every(isId)) return null;
  if (typeof page.name !== "string" || !page.name.startsWith(PAGE_PREFIX) || page.name.length > 40) return null;
  return {
    name: page.name,
    primaryStyleId: page.primaryStyleId,
    subStyleId: page.subStyleId,
    selectedPerkIds: [...page.selectedPerkIds],
  };
}

export function validateSpells(a: unknown, b: unknown): [number, number] | null {
  return isId(a) && isId(b) && a !== b ? [a, b] : null;
}

function failure(error: unknown, fallback: string): ActionResult {
  const detail = error instanceof LcuError ? ` (${error.message})` : "";
  return { ok: false, message: `${fallback}${detail}` };
}

/**
 * Writes the page as the current one. Only ever replaces a page the app made
 * (or one the player renamed to "LoL Tracker…"): it never deletes the player's
 * own pages to make room.
 */
export async function importRunePage(http: LcuClient, page: NamedRunePage): Promise<ActionResult> {
  try {
    const pages = await http.get<PerkPage[]>("/lol-perks/v1/pages");
    const ours = pages.find((p) => p.isDeletable && p.name.startsWith(PAGE_PREFIX));
    if (ours) await http.request("DELETE", `/lol-perks/v1/pages/${ours.id}`);
    try {
      await http.request("POST", "/lol-perks/v1/pages", { ...page, current: true });
    } catch (error) {
      return failure(
        error,
        "No hay una página de runas libre. Renombra una a «LoL Tracker» y la app la reutilizará"
      );
    }
    return { ok: true, message: "Runas aplicadas en el cliente." };
  } catch (error) {
    return failure(error, "No se pudieron aplicar las runas");
  }
}

export async function setSpells(http: LcuClient, spell1Id: number, spell2Id: number): Promise<ActionResult> {
  try {
    await http.request("PATCH", "/lol-champ-select/v1/session/my-selection", { spell1Id, spell2Id });
    return { ok: true, message: "Hechizos aplicados." };
  } catch (error) {
    return failure(error, "No se pudieron cambiar los hechizos");
  }
}
