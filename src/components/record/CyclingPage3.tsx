'use client'
import { formatSeconds } from '@/hooks/useStopwatch'
import { useI18n } from '@/lib/i18n'

interface Props {
  isDark: boolean
  currentLapSec: number
  altitudeM: number | null
}

function getTheme(isDark: boolean) {
  return {
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    label:     isDark ? 'rgba(255,255,255,0.35)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
  }
}

function Cell({ label, value, unit, t }: {
  label: string; value: string; unit?: string; t: ReturnType<typeof getTheme>
}) {
  return (
    <div style={{
      padding: '14px 12px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: 0,
    }}>
      <p style={{
        margin: 0,
        fontSize: 10, fontWeight: 700,
        color: t.label,
        textTransform: 'uppercase', letterSpacing: '0.15em',
      }}>{label}</p>
      <p style={{
        margin: '6px 0 0',
        fontSize: 32, fontWeight: 700, lineHeight: 1,
        color: t.text, fontFamily: 'DM Mono, monospace',
      }}>{value}</p>
      {unit && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: t.label }}>{unit}</p>
      )}
    </div>
  )
}

function formatLap(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function CyclingPage3({ isDark, currentLapSec, altitudeM }: Props) {
  const { t: tr } = useI18n()
  const t = getTheme(isDark)

  return (
    <div className="cycling-page-in" style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      {/* WATTS — 35% */}
      <div style={{
        flexBasis: '35%', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
        borderBottom: `1px solid ${t.separator}`,
      }}>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 700,
          color: t.label,
          textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>{tr('record.commonWatts')}</p>
        <p style={{
          margin: '12px 0 4px',
          fontSize: 80, fontWeight: 700, lineHeight: 1,
          color: t.text, fontFamily: 'DM Mono, monospace',
        }}>--</p>
        <p style={{ margin: 0, fontSize: 14, color: t.label }}>w</p>
      </div>

      {/* Grille 3×2 — 65% */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}>
        <div style={{ borderRight: `1px solid ${t.separator}`, borderBottom: `1px solid ${t.separator}` }}>
          <Cell label={tr('record.commonLapDuration')} value={formatLap(currentLapSec)} t={t} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}`, borderBottom: `1px solid ${t.separator}` }}>
          <Cell label={tr('record.cyclingPage3WattsAvgLap')} value="--" unit="w" t={t} />
        </div>
        <div style={{ borderBottom: `1px solid ${t.separator}` }}>
          <Cell label={tr('record.cyclingPage3HrAvgLap')} value="--" unit="bpm" t={t} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <Cell label={tr('record.commonCadence')} value="--" unit="rpm" t={t} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <Cell label={tr('record.commonAltitude')} value={altitudeM != null ? `${Math.round(altitudeM)}` : '--'} unit="m" t={t} />
        </div>
        <div>
          <Cell label={tr('record.cyclingPage3WattsNorm')} value="--" unit="w" t={t} />
        </div>
      </div>
    </div>
  )
}
