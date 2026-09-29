import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests run in happy-dom without booting Nuxt: everything under
 * `app/lib` and `app/stores` is written to be importable on its own.
 */
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
