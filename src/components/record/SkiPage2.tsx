'use client'
import CyclingPage2 from './CyclingPage2'

interface Props {
  isDark: boolean
  distanceM: number
  trackPoints: { lat: number; lng: number }[]
  currentPosition: [number, number] | null
}

export default function SkiPage2({ isDark, distanceM, trackPoints, currentPosition }: Props) {
  return (
    <CyclingPage2
      isDark={isDark}
      distanceM={distanceM}
      trackPoints={trackPoints}
      currentPosition={currentPosition}
    />
  )
}
