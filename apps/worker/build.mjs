import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/main.js",
  external: [
    "bullmq", "ioredis", "sharp", "pg", "drizzle-orm",
    "@nestjs/*", "@itchats/*", "jsonwebtoken", "stripe",
  ],
  sourcemap: true,
  minify: false,
  banner: {
    js: `import { createRequire } from "module"; const require = createRequire(import.meta.url);`,
  },
});

console.log("Worker build completed!");
