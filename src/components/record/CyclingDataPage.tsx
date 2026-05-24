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
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 flex flex-col justify-center min-h-[88px]">
      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-white font-bold text-[28px] leading-none">{value}</p>
      {unit && <p className="text-xs text-white/40 mt-1">{unit}</p>}
    </div>
  )
}

export default function CyclingDataPage(p: DataPageProps) {
  const distanceKm = (p.distanceM / 1000).toFixed(2)
  const avgPace = p.distanceM > 0 && p.durationSec > 0
    ? formatPace(p.durationSec, p.distanceM)
    : '--:--'

  if (p.pageIndex === 0) {
    return (
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        <div className="bg-white/5 rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[180px]">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Vitesse</p>
          <p className="text-white font-bold text-[80px] leading-none">{p.speedKmh.toFixed(1)}</p>
          <p className="text-sm text-white/50 mt-2">km/h</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Distance" value={`${distanceKm}`} unit="km" />
          <Stat label="Durée" value={formatSeconds(p.durationSec)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="D+" value={`${Math.round(p.elevationGainM)}`} unit="m" />
          <Stat label="Allure moy." value={avgPace} unit="/km" />
        </div>
      </div>
    )
  }

  if (p.pageIndex === 1) {
    return (
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        <div className="flex-1 min-h-[200px] rounded-2xl overflow-hidden bg-white/5">
          <MapBackground trackPoints={p.trackPoints} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Vitesse" value={p.speedKmh.toFixed(1)} unit="km/h" />
          <Stat label="Distance" value={distanceKm} unit="km" />
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
    <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
      <div className="bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">
          Lap {p.laps.length + 1} en cours
        </p>
        <p className="text-white font-bold text-[56px] leading-none">
          {formatSeconds(p.currentLapSec)}
        </p>
        <div className="flex gap-4 mt-3 text-sm text-white/60">
          <span>{currentLapKm} km</span>
          <span>·</span>
          <span>{currentLapSpeed.toFixed(1)} km/h</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-white/5 rounded-2xl">
        <LapsList laps={p.laps} />
      </div>
    </div>
  )
}

function formatPace(durationSec: number, distanceM: number): string {
  if (distanceM === 0) return '--:--'
  const paceSecPerKm = durationSec / (distanceM / 1000)
  const m = Math.floor(paceSecPerKm / 60)
  const s = Math.round(paceSecPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
