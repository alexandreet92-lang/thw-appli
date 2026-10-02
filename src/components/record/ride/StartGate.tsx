'use client'
// Écran d'entrée : garde FTP (obligatoire, jamais de valeur par défaut),
// résumé de la séance planifiée du jour (ou sortie libre), connexion des
// capteurs, puis « Démarrer ». Si FTP absent → on le dit et on renvoie vers le
// profil (règle d'interconnexion), sans deviner de valeur.
import { IconX, IconBike, IconHeartbeat, IconRotateClockwise, IconAlertTriangle, IconArrowRight } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import { RkFab, RkFabSpacer, RkStatusPill, RkGroup, RkRow, RkTile, RkStartButton } from '../kit/RecordKit'
import { fmtClock } from './format'
import PowerBlocksProfile from './charts/PowerBlocksProfile'
import type { RidePlan } from './types'
import type { SensorStatus, SensorKind } from './useSensors'

interface Props {
  ftp: number | null
  fcMax: number | null
  plan: RidePlan | null
  loading: boolean
  available: boolean | null
  status: Record<SensorKind, SensorStatus>
  onConnect: (k: SensorKind) => void
  onStart: () => void
  onExit: () => void
}

const STAT: Record<SensorStatus, string> = { idle: 'w3b.sensor_connect', connecting: 'w3b.sensor_connecting', connected: 'w3b.sensor_connected', error: 'w3b.sensor_retry' }

function Row({ icon, label, st, onClick }: { icon: React.ReactNode; label: string; st: SensorStatus; onClick: () => void }) {
  const { t } = useI18n()
  const on = st === 'connected'
  return (
    <RkRow
      icon={<RkTile color={on ? 'var(--success)' : 'var(--sport-bike)'}>{icon}</RkTile>}
      label={label}
      disabled={st === 'connecting'}
      onClick={onClick}
      chevron={false}
      right={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: on ? 'var(--success)' : st === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
          {on && <span className="rk-dot" style={{ background: 'var(--success)' }} />}
          {t(STAT[st])}
        </span>
      } />
  )
}

export default function StartGate({ ftp, fcMax, plan, loading, available, status, onConnect, onStart, onExit }: Props) {
  const { t } = useI18n()
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
      <RkFab label={t('w3b.close')} onClick={onExit}><IconX size={20} /></RkFab>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <RkStatusPill dot="var(--sport-bike)">{t('w3b.home_trainer')}</RkStatusPill>
      </div>
      <RkFabSpacer />
    </div>
  )

  const wrap = (child: React.ReactNode, foot?: React.ReactNode) => (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>{child}</div>
      </div>
      {foot}
    </div>
  )

  if (loading) return wrap(<>
    <div aria-hidden style={{ height: 210, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />
    <div aria-hidden style={{ height: 170, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />
    <style>{'@keyframes aioPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){[style*="aioPulse"]{animation:none!important}}'}</style>
    <p style={{ color: 'var(--text-mid)', fontSize: 14, textAlign: 'center', margin: 0 }}>{t('w3b.loading_profile')}</p>
  </>)

  return wrap(
    <>
      <div className="rk-fade-up" style={{ background: 'var(--surface-card)', borderRadius: 'calc(var(--r-lg) + 4px)', padding: 16 }}>
        <div className="rk-label">{t('w3b.session_today')}</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 4 }}>{plan?.title ?? t('w3b.free_ride')}</div>
        <div style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 600, marginTop: 4 }}>
          {plan ? t('w3b.plan_blocks', { n: plan.blocks.length, clock: fmtClock(plan.totalS) }) : t('w3b.no_planned_free')} · {ftp != null ? t('w3b.ftp_val', { ftp }) : t('w3b.ftp_missing')}{fcMax ? ` · ${t('w3b.fc_max', { fc: fcMax })}` : ''}
        </div>
        {/* Graphique des blocs de puissance (SVG raw) — aperçu de la séance. */}
        {plan && plan.blocks.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <PowerBlocksProfile plan={plan} ftp={ftp ?? 0} />
          </div>
        )}
      </div>

      {/* FTP absent : on N'INTERDIT PAS la séance (l'athlète voit et lance son
          plan) ; on prévient juste que les cibles watts seront indisponibles. */}
      {ftp == null && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 14, color: 'var(--text-mid)' }}>
          <IconAlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1, color: 'var(--charge-mid)' }} />
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>
            {t('w3b.ftp_warning')}{' '}
            <a href="/performance" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('w3b.set_ftp')} <IconArrowRight size={14} style={{ verticalAlign: 'middle' }} /></a>
          </span>
        </div>
      )}

      {available === false && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 14, color: 'var(--text-mid)' }}>
          <IconAlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>{t('w3b.sensors_unavailable')}</span>
        </div>
      )}

      {available !== false && (
        <RkGroup>
          <Row icon={<IconBike size={20} />} label={t('w3b.trainer_power_sensor')} st={status.trainer} onClick={() => onConnect('trainer')} />
          <Row icon={<IconHeartbeat size={20} />} label={t('w3b.hr_belt')} st={status.hr} onClick={() => onConnect('hr')} />
          <Row icon={<IconRotateClockwise size={20} />} label={t('w3b.cadence_sensor')} st={status.cadence} onClick={() => onConnect('cadence')} />
        </RkGroup>
      )}
    </>,
    <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '12px 0 calc(env(safe-area-inset-bottom) + 24px)' }}>
      <RkStartButton label={t('w3b.start')} onClick={onStart} size={96} />
    </div>,
  )
}
