'use client'
// Résumé calculé d'une séance ENDURANCE (hors tapis) depuis ses blocs : durée
// totale, distance (km — ou m pour la natation), allure (min/km, course) ou
// vitesse (km/h, vélo/aviron/elliptique) ou /100m (natation), et dénivelé si
// renseigné. Marche pour les blocs saisis à la main OU générés par l'IA.
import { useMemo } from 'react'
import { totalMin, totalDistance, type MBlock } from '@/components/planning/mobile/blocks'

type Kind = 'run' | 'bike' | 'swim' | 'rowing' | 'elliptique'

function fmtPace(secPerUnit: number): string {
  if (!isFinite(secPerUnit) || secPerUnit <= 0) return '—'
  const s = Math.round(secPerUnit)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function EnduranceStats({ blocks, sport, denivM }: { blocks: MBlock[]; sport: Kind; denivM: number }) {
  const data = useMemo(() => {
    const min = totalMin(blocks)
    const distM = totalDistance(blocks)
    return { min, distM }
  }, [blocks])

  if (data.min <= 0 && data.distM <= 0) return null
  const { min, distM } = data
  const durS = min * 60
  const km = distM / 1000

  // Métrique de rythme selon le sport
  let paceLabel = '', paceValue = '—'
  if (sport === 'run') { paceLabel = 'Allure'; paceValue = km > 0 ? `${fmtPace(durS / km)}/km` : '—' }
  else if (sport === 'swim') { paceLabel = 'Allure'; paceValue = distM > 0 ? `${fmtPace(durS / (distM / 100))}/100m` : '—' }
  else { paceLabel = 'Vitesse'; paceValue = durS > 0 && km > 0 ? `${(km / (durS / 3600)).toFixed(1).replace('.', ',')} km/h` : '—' }

  const distDisplay = sport === 'swim'
    ? `${Math.round(distM)} m`
    : `${km.toFixed(2).replace('.', ',')} km`

  const cells: { label: string; value: string }[] = [
    { label: 'Durée', value: `${Math.round(min)} min` },
    { label: 'Distance', value: distDisplay },
    { label: paceLabel, value: paceValue },
  ]
  if (denivM > 0) cells.push({ label: 'Dénivelé +', value: `${denivM} m` })

  return (
    <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card2)', borderRadius: 14, padding: 14, marginTop: 4 }}>
      {cells.map(c => (
        <div key={c.label} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mid)', marginTop: 2 }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}
