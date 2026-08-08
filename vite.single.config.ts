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
      // IIFE, not ESM. A <script type="module"> loaded from file:// carries a
      // null origin and browsers treat it far more strictly than a classic
      // script - which is how the downloaded copy ended up doing nothing on a
      // phone. A plain IIFE has none of that machinery to trip over.
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'game.js' },
    },
  },
});
