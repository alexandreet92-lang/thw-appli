'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MealSlotKey } from '@/hooks/useDailyMeals'

export interface LocalTemplate {
  id:          string
  nom:         string
  kcal:        number | null
  proteines:   number | null
  glucides:    number | null
  lipides:     number | null
  meal_timing: string | null
}

interface Props {
  slot:     MealSlotKey
  onSelect: (t: LocalTemplate) => void
}

const SLOT_TIMING: Record<MealSlotKey, string[]> = {
  breakfast:       ['breakfast', 'morning'],
  morning_snack:   ['snack', 'morning'],
  lunch:           ['lunch', 'midday'],
  afternoon_snack: ['snack', 'afternoon'],
  dinner:          ['dinner', 'evening'],
  evening_snack:   ['snack', 'evening'],
}

export default function MealModalTemplates({ slot, onSelect }: Props) {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    const sb = createClient()
    void (async () => {
      // Try with meal_timing first; fall back without it if column is missing
      let { data, error } = await sb
        .from('nutrition_meal_templates')
        .select('id,nom,kcal,proteines,glucides,lipides,meal_timing')
        .order('nom')
      if (error) {
        // Retry without meal_timing in case column doesn't exist yet
        const fallback = await sb
          .from('nutrition_meal_templates')
          .select('id,nom,kcal,proteines,glucides,lipides')
          .order('nom')
        data = fallback.data
      }
      setTemplates((data ?? []).map(r => {
        const row = r as Record<string, unknown>
        return { id: row.id as string, nom: row.nom as string, kcal: (row.kcal as number | null) ?? null, proteines: (row.proteines as number | null) ?? null, glucides: (row.glucides as number | null) ?? null, lipides: (row.lipides as number | null) ?? null, meal_timing: (row.meal_timing as string | null) ?? null }
      }))
      setLoading(false)
    })()
  }, [])

  const timings  = SLOT_TIMING[slot]
  const filtered = templates.filter(t => {
    const matchSearch = !search || t.nom.toLowerCase().includes(search.toLowerCase())
    const matchTiming = !t.meal_timing || timings.some(tm => t.meal_timing!.toLowerCase().includes(tm))
    return matchSearch && matchTiming
  })

  if (loading) {
    return <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32, fontSize: 12 }}>Chargement...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '28px 0', fontSize: 12 }}>
          Aucun repas type disponible
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
          {filtered.map(t => (
            <button key={t.id} onClick={() => onSelect(t)}
              style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#00c8e0')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5, fontFamily: 'Syne,sans-serif' }}>
                {t.nom}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: 'DM Mono,monospace', flexWrap: 'wrap' }}>
                {t.kcal      != null && <span style={{ color: '#00c8e0' }}>{t.kcal} kcal</span>}
                {t.proteines != null && <span style={{ color: '#3B82F6' }}>P {t.proteines}g</span>}
                {t.glucides  != null && <span style={{ color: '#F97316' }}>G {t.glucides}g</span>}
                {t.lipides   != null && <span style={{ color: '#8B5CF6' }}>L {t.lipides}g</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
