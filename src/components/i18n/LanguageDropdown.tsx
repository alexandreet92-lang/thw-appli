'use client'
// Sélecteur de langue façon menu déroulant stylé (haut-droite). Le panneau
// s'anime à l'ouverture ET à la fermeture (opacité + translation/échelle).
// Fermeture au clic extérieur. À la charte (tokens).
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { LANGS } from '@/lib/i18n/dictionaries'

export function LanguageDropdown() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGS.find(l => l.code === lang) ?? LANGS[0]

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={ref} style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 12px)', right: 16, zIndex: 60 }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} style={{
        display: 'inline-flex', alignItems: 'center', gap: 9, height: 40, padding: '0 8px 0 12px', borderRadius: 999,
        border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)', color: 'var(--text)',
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 17, lineHeight: 1, display: 'flex' }}>{current.flag}</span>
        <span style={{ letterSpacing: '0.01em' }}>{current.label}</span>
        <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.7 }}><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>

      <div role="listbox" style={{
        position: 'absolute', top: 46, right: 0, minWidth: 170, padding: 6, transformOrigin: 'top right',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-card)',
        opacity: open ? 1 : 0, transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
        pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.18s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {LANGS.map(l => {
          const on = l.code === lang
          return (
            <button key={l.code} role="option" aria-selected={on} onClick={() => { setLang(l.code); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none',
              background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: on ? 600 : 500, cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => { if (!on) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!on) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <span style={{ fontSize: 16 }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.label}</span>
              {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5L20 6" /></svg>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
