'use client'
// ── ActivityTitle — titre d'activité éditable inline ──────────────────────────
// Utilisé dans le header fixe mobile. Sauvegarde en temps réel dans Supabase.

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

interface Props {
  activityId: string
  initialName: string | null
}

export function ActivityTitle({ activityId, initialName }: Props) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(initialName ?? '')
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const sb = createClient()
      await sb.from('activities').update({ title: value.trim() || initialName }).eq('id', activityId)
    } catch (e) {
      console.error('[ActivityTitle] save error:', e)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const cancel = () => {
    setValue(initialName ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter')  { e.preventDefault(); save()   }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--accent, #06B6D4)',
          outline: 'none',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text)',
          padding: '2px 0',
          fontFamily: 'inherit',
          opacity: saving ? 0.6 : 1,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        display: 'block',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: 'text',
        userSelect: 'none',
      }}
    >
      {value || t('activities.untitled')}
    </span>
  )
}
