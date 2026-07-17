import { useState } from 'react'
import { asset } from '../../assets'

interface GameIconProps {
  /** Filnamn utan prefix/suffix, t.ex. "settings" → icon-settings.png. */
  name: string
  className?: string
  alt?: string
  /** Emoji som visas om bildfilen saknas. */
  fallback?: string
}

/** Genererad PNG-ikon med emoji-reserv om bilden saknas. */
export function GameIcon({ name, className = 'h-6 w-6', alt = '', fallback }: GameIconProps) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    if (!fallback) return null
    return (
      <span aria-hidden className={`inline-flex items-center justify-center leading-none ${className}`}>
        {fallback}
      </span>
    )
  }
  return (
    <img
      src={asset(`icon-${name}.png`)}
      alt={alt}
      aria-hidden={alt === ''}
      draggable={false}
      className={`select-none object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
