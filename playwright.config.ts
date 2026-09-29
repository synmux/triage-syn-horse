import { defineConfig, devices } from "@playwright/test";

/**
 * iPhone E2E against the production build served by wrangler dev.
 * Queries reach the real Linear API; every mutation is intercepted and
 * answered locally (see tests/e2e/fixtures.ts), so nothing is written.
 * Run `pnpm test:e2e`, which builds first.
 */
export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  projects: [
    {
      name: "iphone-webkit",
      use: {
        ...devices["iPhone 15"],
        browserName: "webkit",
        locale: "en-GB",
        timezoneId: "Europe/London",
      },
    },
  ],
  reporter: [["list"]],
  retries: 0,
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:8788",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec wrangler dev --port 8788 --ip 127.0.0.1",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:8788",
  },
  workers: 1,
});
