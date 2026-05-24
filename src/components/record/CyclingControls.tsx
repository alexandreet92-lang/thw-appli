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
}

export default function CyclingControls({
  phase, gpsReady, onStart, onPause, onResume, onLap, onFinish,
}: Props) {
  return (
    <div className="h-[100px] flex-shrink-0 bg-black/50 backdrop-blur-sm
                    flex items-center justify-center gap-6 px-4
                    pb-[env(safe-area-inset-bottom)]">
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onStart}
            disabled={!gpsReady}
            className={`w-[72px] h-[72px] rounded-full
                        flex items-center justify-center
                        text-[13px] font-bold tracking-wide text-white
                        bg-gradient-to-br from-cyan-500 to-blue-600
                        transition-all duration-150
                        ${gpsReady
                          ? 'shadow-[0_4px_24px_rgba(6,182,212,0.45)] active:scale-95'
                          : 'opacity-50 cursor-not-allowed'}`}
          >
            DÉMARRER
          </button>
          {!gpsReady && (
            <p className="text-[11px] text-white/60">En attente du GPS…</p>
          )}
        </div>
      )}

      {phase === 'running' && (
        <>
          <button
            onClick={onLap}
            className="w-[52px] h-[52px] rounded-full bg-white/10 text-white
                       text-[11px] font-bold flex items-center justify-center
                       active:scale-95 transition-transform"
          >
            LAP
          </button>
          <button
            onClick={onPause}
            className="w-[72px] h-[72px] rounded-full bg-white text-black
                       text-[13px] font-bold flex items-center justify-center
                       shadow-[0_4px_18px_rgba(255,255,255,0.30)]
                       active:scale-95 transition-transform"
          >
            PAUSE
          </button>
          <div className="w-[52px]" />
        </>
      )}

      {phase === 'paused' && (
        <>
          <button
            onClick={onFinish}
            className="w-[52px] h-[52px] rounded-full bg-red-500/80 text-white
                       text-[10px] font-bold flex items-center justify-center
                       active:scale-95 transition-transform"
          >
            TERMINER
          </button>
          <button
            onClick={onResume}
            className="w-[72px] h-[72px] rounded-full text-white
                       text-[11px] font-bold flex items-center justify-center
                       bg-gradient-to-br from-cyan-500 to-blue-600
                       shadow-[0_4px_24px_rgba(6,182,212,0.45)]
                       active:scale-95 transition-all"
          >
            REPRENDRE
          </button>
          <div className="w-[52px]" />
        </>
      )}
    </div>
  )
}
