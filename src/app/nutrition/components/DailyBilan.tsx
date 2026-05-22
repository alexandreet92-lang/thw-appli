'use client'
import { useState, useEffect } from 'react'

export interface DailyBilanProps {
  consumed: { calories: number; protein: number; carbs: number; fat: number }
  targets:  { calories: number; protein: number; carbs: number; fat: number }
  dayType:  'low' | 'mid' | 'hard'
}

const BADGE = {
  low:  { bg: 'rgba(34,197,94,0.10)',  border: '#22c55e', text: '#22c55e',  label: 'Jour Low'  },
  mid:  { bg: 'rgba(234,179,8,0.10)',  border: '#eab308', text: '#eab308',  label: 'Jour Mid'  },
  hard: { bg: 'rgba(239,68,68,0.10)',  border: '#ef4444', text: '#ef4444',  label: 'Jour Hard' },
}

function useAnim(consumed: number, target: number) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setPct(target > 0 ? Math.min(consumed / target, 1) : 0)
    })
    return () => cancelAnimationFrame(id)
  }, [consumed, target])
  return pct
}

function BigRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 55, sw = 10, size = 140, cx = 70
  const circ = 2 * Math.PI * r
  const pct = useAnim(consumed, target)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="kcal-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} style={{ opacity: 0.5 }} />
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="url(#kcal-ring-grad)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text)', lineHeight: 1 }}>
          {Math.round(consumed)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>kcal</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/ {Math.round(target)}</span>
      </div>
    </div>
  )
}

function MiniRing({ consumed, target, color, label }: { consumed: number; target: number; color: string; label: string }) {
  const r = 28, sw = 7, size = 72, cx = 36
  const circ = 2 * Math.PI * r
  const pct = useAnim(consumed, target)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} style={{ opacity: 0.5 }} />
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 11, color }}>
            {Math.round(consumed)}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-mid)' }}>
          {Math.round(consumed)}g / {Math.round(target)}g
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function DailyBilan({ consumed, targets, dayType }: DailyBilanProps) {
  const badge = BADGE[dayType]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0 }}>
          Bilan du jour
        </p>
        <div style={{ padding: '4px 10px', borderRadius: 8, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text, fontSize: 11, fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>
          {badge.label}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <BigRing consumed={consumed.calories} target={targets.calories} />
        <div style={{ display: 'flex', gap: 16, flex: 1, justifyContent: 'space-around', flexWrap: 'wrap' }}>
          <MiniRing consumed={consumed.protein} target={targets.protein} color="#10B981" label="Proteines" />
          <MiniRing consumed={consumed.carbs}   target={targets.carbs}   color="#F59E0B" label="Glucides"  />
          <MiniRing consumed={consumed.fat}     target={targets.fat}     color="#3B82F6" label="Lipides"   />
        </div>
      </div>
    </div>
  )
}
