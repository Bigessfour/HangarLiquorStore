import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ViteMcp } from 'vite-plugin-mcp';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  define: {
    global: 'globalThis',
  },
  plugins: [
    react(),
    ViteMcp({
      printUrl: true,
      updateConfig: 'cursor',
      updateConfigServerName: 'vite',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        id: '/',
        name: 'Hanger Liquor Store',
        short_name: 'Hanger',
        description: 'Inventory scanner + forecasts for Hanger Liquor Store, Wiley CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        background_color: '#1e2937',
        theme_color: '#d97706',
        orientation: 'portrait-primary',
        categories: ['business', 'productivity'],
        prefer_related_applications: false,
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});