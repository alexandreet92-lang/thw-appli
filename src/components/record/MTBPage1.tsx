'use client'
import { formatSeconds } from '@/hooks/useStopwatch'
import { useI18n } from '@/lib/i18n'
import { distFactor, altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  durationSec: number
  speedKmh: number
  distanceM: number
  elevationGainM: number
  elevationLossM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}

function getTheme(isDark: boolean) {
  return {
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    label:     isDark ? 'rgba(255,255,255,0.35)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
  }
}

function Cell({ label, value, unit, t, fontFamily, fontSize }: {
  label: string; value: string; unit?: string
  t: ReturnType<typeof getTheme>; fontFamily: string; fontSize: number
}) {
  return (
    <div style={{ padding:'14px 12px', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:0 }}>
      <p style={{ margin:0, fontSize:10, fontWeight:700, color:t.label, textTransform:'uppercase', letterSpacing:'0.15em' }}>{label}</p>
      <p style={{ margin:'6px 0 0', fontSize, fontWeight:700, lineHeight:1, color:t.text, fontFamily }}>{value}</p>
      {unit && <p style={{ margin:'4px 0 0', fontSize:11, color:t.label }}>{unit}</p>}
    </div>
  )
}

export default function MTBPage1({ isDark, durationSec, speedKmh, distanceM, elevationGainM, elevationLossM, dataFontFamily, units, dataSize }: Props) {
  const { t: tr } = useI18n()
  const t = getTheme(isDark)
  const fontFamily = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const scale = SIZE_SCALE[dataSize ?? 'normal']
  const heroSize = Math.round(scale.big * 72 / 56)
  const cellSize = Math.round(scale.small * 32 / 30)
  const distanceKm = ((distanceM / 1000) * distF).toFixed(2)
  const kmUnit  = getUnitLabel('km', units)
  const kmhUnit = getUnitLabel('km/h', units)
  const mUnit   = getUnitLabel('m', units)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
      <div style={{ flexBasis:'40%', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, borderBottom:`1px solid ${t.separator}` }}>
        <p style={{ margin:0, fontSize:10, fontWeight:700, color:t.label, textTransform:'uppercase', letterSpacing:'0.15em' }}>{tr('record.commonSpeed')}</p>
        <p style={{ margin:'14px 0 0', fontSize:heroSize, fontWeight:700, lineHeight:1, color:t.text, fontFamily }}>{(speedKmh * distF).toFixed(1)}</p>
        <p style={{ margin:'4px 0 0', fontSize:14, color:t.label }}>{kmhUnit}</p>
      </div>
      <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'1fr 1fr' }}>
        <div style={{ borderRight:`1px solid ${t.separator}`, borderBottom:`1px solid ${t.separator}` }}>
          <Cell label={tr('record.commonDuration')} value={formatSeconds(durationSec)} t={t} fontFamily={fontFamily} fontSize={cellSize} />
        </div>
        <div style={{ borderRight:`1px solid ${t.separator}`, borderBottom:`1px solid ${t.separator}` }}>
          <Cell label={tr('record.commonDistance')} value={distanceKm} unit={kmUnit} t={t} fontFamily={fontFamily} fontSize={cellSize} />
        </div>
        <div style={{ borderBottom:`1px solid ${t.separator}` }}>
          <Cell label="D+" value={`${Math.round(elevationGainM * altF)}`} unit={mUnit} t={t} fontFamily={fontFamily} fontSize={cellSize} />
        </div>
        <div style={{ borderRight:`1px solid ${t.separator}` }}>
          <Cell label="D-" value={`${Math.round(elevationLossM * altF)}`} unit={mUnit} t={t} fontFamily={fontFamily} fontSize={cellSize} />
        </div>
        <div style={{ borderRight:`1px solid ${t.separator}` }}>
          <Cell label={tr('record.commonHr')} value="--" unit="bpm" t={t} fontFamily={fontFamily} fontSize={cellSize} />
        </div>
        <div>
          <Cell label={tr('record.commonAvgSpeedShort')} value={durationSec > 0 ? (((distanceM/1000)/(durationSec/3600)) * distF).toFixed(1) : '--'} unit={kmhUnit} t={t} fontFamily={fontFamily} fontSize={cellSize} />
        </div>
      </div>
    </div>
  )
}
