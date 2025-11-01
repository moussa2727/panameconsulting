// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-toastify'],
          'date-vendor': ['date-fns', 'date-fns/locale/fr', 'date-fns-tz'],
          // Admin chunk (lazy loaded)
          'admin': [
            './src/pages/admin/AdminDashboard.jsx',
            './src/pages/admin/UsersManagement.tsx',
            './src/pages/admin/AdminMessages.tsx',
            './src/pages/admin/AdminProfile.tsx',
            './src/pages/admin/AdminProcedure.tsx',
            './src/pages/admin/AdminDestinations.tsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'date-fns',
      'date-fns/locale/fr',
      'date-fns-tz'
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/events': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});