'use client'
// ══════════════════════════════════════════════════════════════
// COACH IA + USAGE → tap /settings/subscription.
// Champ « Demander au coach… » → ouvre AIPanel (event thw:open-coach,
// écouté par les shells). Usage = usage_logs via /api/subscriptions/
// summary (messages). PAS token_usage (vide). --ai-accent = Coach IA.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, Gauge, useReducedMotion } from './primitives'
import { FB, FD, NUM } from './lib'

interface Usage { used: number; limit: number }

export function CoachAICard() {
  const reduce = useReducedMotion()
  const [text, setText] = useState('')
  const [usage, setUsage] = useState<Usage | null>(null)
  const [unlimited, setUnlimited] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/subscriptions/summary', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json() as { unlimited?: boolean; usage?: Record<string, Usage> }
        if (cancelled) return
        setUnlimited(Boolean(json.unlimited))
        if (json.usage?.message) setUsage(json.usage.message)
      } catch { /* silencieux : la carte reste utilisable */ }
    })()
    return () => { cancelled = true }
  }, [])

  function ask() {
    const prompt = text.trim()
    if (prompt) sessionStorage.setItem('coach_prefill', prompt)
    window.dispatchEvent(new CustomEvent('thw:open-coach', { detail: { prompt } }))
    setText('')
  }

  const hasLimit = usage != null && isFinite(usage.limit)

  return (
    <Card>
      <h2 style={{ margin: '0 0 var(--space-3)', fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Coach IA</h2>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        background: 'var(--bg-card)', borderRadius: 999, padding: '6px 6px 6px 16px',
        border: '1px solid var(--border)',
      }}>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder="Demander au coach…"
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: FB, fontSize: 14, color: 'var(--text)' }}
        />
        <button
          onClick={ask}
          aria-label="Envoyer au coach"
          style={{
            width: 34, height: 34, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--ai-accent)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: reduce ? 'none' : 'opacity 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <Link href="/settings/subscription" style={{ display: 'block', marginTop: 'var(--space-4)', textDecoration: 'none' }}>
        {unlimited ? (
          <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Messages — Illimité</p>
        ) : hasLimit && usage ? (
          <>
            <p style={{ margin: '0 0 var(--space-2)', ...NUM, fontSize: 13, color: 'var(--text-mid)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{usage.used} / {usage.limit}</span> messages
            </p>
            <Gauge value={usage.used} max={usage.limit} />
          </>
        ) : (
          <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>Voir mon abonnement →</p>
        )}
      </Link>
    </Card>
  )
}
