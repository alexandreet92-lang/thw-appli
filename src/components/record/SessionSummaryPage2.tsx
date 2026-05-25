'use client'
import type { FinishedSession } from '@/types/session'

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
  dataFontFamily: string
}

export default function SessionSummaryPage2({ session, theme, dataFontFamily }: Props) {
  const maxAlt = session.gps_points.length
    ? Math.max(...session.gps_points.map(p => p.altitude ?? -Infinity).filter(a => a !== -Infinity))
    : null
  const minAlt = session.gps_points.length
    ? Math.min(...session.gps_points.map(p => p.altitude ?? Infinity).filter(a => a !== Infinity))
    : null

  const stats: { label: string; value: string; unit: string; dim?: boolean }[] = [
    { label: 'WATTS MOY.',   value: '--',                                          unit: 'w',    dim: true },
    { label: 'WATTS NOR.',   value: '--',                                          unit: 'w',    dim: true },
    { label: 'FC MOYENNE',   value: '--',                                          unit: 'bpm',  dim: true },
    { label: 'FC MAX',       value: '--',                                          unit: 'bpm',  dim: true },
    { label: 'TSS',          value: '--',                                          unit: '',     dim: true },
    { label: 'IF',           value: '--',                                          unit: '',     dim: true },
    { label: 'VITESSE MAX',  value: session.max_speed_kmh.toFixed(1),             unit: 'km/h' },
    { label: 'CALORIES',     value: String(session.calories),                     unit: 'kcal' },
    { label: 'ALT. MAX',     value: maxAlt != null && isFinite(maxAlt) ? String(Math.round(maxAlt)) : '--', unit: 'm' },
    { label: 'ALT. MIN',     value: minAlt != null && isFinite(minAlt) ? String(Math.round(minAlt)) : '--', unit: 'm' },
    { label: 'TEMPS MOV.',   value: formatDuration(session.duration_seconds),     unit: '' },
    { label: 'CADENCE',      value: '--',                                          unit: 'rpm',  dim: true },
  ]

  const hasDimStats = stats.some(s => s.dim)

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1, background: theme.separator,
        border: `1px solid ${theme.separator}`,
        borderRadius: 16, overflow: 'hidden', margin: '16px 16px 0',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '12px 8px', background: theme.bg, textAlign: 'center',
            opacity: s.dim ? 0.45 : 1,
          }}>
            <p style={{ fontSize: 9, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 4px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1, fontFamily: dataFontFamily }}>
              {s.value}
            </p>
            {s.unit && (
              <p style={{ fontSize: 10, color: theme.dim, margin: '2px 0 0' }}>{s.unit}</p>
            )}
          </div>
        ))}
      </div>

      {hasDimStats && (
        <p style={{ margin: '16px 16px 0', fontSize: 12, color: theme.dim, lineHeight: 1.5, textAlign: 'center' }}>
          ⚡ Données capteur non disponibles — connecte tes capteurs pour voir ces métriques.
        </p>
      )}
    </div>
  )
}
