'use client'

// ══════════════════════════════════════════════════════════════
// AI PANEL — Interface IA premium
// Desktop : panneau fixe 540px (sidebar 200px + chat flex-1)
// Mobile  : plein écran 100dvh, sidebar overlay gauche
//
// BUG INPUT FIX : SidebarContent et ChatArea sont renderés
// en JSX inline — pas en composants intérieurs — pour éviter
// le unmount/remount sur chaque keystroke (perte de focus).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import type { PageAgent } from './agentConfig'
import { AGENT_CONFIGS, MAIN_AGENTS, AGENT_DISPLAY } from './agentConfig'

// ── Types ──────────────────────────────────────────────────────

interface AIMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface AIConv {
  id: string
  title: string
  agentId: PageAgent
  createdAt: number
  updatedAt: number
  msgs: AIMsg[]
}

type ConvStore = Partial<Record<PageAgent, AIConv[]>>

interface Props {
  open: boolean
  onClose: () => void
  initialAgent: PageAgent
  context?: Record<string, unknown>
}

// ── Storage ────────────────────────────────────────────────────

const STORE_KEY = 'thw_ai_convs_v2'
const MAX_PER_AGENT = 20

function loadStore(): ConvStore {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') }
  catch { return {} }
}
function saveStore(s: ConvStore) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch {}
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function fmtDate(ts: number) {
  const d = Date.now() - ts
  if (d < 60_000) return "À l'instant"
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Markdown renderer (gère ###, **, -, ---, listes numérotées) ─

function MsgContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()

    // Ligne vide
    if (!line.trim()) { nodes.push(<div key={i} style={{ height: 8 }} />); return }

    // Séparateur --- : on ignore (ne pas afficher)
    if (/^[-—]{3,}$/.test(line.trim())) return

    // Heading ### ou ## ou #
    const headMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headMatch) {
      const level = headMatch[1].length
      const txt = headMatch[2]
      nodes.push(
        <div key={i} style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: level === 1 ? 15 : level === 2 ? 13 : 12,
          color: 'var(--text)',
          marginTop: level === 1 ? 14 : 10,
          marginBottom: 4,
          letterSpacing: level === 3 ? '0.04em' : undefined,
          textTransform: level === 3 ? 'uppercase' : undefined,
          opacity: level === 3 ? 0.55 : 1,
        }}>
          {parseBold(txt)}
        </div>
      )
      return
    }

    // Liste numérotée
    const numMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (numMatch) {
      nodes.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ color: 'var(--text-dim)', minWidth: 16, flexShrink: 0, fontSize: 12 }}>{numMatch[1]}.</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{parseBold(numMatch[2])}</span>
        </div>
      )
      return
    }

    // Bullet point
    const bulletMatch = line.match(/^[-•*]\s+(.+)/)
    if (bulletMatch) {
      nodes.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ color: '#5b6fff', flexShrink: 0, marginTop: 2, fontSize: 10 }}>▸</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{parseBold(bulletMatch[1])}</span>
        </div>
      )
      return
    }

    // Texte normal
    nodes.push(
      <div key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 2 }}>
        {parseBold(line)}
      </div>
    )
  })

  return <div>{nodes}</div>
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ fontWeight: 600, color: 'var(--text)' }}>{p}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

// ── Loading dots ───────────────────────────────────────────────

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block',
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--text-dim)',
          animation: `aiDot 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────

export default function AIPanel({ open, onClose, initialAgent, context }: Props) {
  const [agent, setAgent]           = useState<PageAgent>(initialAgent)
  const [store, setStore]           = useState<ConvStore>({})
  const [activeId, setActiveId]     = useState<string | null>(null)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [mounted, setMounted]       = useState(false)
  const [ddOpen, setDdOpen]         = useState(false)     // theme dropdown
  const [sbOpen, setSbOpen]         = useState(false)     // mobile sidebar
  const [menuConvId, setMenuConvId] = useState<string | null>(null)  // "..." menu
  const [renaming, setRenaming]     = useState<string | null>(null)  // conv being renamed
  const [renameVal, setRenameVal]   = useState('')

  const areaRef    = useRef<HTMLTextAreaElement>(null)
  const ddRef      = useRef<HTMLDivElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)
  const endRef     = useRef<HTMLDivElement>(null)

  const cfg    = AGENT_CONFIGS[agent]
  const convs  = store[agent] ?? []
  const active = convs.find(c => c.id === activeId) ?? null

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => { setMounted(true); setStore(loadStore()) }, [])
  useEffect(() => { if (mounted) saveStore(store) }, [store, mounted])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, loading, store])

  useEffect(() => {
    if (open) setTimeout(() => areaRef.current?.focus(), 280)
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (ddOpen) setDdOpen(false); else if (menuConvId) setMenuConvId(null); else onClose() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, ddOpen, menuConvId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!ddOpen) return
    const h = (e: MouseEvent) => { if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ddOpen])

  // Close conv menu on outside click
  useEffect(() => {
    if (!menuConvId) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuConvId(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuConvId])

  // Reset conv on agent change
  useEffect(() => { setActiveId(null) }, [agent])

  // Sync agent with page when panel opens
  useEffect(() => { if (open) setAgent(initialAgent) }, [open, initialAgent])

  // ── Handlers ──────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const switchAgent = (a: PageAgent) => { setAgent(a); setDdOpen(false); setSbOpen(false); setActiveId(null) }

  const openConv = (c: AIConv) => { setAgent(c.agentId); setActiveId(c.id); setSbOpen(false); setMenuConvId(null) }

  const newConv = () => { setActiveId(null); setSbOpen(false); setTimeout(() => areaRef.current?.focus(), 80) }

  const deleteConv = (agentId: PageAgent, cid: string) => {
    setStore(p => ({ ...p, [agentId]: (p[agentId] ?? []).filter(c => c.id !== cid) }))
    if (activeId === cid) setActiveId(null)
    setMenuConvId(null)
  }

  const startRename = (c: AIConv) => { setRenaming(c.id); setRenameVal(c.title); setMenuConvId(null) }

  const confirmRename = (agentId: PageAgent, cid: string) => {
    const val = renameVal.trim()
    if (val) {
      setStore(p => ({ ...p, [agentId]: (p[agentId] ?? []).map(c => c.id === cid ? { ...c, title: val } : c) }))
    }
    setRenaming(null)
  }

  const send = useCallback(async (preset?: string) => {
    const txt = (preset ?? input).trim()
    if (!txt || loading) return

    setInput('')
    if (areaRef.current) { areaRef.current.style.height = 'auto'; areaRef.current.focus() }
    setLoading(true)

    const currentAgent = agent
    let conv = active
    let isNew = false

    if (!conv) {
      conv = {
        id: genId(),
        title: txt.slice(0, 48) + (txt.length > 48 ? '…' : ''),
        agentId: currentAgent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        msgs: [],
      }
      isNew = true
    }

    const userMsg: AIMsg = { id: genId(), role: 'user', content: txt, ts: Date.now() }
    const updated: AIConv = {
      ...conv,
      msgs: [...conv.msgs, userMsg],
      title: conv.msgs.length === 0 ? (txt.slice(0, 48) + (txt.length > 48 ? '…' : '')) : conv.title,
      updatedAt: Date.now(),
    }

    // Update store
    setStore(p => {
      const list = p[currentAgent] ?? []
      const exists = list.some(c => c.id === updated.id)
      const next = exists ? list.map(c => c.id === updated.id ? updated : c) : [updated, ...list]
      return { ...p, [currentAgent]: next.slice(0, MAX_PER_AGENT) }
    })
    if (isNew) setActiveId(updated.id)

    const cid = updated.id

    try {
      const res = await fetch('/api/coach-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          payload: {
            agentId: currentAgent,
            messages: updated.msgs.map(m => ({ role: m.role, content: m.content })),
            context: context ?? {},
          },
        }),
      })
      const data = await res.json()
      const reply = data?.result?.reply ?? data?.reply ?? "Désolé, une erreur est survenue."
      const aiMsg: AIMsg = { id: genId(), role: 'assistant', content: reply, ts: Date.now() }
      setStore(p => ({
        ...p,
        [currentAgent]: (p[currentAgent] ?? []).map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, aiMsg], updatedAt: Date.now() } : c
        ),
      }))
    } catch {
      const errMsg: AIMsg = { id: genId(), role: 'assistant', content: 'Erreur réseau. Réessaie.', ts: Date.now() }
      setStore(p => ({
        ...p,
        [currentAgent]: (p[currentAgent] ?? []).map(c =>
          c.id === cid ? { ...c, msgs: [...c.msgs, errMsg], updatedAt: Date.now() } : c
        ),
      }))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, active, agent, context])

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      {/* Global CSS — animations + responsive */}
      <style>{`
        @keyframes aiDot {
          0%,80%,100% { opacity:0.2; transform:translateY(0); }
          40% { opacity:1; transform:translateY(-3px); }
        }
        .aip-root {
          position:fixed; top:0; right:0; bottom:0; width:540px; max-width:100vw;
          z-index:1200; background:var(--bg-card); border-left:1px solid var(--border);
          display:flex; flex-direction:column; overflow:hidden;
          box-shadow:-20px 0 60px rgba(0,0,0,0.16);
          transition:transform 0.32s cubic-bezier(0.32,1.08,0.64,1);
        }
        .aip-root.closed { transform:translateX(100%); box-shadow:none; }
        .aip-body { display:flex; flex:1; min-height:0; overflow:hidden; position:relative; }
        .aip-sidebar {
          width:200px; flex-shrink:0; border-right:1px solid var(--border);
          background:var(--bg-card2); display:flex; flex-direction:column; overflow:hidden;
        }
        .aip-hamburger { display:none !important; }
        .aip-sb-overlay { display:none; }
        @media (max-width:767px) {
          .aip-root { width:100% !important; left:0; border-left:none; }
          .aip-sidebar {
            position:absolute !important; left:0; top:0; bottom:0; width:260px !important;
            z-index:20; transform:translateX(-100%); transition:transform 0.24s ease;
          }
          .aip-sidebar.sb-open { transform:translateX(0); box-shadow:4px 0 20px rgba(0,0,0,0.2); }
          .aip-hamburger { display:flex !important; }
          .aip-sb-overlay { display:block; position:absolute; inset:0; z-index:15; background:rgba(0,0,0,0.38); }
        }
      `}</style>

      <div className={`aip-root${open ? '' : ' closed'}`}>

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <div style={{
          height: 52, padding: '0 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="THW" style={{ height: 26, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />

          {/* Theme dropdown */}
          <div ref={ddRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <button
              onClick={() => setDdOpen(d => !d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 9px', borderRadius: 7,
                border: '1px solid var(--border)',
                background: ddOpen ? 'rgba(91,111,255,0.08)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
                color: ddOpen ? '#5b6fff' : 'var(--text-mid)',
                transition: 'all 0.13s',
              }}
            >
              <span>{AGENT_DISPLAY[agent]}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: ddOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {ddOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                minWidth: 168, background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 60,
              }}>
                {MAIN_AGENTS.map(a => (
                  <button
                    key={a}
                    onClick={() => switchAgent(a)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '9px 14px',
                      border: 'none',
                      background: a === agent ? 'rgba(91,111,255,0.09)' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      fontWeight: a === agent ? 600 : 400,
                      color: a === agent ? '#5b6fff' : 'var(--text-mid)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (a !== agent) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                    onMouseLeave={e => { if (a !== agent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span>{AGENT_DISPLAY[a]}</span>
                    {a === agent && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5b6fff" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="aip-hamburger"
            onClick={() => setSbOpen(s => !s)}
            style={{
              width: 30, height: 30, borderRadius: 50,
              border: '1px solid var(--border)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--text-mid)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--text-dim)', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ══ BODY ════════════════════════════════════════════ */}
        <div className="aip-body">

          {/* Mobile overlay */}
          {sbOpen && <div className="aip-sb-overlay" onClick={() => setSbOpen(false)} />}

          {/* ── SIDEBAR ─────────────────────────────────────── */}
          <div className={`aip-sidebar${sbOpen ? ' sb-open' : ''}`}>
            {/* Sidebar header : "Discussions" + bouton nouvelle conv */}
            <div style={{
              padding: '12px 10px 10px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--text-dim)',
              }}>
                Discussions
              </span>
              {/* Bouton nouvelle discussion — bulle chat bleue + + */}
              <button
                onClick={newConv}
                title="Nouvelle discussion"
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'white',
                  boxShadow: '0 2px 8px rgba(91,111,255,0.35)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  <path d="M12 8v4M10 10h4" />
                </svg>
              </button>
            </div>

            {/* Liste des conversations */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
              {convs.length === 0 ? (
                <div style={{
                  padding: '20px 8px', textAlign: 'center',
                  color: 'var(--text-dim)', fontSize: 11, lineHeight: 1.6,
                }}>
                  Aucune discussion.<br />Pose une question pour commencer.
                </div>
              ) : convs.map(conv => (
                <div
                  key={conv.id}
                  style={{ position: 'relative', marginBottom: 2 }}
                >
                  {/* Rename inline */}
                  {renaming === conv.id ? (
                    <div style={{ padding: '4px 6px' }}>
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmRename(conv.agentId, conv.id)
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                        onBlur={() => confirmRename(conv.agentId, conv.id)}
                        style={{
                          width: '100%', padding: '5px 8px', borderRadius: 6,
                          border: '1px solid rgba(91,111,255,0.5)',
                          background: 'var(--bg-card)', color: 'var(--text)',
                          fontFamily: 'DM Sans, sans-serif', fontSize: 12, outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => openConv(conv)}
                      style={{
                        padding: '8px 8px 8px 10px',
                        borderRadius: 8,
                        background: conv.id === activeId ? 'rgba(91,111,255,0.1)' : 'transparent',
                        border: `1px solid ${conv.id === activeId ? 'rgba(91,111,255,0.28)' : 'transparent'}`,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (conv.id !== activeId) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)' }}
                      onMouseLeave={e => { if (conv.id !== activeId) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: conv.id === activeId ? 600 : 400,
                          color: conv.id === activeId ? 'var(--text)' : 'var(--text-mid)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1.35,
                        }}>
                          {conv.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                          {fmtDate(conv.updatedAt)}
                        </div>
                      </div>

                      {/* Bouton "..." */}
                      <div style={{ position: 'relative' }} ref={menuConvId === conv.id ? menuRef : undefined}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuConvId(menuConvId === conv.id ? null : conv.id) }}
                          style={{
                            width: 22, height: 22, borderRadius: 5, border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-dim)', flexShrink: 0, padding: 0,
                            opacity: menuConvId === conv.id || conv.id === activeId ? 1 : 0,
                            transition: 'opacity 0.12s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                          onMouseLeave={e => {
                            if (menuConvId !== conv.id && conv.id !== activeId)
                              (e.currentTarget as HTMLButtonElement).style.opacity = '0'
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>

                        {/* Menu contextuel */}
                        {menuConvId === conv.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 40,
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
                            overflow: 'hidden', minWidth: 130,
                          }}>
                            <button
                              onClick={e => { e.stopPropagation(); startRename(conv) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', padding: '8px 12px',
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                                color: 'var(--text-mid)', textAlign: 'left',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Renommer
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteConv(conv.agentId, conv.id) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', padding: '8px 12px',
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                                color: '#ef4444', textAlign: 'left',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                              </svg>
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── CHAT ────────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 0' }}>

              {/* Zone vide → actions rapides */}
              {(!active || active.msgs.length === 0) && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10,
                  }}>
                    Actions rapides
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 20 }}>
                    {cfg.quickActions.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => send(qa.prompt)}
                        disabled={loading}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 10, padding: '10px 13px', borderRadius: 9,
                          border: '1px solid var(--border)', background: 'var(--bg-card2)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          textAlign: 'left', transition: 'all 0.13s',
                          opacity: loading ? 0.55 : 1, width: '100%',
                        }}
                        onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.borderColor = cfg.accent + '55'; (e.currentTarget as HTMLButtonElement).style.background = cfg.accent + '0d' } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-mid)', lineHeight: 1.3 }}>
                          {qa.label}
                        </span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, paddingBottom: 12 }}>
                    ou tape directement ta question
                  </div>
                </div>
              )}

              {/* Messages */}
              {active && active.msgs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
                  {active.msgs.map(msg => (
                    <div key={msg.id} style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-start', gap: 8,
                    }}>
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          background: 'var(--bg-card2)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 2, overflow: 'hidden',
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/logo.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{
                        maxWidth: '84%',
                        padding: msg.role === 'user' ? '9px 13px' : '10px 14px',
                        borderRadius: msg.role === 'user' ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                          : 'var(--bg-card2)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                        color: msg.role === 'user' ? '#fff' : 'inherit',
                        fontSize: 13,
                      }}>
                        {msg.role === 'user'
                          ? <span style={{ lineHeight: 1.55 }}>{msg.content}</span>
                          : <MsgContent text={msg.content} />
                        }
                      </div>
                    </div>
                  ))}

                  {/* Loading */}
                  {loading && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: 'var(--bg-card2)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                      </div>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '13px 13px 13px 4px',
                        background: 'var(--bg-card2)', border: '1px solid var(--border)',
                      }}>
                        <LoadingDots />
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            {/* ── INPUT ──────────────────────────────────────── */}
            <div style={{
              padding: '10px 14px 14px',
              borderTop: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '8px 8px 8px 13px',
              }}>
                <textarea
                  ref={areaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Pose ta question…"
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none', fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13, lineHeight: 1.5, color: 'inherit',
                    minHeight: 20, maxHeight: 140, overflowY: 'auto', paddingTop: 1,
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0, border: 'none',
                    background: input.trim() && !loading
                      ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                      : 'var(--border)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.14s', color: 'white',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 5, textAlign: 'center' }}>
                Entrée pour envoyer · Shift+Entrée pour sauter une ligne
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
