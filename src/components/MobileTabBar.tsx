'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'
import { useI18n } from '@/lib/i18n'
import type { LucideIcon } from 'lucide-react'
import { Home, CalendarDays, HeartPulse, Activity, Grid3x3, ClipboardList, MessageCircle, Users } from 'lucide-react'
import { mobileTabFor, MOBILE_PREFETCH, type MobileTabKey } from '@/lib/nav/mobileSections'

import { TabCapsule, type CapsuleItem } from '@/components/nav/TabCapsule'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })

// ── Types & constants ──────────────────────────────────────────

const ACCENT = '#06B6D4'
// Onglets inactifs à plein contraste (comme Strava), plus gris clair.
const DIM    = 'var(--text)'

// Une sur-page BLOQUANTE est-elle ouverte ? Toutes les sur-pages (BottomSheet,
// SlideSheet, feuilles bespoke calendar/performance/blessure/communauté,
// AIPanel…) montent via createPortal sur <body> un VOILE plein écran, fixe,
// interactif (il capte les clics), z-index élevé. On détecte ce voile → on
// masque alors la barre à bulles (elle transparaissait dessous). Un seul point
// de contrôle, sans retoucher chaque feuille.
//
// IMPORTANT — on EXCLUT les couches « pass-through » (pointer-events:none) :
// coach-marks du guide (z-index 100000, plein écran mais non bloquant), masques
// en dégradé, etc. Sans ça, la barre disparaîtrait sur une page NORMALE (bug
// constaté sur un compte neuf où le guide est actif).
function anyOverpageOpen(): boolean {
  if (typeof document === 'undefined') return false
  const vw = window.innerWidth, vh = window.innerHeight
  if (vw === 0 || vh === 0) return false
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement)) continue
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed') continue
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    if (cs.pointerEvents === 'none') continue                 // couche non bloquante → pas une sur-page
    if (parseFloat(cs.opacity || '1') < 0.05) continue        // en train de disparaître / masqué
    const z = parseInt(cs.zIndex, 10)
    if (!(z > 100)) continue                                  // « auto » (NaN) et wrappers persistants exclus
    const r = el.getBoundingClientRect()
    // Doit VRAIMENT recouvrir l'écran, centré et à l'écran (pas décalé/animé hors champ).
    if (r.left <= vw * 0.1 && r.top <= vh * 0.15 && r.right >= vw * 0.9 && r.bottom >= vh * 0.85) return true
  }
  return false
}

// ── Onglets rapides côté COACH ─────────────────────────────────
const COACH_TABS: { href: string; labelKey: string; Icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/coach',          labelKey: 'nav.coachHome',     Icon: Grid3x3,       match: p => p === '/coach' },
  { href: '/coach/athletes', labelKey: 'nav.coachAthletes', Icon: Users,         match: p => p.startsWith('/coach/athlete') },
  { href: '/coach/programs', labelKey: 'nav.coachPrograms', Icon: ClipboardList, match: p => p.startsWith('/coach/programs') || p.startsWith('/coach/library') },
  { href: '/coach/messages', labelKey: 'nav.coachMessages', Icon: MessageCircle, match: p => p.startsWith('/coach/messages') },
]

// ── Main component ─────────────────────────────────────────────

export default function MobileTabBar() {
  const pathname              = usePathname()
  const router                = useRouter()
  const { t }                 = useI18n()
  const [aiOpen, setAiOpen]   = useState(false)
  const [hidden, setHidden]   = useState(false)
  const [overpage, setOverpage] = useState(false)
  // Salon textuel communauté ouvert (mobile) → barre masquée (vue immersive).
  const [immersive, setImmersive] = useState(false)
  useEffect(() => {
    const h = (e: Event) => setImmersive(!!(e as CustomEvent).detail)
    window.addEventListener('thw:immersive', h as EventListener)
    return () => window.removeEventListener('thw:immersive', h as EventListener)
  }, [])

  // Prefetch all main routes so navigation is instant
  useEffect(() => {
    MOBILE_PREFETCH.forEach(r => router.prefetch(r))
  }, [router])

  // Hide when software keyboard pushes viewport up
  useEffect(() => {
    const vv   = window.visualViewport
    const base = vv?.height ?? window.innerHeight
    const check = () => setHidden((vv?.height ?? window.innerHeight) < base * 0.8)
    vv?.addEventListener('resize', check)
    window.addEventListener('resize', check)
    return () => {
      vv?.removeEventListener('resize', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  // Masque la barre dès qu'une sur-page (feuille/modale plein écran) est ouverte.
  // On observe l'ajout/retrait d'enfants de <body> (là où les portails montent).
  // + FILET DE SÉCURITÉ : re-scan périodique et au relâcher du doigt → la barre
  //   REVIENT toujours quand la sur-page se ferme (fini « elle disparaît après
  //   l'IA »). setOverpage(même valeur) ne re-rend pas → aucun scintillement.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const scan = () => setOverpage(anyOverpageOpen())
    let raf = 0
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan) }
    schedule()
    const mo = new MutationObserver(schedule)
    mo.observe(document.body, { childList: true })
    const iv = window.setInterval(scan, 600)
    window.addEventListener('resize', schedule)
    window.addEventListener('pointerup', schedule, true)
    return () => {
      cancelAnimationFrame(raf); mo.disconnect(); window.clearInterval(iv)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pointerup', schedule, true)
    }
  }, [pathname])

  // NB : `hidden` (clavier logiciel) ne doit PAS court-circuiter le rendu ici,
  // sinon l'AIPanel (enfant) se démonte quand le clavier s'ouvre → il se referme,
  // le clavier disparaît, il se remonte/rouvre… boucle infinie. On masque
  // uniquement la barre <nav> plus bas, en gardant l'AIPanel monté.
  // Page /record : compteur immersif, on cache la navbar
  if (pathname === '/record') return null
  // Espace coach : barre de nav rapide dédiée (mêmes bulles que côté athlète).
  if (pathname?.startsWith('/coach')) {
    if (isFullscreenRoute(pathname)) return null
    const coachItems: CapsuleItem[] = [
      ...COACH_TABS.map(tab => ({
        key: tab.href, label: t(tab.labelKey), ariaLabel: t(tab.labelKey),
        icon: (c: string, on?: boolean) => <tab.Icon size={26} color={c} strokeWidth={on ? 2.4 : 2} />,
        onSelect: () => router.push(tab.href),
      })),
      // 5ᵉ onglet libellé comme les 4 autres → capsule identique à celle de l'athlète
      // (5 onglets icône 26 + libellé, même pilule glissante).
      { key: 'ai', label: t('nav.coachAI'), ariaLabel: t('nav.coachAI'), transient: true, onSelect: () => setAiOpen(o => !o),
        icon: () => (/* eslint-disable-next-line @next/next/no-img-element */ <img src="/logos/logo_4bras.png" alt="" width={26} height={26} style={{ objectFit: 'contain', display: 'block' }} />) },
    ]
    const coachActive = COACH_TABS.findIndex(tab => tab.match(pathname))
    return (
      <>
        {!hidden && !overpage && !immersive && (
          <TabCapsule className="mobile-tab-bar md:hidden" items={coachItems} activeIndex={coachActive >= 0 ? coachActive : null} motionKey="coach" accent={ACCENT} dim={DIM} />
        )}
        <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} initialAgent="coach" />
      </>
    )
  }
  // Page /competences : header + champ dédiés, on masque la tabbar
  if (pathname?.startsWith('/competences')) return null
  // Page /topup : standalone (lien email)
  if (pathname?.startsWith('/topup')) return null
  // Page /profile : réglages plein écran, on masque la barre d'onglets
  if (pathname === '/profile') return null
  // Pages d'entrée (connexion, onboarding…) : pas de barre d'onglets
  if (isFullscreenRoute(pathname)) return null

  // 5 onglets façon Strava. Le Coach IA reste dans le bouton en haut à droite (MobileShell).
  const go = (href: string) => () => { if (pathname !== href) router.push(href) }
  const tabs: { key: MobileTabKey; item: CapsuleItem }[] = [
    { key: 'home', item: { key: 'home', label: t('nav.tabHome'), ariaLabel: t('nav.tabHome'), onSelect: go('/'), icon: (c, on) => <Home size={26} color={c} strokeWidth={on ? 2.4 : 2} /> } },
    { key: 'plan', item: { key: 'plan', label: t('nav.tabPlan'), ariaLabel: t('nav.tabPlan'), onSelect: go('/planning'), icon: (c, on) => <CalendarDays size={26} color={c} strokeWidth={on ? 2.4 : 2} /> } },
    { key: 'launch', item: { key: 'launch', label: t('nav.tabLaunch'), ariaLabel: t('nav.startActivity'), onSelect: go('/record'),
      icon: (c, on) => (
        <svg width="27" height="27" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="10" stroke={c} strokeWidth={on ? 2.3 : 1.9} />
          <circle cx="13" cy="13" r="5" fill={c} />
        </svg>
      ) } },
    { key: 'forme', item: { key: 'forme', label: t('nav.tabForme'), ariaLabel: t('nav.tabForme'), onSelect: go('/recovery'), icon: (c, on) => <HeartPulse size={26} color={c} strokeWidth={on ? 2.4 : 2} /> } },
    { key: 'activities', item: { key: 'activities', label: t('nav.tabActivities'), ariaLabel: t('nav.tabActivities'), onSelect: go('/activities'), icon: (c, on) => <Activity size={26} color={c} strokeWidth={on ? 2.4 : 2} /> } },
  ]
  const items = tabs.map(x => x.item)
  const current = mobileTabFor(pathname)
  const i = current ? tabs.findIndex(x => x.key === current) : -1
  const activeIndex = i >= 0 ? i : null

  return (
    <>
      {!hidden && !overpage && !immersive && (
        <TabCapsule className="mobile-tab-bar md:hidden" items={items} activeIndex={activeIndex} motionKey="athlete" accent={ACCENT} dim={DIM} />
      )}
    </>
  )
}
