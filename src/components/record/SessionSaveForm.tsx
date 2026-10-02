'use client'
import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
import { haptic } from '@/lib/haptics'
import {
  rkScope, RkFab, RkFabSpacer, RkIco, RK_ICON, RkGroup, RkRow, RkCta, RkRangeSheet, RkPickSheet, RkSheet, RK_SPRING, RK_DOT,
} from './kit/RecordKit'

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
  /** Supprimer l'activité (double confirmation). Absent → bouton masqué. */
  onDiscard?: () => void
}

// ── Effort perçu (RPE 1→10) — points sémantiques de charge ─────────
function rpeColor(v: number): string {
  if (v <= 3) return 'var(--success)'
  if (v <= 6) return RK_DOT.warn
  if (v <= 8) return 'var(--sport-gym)'
  return 'var(--danger)'
}
function rpeLabel(v: number): string {
  if (v <= 2) return 'Très facile'
  if (v <= 4) return 'Facile'
  if (v <= 6) return 'Modéré'
  if (v <= 8) return 'Difficile'
  return 'Maximal'
}
// ── Ressenti (note /5 — 5 = au top) ────────────────────────────────
function sensColor(v: number): string {
  if (v <= 1.5) return 'var(--danger)'
  if (v <= 2.5) return 'var(--sport-gym)'
  if (v <= 3.5) return RK_DOT.warn
  return 'var(--success)'
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

function sportTitleKey(sport: string): string {
  return sport === 'running' ? 'record.sessionSaveTitleRunning' : sport === 'trail' ? 'record.sessionSaveTitleTrail' : sport === 'hiking' ? 'record.sessionSaveTitleHiking' : sport === 'mtb' ? 'record.sessionSaveTitleMtb' : sport === 'rowing' ? 'record.sessionSaveTitleRowing' : sport === 'gym' ? 'record.sessionSaveTitleGym' : sport === 'hyrox' ? 'record.sessionSaveTitleHyrox' : sport === 'yoga' ? 'record.sessionSaveTitleYoga' : sport === 'padel' ? 'record.sessionSaveTitlePadel' : sport === 'openwater' ? 'record.sessionSaveTitleOpenWater' : sport === 'hometrainer' ? 'record.sessionSaveTitleHomeTrainer' : 'record.sessionSaveTitleCycling'
}

function getAutoTitle(sport: string, startedAt: string, t: (key: string) => string): string {
  const d = new Date(startedAt)
  const day = d.toLocaleDateString(currentLocale(), { weekday: 'short' })
  const num = d.getDate()
  const month = d.toLocaleDateString(currentLocale(), { month: 'long' })
  const label = t(sportTitleKey(sport))
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${label} · ${cap(day)} ${num} ${month}`
}

function typesFor(sport: string) {
  return sport === 'running' ? RUNNING_TYPES : sport === 'trail' ? TRAIL_TYPES : sport === 'hiking' ? HIKING_TYPES : sport === 'mtb' ? MTB_TYPES : sport === 'rowing' ? ROWING_TYPES : sport === 'gym' ? STRENGTH_TYPES : sport === 'hyrox' ? HYROX_TYPES : sport === 'boxe' ? BOXE_TYPES : sport === 'hybrid' ? HYBRID_TYPES : sport === 'yoga' ? YOGA_TYPES : sport === 'padel' ? PADEL_TYPES : sport === 'openwater' ? OPEN_WATER_TYPES : sport === 'hometrainer' ? HT_TYPES : CYCLING_TYPES
}

const VIS_OPTS: { id: Visibility; label: string; icon: React.ReactNode }[] = [
  { id: 'public', label: 'Public', icon: <RkIco d={RK_ICON.globe} size={20} /> },
  { id: 'followers', label: 'Abonnés', icon: <RkIco d={RK_ICON.users} size={20} /> },
  { id: 'private', label: 'Privé', icon: <RkIco d={RK_ICON.lock} size={20} /> },
]

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export default function SessionSaveForm({ sport, startedAt, onBack, onSave, isDark, summary, hr, onDiscard }: Props) {
  const { t: tr } = useI18n()
  const reduce = useReducedMotion()
  const autoTitle = getAutoTitle(sport, startedAt, tr)
  const [title, setTitle]                 = useState(autoTitle)
  const [trainingTypes, setTrainingTypes] = useState<string[]>([])
  const [rpe, setRpe]                     = useState(5)
  const [sensation, setSensation]         = useState(3)
  const [comment, setComment]             = useState('')
  const [photos, setPhotos]               = useState<File[]>([])
  const [visibility, setVisibility]       = useState<Visibility>('public')
  const [saving, setSaving]               = useState(false)
  const [closing, setClosing]             = useState(false)
  const [sheet, setSheet]                 = useState<'none' | 'type' | 'rpe' | 'sens' | 'vis'>('none')
  const [armed, setArmed]                 = useState(false)
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const requestClose = () => { if (closing) return; setClosing(true); setTimeout(onBack, 300) }

  const handleSave = async () => {
    if (saving) return
    haptic('medium')
    setSaving(true)
    const finalTitle = title.trim() || autoTitle
    await onSave({ title: finalTitle, trainingTypes, rpe, sensation, comment, photos, visibility })
    notifyActivitySaved({ sport, title: finalTitle })
    haptic('success')
    setSaving(false)
  }
  const handleDiscard = () => {
    if (!onDiscard) return
    if (!armed) {
      haptic('medium'); setArmed(true)
      armTimer.current = setTimeout(() => setArmed(false), 3000)
      return
    }
    if (armTimer.current) clearTimeout(armTimer.current)
    haptic('heavy'); setArmed(false); onDiscard()
  }

  const types = typesFor(sport)
  const typeLabel = types.filter(ty => trainingTypes.includes(ty.id)).map(ty => ty.label).join(', ')
  const photoUrls = useMemo(() => photos.map(f => URL.createObjectURL(f)), [photos])

  const stats: { label: string; value: string; unit?: string }[] = []
  if (summary) {
    stats.push({ label: tr('rec.statDuration'), value: fmtDur(summary.durationSec) })
    stats.push({ label: tr('rec.statExercises'), value: String(summary.exos) })
    stats.push({ label: tr('rec.statSets'), value: String(summary.sets) })
    if (summary.volumeKg > 0) stats.push({ label: tr('rec.statVolume'), value: Math.round(summary.volumeKg).toLocaleString('fr-FR'), unit: 'kg' })
  }
  if (hr?.avg != null) stats.push({ label: tr('rec.statHrAvg'), value: String(Math.round(hr.avg)), unit: 'bpm' })
  if (hr?.max != null) stats.push({ label: tr('rec.statHrMax'), value: String(Math.round(hr.max)), unit: 'bpm' })

  const card: React.CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }

  return (
    <motion.div className={rkScope(isDark)}
      initial={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
      animate={closing ? { x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 } : { x: 0, opacity: 1 }}
      transition={reduce ? { duration: 0.15 } : RK_SPRING}
      style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'var(--surface-page)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      <style>{`.ssf-col{width:100%;max-width:600px;margin:0 auto}`}</style>

      {/* En-tête : retour · « Enregistrer » */}
      <div className="ssf-col" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFab label={tr('record.pageEditorBack')} onClick={requestClose}><RkIco d={RK_ICON.back} size={22} sw={2.2} /></RkFab>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>{tr('record.sessionSaveHeader')}</div>
        <RkFabSpacer />
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div className="ssf-col" style={{ padding: '6px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Titre + commentaire */}
          <div style={{ ...card, padding: '16px 16px 12px' }}>
            <input className="rk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={autoTitle}
              aria-label={tr('record.sessionSaveTitleLabel')}
              style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', minHeight: 36 }} />
            <textarea className="rk-input" value={comment} onChange={e => setComment(e.target.value)} rows={2}
              placeholder={tr('record.sessionSaveCommentPlaceholder')} aria-label={tr('record.sessionSaveComment')}
              style={{ fontSize: 16, marginTop: 6, resize: 'none', lineHeight: 1.4 }} />
          </div>

          {/* Données de la séance (si fournies) */}
          {stats.length > 0 && (
            <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 10px', padding: '14px 16px 16px' }}>
              {stats.map(c => (
                <div key={c.label} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{c.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                    <span className="rk-num" style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</span>
                    {c.unit && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{c.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photos */}
          <div className="rk-chips" style={{ gap: 8, margin: '0 -16px', padding: '0 16px' }}>
            <label aria-label={tr('record.sessionSavePhotos')} className="rk-press"
              style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 'var(--r-md)', background: 'var(--surface-card)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RkIco d={RK_ICON.camera} size={24} sw={1.8} />
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const fs = Array.from(e.target.files ?? []); setPhotos(p => [...p, ...fs].slice(0, 6)) }} />
            </label>
            {photoUrls.map((u, i) => (
              <div key={u} className="rk-fade-up" style={{ position: 'relative', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 'var(--r-md)', display: 'block' }} />
                <button type="button" aria-label="×" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                  <RkIco d={RK_ICON.close} size={13} sw={2.6} />
                </button>
              </div>
            ))}
          </div>

          {/* Sport · Type · Effort perçu · Ressenti · Visibilité */}
          <RkGroup>
            <RkRow label={tr('w3a.sport_label')} value={tr(sportTitleKey(sport))} />
            <RkRow label={tr('record.sessionSaveTrainingType')} value={typeLabel || tr('rec.choose')} onClick={() => setSheet('type')} />
            <RkRow label={tr('rec.rpeLabel')} value={<span className="rk-num" style={{ letterSpacing: 0, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="rk-dot" style={{ background: rpeColor(rpe) }} />{fmtHalf(rpe)} / 10</span>} onClick={() => setSheet('rpe')} />
            <RkRow label={tr('record.sessionSaveFeeling')} value={<span style={{ color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="rk-dot" style={{ background: sensColor(sensation) }} />{sensLabel(sensation)}</span>} onClick={() => setSheet('sens')} />
            <RkRow label={tr('record.whoCanSeeSession')} value={VIS_OPTS.find(v => v.id === visibility)?.label} onClick={() => setSheet('vis')} />
          </RkGroup>
        </div>
      </div>

      {/* Pied : enregistrer · supprimer */}
      <div className="ssf-col" style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <RkCta variant="primary" onClick={handleSave} disabled={saving} progress={saving ? 66 : null} style={{ opacity: 1 }}>
          {saving ? tr('record.sessionSaveSaving') : tr('rec.saveActivity')}
        </RkCta>
        {onDiscard && (
          <RkCta variant={armed ? 'danger' : 'text-danger'} onClick={handleDiscard} disabled={saving}>
            {armed ? tr('rec.confirmDiscard') : tr('w3a.delete_activity')}
          </RkCta>
        )}
      </div>

      {/* ── Sous-feuilles ── */}
      <RkSheet open={sheet === 'type'} onClose={() => setSheet('none')} title={tr('record.sessionSaveTrainingType')} isDark={isDark} zIndex={10080}
        footer={<RkCta variant="primary" onClick={() => setSheet('none')}>OK</RkCta>}>
        <TrainingTypeSelector selected={trainingTypes} onChange={setTrainingTypes} isDark={isDark} types={types} />
      </RkSheet>
      <RkRangeSheet open={sheet === 'rpe'} onClose={() => setSheet('none')} title={tr('rec.rpeLabel')}
        value={rpe} min={1} max={10} step={0.5} color={rpeColor(rpe)} caption={rpeLabel(rpe)}
        minLabel="Facile" maxLabel="Maximal" onChange={setRpe} isDark={isDark} />
      <RkRangeSheet open={sheet === 'sens'} onClose={() => setSheet('none')} title={tr('record.sessionSaveFeeling')}
        value={sensation} min={1} max={5} step={0.5} color={sensColor(sensation)} caption={sensLabel(sensation)}
        minLabel="Dure" maxLabel="Au top" onChange={setSensation} isDark={isDark} />
      <RkPickSheet open={sheet === 'vis'} onClose={() => setSheet('none')} title={tr('record.whoCanSeeSession')} isDark={isDark}
        items={VIS_OPTS.map(v => ({ id: v.id, label: v.label, icon: <span style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{v.icon}</span> }))}
        selectedId={visibility} onPick={id => { setVisibility(id as Visibility); setSheet('none') }} />
    </motion.div>
  )
}
