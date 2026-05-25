'use client'
import { GPSStatus } from '@/hooks/useGPSTracking'

interface Props {
  status: GPSStatus
  accuracy: number | null
  isDark?: boolean
}

const STATUS_CONFIG: Record<GPSStatus, { color: string; label: string; blink: boolean }> = {
  [GPSStatus.idle]:        { color: '#8C8C8C', label: 'GPS inactif',          blink: false },
  [GPSStatus.requesting]:  { color: '#06B6D4', label: 'Connexion…',           blink: true  },
  [GPSStatus.acquiring]:   { color: '#06B6D4', label: 'Acquisition…',         blink: true  },
  [GPSStatus.good]:        { color: '#10B981', label: 'Bon signal',            blink: false },
  [GPSStatus.approximate]: { color: '#F59E0B', label: 'Signal approximatif',  blink: false },
  [GPSStatus.poor]:        { color: '#EF4444', label: 'Signal faible',        blink: false },
  [GPSStatus.denied]:      { color: '#EF4444', label: 'GPS refusé',           blink: false },
  [GPSStatus.unavailable]: { color: '#8C8C8C', label: 'GPS indisponible',     blink: false },
  [GPSStatus.error]:       { color: '#EF4444', label: 'Erreur GPS',           blink: false },
}

export default function GPSIndicator({ status, accuracy, isDark = false }: Props) {
  const cfg = STATUS_CONFIG[status]
  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'

  const label = accuracy != null && (status === GPSStatus.good || status === GPSStatus.approximate || status === GPSStatus.poor)
    ? `${cfg.label} (±${Math.round(accuracy)}m)`
    : cfg.label

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 24, padding: '0 8px',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: cfg.color, flexShrink: 0,
        animation: cfg.blink ? 'gps-blink 1s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 11, color: dim, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}
