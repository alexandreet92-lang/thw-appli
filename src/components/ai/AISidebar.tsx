'use client'
import { useState, useEffect, useRef } from 'react'

interface Conv {
  id: string
  title: string
  updatedAt: number
  isPinned?: boolean
}

interface Props {
  convs:     Conv[]
  activeId:  string | null
  onSelect:  (c: Conv) => void
  onDelete:  (id: string) => void
  onNew:     () => void
  onPin:     (id: string) => void
  onClose:   () => void
  persistent?: boolean
}

function fmt(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)      return 'instant'
  if (d < 3_600_000)   return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000)  return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function ConvItem({ c, activeId, onSelect, onDelete, onPin }: {
  c: Conv; activeId: string | null
  onSelect: (c: Conv) => void
  onDelete: (id: string) => void
  onPin:    (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])

  const isActive = c.id === activeId
  return (
    <div className="aip-hist-item" style={{ position: 'relative', marginBottom: 1 }}>
      <button
        onClick={() => onSelect(c)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none',
          background: isActive ? 'var(--ai-accent-dim)' : 'transparent',
          cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <span style={{
          fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--ai-text)' : 'var(--ai-mid)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170,
          fontFamily: 'DM Sans,sans-serif',
        }}>
          {c.isPinned && <span style={{ fontSize: 8, marginRight: 4, color: 'var(--ai-accent)' }}>*</span>}
          {c.title}
        </span>
        <span style={{ fontSize: 9, color: 'var(--ai-dim)', fontFamily: 'DM Mono,monospace' }}>
          {fmt(c.updatedAt)}
        </span>
      </button>
      <button
        className="aip-hist-dots"
        onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          width: 20, height: 20, border: 'none', background: 'none',
          cursor: 'pointer', color: 'var(--ai-dim)', opacity: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', borderRadius: 4, padding: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {menu && (
        <div ref={ref} style={{
          position: 'absolute', right: 6, top: 'calc(100% - 4px)', zIndex: 50,
          background: 'var(--ai-bg)', border: '1px solid var(--ai-border)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          minWidth: 140, overflow: 'hidden',
        }}>
          {[
            { label: c.isPinned ? 'Desepingler' : 'Epingler', action: () => { onPin(c.id); setMenu(false) } },
            { label: 'Supprimer', action: () => { onDelete(c.id); setMenu(false) }, danger: true },
          ].map(it => (
            <button key={it.label} onClick={it.action} style={{
              display: 'block', width: '100%', padding: '8px 12px', border: 'none',
              background: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: 12, fontFamily: 'DM Sans,sans-serif',
              color: (it as { danger?: boolean }).danger ? '#EF4444' : 'var(--ai-text)',
            }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AISidebar({ convs, activeId, onSelect, onDelete, onNew, onPin, onClose, persistent = false }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? convs.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : convs
  const pinned = filtered.filter(c => c.isPinned)
  const recent = filtered.filter(c => !c.isPinned)

  const panel = (
    <div style={{
      width: persistent ? 220 : 260, height: '100%', background: 'var(--ai-bg)',
      borderRight: '1px solid var(--ai-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid var(--ai-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-dim)', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Conversations</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onNew} title="Nouvelle conversation" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--ai-accent)', opacity: 0.85, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          {!persistent && (
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--ai-bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ai-dim)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>
      {/* Search */}
      <div style={{ padding: '6px 8px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ai-dim)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, borderRadius: 8, border: '1px solid var(--ai-border)', background: 'var(--ai-bg2)', fontSize: 12, color: 'var(--ai-text)', outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }} />
        </div>
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        {convs.length === 0 && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ai-dim)', marginTop: 24 }}>Aucune conversation</p>}
        {pinned.length > 0 && <><p style={{ fontSize: 10, color: 'var(--ai-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 4px 4px', padding: 0 }}>Epingles</p>{pinned.map(c => <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} />)}</>}
        {recent.length > 0 && <>{pinned.length > 0 && <p style={{ fontSize: 10, color: 'var(--ai-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 4px 4px' }}>Recent</p>}{recent.map(c => <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} />)}</>}
      </div>
    </div>
  )

  if (persistent) return panel
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0 }}>{panel}</div>
    </div>
  )
}
