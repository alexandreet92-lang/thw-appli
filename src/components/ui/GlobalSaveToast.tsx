'use client'
// ──────────────────────────────────────────────────────────────────────────
// Pastille « Enregistré » globale — façon iOS : une capsule compacte qui
// TOMBE de la zone Dynamic Island (ressort : scale .9→1 + translateY), une
// coche qui se dessine (stroke-dashoffset), vibration « succès », puis
// disparition en fondu vers le haut après 1,6 s. Variante erreur : rouge,
// croix dessinée + secousse. prefers-reduced-motion : fondu simple.
//
// Monté une seule fois dans ClientShell. Écoute le bus `thw:save`.
// Elle ne sert QU'AUX sauvegardes d'arrière-plan (auto-save, bascules…) :
//  • ignore les événements `claimed` (un <SaveButton/> confirme déjà sur place) ;
//  • ignore les interactions dans un conteneur `data-save-feedback="local"` ;
//  • ignore les écritures sans interaction utilisateur récente (montage, sync).
// Plusieurs sauvegardes rapprochées = UNE pastille (pas de ré-animation).
// ──────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SAVE_EVENT, LOCAL_FEEDBACK_ATTR, type SaveEventDetail } from '@/lib/ui/saveToast'
import { haptic } from '@/lib/haptics'
import { useI18n } from '@/lib/i18n'

const INTERACTION_WINDOW_MS = 8000
const VISIBLE_MS = 1600
const LEAVE_MS = 280

interface ToastState { status: 'saved' | 'error'; message: string; key: number }

const CSS = `
.gst-wrap { position: fixed; left: 0; right: 0; top: 0; z-index: 10060; display: flex; justify-content: center;
  padding-top: calc(env(safe-area-inset-top, 0px) + 8px); pointer-events: none; }
.gst-pill { pointer-events: auto; display: inline-flex; align-items: center; gap: 8px; min-height: 36px; box-sizing: border-box;
  padding: 6px 15px 6px 7px; border-radius: var(--r-pill); border: none; cursor: pointer;
  background: var(--text); color: var(--bg); box-shadow: var(--shadow-float);
  font-family: var(--font-body); font-size: 13px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap;
  transform-origin: 50% 0%; will-change: transform, opacity;
  animation: gstDrop 560ms cubic-bezier(.2,.9,.25,1) both; }
.gst-pill.gst-err { animation: gstDrop 560ms cubic-bezier(.2,.9,.25,1) both, gstShake 420ms cubic-bezier(.36,.07,.19,.97) 420ms both; }
.gst-pill.gst-leave { animation: gstLeave ${LEAVE_MS}ms cubic-bezier(.4,0,1,1) both; }
.gst-badge { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: var(--success); color: var(--on-primary); animation: gstPop 420ms cubic-bezier(.34,1.56,.64,1) 90ms both; }
.gst-err .gst-badge { background: var(--danger); }
.gst-mark { stroke-dasharray: 20; stroke-dashoffset: 20; animation: gstDraw 340ms cubic-bezier(.65,0,.35,1) 260ms forwards; }
.gst-msg { animation: gstFade 260ms ease 140ms both; }
@keyframes gstDrop {
  0%   { opacity: 0; transform: translateY(-34px) scale(.9); }
  55%  { opacity: 1; transform: translateY(3px) scale(1.015); }
  78%  { transform: translateY(-1px) scale(.998); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes gstLeave { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-14px) scale(.96); } }
@keyframes gstPop { from { transform: scale(.4); } to { transform: scale(1); } }
@keyframes gstDraw { to { stroke-dashoffset: 0; } }
@keyframes gstFade { from { opacity: 0; transform: translateX(-3px); } to { opacity: 1; transform: none; } }
@keyframes gstShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
@media (prefers-reduced-motion: reduce) {
  .gst-pill, .gst-pill.gst-err { animation: gstFadeOnly 160ms linear both; }
  .gst-pill.gst-leave { animation: gstFadeOut 160ms linear both; }
  .gst-badge, .gst-msg { animation: none; }
  .gst-mark { animation: none; stroke-dashoffset: 0; }
}
@keyframes gstFadeOnly { from { opacity: 0; } to { opacity: 1; } }
@keyframes gstFadeOut { from { opacity: 1; } to { opacity: 0; } }
`

export default function GlobalSaveToast() {
  const { t } = useI18n()
  const [state, setState] = useState<ToastState | null>(null)
  const [leaving, setLeaving] = useState(false)
  const lastInteraction = useRef(0)
  const lastTarget = useRef<Element | null>(null)
  const current = useRef<ToastState | null>(null)
  const hideT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const killT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tRef = useRef(t)
  tRef.current = t
  const leavingRef = useRef(false)
  leavingRef.current = leaving

  useEffect(() => {
    const touch = (e: Event) => {
      lastInteraction.current = Date.now()
      if (e.type !== 'change') lastTarget.current = e.target instanceof Element ? e.target : null
    }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'change']
    events.forEach(ev => window.addEventListener(ev, touch, { passive: true, capture: true }))

    const schedule = () => {
      clearTimeout(hideT.current); clearTimeout(killT.current)
      hideT.current = setTimeout(() => setLeaving(true), VISIBLE_MS)
      killT.current = setTimeout(() => { current.current = null; setState(null); setLeaving(false) }, VISIBLE_MS + LEAVE_MS)
    }

    function onSave(e: Event) {
      const d = (e as CustomEvent<SaveEventDetail>).detail
      if (!d || d.claimed) return                                   // un bouton confirme sur place
      if (Date.now() - lastInteraction.current > INTERACTION_WINDOW_MS) return   // écriture d'arrière-plan sans geste
      if (lastTarget.current?.closest?.(`[${LOCAL_FEEDBACK_ATTR}="local"]`)) return  // conteneur à retour local
      const message = d.message ?? (d.status === 'error' ? tRef.current('ui.saveError') : tRef.current('ui.saved'))
      const prev = current.current
      // Même statut déjà affiché → on prolonge simplement (aucune ré-animation).
      if (prev && prev.status === d.status && !leavingRef.current) {
        if (prev.message !== message) { const next = { ...prev, message }; current.current = next; setState(next) }
        schedule()
        return
      }
      const next: ToastState = { status: d.status, message, key: (prev?.key ?? 0) + 1 }
      current.current = next
      setLeaving(false)
      setState(next)
      haptic(d.status === 'error' ? 'heavy' : 'success')
      schedule()
    }
    window.addEventListener(SAVE_EVENT, onSave as EventListener)
    return () => {
      events.forEach(ev => window.removeEventListener(ev, touch, { capture: true } as EventListenerOptions))
      window.removeEventListener(SAVE_EVENT, onSave as EventListener)
      clearTimeout(hideT.current); clearTimeout(killT.current)
    }
  }, [])

  if (!state || typeof document === 'undefined') return null
  const err = state.status === 'error'

  const dismiss = () => {
    clearTimeout(hideT.current); clearTimeout(killT.current)
    setLeaving(true)
    killT.current = setTimeout(() => { current.current = null; setState(null); setLeaving(false) }, LEAVE_MS)
  }

  return createPortal(
    <div className="gst-wrap">
      <style>{CSS}</style>
      <button
        key={state.key}
        type="button"
        data-no-fx
        onClick={dismiss}
        role={err ? 'alert' : 'status'}
        aria-live={err ? 'assertive' : 'polite'}
        className={`gst-pill${err ? ' gst-err' : ''}${leaving ? ' gst-leave' : ''}`}
      >
        <span className="gst-badge" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {err
              ? <path className="gst-mark" d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              : <path className="gst-mark" d="M2.8 7.3l2.9 2.9 5.5-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </span>
        <span className="gst-msg">{state.message}</span>
      </button>
    </div>,
    document.body,
  )
}
