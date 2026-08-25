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

// Desktop et mobile rendent des éléments DUPLIQUÉS (même data-guide, l'un masqué
// en CSS). On cible TOUJOURS l'instance réellement visible à l'écran.
function findGuideEl(anchor: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${anchor}"]`))
  return els.find(el => el.getClientRects().length > 0) ?? els[0] ?? null
}

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
      const el = findGuideEl(step.anchor!)
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
    const upd = () => { const el = findGuideEl(step.anchor!); if (el) measure(el) }
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
  const pad = step.pad ?? PAD
  const hole = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const BW = Math.min(320, vw - 24), BH = 210

  // Position de la bulle — TOUJOURS entièrement dans l'écran.
  const pos = (() => {
    if (!hole) return { left: (vw - BW) / 2, top: vh - BH - 20, arrow: null as null | { x: number; y: number; dir: 'up' | 'down' } }
    const cx = hole.left + hole.width / 2
    const spaceBelow = vh - (hole.top + hole.height)
    const below = spaceBelow > BH + 24 || spaceBelow > hole.top
    const left = clamp(cx - BW / 2, 12, vw - BW - 12)
    const top = below ? clamp(hole.top + hole.height + 24, 12, vh - BH - 12) : clamp(hole.top - BH - 24, 12, vh - BH - 12)
    return { left, top, arrow: { x: clamp(cx, hole.left, hole.left + hole.width), y: below ? hole.top + hole.height + 6 : hole.top - 6, dir: below ? 'down' as const : 'up' as const } }
  })()

  return (
    // Conteneur PASS-THROUGH : on peut cliquer/utiliser la page pendant le guide.
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'none' }}>
      <style>{`@keyframes gArrow{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}@keyframes gArrowUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes gPulse{0%{box-shadow:0 0 0 3px var(--primary),0 0 0 5px rgba(6,182,212,0.35)}50%{box-shadow:0 0 0 3px var(--primary),0 0 0 12px rgba(6,182,212,0.10)}100%{box-shadow:0 0 0 3px var(--primary),0 0 0 5px rgba(6,182,212,0.35)}}`}</style>

      {/* Voile — visuel seulement (pass-through). Léger si explication, un peu plus marqué autour d'une cible. */}
      {!hole && <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,0.12)', pointerEvents: 'none' }} />}
      {hole && (
        <>
          <Dim style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <Dim style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <Dim style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <Dim style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div style={{ position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height, borderRadius: 14, animation: 'gPulse 1.5s ease-in-out infinite', pointerEvents: 'none' }} />
        </>
      )}

      {/* Flèche animée pointant la cible */}
      {pos.arrow && (
        <div style={{ position: 'absolute', left: pos.arrow.x - 15, top: pos.arrow.dir === 'down' ? pos.arrow.y : pos.arrow.y - 30, animation: `${pos.arrow.dir === 'down' ? 'gArrow' : 'gArrowUp'} 0.9s ease-in-out infinite`, pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: pos.arrow.dir === 'up' ? 'rotate(180deg)' : 'none' }}>
            <path d="M12 4v15M5 12l7 7 7-7" />
          </svg>
        </div>
      )}

      {/* Bulle + contrôles — pointer-events AUTO (seul élément cliquable de l'overlay) */}
      <div style={{ position: 'absolute', left: pos.left, top: pos.top, width: BW, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.32)', padding: 16, pointerEvents: 'auto', fontFamily: 'var(--font-body, DM Sans, sans-serif)', boxSizing: 'border-box' }}>
        {rect && <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--primary)' }}>Clique ici</p>}
        {step.title && <p style={{ margin: '0 0 6px', fontFamily: 'Syne, sans-serif', fontSize: 15.5, fontWeight: 700 }}>{step.title}</p>}
        <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{step.message}</p>
        <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
          {Array.from({ length: total }, (_, i) => <span key={i} style={{ flex: i === index ? '0 0 16px' : '0 0 6px', height: 5, borderRadius: 3, background: i === index ? 'var(--primary)' : 'var(--border)', transition: 'flex-basis .2s' }} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>{index + 1}/{total}</span>
          <button onClick={onSkip} style={btnGhost}>Passer</button>
          {index > 0 && <button onClick={onPrev} style={btnGhost}>Précédent</button>}
          <button onClick={onNext} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {index + 1 >= total ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}
function Dim({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: 'absolute', background: 'rgba(8,10,14,0.5)', pointerEvents: 'none', ...style }} />
}
const btnGhost: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Math.max(lo, hi) === lo ? lo : v)) }
