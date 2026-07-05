'use client'
import { useI18n } from '@/lib/i18n'

interface Props {
  isDark: boolean
  gradientPercent: number
  elevationGainM: number
  elevationLossM: number
  altitudeM: number
  lapElevGainM: number
  lapElevLossM: number
  dataFontFamily?: string
}

function Cell({ label, value, unit, big, isDark, font }: {
  label: string; value: string; unit?: string; big?: boolean
  isDark: boolean; font: string
}) {
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const accent = '#F59E0B'
  if (big) {
    const val = parseFloat(value)
    const color = isNaN(val) ? text : val > 15 ? '#EF4444' : val > 8 ? '#F59E0B' : val < -15 ? '#06B6D4' : text
    return (
      <div style={{ gridColumn:'1/-1', padding:'20px 12px', borderBottom:`1px solid ${sep}`, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minHeight:100 }}>
        <p style={{ fontSize:11, color:dim, textTransform:'uppercase', letterSpacing:'1.5px', margin:0 }}>{label}</p>
        <p style={{ fontSize:56, fontWeight:700, color, margin:0, lineHeight:1, fontFamily:font }}>{value}</p>
        {unit && <p style={{ fontSize:14, color:dim, margin:0 }}>{unit}</p>}
      </div>
    )
  }
  return (
    <div style={{ padding:'14px 8px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:3, borderRight:`1px solid ${sep}`, borderBottom:`1px solid ${sep}`, minHeight:80 }}>
      <p style={{ fontSize:10, color:dim, textTransform:'uppercase', letterSpacing:'1.2px', margin:0 }}>{label}</p>
      <p style={{ fontSize:30, fontWeight:700, color:text, margin:0, lineHeight:1, fontFamily:font }}>{value}</p>
      {unit && <p style={{ fontSize:12, color: dim, margin:0 }}>{unit}</p>}
    </div>
  )
}

export default function TrailPage3({ isDark, gradientPercent, elevationGainM, elevationLossM, altitudeM, lapElevGainM, lapElevLossM, dataFontFamily }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  const dim  = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, alignContent:'start' }}>
      <Cell big isDark={isDark} font={font} label={t('record.trailGradient')} value={gradientPercent.toFixed(1)} unit="%" />
      <Cell isDark={isDark} font={font} label={t('record.trailElevGain')} value={String(Math.round(elevationGainM))} unit="m" />
      <Cell isDark={isDark} font={font} label={t('record.trailElevLoss')} value={String(Math.round(elevationLossM))} unit="m" />
      <Cell isDark={isDark} font={font} label={t('record.trailAltitude')} value={String(Math.round(altitudeM))} unit="m" />
      <Cell isDark={isDark} font={font} label={t('record.trailLapElevGain')} value={String(Math.round(lapElevGainM))} unit="m" />
      <Cell isDark={isDark} font={font} label={t('record.trailLapElevLoss')} value={String(Math.round(lapElevLossM))} unit="m" />
    </div>
  )
}
