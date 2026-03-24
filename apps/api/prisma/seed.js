const path = require("path");

const argv = process.argv.slice(2);
if (argv.includes("--legacy")) {
  delete process.env.SEED_ORCHESTRATED;
} else if (argv.includes("--orchestrated")) {
  process.env.SEED_ORCHESTRATED = "1";
}

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
require("./seed.ts");
