import { NextResponse } from "next/server";
import { RiotApiError } from "./riot-api";

/**
 * Maps any thrown error to a safe JSON response.
 * - RiotApiError → its real status + a generic `publicMessage` (never the raw
 *   upstream body or request URL, which stay in server logs only). Fixes M6.
 * - Anything else → 500 with a generic message.
 */
export function riotErrorResponse(error: unknown): NextResponse {
  if (error instanceof RiotApiError) {
    console.error("[riot]", error.message);
    return NextResponse.json({ error: error.publicMessage }, { status: error.status });
  }
  console.error("[unexpected]", error);
  return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
}
