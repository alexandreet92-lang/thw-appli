// Durée en heures décimales → « 1h30 » (jamais « 1,5 h »). 0/négatif → « 0h00 ».
export function formatDuration(hours: number): string {
  if (!hours || hours <= 0) return '0h00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h${m.toString().padStart(2, '0')}`
}
