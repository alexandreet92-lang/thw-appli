'use client'
// ══════════════════════════════════════════════════════════════
// Code d'invitation — présentation « façon carte d'embarquement » : 8 cellules
// segmentées (4 · 4). CodeInput = saisie (auto-avance, coller, backspace) pour
// l'athlète ; CodeDisplay = affichage lecture seule pour le coach. Design tokens
// (Inter tabulaire pour les caractères), accent unique var(--primary).
// ══════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'

const REVEAL = `@keyframes cmReveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`
const ALLOWED = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const san = (s: string) => s.toUpperCase().split('').filter(c => ALLOWED.includes(c)).join('')
const clean = (code: string) => san(code).slice(0, 8)

const cellBase: React.CSSProperties = {
  width: 'clamp(30px, 9vw, 42px)', height: 'clamp(40px, 12vw, 52px)', borderRadius: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-body)', fontSize: 'clamp(17px, 5vw, 22px)', fontWeight: 700,
  fontVariantNumeric: 'tabular-nums', color: 'var(--text)', boxSizing: 'border-box',
}
const Dash = () => <span style={{ width: 12, height: 2, borderRadius: 2, background: 'var(--border-mid)', flexShrink: 0 }} />

// ── Saisie (athlète) ─────────────────────────────────────────────────
export function CodeInput({ onChange, onComplete }: { onChange?: (code: string) => void; onComplete?: (code: string) => void }) {
  const [cells, setCells] = useState<string[]>(Array(8).fill(''))
  const [focus, setFocus] = useState<number | null>(null)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const emit = (arr: string[]) => { const code = arr.join(''); onChange?.(code); if (arr.every(Boolean)) onComplete?.(code) }
  const fillFrom = (start: number, s: string) => {
    const next = [...cells]; let j = start
    for (const ch of s) { if (j > 7) break; next[j] = ch; j++ }
    setCells(next); emit(next); refs.current[Math.min(j, 7)]?.focus()
  }
  const onCell = (i: number, raw: string) => {
    const s = san(raw)
    if (!s) { const next = [...cells]; next[i] = ''; setCells(next); emit(next); return }
    if (s.length > 1) { fillFrom(i, s); return }
    const next = [...cells]; next[i] = s; setCells(next); emit(next)
    if (i < 7) refs.current[i + 1]?.focus()
  }
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !cells[i] && i > 0) { e.preventDefault(); const next = [...cells]; next[i - 1] = ''; setCells(next); emit(next); refs.current[i - 1]?.focus() }
    else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < 7) refs.current[i + 1]?.focus()
  }

  const cell = (i: number) => {
    const filled = !!cells[i]; const foc = focus === i
    return (
      <input key={i} ref={el => { refs.current[i] = el }} value={cells[i]} inputMode="text" autoCapitalize="characters" maxLength={1}
        onChange={e => onCell(i, e.target.value)} onKeyDown={e => onKey(i, e)}
        onPaste={e => { e.preventDefault(); const s = san(e.clipboardData.getData('text')); if (s) fillFrom(i, s) }}
        onFocus={e => { setFocus(i); e.currentTarget.select() }} onBlur={() => setFocus(null)}
        aria-label={`Caractère ${i + 1}`}
        style={{
          ...cellBase, textAlign: 'center', outline: 'none', cursor: 'text',
          background: 'var(--input-bg)',
          border: `1.5px solid ${foc ? 'var(--primary)' : filled ? 'var(--border-mid)' : 'var(--border)'}`,
          boxShadow: foc ? '0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }} />
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(5px, 1.6vw, 8px)', flexWrap: 'nowrap' }}>
      {[0, 1, 2, 3].map(cell)}
      <Dash />
      {[4, 5, 6, 7].map(cell)}
    </div>
  )
}

// ── Affichage lecture seule (coach) ──────────────────────────────────
export function CodeDisplay({ code }: { code: string }) {
  const c = clean(code).padEnd(8, ' ').split('')
  const cell = (i: number) => (
    <span key={i} style={{ ...cellBase, background: 'var(--bg-alt)', border: '1.5px solid var(--border)', color: c[i] === ' ' ? 'var(--text-dim)' : 'var(--text)', letterSpacing: '0.02em' }}>{c[i].trim() || ''}</span>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(5px, 1.6vw, 8px)', flexWrap: 'nowrap' }}>
      {[0, 1, 2, 3].map(cell)}
      <Dash />
      {[4, 5, 6, 7].map(cell)}
    </div>
  )
}

// ── Révélation du code côté coach (affichage + copie) ────────────────
export function InviteCodeReveal({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { void navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600) }
  return (
    <div style={{ marginTop: 14, padding: 'clamp(14px, 3vw, 18px)', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-alt)', animation: 'cmReveal .25s cubic-bezier(.32,.72,0,1)' }}>
      <style>{REVEAL}</style>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Code d’invitation</div>
      <CodeDisplay code={code} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 11, border: 'none', background: copied ? 'color-mix(in srgb, #22c55e 16%, transparent)' : 'var(--primary)', color: copied ? '#22c55e' : 'var(--on-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background .15s' }}>
          {copied
            ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Copié</>
            : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copier</>}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', flex: 1, minWidth: 160 }}>Partage-le avec ton athlète — il le saisit sur son Dashboard.</span>
      </div>
    </div>
  )
}
