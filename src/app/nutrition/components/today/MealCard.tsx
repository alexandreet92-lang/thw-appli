'use client'
// Carte d'un repas REMPLI : toujours dépliée, NON repliable. Rangée [photo · donut],
// puis jauges P/G/L en dessous, détail par aliment dépliable, avis IA, ajout d'aliment.
// Chiffres NEUTRES ; couleur seulement sur arcs du donut + barres macros. var() only.
import { MacroDonut } from './MacroDonut'
import { MealMacroGauges } from './MealMacroGauges'
import { MealDetail } from './MealDetail'
import type { EditableFood } from './FoodEditSheet'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function scoreColor(s: number): string {
  if (s >= 7) return 'var(--charge-low)'
  if (s >= 4) return 'var(--charge-mid)'
  return 'var(--charge-hard)'
}

export function MealCard({ slotLabel, foods, photoUrl, score, advice, onTapFood, onDeleteFood, onAddSearch, onAddManual, onPhoto, onClear }: {
  slotLabel: string
  foods: EditableFood[]
  photoUrl: string | null
  score: number | null
  advice: string | null
  onTapFood: (i: number) => void
  onDeleteFood: (i: number) => void
  onAddSearch: () => void
  onAddManual: () => void
  onPhoto: () => void
  onClear: () => void
}) {
  const t = foods.reduce((a, f) => ({ kcal: a.kcal + f.kcal, prot: a.prot + f.prot, gluc: a.gluc + f.gluc, lip: a.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
  const textBtn: React.CSSProperties = { height: 32, padding: '0 var(--space-2)', border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 12, fontWeight: 500, cursor: 'pointer' }

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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

      {/* Rangée : photo à gauche · donut à droite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%' }}>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'block' }} />
        )}
        <MacroDonut kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} size={96} />
      </div>

      {/* Jauges P/G/L spécifiques */}
      <MealMacroGauges prot={t.prot} gluc={t.gluc} lip={t.lip} />

      {/* Détail par aliment (dépliable) */}
      <MealDetail foods={foods} onTapFood={onTapFood} onDeleteFood={onDeleteFood} />

      {/* Avis IA — conseil de performance, ton constructif (jamais de jugement) */}
      {advice && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0, marginTop: 1, opacity: 0.85 }} />
          <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>{advice}</span>
        </div>
      )}

      {/* Ajout d'un aliment (recherche → macros auto) */}
      <button onClick={onAddSearch} style={{ height: 38, width: '100%', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Ajouter un aliment
      </button>

      {/* Actions secondaires démotées */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <button onClick={onPhoto} style={textBtn}>Photo IA</button>
        <button onClick={onAddManual} style={textBtn}>Manuel</button>
        <button onClick={onClear} style={{ ...textBtn, color: 'var(--text-dim)', marginLeft: 'auto' }}>Vider</button>
      </div>
    </div>
  )
}
