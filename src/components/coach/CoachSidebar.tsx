'use client'

// ══════════════════════════════════════════════════════════════
// SIDEBAR COACH — miroir de la sidebar athlète (mêmes mécaniques : rail
// desktop qui s'ouvre au survol, drawer mobile), mais navigation dédiée au
// métier de coach. Accent BLEU logo (var(--primary)) pour distinguer les deux mondes.
// ══════════════════════════════════════════════════════════════

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/lib/i18n'

const COACH_ACCENT = 'var(--primary)'

const ic = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const COACH_NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: '/coach',          label: 'Dashboard',    icon: <svg {...ic}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: '/coach/athletes', label: 'Athlètes',     icon: <svg {...ic}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/coach/library',  label: 'Bibliothèque', icon: <svg {...ic}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { href: '/coach/messages', label: 'Messages',     icon: <svg {...ic}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { href: '/coach/studio',   label: 'Studio',       icon: <svg {...ic}><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 6.6 10.6 16.4M17 6.6 13.4 16.4"/></svg> },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/coach') return pathname === '/coach'
  if (href === '/coach/athletes') return pathname.startsWith('/coach/athletes') || pathname.startsWith('/coach/athlete')
  return pathname === href || pathname.startsWith(href + '/')
}

function CoachNavItem({ href, label, icon, active, onClick, expanded }: { href: string; label: string; icon: React.ReactNode; active: boolean; onClick?: () => void; expanded: boolean }) {
  return (
    <Link href={href} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, textDecoration: 'none',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? COACH_ACCENT : 'var(--text-mid)', background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
        borderLeft: `3px solid ${active ? COACH_ACCENT : 'transparent'}`, transition: 'background 0.14s, color 0.14s' }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--primary) 6%, transparent)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-mid)' } }}>
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6, display: 'flex' }}>{icon}</span>
      <span style={{ opacity: expanded ? 1 : 0, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  )
}

export function CoachSidebarContent({ onClose, onOpenAI, headerSlot, expanded = true }: { onClose?: () => void; onOpenAI?: () => void; headerSlot?: React.ReactNode; expanded?: boolean }) {
  const pathname = usePathname()
  const { mode, toggleTheme } = useTheme()
  const { t } = useI18n()
  const lbl: React.CSSProperties = { opacity: expanded ? 1 : 0, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* En-tête : nom de l'app « Hybrid » + type d'interface (coach) */}
      {headerSlot !== undefined ? headerSlot : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 14px 12px', borderBottom: '1px solid var(--nav-border)', flexShrink: 0 }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: `color-mix(in srgb, ${COACH_ACCENT} 14%, transparent)`, color: COACH_ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <div style={{ minWidth: 0, ...lbl }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 21, color: 'var(--text)', lineHeight: 1.05, whiteSpace: 'nowrap' }}>Hybrid</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 700, color: COACH_ACCENT, marginTop: 2, whiteSpace: 'nowrap' }}>Interface coach</div>
          </div>
        </div>
      )}

      {/* Nav coach */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px', gap: 2 }}>
        {COACH_NAV.map(item => (
          <CoachNavItem key={item.href} href={item.href} label={item.label} icon={item.icon}
            active={isActive(pathname, item.href)} onClick={onClose} expanded={expanded} />
        ))}
      </nav>

      {/* Bas : retour appli athlète + assistant coach + thème */}
      <div style={{ borderTop: '1px solid var(--nav-border)', padding: '8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <Link href="/" onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, textDecoration: 'none', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
          <span style={{ flexShrink: 0, opacity: 0.6, display: 'flex' }}><svg {...ic}><path d="M19 12H5M11 18l-6-6 6-6"/></svg></span>
          <span style={lbl}>Revenir à mon appli</span>
        </Link>
        {onOpenAI && (
          <button onClick={onOpenAI}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo_4bras.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
            <span style={lbl}>Assistant coach</span>
          </button>
        )}
        <button onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ flexShrink: 0, opacity: 0.6, display: 'flex' }}>
            {mode === 'dark'
              ? <svg {...ic}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
              : <svg {...ic}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>}
          </span>
          <span style={lbl}>{t(mode === 'dark' ? 'nav.themeDark' : 'nav.themeLight')}</span>
        </button>
      </div>
    </div>
  )
}
