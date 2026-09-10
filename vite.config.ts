import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: { sourcemap: true },
  server: {
    host: '127.0.0.1',
    fs: {
      // Preserve Vite's default exclusions and keep server-only source private.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/src/app/**', '**/server/**'],
    },
  },
});
