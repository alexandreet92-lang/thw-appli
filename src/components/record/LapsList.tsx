'use client'
import { formatSeconds } from '@/hooks/useStopwatch'

export interface Lap {
  number: number
  duration: number     // secondes
  distance: number     // mètres
  avgSpeed: number     // km/h
  timestamp: number
}

interface Props {
  laps: Lap[]
}

export default function LapsList({ laps }: Props) {
  if (laps.length === 0) {
    return (
      <p className="text-center text-[12px] text-white/40 mt-6">
        Aucun lap enregistré
      </p>
    )
  }
  return (
    <div className="mt-4 overflow-y-auto">
      <div className="grid grid-cols-4 gap-2 px-3 pb-2
                      text-[10px] uppercase tracking-widest text-white/40">
        <span>Lap</span>
        <span>Temps</span>
        <span>Distance</span>
        <span>Vit. moy.</span>
      </div>
      {[...laps].reverse().map(lap => (
        <div
          key={lap.number}
          className="grid grid-cols-4 gap-2 px-3 py-2 text-white text-sm
                     border-t border-white/5"
        >
          <span className="font-mono">#{lap.number}</span>
          <span className="font-mono">{formatSeconds(lap.duration)}</span>
          <span className="font-mono">{(lap.distance / 1000).toFixed(2)} km</span>
          <span className="font-mono">{lap.avgSpeed.toFixed(1)} km/h</span>
        </div>
      ))}
    </div>
  )
}
