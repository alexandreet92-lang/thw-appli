'use client'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n'
import { LegacyCell, LegacyGrid } from './kit/LiveFrame'
import { RK_DOT } from './kit/RecordKit'

const MapBackground = dynamic(() => import('./MapBackground'), { ssr: false })

interface Props {
  isDark: boolean
  distanceM: number
  trackPoints: { lat: number; lng: number }[]
  currentPosition?: [number, number] | null
  onExpand?: () => void
  paused?: boolean
}

export default function CyclingPage2({ distanceM, trackPoints, currentPosition, onExpand, paused }: Props) {
  const { t: tr } = useI18n()
  const distanceKm = (distanceM / 1000).toFixed(2)

  return (
    <div className="cycling-page-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
      {/* Carte — carte arrondie, ~65 % */}
      <div style={{ flexBasis: '65%', flexShrink: 0, minHeight: 0 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 'calc(var(--r-lg) + 4px)', overflow: 'hidden', background: 'var(--surface-card)' }}>
          <MapBackground trackPoints={trackPoints} currentPosition={currentPosition} />
          {paused && (
            <span className="rk-banner" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000 }}>
              <span className="rk-dot" style={{ background: RK_DOT.warn }} />
              {tr('record.cyclingPage2Paused')}
            </span>
          )}
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label={tr('record.cyclingPage2FullscreenMap')}
              className="rk-fab rk-press"
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, width: 44, height: 44 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Watts + Distance */}
      <LegacyGrid>
        <LegacyCell label={tr('record.commonWatts')} value="--" unit="W" />
        <LegacyCell label={tr('record.commonDistance')} value={distanceKm} unit="km" />
      </LegacyGrid>
    </div>
  )
}
