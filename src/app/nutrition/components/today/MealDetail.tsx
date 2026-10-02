'use client'
// Détail dépliable d'un repas : pour CHAQUE aliment, nom, quantité/compte, P / L / G, kcal.
// Tap sur une ligne → feuille d'édition (rectification). Chiffres NEUTRES, var() only.
import { useState } from 'react'
import type { EditableFood } from './FoodEditSheet'
import type { MealCourse } from '@/hooks/useDailyMeals'
import { useI18n } from '@/lib/i18n'
import { useNarrow } from '@/lib/hooks/useNarrow'

const FB = 'var(--font-body)'
const COURSE_ORDER: { key: MealCourse; label: string }[] = [
  { key: 'entree', label: 'Entrée' },
  { key: 'plat', label: 'Plat' },
  { key: 'dessert', label: 'Dessert' },
]

export function MealDetail({ foods, grouped, onTapFood, onDeleteFood }: {
  foods: EditableFood[]
  /** Déj/dîner : grouper par sous-section Entrée · Plat · Dessert. */
  grouped?: boolean
  onTapFood: (i: number) => void
  onDeleteFood: (i: number) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const mobile = useNarrow(767)
  if (!foods.length) return null

  // Mobile : liste groupée (fond gris doux, filets), ligne ≥ 52 px, retrait 44 px.
  function mrow(f: EditableFood, i: number, first: boolean) {
    return (
      <div key={i} className="thw-food-in" style={{ animation: 'thwFoodIn 0.28s ease both', position: 'relative', display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
        {!first && <span aria-hidden style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, background: 'var(--border)' }} />}
        <button onClick={() => onTapFood(i)} style={{ flex: 1, minWidth: 0, minHeight: 52, padding: '10px 0 10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: FB }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}{f.qty ? <span className="tnum" style={{ fontWeight: 400, color: 'var(--text-mid)' }}> · {f.qty} {f.unit}</span> : null}
            </span>
            <span className="tnum" style={{ fontSize: 14, color: 'var(--text-mid)', flexShrink: 0 }}>{f.kcal} kcal</span>
          </div>
          <div className="tnum" style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>P {f.prot} · G {f.gluc} · L {f.lip} g</div>
        </button>
        <button onClick={() => onDeleteFood(i)} aria-label={t('nutrition.common.remove')} style={{ width: 44, height: 44, flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    )
  }

  function row(f: EditableFood, i: number) {
    return (
      <div key={i} className="thw-food-in" style={{ animation: 'thwFoodIn 0.28s ease both', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%' }}>
        <button onClick={() => onTapFood(i)} style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
            <span style={{ flex: 1, minWidth: 0, fontFamily: FB, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}{f.qty ? <span className="tnum" style={{ color: 'var(--text-dim)' }}> · {f.qty} {f.unit}</span> : null}
            </span>
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', flexShrink: 0 }}>{f.kcal} kcal</span>
          </div>
          <div className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>P {f.prot} · G {f.gluc} · L {f.lip} g</div>
        </button>
        <button onClick={() => onDeleteFood(i)} aria-label={t('nutrition.common.remove')} style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    )
  }

  // Indices conservés (callbacks par index) en groupant par sous-section.
  const indexed = foods.map((f, i) => ({ f, i }))
  const groups = grouped
    ? COURSE_ORDER
        .map(c => ({ key: c.key, items: indexed.filter(({ f }) => (f.course ?? 'plat') === c.key) }))
        .filter(g => g.items.length)
    : null

  if (mobile) {
    const anim = <style>{`@keyframes thwFoodIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.thw-food-in{animation:none!important}}`}</style>
    return (
      <div style={{ width: '100%', fontFamily: FB }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FB }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('nutrition.detail.label')}</span>
          <span className="tnum" style={{ fontSize: 15, color: 'var(--text-mid)', flex: 1 }}>{foods.length} {t(foods.length > 1 ? 'nutrition.detail.foods' : 'nutrition.detail.food')}</span>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }}><path d="M9 6l6 6-6 6" /></svg>
        </button>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {anim}
            {groups
              ? groups.map(g => (
                  <div key={g.key}>
                    <p style={{ margin: '0 0 6px 4px', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{t(`nutrition.course.${g.key}`)}</p>
                    <div style={{ background: 'var(--surface-chip)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                      {g.items.map(({ f, i }, k) => mrow(f, i, k === 0))}
                    </div>
                  </div>
                ))
              : (
                <div style={{ background: 'var(--surface-chip)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  {foods.map((f, i) => mrow(f, i, i === 0))}
                </div>
              )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }}><path d="M9 6l6 6-6 6" /></svg>
        <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>{t('nutrition.detail.label')}</span>
        <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{foods.length} {t(foods.length > 1 ? 'nutrition.detail.foods' : 'nutrition.detail.food')}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'var(--space-1)' }}>
          <style>{`@keyframes thwFoodIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.thw-food-in{animation:none!important}}`}</style>
          {groups
            ? groups.map(g => (
                <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginTop: 2 }}>{t(`nutrition.course.${g.key}`)}</span>
                  {g.items.map(({ f, i }) => row(f, i))}
                </div>
              ))
            : foods.map((f, i) => row(f, i))}
        </div>
      )}
    </div>
  )
}
