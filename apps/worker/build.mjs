import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/main.js",
  external: ["bullmq", "ioredis", "@scarf/scarf"],
  sourcemap: true,
  minify: false,
  banner: {
    js: `import { createRequire } from "module"; const require = createRequire(import.meta.url);`,
  },
  packages: "external",
});

console.log("Worker build completed!");
