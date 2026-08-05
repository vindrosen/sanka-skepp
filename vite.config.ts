import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// En variabel bär origin och sub-path ihop, så de två aldrig kan drifta isär.
// Defaultvärdet är den riktiga adressen — en ren klon ska bygga rätt sajt
// utan att någon .env behöver finnas på servern.
const siteUrl = new URL(process.env.VITE_SITE_URL ?? 'https://everydayapps.se/app/sanka-skepp')
const basePath = `${siteUrl.pathname.replace(/\/+$/, '')}/`

// Umami. Taggen läggs bara in när båda värdena finns, så ett lokalt bygge
// utan variabler blir helt osparat.
const umamiUrl = (process.env.VITE_UMAMI_URL ?? '').replace(/\/+$/, '')
const umamiWebsiteId = process.env.VITE_UMAMI_WEBSITE_ID ?? ''

/** Lägger Umami-skriptet sist i <head> vid bygget. */
function umamiTag(): Plugin {
  return {
    name: 'sanka-skepp:umami-tag',
    transformIndexHtml() {
      if (!umamiUrl || !umamiWebsiteId) return
      return [
        {
          tag: 'script',
          injectTo: 'head' as const,
          attrs: {
            defer: true,
            src: `${umamiUrl}/script.js`,
            'data-website-id': umamiWebsiteId,
          },
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    umamiTag(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/generated/*.webp'],
      // Scopet är detsamma som basen. Explicit satt eftersom allt annat i
      // service workern hänger på det: Workbox suffixar cachenamnen med
      // registration.scope och rensar bara cachar som innehåller det egna
      // scopet. Blir scopet någon gång originets rot städar appen bort
      // varje syskonapps cache på everydayapps.se.
      scope: basePath,
      manifest: {
        // id, start_url och scope härleds ur basen i stället för att stå
        // som '.' eller '/' — en installerad app ska inte byta identitet
        // eller ta över hela originet om basen ändras.
        id: basePath,
        name: 'Sänka Skepp – Battle at Sea',
        short_name: 'Sänka Skepp',
        // Utan detta faller pluginet tillbaka på sitt default "en".
        lang: 'sv',
        description: 'Modernt Sänka Skepp med AI, statistik och prestationer.',
        theme_color: '#050e1f',
        background_color: '#050e1f',
        display: 'standalone',
        orientation: 'any',
        start_url: basePath,
        scope: basePath,
        icons: [
          { src: `${basePath}pwa-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${basePath}pwa-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${basePath}pwa-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // cacheId blir Workbox cache-prefix. Utan det heter cachen "workbox-…"
        // och är omöjlig att skilja från syskonapparnas i DevTools på det
        // delade originet.
        cacheId: 'sanka-skepp',
        // webp saknas här med flit. Bilderna i assets/generated kommer in via
        // includeAssets ovan, med riktiga revisionshashar. Låg man kvar dem i
        // globPatterns hamnade varje bild två gånger i precache-listan — en
        // gång utan revision (dontCacheBustURLsMatching matchar ^assets/) och
        // en gång med — och Workbox kastar
        // `add-to-cache-list-conflicting-entries` redan vid precacheAndRoute.
        // Hela service workern dog då innan den hann installeras.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
