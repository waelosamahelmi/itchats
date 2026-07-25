import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/main.js",
  external: [
    "@nestjs/microservices",
    "@nestjs/websockets",
    "@nestjs/platform-express",
    "class-validator",
    "class-transformer",
    "@scarf/scarf",
    "mock-aws-s3",
    "aws-sdk",
    "nock",
    "argon2",
    "sharp",
    "pg-native",
    "better-sqlite3",
    "mysql2",
  ],
  sourcemap: true,
  minify: false,
  banner: {
    js: `import { createRequire } from "module"; const require = createRequire(import.meta.url);`,
  },
});

console.log("API build completed!");
