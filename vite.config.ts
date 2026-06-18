import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('@react-google-maps')) return 'vendor-maps';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor';
          }
          if (id.includes('components/AdminDashboard')) return 'admin';
          if (id.includes('components/CommunityPage')) return 'community';
          if (id.includes('components/VideoSection') || id.includes('components/VideoGridPage') || id.includes('components/VideoDetail')) return 'videos';
          if (id.includes('components/PhotoGridPage') || id.includes('components/PhotoModal') || id.includes('components/PhotoMap')) return 'photos';
          if (id.includes('components/StoryGridPage') || id.includes('components/StoryDetail')) return 'stories';
        },
      },
    },
  },
});
