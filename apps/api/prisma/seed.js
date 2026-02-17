require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    esModuleInterop: true,
  },
});
require("tsconfig-paths/register");
require("./seed.ts");
