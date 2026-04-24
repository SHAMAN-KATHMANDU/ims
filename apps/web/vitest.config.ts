import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    setupFiles: ["./vitest.setup.ts"],
    // Use threads pool to avoid ERR_REQUIRE_ESM with jsdom/html-encoding-sniffer in forks
    pool: "threads",
    // 5s default starves heavy provider-mounting tests (RoleEditor mounts a
    // QueryClient + the full 241-permission catalog) when 70+ test files
    // execute in parallel. They pass in isolation; bump the budget so they
    // don't flake under contention.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
