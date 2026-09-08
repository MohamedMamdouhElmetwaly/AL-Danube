import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Simple plugin to copy Cesium files
function copyCesiumAssets() {
  return {
    name: 'copy-cesium',
    closeBundle() {
      const cesiumSource = resolve(__dirname, 'node_modules/cesium/Build/Cesium');
      const cesiumDest = resolve(__dirname, 'dist/static/cesium');
      
      function copyDir(src: string, dest: string) {
        mkdirSync(dest, { recursive: true });
        const entries = readdirSync(src);
        
        for (const entry of entries) {
          const srcPath = join(src, entry);
          const destPath = join(dest, entry);
          
          if (statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      }
      
      copyDir(cesiumSource, cesiumDest);
      console.log('✓ Cesium assets copied');
    }
  };
}

// Static build configuration for GitHub Pages
export default defineConfig({
  base: '/AL-Danube/',
  plugins: [
    react(),
    copyCesiumAssets()
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
