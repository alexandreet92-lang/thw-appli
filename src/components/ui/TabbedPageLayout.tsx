'use client'
// Sous-navigation réutilisable pour toute page à onglets (DESIGN_SYSTEM.md).
// Desktop : sidebar verticale à gauche (~200px) séparée par un filet. Mobile :
// onglets horizontaux en haut (soulignement de l'actif). Transition animée du
// contenu (slide + fondu), coupée si prefers-reduced-motion. Distinct de la nav
// GLOBALE de l'app (layout.tsx) — s'ajoute, ne la remplace pas.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export interface PageTab<T extends string> { id: T; label: string }

interface Props<T extends string> {
  title?: string
  headerExtra?: React.ReactNode
  tabs: PageTab<T>[]
  active: T
  onChange: (id: T) => void
  children: React.ReactNode
}

export function TabbedPageLayout<T extends string>({ title, headerExtra, tabs, active, onChange, children }: Props<T>) {
  const reduce = useReducedMotion()

  const header = (title || headerExtra) ? (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      {title && <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h1>}
      {headerExtra}
    </div>
  ) : null

  // Transparent tant qu'il y a moins de 2 onglets : rend juste le contenu. La sous-nav
  // (sidebar desktop / onglets mobile) apparaît AUTOMATIQUEMENT dès qu'il y a ≥ 2 onglets.
  if (tabs.length < 2) return <div>{header}{children}</div>

  const deskBtn = (t: PageTab<T>): React.CSSProperties => {
    const on = t.id === active
    return {
      display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
      padding: '9px 12px', borderRadius: 'var(--r-sm)', marginBottom: 4, fontFamily: FB, fontSize: 13,
      fontWeight: on ? 600 : 500, background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-mid)',
      transition: 'background 0.14s, color 0.14s',
    }
  }

  return (
    <div>
      {header}

      <div className="md:flex">
        {/* Desktop : sous-nav verticale */}
        <nav className="hidden md:block" style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 'var(--space-4)' }}>
          <div style={{ position: 'sticky', top: 'var(--space-4)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => onChange(t.id)} style={deskBtn(t)}
                onMouseEnter={e => { if (t.id !== active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (t.id !== active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0 md:pl-[var(--space-6)]">
          {/* Mobile : onglets horizontaux */}
          <div className="flex md:hidden" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => onChange(t.id)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0', fontFamily: FB, fontSize: 14,
                fontWeight: t.id === active ? 600 : 500, color: t.id === active ? 'var(--text)' : 'var(--text-dim)',
                borderBottom: `2px solid ${t.id === active ? 'var(--text)' : 'transparent'}`,
              }}>{t.label}</button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -10 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
