/**
 * Efterbehandlar de AI-genererade bilderna i assets/generated (råkällor)
 * till optimerade webp/png i public/. Körs med: node tools/process-images.mjs
 *
 * - Fartyg: trimmar transparenta kanter (viktigt för att spriten ska fylla
 *   sina celler på brädet) och konverterar till webp.
 * - Ikoner/effekter: trimmar, skalar ned och konverterar till webp.
 * - Bakgrunder: skalar ned och konverterar till webp.
 * - Appikon: genererar pwa-192/512 samt maskable-variant med safe zone.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'assets/generated'
const OUT = 'public/assets/generated'

const SHIPS = ['ship-carrier', 'ship-battleship', 'ship-cruiser', 'ship-submarine', 'ship-torpedoboat']
const ICONS = [
  'icon-explosion', 'icon-miss', 'icon-radar', 'icon-sonar', 'icon-settings', 'icon-stats',
  'icon-trophy', 'icon-medal', 'icon-sound', 'icon-music', 'icon-back', 'icon-home',
]
const FX = ['fx-explosion', 'fx-splash', 'fx-smoke', 'fx-fire']
const BGS = ['bg-menu', 'bg-ocean-day', 'bg-ocean-night', 'bg-storm', 'bg-fog']

await mkdir(OUT, { recursive: true })

const src = (name) => path.join(SRC, `${name}.png`)
const out = (name) => path.join(OUT, `${name}.webp`)

for (const name of SHIPS) {
  // Spelet förväntar sig liggande sprites; rotera de som genererats stående.
  const trimmed = await sharp(src(name)).trim({ threshold: 12 }).png().toBuffer()
  const meta = await sharp(trimmed).metadata()
  let pipeline = sharp(trimmed)
  if ((meta.height ?? 0) > (meta.width ?? 1)) pipeline = pipeline.rotate(90)
  await pipeline
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(out(name))
  console.log('ship ok:', name)
}

for (const name of ICONS) {
  await sharp(src(name))
    .trim({ threshold: 12 })
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(out(name))
  console.log('icon ok:', name)
}

for (const name of FX) {
  await sharp(src(name))
    .trim({ threshold: 12 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toFile(out(name))
  console.log('fx ok:', name)
}

for (const name of BGS) {
  await sharp(src(name))
    .resize({ width: name === 'bg-menu' ? 1536 : 1280, withoutEnlargement: true })
    .webp({ quality: name === 'bg-menu' ? 84 : 76 })
    .toFile(out(name))
  console.log('bg ok:', name)
}

// PWA-ikoner (PNG krävs för bäst kompatibilitet i manifestet).
await sharp(src('appicon')).resize(192, 192).png().toFile('public/pwa-192.png')
await sharp(src('appicon')).resize(512, 512).png().toFile('public/pwa-512.png')

// Maskable: ikonen skalas till 80 % ovanpå marinblå platta (safe zone).
const inner = await sharp(src('appicon')).resize(410, 410).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#050e1f' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile('public/pwa-512-maskable.png')

console.log('PWA-ikoner klara')
