import { useState } from 'react'
import { asset } from '../../assets'
import type { Coord } from '../../game/types'

/** Sprite-bild som döljer sig själv om filen saknas (CSS-fallback finns alltid). */
function FxImage({ name, className }: { name: string; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={asset(`${name}.png`)}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => setFailed(true)}
      className={`pointer-events-none select-none object-contain ${className}`}
    />
  )
}

/** Placerar ett effektlager över en viss cell (i procent av brädet). */
function cellStyle(cell: Coord, scale = 1): React.CSSProperties {
  const pad = ((scale - 1) * 10) / 2
  return {
    left: `${cell.col * 10 - pad}%`,
    top: `${cell.row * 10 - pad}%`,
    width: `${10 * scale}%`,
    height: `${10 * scale}%`,
  }
}

/** Explosion vid träff – spelas en gång per skott. */
export function ExplosionFx({ cell, big = false }: { cell: Coord; big?: boolean }) {
  return (
    <div className="pointer-events-none absolute z-30" style={cellStyle(cell, big ? 2.6 : 1.9)}>
      <div className={`absolute inset-0 ${big ? 'fx-big-explosion' : 'fx-explosion'}`}>
        <FxImage name="fx-explosion" className="h-full w-full" />
        <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(255,236,160,0.95)_0%,rgba(251,146,60,0.85)_38%,rgba(220,38,38,0.5)_62%,transparent_78%)]" />
      </div>
    </div>
  )
}

/** Vattenstänk + ringar vid miss – spelas en gång per skott. */
export function SplashFx({ cell }: { cell: Coord }) {
  return (
    <div className="pointer-events-none absolute z-30" style={cellStyle(cell, 2)}>
      <div className="fx-splash absolute inset-0">
        <FxImage name="fx-splash" className="h-full w-full" />
      </div>
      <div className="fx-ripple absolute inset-[18%]" />
      <div className="fx-ripple fx-ripple--late absolute inset-[18%]" />
    </div>
  )
}

/** Kvarliggande eldglöd i en träffad cell. */
export function FireFx({ cell }: { cell: Coord }) {
  return (
    <div className="pointer-events-none absolute z-20" style={cellStyle(cell)}>
      <div className="fx-fire absolute inset-[12%]" />
    </div>
  )
}

/** Missmarkör som ligger kvar. */
export function MissFx({ cell }: { cell: Coord }) {
  return (
    <div className="pointer-events-none absolute z-20" style={cellStyle(cell)}>
      <div className="miss-dot absolute inset-[32%]" />
    </div>
  )
}

/** Rök som stiger från en sänkt fartygscell. */
export function SmokeFx({ cell, delayed = false }: { cell: Coord; delayed?: boolean }) {
  return (
    <div className="pointer-events-none absolute z-30" style={cellStyle(cell, 1.4)}>
      <div className={`fx-smoke absolute inset-[20%] ${delayed ? 'fx-smoke--slow' : ''}`} />
    </div>
  )
}
