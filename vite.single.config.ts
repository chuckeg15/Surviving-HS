/**
 * Single-file build. Produces one JS chunk with every dynamic import inlined,
 * which tools/bundle.mjs then folds into a standalone .html. The game has no
 * image, audio or font assets — all of it is generated at runtime — so a
 * self-contained single file is genuinely possible rather than a fudge.
 */
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2022',
    outDir: 'dist-single',
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: { inlineDynamicImports: true, entryFileNames: 'game.js' },
    },
  },
});
