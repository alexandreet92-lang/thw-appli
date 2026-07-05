'use client'
// Frise des jours, PAGINÉE par 7 : une page = 7 jours, aujourd'hui à droite de la
// page courante (donc TOUJOURS visible par défaut). Défilement fixe (snap) par
// pages de 7 jours, AVEC animation de glissement : glissement au doigt (mobile,
// sans flèches) + flèches (ordinateur). Chaque jour : anneau à 3 segments colorés
// (protéines = rouge, glucides = vert, lipides = jaune), longueur = part du target
// kcal. SVG brut, tokens.
import { useEffect, useRef, useState } from 'react'
import { useDaysTotals } from '@/hooks/useDaysTotals'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

const FB = 'var(--font-body)'
const PAGE = 7

// Couleurs des segments (mapping demandé) : prot=rouge, gluc=vert, lip=jaune.
const SEG = [
  { key: 'prot' as const, color: 'var(--macro-prot)', kcalPerG: 4 }, // rouge
  { key: 'gluc' as const, color: 'var(--macro-lip)',  kcalPerG: 4 }, // vert
  { key: 'lip'  as const, color: 'var(--macro-gluc)', kcalPerG: 9 }, // jaune
]

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  // Format LOCAL (toISOString = UTC → décalerait d'un jour en France).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function DayStrip({ today, selected, targetKcal, onSelect }: {
  today: string
  selected: string
  targetKcal: number
  onSelect: (date: string) => void
}) {
  const { t: tr } = useI18n()
  const [page, setPage] = useState(0)         // 0 = semaine courante ; négatif = plus ancien
  const [dir, setDir] = useState<'l' | 'r'>('r')
  const [isDesktop, setIsDesktop] = useState(false)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const anchor = addDays(today, page * PAGE)
  const days = Array.from({ length: PAGE }, (_, i) => addDays(anchor, i - (PAGE - 1)))
  const totals = useDaysTotals(days)

  const prev = () => { setDir('l'); setPage(p => p - 1) }                         // 7 jours plus tôt → glisse depuis la gauche
  const next = () => { if (page < 0) { setDir('r'); setPage(p => Math.min(0, p + 1)) } } // 7 jours plus tard → glisse depuis la droite

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx > 40) prev()
    else if (dx < -40) next()
  }

  const arrowBtn = (disabled: boolean): React.CSSProperties => ({
    flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)',
    background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{`
        @keyframes dsR { from { transform: translateX(34px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes dsL { from { transform: translateX(-34px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        .ds-r { animation: dsR 280ms cubic-bezier(0.32,0.72,0,1) }
        .ds-l { animation: dsL 280ms cubic-bezier(0.32,0.72,0,1) }
        @media (prefers-reduced-motion: reduce) { .ds-r, .ds-l { animation: none } }
      `}</style>

      {isDesktop && (
        <button type="button" aria-label={tr('nutrition.dayStrip.prev7')} onClick={prev} style={arrowBtn(false)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      )}

      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div key={page} className={dir === 'r' ? 'ds-r' : 'ds-l'} style={{ display: 'flex', gap: 'var(--space-1)', width: '100%' }}>
          {days.map(d => {
            const t = totals[d] ?? { kcal: 0, prot: 0, gluc: 0, lip: 0 }
            const pct = targetKcal > 0 ? Math.min(t.kcal / targetKcal, 1) : 0
            const on = d === selected
            const isToday = d === today
            const dt = new Date(d + 'T00:00:00')
            const abbr = dt.toLocaleDateString(currentLocale(), { weekday: 'short' }).replace('.', '')
            const dayNum = d.slice(8, 10)
            const size = 38, sw = 3.5, r = (size - sw) / 2, c = 2 * Math.PI * r
            const filled = pct * c
            const macroKcal = SEG.map(s => t[s.key] * s.kcalPerG)
            const macroTotal = macroKcal.reduce((a, b) => a + b, 0)
            let acc = 0
            const segs = SEG.map((s, i) => {
              const len = macroTotal > 0 ? filled * (macroKcal[i] / macroTotal) : 0
              const off = acc; acc += len
              return { color: s.color, len, off }
            })
            return (
              <button key={d} type="button" onClick={() => onSelect(d)}
                style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 2px', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-md)', background: on ? 'var(--primary-dim)' : 'transparent', transition: 'background 0.15s', boxSizing: 'border-box' }}>
                <span style={{ fontFamily: FB, fontSize: 10, fontWeight: isToday ? 700 : 600, textTransform: 'capitalize', color: on ? 'var(--primary)' : isToday ? 'var(--text)' : 'var(--text-dim)' }}>{abbr}</span>
                <div style={{ position: 'relative', width: size, height: size }}>
                  <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card2)" strokeWidth={sw} />
                    {macroTotal > 0 && segs.map((seg, i) => seg.len > 0 && (
                      <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
                        strokeDasharray={`${seg.len} ${c - seg.len}`} strokeDashoffset={-seg.off}
                        style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }} />
                    ))}
                  </svg>
                  <span className="tnum" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontSize: 13, fontWeight: isToday ? 700 : 600, color: on ? 'var(--primary)' : 'var(--text)' }}>{dayNum}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {isDesktop && (
        <button type="button" aria-label={tr('nutrition.dayStrip.next7')} onClick={next} disabled={page >= 0} style={arrowBtn(page >= 0)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}
    </div>
  )
}
