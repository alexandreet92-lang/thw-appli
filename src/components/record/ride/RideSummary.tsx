'use client'
// Écran de RÉSUMÉ affiché après « Terminer » : récapitule la séance (durée,
// puissance moyenne, NP, travail, FC, SM est.), laisse l'athlète saisir un titre,
// son RPE et ses sensations, puis « Enregistrer » persiste l'activité et l'emmène
// sur la page Training. Rien n'est enregistré tant que l'athlète n'a pas validé.
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { fmtClock } from './format'
import type { RideMetrics } from './types'
import { motion, useReducedMotion } from 'motion/react'
import { haptic } from '@/lib/haptics'
import { RkHero, RkGrid, RkCell, RkGroup, RkRow, RkCta, RkRangeSheet, RK_DOT, RK_SPRING } from '../kit/RecordKit'

export default function RideSummary({ metrics, elapsedS, smEst, defaultTitle, saving, onSave }: {
  metrics: RideMetrics
  elapsedS: number
  smEst: number
  defaultTitle: string
  saving: boolean
  onSave: (title: string, rpe: number, comment: string) => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [title, setTitle] = useState(defaultTitle)
  const [rpe, setRpe] = useState(5)
  const [comment, setComment] = useState('')
  const [rpeOpen, setRpeOpen] = useState(false)
  const rpeColor = rpe <= 3 ? 'var(--success)' : rpe <= 6 ? RK_DOT.warn : rpe <= 8 ? 'var(--sport-gym)' : 'var(--danger)'
  const card: React.CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }

  return (
    <motion.div initial={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }} animate={{ y: 0, opacity: 1 }} transition={reduce ? { duration: 0.15 } : RK_SPRING}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-page)' }}>
      <div style={{ flexShrink: 0, textAlign: 'center', padding: 'calc(env(safe-area-inset-top) + 14px) 16px 8px' }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>{t('rec.saveTitle')}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t('w2c.sessionComplete')}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '6px 16px 24px', maxWidth: 600, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Titre + sensations */}
          <div style={{ ...card, padding: '16px 16px 12px' }}>
            <input className="rk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('w2c.sessionTitlePlaceholder')}
              aria-label={t('w2c.sessionTitle')} style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', minHeight: 36 }} />
            <textarea className="rk-input" value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder={t('w2c.sensationsPlaceholder')}
              aria-label={t('w2c.sensations')} style={{ fontSize: 16, marginTop: 6, resize: 'none', lineHeight: 1.4 }} />
          </div>

          {/* Héro durée + récap chiffré */}
          <div className="rk-card">
            <RkHero label={t('w2c.duration')} value={fmtClock(elapsedS)} size={56} />
            <RkGrid>
              <RkCell label={t('w2c.avgPower')} value={String(metrics.avgW || 0)} unit="W" size={30} />
              <RkCell label="NP" value={String(metrics.np || 0)} unit="W" size={30} />
              <RkCell label={t('w2c.work')} value={String(metrics.kj || 0)} unit="kJ" size={30} />
              <RkCell label={t('w2c.avgHr')} value={metrics.hrAvg ? String(metrics.hrAvg) : '—'} unit={metrics.hrAvg ? 'bpm' : undefined} size={30} />
              <RkCell label={t('w2c.smEst')} value={String(smEst)} size={30} span={2} />
            </RkGrid>
          </div>

          {/* Effort perçu */}
          <RkGroup>
            <RkRow label={t('w2c.perceivedEffort')} onClick={() => setRpeOpen(true)}
              value={<span className="rk-num" style={{ letterSpacing: 0, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="rk-dot" style={{ background: rpeColor }} />{rpe}/10 · {t('w2c.rpe_' + rpe)}</span>} />
          </RkGroup>
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: '10px 16px calc(env(safe-area-inset-bottom) + 14px)', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        <RkCta variant="primary" disabled={saving} progress={saving ? 66 : null} style={{ opacity: 1 }}
          onClick={() => { haptic('medium'); onSave(title.trim() || defaultTitle, rpe, comment) }}>
          {saving ? t('w2c.saving') : t('rec.saveActivity')}
        </RkCta>
      </div>
      <RkRangeSheet open={rpeOpen} onClose={() => setRpeOpen(false)} title={t('w2c.perceivedEffort')}
        value={rpe} min={1} max={10} step={1} color={rpeColor} caption={t('w2c.rpe_' + rpe)} onChange={setRpe} zIndex={10080} />
    </motion.div>
  )
}
