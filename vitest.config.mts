import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Same "@/..." alias as tsconfig, for tests that import app modules.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    // The macOS companion app runs its own tests (desktop/package.json).
    exclude: [...configDefaults.exclude, "desktop/**"],
  },
});
