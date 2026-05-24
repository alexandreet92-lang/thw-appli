'use client'
import { useState, useEffect, useRef } from 'react'
import { AgentIcon } from './AgentIcon'
import type { AgentId } from './AgentIcon'

type THWModel = 'hermes' | 'athena' | 'zeus'

interface Conv {
  id: string
  title: string
  updatedAt: number
  isPinned?: boolean
}

interface Props {
  convs:         Conv[]
  activeId:      string | null
  model:         THWModel
  onSelect:      (c: Conv) => void
  onDelete:      (id: string) => void
  onNew:         () => void
  onPin:         (id: string) => void
  onModelChange: (m: THWModel) => void
  onClose:       () => void
  persistent?:   boolean
}

const AGENTS: { id: AgentId; name: string }[] = [
  { id: 'athena', name: 'Athena' },
  { id: 'zeus',   name: 'Zeus'   },
  { id: 'hermes', name: 'Hermes' },
]

function fmt(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)     return 'instant'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function ConvItem({ c, activeId, onSelect, onDelete, onPin }: {
  c: Conv; activeId: string | null
  onSelect: (c: Conv) => void; onDelete: (id: string) => void; onPin: (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])
  const isActive = c.id === activeId
  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 1 }}>
      <button
        onClick={() => onSelect(c)}
        className="aiq-conv-btn"
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8,
          border: 'none', cursor: 'pointer', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 2,
          background: isActive ? 'var(--ai-accent-dim)' : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <span style={{
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: 'var(--ai-text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: 180, fontFamily: 'DM Sans,sans-serif',
          display: 'block',
        }}>
          {c.isPinned && <span style={{ fontSize: 8, marginRight: 4, color: '#2563EB' }}>*</span>}
          {c.title}
        </span>
        <span style={{ fontSize: 11, color: '#8C8C8C', fontFamily: 'DM Sans,sans-serif' }}>
          {fmt(c.updatedAt)}
        </span>
      </button>
      <button
        className="aiq-conv-dots"
        onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          width: 20, height: 20, border: 'none', background: 'none',
          cursor: 'pointer', color: '#8C8C8C', opacity: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4, padding: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {menu && (
        <div style={{
          position: 'absolute', right: 6, top: 'calc(100% - 4px)', zIndex: 50,
          background: 'var(--ai-bg)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 140, overflow: 'hidden',
        }}>
          {[
            { label: c.isPinned ? 'Desepingler' : 'Epingler', action: () => { onPin(c.id); setMenu(false) } },
            { label: 'Supprimer', action: () => { onDelete(c.id); setMenu(false) }, danger: true },
          ].map(it => (
            <button key={it.label} onClick={it.action} style={{
              display: 'block', width: '100%', padding: '8px 12px',
              border: 'none', background: 'none', cursor: 'pointer',
              textAlign: 'left', fontSize: 12, fontFamily: 'DM Sans,sans-serif',
              color: (it as { danger?: boolean }).danger ? '#EF4444' : 'var(--ai-text)',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ai-bg2)' }}
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

export default function AISidebar({
  convs, activeId, model, onSelect, onDelete, onNew, onPin, onModelChange, onClose, persistent = false,
}: Props) {
  const [search, setSearch] = useState('')
  const filtered = search ? convs.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : convs
  const pinned = filtered.filter(c => c.isPinned)
  const recent = filtered.filter(c => !c.isPinned)

  const panel = (
    <div className="aiq-sidebar" style={{
      width: persistent ? 220 : 260, height: '100%',
      background: 'var(--aiq-sidebar-bg)',
      borderRight: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 12px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#8C8C8C',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'DM Sans,sans-serif',
          }}>
            Conversations
          </span>
          <button
            onClick={onNew}
            title="Nouvelle discussion"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer', color: '#8C8C8C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <svg
            width="13" height="13" viewBox="0 0 13 13" fill="none"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#8C8C8C" strokeWidth="1.3"/>
            <path d="M9 9l3 3" stroke="#8C8C8C" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              width: '100%', height: 32, paddingLeft: 30, paddingRight: 10,
              borderRadius: 8, border: 'none',
              background: 'var(--ai-bg2)',
              fontSize: 13, color: 'var(--ai-text)',
              fontFamily: 'DM Sans,sans-serif', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {convs.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#8C8C8C', marginTop: 24, fontFamily: 'DM Sans,sans-serif' }}>
            Aucune conversation
          </p>
        )}
        {pinned.length > 0 && (
          <>
            <p style={{ fontSize: 10, color: '#8C8C8C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 4px 4px' }}>
              Epingles
            </p>
            {pinned.map(c => <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin}/>)}
          </>
        )}
        {recent.map(c => <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin}/>)}
      </div>

      {/* Agent selector */}
      <div style={{ padding: '10px 12px 14px', flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C8C8C', margin: '0 0 8px 4px', fontFamily: 'DM Sans,sans-serif' }}>
          Agent
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => onModelChange(a.id)}
              style={{
                flex: 1, height: 32, borderRadius: 8,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
                transition: 'all 0.15s',
                background: model === a.id ? '#FFFFFF' : 'transparent',
                color: model === a.id ? '#0A0A0A' : '#8C8C8C',
                boxShadow: model === a.id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              }}
              onMouseEnter={e => { if (model !== a.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)' }}
              onMouseLeave={e => { if (model !== a.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <AgentIcon agent={a.id} size={13} />
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (persistent) return panel
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0 }}>{panel}</div>
    </div>
  )
}
