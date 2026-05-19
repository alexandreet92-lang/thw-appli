'use client'
import { useEffect, useState } from 'react'

interface Props {
  nights7: { date: string; totalMin: number | null }[]
  recommended?: number
}

function fmtDebt(debt: number): string {
  const h = Math.floor(debt / 60), m = Math.round(debt % 60)
  if (debt <= 0) return '0h'
  return h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`
}

export default function SleepDebt({ nights7, recommended = 8 }: Props) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(id)
  }, [])

  const recMin = recommended * 60
  const debt = nights7.reduce((acc, n) => acc + Math.max(0, recMin - (n.totalMin ?? recMin)), 0)
  const ratio = Math.min(debt / (7 * 60), 1) // max 7h debt
  const filled = Math.max(0, 1 - ratio)

  const color = ratio < 0.15 ? '#10B981' : ratio < 0.45 ? '#F97316' : '#EF4444'
  const label = ratio < 0.15 ? '✓ Bien récupéré' : ratio < 0.45 ? '⚠ Récupération partielle' : '⚡ Déficit important'

  const R = 30, C = 2 * Math.PI * R
  const [offset, setOffset] = useState(C * 0.01) // near-full at start
  useEffect(() => {
    setOffset(C * (1 - (animated ? filled : 1)))
  }, [animated, filled, C])

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: 'var(--bg-card2)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <svg width={72} height={72} viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
        <circle cx={36} cy={36} r={R} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={36} cy={36} r={R} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        <text x={36} y={36} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={12} fontWeight={700} fontFamily="DM Mono,monospace">
          {fmtDebt(debt)}
        </text>
      </svg>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: 'var(--text)' }}>
          Dette de sommeil
        </p>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 5px' }}>
          7 jours glissants · réf. {recommended}h/nuit
        </p>
        <p style={{ fontSize: 9, color, margin: 0, fontWeight: 600 }}>{label}</p>
      </div>
    </div>
  )
}
