'use client'
import { useState, useEffect, useRef } from 'react'

export interface ConvLike {
  id: string
  title: string
  updatedAt: number
  isPinned?: boolean
}

interface Props {
  convs: ConvLike[]
  activeId: string | null
  onSelect: (c: ConvLike) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
  emptyLabel?: string
}

function fmt(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)     return 'instant'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)} min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function ConvRow({ c, active, onSelect, onDelete, onPin }: {
  c: ConvLike; active: boolean
  onSelect: (c: ConvLike) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])
  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 1 }}>
      <button
        onClick={() => onSelect(c)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '8px 12px', borderRadius: 12, border: 'none',
          background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
          cursor: 'pointer', transition: 'background-color 100ms',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.92)', lineHeight: 1.35,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {c.isPinned && <span style={{ marginRight: 4, color: '#9ec5ff' }}>★</span>}
          {c.title || 'Nouvelle discussion'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>
          {fmt(c.updatedAt)}
        </p>
      </button>
      <button
        onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
        aria-label="Options"
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          width: 22, height: 22, border: 'none', background: 'transparent',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {menu && (
        <div style={{
          position: 'absolute', right: 6, top: 'calc(100% - 2px)', zIndex: 50,
          background: '#262626', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, minWidth: 150, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {[
            { label: c.isPinned ? 'Désépingler' : 'Épingler', action: () => { onPin(c.id); setMenu(false) } },
            { label: 'Supprimer', action: () => { onDelete(c.id); setMenu(false) }, danger: true },
          ].map(it => (
            <button key={it.label} onClick={it.action} style={{
              display: 'block', width: '100%', padding: '9px 12px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              textAlign: 'left', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
              color: (it as { danger?: boolean }).danger ? '#ff6b6b' : 'rgba(255,255,255,0.9)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ConvList({ convs, activeId, onSelect, onDelete, onPin, emptyLabel }: Props) {
  if (convs.length === 0) {
    return (
      <p style={{
        textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)',
        margin: '20px 12px', fontFamily: 'DM Sans, sans-serif',
      }}>
        {emptyLabel ?? 'Aucune conversation'}
      </p>
    )
  }
  const pinned = convs.filter(c => c.isPinned)
  const recent = convs.filter(c => !c.isPinned)
  return (
    <>
      {pinned.length > 0 && (
        <>
          <p style={{
            fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '6px 12px 4px', fontFamily: 'DM Sans, sans-serif',
          }}>Épinglés</p>
          {pinned.map(c => (
            <ConvRow key={c.id} c={c} active={c.id === activeId}
              onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
          ))}
        </>
      )}
      {recent.map(c => (
        <ConvRow key={c.id} c={c} active={c.id === activeId}
          onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
      ))}
    </>
  )
}

export default ConvList
