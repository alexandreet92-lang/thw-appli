'use client'
// Profil d'intensité Running — lecture seule (même langage visuel que le
// SessionEditor : barres par zone Z1-Z7). SVG brut, couleurs = tokens de zone.
import type { Seance, Bloc, Zone } from '@/data/seances/running'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export const ZONE_TOKEN: Record<Zone, string> = {
  Z1: 'var(--zone-1)', Z2: 'var(--zone-2)', Z3: 'var(--zone-3)', Z4: 'var(--zone-4)',
  Z5: 'var(--zone-5)', Z6: 'var(--zone-6)', Z7: 'var(--zone-7)',
}
export const ZONE_LABEL: Record<Zone, string> = {
  Z1: 'Récup', Z2: 'EF', Z3: 'Tempo', Z4: 'Seuil', Z5: 'VO2max', Z6: 'Anaérobie', Z7: 'Sprint',
}
const ZONE_HEIGHT: Record<Zone, number> = { Z1: 14, Z2: 26, Z3: 40, Z4: 56, Z5: 72, Z6: 84, Z7: 96 }
// Allure de référence schématique (s/km) par zone — durée d'un bloc distance.
const REF_PACE: Record<Zone, number> = { Z1: 400, Z2: 340, Z3: 300, Z4: 270, Z5: 240, Z6: 220, Z7: 200 }

interface Bar { zone: Zone; durationSec: number; effort: boolean }

function blocDureeSec(zone: Zone, dureeSec?: number, distanceM?: number): number {
  if (dureeSec) return dureeSec
  if (distanceM) return (distanceM / 1000) * REF_PACE[zone]
  return 0
}
function blocBars(b: Bloc): Bar[] {
  const reps = b.reps ?? 1
  const out: Bar[] = []
  for (let i = 0; i < reps; i++) {
    if (b.segments && b.segments.length) {
      // Set composite : une barre par segment (intensités entrelacées).
      for (const s of b.segments) {
        const d = blocDureeSec(s.zone, s.dureeSec, s.distanceM)
        if (d > 0) out.push({ zone: s.zone, durationSec: d, effort: true })
      }
    } else {
      const eff = blocDureeSec(b.zone, b.dureeSec, b.distanceM)
      if (eff > 0) out.push({ zone: b.zone, durationSec: eff, effort: true })
    }
    if (b.recup) {
      const r = blocDureeSec(b.recup.zone, b.recup.dureeSec, b.recup.distanceM)
      if (r > 0) out.push({ zone: b.recup.zone, durationSec: r, effort: false })
    }
  }
  return out
}
export function seanceBars(s: Seance): Bar[] { return s.blocs.flatMap(blocBars) }

// Zone dominante = zone d'effort du corps qui cumule le plus de temps.
export function zoneDominante(s: Seance): Zone {
  const acc = {} as Record<Zone, number>
  for (const b of s.blocs) {
    if (b.phase !== 'corps') continue
    const eff = blocDureeSec(b.zone, b.dureeSec, b.distanceM) * (b.reps ?? 1)
    acc[b.zone] = (acc[b.zone] ?? 0) + eff
  }
  const entries = Object.entries(acc) as [Zone, number][]
  if (!entries.length) return 'Z2'
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

export function RunProfil({ seance, full = false }: { seance: Seance; full?: boolean }) {
  const bars = seanceBars(seance)
  const total = bars.reduce((a, b) => a + b.durationSec, 0) || 1
  const H = full ? 88 : 38
  const GAP = 0.4
  const zonesPresentes = Array.from(new Set(bars.filter(b => b.effort).map(b => b.zone)))
    .sort((a, b) => ZONE_HEIGHT[a] - ZONE_HEIGHT[b])

  let x = 0
  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {bars.map((bar, i) => {
          const w = (bar.durationSec / total) * 100
          const h = (ZONE_HEIGHT[bar.zone] / 100) * (H - 2)
          const rect = (
            <rect key={i} x={x} y={H - h} width={Math.max(w - GAP, 0.4)} height={h} rx={1.2}
              fill={ZONE_TOKEN[bar.zone]} opacity={bar.effort ? 0.9 : 0.4} />
          )
          x += w
          return rect
        })}
      </svg>
      {full && zonesPresentes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          {zonesPresentes.map(z => (
            <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 10.5, color: 'var(--text-dim)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: ZONE_TOKEN[z] }} />
              {z} · {ZONE_LABEL[z]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Bandeau résumé : Durée · Intensité (zone dominante) · RPE.
export function ResumeBandeau({ seance }: { seance: Seance }) {
  const zd = zoneDominante(seance)
  const stats: { k: string; v: string }[] = [
    { k: 'Durée est.', v: `${seance.dureeEstimeeMin} min` },
    { k: 'Intensité', v: `${zd} · ${ZONE_LABEL[zd]}` },
    { k: 'RPE', v: `${seance.rpe}/10` },
  ]
  return (
    <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', padding: 'var(--space-4)',
      borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
      {stats.map(s => (
        <div key={s.k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{s.k}</span>
          <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s.v}</span>
        </div>
      ))}
    </div>
  )
}
