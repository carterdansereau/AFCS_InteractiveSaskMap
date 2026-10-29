import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages (/<repo>/) and inside a WordPress iframe.
export default defineConfig({
  base: './',
  // MapLibre alone is ~1 MB minified; that is expected for a map app.
  build: { chunkSizeWarningLimit: 1500 },
});
