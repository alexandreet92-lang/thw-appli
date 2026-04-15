'use client'

// ══════════════════════════════════════════════════════════════
// AI PANEL — Interface IA premium, redesign complet.
// Desktop : panneau fixe 540px (sidebar 200px + chat flex-1)
// Mobile  : plein écran 100dvh, sidebar en overlay absolu
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
const MAX_CONVS_PER_AGENT = 20

function loadStore(): ConvStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStore(store: ConvStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {}
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function fmtDate(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return "À l'instant"
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Mini Markdown ──────────────────────────────────────────────

function MsgContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.65 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        const isBullet = /^[-•*]\s+/.test(line)
        const cleaned = isBullet ? line.replace(/^[-•*]\s+/, '') : line
        const parts = cleaned.split(/\*\*([^*]+)\*\*/g)
        const rendered = parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ fontWeight: 600 }}>{part}</strong>
            : <span key={j}>{part}</span>
        )
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: isBullet ? 3 : 0 }}>
            {isBullet && <span style={{ color: 'var(--text-dim)', flexShrink: 0, marginTop: 1 }}>·</span>}
            <span>{rendered}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Loading dots ───────────────────────────────────────────────

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--text-dim)',
            animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Icon helpers ───────────────────────────────────────────────

function IconX({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function IconChevron({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function IconTrash({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}

function IconArrow({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function IconSend({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  )
}

// Hamburger (deux traits) pour mobile sidebar
function IconMenu({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 8h16M4 16h16" />
    </svg>
  )
}

// New conv : bulle chat + plus
function IconNewConv({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M12 8v4M10 10h4" />
    </svg>
  )
}

// ── Main Panel ─────────────────────────────────────────────────

export default function AIPanel({ open, onClose, initialAgent, context }: Props) {
  const [activeAgent, setActiveAgent]       = useState<PageAgent>(initialAgent)
  const [store, setStore]                   = useState<ConvStore>({})
  const [activeConvId, setActiveConvId]     = useState<string | null>(null)
  const [input, setInput]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [mounted, setMounted]               = useState(false)
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [sidebarOpen, setSidebarOpen]       = useState(false) // mobile sidebar toggle

  const chatEndRef   = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  const config = AGENT_CONFIGS[activeAgent]
  const convs  = store[activeAgent] ?? []
  const activeConv = convs.find(c => c.id === activeConvId) ?? null

  // Mount + load store
  useEffect(() => {
    setMounted(true)
    setStore(loadStore())
  }, [])

  // Save store on change
  useEffect(() => {
    if (mounted) saveStore(store)
  }, [store, mounted])

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConvId, loading, store])

  // Focus textarea on open
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 300)
  }, [open])

  // Escape to close panel
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dropdownOpen])

  // Reset conversation when agent changes
  useEffect(() => {
    setActiveConvId(null)
  }, [activeAgent])

  // Reset to initialAgent when panel opens
  useEffect(() => {
    if (open) setActiveAgent(initialAgent)
  }, [open, initialAgent])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  // Create new conversation
  const newConv = useCallback((firstMsg: string): AIConv => ({
    id: genId(),
    title: firstMsg.slice(0, 48) + (firstMsg.length > 48 ? '…' : ''),
    agentId: activeAgent,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    msgs: [],
  }), [activeAgent])

  // Update store helper
  const updateConvInStore = useCallback((conv: AIConv) => {
    setStore(prev => {
      const agentConvs = prev[conv.agentId] ?? []
      const exists = agentConvs.some(c => c.id === conv.id)
      const updated = exists
        ? agentConvs.map(c => c.id === conv.id ? conv : c)
        : [conv, ...agentConvs]
      return {
        ...prev,
        [conv.agentId]: updated.slice(0, MAX_CONVS_PER_AGENT),
      }
    })
  }, [])

  // Send message
  const send = useCallback(async (text?: string) => {
    const msgText = (text ?? input).trim()
    if (!msgText || loading) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    // Get or create conversation
    let conv = activeConv
    let isNew = false
    if (!conv) {
      conv = newConv(msgText)
      isNew = true
    }

    const userMsg: AIMsg = { id: genId(), role: 'user', content: msgText, ts: Date.now() }
    const withUser: AIConv = {
      ...conv,
      msgs: [...conv.msgs, userMsg],
      title: conv.msgs.length === 0 ? (msgText.slice(0, 48) + (msgText.length > 48 ? '…' : '')) : conv.title,
      updatedAt: Date.now(),
    }

    updateConvInStore(withUser)
    if (isNew) setActiveConvId(withUser.id)

    // Keep local ref for reply
    const convId = withUser.id
    const convAgentId = withUser.agentId

    try {
      const res = await fetch('/api/coach-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          payload: {
            agentId: activeAgent,
            messages: withUser.msgs.map(m => ({ role: m.role, content: m.content })),
            context: context ?? {},
          },
        }),
      })
      const data = await res.json()
      const replyText = data?.result?.reply ?? data?.reply ?? "Désolé, je n'ai pas pu générer de réponse."

      const aiMsg: AIMsg = { id: genId(), role: 'assistant', content: replyText, ts: Date.now() }
      setStore(prev => {
        const agentConvs = prev[convAgentId] ?? []
        return {
          ...prev,
          [convAgentId]: agentConvs.map(c =>
            c.id === convId ? { ...c, msgs: [...c.msgs, aiMsg], updatedAt: Date.now() } : c
          ),
        }
      })
    } catch {
      const errMsg: AIMsg = {
        id: genId(),
        role: 'assistant',
        content: 'Une erreur est survenue. Vérifie ta connexion et réessaie.',
        ts: Date.now(),
      }
      setStore(prev => {
        const agentConvs = prev[convAgentId] ?? []
        return {
          ...prev,
          [convAgentId]: agentConvs.map(c =>
            c.id === convId ? { ...c, msgs: [...c.msgs, errMsg], updatedAt: Date.now() } : c
          ),
        }
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeConv, activeAgent, context, newConv, updateConvInStore])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const deleteConv = (agentId: PageAgent, convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setStore(prev => ({
      ...prev,
      [agentId]: (prev[agentId] ?? []).filter(c => c.id !== convId),
    }))
    if (activeConvId === convId) setActiveConvId(null)
  }

  const openConv = (conv: AIConv) => {
    setActiveAgent(conv.agentId)
    setActiveConvId(conv.id)
    setSidebarOpen(false)
  }

  const handleNewConv = () => {
    setActiveConvId(null)
    setSidebarOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const switchAgent = (agent: PageAgent) => {
    setActiveAgent(agent)
    setDropdownOpen(false)
    setSidebarOpen(false)
    setActiveConvId(null)
  }

  // ── Sidebar content ────────────────────────────────────────

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header sidebar */}
      <div style={{
        padding: '16px 14px 10px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
        }}>
          Conversations
        </div>
      </div>

      {/* Conv list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {convs.length === 0 ? (
          <div style={{
            padding: '24px 8px',
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            Aucune conversation.<br />Commence par poser une question.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {convs.map(conv => (
              <div
                key={conv.id}
                onClick={() => openConv(conv)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: conv.id === activeConvId ? 'rgba(91,111,255,0.1)' : 'transparent',
                  border: `1px solid ${conv.id === activeConvId ? 'rgba(91,111,255,0.3)' : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  transition: 'all 0.12s',
                  position: 'relative' as const,
                }}
                onMouseEnter={e => {
                  if (conv.id !== activeConvId) {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card2)'
                  }
                }}
                onMouseLeave={e => {
                  if (conv.id !== activeConvId) {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: conv.id === activeConvId ? 600 : 400,
                    color: conv.id === activeConvId ? 'var(--text)' : 'var(--text-mid)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}>
                    {conv.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                    {fmtDate(conv.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConv(conv.agentId, conv.id, e)}
                  title="Supprimer"
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-dim)',
                    opacity: 0,
                    transition: 'opacity 0.12s',
                    padding: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0' }}
                  onFocus={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                  onBlur={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0' }}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Chat area ──────────────────────────────────────────────

  const ChatArea = () => (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden',
    }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Quick actions (no active conv or empty conv) */}
        {(!activeConv || activeConv.msgs.length === 0) && (
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              marginBottom: 12,
            }}>
              Actions rapides
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              {config.quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => send(qa.prompt)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card2)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.14s',
                    opacity: loading ? 0.55 : 1,
                    width: '100%',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = config.accent + '55'
                      ;(e.currentTarget as HTMLButtonElement).style.background = config.accent + '0d'
                    }
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)'
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-mid)',
                    lineHeight: 1.3,
                  }}>
                    {qa.label}
                  </span>
                  <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                    <IconArrow />
                  </span>
                </button>
              ))}
            </div>
            <div style={{
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: 11,
              paddingBottom: 16,
            }}>
              ou tape directement ta question ci-dessous
            </div>
          </div>
        )}

        {/* Messages list */}
        {activeConv && activeConv.msgs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
            {activeConv.msgs.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                {/* AI avatar */}
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="THW" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user'
                    ? '13px 13px 4px 13px'
                    : '13px 13px 13px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                    : 'var(--bg-card2)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  color: msg.role === 'user' ? '#fff' : 'inherit',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}>
                  {msg.role === 'user' ? msg.content : <MsgContent text={msg.content} />}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  overflow: 'hidden', border: '1px solid var(--border)',
                  background: 'var(--bg-card2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="THW" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                </div>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '13px 13px 13px 4px',
                  background: 'var(--bg-card2)',
                  border: '1px solid var(--border)',
                }}>
                  <LoadingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '8px 8px 8px 14px',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Pose ta question…"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'inherit',
              minHeight: 20,
              maxHeight: 140,
              overflowY: 'auto',
              paddingTop: 1,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              flexShrink: 0,
              border: 'none',
              background: input.trim() && !loading
                ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                : 'var(--border)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              color: 'white',
            }}
          >
            <IconSend />
          </button>
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--text-dim)',
          marginTop: 5,
          textAlign: 'center',
          letterSpacing: '0.01em',
        }}>
          Entrée pour envoyer · Shift+Entrée pour sauter une ligne
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* CSS global pour animations + media queries mobile */}
      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        .ai-panel-root {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 540px;
          max-width: 100vw;
          z-index: 1200;
          background: var(--bg-card);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          box-shadow: -24px 0 60px rgba(0,0,0,0.18);
          transition: transform 0.34s cubic-bezier(0.32,1.08,0.64,1);
          overflow: hidden;
        }
        .ai-panel-root.panel-closed {
          transform: translateX(100%);
          box-shadow: none;
        }
        .ai-panel-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }
        .ai-panel-sidebar {
          width: 200px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: var(--bg-card2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ai-panel-sidebar-overlay {
          display: none;
        }
        .ai-hamburger-btn {
          display: none;
        }
        @media (max-width: 767px) {
          .ai-panel-root {
            width: 100% !important;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            height: 100dvh;
            border-left: none;
          }
          .ai-panel-sidebar {
            position: absolute !important;
            left: 0;
            top: 0;
            bottom: 0;
            width: 260px !important;
            z-index: 20;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: none;
          }
          .ai-panel-sidebar.sidebar-open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.22);
          }
          .ai-panel-sidebar-overlay {
            display: block;
            position: absolute;
            inset: 0;
            z-index: 15;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(2px);
          }
          .ai-hamburger-btn {
            display: flex !important;
          }
        }
      `}</style>

      {/* Panel */}
      <div className={`ai-panel-root${open ? '' : ' panel-closed'}`}>

        {/* ── Header ── */}
        <div style={{
          padding: '0 14px',
          height: 52,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="THW Coach"
              style={{ height: 28, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Theme dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <button
              onClick={() => setDropdownOpen(d => !d)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                background: dropdownOpen ? 'var(--bg-card2)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-mid)',
                transition: 'all 0.13s',
                whiteSpace: 'nowrap' as const,
              }}
            >
              <span>{AGENT_DISPLAY[activeAgent]}</span>
              <span style={{
                color: 'var(--text-dim)',
                transition: 'transform 0.15s',
                display: 'flex',
                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              }}>
                <IconChevron />
              </span>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                minWidth: 160,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                overflow: 'hidden',
                zIndex: 50,
              }}>
                {MAIN_AGENTS.map(agent => (
                  <button
                    key={agent}
                    onClick={() => switchAgent(agent)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '9px 14px',
                      border: 'none',
                      background: agent === activeAgent ? 'rgba(91,111,255,0.08)' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      fontWeight: agent === activeAgent ? 600 : 400,
                      color: agent === activeAgent ? '#5b6fff' : 'var(--text-mid)',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (agent !== activeAgent)
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)'
                    }}
                    onMouseLeave={e => {
                      if (agent !== activeAgent)
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }}
                  >
                    <span>{AGENT_DISPLAY[agent]}</span>
                    {agent === activeAgent && (
                      <span style={{ color: '#5b6fff' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New conversation button */}
          <button
            onClick={handleNewConv}
            title="Nouvelle conversation"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'white',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            <IconNewConv />
          </button>

          {/* Hamburger — mobile only */}
          <button
            className="ai-hamburger-btn"
            onClick={() => setSidebarOpen(s => !s)}
            title="Conversations"
            style={{
              width: 30,
              height: 30,
              borderRadius: 50,
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--text-mid)',
            }}
          >
            <IconMenu />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Fermer"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--text-dim)',
              transition: 'all 0.13s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
            }}
          >
            <IconX />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="ai-panel-body">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="ai-panel-sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`ai-panel-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
            <SidebarContent />
          </div>

          {/* Chat */}
          <ChatArea />
        </div>
      </div>
    </>
  )
}
