'use client'
import dynamic from 'next/dynamic'

const MapBackground = dynamic(() => import('./MapBackground'), { ssr: false })

interface Props {
  isDark: boolean
  distanceM: number
  trackPoints: { lat: number; lng: number }[]
  currentPosition?: [number, number] | null
}

function getTheme(isDark: boolean) {
  return {
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    label:     isDark ? 'rgba(255,255,255,0.35)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
  }
}

function BigCell({ label, value, unit, t }: {
  label: string; value: string; unit?: string; t: ReturnType<typeof getTheme>
}) {
  return (
    <div style={{
      padding: '16px 12px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      minHeight: 0,
    }}>
      <p style={{
        margin: 0, fontSize: 10, fontWeight: 700,
        color: t.label,
        textTransform: 'uppercase', letterSpacing: '0.15em',
      }}>{label}</p>
      <p style={{
        margin: '6px 0 0',
        fontSize: 44, fontWeight: 700, lineHeight: 1,
        color: t.text, fontFamily: 'DM Mono, monospace',
      }}>{value}</p>
      {unit && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: t.label }}>{unit}</p>
      )}
    </div>
  )
}

export default function CyclingPage2({ isDark, distanceM, trackPoints, currentPosition }: Props) {
  const t = getTheme(isDark)
  const distanceKm = (distanceM / 1000).toFixed(2)

  return (
    <div className="cycling-page-in" style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      {/* Carte — 65% */}
      <div style={{
        flexBasis: '65%', flexShrink: 0,
        padding: '0 12px 12px',
        minHeight: 0,
      }}>
        <div style={{
          width: '100%', height: '100%',
          borderRadius: 16, overflow: 'hidden',
          border: `1px solid ${t.separator}`,
        }}>
          <MapBackground trackPoints={trackPoints} currentPosition={currentPosition} />
        </div>
      </div>

      {/* Watts + Distance — 35% */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderTop: `1px solid ${t.separator}`,
      }}>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <BigCell label="Watts" value="--" unit="w" t={t} />
        </div>
        <BigCell label="Distance" value={distanceKm} unit="km" t={t} />
      </div>
    </div>
  )
}
