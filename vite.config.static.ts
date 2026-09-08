import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';

// Static build configuration for GitHub Pages
export default defineConfig({
  base: '/AL-Danube/',
  plugins: [react()],
  css: { 
    postcss: { 
      plugins: [tailwindcss()] 
    } 
  },
  build: {
    outDir: 'dist/static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
