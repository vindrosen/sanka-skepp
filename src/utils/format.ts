/** Formaterar millisekunder som mm:ss. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Formaterar en kvot som heltalsprocent, t.ex. 0.678 → "68%". */
export function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return '–'
  return `${Math.round((numerator / denominator) * 100)}%`
}
