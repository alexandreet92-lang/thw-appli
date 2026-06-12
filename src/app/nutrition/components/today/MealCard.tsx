'use client'
// Carte d'un repas REMPLI : toujours dépliée, NON repliable (aucun chevron de fermeture).
// Photo + macros + liste d'aliments (tap → feuille d'édition) + pastille note /10 + avis IA
// (shuriken). Actions compactes pour ajouter ; « Vider » démoté. Chiffres neutres, couleur
// uniquement sur les jauges de macros. Tokens uniquement, aucune lib.
import { MealMacros } from './MealMacros'
import { MealActions } from './MealActions'
import type { EditableFood } from './FoodEditSheet'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

// Couleur du point de qualité (point uniquement, chiffre neutre) — sémantique de charge.
function scoreColor(s: number): string {
  if (s >= 7) return 'var(--charge-low)'
  if (s >= 4) return 'var(--charge-mid)'
  return 'var(--charge-hard)'
}

export function MealCard({ slotLabel, foods, photoUrl, score, advice, onTapFood, onDeleteFood, onPhoto, onSearch, onAdd, onClear }: {
  slotLabel: string
  foods: EditableFood[]
  photoUrl: string | null
  score: number | null
  advice: string | null
  onTapFood: (i: number) => void
  onDeleteFood: (i: number) => void
  onPhoto: () => void
  onSearch: () => void
  onAdd: () => void
  onClear: () => void
}) {
  const t = foods.reduce((a, f) => ({ kcal: a.kcal + f.kcal, prot: a.prot + f.prot, gluc: a.gluc + f.gluc, lip: a.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', boxSizing: 'border-box', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* En-tête : label + pastille note /10 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slotLabel}</span>
        {score != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '3px 9px', borderRadius: 999, background: 'var(--bg-card)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: scoreColor(score) }} />
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{score}/10</span>
          </span>
        )}
      </div>

      {/* Photo en vignette */}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--r-sm)', display: 'block' }} />
      )}

      {/* Macros du repas */}
      <MealMacros kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} />

      {/* Liste d'aliments — tap pour éditer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {foods.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%' }}>
            <button onClick={() => onTapFood(i)} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', padding: '8px 10px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: FB, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}{f.qty ? <span className="tnum" style={{ color: 'var(--text-dim)' }}> · {f.qty} {f.unit}</span> : null}
              </span>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', flexShrink: 0 }}>{f.kcal} kcal</span>
            </button>
            <button onClick={() => onDeleteFood(i)} aria-label="Retirer" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Avis IA — conseil de performance, ton constructif (jamais de jugement) */}
      {advice && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0, marginTop: 1, opacity: 0.85 }} />
          <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>{advice}</span>
        </div>
      )}

      {/* Actions */}
      <MealActions onPhoto={onPhoto} onSearch={onSearch} onManual={onAdd} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClear} style={{ height: 32, padding: '0 var(--space-2)', border: 'none', background: 'transparent', color: 'var(--text-dim)', fontFamily: FB, fontSize: 12, cursor: 'pointer' }}>Vider</button>
      </div>
    </div>
  )
}