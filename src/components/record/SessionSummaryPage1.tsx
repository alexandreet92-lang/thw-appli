'use client'
import dynamic from 'next/dynamic'
import type { FinishedSession } from '@/types/session'
import ElevationProfile from './ElevationProfile'

const SessionTraceMap = dynamic(() => import('./SessionTraceMap'), { ssr: false })

interface ThemeColors { bg: string; text: string; dim: string; separator: string }

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

interface Props {
  session: FinishedSession
  theme: ThemeColors
  isDark: boolean
  dataFontFamily: string
}

export default function SessionSummaryPage1({ session, theme, isDark, dataFontFamily }: Props) {
  const isTrail = session.sport === 'trail' || session.sport === 'hiking' || session.sport === 'mtb'
  const stats = isTrail
    ? [
        { label: 'DISTANCE', value: (session.distance_m / 1000).toFixed(2), unit: 'km' },
        { label: 'DURÉE',    value: formatDuration(session.duration_seconds), unit: '' },
        { label: 'D+',       value: String(Math.round(session.elevation_gain_m)), unit: 'm' },
        { label: 'D-',       value: String(Math.round(session.elevation_loss_m ?? 0)), unit: 'm' },
      ]
    : [
        { label: 'DISTANCE',     value: (session.distance_m / 1000).toFixed(2), unit: 'km' },
        { label: 'DURÉE',        value: formatDuration(session.duration_seconds), unit: '' },
        { label: 'D+',           value: String(Math.round(session.elevation_gain_m)), unit: 'm' },
        { label: 'VITESSE MOY.', value: session.avg_speed_kmh.toFixed(1), unit: 'km/h' },
      ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
      {/* Stats 2×2 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1, background: theme.separator,
        border: `1px solid ${theme.separator}`,
        borderRadius: 16, overflow: 'hidden', margin: '16px 16px 0',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '16px 12px', background: theme.bg, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1, fontFamily: dataFontFamily }}>
              {s.value}
            </p>
            {s.unit && (
              <p style={{ fontSize: 11, color: theme.dim, margin: '2px 0 0' }}>{s.unit}</p>
            )}
          </div>
        ))}
      </div>

      {/* Carte du tracé */}
      <div style={{
        height: 200, margin: '16px 16px 0',
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${theme.separator}`,
      }}>
        <SessionTraceMap points={session.gps_points} isDark={isDark} />
      </div>

      {/* Profil d'altitude */}
      <div style={{
        margin: '12px 16px 0',
        borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${theme.separator}`,
        background: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA',
      }}>
        <div style={{ padding: '8px 12px 4px' }}>
          <p style={{ margin: 0, fontSize: 10, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Profil d&apos;altitude
          </p>
        </div>
        <ElevationProfile points={session.gps_points} isDark={isDark} height={90} />
      </div>
    </div>
  )
}
