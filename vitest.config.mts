import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The macOS companion app runs its own tests (desktop/package.json).
    exclude: [...configDefaults.exclude, "desktop/**"],
  },
});
