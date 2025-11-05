import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // *** CRITICAL FINAL FIX FOR FIREBASE MODULARITY ***
  // These settings force Vite to correctly treat the Firebase CJS modules 
  // during dependency pre-bundling and final bundling, which resolves the 
  // "Failed to resolve module specifier" error in the browser.
  optimizeDeps: {
    // Explicitly include Firebase paths for pre-bundling
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore']
  },
  build: {
    // Ensure CommonJS (Firebase) modules are handled correctly
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Ensure output is modern and ES module compatible
    target: 'esnext'
  },
});