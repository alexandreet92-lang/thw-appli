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
import { YOGA_TYPES } from '@/types/yoga'
import { PADEL_TYPES } from '@/types/padel'
import { OPEN_WATER_TYPES } from '@/types/openwater'
import { HT_TYPES } from '@/types/hometrainer'

export interface SessionFormData {
  title: string
  trainingTypes: string[]
  rpe: number
  comment: string
  photos?: File[]
}

export interface SaveSummary { exos: number; sets: number; volumeKg: number; durationSec: number }

interface Props {
  sport: string
  startedAt: string
  onBack: () => void
  onSave: (data: SessionFormData) => Promise<void>
  isDark: boolean
  summary?: SaveSummary
  hr?: { avg: number | null; min: number | null; max: number | null }
  circuitTypes?: string[]   // types de circuit utilisés dans la séance (pré-cochés)
}

// Libellés des types de circuit (pour les tags pré-cochés du formulaire).
const CIRCUIT_TYPE_LABEL: Record<string, string> = {
  series: 'Séries', circuit: 'Lap', superset: 'Superset', emom: 'EMOM', tabata: 'Tabata',
}

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function getAutoTitle(sport: string, startedAt: string): string {
  const d = new Date(startedAt)
  const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
  const num = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  const label = sport === 'running' ? 'Sortie running' : sport === 'trail' ? 'Sortie trail' : sport === 'hiking' ? 'Randonnée' : sport === 'mtb' ? 'Sortie VTT' : sport === 'rowing' ? 'Aviron' : sport === 'gym' ? 'Séance muscu' : sport === 'hyrox' ? 'Séance Hyrox' : sport === 'yoga' ? 'Séance yoga' : sport === 'padel' ? 'Séance padel' : sport === 'openwater' ? 'Natation eau libre' : sport === 'hometrainer' ? 'Séance home trainer' : 'Sortie vélo'
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

export default function SessionSaveForm({ sport, startedAt, onBack, onSave, isDark, summary, hr, circuitTypes }: Props) {
  const t = getTheme(isDark)
  const autoTitle = getAutoTitle(sport, startedAt)
  const [title, setTitle]               = useState(autoTitle)
  const [trainingTypes, setTrainingTypes] = useState<string[]>([])
  const [circuits, setCircuits]         = useState<string[]>(() => circuitTypes ?? [])
  const [rpe, setRpe]                   = useState(5)
  const [comment, setComment]           = useState('')
  const [photos, setPhotos]             = useState<File[]>([])
  const [saving, setSaving]             = useState(false)
  const showCircuits = sport === 'gym' || sport === 'hyrox'

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    // Les types de circuit cochés sont persistés avec les types d'entraînement.
    const types = [...trainingTypes, ...circuits.map(c => `circuit:${c}`)]
    await onSave({ title: title.trim() || autoTitle, trainingTypes: types, rpe, comment, photos })
    setSaving(false)
  }
  const toggleCircuit = (id: string) => setCircuits(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])

  const stat = (label: string, value: string) => (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 18, fontWeight: 800, color: t.text, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.muted, margin: '2px 0 0' }}>{label}</p>
    </div>
  )

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

        {/* Résumé de séance */}
        {summary && (
          <div style={{ display: 'flex', gap: 4, padding: '14px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, marginBottom: 18 }}>
            {stat('Exercices', String(summary.exos))}
            {stat('Séries', String(summary.sets))}
            {stat('Volume', summary.volumeKg ? `${Math.round(summary.volumeKg)} kg` : '—')}
            {stat('Durée', fmtDur(summary.durationSec))}
          </div>
        )}

        {/* Fréquence cardiaque */}
        {hr && (hr.avg != null || hr.max != null || hr.min != null) && (
          <div style={{ display: 'flex', gap: 4, padding: '14px 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, marginBottom: 18 }}>
            {stat('FC moy', hr.avg != null ? `${hr.avg}` : '—')}
            {stat('FC min', hr.min != null ? `${hr.min}` : '—')}
            {stat('FC max', hr.max != null ? `${hr.max}` : '—')}
          </div>
        )}

        {/* Photos de séance */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>Photos</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} style={{ position: 'relative' }}>
                <img src={URL.createObjectURL(f)} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            ))}
            <label style={{ width: 70, height: 70, borderRadius: 10, border: `1px dashed ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.muted, fontSize: 26 }}>
              +
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { const fs = Array.from(e.target.files ?? []); setPhotos(p => [...p, ...fs].slice(0, 6)) }} />
            </label>
          </div>
        </div>

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
          <TrainingTypeSelector selected={trainingTypes} onChange={setTrainingTypes} isDark={isDark} types={sport === 'running' ? RUNNING_TYPES : sport === 'trail' ? TRAIL_TYPES : sport === 'hiking' ? HIKING_TYPES : sport === 'mtb' ? MTB_TYPES : sport === 'rowing' ? ROWING_TYPES : sport === 'gym' ? STRENGTH_TYPES : sport === 'hyrox' ? HYROX_TYPES : sport === 'yoga' ? YOGA_TYPES : sport === 'padel' ? PADEL_TYPES : sport === 'openwater' ? OPEN_WATER_TYPES : sport === 'hometrainer' ? HT_TYPES : CYCLING_TYPES} />
        </div>

        {/* Type de circuit (muscu/hyrox) — pré-coché avec ceux utilisés */}
        {showCircuits && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ ...LABEL_STYLE, color: t.muted }}>Type de circuit</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['series', 'circuit', 'superset', 'emom', 'tabata'].map(id => {
                const on = circuits.includes(id)
                return (
                  <button key={id} type="button" onClick={() => toggleCircuit(id)} style={{
                    padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: `1px solid ${on ? '#06B6D4' : t.border}`, background: on ? 'rgba(6,182,212,0.12)' : 'transparent',
                    color: on ? '#06B6D4' : t.muted,
                  }}>{CIRCUIT_TYPE_LABEL[id]}</button>
                )
              })}
            </div>
          </div>
        )}

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
