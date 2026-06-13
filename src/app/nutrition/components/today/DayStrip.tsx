'use client'
// Frise des 7 derniers jours = aujourd'hui + 6 précédents (aujourd'hui à droite, sélectionné
// par défaut). Chaque jour : abréviation + anneau de complétion kcal (part du target) avec la
// date au centre. Jour actif = accent --primary. Clic → onSelect(date). SVG brut, tokens.
// Les 7 jours tiennent dans la largeur (flex 1, pas de scroll horizontal).
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
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)) // 6 précédents → aujourd'hui
  const totals = useDaysTotals(days)

  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)', width: '100%', boxSizing: 'border-box' }}>
      {days.map(d => {
        const kcal = totals[d] ?? 0
        const pct = targetKcal > 0 ? Math.min(kcal / targetKcal, 1) : 0
        const on = d === selected
        const dt = new Date(d + 'T00:00:00')
        const abbr = dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
        const dayNum = d.slice(8, 10)
        const size = 38, sw = 3.5, r = (size - sw) / 2, c = 2 * Math.PI * r
        return (
          <button key={d} onClick={() => onSelect(d)}
            style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 2px', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-md)', background: on ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.15s', boxSizing: 'border-box' }}>
            <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'capitalize', color: on ? 'var(--primary)' : 'var(--text-dim)' }}>{abbr}</span>
            <div style={{ position: 'relative', width: size, height: size }}>
              <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card2)" strokeWidth={sw} />
                {pct > 0 && (
                  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={on ? 'var(--primary)' : 'var(--text-mid)'} strokeWidth={sw}
                    strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                )}
              </svg>
              <span className="tnum" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontSize: 13, fontWeight: 600, color: on ? 'var(--primary)' : 'var(--text)' }}>{dayNum}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
