import WebSocket from "ws";
import type { LcuCredentials } from "./credentials";

export interface LcuEvent {
  uri: string;
  eventType: string;
  data: unknown;
}

/** WAMP topic for one API path: "/lol-gameflow/v1/gameflow-phase" -> "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase". */
export function topicFor(path: string): string {
  return `OnJsonApiEvent${path.replace(/\//g, "_")}`;
}

/** Event frames look like `[8, topic, { uri, eventType, data }]`. */
export function parseWampEvent(text: string): LcuEvent | null {
  try {
    const msg: unknown = JSON.parse(text);
    if (!Array.isArray(msg) || msg[0] !== 8) return null;
    const payload = msg[2] as { uri?: unknown; eventType?: unknown; data?: unknown } | undefined;
    if (!payload || typeof payload.uri !== "string") return null;
    return { uri: payload.uri, eventType: String(payload.eventType), data: payload.data };
  } catch {
    return null;
  }
}

/**
 * Subscribes to client events (WAMP 1.0). `onClose` fires once when the client
 * goes away; the returned function disconnects without firing it.
 */
export function subscribeEvents(opts: {
  creds: LcuCredentials;
  authorization: string;
  topics: string[];
  onEvent: (event: LcuEvent) => void;
  onClose: () => void;
  protocol?: "wss" | "ws";
}): () => void {
  const ws = new WebSocket(`${opts.protocol ?? "wss"}://127.0.0.1:${opts.creds.port}/`, "wamp", {
    headers: { Authorization: opts.authorization },
    rejectUnauthorized: false,
  });
  ws.on("open", () => {
    for (const topic of opts.topics) ws.send(JSON.stringify([5, topic]));
  });
  ws.on("message", (raw) => {
    const event = parseWampEvent(raw.toString());
    if (event) opts.onEvent(event);
  });
  ws.on("error", () => ws.terminate());
  ws.once("close", () => opts.onClose());
  return () => {
    ws.removeAllListeners();
    ws.on("error", () => {});
    ws.terminate();
  };
}
