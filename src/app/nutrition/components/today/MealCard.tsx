'use client'
// Carte d'un repas REMPLI : toujours dépliée, NON repliable. Rangée [photo · donut],
// puis jauges P/G/L en dessous, détail par aliment dépliable, avis IA, ajout d'aliment.
// Chiffres NEUTRES ; couleur seulement sur arcs du donut + barres macros. var() only.
import { MacroDonut } from './MacroDonut'
import { MealMacroGauges } from './MealMacroGauges'
import { MealDetail } from './MealDetail'
import type { EditableFood } from './FoodEditSheet'
import type { MealCourse } from '@/hooks/useDailyMeals'
import { useI18n } from '@/lib/i18n'
import { useNarrow } from '@/lib/hooks/useNarrow'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const COURSES: { key: MealCourse; label: string }[] = [
  { key: 'entree', label: 'Entrée' },
  { key: 'plat', label: 'Plat' },
  { key: 'dessert', label: 'Dessert' },
]

function scoreColor(s: number): string {
  if (s >= 7) return 'var(--charge-low)'
  if (s >= 4) return 'var(--charge-mid)'
  return 'var(--charge-hard)'
}

export function MealCard({ slotLabel, foods, courses, photoUrl, photos, score, advice, onTapFood, onDeleteFood, onAddSearch, onAddManual, onPhoto, onClear }: {
  slotLabel: string
  foods: EditableFood[]
  /** Déjeuner / dîner : organisés en sous-sections Entrée · Plat · Dessert. */
  courses?: boolean
  photoUrl: string | null
  photos?: string[] | null
  score: number | null
  advice: string | null
  onTapFood: (i: number) => void
  onDeleteFood: (i: number) => void
  onAddSearch: (course?: MealCourse) => void
  onAddManual: (course?: MealCourse) => void
  onPhoto: () => void
  onClear: () => void
}) {
  const { t: tr } = useI18n()
  const t = foods.reduce((a, f) => ({ kcal: a.kcal + f.kcal, prot: a.prot + f.prot, gluc: a.gluc + f.gluc, lip: a.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
  const textBtn: React.CSSProperties = { height: 32, padding: '0 var(--space-2)', border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 12, fontWeight: 500, cursor: 'pointer' }
  // Multi-photos : on affiche toutes les photos accumulées (fallback sur l'ancienne photo unique).
  const allPhotos = (photos && photos.length) ? photos : (photoUrl ? [photoUrl] : [])
  const mobile = useNarrow(767)

  if (mobile) {
    // Mobile : carte blanche radius 20 sans bordure ; titre 17/700 + note en pilule
    // grise ; ajout d'aliment = pilule cyan pleine largeur ; actions secondaires en
    // pilules grises ; « Vider » en texte rouge.
    const pill: React.CSSProperties = { flex: 1, minWidth: 0, minHeight: 44, padding: '0 12px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--surface-chip)', color: 'var(--text)', fontFamily: FB, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
    const plus = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14" /></svg>
    return (
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '16px 18px 12px', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FB }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slotLabel}</span>
          {score != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '5px 10px', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: scoreColor(score) }} />
              <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{score}/10</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
          {allPhotos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, maxWidth: allPhotos.length > 1 ? 176 : 104, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {allPhotos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0, display: 'block' }} />
              ))}
            </div>
          )}
          <MacroDonut kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} size={104} />
        </div>

        <MealMacroGauges prot={t.prot} gluc={t.gluc} lip={t.lip} />

        <MealDetail foods={foods} grouped={courses} onTapFood={onTapFood} onDeleteFood={onDeleteFood} />

        {advice && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo_4bras.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0, marginTop: 1, opacity: 0.85 }} />
            <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>{advice}</span>
          </div>
        )}

        {courses ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {COURSES.map(c => (
              <button key={c.key} onClick={() => onAddSearch(c.key)} style={{ ...pill, color: 'var(--primary)' }}>
                {plus}{tr(`nutrition.course.${c.key}`)}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => onAddSearch()} className="thw-press" style={{ ...pill, flex: 'none', width: '100%', minHeight: 50, fontSize: 16, fontWeight: 700, background: 'var(--primary)', color: 'var(--on-primary)' }}>
            {plus}{tr('nutrition.today.addFood')}
          </button>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onPhoto} style={pill}>{tr('nutrition.today.photoAI')}</button>
          <button onClick={() => onAddManual()} style={pill}>{tr('nutrition.today.manual')}</button>
        </div>
        <button onClick={onClear} style={{ minHeight: 44, border: 'none', background: 'transparent', color: 'var(--danger)', fontFamily: FB, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {tr('nutrition.today.clear')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* En-tête : label + pastille note /10 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slotLabel}</span>
        {score != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '3px 9px', borderRadius: 'var(--r-pill)', background: 'var(--bg-card)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: scoreColor(score) }} />
            <span className="tnum" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{score}/10</span>
          </span>
        )}
      </div>

      {/* Rangée : photos (défilables) à gauche · donut à droite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%' }}>
        {allPhotos.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', flexShrink: 0, maxWidth: allPhotos.length > 1 ? 168 : 96, WebkitOverflowScrolling: 'touch' }}>
            {allPhotos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'block' }} />
            ))}
          </div>
        )}
        <MacroDonut kcal={t.kcal} prot={t.prot} gluc={t.gluc} lip={t.lip} size={96} />
      </div>

      {/* Jauges P/G/L spécifiques */}
      <MealMacroGauges prot={t.prot} gluc={t.gluc} lip={t.lip} />

      {/* Détail par aliment (dépliable, groupé par sous-section pour déj/dîner) */}
      <MealDetail foods={foods} grouped={courses} onTapFood={onTapFood} onDeleteFood={onDeleteFood} />

      {/* Avis IA — conseil de performance, ton constructif (jamais de jugement) */}
      {advice && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0, marginTop: 1, opacity: 0.85 }} />
          <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>{advice}</span>
        </div>
      )}

      {/* Ajout d'un aliment (IA → macros auto). Déj/dîner : un bouton par sous-section. */}
      {courses ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {COURSES.map(c => (
            <button key={c.key} onClick={() => onAddSearch(c.key)} style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              {tr(`nutrition.course.${c.key}`)}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => onAddSearch()} style={{ height: 38, width: '100%', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          {tr('nutrition.today.addFood')}
        </button>
      )}

      {/* Actions secondaires démotées */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <button onClick={onPhoto} style={textBtn}>{tr('nutrition.today.photoAI')}</button>
        <button onClick={() => onAddManual()} style={textBtn}>{tr('nutrition.today.manual')}</button>
        <button onClick={onClear} style={{ ...textBtn, color: 'var(--text-dim)', marginLeft: 'auto' }}>{tr('nutrition.today.clear')}</button>
      </div>
    </div>
  )
}
