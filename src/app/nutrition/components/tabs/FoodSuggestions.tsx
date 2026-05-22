'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RecentMeal {
  meal_name: string
  kcal:      number
  prot:      number
  gluc:      number
  lip:       number
}

interface Props {
  slot:     string
  onSelect: (meal: RecentMeal) => void
}

export default function FoodSuggestions({ slot, onSelect }: Props) {
  const [meals, setMeals] = useState<RecentMeal[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('nutrition_meal_logs')
        .select('meal_name, actual_kcal, actual_prot, actual_gluc, actual_lip')
        .eq('user_id', session.user.id)
        .eq('meal_slot', slot)
        .is('plan_id', null)
        .not('meal_name', 'is', null)
        .not('actual_kcal', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8)

      if (!data?.length) return

      const unique = Array.from(
        new Map(data.map(l => [l.meal_name, l])).values()
      ).slice(0, 4)

      setMeals(unique.map(l => ({
        meal_name: l.meal_name  ?? '',
        kcal:      l.actual_kcal ?? 0,
        prot:      l.actual_prot ?? 0,
        gluc:      l.actual_gluc ?? 0,
        lip:       l.actual_lip  ?? 0,
      })))
    }
    void load()
  }, [slot])

  if (!meals.length) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>
        Recemment consomme
      </p>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {meals.map(meal => (
          <button key={meal.meal_name} onClick={() => onSelect(meal)}
            style={{ flexShrink: 0, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#00c8e0')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap' }}>
              {meal.meal_name}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace', marginTop: 2 }}>
              {meal.kcal} kcal
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
