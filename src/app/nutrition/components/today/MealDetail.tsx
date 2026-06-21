'use client'
// Détail dépliable d'un repas : pour CHAQUE aliment, nom, quantité/compte, P / L / G, kcal.
// Tap sur une ligne → feuille d'édition (rectification). Chiffres NEUTRES, var() only.
import { useState } from 'react'
import type { EditableFood } from './FoodEditSheet'

const FB = 'var(--font-body)'

export function MealDetail({ foods, onTapFood, onDeleteFood }: {
  foods: EditableFood[]
  onTapFood: (i: number) => void
  onDeleteFood: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  if (!foods.length) return null

  return (
    <div style={{ width: '100%' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }}><path d="M9 6l6 6-6 6" /></svg>
        <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>Détail</span>
        <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{foods.length} aliment{foods.length > 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'var(--space-1)' }}>
          <style>{`@keyframes thwFoodIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.thw-food-in{animation:none!important}}`}</style>
          {foods.map((f, i) => (
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
              <button onClick={() => onDeleteFood(i)} aria-label="Retirer" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
