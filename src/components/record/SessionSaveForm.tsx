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
  sensation: number          // note /5 (pas de 0,5)
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

// ── Ressenti (RPE 1→10) ────────────────────────────────────────────
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
// ── Sensation (note /5 — 5 = au top) ───────────────────────────────
function sensColor(v: number): string {
  if (v <= 1.5) return '#ef4444'
  if (v <= 2.5) return '#f97316'
  if (v <= 3.5) return '#f59e0b'
  if (v <= 4.5) return '#84cc16'
  return '#22c55e'
}
function sensLabel(v: number): string {
  if (v <= 1.5) return 'Très dure'
  if (v <= 2.5) return 'Difficile'
  if (v <= 3.5) return 'Correcte'
  if (v <= 4.5) return 'Bonne'
  return 'Excellente'
}
// Affichage FR : entier ou décimale à la virgule (5 / 5,5).
function fmtHalf(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1).replace('.', ',')
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
    bg:        isDark ? '#0A0A0A' : '#F4F7F9',
    surface:   isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    field:     isDark ? 'rgba(255,255,255,0.06)' : '#F6F8FA',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    muted:     isDark ? 'rgba(255,255,255,0.5)' : '#7A828B',
    border:    isDark ? 'rgba(255,255,255,0.10)' : '#E7ECF0',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8EDF1',
    btnBg:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)',
    shadow:    isDark ? 'none' : '0 1px 3px rgba(16,24,40,0.05)',
    track:     isDark ? 'rgba(255,255,255,0.12)' : '#E7ECF0',
  }
}

const LABEL_STYLE: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }

// Jauge donut générique (ressenti ou sensation).
function Gauge({ value, max, color, big, sub, isDark }: { value: number; max: number; color: string; big: string; sub: string; isDark: boolean }) {
  const R = 46, C = 2 * Math.PI * R
  const frac = Math.max(0, Math.min(1, value / max))
  return (
    <svg width={126} height={126} viewBox="0 0 120 120" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r={R} fill="none" stroke={isDark ? 'rgba(255,255,255,0.10)' : '#EEF1F4'} strokeWidth="11" />
      <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 180ms, stroke 180ms' }} />
      <text x="60" y="57" textAnchor="middle" style={{ fontFamily: 'Syne, DM Sans, sans-serif', fontSize: 31, fontWeight: 800, fill: color }}>{big}</text>
      <text x="60" y="77" textAnchor="middle" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10.5, fontWeight: 700, fill: isDark ? 'rgba(255,255,255,0.55)' : '#8C8C8C', letterSpacing: '0.02em' }}>{sub}</text>
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
  const [sensation, setSensation]         = useState(3)
  const [comment, setComment]             = useState('')
  const [photos, setPhotos]               = useState<File[]>([])
  const [visibility, setVisibility]       = useState<Visibility>('public')
  const [saving, setSaving]               = useState(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const finalTitle = title.trim() || autoTitle
    await onSave({ title: finalTitle, trainingTypes, rpe, sensation, comment, photos, visibility })
    notifyActivitySaved({ sport, title: finalTitle })
    setSaving(false)
  }

  const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: t.field, border: `1px solid ${t.border}`, borderRadius: 12, padding: '13px 16px', fontSize: 15, color: t.text, outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const cardStyle: React.CSSProperties = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: 20, boxShadow: t.shadow }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: t.bg, color: t.text, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', paddingTop: 'env(safe-area-inset-top)', animation: 'slideFromRight 320ms cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes slideFromRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        input[type=range].g{-webkit-appearance:none;appearance:none;height:8px;border-radius:999px;outline:none;width:100%}
        input[type=range].g::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.3)}
        input[type=range].g::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;cursor:pointer;border:none}
        .ssf-body{max-width:1120px;width:100%;margin:0 auto;padding:26px 24px 130px;box-sizing:border-box}
        .ssf-grid{display:grid;grid-template-columns:1fr;gap:20px}
        .ssf-foot-inner{max-width:1120px;margin:0 auto;display:flex;justify-content:flex-end}
        @media(min-width:900px){
          .ssf-grid{grid-template-columns:390px 1fr;gap:32px;align-items:start}
          .ssf-body{padding:34px 40px 130px}
        }`}</style>

      {/* Header : retour (→ résumé) + titre + Enregistrer */}
      <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${t.separator}`, position: 'relative' }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: t.btnBg, border: 'none', color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 16, fontWeight: 700 }}>{tr('record.sessionSaveHeader')}</span>
      </div>

      {/* Contenu — pleine largeur, 2 colonnes sur ordinateur */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="ssf-body">
          {/* Titre — pleine largeur en tête */}
          <div style={{ marginBottom: 22 }}>
            <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveTitleLabel')}</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={autoTitle}
              style={{ ...fieldStyle, fontSize: 17, fontWeight: 600 }} />
          </div>

          <div className="ssf-grid">
            {/* Colonne gauche : jauges Ressenti + Sensation */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Ressenti (RPE) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ ...LABEL_STYLE, color: t.muted, marginBottom: 0 }}>{tr('record.sessionSaveFeeling')}</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: rpeColor(rpe) }}>{rpeLabel(rpe)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <Gauge value={rpe} max={10} color={rpeColor(rpe)} big={fmtHalf(rpe)} sub={rpeLabel(rpe)} isDark={isDark} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <input type="range" className="g" min={1} max={10} step={0.5} value={rpe} onChange={e => setRpe(Number(e.target.value))}
                      style={{ background: `linear-gradient(90deg, ${rpeColor(rpe)} ${(rpe - 1) / 9 * 100}%, ${t.track} ${(rpe - 1) / 9 * 100}%)` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 10.5, color: t.muted }}>Facile</span>
                      <span style={{ fontSize: 10.5, color: t.muted }}>Maximal</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: t.separator }} />

              {/* Sensation /5 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ ...LABEL_STYLE, color: t.muted, marginBottom: 0 }}>Sensation /5</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sensColor(sensation) }}>{sensLabel(sensation)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <Gauge value={sensation} max={5} color={sensColor(sensation)} big={fmtHalf(sensation)} sub={sensLabel(sensation)} isDark={isDark} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <input type="range" className="g" min={1} max={5} step={0.5} value={sensation} onChange={e => setSensation(Number(e.target.value))}
                      style={{ background: `linear-gradient(90deg, ${sensColor(sensation)} ${(sensation - 1) / 4 * 100}%, ${t.track} ${(sensation - 1) / 4 * 100}%)` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 10.5, color: t.muted }}>Dure</span>
                      <span style={{ fontSize: 10.5, color: t.muted }}>Au top</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite : type, commentaire, photos, visibilité */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Type d'entraînement */}
              <div>
                <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveTrainingType')}</p>
                <TrainingTypeSelector selected={trainingTypes} onChange={setTrainingTypes} isDark={isDark} types={sport === 'running' ? RUNNING_TYPES : sport === 'trail' ? TRAIL_TYPES : sport === 'hiking' ? HIKING_TYPES : sport === 'mtb' ? MTB_TYPES : sport === 'rowing' ? ROWING_TYPES : sport === 'gym' ? STRENGTH_TYPES : sport === 'hyrox' ? HYROX_TYPES : sport === 'boxe' ? BOXE_TYPES : sport === 'hybrid' ? HYBRID_TYPES : sport === 'yoga' ? YOGA_TYPES : sport === 'padel' ? PADEL_TYPES : sport === 'openwater' ? OPEN_WATER_TYPES : sport === 'hometrainer' ? HT_TYPES : CYCLING_TYPES} />
              </div>

              {/* Commentaire */}
              <div>
                <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSaveComment')}</p>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={tr('record.sessionSaveCommentPlaceholder')}
                  style={{ ...fieldStyle, fontSize: 14, resize: 'none' }} />
              </div>

              {/* Photos */}
              <div>
                <p style={{ ...LABEL_STYLE, color: t.muted }}>{tr('record.sessionSavePhotos')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {photos.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ width: 78, height: 78, objectFit: 'cover', borderRadius: 12 }} />
                      <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <label style={{ width: 78, height: 78, borderRadius: 12, border: `1px dashed ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.muted, fontSize: 26, background: t.field }}>
                    +
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const fs = Array.from(e.target.files ?? []); setPhotos(p => [...p, ...fs].slice(0, 6)) }} />
                  </label>
                </div>
              </div>

              {/* Visibilité */}
              <div>
                <p style={{ ...LABEL_STYLE, color: t.muted }}>Qui peut voir cette séance</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {VIS_OPTS.map(o => {
                    const on = visibility === o.id
                    return (
                      <button key={o.id} type="button" onClick={() => setVisibility(o.id)}
                        style={{ flex: 1, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
                          border: `1.5px solid ${on ? '#06B6D4' : t.border}`, background: on ? 'rgba(6,182,212,0.12)' : t.field, color: on ? '#06B6D4' : t.muted, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700 }}>
                        {o.icon}{o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enregistrer — en bas à droite */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)', background: isDark ? 'linear-gradient(transparent, #0A0A0A 40%)' : 'linear-gradient(transparent, #F4F7F9 40%)' }}>
        <div className="ssf-foot-inner">
          <button onClick={handleSave} disabled={saving}
            style={{ height: 52, padding: '0 38px', borderRadius: 16, background: 'linear-gradient(135deg, #06B6D4, #2563EB)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 20px rgba(37,99,235,0.32)' }}>
            {saving ? tr('record.sessionSaveSaving') : tr('record.sessionSaveSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
