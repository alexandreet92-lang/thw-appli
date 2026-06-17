'use client'
// ──────────────────────────────────────────────────────────────────────────
// Animation « Enregistré » globale (pastille top-right + coche dessinée).
// Monté une seule fois dans ClientShell. Écoute le bus `thw:save`.
//
// Garde anti-bruit : n'affiche que les sauvegardes consécutives à une
// interaction utilisateur récente (clic / saisie / toucher) → les écritures
// d'arrière-plan au montage ne déclenchent pas l'animation.
// Plusieurs sauvegardes rapprochées sont fusionnées en une seule pastille.
// ──────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { SAVE_EVENT, type SaveEventDetail } from '@/lib/ui/saveToast'

const INTERACTION_WINDOW_MS = 8000

interface ToastState { status: 'saved' | 'error'; message: string; key: number }

export default function GlobalSaveToast() {
  const [state, setState] = useState<ToastState | null>(null)
  const [leaving, setLeaving] = useState(false)
  const lastInteraction = useRef(0)
  const hideT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const killT = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const touch = () => { lastInteraction.current = Date.now() }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'change']
    events.forEach(ev => window.addEventListener(ev, touch, { passive: true, capture: true }))

    function onSave(e: Event) {
      // Ignore les écritures non déclenchées par l'utilisateur (background/au montage).
      if (Date.now() - lastInteraction.current > INTERACTION_WINDOW_MS) return
      const d = (e as CustomEvent<SaveEventDetail>).detail
      const message = d.message ?? (d.status === 'error' ? 'Échec de l’enregistrement' : 'Enregistré')
      setLeaving(false)
      setState(s => ({ status: d.status, message, key: (s?.key ?? 0) + 1 }))
      clearTimeout(hideT.current); clearTimeout(killT.current)
      hideT.current = setTimeout(() => setLeaving(true), 1900)
      killT.current = setTimeout(() => { setState(null); setLeaving(false) }, 2200)
    }
    window.addEventListener(SAVE_EVENT, onSave as EventListener)
    return () => {
      events.forEach(ev => window.removeEventListener(ev, touch, { capture: true } as EventListenerOptions))
      window.removeEventListener(SAVE_EVENT, onSave as EventListener)
      clearTimeout(hideT.current); clearTimeout(killT.current)
    }
  }, [])

  if (!state) return null
  const err = state.status === 'error'
  const accent = err ? '#ef4444' : '#10B981'

  return (
    <>
      <style>{`
        @keyframes thwSaveIn { from { opacity:0; transform: translateY(-10px) scale(.92) } to { opacity:1; transform:none } }
        @keyframes thwSaveOut { from { opacity:1 } to { opacity:0; transform: translateY(-6px) scale(.97) } }
        @keyframes thwCheckDraw { from { stroke-dashoffset:18 } to { stroke-dashoffset:0 } }
        @keyframes thwBadgePop { 0%{transform:scale(.4)} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
        @keyframes thwBadgePulse { 0%{box-shadow:0 0 0 0 ${accent}55} 70%{box-shadow:0 0 0 8px ${accent}00} 100%{box-shadow:0 0 0 0 ${accent}00} }
      `}</style>
      <div
        key={state.key}
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', top: 'calc(16px + env(safe-area-inset-top))', right: 16, zIndex: 10060,
          display: 'flex', alignItems: 'center', gap: 9,
          background: err ? 'rgba(239,68,68,0.16)' : 'rgba(16,185,129,0.16)',
          border: `1px solid ${accent}66`,
          color: 'var(--text)', borderRadius: 999, padding: '8px 15px 8px 9px',
          fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
          fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
          animation: leaving ? 'thwSaveOut .3s ease forwards' : 'thwSaveIn .34s cubic-bezier(.2,.9,.3,1.25)',
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: '50%', background: accent, flexShrink: 0,
          animation: 'thwBadgePop .42s cubic-bezier(.2,.9,.3,1.4), thwBadgePulse 1.1s ease 1',
        }}>
          {err ? (
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2.5 7.4l3 3 6-6.6" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 18, animation: 'thwCheckDraw .42s ease .1s both' }} />
            </svg>
          )}
        </span>
        {state.message}
      </div>
    </>
  )
}
