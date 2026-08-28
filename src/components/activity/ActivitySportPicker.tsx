'use client'
// Change le SPORT d'une activité existante (ex. muscu → boxe). Met à jour
// activities.sport_type (valeurs autorisées par la contrainte CHECK) puis
// déclenche un rechargement de la liste.
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { SportIcon } from '@/components/icons/SportIcon'

const OPTIONS: { type: string; label: string }[] = [
  { type: 'run', label: 'Course' },
  { type: 'trail_run', label: 'Trail' },
  { type: 'bike', label: 'Vélo' },
  { type: 'hometrainer', label: 'Home Trainer' },
  { type: 'swim', label: 'Natation' },
  { type: 'rowing', label: 'Aviron' },
  { type: 'gym', label: 'Muscu' },
  { type: 'hyrox', label: 'Hyrox' },
  { type: 'boxe', label: 'Boxe' },
  { type: 'crossfit', label: 'Cross-training' },
  { type: 'hiit', label: 'HIIT' },
  { type: 'yoga', label: 'Yoga' },
  { type: 'ski', label: 'Ski' },
  { type: 'other', label: 'Autre' },
]
// sport_type activité → clé d'icône
const ICON_KEY: Record<string, string> = {
  run: 'run', trail_run: 'run', bike: 'bike', virtual_bike: 'bike', hometrainer: 'bike',
  swim: 'swim', rowing: 'rowing', gym: 'muscu', hyrox: 'hyrox', boxe: 'boxe',
  crossfit: 'hyrox', hiit: 'hyrox', yoga: 'yoga', ski: 'ski', other: 'other',
}

export function ActivitySportPicker({ activityId, sport, onChanged }: { activityId: string; sport: string; onChanged?: () => void }) {
  const { t } = useI18n()
  const [cur, setCur] = useState(sport)
  const [saving, setSaving] = useState(false)

  async function pick(type: string) {
    if (type === cur || saving) return
    const prev = cur
    setCur(type); setSaving(true)
    try {
      const { error } = await createClient().from('activities').update({ sport_type: type }).eq('id', activityId)
      if (error) { setCur(prev); return }
      onChanged?.()
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('thw:activities-reload'))
    } catch { setCur(prev) } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {OPTIONS.map(o => {
        const on = o.type === cur
        return (
          <button key={o.type} onClick={() => pick(o.type)} disabled={saving} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999, cursor: saving ? 'wait' : 'pointer',
            border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-dim)' : 'var(--bg-card)',
            color: on ? 'var(--primary)' : 'var(--text-dim)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-body)',
          }}>
            <SportIcon sport={ICON_KEY[o.type] ?? 'other'} size={18} circle={false} />
            {t(`w3f.sport_${o.type}`)}
          </button>
        )
      })}
    </div>
  )
}
