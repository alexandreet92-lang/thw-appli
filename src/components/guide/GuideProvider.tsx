'use client'
// ══════════════════════════════════════════════════════════════════
// Moteur du GUIDE APPLI — spotlight + flèche animée + bulle « Clique ici »,
// contrôles Précédent / Passer / Suivant + progression. Navigue entre pages,
// attend que l'élément cible apparaisse, et avance au VRAI clic sur la cible.
// Cibles = éléments portant un attribut data-guide="…".
// ══════════════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { usePathname, useRouter } from 'next/navigation'
import type { GuideStep } from './guideRegistry'
import { EXPRESS_TOUR, FULL_TOUR } from './guideRegistry'
import { GuideSearch } from './GuideSearch'
import { setGuideDemoId } from './guideDemo'
import { useCoachAccess } from '@/hooks/useCoachAccess'
import { MobileSheet, SheetPill, useMobileSafe } from '@/components/ui/BottomSheet'

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

// Libellés de page (en-tête « Page X/N · <page> »). Repli si `step.page` absent.
const ROUTE_LABEL: Record<string, string> = {
  '/': 'Tableau de bord', '/planning': 'Planning', '/calendar': 'Calendrier', '/activities': 'Training',
  '/performance': 'Performance', '/nutrition': 'Nutrition', '/recovery': 'Récupération',
  '/community': 'Communauté', '/connections': 'Connexions', '/injuries': 'Blessures',
  '/feed': 'Fil', '/coach': 'Coach', '/coaches': 'Coachs', '/programmes': 'Programmes',
  '/messages': 'Messages', '/profile': 'Profil', '/progression': 'Progression', '/zones': 'Zones',
  '/session': 'Séance', '/record': 'Enregistrement',
}

interface PageInfo { label: string; pageNum: number; totalPages: number; posInPage: number; pageCount: number; nextLabel: string | null }

// Calcule, pour chaque étape, sa PAGE effective (page explicite → route → héritée),
// puis regroupe en « pages » consécutives pour la progression « Page X/N ».
function computePages(steps: GuideStep[]): PageInfo[] {
  const labels: string[] = []
  let last = ''
  for (const s of steps) {
    const l = s.page ?? (s.route ? ROUTE_LABEL[s.route] : undefined) ?? last ?? ''
    last = l
    labels.push(l)
  }
  // Bornes de groupes (une page = suite d'étapes de même libellé).
  const groupStart: number[] = []
  labels.forEach((l, i) => { if (i === 0 || l !== labels[i - 1]) groupStart.push(i) })
  const totalPages = groupStart.length
  return labels.map((label, i) => {
    const gi = groupStart.filter(s => s <= i).length - 1
    const start = groupStart[gi]
    const end = gi + 1 < groupStart.length ? groupStart[gi + 1] : steps.length
    const nextLabel = end < steps.length ? labels[end] : null
    return { label, pageNum: gi + 1, totalPages, posInPage: i - start + 1, pageCount: end - start, nextLabel }
  })
}

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
  const mobile = useMobileSafe()
  const router = useRouter()
  const pathname = usePathname()
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const forced = localStorage.getItem(GUIDE_FIRSTRUN_KEY) === 'pending'
      // La proposition de visite au 1er lancement a été DÉPLACÉE dans le
      // questionnaire d'onboarding (SetupScreen). On N'AFFICHE PLUS le pop-up
      // automatiquement à l'arrivée — uniquement si l'utilisateur relance la
      // visite via la loupe (forced).
      if (forced) setTimeout(() => setFirstRun(true), 900)
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
  // Le questionnaire d'onboarding (SetupScreen) émet ce choix de visite à la fin.
  // On lance alors la visite correspondante une fois l'utilisateur DANS l'app.
  useEffect(() => {
    const h = (e: Event) => {
      const kind = (e as CustomEvent).detail as string
      if (kind === 'express') startSteps(EXPRESS_TOUR)
      else if (kind === 'full') startSteps(FULL_TOUR)
    }
    window.addEventListener('thw:start-guide', h as EventListener)
    return () => window.removeEventListener('thw:start-guide', h as EventListener)
  }, [startSteps])

  // Persistance : « Passer » comme la fin de la visite marquent le guide comme vu
  // (on ne le re-propose plus automatiquement au lancement suivant).
  const persistSeen = useCallback(() => {
    try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); localStorage.removeItem(GUIDE_FIRSTRUN_KEY) } catch { /* ignore */ }
  }, [])
  const stop = useCallback(() => { persistSeen(); setSteps(null); setIdx(0); setRect(null) }, [persistSeen])
  const next = useCallback(() => { setIdx(i => { const s = steps; if (s && i + 1 >= s.length) { persistSeen(); setSteps(null); setRect(null); return 0 } return i + 1 }) }, [steps, persistSeen])
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  const step = steps ? steps[idx] : null
  const pages = useMemo(() => (steps ? computePages(steps) : []), [steps])
  const pageInfo = pages[idx] ?? null

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
        // Re-mesure à plusieurs instants : après le scroll fluide ET après un
        // éventuel reflow (panneau de démo qui s'ouvre, image qui charge) → le
        // halo reste calé sur la cible, jamais sur une zone qui a bougé.
        ;[260, 550, 900].forEach(d => window.setTimeout(() => { if (alive) { const e = findGuideEl(step.anchor!); if (e) measure(e) } }, d))
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
      {/* Mobile (≤ 767 px) : proposition de visite en feuille du bas. */}
      {mounted && mobile && (
        <MobileSheet open={firstRun} onClose={closeFirstRun} zIndex={99500} label={t('w3g.guide_welcome')}
          footer={<>
            <SheetPill onClick={() => { closeFirstRun(); startSteps(EXPRESS_TOUR) }}>{t('w3g.guide_express')}</SheetPill>
            <SheetPill variant="white" onClick={() => { closeFirstRun(); startSteps(FULL_TOUR) }}>{t('w3g.guide_full')}</SheetPill>
            <SheetPill variant="ghost" onClick={closeFirstRun}>{t('w3g.guide_later')}</SheetPill>
          </>}>
          <div style={{ textAlign: 'center', padding: '8px 8px 0', fontFamily: 'var(--font-body)' }}>
            <span aria-hidden style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px', background: 'var(--surface-card)', boxShadow: 'var(--shadow-capsule)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5z" /></svg>
            </span>
            <p style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)' }}>{t('w3g.guide_welcome')}</p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text-mid)' }}>{t('w3g.guide_welcome_msg')}</p>
          </div>
        </MobileSheet>
      )}
      {mounted && !mobile && firstRun && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99500, background: 'rgba(8,10,14,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', padding: 22, textAlign: 'center', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
            <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{t('w3g.guide_welcome')}</p>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-mid)' }}>{t('w3g.guide_welcome_msg')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { closeFirstRun(); startSteps(EXPRESS_TOUR) }} style={{ padding: '13px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary, #fff)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('w3g.guide_express')}</button>
              <button onClick={() => { closeFirstRun(); startSteps(FULL_TOUR) }} style={{ padding: '13px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('w3g.guide_full')}</button>
              <button onClick={closeFirstRun} style={{ padding: '10px', borderRadius: 'var(--r-md)', border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('w3g.guide_later')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {mounted && steps && step && createPortal(
        <GuideOverlay step={step} rect={rect} index={idx} total={steps.length} pageInfo={pageInfo} onNext={next} onPrev={prev} onSkip={stop} />,
        document.body,
      )}
    </Ctx.Provider>
  )
}

const PAD = 8
// Scrim du spotlight (voile sombre autour de la cible). Littéral toléré ici
// (fichier guide, hors périmètre enforced du check couleurs).
const SCRIM = 'rgba(8,10,14,0.58)' // design-allow-color
// Emoji d'en-tête par page — purement décoratif, interne au guide (aucune clé i18n).
const PAGE_EMOJI: Record<string, string> = {
  'Tableau de bord': '🏠', 'Planning': '🗓️', 'Calendrier': '📅', 'Training': '🏃',
  'Performance': '📈', 'Nutrition': '🥗', 'Récupération': '🌙', 'Communauté': '👥',
  'Connexions': '🔗', 'Blessures': '🩹', 'Fil': '📰', 'Coach': '🎯', 'Coachs': '🎯',
  'Programmes': '📚', 'Messages': '💬', 'Profil': '👤', 'Progression': '📊',
  'Zones': '🎚️', 'Séance': '🏋️', 'Enregistrement': '⏱️', 'Assistant IA': '✨',
  'Démarrer': '🚀', 'Espace coach': '🧑‍🏫', 'Studio': '🎬',
}

// Échappe le HTML puis rend **gras** → <strong> (contenu = nos chaînes statiques).
function mark(s: string): string {
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700">$1</strong>')
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const upd = () => setReduced(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])
  return reduced
}

function GuideOverlay({ step, rect, index, total, pageInfo, onNext, onPrev, onSkip }: {
  step: GuideStep; rect: Rect | null; index: number; total: number; pageInfo: PageInfo | null; onNext: () => void; onPrev: () => void; onSkip: () => void
}) {
  const { t } = useI18n()
  const reduced = usePrefersReducedMotion()
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardH, setCardH] = useState(0)
  const [vp, setVp] = useState(() => ({ w: typeof window !== 'undefined' ? window.innerWidth : 1200, h: typeof window !== 'undefined' ? window.innerHeight : 800 }))
  useEffect(() => {
    const onR = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR)
  }, [])
  const vw = vp.w, vh = vp.h
  const pad = step.pad ?? PAD

  // RÈGLE ANTI « PAGE COUPÉE » : le trou de spotlight est TOUJOURS borné à l'écran
  // visible. Si la cible dépasse, on rogne le halo aux bords du viewport.
  const hole = (() => {
    if (!rect) return null
    const top = clamp(rect.top - pad, 0, vh)
    const left = clamp(rect.left - pad, 0, vw)
    const bottom = clamp(rect.top + rect.height + pad, 0, vh)
    const right = clamp(rect.left + rect.width + pad, 0, vw)
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)
    if (width < 4 || height < 4) return null
    return { top, left, width, height }
  })()

  const BW = Math.min(360, vw - 24)
  const MAXH = vh - 24
  // Mesure la hauteur réelle de la carte (après rendu) → placement exact.
  useLayoutEffect(() => {
    const el = cardRef.current
    if (el) setCardH(Math.min(el.offsetHeight, MAXH))
  }, [step, rect, vw, vh, MAXH])
  const H = Math.min(cardH || (170 + (step.lines?.length ?? 0) * 30 + (step.title ? 28 : 0) + (step.message ? 40 : 0)), MAXH)
  const GAP = 16

  // Placement : sous la cible si elle est dans la moitié HAUTE de l'écran,
  // au-dessus si elle est dans la moitié BASSE. Repli latéral puis coin opposé.
  // La carte est toujours entièrement visible et ne recouvre jamais la cible.
  const pos = (() => {
    if (!hole) {
      return { left: Math.round((vw - BW) / 2), top: Math.round(clamp((vh - H) / 2, 12, vh - H - 12)), side: 'center' as const, beakX: 0 }
    }
    const cx = hole.left + hole.width / 2
    const cy = hole.top + hole.height / 2
    const leftFor = () => clamp(cx - BW / 2, 12, vw - BW - 12)
    const roomBelow = vh - (hole.top + hole.height) - GAP - 12
    const roomAbove = hole.top - GAP - 12
    const placeBelow = () => { const left = leftFor(); return { left, top: hole.top + hole.height + GAP, side: 'bottom' as const, beakX: clamp(cx - left, 22, BW - 22) } }
    const placeAbove = () => { const left = leftFor(); return { left, top: hole.top - H - GAP, side: 'top' as const, beakX: clamp(cx - left, 22, BW - 22) } }
    const preferBelow = cy < vh / 2
    if (preferBelow) {
      if (roomBelow >= H) return placeBelow()
      if (roomAbove >= H) return placeAbove()
    } else {
      if (roomAbove >= H) return placeAbove()
      if (roomBelow >= H) return placeBelow()
    }
    // Replis latéraux (cible occupant toute la hauteur).
    if (vw - (hole.left + hole.width) - GAP - 12 >= BW) return { left: hole.left + hole.width + GAP, top: clamp(cy - H / 2, 12, vh - H - 12), side: 'left' as const, beakX: 0 }
    if (hole.left - GAP - 12 >= BW) return { left: hole.left - BW - GAP, top: clamp(cy - H / 2, 12, vh - H - 12), side: 'right' as const, beakX: 0 }
    // Dernier recours : coin vertical opposé, sans recouvrir le centre de la cible.
    const top = cy > vh / 2 ? 12 : Math.max(12, vh - H - 12)
    return { left: leftFor(), top, side: 'none' as const, beakX: 0 }
  })()

  const lastOfPage = !!pageInfo && pageInfo.posInPage >= pageInfo.pageCount
  const isClick = !!rect && step.advanceOn === 'click'
  const label = pageInfo?.label || t('w3g.guide_tour')
  const emoji = PAGE_EMOJI[label] ?? '✨'
  // Progression « amicale » : on compte les PAGES (groupes de sens), pas les 113
  // sous-étapes brutes. Les points représentent les pages, le repère chiffré aussi.
  const dotCount = pageInfo?.totalPages ?? total
  const dotActive = (pageInfo?.pageNum ?? index + 1) - 1
  const stepLabel = `${pageInfo?.pageNum ?? index + 1} / ${dotCount}`
  const isLast = index + 1 >= total

  const cardTrans = reduced ? 'none' : 'left .5s cubic-bezier(0.22,1,0.36,1), top .5s cubic-bezier(0.22,1,0.36,1)'
  const geomTrans = reduced ? 'none' : 'top .5s cubic-bezier(0.22,1,0.36,1), left .5s cubic-bezier(0.22,1,0.36,1), width .5s cubic-bezier(0.22,1,0.36,1), height .5s cubic-bezier(0.22,1,0.36,1)'
  const blur = reduced ? 'blur(2px)' : 'blur(5px)'

  return (
    // Conteneur PASS-THROUGH : on peut cliquer/utiliser la page pendant le guide.
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'none' }}>
      <style>{`
        @keyframes gGlow{0%,100%{box-shadow:0 0 0 9999px ${SCRIM},0 0 0 2px var(--primary),0 0 0 6px var(--primary-dim),0 0 22px 2px var(--primary-dim)}50%{box-shadow:0 0 0 9999px ${SCRIM},0 0 0 2px var(--primary),0 0 0 11px transparent,0 0 30px 6px var(--primary-dim)}}
        @keyframes gLine{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes gCard{from{opacity:0;transform:translateY(8px) scale(.975)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media (prefers-reduced-motion: reduce){*[data-g-anim]{animation:none !important}}
      `}</style>

      {/* Voile simple quand aucune cible (étape d'explication centrée) */}
      {!hole && <div style={{ position: 'absolute', inset: 0, background: SCRIM, backdropFilter: blur, WebkitBackdropFilter: blur, pointerEvents: 'none' }} />}

      {/* SPOTLIGHT — 4 panneaux FLOUS autour de la cible (le flou seulement),
          + un anneau arrondi qui porte le voile sombre, le halo lumineux et la
          pulsation. Panneaux et anneau glissent vers la cible suivante. */}
      {hole && (
        <>
          <BlurPanel reduced={reduced} style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <BlurPanel reduced={reduced} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <BlurPanel reduced={reduced} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <BlurPanel reduced={reduced} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div data-g-anim style={{
            position: 'absolute', top: hole.top, left: hole.left, width: hole.width, height: hole.height,
            borderRadius: 'var(--r-md)', pointerEvents: 'none',
            boxShadow: reduced ? `0 0 0 9999px ${SCRIM},0 0 0 2px var(--primary),0 0 0 6px var(--primary-dim)` : undefined,
            animation: reduced ? undefined : 'gGlow 2s ease-in-out infinite',
            transition: geomTrans,
          }} />
        </>
      )}

      {/* COACH-MARK — carte propre qui glisse vers la cible, contenu en fondu */}
      <div ref={cardRef} style={{
        position: 'absolute', left: pos.left, top: pos.top, width: BW, maxHeight: MAXH,
        display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', color: 'var(--text)',
        borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-float)', pointerEvents: 'auto',
        fontFamily: 'var(--font-body)', boxSizing: 'border-box', overflow: 'visible', transition: cardTrans,
      }}>
        {/* Bec pointant la cible (uniquement quand la carte est dessus/dessous) */}
        {(pos.side === 'top' || pos.side === 'bottom') && (
          <div style={{
            position: 'absolute', left: pos.beakX - 7, width: 14, height: 14, background: 'var(--bg-card)',
            transform: 'rotate(45deg)', borderRadius: '3px',
            ...(pos.side === 'bottom' ? { top: -6 } : { bottom: -6 }),
          }} />
        )}
        <div key={index} data-g-anim style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', borderRadius: 'var(--r-lg)', animation: reduced ? undefined : 'gCard .36s cubic-bezier(0.22,1,0.36,1)' }}>
          {/* CORPS — défile si trop haut, sans pousser le pied hors écran */}
          <div style={{ padding: '18px 18px 10px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span aria-hidden style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1 }}>{emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: isClick ? 'var(--primary)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isClick ? t('w3g.guide_click_here') : label}
                </div>
                {/* Points de progression + repère chiffré amical (pages, pas sous-étapes) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                    {Array.from({ length: dotCount }).map((_, i) => (
                      <span key={i} style={{
                        width: i === dotActive ? 15 : 5, height: 5, borderRadius: 'var(--r-pill)',
                        background: i === dotActive ? 'var(--primary)' : i < dotActive ? 'var(--text-dim)' : 'var(--border-mid)',
                        transition: reduced ? 'none' : 'width .35s cubic-bezier(0.22,1,0.36,1), background .35s ease', flexShrink: 0,
                      }} />
                    ))}
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{stepLabel}</span>
                </div>
              </div>
            </div>
            {step.title && <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{step.title}</p>}
            {step.message && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-mid)' }}>{step.message}</p>}
            {step.lines && step.lines.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '2px 0 4px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {step.lines.map((ln, i) => (
                  <li key={i} data-g-anim style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.45, color: 'var(--text-mid)', opacity: reduced ? 1 : 0, animation: reduced ? undefined : 'gLine .34s ease-out forwards', animationDelay: reduced ? undefined : `${i * 90}ms` }}>
                    <span aria-hidden style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2, display: 'flex' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: mark(ln) }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* PIED FIXE — toujours visible : prochaine page + contrôles */}
          <div style={{ flexShrink: 0, padding: '8px 14px 14px' }}>
            {lastOfPage && pageInfo?.nextLabel && (
              <p style={{ margin: '0 4px 9px', fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden style={{ color: 'var(--primary)', fontWeight: 700 }}>→</span>{t('w3g.guide_next_page')} : <strong style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{pageInfo.nextLabel}</strong>
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={onSkip} style={btnSkip}>{t('w3g.guide_skip')}</button>
              <span style={{ flex: 1 }} />
              {index > 0 && <button type="button" onClick={onPrev} style={btnGhost}>{t('w3g.guide_prev')}</button>}
              <button type="button" onClick={onNext} style={btnNext}>
                {isLast ? t('w3g.guide_finish') : t('w3g.guide_next')}
                {!isLast && <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BlurPanel({ style, reduced }: { style: React.CSSProperties; reduced: boolean }) {
  const blur = reduced ? 'blur(2px)' : 'blur(5px)'
  return <div style={{ position: 'absolute', backdropFilter: blur, WebkitBackdropFilter: blur, pointerEvents: 'none', transition: reduced ? 'none' : 'top .5s cubic-bezier(0.22,1,0.36,1), left .5s cubic-bezier(0.22,1,0.36,1), width .5s cubic-bezier(0.22,1,0.36,1), height .5s cubic-bezier(0.22,1,0.36,1)', ...style }} />
}

const btnSkip: React.CSSProperties = { minHeight: 42, padding: '0 10px', border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }
const btnGhost: React.CSSProperties = { minHeight: 42, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }
const btnNext: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 42, padding: '0 18px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--text)', color: 'var(--bg-card)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Math.max(lo, hi) === lo ? lo : v)) }
