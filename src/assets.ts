import type { ShipId } from './game/types'

/** Bygger sökvägen till en genererad bild i public/assets/generated. */
export function asset(name: string): string {
  return `${import.meta.env.BASE_URL}assets/generated/${name}`
}

/** Sprite ovanifrån för varje fartygstyp. */
export function shipSprite(id: ShipId): string {
  return asset(`ship-${id}.png`)
}
