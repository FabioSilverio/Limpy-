import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Limpy — Casa & calendário',
        short_name: 'Limpy',
        description:
          'Calendário, quadro tipo Trello e lembretes para afazeres de casa',
        theme_color: '#0d9488',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
      },
    }),
  ],
})
