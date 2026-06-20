'use client'
// Frise des jours : aujourd'hui + jours précédents (aujourd'hui à droite, sélectionné
// par défaut). Chaque jour : abréviation + anneau dont les 3 segments colorés montrent
// la répartition macro consommée (protéines = rouge, glucides = vert, lipides = jaune),
// la longueur totale = part du target kcal atteinte. Défilement : au doigt (mobile) et
// par flèches (ordinateur). SVG brut, tokens.
import { useEffect, useRef, useState } from 'react'
import { useDaysTotals } from '@/hooks/useDaysTotals'

const FB = 'var(--font-body)'
const N_DAYS = 14

// Couleurs des segments (mapping demandé) : prot=rouge, gluc=vert, lip=jaune.
const SEG = [
  { key: 'prot' as const, color: 'var(--macro-prot)', kcalPerG: 4 }, // rouge
  { key: 'gluc' as const, color: 'var(--macro-lip)',  kcalPerG: 4 }, // vert
  { key: 'lip'  as const, color: 'var(--macro-gluc)', kcalPerG: 9 }, // jaune
]

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
  const days = Array.from({ length: N_DAYS }, (_, i) => addDays(today, i - (N_DAYS - 1)))
  const totals = useDaysTotals(days)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Démarre la frise calée tout à droite (aujourd'hui visible).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  function scrollBy(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  const arrowBtn: React.CSSProperties = {
    flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)',
    background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      {isDesktop && (
        <button type="button" aria-label="Jours précédents" onClick={() => scrollBy(-1)} style={arrowBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      )}

      <div
        ref={scrollRef}
        className="daystrip-scroll"
        style={{ display: 'flex', gap: 'var(--space-1)', overflowX: 'auto', flex: 1, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}
      >
        <style>{`.daystrip-scroll::-webkit-scrollbar{display:none}`}</style>
        {days.map(d => {
          const t = totals[d] ?? { kcal: 0, prot: 0, gluc: 0, lip: 0 }
          const pct = targetKcal > 0 ? Math.min(t.kcal / targetKcal, 1) : 0
          const on = d === selected
          const dt = new Date(d + 'T00:00:00')
          const abbr = dt.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
          const dayNum = d.slice(8, 10)
          const size = 38, sw = 3.5, r = (size - sw) / 2, c = 2 * Math.PI * r
          const filled = pct * c
          const macroKcal = SEG.map(s => t[s.key] * s.kcalPerG)
          const macroTotal = macroKcal.reduce((a, b) => a + b, 0)
          // Segments colorés : longueur = part macro × longueur remplie.
          let acc = 0
          const segs = SEG.map((s, i) => {
            const len = macroTotal > 0 ? filled * (macroKcal[i] / macroTotal) : 0
            const off = acc
            acc += len
            return { color: s.color, len, off }
          })
          return (
            <button key={d} type="button" onClick={() => onSelect(d)}
              style={{ flex: '0 0 auto', width: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 2px', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-md)', background: on ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.15s', boxSizing: 'border-box' }}>
              <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'capitalize', color: on ? 'var(--primary)' : 'var(--text-dim)' }}>{abbr}</span>
              <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                  <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card2)" strokeWidth={sw} />
                  {macroTotal > 0 && segs.map((seg, i) => seg.len > 0 && (
                    <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
                      strokeDasharray={`${seg.len} ${c - seg.len}`} strokeDashoffset={-seg.off}
                      style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }} />
                  ))}
                </svg>
                <span className="tnum" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontSize: 13, fontWeight: 600, color: on ? 'var(--primary)' : 'var(--text)' }}>{dayNum}</span>
              </div>
            </button>
          )
        })}
      </div>

      {isDesktop && (
        <button type="button" aria-label="Jours suivants" onClick={() => scrollBy(1)} style={arrowBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}
    </div>
  )
}
