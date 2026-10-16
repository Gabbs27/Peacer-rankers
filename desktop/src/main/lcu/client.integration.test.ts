import { afterEach, describe, it, expect } from "vitest";
import http from "node:http";
import { WebSocketServer } from "ws";
import type { AddressInfo } from "node:net";
import { LcuError, LcuHttp } from "./http";
import { parseWampEvent, subscribeEvents, topicFor, type LcuEvent } from "./events";

// A fake League client: REST on http and WAMP events on ws, same port.
const PASSWORD = "test-token";
const AUTH = `Basic ${Buffer.from(`riot:${PASSWORD}`).toString("base64")}`;
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

async function fakeClient() {
  const received: { method: string; url: string; body: string; auth?: string }[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push({ method: req.method!, url: req.url!, body, auth: req.headers.authorization });
      if (req.headers.authorization !== AUTH) return res.writeHead(401).end();
      if (req.url === "/lol-gameflow/v1/gameflow-phase") return res.end(JSON.stringify("ChampSelect"));
      if (req.url === "/lol-perks/v1/pages" && req.method === "POST") return res.writeHead(400).end(JSON.stringify({ message: "Max pages reached" }));
      res.writeHead(204).end();
    });
  });
  const wss = new WebSocketServer({ server });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  cleanups.push(() => {
    wss.clients.forEach((c) => c.terminate());
    wss.close();
    server.close();
  });
  return { port: (server.address() as AddressInfo).port, received, wss };
}

describe("LcuHttp", () => {
  it("authenticates as riot:<token> and parses JSON", async () => {
    const { port, received } = await fakeClient();
    const client = new LcuHttp({ port, password: PASSWORD }, "http");
    await expect(client.get("/lol-gameflow/v1/gameflow-phase")).resolves.toBe("ChampSelect");
    expect(received[0].auth).toBe(AUTH);
  });

  it("sends JSON bodies and surfaces the client's error message", async () => {
    const { port, received } = await fakeClient();
    const client = new LcuHttp({ port, password: PASSWORD }, "http");
    const err = await client.request("POST", "/lol-perks/v1/pages", { name: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(LcuError);
    expect(err).toMatchObject({ status: 400, message: "Max pages reached" });
    expect(JSON.parse(received[0].body)).toEqual({ name: "x" });
  });
});

describe("subscribeEvents", () => {
  it("subscribes to each topic and delivers events, then reports the client closing", async () => {
    const { port, wss } = await fakeClient();
    const subscribed: unknown[] = [];
    const events: LcuEvent[] = [];
    let closed = 0;
    wss.on("connection", (socket, req) => {
      expect(req.headers.authorization).toBe(AUTH);
      socket.on("message", (raw) => {
        subscribed.push(JSON.parse(raw.toString()));
        if (subscribed.length === 2) {
          socket.send(JSON.stringify([8, topicFor("/lol-gameflow/v1/gameflow-phase"), { uri: "/lol-gameflow/v1/gameflow-phase", eventType: "Update", data: "InProgress" }]));
          setTimeout(() => socket.close(), 20);
        }
      });
    });
    await new Promise<void>((done) => {
      subscribeEvents({
        creds: { port, password: PASSWORD },
        authorization: AUTH,
        topics: [topicFor("/lol-gameflow/v1/gameflow-phase"), topicFor("/lol-champ-select/v1/session")],
        onEvent: (e) => events.push(e),
        onClose: () => {
          closed++;
          done();
        },
        protocol: "ws",
      });
    });
    expect(subscribed).toEqual([
      [5, "OnJsonApiEvent_lol-gameflow_v1_gameflow-phase"],
      [5, "OnJsonApiEvent_lol-champ-select_v1_session"],
    ]);
    expect(events).toEqual([{ uri: "/lol-gameflow/v1/gameflow-phase", eventType: "Update", data: "InProgress" }]);
    expect(closed).toBe(1);
  });

  it("ignores frames that are not events", () => {
    expect(parseWampEvent("[0, \"session\", 1]")).toBeNull();
    expect(parseWampEvent("not json")).toBeNull();
  });
});
