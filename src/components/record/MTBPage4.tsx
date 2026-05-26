'use client'

interface Props {
  isDark: boolean
  currentLapSec: number
  currentLapDistanceM: number
  avgSpeedKmh: number
  lapElevGainM: number
  lapElevLossM: number
  dataFontFamily?: string
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function Cell({ label, value, unit, big, isDark, font }: {
  label: string; value: string; unit?: string; big?: boolean
  isDark: boolean; font: string
}) {
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  if (big) return (
    <div style={{ gridColumn:'1/-1', padding:'20px 12px', borderBottom:`1px solid ${sep}`, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minHeight:100 }}>
      <p style={{ fontSize:11, color:dim, textTransform:'uppercase', letterSpacing:'1.5px', margin:0 }}>{label}</p>
      <p style={{ fontSize:56, fontWeight:700, color:text, margin:0, lineHeight:1, fontFamily:font }}>{value}</p>
      {unit && <p style={{ fontSize:14, color:dim, margin:0 }}>{unit}</p>}
    </div>
  )
  return (
    <div style={{ padding:'14px 8px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:3, borderRight:`1px solid ${sep}`, borderBottom:`1px solid ${sep}`, minHeight:80 }}>
      <p style={{ fontSize:10, color:dim, textTransform:'uppercase', letterSpacing:'1.2px', margin:0 }}>{label}</p>
      <p style={{ fontSize:30, fontWeight:700, color:text, margin:0, lineHeight:1, fontFamily:font }}>{value}</p>
      {unit && <p style={{ fontSize:12, color:dim, margin:0 }}>{unit}</p>}
    </div>
  )
}

export default function MTBPage4({ isDark, currentLapSec, currentLapDistanceM, lapElevGainM, lapElevLossM, dataFontFamily }: Props) {
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  const lapSpeedKmh = currentLapSec > 0 ? (currentLapDistanceM / currentLapSec) * 3.6 : 0
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, alignContent:'start' }}>
      <Cell big isDark={isDark} font={font} label="Durée lap" value={fmt(currentLapSec)} />
      <Cell isDark={isDark} font={font} label="Distance lap" value={(currentLapDistanceM/1000).toFixed(2)} unit="km" />
      <Cell isDark={isDark} font={font} label="Vit. lap" value={lapSpeedKmh.toFixed(1)} unit="km/h" />
      <Cell isDark={isDark} font={font} label="D+ lap" value={String(Math.round(lapElevGainM))} unit="m" />
      <Cell isDark={isDark} font={font} label="D- lap" value={String(Math.round(lapElevLossM))} unit="m" />
      <Cell isDark={isDark} font={font} label="FC" value="--" unit="bpm" />
    </div>
  )
}
