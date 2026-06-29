'use client'
import CyclingPage2 from './CyclingPage2'

interface Props {
  isDark: boolean
  distanceM: number
  trackPoints: { lat: number; lng: number }[]
  currentPosition: [number, number] | null
  onExpand?: () => void
  paused?: boolean
}

export default function TrailPage2({ isDark, distanceM, trackPoints, currentPosition, onExpand, paused }: Props) {
  return (
    <CyclingPage2
      isDark={isDark}
      distanceM={distanceM}
      trackPoints={trackPoints}
      currentPosition={currentPosition}
      onExpand={onExpand}
      paused={paused}
    />
  )
}
