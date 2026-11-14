// Frontend/vite.config.ts
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(), // подключает возможности Remix / React Router
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || '.', './src'),
    },
  },
});
