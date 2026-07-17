import type { ShipDef } from './types'

/** Brädet är alltid 10×10. */
export const BOARD_SIZE = 10

/** De fem fartygen i klassiskt Sänka Skepp, största först. */
export const SHIP_DEFS: readonly ShipDef[] = [
  { id: 'carrier', size: 5 },
  { id: 'battleship', size: 4 },
  { id: 'cruiser', size: 3 },
  { id: 'submarine', size: 3 },
  { id: 'torpedoboat', size: 2 },
] as const

/** Radetiketter A–J som i klassiska spelet. */
export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const
