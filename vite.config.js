import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // *** CRITICAL FIX FOR FIREBASE DEPLOYMENT ***
  // This tells the Vercel compiler (Rollup) to treat the Firebase
  // modules as external, which solves the 'failed to resolve import' error.
  build: {
    rollupOptions: {
      external: [
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        /^firebase\/.*/ // Catch all other firebase sub-modules
      ]
    }
  }
});