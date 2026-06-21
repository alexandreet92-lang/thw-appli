'use client'

// Feuille « repas du jour » — ouverte depuis la jauge Calories par jour (Suivi).
// Bottom sheet animé (slide up à l'ouverture, slide down à la sortie). Pour chaque
// repas loggé ce jour-là : donut macro + photos à côté + liste des ingrédients ;
// puis le total de la journée. Lecture seule (le journal s'édite dans Aujourd'hui).

import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useDailyMeals, SLOT_LABELS, type MealSlotKey } from '@/hooks/useDailyMeals'
import { MacroDonut } from '../today/MacroDonut'
import { foodsOf } from '../today/mealJournalUtils'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function DayMealsSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { entries, loading } = useDailyMeals(date)
  const startY = useRef<number | null>(null)
  const [closing, setClosing] = useState(false)
  const requestClose = useCallback(() => { setClosing(true); setTimeout(onClose, 260) }, [onClose])

  const meals = entries
    .map(e => ({ entry: e, foods: foodsOf(e) }))
    .filter(m => m.foods.length > 0)

  const dayTotal = meals.reduce((a, m) => {
    const t = m.foods.reduce((s, f) => ({ kcal: s.kcal + f.kcal, prot: s.prot + f.prot, gluc: s.gluc + f.gluc, lip: s.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
    return { kcal: a.kcal + t.kcal, prot: a.prot + t.prot, gluc: a.gluc + t.gluc, lip: a.lip + t.lip }
  }, { kcal: 0, prot: 0, gluc: 0, lip: 0 })

  return createPortal(
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' /* design-allow-color: voile de modale standard */, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: `${closing ? 'fadeOutOverlay' : 'fadeInOverlay'} 260ms ease both` }} />
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { startY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (startY.current != null && e.changedTouches[0].clientY - startY.current > 60) requestClose() }}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1, margin: '0 auto', maxWidth: 560, maxHeight: '88vh',
          background: 'var(--bg-card)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', display: 'flex', flexDirection: 'column',
          animation: `${closing ? 'sheet-close' : 'sheet-open'} 280ms cubic-bezier(0.16,1,0.3,1) both` }}
      >
        <div style={{ padding: 'var(--space-4) var(--space-6) 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border)', margin: '0 auto var(--space-4)' }} />
          <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: 0, textTransform: 'capitalize' }}>{fmtDate(date)}</h2>
          {meals.length > 0 && (
            <p className="tnum" style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 var(--space-4)' }}>
              {Math.round(dayTotal.kcal)} kcal · P {Math.round(dayTotal.prot)} · G {Math.round(dayTotal.gluc)} · L {Math.round(dayTotal.lip)} g
            </p>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: 'var(--space-2) var(--space-6) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading && !entries.length ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
          ) : !meals.length ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>Aucun repas enregistré ce jour-là.</p>
          ) : meals.map(({ entry, foods }) => {
            const t = foods.reduce((s, f) => ({ kcal: s.kcal + f.kcal, prot: s.prot + f.prot, gluc: s.gluc + f.gluc, lip: s.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
            const photos = (entry.photos && entry.photos.length) ? entry.photos : (entry.photo_url ? [entry.photo_url] : [])
            return (
              <div key={entry.id ?? entry.meal_slot} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
                <div style={{ fontFamily: FD, fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-3)' }}>
                  {SLOT_LABELS[entry.meal_slot as MealSlotKey] ?? entry.meal_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <MacroDonut kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} size={84} />
                  {photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      {photos.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'block' }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'var(--space-3)' }}>
                  {foods.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: FB, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}{f.qty ? <span className="tnum" style={{ color: 'var(--text-dim)' }}> · {f.qty} {f.unit}</span> : null}
                      </span>
                      <span className="tnum" style={{ flexShrink: 0, fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{f.kcal} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
