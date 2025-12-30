import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy diagram libraries - lazy loaded
          'vendor-tldraw': ['tldraw'],
          'vendor-mermaid': ['mermaid'],
          // Charts for dashboard
          'vendor-charts': ['recharts'],
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI utilities
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HomeTracker',
        short_name: 'HomeTracker',
        description: 'Complete home management solution - track inventory, manage projects, schedule maintenance',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ],
        categories: ["productivity", "utilities"],
        screenshots: [],
        shortcuts: [
          {
            name: "Add Item",
            short_name: "Add Item",
            description: "Quickly add a new inventory item",
            url: "/items?action=add",
            icons: [{ "src": "/icon-192x192.svg", "sizes": "192x192" }]
          },
          {
            name: "Add Maintenance",
            short_name: "Add Maintenance",
            description: "Schedule a maintenance task",
            url: "/maintenance?action=add",
            icons: [{ "src": "/icon-192x192.svg", "sizes": "192x192" }]
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB limit for large bundles
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    strictPort: true,
    host: true, // Listen on all interfaces (0.0.0.0) for LAN access
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
