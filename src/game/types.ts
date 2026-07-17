/** Grundläggande speltyper som delas av logik, AI och UI. */

/** Identifierare för de fem fartygstyperna. */
export type ShipId = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'torpedoboat'

/** Riktning ett fartyg ligger i på brädet. */
export type Orientation = 'horizontal' | 'vertical'

/** En cellposition på brädet (0-indexerad). */
export interface Coord {
  row: number
  col: number
}

/** Definition av en fartygstyp (statisk data). */
export interface ShipDef {
  id: ShipId
  size: number
}

/** Ett fartyg som placerats på ett bräde. */
export interface PlacedShip {
  id: ShipId
  size: number
  row: number
  col: number
  orientation: Orientation
  /** Vilka av fartygets celler (index 0..size-1) som träffats. */
  hits: boolean[]
}

/** Tillstånd för en cell sett från motståndarens sida. */
export type ShotResult = 'miss' | 'hit' | 'sunk'

/** Vad ett skott mot en cell resulterade i, för brädets historik. */
export type CellMark = 'none' | 'miss' | 'hit'

/** Ett spelbräde: placerade fartyg + alla skott som avlossats mot det. */
export interface BoardState {
  ships: PlacedShip[]
  /** shots[row][col] – vad som hänt med cellen. 'hit' inkluderar sänkta fartygs celler. */
  shots: CellMark[][]
}

/** Resultatet av att skjuta mot en cell. */
export interface FireOutcome {
  result: ShotResult
  /** Fartyget som träffades (även vid sänkning). */
  ship?: PlacedShip
  /** Satt när skottet sänkte fartyget. */
  sunkShip?: PlacedShip
  /** True när samtliga fartyg på brädet är sänkta. */
  allSunk: boolean
}

/** AI:ns svårighetsgrader. */
export type Difficulty = 'easy' | 'medium' | 'hard'

/** Spelläge: mot datorn eller två spelare på samma enhet. */
export type GameMode = 'vsAi' | 'twoPlayer'
