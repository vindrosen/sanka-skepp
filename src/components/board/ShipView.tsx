import { useState } from 'react'
import { shipSprite } from '../../assets'
import type { PlacedShip } from '../../game/types'

interface ShipViewProps {
  ship: Pick<PlacedShip, 'id' | 'size' | 'row' | 'col' | 'orientation'>
  /** Spelas sänkningsanimationen? */
  sunk?: boolean
  /** Halvgenomskinlig förhandsvisning under drag. */
  ghost?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
}

/**
 * Ett fartyg ovanpå brädet. Positioneras i procent av brädets storlek så att
 * det skalar med brädet. Sprite-bilden är ritad horisontellt och roteras 90°
 * för vertikala fartyg (bredd i % av containern = fartygets längd i celler).
 */
export function ShipView({ ship, sunk = false, ghost = false, onPointerDown }: ShipViewProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const horizontal = ship.orientation === 'horizontal'
  const style: React.CSSProperties = {
    left: `${ship.col * 10}%`,
    top: `${ship.row * 10}%`,
    width: horizontal ? `${ship.size * 10}%` : '10%',
    height: horizontal ? '10%' : `${ship.size * 10}%`,
    touchAction: 'none',
  }

  return (
    <div
      className={`absolute z-10 ${sunk ? 'ship-sunk' : ''} ${ghost ? 'pointer-events-none opacity-60' : ''} ${
        onPointerDown ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      }`}
      style={style}
      onPointerDown={onPointerDown}
      data-ship={ship.id}
    >
      {imgFailed ? (
        // Reservutseende om spriten saknas: enkel skrovform.
        <div className="absolute inset-[8%] rounded-full border border-slate-400/60 bg-gradient-to-b from-slate-500 to-slate-700 shadow-lg" />
      ) : (
        <img
          src={shipSprite(ship.id)}
          alt=""
          draggable={false}
          onError={() => setImgFailed(true)}
          className={`select-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)] ${
            horizontal
              ? 'h-full w-full object-contain'
              : 'absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90'
          }`}
          style={horizontal ? undefined : { width: `${ship.size * 100}%` }}
        />
      )}
    </div>
  )
}
