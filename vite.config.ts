import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (ordner: string): string => fileURLToPath(new URL(`./src/${ordner}`, import.meta.url));

// Auslieferung: https://backpferd.github.io/Zauberstaebe/
// Die Basis gilt auch für den Dev-Server (http://localhost:5173/Zauberstaebe/),
// damit Pfade lokal und live identisch funktionieren.
export default defineConfig({
  base: '/Zauberstaebe/',
  resolve: {
    // Muss zu "paths" in tsconfig.json passen.
    alias: {
      '@engine': src('engine'),
      '@game': src('game'),
      '@world': src('world'),
      '@models': src('models'),
      '@fx': src('fx'),
      '@ui': src('ui'),
      '@content': src('content'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js ist groß; die Warnung stört in der CI nur.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
