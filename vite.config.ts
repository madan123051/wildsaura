import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('@firebase/auth') || id.includes('/firebase/auth/')) return 'firebase-auth';
            if (id.includes('@firebase/storage') || id.includes('/firebase/storage/')) return 'firebase-storage';
            if (
              id.includes('@firebase/firestore') ||
              id.includes('@firebase/webchannel-wrapper') ||
              id.includes('/firebase/firestore/')
            ) return 'firebase-firestore';
            if (id.includes('@firebase') || id.includes('/firebase/')) return 'firebase-core';
            if (id.includes('@react-google-maps')) return 'vendor-maps';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor';
          }
        },
      },
    },
  },
});
