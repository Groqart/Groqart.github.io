// Frontend/vite.config.ts
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { defineConfig } from 'vite';
import { nexusbyteApiPlugin } from './src/server/viteApiPlugin';

export default defineConfig({
  plugins: [
    tailwindcss(),
    nexusbyteApiPlugin(),
    reactRouter(), // подключает возможности Remix / React Router
  ],
  define: {
    ...(process.env.VITE_API_URL?.includes('your-worker.workers.dev')
      ? { 'import.meta.env.VITE_API_URL': JSON.stringify('') }
      : {}),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || '.', './src'),
    },
  },
});
