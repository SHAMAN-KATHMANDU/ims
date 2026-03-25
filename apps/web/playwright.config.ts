import { defineConfig, devices } from "@playwright/test";

const DEFAULT_E2E_PORT = 3100;
const resolvedPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "", 10);
const e2ePort = Number.isFinite(resolvedPort) ? resolvedPort : DEFAULT_E2E_PORT;
const baseURL = process.env.BASE_URL ?? `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  /** Serial runs: `next dev` compiles lazily; parallel workers often timeout. */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  /** Next dev can spend a long time compiling on first navigation. */
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    process.env.CI ? ["github"] : ["list"],
  ],
  use: {
    baseURL,
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm --filter web exec next dev --port ${e2ePort} --webpack`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
