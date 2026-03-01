import path from "path";
import { defineConfig } from "vitest/config";

// Ensure env.ts does not exit(1) when loading (it requires CORS_ORIGIN etc. in non-dev).
process.env.NODE_ENV = "development";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
