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
import { Card, SectionTitle, Gauge, Skeleton } from './primitives'
import { FB, NUM, todayIso } from './lib'

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
    <Card>
      <SectionTitle action={<a href="/nutrition" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{t('dashboard.detail')}</a>}>
        {t('dashboard.nutrition')}
      </SectionTitle>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={{ ...NUM, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{consumed}</span>
        <span style={{ ...NUM, fontSize: 14, color: 'var(--text-mid)' }}>/ {target} kcal</span>
      </div>

      <div style={{ margin: 'var(--space-3) 0 var(--space-2)' }}>
        <Gauge value={consumed} max={target} />
      </div>

      <p style={{ margin: 0, ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>
        {t('dashboard.kcalRemaining', { n: remaining })}
      </p>
    </Card>
  )
}
