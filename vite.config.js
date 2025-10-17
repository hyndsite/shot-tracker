import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png'],
      manifest: {
        name: 'Shot Tracker',
        short_name: 'ShotTracker',
        description: 'Offline eFG% shot logging with goals, charts, and heatmaps.',
        theme_color: '#0f172a',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        clientsClaim: true,
        skipWaiting: true   // 👈 make new SW take control immediately
      },
      devOptions: { enabled: true }
    })
  ]
})
