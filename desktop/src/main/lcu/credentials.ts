import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface LcuCredentials {
  port: number;
  password: string;
}

const LOCKFILES = ["/Applications/League of Legends.app/Contents/LoL/lockfile"];

function isPort(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n < 65536;
}

/** Lockfile format: `LeagueClient:<pid>:<port>:<password>:<protocol>`. */
export function parseLockfile(content: string): LcuCredentials | null {
  const parts = content.trim().split(":");
  if (parts.length !== 5) return null;
  const port = Number(parts[2]);
  const password = parts[3];
  return isPort(port) && password ? { port, password } : null;
}

/** The client's UX process carries `--app-port=` and `--remoting-auth-token=`. */
export function parseClientArgs(commandLine: string): LcuCredentials | null {
  const port = Number(/--app-port=(\d+)/.exec(commandLine)?.[1]);
  const password = /--remoting-auth-token=([\w-]+)/.exec(commandLine)?.[1];
  return isPort(port) && password ? { port, password } : null;
}

export function findClientCommandLine(psOutput: string): string | null {
  return psOutput.split("\n").find((line) => line.includes("LeagueClientUx") && line.includes("--app-port=")) ?? null;
}

/** `<port>:<token>`, used by LOL_TRACKER_LCU to target a specific client. */
export function parseOverride(value: string | undefined): LcuCredentials | null {
  const match = /^(\d+):([\w-]+)$/.exec(value ?? "");
  const port = Number(match?.[1]);
  return match && isPort(port) ? { port, password: match[2] } : null;
}

/** Finds the running League client, or null when it is closed. */
export async function findCredentials(): Promise<LcuCredentials | null> {
  // Development aid: LOL_TRACKER_LCU=<port>:<token> points the app at one
  // client (e.g. a local fake) even when the real one is open.
  if (process.env.LOL_TRACKER_LCU) return parseOverride(process.env.LOL_TRACKER_LCU);
  try {
    const { stdout } = await execFileAsync("ps", ["-A", "-ww", "-o", "args="], { maxBuffer: 16 * 1024 * 1024 });
    const line = findClientCommandLine(stdout);
    const fromArgs = line ? parseClientArgs(line) : null;
    if (fromArgs) return fromArgs;
  } catch {
    // ps failed: fall through to the lockfile.
  }
  for (const path of LOCKFILES) {
    try {
      const creds = parseLockfile(await readFile(path, "utf8"));
      if (creds) return creds;
    } catch {
      // Not there: the client is closed.
    }
  }
  return null;
}
