'use client'

// Onglet « Aujourd'hui » refondu (DESIGN_SYSTEM.md). Fond de page --bg, neutres +
// un accent --primary ; l'accent IA n'apparaît que sur l'action de suggestion.
// La liste des repas réutilise DayFoodJournal (repli des collations conservé).

import type { useDailyMeals } from '@/hooks/useDailyMeals'
import type { useHydration } from '@/hooks/useHydration'
import type { PlannedSession } from '@/hooks/usePlanning'
import { DayFoodJournal } from '@/app/nutrition/components/DayFoodJournal'
import { FuelingHero } from './FuelingHero'
import { DayStrip } from './DayStrip'
import { SessionFueling } from './SessionFueling'
import { dateLabel, type DayType } from '../plan/planFormat'

interface Macro { proteines: number; glucides: number; lipides: number }
interface Suggestion { title: string; description: string; kcal: number; prot: number; gluc: number; lip: number }

interface Props {
  today:         string
  realToday:     string
  dayDir:        'right' | 'left'
  onSelectDay:   (date: string) => void
  todayType:     DayType
  todayKcalObj:  number
  baseKcal:      number | null
  todayMacroObj: Macro
  dayMeals:      ReturnType<typeof useDailyMeals>
  hydration:     ReturnType<typeof useHydration>
  todaySessions: PlannedSession[]
  weightKg:      number | null
  mealJumpSignal:number
  suggestion:    Suggestion | null
  suggesting:    boolean
  onSuggest:     () => void
  isDesktop:     boolean
}

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const sectionTitle: React.CSSProperties = { fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }
const textBtn: React.CSSProperties = { height: 36, padding: '0 var(--space-2)', border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const fmtL = (n: number) => n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')

export function TodayTab(p: Props) {
  const { dayMeals, hydration } = p
  const hydroPct = Math.min(hydration.liters / 2.5, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-2) 0 var(--space-6)' }}>
      <style>{`
        @keyframes ntSlideR { from { transform: translateX(26px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes ntSlideL { from { transform: translateX(-26px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        .nt-slide { animation: ntSlide${p.dayDir === 'right' ? 'R' : 'L'} 0.3s cubic-bezier(0.32,0.72,0,1) }
        @media (prefers-reduced-motion: reduce) { .nt-slide { animation: none } }
      `}</style>

      {/* Frise des 6 derniers jours */}
      <DayStrip today={p.realToday} selected={p.today} targetKcal={p.todayKcalObj} onSelect={p.onSelectDay} />

      <div key={p.today} className="nt-slide" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* En-tête de contexte : la date (le nom de l'onglet est déjà porté par la nav) */}
      <h1 style={{ fontFamily: FD, fontSize: p.isDesktop ? 22 : 20, fontWeight: 600, color: 'var(--text)', margin: 0, textTransform: 'capitalize' }}>{dateLabel(p.today)}</h1>

      {/* Hero — anneau unique + barres de macros */}
      <FuelingHero
        todayType={p.todayType}
        consumedKcal={dayMeals.totals.kcal}
        targetKcal={p.todayKcalObj}
        baseKcal={p.baseKcal}
        consumed={{ prot: dayMeals.totals.prot, gluc: dayMeals.totals.gluc, lip: dayMeals.totals.lip }}
        target={p.todayMacroObj}
        weightKg={p.weightKg}
        sessions={p.todaySessions}
        isDesktop={p.isDesktop}
      />

      {/* Autour de ta séance — fueling avant/pendant/après (reco auto + log) */}
      <div>
        <h2 style={sectionTitle}>Autour de ta séance</h2>
        <SessionFueling sessions={p.todaySessions} weightKg={p.weightKg} />
      </div>

      {/* Hydratation */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Hydratation</h2>
          <span className="tnum" style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{fmtL(hydration.liters)} / 2,5 L</span>
        </div>
        <svg width="100%" height={6} style={{ display: 'block', margin: 'var(--space-2) 0 var(--space-4)' }}>
          <rect x={0} y={0} width="100%" height={6} rx={3} fill="var(--border)" />
          <rect x={0} y={0} width={`${hydroPct * 100}%`} height={6} rx={3} fill="var(--primary)" style={{ transition: 'width 0.4s ease' }} />
        </svg>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={() => void hydration.addLiters(0.25)} style={textBtn}>+25 cl</button>
          <button onClick={() => void hydration.addLiters(0.5)} style={textBtn}>+50 cl</button>
          <button onClick={() => void hydration.setLiters(Math.max(0, hydration.liters - 0.25))} style={{ ...textBtn, color: 'var(--text-dim)', marginLeft: 'auto' }}>−25 cl</button>
        </div>
      </div>

      {/* Repas de la journée — DayFoodJournal réutilisé */}
      <div id="repas-du-jour">
        <h2 style={sectionTitle}>Repas de la journée</h2>
        <DayFoodJournal
          entries={dayMeals.entries}
          loading={dayMeals.loading}
          saveEntry={dayMeals.saveEntry}
          deleteEntry={dayMeals.deleteEntry}
          expandSignal={p.mealJumpSignal}
        />
      </div>

      {/* Suggestion IA — action IA légitime (accent --ai-accent) */}
      <div>
        <button onClick={p.onSuggest} disabled={p.suggesting}
          style={{ height: 44, padding: '0 var(--space-2)', border: 'none', background: 'transparent', color: 'var(--ai-accent)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: p.suggesting ? 'default' : 'pointer' }}>
          {p.suggesting ? 'Réflexion…' : 'Suggérer mon prochain repas (IA)'}
        </button>
        {p.suggestion && (
          <div style={{ marginTop: 'var(--space-2)', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
            <p style={{ margin: 0, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{p.suggestion.title}</p>
            <p style={{ margin: 'var(--space-1) 0 var(--space-2)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>{p.suggestion.description}</p>
            <p className="tnum" style={{ margin: 0, fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>
              {p.suggestion.kcal} kcal · P {p.suggestion.prot} · G {p.suggestion.gluc} · L {p.suggestion.lip} g
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
