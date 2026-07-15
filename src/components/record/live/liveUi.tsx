'use client'
// Petits éléments d'affichage partagés par les phases (nombres géants, nom d'exo,
// sous-titre). Encre héritée du parent (token -ink de la phase).
export function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function BigTime({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'min(30vw, 132px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 0.86, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{children}</p>
  )
}

export function BigName({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'min(13vw, 52px)', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 0.9, margin: 0 }}>{children}</p>
  )
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: '0.03em', textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>{children}</p>
  )
}

export function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginTop: 16, fontSize: 15, fontWeight: 800, opacity: 0.8, textAlign: 'center' }}>{children}</p>
  )
}
