'use client'
import dynamic from 'next/dynamic'
import LapsList, { type Lap } from './LapsList'
import { formatSeconds } from '@/hooks/useStopwatch'

const MapBackground = dynamic(() => import('./MapBackground'), { ssr: false })

interface DataPageProps {
  pageIndex: number
  speedKmh: number
  distanceM: number
  durationSec: number
  elevationGainM: number
  laps: Lap[]
  currentLapSec: number
  currentLapDistance: number
  trackPoints: { lat: number; lng: number }[]
  isDark: boolean
}

function formatPace(durationSec: number, distanceM: number): string {
  if (distanceM === 0) return '--:--'
  const paceSecPerKm = durationSec / (distanceM / 1000)
  const m = Math.floor(paceSecPerKm / 60)
  const s = Math.round(paceSecPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function GridCell({ label, value, unit, text, labelColor }: {
  label: string; value: string; unit?: string; text: string; labelColor: string
}) {
  return (
    <div style={{
      padding: '16px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <p style={{
        margin: 0,
        fontSize: 10, fontWeight: 700,
        color: labelColor,
        textTransform: 'uppercase', letterSpacing: '0.15em',
      }}>{label}</p>
      <p style={{
        margin: '6px 0 0',
        fontSize: 34, fontWeight: 700, lineHeight: 1,
        color: text,
        fontFamily: 'DM Mono, monospace',
      }}>{value}</p>
      {unit && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: labelColor }}>{unit}</p>
      )}
    </div>
  )
}

export default function CyclingDataPage(p: DataPageProps) {
  const text       = p.isDark ? '#FFFFFF' : '#0A0A0A'
  const labelColor = p.isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const separator  = p.isDark ? 'rgba(255,255,255,0.10)' : '#E5E5E5'

  const distanceKm = (p.distanceM / 1000).toFixed(2)
  const avgPace = p.distanceM > 0 && p.durationSec > 0
    ? formatPace(p.durationSec, p.distanceM)
    : '--:--'

  if (p.pageIndex === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* VITESSE plein écran */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          borderBottom: `1px solid ${separator}`,
        }}>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 700,
            color: labelColor,
            textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>Vitesse</p>
          <p style={{
            margin: '12px 0 4px',
            fontSize: 80, fontWeight: 700, lineHeight: 1,
            color: text, fontFamily: 'DM Mono, monospace',
          }}>{p.speedKmh.toFixed(1)}</p>
          <p style={{ margin: 0, fontSize: 13, color: labelColor }}>km/h</p>
        </div>

        {/* Grille 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${separator}` }}>
          <div style={{ borderRight: `1px solid ${separator}` }}>
            <GridCell label="Distance" value={distanceKm} unit="km" text={text} labelColor={labelColor} />
          </div>
          <GridCell label="Durée" value={formatSeconds(p.durationSec)} text={text} labelColor={labelColor} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ borderRight: `1px solid ${separator}` }}>
            <GridCell label="D+" value={`${Math.round(p.elevationGainM)}`} unit="m" text={text} labelColor={labelColor} />
          </div>
          <GridCell label="Allure" value={avgPace} unit="min/km" text={text} labelColor={labelColor} />
        </div>
      </div>
    )
  }

  if (p.pageIndex === 1) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12 }}>
        <div style={{ flex: 1, minHeight: 200, borderRadius: 16, overflow: 'hidden' }}>
          <MapBackground trackPoints={p.trackPoints} />
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          border: `1px solid ${separator}`, borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ borderRight: `1px solid ${separator}` }}>
            <GridCell label="Vitesse" value={p.speedKmh.toFixed(1)} unit="km/h" text={text} labelColor={labelColor} />
          </div>
          <GridCell label="Distance" value={distanceKm} unit="km" text={text} labelColor={labelColor} />
        </div>
      </div>
    )
  }

  // page 2 — laps
  const currentLapKm = (p.currentLapDistance / 1000).toFixed(2)
  const currentLapSpeed = p.currentLapDistance > 0 && p.currentLapSec > 0
    ? (p.currentLapDistance / p.currentLapSec) * 3.6
    : 0
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12 }}>
      <div style={{
        border: `1px solid ${separator}`, borderRadius: 12,
        padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Lap {p.laps.length + 1} en cours
        </p>
        <p style={{ margin: '8px 0 4px', fontSize: 56, fontWeight: 700, lineHeight: 1, color: text, fontFamily: 'DM Mono, monospace' }}>
          {formatSeconds(p.currentLapSec)}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: labelColor }}>
          {currentLapKm} km · {currentLapSpeed.toFixed(1)} km/h
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${separator}`, borderRadius: 12 }}>
        <LapsList laps={p.laps} isDark={p.isDark} />
      </div>
    </div>
  )
}
