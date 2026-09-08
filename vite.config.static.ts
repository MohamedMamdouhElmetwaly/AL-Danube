import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Static build configuration for GitHub Pages
export default defineConfig({
  base: '/AL-Danube/',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/*',
          dest: 'cesium'
        }
      ]
    })
  ],
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
  define: {
    // Cesium requires this
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});
