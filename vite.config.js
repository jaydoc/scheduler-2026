import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // *** CRITICAL FINAL FIX FOR FIREBASE MODULARITY ***
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