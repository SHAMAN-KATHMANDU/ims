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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
