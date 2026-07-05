'use client'
import { formatPace, speedToMinKm } from '@/types/trail'
import { useI18n } from '@/lib/i18n'

interface Props {
  isDark: boolean
  durationSec: number
  distanceM: number
  elevationGainM: number
  elevationLossM: number
  altitudeM: number
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

export default function HikingPage1({ isDark, durationSec, distanceM, elevationGainM, elevationLossM, altitudeM, dataFontFamily }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  const avgSpeedKmh = durationSec > 0 ? (distanceM / durationSec) * 3.6 : 0
  const avgPace = speedToMinKm(avgSpeedKmh)
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, alignContent:'start' }}>
      <Cell big isDark={isDark} font={font} label={t('record.commonDuration')} value={fmt(durationSec)} />
      <Cell isDark={isDark} font={font} label={t('record.commonDistance')} value={(distanceM/1000).toFixed(2)} unit="km" />
      <Cell isDark={isDark} font={font} label="D+" value={String(Math.round(elevationGainM))} unit="m" />
      <Cell isDark={isDark} font={font} label="D-" value={String(Math.round(elevationLossM))} unit="m" />
      <Cell isDark={isDark} font={font} label={t('record.commonAltitude')} value={String(Math.round(altitudeM))} unit="m" />
      <Cell isDark={isDark} font={font} label={t('record.hikingPage1WalkPace')} value={avgPace != null ? formatPace(avgPace) : '--'} unit="min/km" />
    </div>
  )
}
