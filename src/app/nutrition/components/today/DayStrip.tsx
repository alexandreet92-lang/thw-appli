'use client'
// Frise des 6 derniers jours (aujourd'hui à droite). Chaque jour : abréviation + anneau
// de complétion kcal (part du target) avec la date au centre + % dessous. Jour actif =
// accent --primary. Clic → onSelect(date). SVG brut, tokens uniquement.
import { useDaysTotals } from '@/hooks/useDaysTotals'

const FB = 'var(--font-body)'

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function DayStrip({ today, selected, targetKcal, onSelect }: {
  today: string
  selected: string
  targetKcal: number
  onSelect: (date: string) => void
}) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(today, i - 5)) // ancien → aujourd'hui
  const totals = useDaysTotals(days)

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
      {days.map(d => {
        const kcal = totals[d] ?? 0
        const pct = targetKcal > 0 ? Math.min(kcal / targetKcal, 1) : 0
        const on = d === selected
        const dt = new Date(d + 'T00:00:00')
        const abbr = dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
        const dayNum = d.slice(8, 10)
        const size = 46, sw = 4, r = (size - sw) / 2, c = 2 * Math.PI * r
        return (
          <button key={d} onClick={() => onSelect(d)}
            style={{ flex: '1 0 auto', minWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-md)', background: on ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.15s' }}>
            <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'capitalize', color: on ? 'var(--primary)' : 'var(--text-dim)' }}>{abbr}</span>
            <div style={{ position: 'relative', width: size, height: size }}>
              <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card2)" strokeWidth={sw} />
                {pct > 0 && (
                  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={on ? 'var(--primary)' : 'var(--text-mid)'} strokeWidth={sw}
                    strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                )}
              </svg>
              <span className="tnum" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontSize: 14, fontWeight: 600, color: on ? 'var(--primary)' : 'var(--text)' }}>{dayNum}</span>
            </div>
            <span className="tnum" style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)' }}>{Math.round(pct * 100)}%</span>
          </button>
        )
      })}
    </div>
  )
}
