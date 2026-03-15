import path from "path";
import { defineConfig } from "vitest/config";

// Ensure env.ts does not exit(1) when loading (it requires CORS_ORIGIN etc. in non-dev).
process.env.NODE_ENV = "development";

// Single-thread when coverage is enabled to avoid Prisma query engine panic:
// "Failed to deserialize constructor options" (native binary + worker threads + v8 coverage).
const withCoverage = process.env.VITEST_COVERAGE === "true";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: withCoverage,
      },
    },
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "**/node_modules/**"],
      thresholds: {
        lines: 30,
        functions: 22,
        branches: 12,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
