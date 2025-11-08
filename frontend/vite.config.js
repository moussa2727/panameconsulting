// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Configuration CSS pour Tailwind v4
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks optimisés
          'react-vendor': [
            'react', 
            'react-dom', 
            'react-router-dom'
          ],
          'ui-vendor': [
            'lucide-react', 
            'react-toastify',
            '@headlessui/react',
            '@mantine/core',
            '@mantine/hooks'
          ],
          'utils-vendor': [
            'date-fns', 
            'date-fns/locale/fr',
            'axios',
            'zod',
            'jwt-decode'
          ],
          'animation-vendor': [
            'framer-motion',
            'aos'
          ],
          'charts-vendor': [
            'chart.js',
            'react-chartjs-2'
          ],
          // Admin chunk (lazy loaded)
          'admin': [
            './src/pages/admin/AdminDashboard.tsx',
            './src/pages/admin/UsersManagement.tsx',
            './src/pages/admin/AdminMessages.tsx',
            './src/pages/admin/AdminProfile.tsx',
            './src/pages/admin/AdminProcedure.tsx',
            './src/pages/admin/AdminDestinations.tsx',
            './src/pages/admin/AdminRendez-Vous.tsx'
          ]
        },
        // Optimisation des noms de fichiers
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.')[1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/css/i.test(extType)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // Optimisations de build
    chunkSizeWarningLimit: 800,
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: true,
    // Target moderne pour meilleures performances
    target: 'es2020'
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom', 
      'react-router-dom',
      'date-fns',
      'date-fns/locale/fr',
      'lucide-react',
      'react-toastify',
      // Pré-charger les dépendances UI critiques
      '@headlessui/react',
      '@mantine/core',
      '@mantine/hooks'
    ],
    exclude: [
      'date-fns-tz' // Exclure pour éviter les conflits
    ]
  },
  
  server: {
    port: 5173,
    host: true,
    open: true, // Ouvre le navigateur automatiquement
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    },
    // Watch optimisé pour le développement
    watch: {
      usePolling: false,
      interval: 100
    }
  },
  
  // Configuration de base
  base: '/',
  publicDir: 'public',
  
  // Pré-bundle optimisé
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  
  // Gestion des assets
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg']
});