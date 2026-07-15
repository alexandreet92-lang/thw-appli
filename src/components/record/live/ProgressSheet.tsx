'use client'
// Bottom-sheet « progression » : Fait / En cours / À venir, dérivé de la timeline.
import type { TimelineStep } from './types'

interface Props { timeline: TimelineStep[]; stepIdx: number; onClose: () => void }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

function rows(timeline: TimelineStep[], stepIdx: number) {
  const done: [string, string][] = [], now: [string, string][] = [], next: [string, string][] = []
  timeline.forEach((s, i) => {
    if (s.kind !== 'effort') return
    const label = `T${s.tourInBlock} · ${cap(s.ex.name)}`
    const meta = s.ex.nature === 'temps' ? `${s.ex.durationSec}s` : `${s.ex.targetReps} reps`
    ;(i < stepIdx ? done : i === stepIdx ? now : next).push([label, meta])
  })
  return { done: done.slice(-6), now, next: next.slice(0, 10) }
}

function Line({ label, meta, tone }: { label: string; meta: string; tone: 'done' | 'now' | 'next' }) {
  const dot = tone === 'done' ? 'var(--charge-low)' : tone === 'now' ? 'var(--primary)' : 'var(--text-dim)'
  const col = tone === 'done' ? 'var(--text-dim)' : tone === 'next' ? 'var(--text-mid)' : 'var(--text)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 2px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: tone === 'now' ? '0 0 8px var(--primary)' : 'none' }} />
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: col }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>{meta}</span>
    </div>
  )
}

export default function ProgressSheet({ timeline, stepIdx, onClose }: Props) {
  const { done, now, next } = rows(timeline, stepIdx)
  const H: React.CSSProperties = { fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 800, margin: '14px 0 6px' }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxHeight: '78%', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '28px 28px 0 0', padding: '16px 18px calc(env(safe-area-inset-bottom) + 20px)', borderTop: '1px solid var(--border-mid)', fontFamily: 'DM Sans, sans-serif' }}>
        <p style={{ ...H, marginTop: 4 }}>Fait</p>
        {done.length ? done.map(([l, m], i) => <Line key={`d${i}`} label={l} meta={m} tone="done" />) : <Empty />}
        <p style={H}>En cours</p>
        {now.length ? now.map(([l, m], i) => <Line key={`n${i}`} label={l} meta={m} tone="now" />) : <Empty />}
        <p style={H}>À venir</p>
        {next.length ? next.map(([l, m], i) => <Line key={`a${i}`} label={l} meta={m} tone="next" />) : <Empty />}
        <button onClick={onClose} style={{ width: '100%', height: 50, borderRadius: 14, background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--text)', fontWeight: 800, marginTop: 14, cursor: 'pointer' }}>Fermer</button>
      </div>
    </div>
  )
}
const Empty = () => <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '2px 0' }}>—</p>
