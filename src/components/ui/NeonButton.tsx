import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger'
  size?: 'md' | 'lg' | 'sm'
  children: ReactNode
}

/** Standardknappen i spelet: glas + neonram, tre varianter. */
export function NeonButton({ variant = 'default', size = 'md', className = '', children, ...rest }: NeonButtonProps) {
  const variantClass =
    variant === 'primary' ? 'neon-btn--primary' : variant === 'danger' ? 'neon-btn--danger' : ''
  const sizeClass =
    size === 'lg' ? 'px-6 py-3.5 text-lg' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-5 py-2.5 text-base'
  return (
    <button type="button" className={`neon-btn ${variantClass} ${sizeClass} ${className}`} {...rest}>
      {children}
    </button>
  )
}
