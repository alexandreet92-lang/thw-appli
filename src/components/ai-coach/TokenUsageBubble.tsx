'use client'

// ══════════════════════════════════════════════════════════════
// TokenUsageBubble — bouton jauge (à gauche du micro) + popover
// des 3 jauges (hebdo / 6h / bonus). Style claude.ai.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react'
import { CircleGauge, ShoppingBag, ChevronRight } from 'lucide-react'
import { getModelMultiplier, getModelDisplayName } from '@/lib/tokens/multipliers'

interface TokenLimits {
  monthly:     { used: number; limit: number; resets_at: string }
  rolling_6h:  { used: number; limit: number; resets_at: string }
  per_request: number
  bonus_tokens: number
  plan: string
}

function pct(used: number, limit: number): number {
  if (!limit || !isFinite(limit)) return 0
  return Math.min(100, Math.max(0, (used / limit) * 100))
}
function barColor(p: number): string {
  if (p > 95) return '#EF4444'
  if (p > 85) return '#F59E0B'
  return 'var(--primary)'
}
function dotColor(p: number): string {
  if (p > 85) return '#EF4444'
  if (p >= 60) return '#F59E0B'
  return '#22C55E'
}
function untilDays(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const d = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  return `${d}j`
}
function untilHours(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const h = Math.max(0, Math.ceil(ms / (60 * 60 * 1000)))
  return `${h}h`
}
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function Gauge({ label, used, limit, resetLabel }: { label: string; used: number; limit: number; resetLabel: string }) {
  const p = pct(used, limit)
  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{Math.round(p)}% · {resetLabel}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-alt)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: barColor(p), borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 5 }}>{fmt(used)} / {fmt(limit)} tokens</div>
    </div>
  )
}

export default function TokenUsageBubble({ onBuyTokens, currentModel = 'athena' }: { onBuyTokens: () => void; currentModel?: string }) {
  const [open, setOpen] = useState(false)
  const [limits, setLimits] = useState<TokenLimits | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens/limits')
      if (res.ok) setLimits(await res.json() as TokenLimits)
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (open) void load() }, [open, load])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const maxPct = limits ? Math.max(pct(limits.monthly.used, limits.monthly.limit), pct(limits.rolling_6h.used, limits.rolling_6h.limit)) : 0

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Utilisation des tokens"
        className="aip-icon-btn"
        style={{ width: 28, height: 28, borderRadius: 6, color: open ? 'var(--ai-text)' : 'var(--ai-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
      >
        <CircleGauge size={16} />
        <span style={{ position: 'absolute', bottom: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: dotColor(maxPct), border: '1px solid var(--ai-bg)' }} />
      </button>

      {open && limits && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 320, zIndex: 300,
          background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 14,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: 4,
          animation: 'aip_menu_up 0.16s ease-out',
        }}>
          <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Utilisation des tokens</div>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <Gauge label="Limite hebdomadaire" used={limits.monthly.used} limit={limits.monthly.limit} resetLabel={`Réinit. dans ${untilDays(limits.monthly.resets_at)}`} />
          <div style={{ height: 1, background: 'var(--border)' }} />
          <Gauge label="Limite de 6 heures" used={limits.rolling_6h.used} limit={limits.rolling_6h.limit} resetLabel={`Réinit. dans ${untilHours(limits.rolling_6h.resets_at)}`} />
          {limits.bonus_tokens > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Tokens bonus</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', fontFamily: 'DM Mono, monospace' }}>{fmt(limits.bonus_tokens)}</span>
              </div>
            </>
          )}
          {/* Modèle actuel + multiplicateurs */}
          {(() => {
            const mult = getModelMultiplier(currentModel)
            const name = getModelDisplayName(currentModel)
            const cell = (m: string, label: string) => {
              const active = getModelDisplayName(currentModel) === label
              return <span style={{ color: active ? 'var(--text)' : 'var(--text-dim)', fontWeight: active ? 500 : 400 }}>{label} ×{m}</span>
            }
            return (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Modèle actuel</span>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, color: '#06B6D4', background: 'rgba(6,182,212,0.10)', border: '0.5px solid rgba(6,182,212,0.25)' }}>{name}</span>
                </div>
                {mult > 1 && (
                  <p style={{ fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.5, margin: '6px 0 8px' }}>
                    1 message {name} consomme environ {mult} fois plus vite ton quota qu&apos;un message Hermès.
                  </p>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.3px', display: 'flex', gap: 6 }}>
                  {cell('1', 'Hermès')}<span>·</span>{cell('3', 'Athéna')}<span>·</span>{cell('8', 'Zeus')}
                </div>
              </div>
            )
          })()}
          <div style={{ height: 1, background: 'var(--border)' }} />
          <button
            onClick={() => { setOpen(false); onBuyTokens() }}
            style={{ width: '100%', padding: '10px 16px', margin: 0, background: 'var(--bg-alt)', border: '0.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-alt)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
              <ShoppingBag size={15} /> Acheter des tokens
            </span>
            <ChevronRight size={12} color="var(--text-mid)" />
          </button>
        </div>
      )}
    </div>
  )
}
