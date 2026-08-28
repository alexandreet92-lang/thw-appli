'use client'
// ══════════════════════════════════════════════════════════════════
// Moteur du GUIDE APPLI — spotlight + flèche animée + bulle « Clique ici »,
// contrôles Précédent / Passer / Suivant + progression. Navigue entre pages,
// attend que l'élément cible apparaisse, et avance au VRAI clic sur la cible.
// Cibles = éléments portant un attribut data-guide="…".
// ══════════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { usePathname, useRouter } from 'next/navigation'
import type { GuideStep } from './guideRegistry'
import { EXPRESS_TOUR, FULL_TOUR } from './guideRegistry'
import { GuideSearch } from './GuideSearch'
import { setGuideDemoId } from './guideDemo'
import { useCoachAccess } from '@/hooks/useCoachAccess'

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
  const { t } = useI18n()
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

  const coachAccess = useCoachAccess()
  const coachRef = useRef(false)
  coachRef.current = !!coachAccess.access
  const startSteps = useCallback((s: GuideStep[]) => {
    if (!s.length) return
    // Étapes coach : réservées aux comptes coach (abonnement).
    let f = coachRef.current ? s : s.filter(st => !st.coachOnly)
    if (!f.length) f = [{ title: t('w3g.guide_coach_title'), message: t('w3g.guide_coach_msg') }]
    setSteps(f); setIdx(0)
  }, [t])
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

  // Panneaux de DÉMO : on signale à la page l'UI à ouvrir (non enregistrée).
  // id=null quand le guide s'arrête ou que l'étape n'a pas de démo → la page referme.
  useEffect(() => {
    if (typeof window === 'undefined') return
    setGuideDemoId(steps ? (step?.demo ?? null) : null)
    return () => { setGuideDemoId(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.demo, steps])

  const openSearch = useCallback(() => setSearchOpen(true), [])

  return (
    <Ctx.Provider value={{ startSteps, openSearch, active: !!steps }}>
      {children}
      <GuideSearch open={searchOpen} onClose={() => setSearchOpen(false)} onPick={(s) => { setSearchOpen(false); startSteps(s) }} />
      {mounted && firstRun && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99500, background: 'rgba(8,10,14,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', padding: 22, textAlign: 'center', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
            <p style={{ margin: '0 0 6px', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('w3g.guide_welcome')}</p>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{t('w3g.guide_welcome_msg')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { closeFirstRun(); startSteps(EXPRESS_TOUR) }} style={{ padding: '13px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('w3g.guide_express')}</button>
              <button onClick={() => { closeFirstRun(); startSteps(FULL_TOUR) }} style={{ padding: '13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('w3g.guide_full')}</button>
              <button onClick={closeFirstRun} style={{ padding: '10px', borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('w3g.guide_later')}</button>
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
// Échappe le HTML puis rend **gras** → <strong> (contenu = nos chaînes statiques).
function mark(s: string): string {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700">$1</strong>')
}
function GuideOverlay({ step, rect, index, total, onNext, onPrev, onSkip }: {
  step: GuideStep; rect: Rect | null; index: number; total: number; onNext: () => void; onPrev: () => void; onSkip: () => void
}) {
  const { t } = useI18n()
  const pad = step.pad ?? PAD
  const hole = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const BW = Math.min(340, vw - 24)
  // Hauteur estimée pour placer la bulle sans déborder — dépend du contenu (puces).
  const lineCount = step.lines?.length ?? 0
  const estH = 138 + (step.title ? 28 : 0) + (step.message ? 38 : 0) + lineCount * 32
  const BH = Math.min(estH, vh - 40)

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
      <style>{`@keyframes gArrow{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}@keyframes gArrowUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes gPulse{0%{box-shadow:0 0 0 3px var(--primary),0 0 0 5px rgba(6,182,212,0.35)}50%{box-shadow:0 0 0 3px var(--primary),0 0 0 12px rgba(6,182,212,0.10)}100%{box-shadow:0 0 0 3px var(--primary),0 0 0 5px rgba(6,182,212,0.35)}}@keyframes gLine{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes gPop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>

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
      <div key={index} style={{ position: 'absolute', left: pos.left, top: pos.top, width: BW, maxHeight: vh - 32, overflowY: 'auto', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: '0 18px 50px rgba(0,0,0,0.38)', pointerEvents: 'auto', fontFamily: 'var(--font-body, DM Sans, sans-serif)', boxSizing: 'border-box', overflow: 'hidden', animation: 'gPop .3s cubic-bezier(0.34,1.3,0.6,1)' }}>
        {/* Liseré dégradé */}
        <div style={{ height: 4, background: GRAD }} />
        <div style={{ padding: '14px 16px 15px' }}>
          {/* En-tête : badge + label + barre de progression */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
            <span aria-hidden style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(6,182,212,0.40)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5z" /></svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {rect && step.advanceOn === 'click'
                ? <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-dim, rgba(6,182,212,0.12))', padding: '2px 8px', borderRadius: 999 }}>{t('w3g.guide_click_here')}</span>
                : <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{t('w3g.guide_tour')} · {index + 1}/{total}</span>}
              <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((index + 1) / total) * 100}%`, background: GRAD, borderRadius: 999, transition: 'width .35s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>
          </div>
          {step.title && <p style={{ margin: '0 0 8px', fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, lineHeight: 1.15 }}>{step.title}</p>}
          {step.message && <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{step.message}</p>}
          {step.lines && step.lines.length > 0 && (
            <ul key={index} style={{ listStyle: 'none', margin: '0 0 14px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {step.lines.map((ln, i) => (
                <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.45, color: 'var(--text-mid)', opacity: 0, animation: `gLine .34s ease-out forwards`, animationDelay: `${i * 100}ms` }}>
                  <span aria-hidden style={{ flexShrink: 0, width: 14, height: 14, marginTop: 1, display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: mark(ln) }} />
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <button onClick={onSkip} style={btnGhost}>{t('w3g.guide_skip')}</button>
            <span style={{ flex: 1 }} />
            {index > 0 && <button onClick={onPrev} style={btnGhost}>{t('w3g.guide_prev')}</button>}
            <button onClick={onNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(6,182,212,0.40)' }}>
              {index + 1 >= total ? t('w3g.guide_finish') : t('w3g.guide_next')}
              {index + 1 < total && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
const GRAD = 'linear-gradient(135deg,#06B6D4,#3B82F6)'
function Dim({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: 'absolute', background: 'rgba(8,10,14,0.5)', pointerEvents: 'none', ...style }} />
}
const btnGhost: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Math.max(lo, hi) === lo ? lo : v)) }
