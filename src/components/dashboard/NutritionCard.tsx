'use client'
// ══════════════════════════════════════════════════════════════
// NUTRITION (si programme actif) — consommé / objectif du jour pour
// kcal, protéines, glucides ; puis le PROCHAIN REPAS du programme
// (premier créneau pas encore saisi aujourd'hui).
// Sources : nutrition_plans (useNutrition) + nutrition_meal_logs (useDailyMeals).
// ══════════════════════════════════════════════════════════════

import { useNutrition, slotText, slotMacros, type MealSet } from '@/hooks/useNutrition'
import { useDailyMeals, SLOT_KEYS, type MealSlotKey } from '@/hooks/useDailyMeals'
import { useI18n } from '@/lib/i18n'
import { DashCard, DASH_ICONS, Skeleton } from './primitives'
import { FB, NUM, todayIso } from './lib'

const PLAN_SLOT: Record<MealSlotKey, keyof MealSet> = {
  breakfast: 'petit_dejeuner', morning_snack: 'collation_matin', lunch: 'dejeuner',
  afternoon_snack: 'collation_apres_midi', dinner: 'diner', evening_snack: 'collation_soir',
}
const SLOT_I18N: Record<MealSlotKey, string> = {
  breakfast: 'dashboard.mealBreakfast', morning_snack: 'dashboard.mealMorningSnack', lunch: 'dashboard.mealLunch',
  afternoon_snack: 'dashboard.mealAfternoonSnack', dinner: 'dashboard.mealDinner', evening_snack: 'dashboard.mealEveningSnack',
}

function Macro({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', ...NUM, fontSize: 22, fontWeight: 800, whiteSpace: 'nowrap' }}>
        {Math.round(value)}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}> / {Math.round(target)}{unit}</span>
      </p>
      <div aria-hidden style={{ marginTop: 8, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 'var(--r-pill)', background: pct >= 1 ? 'var(--success)' : 'var(--primary)' }} />
      </div>
    </div>
  )
}

export function NutritionCard() {
  const { t } = useI18n()
  const { activePlan, dailyLogs, loading } = useNutrition()
  const today = todayIso()
  const { totals, entries } = useDailyMeals(today)

  if (loading) return <Skeleton height={180} />
  if (!activePlan) return null // pas de programme → bloc masqué entièrement

  const plan = activePlan.plan_data
  const planDay = plan?.jours?.find(j => j.date === today) ?? null
  const kcalT = planDay?.kcal ?? plan?.calories_low ?? 0
  const protT = planDay?.proteines ?? plan?.macros_low?.proteines ?? 0
  const glucT = planDay?.glucides ?? plan?.macros_low?.glucides ?? 0
  if (kcalT <= 0) return null

  // Prochain repas : premier créneau du programme non encore saisi aujourd'hui.
  const option = dailyLogs.find(l => l.date === today)?.option_choisie === 'B' ? 'option_B' : 'option_A'
  const set = planDay?.repas?.[option]
  const logged = new Set(entries.filter(e => e.validated || (e.actual_kcal ?? 0) > 0).map(e => e.meal_slot))
  const nextSlot = set ? SLOT_KEYS.find(k => !logged.has(k) && slotText(set[PLAN_SLOT[k]] ?? '').trim()) : undefined
  const nextVal = nextSlot && set ? set[PLAN_SLOT[nextSlot]] : null
  const nextKcal = nextVal ? slotMacros(nextVal)?.kcal : null

  return (
    <DashCard icon={DASH_ICONS.nutrition} title={t('dashboard.nutrition')} meta={t('dashboard.today')} href="/nutrition">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <Macro label={t('dashboard.calories')} value={totals.kcal} target={kcalT} unit="" />
        <Macro label={t('dashboard.proteins')} value={totals.prot} target={protT} unit=" g" />
        <Macro label={t('dashboard.carbs')} value={totals.gluc} target={glucT} unit=" g" />
      </div>

      {nextSlot && nextVal && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--dash-line, var(--border))' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ margin: 0, fontFamily: FB, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>
              {t('dashboard.nextMeal')} · {t(SLOT_I18N[nextSlot])}
            </p>
            {nextKcal ? <span style={{ ...NUM, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{Math.round(nextKcal)} kcal</span> : null}
          </div>
          <p style={{ margin: '6px 0 0', fontFamily: FB, fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {slotText(nextVal)}
          </p>
        </div>
      )}
    </DashCard>
  )
}
