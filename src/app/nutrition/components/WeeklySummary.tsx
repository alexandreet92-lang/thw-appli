'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

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
        <div key={i} style={{ height: 12, borderRadius: 'var(--r-sm)', background: 'var(--border)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  )
}

export default function WeeklySummary({ weekData, planType }: Props) {
  const { t } = useI18n()
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
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: '14px 16px', marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--primary)' }}><HermesIcon /></span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
          {t('w3h.week_analysis')}
        </span>
        <span style={{ marginLeft: 4, padding: '2px 8px', borderRadius: 'var(--r-lg)', background: 'linear-gradient(90deg,rgba(6,182,212,0.15),rgba(59,130,246,0.15))', border: '1px solid rgba(6,182,212,0.3)', fontSize: 10, color: 'var(--primary)', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
          Hermes
        </span>
      </div>

      {/* States */}
      {!summary && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <button onClick={() => void generate()}
            style={{ padding: '8px 20px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer' }}>
            {t('w3h.generate_summary')}
          </button>
        </div>
      )}

      {loading && <Skeleton />}

      {error && !loading && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-body)' }}>
          {t('w3h.analysis_unavailable')}
        </p>
      )}

      {summary && !loading && (
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontFamily: 'var(--font-body)' }}>
            {summary}
          </p>
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button onClick={() => void generate()}
              style={{ padding: '4px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
              {t('w3h.refresh')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
