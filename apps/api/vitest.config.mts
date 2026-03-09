import path from "path";
import { defineConfig } from "vitest/config";

// Ensure env.ts does not exit(1) when loading (it requires CORS_ORIGIN etc. in non-dev).
process.env.NODE_ENV = "development";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    pool: "threads",
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "**/node_modules/**"],
      thresholds: {
        lines: 50,
        functions: 45,
        branches: 40,
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
