interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/** Av/på-reglage i inställningarna. */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-13 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${
        checked
          ? 'border-[var(--neon)] bg-[var(--neon)]/40 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
          : 'border-[var(--panel-border)] bg-black/25'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5.5 w-5.5 rounded-full transition-all duration-200 ${
          checked ? 'left-6.5 bg-[var(--neon-strong)]' : 'left-0.5 bg-[var(--muted)]'
        }`}
      />
    </button>
  )
}
