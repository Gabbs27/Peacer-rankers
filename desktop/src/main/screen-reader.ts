import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { desktopCapturer, screen, systemPreferences } from "electron";
import type { OcrLine } from "./mayhem/offer";
import type { ScreenAccess } from "../shared/types";

const INTERVAL_MS = 1500;
const CAPTURE_WIDTH = 1920;
/** The augment cards' titles sit across the middle of the screen. */
const BAND = { left: 0.1, top: 0.35, bottom: 0.65, right: 0.88 };
const HELPER_TIMEOUT_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function screenAccess(): ScreenAccess {
  try {
    return systemPreferences.getMediaAccessStatus("screen") as ScreenAccess;
  } catch {
    return "unknown";
  }
}

interface Waiting {
  resolve: (lines: OcrLine[]) => void;
  done: boolean;
}

/**
 * While it runs, reads the middle band of the screen every 1.5 s with the
 * bundled Vision helper (`native/ocr.swift`). The image stays in memory and
 * the text never leaves the Mac: the caller keeps augment names only.
 */
export class ScreenReader extends EventEmitter<{ lines: [OcrLine[]] }> {
  private helper: ChildProcessWithoutNullStreams | null = null;
  private waiting: Waiting[] = [];
  private buffer = "";
  private running = false;

  /** `overlayLeft` gives where the overlay starts (0-1 of the screen): text right of it is ours. */
  constructor(
    private readonly helperPath: string,
    private readonly overlayLeft: () => number
  ) {
    super();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  stop(): void {
    this.running = false;
  }

  dispose(): void {
    this.stop();
    this.helper?.kill();
    this.helper = null;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const started = Date.now();
      const lines = await this.readOnce().catch(() => null);
      if (this.running && lines) this.emit("lines", lines);
      await sleep(Math.max(200, INTERVAL_MS - (Date.now() - started)));
    }
  }

  private async readOnce(): Promise<OcrLine[] | null> {
    if (this.waiting.length > 0) return null; // the helper is still on the previous image
    const display = screen.getPrimaryDisplay();
    const scale = CAPTURE_WIDTH / display.size.width;
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: CAPTURE_WIDTH, height: Math.round(display.size.height * scale) },
    });
    const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!source || source.thumbnail.isEmpty()) return null;
    const size = source.thumbnail.getSize();
    const right = Math.min(BAND.right, this.overlayLeft() - 0.01);
    const band = {
      x: Math.round(size.width * BAND.left),
      y: Math.round(size.height * BAND.top),
      width: Math.round(size.width * (right - BAND.left)),
      height: Math.round(size.height * (BAND.bottom - BAND.top)),
    };
    if (band.width <= 0) return null;
    const lines = await this.recognize(source.thumbnail.crop(band).toJPEG(85).toString("base64"));
    // Back to whole-screen coordinates, so the cards keep their left-to-right order.
    const w = right - BAND.left;
    const h = BAND.bottom - BAND.top;
    return lines.map((l) => ({ text: l.text, x: BAND.left + l.x * w, y: BAND.top + l.y * h, w: l.w * w, h: l.h * h }));
  }

  /** One image in, one line of JSON out, in order; a slow answer is dropped but keeps its place. */
  private recognize(base64: string): Promise<OcrLine[]> {
    const helper = this.ensureHelper();
    return new Promise((resolve) => {
      const entry: Waiting = { resolve, done: false };
      this.waiting.push(entry);
      setTimeout(() => {
        if (entry.done) return;
        entry.done = true;
        resolve([]);
      }, HELPER_TIMEOUT_MS);
      helper.stdin.write(`${base64}\n`);
    });
  }

  private ensureHelper(): ChildProcessWithoutNullStreams {
    if (this.helper) return this.helper;
    const helper = spawn(this.helperPath, [], { stdio: "pipe" });
    this.buffer = "";
    this.waiting = [];
    helper.stdout.setEncoding("utf8");
    helper.stdout.on("data", (chunk: string) => {
      this.buffer += chunk;
      let newline: number;
      while ((newline = this.buffer.indexOf("\n")) >= 0) {
        const raw = this.buffer.slice(0, newline);
        this.buffer = this.buffer.slice(newline + 1);
        const entry = this.waiting.shift();
        if (!entry || entry.done) continue;
        entry.done = true;
        let lines: OcrLine[] = [];
        try {
          lines = JSON.parse(raw) as OcrLine[];
        } catch {
          // A broken line reads as nothing on screen.
        }
        entry.resolve(Array.isArray(lines) ? lines : []);
      }
    });
    const reset = () => {
      if (this.helper !== helper) return;
      this.helper = null;
      for (const entry of this.waiting.splice(0)) {
        if (!entry.done) {
          entry.done = true;
          entry.resolve([]);
        }
      }
    };
    helper.on("exit", reset);
    helper.on("error", reset);
    helper.stdin.on("error", reset);
    this.helper = helper;
    return helper;
  }
}
