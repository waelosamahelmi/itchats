import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'ItChats AI',
        short_name: 'ItChats',
        description: 'Camera-first AI social network',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/v1\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/itchats\.helmies\.fi\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 100, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    preserveSymlinks: true,
  },
  optimizeDeps: {
    include: [
      '@itchats/ui',
      '@itchats/contracts',
      '@itchats/validation',
      'react',
      'react-dom',
      'react-redux',
      'react-router-dom',
      '@reduxjs/toolkit',
      'redux',
      'immer',
      'reselect',
      'redux-thunk',
      'cookie',
      'set-cookie-parser',
      'scheduler',
      'use-sync-external-store',
      '@radix-ui/primitive',
      '@radix-ui/react-slot',
      '@radix-ui/react-compose-refs',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 3090,
    proxy: {
      '/v1': 'http://localhost:3092',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3090,
    allowedHosts: ['itchats.helmies.fi', '69.62.126.13', 'localhost'],
  },
});
