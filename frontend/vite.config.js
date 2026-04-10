import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/project-tracking/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  },
  server: {
    port: 5173,
    proxy: {
      '/project-tracking-api': {
        target: 'http://localhost:4000',
        rewrite: (path) => path.replace(/^\/project-tracking-api/, '')
      }
    }
  }
});
