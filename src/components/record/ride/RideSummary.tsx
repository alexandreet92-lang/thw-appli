'use client'
// Écran de RÉSUMÉ affiché après « Terminer » : récapitule la séance (durée,
// puissance moyenne, NP, travail, FC, SM est.), laisse l'athlète saisir un titre,
// son RPE et ses sensations, puis « Enregistrer » persiste l'activité et l'emmène
// sur la page Training. Rien n'est enregistré tant que l'athlète n'a pas validé.
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { fmtClock } from './format'
import type { RideMetrics } from './types'

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
        {value}{unit && <small style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 2 }}>{unit}</small>}
      </div>
    </div>
  )
}

export default function RideSummary({ metrics, elapsedS, smEst, defaultTitle, saving, onSave }: {
  metrics: RideMetrics
  elapsedS: number
  smEst: number
  defaultTitle: string
  saving: boolean
  onSave: (title: string, rpe: number, comment: string) => void
}) {
  const { t } = useI18n()
  const [title, setTitle] = useState(defaultTitle)
  const [rpe, setRpe] = useState(5)
  const [comment, setComment] = useState('')
  const accent = 'var(--primary)'

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top)', overflowY: 'auto' }}>
      <div style={{ padding: '20px 18px 40px', maxWidth: 560, width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 800 }}>{t('w2c.sessionComplete')}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{fmtClock(elapsedS)}</div>
        </div>

        {/* Récap chiffré */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
          <Stat label={t('w2c.avgPower')} value={metrics.avgW || 0} unit="W" />
          <Stat label="NP" value={metrics.np || 0} unit="W" />
          <Stat label={t('w2c.work')} value={metrics.kj || 0} unit="kJ" />
          <Stat label={t('w2c.avgHr')} value={metrics.hrAvg || '—'} unit={metrics.hrAvg ? 'bpm' : ''} />
          <Stat label={t('w2c.smEst')} value={smEst} />
          <Stat label={t('w2c.duration')} value={fmtClock(elapsedS)} />
        </div>

        {/* Titre */}
        <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 7 }}>{t('w2c.sessionTitle')}</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('w2c.sessionTitlePlaceholder')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 15, outline: 'none', marginBottom: 20 }} />

        {/* RPE */}
        <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span>{t('w2c.perceivedEffort')}</span>
          <span style={{ color: accent }}>{rpe}/10 · {t('w2c.rpe_' + rpe)}</span>
        </label>
        <input type="range" min={1} max={10} value={rpe} onChange={e => setRpe(+e.target.value)}
          style={{ width: '100%', accentColor: accent, marginBottom: 20 }} />

        {/* Sensations */}
        <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 7 }}>{t('w2c.sensations')}</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder={t('w2c.sensationsPlaceholder')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 24 }} />

        <button onClick={() => onSave(title.trim() || defaultTitle, rpe, comment)} disabled={saving}
          style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', background: accent, color: 'var(--on-primary)', fontSize: 15.5, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? t('w2c.saving') : t('w2c.save')}
        </button>
      </div>
    </div>
  )
}
