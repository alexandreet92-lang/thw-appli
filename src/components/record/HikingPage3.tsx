'use client'
import { useI18n } from '@/lib/i18n'
import { altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  gradientPercent: number
  elevationGainM: number
  elevationLossM: number
  altitudeM: number
  distanceM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}

function Cell({ label, value, unit, big, isDark, font, sizes }: {
  label: string; value: string; unit?: string; big?: boolean
  isDark: boolean; font: string; sizes: { big: number; small: number }
}) {
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  if (big) {
    const val = parseFloat(value)
    const color = isNaN(val) ? text : val > 15 ? '#EF4444' : val > 8 ? '#F59E0B' : val < -15 ? '#06B6D4' : text
    return (
      <div style={{ gridColumn:'1/-1', padding:'20px 12px', borderBottom:`1px solid ${sep}`, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minHeight:100 }}>
        <p style={{ fontSize:11, color:dim, textTransform:'uppercase', letterSpacing:'1.5px', margin:0 }}>{label}</p>
        <p style={{ fontSize:sizes.big, fontWeight:700, color, margin:0, lineHeight:1, fontFamily:font }}>{value}</p>
        {unit && <p style={{ fontSize:14, color:dim, margin:0 }}>{unit}</p>}
      </div>
    )
  }
  return (
    <div style={{ padding:'14px 8px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:3, borderRight:`1px solid ${sep}`, borderBottom:`1px solid ${sep}`, minHeight:80 }}>
      <p style={{ fontSize:10, color:dim, textTransform:'uppercase', letterSpacing:'1.2px', margin:0 }}>{label}</p>
      <p style={{ fontSize:sizes.small, fontWeight:700, color:text, margin:0, lineHeight:1, fontFamily:font }}>{value}</p>
      {unit && <p style={{ fontSize:12, color:dim, margin:0 }}>{unit}</p>}
    </div>
  )
}

export default function HikingPage3({ isDark, gradientPercent, elevationGainM, elevationLossM, altitudeM, distanceM, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const altF  = altFactor(units)
  const mUnit = getUnitLabel('m', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  const avgGradient = distanceM > 0 ? (elevationGainM / distanceM) * 100 : 0
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, alignContent:'start' }}>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.commonCurrentGradient')} value={gradientPercent.toFixed(1)} unit="%" />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D+" value={String(Math.round(elevationGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D-" value={String(Math.round(elevationLossM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.commonAltitude')} value={String(Math.round(altitudeM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.hikingPage3AvgGradient')} value={avgGradient.toFixed(1)} unit="%" />
    </div>
  )
}
