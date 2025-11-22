import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Copy PWA files to dist
    {
      name: 'pwa-files',
      apply: 'build',
      enforce: 'post',
      generateBundle() {
        const publicDir = path.resolve(__dirname, 'public');
        const files = ['manifest.json', 'offline.html'];

        files.forEach((file) => {
          const filePath = path.join(publicDir, file);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.emitFile({
              type: 'asset',
              fileName: file,
              source: content,
            });
          }
        });
      },
    },
    // Service worker will be built by Vite's TS compilation
  ],
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        sw: path.resolve(__dirname, 'src/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.replit.dev',
      process.env.REPLIT_DOMAIN || '',
    ].filter(Boolean),
  },
});
