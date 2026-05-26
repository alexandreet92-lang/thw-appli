'use client'
import { formatSeconds } from '@/hooks/useStopwatch'

interface Props {
  isDark: boolean
  durationSec: number
  speedKmh: number
  distanceM: number
  elevationGainM: number
  elevationLossM: number
  dataFontFamily?: string
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
    <div style={{ padding:'14px 12px', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:0 }}>
      <p style={{ margin:0, fontSize:10, fontWeight:700, color:t.label, textTransform:'uppercase', letterSpacing:'0.15em' }}>{label}</p>
      <p style={{ margin:'6px 0 0', fontSize:32, fontWeight:700, lineHeight:1, color:t.text, fontFamily }}>{value}</p>
      {unit && <p style={{ margin:'4px 0 0', fontSize:11, color:t.label }}>{unit}</p>}
    </div>
  )
}

export default function MTBPage1({ isDark, durationSec, speedKmh, distanceM, elevationGainM, elevationLossM, dataFontFamily }: Props) {
  const t = getTheme(isDark)
  const fontFamily = dataFontFamily ?? '-apple-system, sans-serif'
  const distanceKm = (distanceM / 1000).toFixed(2)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
      <div style={{ flexBasis:'40%', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, borderBottom:`1px solid ${t.separator}` }}>
        <p style={{ margin:0, fontSize:10, fontWeight:700, color:t.label, textTransform:'uppercase', letterSpacing:'0.15em' }}>Vitesse</p>
        <p style={{ margin:'14px 0 0', fontSize:72, fontWeight:700, lineHeight:1, color:t.text, fontFamily }}>{speedKmh.toFixed(1)}</p>
        <p style={{ margin:'4px 0 0', fontSize:14, color:t.label }}>km/h</p>
      </div>
      <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'1fr 1fr' }}>
        <div style={{ borderRight:`1px solid ${t.separator}`, borderBottom:`1px solid ${t.separator}` }}>
          <Cell label="Durée" value={formatSeconds(durationSec)} t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderRight:`1px solid ${t.separator}`, borderBottom:`1px solid ${t.separator}` }}>
          <Cell label="Distance" value={distanceKm} unit="km" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderBottom:`1px solid ${t.separator}` }}>
          <Cell label="D+" value={`${Math.round(elevationGainM)}`} unit="m" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderRight:`1px solid ${t.separator}` }}>
          <Cell label="D-" value={`${Math.round(elevationLossM)}`} unit="m" t={t} fontFamily={fontFamily} />
        </div>
        <div style={{ borderRight:`1px solid ${t.separator}` }}>
          <Cell label="FC" value="--" unit="bpm" t={t} fontFamily={fontFamily} />
        </div>
        <div>
          <Cell label="Vit. moy." value={durationSec > 0 ? ((distanceM/1000)/(durationSec/3600)).toFixed(1) : '--'} unit="km/h" t={t} fontFamily={fontFamily} />
        </div>
      </div>
    </div>
  )
}
