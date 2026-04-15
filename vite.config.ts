import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-512.png', 'dicts/en.json', 'dicts/es.json'],
      manifest: {
        name: 'Caliche Scrabble',
        short_name: 'Caliche Scrabble',
        description: 'Anagram practice app — EN & ES',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Cache app shell + all static assets
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Runtime cache for large dictionary files
        runtimeCaching: [
          {
            urlPattern: /\/dicts\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dictionaries',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
})
