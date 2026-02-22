import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: globalThis.process?.env?.CI ? 2 : 0,
  reporter: globalThis.process?.env?.CI ? "github" : "list",
  use: {
    baseURL:
      globalThis.process?.env?.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: globalThis.process?.env?.CI
    ? {
        command: "pnpm --filter web dev -- --hostname 127.0.0.1 --port 3000",
        port: 3000,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
