import { defineConfig } from 'vite';
import { portfolioApiPlugin } from './server/devApiPlugin.js';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [portfolioApiPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
