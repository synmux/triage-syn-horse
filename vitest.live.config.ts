import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Read-only contract tests against the real Linear API. Needs
 * LINEAR_API_KEY (or syn's __LINEAR_API_KEY); every request goes through
 * createReadOnlyClient, which refuses mutations.
 */
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    env: { TZ: "Europe/London" },
    environment: "node",
    hookTimeout: 60_000,
    include: ["tests/live/**/*.live.test.ts"],
    testTimeout: 60_000,
  },
});
