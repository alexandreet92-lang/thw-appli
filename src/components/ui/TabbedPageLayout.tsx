'use client'
// Sous-navigation réutilisable pour toute page à onglets (DESIGN_SYSTEM.md §4.1).
// Desktop : sidebar verticale à gauche (~200px) + filet ; le contenu prend le reste
// de la largeur. Mobile : onglets horizontaux en haut (soulignement actif).
// Transition animée (slide + fondu), coupée si prefers-reduced-motion.
// Responsive piloté en JS (window width) — pas de dépendance aux classes md: de Tailwind.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function useWidth(): number {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  useEffect(() => {
    const f = () => setW(window.innerWidth)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return w
}

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
  const isDesktop = useWidth() >= 768

  const header = (title || headerExtra) ? (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      {title && <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h1>}
      {headerExtra}
    </div>
  ) : null

  // Transparent tant qu'il y a < 2 onglets : la sous-nav apparaît automatiquement ≥ 2.
  if (tabs.length < 2) return <div>{header}{children}</div>

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={active}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -10 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.32, 0.72, 0, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div>
      {header}
      <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', alignItems: 'stretch' }}>
        {isDesktop ? (
          <nav style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 'var(--space-4)' }}>
            <div style={{ position: 'sticky', top: 'var(--space-4)' }}>
              {tabs.map(t => {
                const on = t.id === active
                return (
                  <button key={t.id} onClick={() => onChange(t.id)}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', padding: '9px 12px', borderRadius: 'var(--r-sm)', marginBottom: 4, fontFamily: FB, fontSize: 13, fontWeight: on ? 600 : 500, background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-mid)', transition: 'background 0.14s, color 0.14s' }}
                    onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </nav>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => onChange(t.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0', fontFamily: FB, fontSize: 14, fontWeight: t.id === active ? 600 : 500, color: t.id === active ? 'var(--text)' : 'var(--text-dim)', borderBottom: `2px solid ${t.id === active ? 'var(--text)' : 'transparent'}` }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, paddingLeft: isDesktop ? 'var(--space-6)' : 0 }}>
          {content}
        </div>
      </div>
    </div>
  )
}
