import path from "path";
import { defineConfig } from "vitest/config";

// Ensure env.ts does not exit(1) when loading (it requires CORS_ORIGIN etc. in non-dev).
process.env.NODE_ENV = "development";

/**
 * Coverage and the Prisma native query engine don't mix well under
 * parallel file execution. Two interacting symptoms:
 *
 *   1. V8 coverage instrumentation + the Prisma N-API binary loaded in
 *      multiple workers triggers a Rust-side panic:
 *      "Failed to deserialize constructor options" → SIGABRT → exit 134.
 *   2. `tests/integration/**` files import `@/config/express.config`
 *      which eagerly constructs BullMQ publishers on module load; when
 *      multiple workers import the config concurrently, ioredis reconnect
 *      storms amplify the above.
 *
 * Mitigation under coverage: switch to the forks pool with `singleFork`
 * so every test file runs in the same child process, serially. This is
 * the vitest 4 replacement for the legacy `poolOptions.threads.single
 * Thread` option (which was removed in v4 — the previous workaround had
 * silently become a no-op, which is how this crash started escaping CI).
 */
const withCoverage = process.env.VITEST_COVERAGE === "true";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    pool: withCoverage ? "forks" : "threads",
    poolOptions: {
      forks: {
        singleFork: withCoverage,
      },
    },
    // Belt-and-suspenders: disable file parallelism under coverage so even
    // if the pool option is ignored again in a future vitest major, test
    // files still run one at a time.
    fileParallelism: !withCoverage,
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
