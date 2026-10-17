import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.replaceAll('\\', '/').includes('/node_modules/three/')) return 'vendor-three';
          if (
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(
              id.replaceAll('\\', '/'),
            )
          )
            return 'vendor-react';
          if (
            /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(
              id.replaceAll('\\', '/'),
            )
          )
            return 'vendor-motion';
          if (id.includes('lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    fs: {
      // Preserve Vite's default exclusions and keep server-only source private.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/src/app/**', '**/server/**'],
    },
  },
});
