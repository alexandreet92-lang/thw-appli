'use client'
// ══════════════════════════════════════════════════════════════════
// Moteur du GUIDE APPLI — spotlight + flèche animée + bulle « Clique ici »,
// contrôles Précédent / Passer / Suivant + progression. Navigue entre pages,
// attend que l'élément cible apparaisse, et avance au VRAI clic sur la cible.
// Cibles = éléments portant un attribut data-guide="…".
// ══════════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import type { GuideStep } from './guideRegistry'
import { EXPRESS_TOUR, FULL_TOUR } from './guideRegistry'
import { GuideSearch } from './GuideSearch'

export const GUIDE_FIRSTRUN_KEY = 'thw:guide-firstrun'
export const GUIDE_SEEN_KEY = 'thw:guide-seen'

interface GuideCtx {
  startSteps: (steps: GuideStep[]) => void
  openSearch: () => void
  active: boolean
}
const Ctx = createContext<GuideCtx | null>(null)
export function useGuide() {
  const c = useContext(Ctx)
  if (!c) return { startSteps: () => {}, openSearch: () => {}, active: false }
  return c
}

interface Rect { top: number; left: number; width: number; height: number }

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [steps, setSteps] = useState<GuideStep[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [firstRun, setFirstRun] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const seen = localStorage.getItem(GUIDE_SEEN_KEY)
      const forced = localStorage.getItem(GUIDE_FIRSTRUN_KEY) === 'pending'
      if (forced || !seen) setTimeout(() => setFirstRun(true), 900)
    } catch { /* ignore */ }
  }, [])
  const closeFirstRun = useCallback(() => {
    setFirstRun(false)
    try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); localStorage.removeItem(GUIDE_FIRSTRUN_KEY) } catch { /* ignore */ }
  }, [])

  const startSteps = useCallback((s: GuideStep[]) => { if (s.length) { setSteps(s); setIdx(0) } }, [])
  const stop = useCallback(() => { setSteps(null); setIdx(0); setRect(null) }, [])
  const next = useCallback(() => { setIdx(i => { const s = steps; if (s && i + 1 >= s.length) { setSteps(null); setRect(null); return 0 } return i + 1 }) }, [steps])
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  const step = steps ? steps[idx] : null

  // Navigation + attente de l'élément cible.
  useEffect(() => {
    if (!step) return
    let alive = true
    if (step.route && pathname !== step.route) router.push(step.route)
    if (!step.anchor) { setRect(null); return }
    const clearPoll = () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null } }
    let tries = 0
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-guide="${step.anchor}"]`)
      if (el) {
        clearPoll()
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        window.setTimeout(() => { if (alive) measure(el) }, 260)
        // Avance au vrai clic sur la cible.
        if (step.advanceOn === 'click') {
          const onClick = () => { el.removeEventListener('click', onClick); window.setTimeout(next, 120) }
          el.addEventListener('click', onClick, { once: true })
        }
      } else if (++tries > 40) { clearPoll(); setRect(null) }   // ~5 s → message centré
    }
    find()
    pollRef.current = window.setInterval(find, 120)
    return () => { alive = false; clearPoll() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, steps])

  function measure(el: HTMLElement) {
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }
  // Suivi position (scroll/resize).
  useEffect(() => {
    if (!step?.anchor) return
    const upd = () => { const el = document.querySelector<HTMLElement>(`[data-guide="${step.anchor}"]`); if (el) measure(el) }
    window.addEventListener('scroll', upd, true); window.addEventListener('resize', upd)
    return () => { window.removeEventListener('scroll', upd, true); window.removeEventListener('resize', upd) }
  }, [step?.anchor, idx])

  const openSearch = useCallback(() => setSearchOpen(true), [])

  return (
    <Ctx.Provider value={{ startSteps, openSearch, active: !!steps }}>
      {children}
      <GuideSearch open={searchOpen} onClose={() => setSearchOpen(false)} onPick={(s) => { setSearchOpen(false); startSteps(s) }} />
      {mounted && firstRun && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99500, background: 'rgba(8,10,14,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', padding: 22, textAlign: 'center', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
            <p style={{ margin: '0 0 6px', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Bienvenue</p>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>Veux-tu une visite guidée de l'app ? Tu pourras la relancer à tout moment via la loupe.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { closeFirstRun(); startSteps(EXPRESS_TOUR) }} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Visite express (30 s)</button>
              <button onClick={() => { closeFirstRun(); startSteps(FULL_TOUR) }} style={{ padding: '13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Visite complète</button>
              <button onClick={closeFirstRun} style={{ padding: '10px', borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Plus tard</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {mounted && steps && step && createPortal(
        <GuideOverlay step={step} rect={rect} index={idx} total={steps.length} onNext={next} onPrev={prev} onSkip={stop} />,
        document.body,
      )}
    </Ctx.Provider>
  )
}

const PAD = 8
function GuideOverlay({ step, rect, index, total, onNext, onPrev, onSkip }: {
  step: GuideStep; rect: Rect | null; index: number; total: number; onNext: () => void; onPrev: () => void; onSkip: () => void
}) {
  const centered = !rect
  const clickThrough = step.advanceOn === 'click' && !!rect
  const pad = step.pad ?? PAD
  const hole = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null

  // Position de la bulle par rapport à la cible.
  const bubble = (() => {
    if (!hole) return { bottom: 'max(env(safe-area-inset-bottom), 24px)', left: '50%', transform: 'translateX(-50%)' as const }
    const vw = window.innerWidth, vh = window.innerHeight
    const place = step.placement ?? 'auto'
    const below = hole.top + hole.height + 14
    const above = hole.top - 14
    const preferBottom = place === 'bottom' || (place === 'auto' && hole.top < vh / 2)
    if (place === 'right' && hole.left + hole.width + 300 < vw) return { top: Math.max(12, hole.top), left: hole.left + hole.width + 14 }
    if (place === 'left' && hole.left - 300 > 0) return { top: Math.max(12, hole.top), left: Math.max(12, hole.left - 288) }
    if (preferBottom) return { top: below, left: clamp(hole.left, 12, vw - 300) }
    return { top: Math.max(12, above - 150), left: clamp(hole.left, 12, vw - 300) }
  })()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: clickThrough ? 'none' : 'auto' }}>
      <style>{`@keyframes gArrow{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}@keyframes gPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      {/* Étape d'explication (pas de cible) : voile LÉGER pour garder la page visible.
          Étape d'action (cible) : 4 pans assombris autour de l'élément. */}
      {!hole && <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,0.14)' }} />}
      {hole && (
        <>
          <Dim style={{ top: 0, left: 0, right: 0, height: hole.top }} pass={clickThrough} />
          <Dim style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} pass={clickThrough} />
          <Dim style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} pass={clickThrough} />
          <Dim style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} pass={clickThrough} />
          {/* halo de la cible */}
          <div style={{ position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height, borderRadius: 14, boxShadow: '0 0 0 3px var(--primary), 0 0 0 6px rgba(6,182,212,0.25)', animation: 'gPulse 1.6s ease-in-out infinite', pointerEvents: 'none' }} />
          {/* flèche animée pointant la cible */}
          <div style={{ position: 'absolute', top: hole.top + hole.height + 4, left: hole.left + hole.width / 2 - 12, animation: 'gArrow 1.1s ease-in-out infinite', pointerEvents: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 2v14M6 12l6 6 6-6" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </>
      )}

      {/* Bulle + contrôles */}
      <div style={{ position: 'absolute', ...bubble, width: 288, maxWidth: 'calc(100vw - 24px)', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.32)', padding: 16, pointerEvents: 'auto', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
        {step.title && <p style={{ margin: '0 0 6px', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>{step.title}</p>}
        {rect && <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--primary)' }}>Clique ici</p>}
        <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{step.message}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {Array.from({ length: total }, (_, i) => <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, background: i === index ? 'var(--primary)' : 'var(--border)', transition: 'width .2s' }} />)}
          </div>
          {index > 0 && <button onClick={onPrev} style={btnGhost}>Précédent</button>}
          <button onClick={onSkip} style={btnGhost}>Passer</button>
          <button onClick={onNext} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {index + 1 >= total ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}
function Dim({ style, pass }: { style: React.CSSProperties; pass: boolean }) {
  return <div style={{ position: 'absolute', background: 'rgba(8,10,14,0.62)', pointerEvents: pass ? 'auto' : 'none', ...style }} />
}
const btnGhost: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
