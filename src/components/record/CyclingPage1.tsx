'use client'
import { formatSeconds } from '@/hooks/useStopwatch'

interface Props {
  isDark: boolean
  durationSec: number
  speedKmh: number
  distanceM: number
  elevationGainM: number
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

export default function CyclingPage1({
  isDark, durationSec, speedKmh, distanceM, elevationGainM,
}: Props) {
  const t = getTheme(isDark)
  const distanceKm = (distanceM / 1000).toFixed(2)

  return (
    <div className="cycling-page-in" style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      {/* DURÉE — 40% */}
      <div style={{
        flexBasis: '40%', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
        borderBottom: `1px solid ${t.separator}`,
      }}>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 700,
          color: t.label,
          textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>Durée</p>
        <p style={{
          margin: '14px 0 0',
          fontSize: 72, fontWeight: 700, lineHeight: 1,
          color: t.text, fontFamily: 'DM Mono, monospace',
        }}>
          {formatSeconds(durationSec)}
        </p>
      </div>

      {/* Grille 3×2 — 60% */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }}>
        <div style={{ borderRight: `1px solid ${t.separator}`, borderBottom: `1px solid ${t.separator}` }}>
          <Cell label="Distance" value={distanceKm} unit="km" t={t} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}`, borderBottom: `1px solid ${t.separator}` }}>
          <Cell label="Vitesse" value={speedKmh.toFixed(1)} unit="km/h" t={t} />
        </div>
        <div style={{ borderBottom: `1px solid ${t.separator}` }}>
          <Cell label="D+" value={`${Math.round(elevationGainM)}`} unit="m" t={t} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <Cell label="Watts" value="--" unit="w" t={t} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <Cell label="FC" value="--" unit="bpm" t={t} />
        </div>
        <div>
          <Cell label="Watts moy" value="--" unit="w" t={t} />
        </div>
      </div>
    </div>
  )
}
