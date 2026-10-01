'use client'
// ══════════════════════════════════════════════════════════════
// NUTRITION (conditionnel). Affiché UNIQUEMENT si plan actif.
// Objectif kcal du jour (plan_data.jours[today] ou fallback type de
// jour) vs consommé (nutrition_meal_logs). Aucun repas horodaté
// n'existe (meal_timing = enum, pas une heure) → pas de « prochain
// repas ». Voir PROMPT_DASHBOARD.md. Rien n'est fabriqué.
// ══════════════════════════════════════════════════════════════

import { useNutrition } from '@/hooks/useNutrition'
import { useDailyMeals } from '@/hooks/useDailyMeals'
import { useI18n } from '@/lib/i18n'
import { DashCard, DASH_ICONS, Metric, Ring, Skeleton } from './primitives'
import { todayIso } from './lib'
import { currentLocale } from '@/lib/i18n/locale'

export function NutritionCard() {
  const { t } = useI18n()
  const { activePlan, loading } = useNutrition()
  const today = todayIso()
  const { totals } = useDailyMeals(today)

  if (loading) return <Skeleton height={120} />
  if (!activePlan) return null // pas de programme → bloc masqué entièrement

  const plan = activePlan.plan_data
  const planDay = plan?.jours?.find(j => j.date === today) ?? null
  const target = planDay?.kcal ?? plan?.calories_low ?? 0
  if (target <= 0) return null

  const consumed = Math.round(totals.kcal)
  const remaining = Math.max(0, target - consumed)

  return (
    <DashCard icon={DASH_ICONS.nutrition} title={t('dashboard.nutrition')} meta={t('dashboard.today')} href="/nutrition">
      <Metric
        label={t('dashboard.calories')}
        value={consumed.toLocaleString(currentLocale())}
        unit={`/ ${target.toLocaleString(currentLocale())}`}
        sub={t('dashboard.kcalRemaining', { n: remaining })}
        right={<Ring value={target > 0 ? consumed / target : 0} color="var(--success)" />}
      />
    </DashCard>
  )
}
