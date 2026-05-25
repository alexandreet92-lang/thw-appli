'use client'
import { GPSStatus } from '@/hooks/useGPSTracking'
import GPSIndicator from './GPSIndicator'

export type CyclingPhase = 'ready' | 'running' | 'paused'

interface Props {
  phase: CyclingPhase
  gpsStatus: GPSStatus
  gpsAccuracy: number | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onLap: () => void
  onFinish: () => void
  isDark?: boolean
}

function getTheme(isDark: boolean) {
  return {
    bg:        isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    label:     isDark ? 'rgba(255,255,255,0.55)' : '#666',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
    btnBg:     isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    pauseBg:   isDark ? '#FFFFFF' : '#0A0A0A',
    pauseText: isDark ? '#0A0A0A' : '#FFFFFF',
  }
}

export default function CyclingControls({
  phase, gpsStatus, gpsAccuracy, onStart, onPause, onResume, onLap, onFinish, isDark = false,
}: Props) {
  const t = getTheme(isDark)
  const canStart   = gpsStatus === GPSStatus.good || gpsStatus === GPSStatus.approximate
  const gpsLoading = gpsStatus === GPSStatus.requesting || gpsStatus === GPSStatus.acquiring

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      background: t.bg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: `1px solid ${t.separator}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 24px',
      paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    }}>
      {phase === 'ready' && (
        <>
          <GPSIndicator status={gpsStatus} accuracy={gpsAccuracy} isDark={isDark} />
          <div style={{ height: 8 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              onClick={canStart ? onStart : undefined}
              disabled={!canStart && !gpsLoading}
              aria-label="Démarrer"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
                background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
                boxShadow: canStart ? '0 4px 20px rgba(6,182,212,0.40)' : 'none',
                opacity: canStart || gpsLoading ? 1 : 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.12s, opacity 0.2s',
              }}
              onMouseDown={e => { if (canStart) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
              onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              {gpsLoading ? (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <p style={{
              margin: 0, fontSize: 11, fontWeight: 700,
              color: canStart ? '#06B6D4' : t.label, letterSpacing: '0.06em',
            }}>
              {canStart ? 'DÉMARRER' : gpsLoading ? 'ACQUISITION…' : 'GPS REQUIS'}
            </p>
          </div>
        </>
      )}

      {phase === 'running' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              onClick={onLap}
              aria-label="Lap"
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: t.btnBg, color: t.text, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M14 5l7 7-7 7"/>
              </svg>
            </button>
            <p style={{ margin: 0, fontSize: 10, color: t.label, letterSpacing: '0.06em' }}>LAP</p>
          </div>
          <button
            onClick={onPause}
            aria-label="Pause"
            style={{
              width: 68, height: 68, borderRadius: '50%',
              background: t.pauseBg, color: t.pauseText, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(0,0,0,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <rect x="5" y="3" width="4" height="16" rx="1"/>
              <rect x="13" y="3" width="4" height="16" rx="1"/>
            </svg>
          </button>
          <div style={{ width: 52 }} />
        </div>
      )}

      {phase === 'paused' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              onClick={onFinish}
              aria-label="Stop"
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="3" y="3" width="12" height="12" rx="1.5"/>
              </svg>
            </button>
            <p style={{ margin: 0, fontSize: 10, color: t.label, letterSpacing: '0.06em' }}>STOP</p>
          </div>
          <button
            onClick={onResume}
            aria-label="Reprendre"
            style={{
              width: 68, height: 68, borderRadius: '50%',
              background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(6,182,212,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <div style={{ width: 52 }} />
        </div>
      )}
    </div>
  )
}
