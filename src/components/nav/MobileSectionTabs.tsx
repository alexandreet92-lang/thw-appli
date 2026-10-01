'use client'
// Sous-onglets d'un onglet du bas (mobile), façon Strava « Progrès · Activités · Galerie » :
// rangée pleine largeur collée sous les boutons du haut, icône au-dessus du libellé,
// onglet actif en texte plein + soulignement qui glisse (motion layoutId).
import { usePathname, useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { mobileSubPages } from '@/lib/nav/mobileSections'

export function MobileSectionTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const pages = mobileSubPages(pathname)
  if (pages.length < 2) return null

  return (
    <nav aria-label={t('shared.menu')} className="thw-section-tabs"
      style={{ position: 'sticky', top: 0, zIndex: 3, height: 'var(--section-tabs-h)', boxSizing: 'border-box', display: 'flex', background: 'var(--bg)',
        boxShadow: '0 -16px 0 var(--bg), inset 0 -1px 0 color-mix(in srgb, var(--text) 10%, transparent)' }}>
      {pages.map(p => {
        const on = p.href === pathname
        const col = on ? 'var(--text)' : 'var(--text-dim)'
        return (
          <button key={p.href} type="button" aria-current={on ? 'page' : undefined}
            onClick={() => { if (!on) { haptic('light'); router.push(p.href) } }}
            style={{ position: 'relative', flex: 1, minWidth: 0, border: 'none', background: 'none', cursor: 'pointer',
              padding: '8px 2px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              WebkitTapHighlightColor: 'transparent' }}>
            <p.Icon size={24} color={col} strokeWidth={on ? 2.2 : 1.8} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: pages.length > 3 ? 12 : 13, letterSpacing: pages.length > 3 ? '-0.01em' : undefined, fontWeight: on ? 700 : 600, color: col,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{t(p.labelKey)}</span>
            {on && (
              <motion.span layoutId="thw-section-underline" aria-hidden
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
                style={{ position: 'absolute', left: '12%', right: '12%', bottom: 0, height: 3, borderRadius: 'var(--r-pill)', background: 'var(--primary)' }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
