'use client'

// ══════════════════════════════════════════════════════════════
// AI ASSISTANT DRAWER
// Drawer latéral contextuel — conversations multi-agents.
// Design premium Notion/Linear/Vercel.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import type { PageAgent, AgentConfig } from './agentConfig'
import { AGENT_CONFIGS } from './agentConfig'

// ── Types ──────────────────────────────────────────────────────

interface AIMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
}

interface AIConv {
  id: string
  title: string
  agentId: PageAgent
  createdAt: number
  msgs: AIMsg[]
}

interface Props {
  open: boolean
  onClose: () => void
  agent: PageAgent
  context?: Record<string, unknown>
}

// ── Storage ────────────────────────────────────────────────────

const STORAGE_KEY = 'coach_ai_convs'
const MAX_CONVS = 50

function loadConvs(): AIConv[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveConvs(convs: AIConv[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, MAX_CONVS)))
  } catch {}
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ── Logo SVG ───────────────────────────────────────────────────

function AILogo({ size = 20, gradient = true }: { size?: number; gradient?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const gid = `aig-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c8e0" />
          <stop offset="100%" stopColor="#5b6fff" />
        </linearGradient>
      </defs>
      {/* Triangle outer frame */}
      <path
        d="M12 2L22 19H2L12 2Z"
        stroke={gradient ? `url(#${gid})` : 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner nodes */}
      <circle cx="12" cy="9" r="1.4" fill={gradient ? `url(#${gid})` : 'currentColor'} />
      <circle cx="8.5" cy="16" r="1.2" fill={gradient ? `url(#${gid})` : 'currentColor'} opacity="0.7" />
      <circle cx="15.5" cy="16" r="1.2" fill={gradient ? `url(#${gid})` : 'currentColor'} opacity="0.7" />
      {/* Connecting lines */}
      <line x1="12" y1="9" x2="8.5" y2="16" stroke={gradient ? `url(#${gid})` : 'currentColor'} strokeWidth="1" opacity="0.5" />
      <line x1="12" y1="9" x2="15.5" y2="16" stroke={gradient ? `url(#${gid})` : 'currentColor'} strokeWidth="1" opacity="0.5" />
      <line x1="8.5" y1="16" x2="15.5" y2="16" stroke={gradient ? `url(#${gid})` : 'currentColor'} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

// ── Message content renderer ───────────────────────────────────

function MsgContent({ text }: { text: string }) {
  // Simple markdown: **bold**, bullet points, line breaks
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />
        // Bullet points
        const isBullet = /^[-•*]\s+/.test(line)
        const cleaned = isBullet ? line.replace(/^[-•*]\s+/, '') : line
        // Bold: **text**
        const parts = cleaned.split(/\*\*([^*]+)\*\*/g)
        const rendered = parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ fontWeight: 600 }}>{part}</strong>
            : <span key={j}>{part}</span>
        )
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: isBullet ? 4 : 0 }}>
            {isBullet && <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>·</span>}
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
    <>
      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--text-dim)',
              animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  )
}

// ── Main Drawer ────────────────────────────────────────────────

export default function AIAssistantDrawer({ open, onClose, agent, context }: Props) {
  const config: AgentConfig = AGENT_CONFIGS[agent]
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [convs, setConvs] = useState<AIConv[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Mount + load convs
  useEffect(() => {
    setMounted(true)
    const stored = loadConvs()
    setConvs(stored)
    // Start new conv for this agent if none active
    setActiveConvId(null)
  }, [])

  // Save whenever convs change
  useEffect(() => {
    if (mounted) saveConvs(convs)
  }, [convs, mounted])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convs, activeConvId, loading])

  // Focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
  }, [open])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  // Get active conversation
  const activeConv = convs.find(c => c.id === activeConvId) ?? null

  // Create new conversation
  const newConv = useCallback((firstMsg?: string): AIConv => {
    const id = genId()
    const conv: AIConv = {
      id,
      title: firstMsg ? firstMsg.slice(0, 45) + (firstMsg.length > 45 ? '…' : '') : 'Nouvelle conversation',
      agentId: agent,
      createdAt: Date.now(),
      msgs: [],
    }
    return conv
  }, [agent])

  // Send message
  const send = useCallback(async (text?: string) => {
    const msgText = (text ?? input).trim()
    if (!msgText || loading) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLoading(true)

    // Get or create conversation
    let conv = activeConv
    let isNew = false
    if (!conv) {
      conv = newConv(msgText)
      isNew = true
    }

    // Add user message
    const userMsg: AIMsg = { id: genId(), role: 'user', text: msgText, ts: Date.now() }
    const updatedMsgs = [...conv.msgs, userMsg]
    const updatedConv: AIConv = {
      ...conv,
      msgs: updatedMsgs,
      title: conv.msgs.length === 0 ? (msgText.slice(0, 45) + (msgText.length > 45 ? '…' : '')) : conv.title,
    }

    // Update state
    setConvs(prev => {
      if (isNew) return [updatedConv, ...prev]
      return prev.map(c => c.id === updatedConv.id ? updatedConv : c)
    })
    setActiveConvId(updatedConv.id)

    try {
      const res = await fetch('/api/coach-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          payload: {
            agentId: agent,
            messages: updatedMsgs.map(m => ({ role: m.role, content: m.text })),
            context: context ?? {},
          },
        }),
      })
      const data = await res.json()
      const replyText = data?.result?.reply ?? data?.reply ?? 'Désolé, je n\'ai pas pu générer de réponse.'

      const aiMsg: AIMsg = { id: genId(), role: 'assistant', text: replyText, ts: Date.now() }
      setConvs(prev => prev.map(c =>
        c.id === updatedConv.id
          ? { ...c, msgs: [...c.msgs, aiMsg] }
          : c
      ))
    } catch {
      const errMsg: AIMsg = {
        id: genId(),
        role: 'assistant',
        text: 'Une erreur est survenue. Vérifie ta connexion et réessaie.',
        ts: Date.now(),
      }
      setConvs(prev => prev.map(c =>
        c.id === updatedConv.id
          ? { ...c, msgs: [...c.msgs, errMsg] }
          : c
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeConv, agent, context, newConv])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Delete conversation
  const deleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConvs(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) setActiveConvId(null)
  }

  // Switch conversation
  const openConv = (id: string) => {
    setActiveConvId(id)
    setView('chat')
  }

  // Format date
  const fmtDate = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60_000) return 'À l\'instant'
    if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)}min`
    if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)}h`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const agentConvs = convs.filter(c => c.agentId === agent)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: open ? 'rgba(0,0,0,0.4)' : 'transparent',
          backdropFilter: open ? 'blur(2px)' : 'none',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'background 0.3s, backdrop-filter 0.3s',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 420, maxWidth: '100vw',
          zIndex: 999,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.38s cubic-bezier(0.34,1.1,0.64,1)',
          boxShadow: open ? '-20px 0 60px rgba(0,0,0,0.35)' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(0,200,224,0.15),rgba(91,111,255,0.15))',
            border: '1px solid rgba(91,111,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AILogo size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              {config.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
              {config.subtitle}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* History toggle */}
            <button
              onClick={() => setView(v => v === 'history' ? 'chat' : 'history')}
              title="Historique"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)',
                background: view === 'history' ? 'rgba(91,111,255,0.12)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: view === 'history' ? '#5b6fff' : 'var(--text-dim)',
                transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {/* New conv */}
            <button
              onClick={() => { setActiveConvId(null); setView('chat') }}
              title="Nouvelle conversation"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-dim)',
                transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              title="Fermer"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-dim)',
                transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── History view ── */}
        {view === 'history' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Conversations récentes
            </div>
            {agentConvs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: '32px 0' }}>
                Aucune conversation pour cet agent
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agentConvs.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => openConv(conv.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${conv.id === activeConvId ? 'rgba(91,111,255,0.4)' : 'var(--border)'}`,
                      background: conv.id === activeConvId ? 'rgba(91,111,255,0.07)' : 'var(--bg-card2)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {conv.msgs.length} message{conv.msgs.length !== 1 ? 's' : ''} · {fmtDate(conv.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConv(conv.id, e)}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        border: 'none', background: 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-dim)',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Chat view ── */}
        {view === 'chat' && (
          <>
            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

              {/* Quick actions (shown when no messages) */}
              {!activeConv || activeConv.msgs.length === 0 ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Actions rapides
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                    {config.quickActions.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => send(qa.prompt)}
                        disabled={loading}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card2)',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                          opacity: loading ? 0.6 : 1,
                        }}
                        onMouseEnter={e => {
                          if (!loading) {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = config.accent + '60'
                            ;(e.currentTarget as HTMLButtonElement).style.background = config.accent + '10'
                          }
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)'
                        }}
                      >
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{qa.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: 'var(--text-mid)' }}>
                          {qa.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, padding: '12px 0 20px' }}>
                    ou tape directement ta question ci-dessous
                  </div>
                </div>
              ) : (
                /* Messages */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
                  {activeConv.msgs.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: 'linear-gradient(135deg,rgba(0,200,224,0.12),rgba(91,111,255,0.12))',
                          border: '1px solid rgba(91,111,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginRight: 8, marginTop: 2,
                        }}>
                          <AILogo size={14} />
                        </div>
                      )}
                      <div style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                          : 'var(--bg-card2)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                        color: msg.role === 'user' ? '#fff' : 'inherit',
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}>
                        {msg.role === 'user' ? msg.text : <MsgContent text={msg.text} />}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg,rgba(0,200,224,0.12),rgba(91,111,255,0.12))',
                        border: '1px solid rgba(91,111,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <AILogo size={14} />
                      </div>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '14px 14px 14px 4px',
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

            {/* ── Input area ── */}
            <div style={{
              padding: '12px 16px 16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              {activeConv && activeConv.msgs.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {config.quickActions.slice(0, 2).map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => send(qa.prompt)}
                      disabled={loading}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        fontSize: 11,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        color: 'var(--text-dim)',
                        transition: 'all 0.15s',
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      {qa.emoji} {qa.label}
                    </button>
                  ))}
                </div>
              )}
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: 'var(--bg-card2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '8px 10px 8px 14px',
                transition: 'border-color 0.15s',
              }}
                onFocus={() => {}}
              >
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
                    fontFamily: 'DM Sans,sans-serif',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'inherit',
                    minHeight: 20,
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    border: 'none',
                    background: input.trim() && !loading
                      ? 'linear-gradient(135deg,#00c8e0,#5b6fff)'
                      : 'var(--border)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>
                Entrée pour envoyer · Shift+Entrée pour une nouvelle ligne
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
