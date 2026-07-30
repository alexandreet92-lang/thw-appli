'use client'
// ══════════════════════════════════════════════════════════════
// Menus coach — un dropdown de filtre stylé (pas de <select> générique) et un
// menu d'actions « ⋯ » par ligne (rendu en portal pour ne pas être rogné par
// la carte). Animations fluides, états au survol, coche sur l'option active.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const BODY = 'DM Sans, sans-serif'
const anim = `@keyframes cmMenuIn{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:none}}`

export interface Opt { value: string; label: string; hint?: string }

// ── Dropdown de filtre (single-select) ───────────────────────────────
export function FilterMenu({ label, value, options, onChange }: { label: string; value: string; options: Opt[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const active = value !== '__all__'
  const current = options.find(o => o.value === value)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style>{anim}</style>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${active || open ? 'color-mix(in srgb, var(--primary) 45%, var(--border))' : 'var(--border)'}`, background: active ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-card)', color: active ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>
        {label}{active && current ? ` · ${current.label}` : ''}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 210, zIndex: 60, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.22)', padding: 6, animation: 'cmMenuIn .16s cubic-bezier(.32,.72,0,1)', maxHeight: 320, overflowY: 'auto' }}>
          {[{ value: '__all__', label: 'Tous' } as Opt, ...options].map(o => {
            const sel = o.value === value
            return (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 9, border: 'none', background: sel ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent', cursor: 'pointer', fontFamily: BODY }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)' }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span style={{ width: 16, flexShrink: 0, color: 'var(--primary)' }}>{sel && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: sel ? 700 : 500, color: sel ? 'var(--primary)' : 'var(--text)' }}>{o.label}</span>
                  {o.hint && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{o.hint}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Menu d'actions « ⋯ » (portal) ────────────────────────────────────
export interface Action { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }
export function RowActionsMenu({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const W = 216

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    const r = btn.current!.getBoundingClientRect()
    const left = Math.max(12, Math.min(r.right - W, window.innerWidth - W - 12))
    const below = r.bottom + 6
    const top = below + 220 > window.innerHeight ? r.top - 6 - Math.min(220, actions.length * 46 + 12) : below
    setPos({ top, left }); setOpen(o => !o)
  }

  return (
    <>
      <button ref={btn} onClick={toggle} aria-label="Actions" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: open ? 'var(--bg-alt)' : 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)'}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && pos && createPortal(
        <>
          <style>{anim}</style>
          <div onClick={e => { e.stopPropagation(); setOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 13000 }} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: W, zIndex: 13001, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 18px 48px rgba(0,0,0,0.28)', padding: 6, animation: 'cmMenuIn .16s cubic-bezier(.32,.72,0,1)' }}>
            {actions.map((a, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setOpen(false); a.onClick() }}
                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: BODY, color: a.danger ? '#ef4444' : 'var(--text)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = a.danger ? 'rgba(239,68,68,0.08)' : 'var(--bg-alt)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <span style={{ display: 'flex', flexShrink: 0, color: a.danger ? '#ef4444' : 'var(--text-mid)' }}>{a.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </>, document.body)}
    </>
  )
}
