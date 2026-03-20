import { defineConfig, devices } from "@playwright/test";

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
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
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
    command: "pnpm --filter web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
