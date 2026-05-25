'use client'
import { formatSeconds } from '@/hooks/useStopwatch'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { FONT_OPTIONS } from '@/types/cycling'

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

function Cell({ label, value, unit, t, fontFamily }: {
  label: string; value: string; unit?: string
  t: ReturnType<typeof getTheme>; fontFamily: string
}) {
  return (
    <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 32, fontWeight: 700, lineHeight: 1, color: t.text, fontFamily }}>{value}</p>
      {unit && <p style={{ margin: '4px 0 0', fontSize: 11, color: t.label }}>{unit}</p>}
    </div>
  )
}

export default function CyclingPage1({ isDark, durationSec, speedKmh, distanceM, elevationGainM }: Props) {
  const t = getTheme(isDark)
  const { settings } = useCyclingSettings()
  const fontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily
  const distanceKm = (distanceM / 1000).toFixed(2)

  return (
    <div className="cycling-page-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flexBasis: '40%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, borderBottom: `1px solid ${t.separator}` }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Durée</p>
        <p style={{ margin: '14px 0 0', fontSize: 72, fontWeight: 700, lineHeight: 1, color: t.text, fontFamily }}>
          {formatSeconds(durationSec)}
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
        <div style={{ borderRight: `1px solid ${t.separator}`, borderBottom: `1px solid ${t.separator}` }}>
          <Cell label="Distance" value={distanceKm} unit="km" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}`, borderBottom: `1px solid ${t.separator}` }}>
          <Cell label="Vitesse" value={speedKmh.toFixed(1)} unit="km/h" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderBottom: `1px solid ${t.separator}` }}>
          <Cell label="D+" value={`${Math.round(elevationGainM)}`} unit="m" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <Cell label="Watts" value="--" unit="w" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderRight: `1px solid ${t.separator}` }}>
          <Cell label="FC" value="--" unit="bpm" t={t} fontFamily={fontFamily} />
        </div>
        <div>
          <Cell label="Watts moy" value="--" unit="w" t={t} fontFamily={fontFamily} />
        </div>
      </div>
    </div>
  )
}
