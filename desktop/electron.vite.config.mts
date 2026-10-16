import { fileURLToPath } from "node:url";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// "@/lib/..." resolves to the web app's pure analysis libraries, so the draft,
// rune and scouting logic is shared with the website instead of copied.
const alias = { "@": here("../src") };

// Production pages may only load the app's own files plus Data Dragon
// (champion/item/rune images and data). Dev keeps Vite's inline HMR working.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://ddragon.leagueoflegends.com",
  "font-src 'self' data:",
  "connect-src 'self' https://ddragon.leagueoflegends.com",
].join("; ");

const csp = {
  name: "lol-tracker-csp",
  apply: "build" as const,
  transformIndexHtml: (html: string) =>
    html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
  },
  renderer: {
    resolve: { alias },
    plugins: [react(), tailwindcss(), csp],
    // Browser-only preview (`npm run web`): proxy the web API so the mock bridge
    // can read real data without CORS. The Electron app goes through main.
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: { "/api": { target: "https://peacer-rankers.vercel.app", changeOrigin: true } },
    },
    build: {
      minify: true,
      rollupOptions: {
        input: {
          index: here("src/renderer/index.html"),
          overlay: here("src/renderer/overlay.html"),
        },
      },
    },
  },
});
