// ══════════════════════════════════════════════════════════════════
// Navigation MOBILE (athlète) — 5 onglets en bas, façon Strava.
// Chaque onglet regroupe des pages ; dans un onglet, on passe d'une page
// à l'autre par les sous-onglets en haut de page (MobileSectionTabs).
// Le desktop garde sa sidebar (non concerné).
// ══════════════════════════════════════════════════════════════════
export type MobileTabKey = 'home' | 'plan' | 'launch' | 'forme' | 'activities'

export interface MobileSubPage { href: string; labelKey: string }

export const MOBILE_SECTIONS: Record<Exclude<MobileTabKey, 'launch'>, MobileSubPage[]> = {
  home:       [ { href: '/', labelKey: 'nav.dashboard' }, { href: '/connections', labelKey: 'nav.connections' } ],
  plan:       [ { href: '/planning', labelKey: 'nav.planning' }, { href: '/planning-week', labelKey: 'nav.planningWeek' }, { href: '/calendar', labelKey: 'nav.calendar' } ],
  forme:      [ { href: '/recovery', labelKey: 'nav.recovery' }, { href: '/nutrition', labelKey: 'nav.nutrition' } ],
  activities: [ { href: '/activities', labelKey: 'nav.training' }, { href: '/performance', labelKey: 'nav.performance' }, { href: '/injuries', labelKey: 'nav.injuries' }, { href: '/session', labelKey: 'nav.session' } ],
}

/** Onglet du bas auquel appartient une route (null = hors des 5 onglets). */
export function mobileTabFor(pathname: string | null): MobileTabKey | null {
  if (!pathname) return null
  if (pathname === '/record') return 'launch'
  for (const [tab, pages] of Object.entries(MOBILE_SECTIONS) as [Exclude<MobileTabKey, 'launch'>, MobileSubPage[]][]) {
    if (pages.some(p => p.href === pathname)) return tab
  }
  return null
}

/** Sous-pages de l'onglet courant (vide si une seule page ou hors onglets). */
export function mobileSubPages(pathname: string | null): MobileSubPage[] {
  const tab = mobileTabFor(pathname)
  if (!tab || tab === 'launch') return []
  return MOBILE_SECTIONS[tab]
}

/** Toutes les routes à précharger pour une navigation instantanée. */
export const MOBILE_PREFETCH = ['/record', ...Object.values(MOBILE_SECTIONS).flat().map(p => p.href)]
