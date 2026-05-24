'use client'

export type CyclingPhase = 'ready' | 'running' | 'paused'

interface Props {
  phase: CyclingPhase
  gpsReady: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onLap: () => void
  onFinish: () => void
  isDark?: boolean
}

export default function CyclingControls({
  phase, gpsReady, onStart, onPause, onResume, onLap, onFinish, isDark = false,
}: Props) {
  const text       = isDark ? '#FFFFFF' : '#0A0A0A'
  const labelColor = isDark ? 'rgba(255,255,255,0.60)' : '#666'
  const zoneBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
  const lapBg      = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
  const pauseBg    = isDark ? '#FFFFFF' : '#0A0A0A'
  const pauseText  = isDark ? '#0A0A0A' : '#FFFFFF'

  return (
    <div style={{
      height: 100, flexShrink: 0,
      background: zoneBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: '0 16px',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {phase === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onStart}
            disabled={!gpsReady}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              border: 'none', cursor: gpsReady ? 'pointer' : 'not-allowed',
              background: '#FF6B00',
              color: '#fff',
              boxShadow: gpsReady ? '0 4px 20px rgba(255,107,0,0.40)' : 'none',
              opacity: gpsReady ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              transition: 'transform 0.12s',
            }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
            onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            DÉMARRER
          </button>
          {!gpsReady && (
            <p style={{ fontSize: 11, color: labelColor, margin: 0 }}>En attente du GPS…</p>
          )}
        </div>
      )}

      {phase === 'running' && (
        <>
          <button
            onClick={onLap}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: lapBg, color: text, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
            }}
          >
            LAP
          </button>
          <button
            onClick={onPause}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: pauseBg, color: pauseText, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(0,0,0,0.20)',
              fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
            }}
          >
            PAUSE
          </button>
          <div style={{ width: 52 }} />
        </>
      )}

      {phase === 'paused' && (
        <>
          <button
            onClick={onFinish}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(239,68,68,0.85)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
            }}
          >
            STOP
          </button>
          <button
            onClick={onResume}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#FF6B00', color: '#fff',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255,107,0,0.40)',
              fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
            }}
          >
            REPRENDRE
          </button>
          <div style={{ width: 52 }} />
        </>
      )}
    </div>
  )
}
