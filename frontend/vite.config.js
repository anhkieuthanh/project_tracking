import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  },
  server: {
    port: 5173,
    proxy: {
      '/tasks': 'http://localhost:4000',
      '/reports': 'http://localhost:4000',
      '/employees': 'http://localhost:4000',
      '/ai-projects': 'http://localhost:4000'
    }
  }
});
