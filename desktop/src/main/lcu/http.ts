import http from "node:http";
import https from "node:https";
import type { LcuCredentials } from "./credentials";

export class LcuError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** Match history comes from Riot's servers through the client: slower than its local data. */
export const timeoutFor = (path: string) => (path.startsWith("/lol-match-history/") ? 20_000 : 5000);

/** REST access to the League client on localhost. `http` exists only for tests. */
export class LcuHttp {
  readonly authorization: string;

  constructor(
    private readonly creds: LcuCredentials,
    private readonly protocol: "https" | "http" = "https"
  ) {
    this.authorization = `Basic ${Buffer.from(`riot:${creds.password}`).toString("base64")}`;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const transport = this.protocol === "https" ? https : http;
    return new Promise<T>((resolve, reject) => {
      const req = transport.request(
        {
          host: "127.0.0.1",
          port: this.creds.port,
          path,
          method,
          headers: {
            Authorization: this.authorization,
            Accept: "application/json",
            ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          },
          // The client serves a self-signed certificate, and only on 127.0.0.1.
          rejectUnauthorized: false,
          timeout: timeoutFor(path),
        },
        (res) => {
          let raw = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (raw += chunk));
          res.on("end", () => {
            let data: unknown = undefined;
            if (raw) {
              try {
                data = JSON.parse(raw);
              } catch {
                data = raw;
              }
            }
            const status = res.statusCode ?? 0;
            if (status >= 400) {
              const message =
                data && typeof data === "object" && "message" in data ? String(data.message) : `LCU ${status}`;
              reject(new LcuError(status, message));
              return;
            }
            resolve(data as T);
          });
        }
      );
      req.on("timeout", () => req.destroy(new Error("El cliente de League no respondió a tiempo")));
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}
