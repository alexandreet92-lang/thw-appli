'use client'
// Sous-onglets d'un onglet du bas (mobile) : ex. Plan → Planning · Planning Week · Objectifs.
// Pastilles défilables en haut de page ; la pastille active glisse (motion layoutId).
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
      style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', padding: '0 var(--space-4) var(--space-3)', scrollbarWidth: 'none' }}>
      {pages.map(p => {
        const on = p.href === pathname
        return (
          <button key={p.href} type="button" aria-current={on ? 'page' : undefined}
            onClick={() => { if (!on) { haptic('light'); router.push(p.href) } }}
            style={{ position: 'relative', flexShrink: 0, border: 'none', cursor: 'pointer', padding: '9px 16px', borderRadius: 'var(--r-pill)',
              background: 'var(--surface-neutral)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
              color: on ? 'var(--bg)' : 'var(--text-mid)', WebkitTapHighlightColor: 'transparent' }}>
            {on && (
              <motion.span layoutId="thw-section-pill" aria-hidden
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 'var(--r-pill)', background: 'var(--text)' }} />
            )}
            <span style={{ position: 'relative' }}>{t(p.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
