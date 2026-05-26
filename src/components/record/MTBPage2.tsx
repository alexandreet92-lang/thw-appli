'use client'
import dynamic from 'next/dynamic'
import { detectTrailType } from '@/types/mtb'

const MapBackground = dynamic(() => import('./MapBackground'), { ssr: false })

interface Props {
  isDark: boolean
  distanceM: number
  speedKmh: number
  gradientPercent: number
  elevationGainM: number
  trackPoints: { lat: number; lng: number }[]
  currentPosition?: [number, number] | null
}

function getTheme(isDark: boolean) {
  return {
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    label:     isDark ? 'rgba(255,255,255,0.35)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    cardBg:    isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
  }
}

export default function MTBPage2({ isDark, distanceM, speedKmh, gradientPercent, elevationGainM, trackPoints, currentPosition }: Props) {
  const t = getTheme(isDark)
  const terrainType = detectTrailType(speedKmh, gradientPercent, elevationGainM)
  const distanceKm = (distanceM / 1000).toFixed(2)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
      <div style={{ flexBasis:'58%', flexShrink:0, padding:'0 12px 12px', minHeight:0 }}>
        <div style={{ width:'100%', height:'100%', borderRadius:16, overflow:'hidden', border:`1px solid ${t.separator}` }}>
          <MapBackground trackPoints={trackPoints} currentPosition={currentPosition} />
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 1fr', borderTop:`1px solid ${t.separator}` }}>
        <div style={{ padding:'16px 12px', borderRight:`1px solid ${t.separator}` }}>
          <p style={{ margin:0, fontSize:10, fontWeight:700, color:t.label, textTransform:'uppercase', letterSpacing:'0.15em' }}>Distance</p>
          <p style={{ margin:'6px 0 0', fontSize:40, fontWeight:700, lineHeight:1, color:t.text, fontFamily:'DM Mono, monospace' }}>{distanceKm}</p>
          <p style={{ margin:'4px 0 0', fontSize:12, color:t.label }}>km</p>
        </div>
        <div style={{ padding:'12px', display:'flex', flexDirection:'column', justifyContent:'center', gap:6 }}>
          <p style={{ margin:0, fontSize:10, fontWeight:700, color:t.label, textTransform:'uppercase', letterSpacing:'0.12em' }}>Terrain estimé</p>
          <div style={{ display:'inline-flex', alignSelf:'flex-start', background:'rgba(249,115,22,0.12)', borderRadius:20, padding:'4px 10px' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#F97316' }}>{terrainType}</span>
          </div>
          <p style={{ margin:0, fontSize:10, color:t.label, fontStyle:'italic' }}>(estimation vitesse + pente)</p>
        </div>
      </div>
    </div>
  )
}
