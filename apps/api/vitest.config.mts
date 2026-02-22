import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Ensure env.ts does not exit(1) when loading (it requires CORS_ORIGIN etc. in non-dev).
process.env.NODE_ENV = "development";
process.env.VITEST = "true";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [path.resolve(__dirname, "src/__tests__/sentry-mock.ts")],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      lines: 35,
      statements: 35,
      branches: 25,
      functions: 35,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
