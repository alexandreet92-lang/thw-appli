'use client'
import { useState } from 'react'
import RPESlider from './RPESlider'
import TrainingTypeSelector from './TrainingTypeSelector'
import { RUNNING_TYPES } from '@/types/running'
import { TRAIL_TYPES } from '@/types/trail'
import { CYCLING_TYPES } from './TrainingTypeSelector'
import { HIKING_TYPES } from '@/types/hiking'
import { MTB_TYPES } from '@/types/mtb'
import { ROWING_TYPES } from '@/types/rowing'
import { STRENGTH_TYPES, HYROX_TYPES } from '@/types/workout'

export interface SessionFormData {
  title: string
  trainingTypes: string[]
  rpe: number
  comment: string
}

interface Props {
  sport: string
  startedAt: string
  onBack: () => void
  onSave: (data: SessionFormData) => Promise<void>
  isDark: boolean
}

function getAutoTitle(sport: string, startedAt: string): string {
  const d = new Date(startedAt)
  const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
  const num = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  const label = sport === 'running' ? 'Sortie running' : sport === 'trail' ? 'Sortie trail' : sport === 'hiking' ? 'Randonnée' : sport === 'mtb' ? 'Sortie VTT' : sport === 'rowing' ? 'Aviron' : sport === 'gym' ? 'Séance muscu' : sport === 'hyrox' ? 'Séance Hyrox' : 'Sortie vélo'
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${label} · ${cap(day)} ${num} ${month}`
}

function getTheme(isDark: boolean) {
  return {
    bg:        isDark ? '#0A0A0A' : '#FFFFFF',
    surface:   isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    muted:     isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C',
    border:    isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    btnBg:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
  }
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: 10,
}

export default function SessionSaveForm({ sport, startedAt, onBack, onSave, isDark }: Props) {
  const t = getTheme(isDark)
  const autoTitle = getAutoTitle(sport, startedAt)
  const [title, setTitle]               = useState(autoTitle)
  const [trainingTypes, setTrainingTypes] = useState<string[]>([])
  const [rpe, setRpe]                   = useState(5)
  const [comment, setComment]           = useState('')
  const [saving, setSaving]             = useState(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    await onSave({ title: title.trim() || autoTitle, trainingTypes, rpe, comment })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10004,
      background: t.bg, color: t.text,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
      animation: 'slideUp 300ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      {/* Header */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        borderBottom: `1px solid ${t.separator}`,
        position: 'relative',
      }}>
        <button
          onClick={onBack}
          style={{ width: 36, height: 36, borderRadius: '50%', background: t.btnBg, border: 'none', color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600 }}>
          Enregistrer l'activité
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 10, background: 'none', border: 'none', color: '#06B6D4', fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? '…' : 'Enregistrer'}
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: 120 }}>

        {/* Titre */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>Titre</p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={autoTitle}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 12, padding: '12px 16px',
              fontSize: 16, color: t.text, outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>

        {/* Type d'entraînement */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>Type d'entraînement</p>
          <TrainingTypeSelector selected={trainingTypes} onChange={setTrainingTypes} isDark={isDark} types={sport === 'running' ? RUNNING_TYPES : sport === 'trail' ? TRAIL_TYPES : sport === 'hiking' ? HIKING_TYPES : sport === 'mtb' ? MTB_TYPES : sport === 'rowing' ? ROWING_TYPES : sport === 'gym' ? STRENGTH_TYPES : sport === 'hyrox' ? HYROX_TYPES : CYCLING_TYPES} />
        </div>

        {/* RPE */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>Ressenti (RPE)</p>
          <p style={{ fontSize: 12, color: t.muted, margin: '-6px 0 16px' }}>Comment tu t'es senti pendant l'effort ?</p>
          <RPESlider value={rpe} onChange={setRpe} isDark={isDark} />
        </div>

        {/* Commentaire */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>Commentaire</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            placeholder="Décris ta séance, tes sensations…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 12, padding: '12px 16px',
              fontSize: 14, color: t.text, outline: 'none',
              resize: 'none', fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>
      </div>

      {/* Sticky bottom button */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 20px',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        background: isDark ? 'linear-gradient(transparent, #0A0A0A 40%)' : 'linear-gradient(transparent, #FFFFFF 40%)',
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
            border: 'none', color: '#fff',
            fontSize: 16, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
          }}
        >
          {saving ? 'Enregistrement…' : "Enregistrer l'activité"}
        </button>
      </div>
    </div>
  )
}
