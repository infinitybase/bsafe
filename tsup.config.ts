import { defineConfig } from 'tsup';

export default defineConfig({
  sourcemap: true,
  shims: true,
  treeshake: true,
  env: {},
  format: ['cjs', 'esm'],
  minify: true,
  entry: ['./src/library/index.ts'],
  dts: true,
  replaceNodeEnv: true,
});
