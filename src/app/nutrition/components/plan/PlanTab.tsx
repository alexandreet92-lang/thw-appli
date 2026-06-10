'use client'

// Onglet « Mon plan » refondu (DESIGN_SYSTEM.md §8). Neutres + un seul accent cyan ;
// charge = points colorés uniquement ; aucune surface ni bordure décorative.

import type { NutritionPlan, PlanDay } from '@/hooks/useNutrition'
import type { PlannedSession } from '@/hooks/usePlanning'
import { PlanRhythm, type RhythmDay } from './PlanRhythm'
import { CHARGE_COLOR, CHARGE_LABEL, todayHeadline, weekOf, type DayType } from './planFormat'

interface Macro { proteines: number; glucides: number; lipides: number }

interface Props {
  activePlan:    NutritionPlan | null
  today:         string
  todayType:     DayType
  todayKcalObj:  number
  todayMacroObj: Macro
  todaySessions: PlannedSession[]
  next14Days:    string[]
  onOpenDay:     (d: PlanDay) => void
  onOpenAI:      () => void
  onOpenShopping:() => void
  onRegen:       () => void
  onDelete:      () => void
  isDesktop:     boolean
}

const root: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', padding: 'var(--space-2) 0 var(--space-6)',
}
const primaryBtn: React.CSSProperties = {
  height: 36, padding: '0 16px', borderRadius: 'var(--r-sm)', border: 'none',
  background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const textBtn: React.CSSProperties = {
  height: 36, padding: '0 8px', border: 'none', background: 'transparent',
  color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
}
const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)',
}

function Dot({ type }: { type: DayType }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHARGE_COLOR[type], display: 'inline-block', flexShrink: 0 }} />
}

export function PlanTab(p: Props) {
  const { activePlan, today, todayType, todayKcalObj, todayMacroObj, todaySessions, next14Days } = p

  // En-tête de contexte : la semaine du plan (le nom de l'onglet est porté par la nav).
  const header = activePlan ? (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: p.isDesktop ? 22 : 20, fontWeight: 600, color: 'var(--text)', margin: 0, textTransform: 'capitalize' }}>{weekOf(today)}</h1>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)' }}>· actif</span>
    </div>
  ) : null

  if (!activePlan) {
    return (
      <div style={root}>
        {header}
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Pas encore de plan nutritionnel</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', margin: 'var(--space-2) 0 var(--space-4)' }}>Génère un plan calé sur ton entraînement, tes courses et ton historique.</p>
          <button onClick={p.onOpenAI} style={primaryBtn}>Créer mon plan avec l&apos;IA</button>
        </div>
      </div>
    )
  }

  const d = activePlan.plan_data
  const focal  = p.isDesktop ? 42 : 38
  const metric = p.isDesktop ? 22 : 19
  const sessTitles = todaySessions.map(s => s.title).filter(Boolean).join(' · ')

  const rhythm: RhythmDay[] = next14Days.map(date => {
    const pd = d.jours?.find(j => j.date === date) ?? null
    const type = (pd?.type_jour ?? (date === today ? todayType : 'low')) as DayType
    return { date, type, kcal: pd?.kcal ?? 0, isToday: date === today, planDay: pd }
  })

  const targets = [
    { t: 'low'  as DayType, kcal: d.calories_low,  m: d.macros_low },
    { t: 'mid'  as DayType, kcal: d.calories_mid,  m: d.macros_mid },
    { t: 'hard' as DayType, kcal: d.calories_hard, m: d.macros_hard },
  ]

  return (
    <div style={root}>
      {header}

      {/* Hero focal — jour courant */}
      <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>{todayHeadline(today)}</span>
          <Dot type={todayType} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>Jour {CHARGE_LABEL[todayType]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: focal, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{todayKcalObj}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)' }}>kcal</span>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', marginTop: 'var(--space-2)' }}>
          P <span className="tnum">{todayMacroObj.proteines}</span> · G <span className="tnum">{todayMacroObj.glucides}</span> · L <span className="tnum">{todayMacroObj.lipides}</span> g
        </div>
        <div style={{ marginTop: 'var(--space-3)' }}>
          {sessTitles ? (
            <a href="/planning" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Calé sur {sessTitles} →</a>
          ) : (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>Jour de repos — aucune séance calée</span>
          )}
        </div>
      </div>

      {/* Cibles par type de jour */}
      <div>
        <h2 style={sectionTitle}>Cibles par type de jour</h2>
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          {targets.map(({ t, kcal, m }) => (
            <div key={t} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Dot type={t} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{CHARGE_LABEL[t]}</span>
              </div>
              <div className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: metric, fontWeight: 600, color: 'var(--text)' }}>{kcal}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', marginTop: 'var(--space-1)' }}>P {m?.proteines ?? 0} · G {m?.glucides ?? 0} · L {m?.lipides ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rythme des 14 jours — signature */}
      <div>
        <h2 style={sectionTitle}>Rythme des 14 jours</h2>
        <PlanRhythm days={rhythm} onOpenDay={p.onOpenDay} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <button onClick={p.onOpenAI} style={primaryBtn}>Modifier avec l&apos;IA</button>
        <button onClick={p.onOpenShopping} style={textBtn}>Liste de courses</button>
        <button onClick={p.onRegen} style={textBtn}>Régénérer</button>
        <button onClick={p.onDelete} style={{ ...textBtn, color: 'var(--text-dim)', marginLeft: 'auto' }}>Supprimer</button>
      </div>
    </div>
  )
}
