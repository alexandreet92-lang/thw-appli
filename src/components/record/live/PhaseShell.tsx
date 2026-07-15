'use client'
// Coquille commune des 3 phases colorées (prépa / effort / repos). Fond = token
// de phase, encre = token -ink. Barre de tours segmentée + pied (compteurs
// tours/exos autour de l'action centrale) + indicateur FC discret. Icônes Tabler.
import { IconPlayerPauseFilled, IconMenu2, IconHeartFilled } from '@tabler/icons-react'
import type { PhaseColor } from './types'
import type { HeartRateState } from '@/lib/record/useHeartRate'

interface Props {
  color: PhaseColor
  phaseName: string
  clock: string
  toursInBlock: number
  tourInBlock: number
  toursRemaining: number
  exosRemaining: number
  actionLabel: string
  onAction: () => void
  onPause: () => void
  onProgress: () => void
  hr: HeartRateState
  children: React.ReactNode
}

const round: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center',
  border: '2px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer', opacity: 0.85,
}

export default function PhaseShell(p: Props) {
  const bg = `var(--phase-${p.color})`
  const ink = `var(--phase-${p.color}-ink)`
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: bg, color: ink, transition: 'background 0.3s', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(env(safe-area-inset-top) + 12px) 20px 0', flexShrink: 0 }}>
        <button aria-label="Pause" onClick={p.onPause} style={round}><IconPlayerPauseFilled size={18} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, opacity: 0.8, margin: 0 }}>{p.phaseName}</p>
          <p style={{ fontSize: 13, fontWeight: 800, opacity: 0.6, margin: '1px 0 0', fontVariantNumeric: 'tabular-nums' }}>{p.clock}</p>
        </div>
        <button aria-label="Progression" onClick={p.onProgress} style={round}><IconMenu2 size={19} /></button>
      </div>

      {/* Barre de tours segmentée */}
      <div style={{ display: 'flex', gap: 4, padding: '14px 22px 0', flexShrink: 0 }}>
        {Array.from({ length: Math.max(1, p.toursInBlock) }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: 5, borderRadius: 4, background: 'currentColor', opacity: i < p.tourInBlock ? 1 : 0.25 }} />
        ))}
      </div>

      {/* Corps (spécifique à la phase) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 20px' }}>
        {p.children}
      </div>

      {/* Pied : compteurs + action centrale + FC */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 24px calc(env(safe-area-inset-bottom) + 28px)', flexShrink: 0 }}>
        <Counter n={p.toursRemaining} label="Tours" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button onClick={p.onAction} style={{ minWidth: 92, height: 92, borderRadius: '50%', border: '3px solid currentColor', background: 'rgba(0,0,0,0.10)', color: 'inherit', cursor: 'pointer', padding: '0 8px', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {p.actionLabel}
          </button>
          <HrMini hr={p.hr} />
        </div>
        <Counter n={p.exosRemaining} label="Exos" />
      </div>
    </div>
  )
}

function Counter({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 48, fontWeight: 800, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, n)}</p>
      <p style={{ fontSize: 11, letterSpacing: '0.07em', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}

function HrMini({ hr }: { hr: HeartRateState }) {
  const connected = hr.status === 'connected' && hr.bpm != null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, opacity: connected ? 0.85 : 0.5 }}>
      <IconHeartFilled size={13} />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{connected ? hr.bpm : '—'}</span>
    </div>
  )
}
