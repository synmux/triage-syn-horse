import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

/**
 * Unit tests run in happy-dom without booting Nuxt: everything under
 * `app/lib` and `app/stores` is written to be importable on its own, and
 * self-contained components mount with @vue/test-utils.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    // Date maths (snooze presets, relative times) is tested in UK time.
    env: { TZ: "Europe/London" },
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
