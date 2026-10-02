'use client'
import dynamic from 'next/dynamic'
import { detectTrailType } from '@/types/mtb'
import { useI18n } from '@/lib/i18n'
import { distFactor, getUnitLabel, type LiveUnits } from './units'

const MapBackground = dynamic(() => import('./MapBackground'), { ssr: false })

interface Props {
  isDark: boolean
  distanceM: number
  speedKmh: number
  gradientPercent: number
  elevationGainM: number
  trackPoints: { lat: number; lng: number }[]
  currentPosition?: [number, number] | null
  units?: LiveUnits
}

export default function MTBPage2({ distanceM, speedKmh, gradientPercent, elevationGainM, trackPoints, currentPosition, units }: Props) {
  const { t: tr } = useI18n()
  const terrainType = detectTrailType(speedKmh, gradientPercent, elevationGainM)
  // Réglage Unités appliqué à la tuile distance (km → mi).
  const distanceKm = ((distanceM / 1000) * distFactor(units)).toFixed(2)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, gap: 12 }}>
      <div style={{ flexBasis:'58%', flexShrink:0, minHeight:0 }}>
        <div style={{ width:'100%', height:'100%', borderRadius: 'calc(var(--r-lg) + 4px)', overflow:'hidden', background: 'var(--surface-card)' }}>
          <MapBackground trackPoints={trackPoints} currentPosition={currentPosition} />
        </div>
      </div>

      <div className="rk-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 1, background: 'var(--border)', flexShrink: 0 }}>
        <div className="rk-cell">
          <div className="rk-label">{tr('record.commonDistance')}</div>
          <div className="rk-cell-v">
            <span className="rk-cell-n rk-num" style={{ fontSize: 38 }}>{distanceKm}</span>
            <span className="rk-cell-u">{getUnitLabel('km', units)}</span>
          </div>
        </div>
        <div className="rk-cell" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
          <div className="rk-label">{tr('record.mtbPage2EstimatedTerrain')}</div>
          <span style={{ display:'inline-flex', alignItems: 'center', gap: 6, background:'var(--surface-chip)', borderRadius: 'var(--r-pill)', padding:'6px 12px', fontSize:14, fontWeight:700 }}>
            <span className="rk-dot" style={{ background: 'var(--sport-gym)' }} />{terrainType}
          </span>
          <span style={{ fontSize:11, color:'var(--text-mid)', fontStyle:'italic' }}>{tr('record.mtbPage2TerrainHint')}</span>
        </div>
      </div>
    </div>
  )
}
