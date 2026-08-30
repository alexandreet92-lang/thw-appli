'use client'
// ════════════════════════════════════════════════════════════════════
// UploadGauge — zone de progression de l'envoi (spec §7). Remplace les
// boutons du résumé : jauge (piste 8 px r4, remplissage accent, % à droite)
// reflétant la progression RÉELLE par étapes ; 100 % → 350 ms → pastille
// verte « Séance enregistrée » + « Voir l'entraînement ». Échec : jauge
// stoppée, « Envoi interrompu » + « Réessayer ».
// ════════════════════════════════════════════════════════════════════

import { useI18n } from '@/lib/i18n'

export type UploadGaugeState = 'uploading' | 'failed' | 'done'

interface Props {
  state: UploadGaugeState
  /** Progression réelle 0–100. */
  progress: number
  onRetry: () => void
  onSeeTraining: () => void
}

export default function UploadGauge({ state, progress, onRetry, onSeeTraining }: Props) {
  const { t } = useI18n()
  if (state === 'done') {
    return (
      <div style={{ paddingTop: 2, textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--live-success-dim)', color: 'var(--live-success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M4 12.5 L9.5 18 L20 6.5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 16 }}>{t('activities.recordedSession')}</div>
        <button className="lv2-pill lv2-pill-primary lv2-press" onClick={onSeeTraining}>
          Voir l’entraînement
        </button>
      </div>
    )
  }

  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div style={{ padding: '8px 6px 6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, fontWeight: 600, color: 'var(--live-text-2)', marginBottom: 10 }}>
        <span>{state === 'failed' ? 'Envoi interrompu' : 'Envoi de la séance…'}</span>
        <b className="lv2-num" style={{ color: 'var(--live-text)', fontWeight: 800 }}>{pct} %</b>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--live-surface-2)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 4,
          background: state === 'failed' ? 'var(--live-warn)' : 'var(--live-accent)',
          transition: 'width 0.12s linear',
        }} />
      </div>
      {state === 'failed' && (
        <button className="lv2-pill lv2-pill-primary lv2-press" style={{ marginTop: 16 }} onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  )
}
