/**
 * ts-node shim for the essential seed. Mirrors prisma/seed.js — runtime
 * compiles seed-essential.ts and its imports so we don't have to maintain
 * a separate build step for seeds.
 *
 * Requires `ts-node` and `tsconfig-paths` in the runtime image (both are in
 * package.json dependencies, not devDependencies, so they survive
 * `pnpm prune --prod` in the Docker build).
 */
const path = require("path");

if (!process.env.TS_NODE_PROJECT) {
  process.env.TS_NODE_PROJECT = path.join(__dirname, "..", "tsconfig.json");
}

require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    esModuleInterop: true,
  },
});
require("tsconfig-paths/register");
require("./seed-essential.ts");
