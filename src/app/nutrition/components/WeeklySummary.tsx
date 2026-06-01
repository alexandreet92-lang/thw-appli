'use client'
import { useState } from 'react'

interface DayEntry {
  date:   string
  kcal:   number
  target: number
  prot:   number
  gluc:   number
  lip:    number
}

interface Props {
  weekData:  DayEntry[]
  planType?: string
}

function HermesIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="8" y1="2" x2="8" y2="14" transform="rotate(60 8 8)" />
      <line x1="8" y1="2" x2="8" y2="14" transform="rotate(120 8 8)" />
    </svg>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[90, 75, 60].map((w, i) => (
        <div key={i} style={{ height: 12, borderRadius: 6, background: 'var(--border)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  )
}

export default function WeeklySummary({ weekData, planType }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  async function generate() {
    setLoading(true); setError(false); setSummary(null)
    try {
      const res = await fetch('/api/nutrition-weekly-summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekData, planType }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json() as { summary?: string }
      setSummary(d.summary ?? '')
    } catch { setError(true) } finally { setLoading(false) }
  }

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: '#06B6D4' }}><HermesIcon /></span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>
          Analyse de la semaine
        </span>
        <span style={{ marginLeft: 4, padding: '2px 8px', borderRadius: 20, background: 'linear-gradient(90deg,rgba(6,182,212,0.15),rgba(59,130,246,0.15))', border: '1px solid rgba(6,182,212,0.3)', fontSize: 10, color: '#06B6D4', fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>
          Hermes
        </span>
      </div>

      {/* States */}
      {!summary && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <button onClick={() => void generate()}
            style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontFamily: 'Syne,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
            Generer le bilan
          </button>
        </div>
      )}

      {loading && <Skeleton />}

      {error && !loading && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>
          Analyse indisponible
        </p>
      )}

      {summary && !loading && (
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontFamily: 'DM Sans,sans-serif' }}>
            {summary}
          </p>
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button onClick={() => void generate()}
              style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              Actualiser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
