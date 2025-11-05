import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add a server configuration to force a change and ensure Vercel sees an update
  server: {
    port: 3000 
  }
});