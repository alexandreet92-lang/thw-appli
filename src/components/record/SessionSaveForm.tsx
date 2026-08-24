'use client'
import { useState } from 'react'
import TrainingTypeSelector from './TrainingTypeSelector'
import { RUNNING_TYPES } from '@/types/running'
import { TRAIL_TYPES } from '@/types/trail'
import { CYCLING_TYPES, BOXE_TYPES, HYBRID_TYPES } from './TrainingTypeSelector'
import { HIKING_TYPES } from '@/types/hiking'
import { MTB_TYPES } from '@/types/mtb'
import { ROWING_TYPES } from '@/types/rowing'
import { STRENGTH_TYPES, HYROX_TYPES } from '@/types/workout'
import { YOGA_TYPES } from '@/types/yoga'
import { PADEL_TYPES } from '@/types/padel'
import { OPEN_WATER_TYPES } from '@/types/openwater'
import { HT_TYPES } from '@/types/hometrainer'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'
import { notifyActivitySaved } from '@/lib/notifications/activitySaved'

export type Visibility = 'public' | 'followers' | 'private'

export interface SessionFormData {
  title: string
  trainingTypes: string[]
  rpe: number
  comment: string
  photos?: File[]
  visibility: Visibility
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
  circuitTypes?: string[]
  doneList?: { label: string; detail?: string }[]
}

// Couleur / libellé du ressenti (RPE 1→10).
function rpeColor(v: number): string {
  if (v <= 3) return '#22c55e'
  if (v <= 5) return '#84cc16'
  if (v <= 7) return '#f59e0b'
  if (v <= 8) return '#f97316'
  return '#ef4444'
}
function rpeLabel(v: number): string {
  if (v <= 2) return 'Très facile'
  if (v <= 4) return 'Facile'
  if (v <= 6) return 'Modéré'
  if (v <= 8) return 'Difficile'
  return 'Maximal'
}

function getAutoTitle(sport: string, startedAt: string, t: (key: string) => string): string {
  const d = new Date(startedAt)
  const day = d.toLocaleDateString(currentLocale(), { weekday: 'short' })
  const num = d.getDate()
  const month = d.toLocaleDateString(currentLocale(), { month: 'long' })
  const label = sport === 'running' ? t('record.sessionSaveTitleRunning') : sport === 'trail' ? t('record.sessionSaveTitleTrail') : sport === 'hiking' ? t('record.sessionSaveTitleHiking') : sport === 'mtb' ? t('record.sessionSaveTitleMtb') : sport === 'rowing' ? t('record.sessionSaveTitleRowing') : sport === 'gym' ? t('record.sessionSaveTitleGym') : sport === 'hyrox' ? t('record.sessionSaveTitleHyrox') : sport === 'yoga' ? t('record.sessionSaveTitleYoga') : sport === 'padel' ? t('record.sessionSaveTitlePadel') : sport === 'openwater' ? t('record.sessionSaveTitleOpenWater') : sport === 'hometrainer' ? t('record.sessionSaveTitleHomeTrainer') : t('record.sessionSaveTitleCycling')
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

const LABEL_STYLE: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }

// Jauge donut du ressenti (RPE), réglée par le slider en dessous.
function RpeDonut({ value, isDark }: { value: number; isDark: boolean }) {
  const R = 46, C = 2 * Math.PI * R
  const frac = value / 10
  const col = rpeColor(value)
  return (
    <svg width={128} height={128} viewBox="0 0 120 120" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r={R} fill="none" stroke={isDark ? 'rgba(255,255,255,0.10)' : '#EEF0F2'} strokeWidth="11" />
      <circle cx="60" cy="60" r={R} fill="none" stroke={col} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 200ms, stroke 200ms' }} />
      <text x="60" y="58" textAnchor="middle" style={{ fontFamily: 'Syne, DM Sans, sans-serif', fontSize: 34, fontWeight: 800, fill: col }}>{value}</text>
      <text x="60" y="78" textAnchor="middle" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, fill: isDark ? 'rgba(255,255,255,0.55)' : '#8C8C8C', letterSpacing: '0.02em' }}>{rpeLabel(value)}</text>
    </svg>
  )
}

const VIS_OPTS: { id: Visibility; label: string; icon: React.ReactNode }[] = [
  { id: 'public', label: 'Public', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg> },
  { id: 'followers', label: 'Abonnés', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11l1.6 1.6L22 9.2" /></svg> },
  { id: 'private', label: 'Privé', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg> },
]

export default function SessionSaveForm({ sport, startedAt, onBack, onSave, isDark }: Props) {
  const { t: tr } = useI18n()
  const t = getTheme(isDark)
  const autoTitle = getAutoTitle(sport, startedAt, tr)
  const [title, setTitle]                 = useState(autoTitle)
  const [trainingTypes, setTrainingTypes] = useState<string[]>([])
  const [rpe, setRpe]                     = useState(5)
  const [comment, setComment]             = useState('')
  const [photos, setPhotos]               = useState<File[]>([])
  const [visibility, setVisibility]       = useState<Visibility>('public')
  const [saving, setSaving]               = useState(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const finalTitle = title.trim() || autoTitle
    await onSave({ title: finalTitle, trainingTypes, rpe, comment, photos, visibility })
    notifyActivitySaved({ sport, title: finalTitle })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: t.bg, color: t.text, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', animation: 'slideFromRight 320ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes slideFromRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        input[type=range].rpe{-webkit-appearance:none;appearance:none;height:8px;border-radius:999px;outline:none}
        input[type=range].rpe::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid ${rpeColor(rpe)};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.3)}
        input[type=range].rpe::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid ${rpeColor(rpe)};cursor:pointer}`}</style>

      {/* Header : retour (→ résumé) + titre + Enregistrer */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${t.separator}`, position: 'relative' }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: t.btnBg, border: 'none', color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600 }}>{tr('record.sessionSaveHeader')}</span>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 120px', maxWidth: 640, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Titre */}
        <div style={{ marginBottom: 26 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveTitleLabel')}</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={autoTitle}
            style={{ width: '100%', boxSizing: 'border-box', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '13px 16px', fontSize: 16, color: t.text, outline: 'none', fontFamily: 'DM Sans, sans-serif' }} />
        </div>

        {/* Ressenti (RPE) — jauge donut + slider */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveFeeling')}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <RpeDonut value={rpe} isDark={isDark} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <input type="range" className="rpe" min={1} max={10} step={1} value={rpe} onChange={e => setRpe(Number(e.target.value))}
                style={{ width: '100%', background: `linear-gradient(90deg, ${rpeColor(rpe)} ${(rpe - 1) / 9 * 100}%, ${t.surface} ${(rpe - 1) / 9 * 100}%)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: t.muted }}>Facile</span>
                <span style={{ fontSize: 11, color: t.muted }}>Maximal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Type d'entraînement */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveTrainingType')}</p>
          <TrainingTypeSelector selected={trainingTypes} onChange={setTrainingTypes} isDark={isDark} types={sport === 'running' ? RUNNING_TYPES : sport === 'trail' ? TRAIL_TYPES : sport === 'hiking' ? HIKING_TYPES : sport === 'mtb' ? MTB_TYPES : sport === 'rowing' ? ROWING_TYPES : sport === 'gym' ? STRENGTH_TYPES : sport === 'hyrox' ? HYROX_TYPES : sport === 'boxe' ? BOXE_TYPES : sport === 'hybrid' ? HYBRID_TYPES : sport === 'yoga' ? YOGA_TYPES : sport === 'padel' ? PADEL_TYPES : sport === 'openwater' ? OPEN_WATER_TYPES : sport === 'hometrainer' ? HT_TYPES : CYCLING_TYPES} />
        </div>

        {/* Commentaire */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveComment')}</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={tr('record.sessionSaveCommentPlaceholder')}
            style={{ width: '100%', boxSizing: 'border-box', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 16px', fontSize: 14, color: t.text, outline: 'none', resize: 'none', fontFamily: 'DM Sans, sans-serif' }} />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSavePhotos')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} style={{ position: 'relative' }}>
                <img src={URL.createObjectURL(f)} alt="" style={{ width: 74, height: 74, objectFit: 'cover', borderRadius: 12 }} />
                <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            ))}
            <label style={{ width: 74, height: 74, borderRadius: 12, border: `1px dashed ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.muted, fontSize: 26 }}>
              +
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const fs = Array.from(e.target.files ?? []); setPhotos(p => [...p, ...fs].slice(0, 6)) }} />
            </label>
          </div>
        </div>

        {/* Visibilité */}
        <div style={{ marginBottom: 10 }}>
          <p style={{ ...LABEL_STYLE, color: t.muted }}>Qui peut voir cette séance</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {VIS_OPTS.map(o => {
              const on = visibility === o.id
              return (
                <button key={o.id} type="button" onClick={() => setVisibility(o.id)}
                  style={{ flex: 1, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '13px 8px', borderRadius: 14, cursor: 'pointer',
                    border: `1.5px solid ${on ? '#06B6D4' : t.border}`, background: on ? 'rgba(6,182,212,0.12)' : t.surface, color: on ? '#06B6D4' : t.muted, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700 }}>
                  {o.icon}{o.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Enregistrer — en bas à droite */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)', background: isDark ? 'linear-gradient(transparent, #0A0A0A 40%)' : 'linear-gradient(transparent, #FFFFFF 40%)', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ height: 52, padding: '0 34px', borderRadius: 16, background: 'linear-gradient(135deg, #06B6D4, #2563EB)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}>
          {saving ? tr('record.sessionSaveSaving') : tr('record.sessionSaveSave')}
        </button>
      </div>
    </div>
  )
}
