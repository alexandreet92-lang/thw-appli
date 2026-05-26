'use client'
import { useEffect, useState, useRef } from 'react'

interface Props {
  seconds: number
  onDone: () => void
  isDark: boolean
  accent?: string
}

export default function RestTimer({ seconds, onDone, isDark, accent = '#06B6D4' }: Props) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setRemaining(seconds)
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          onDone()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [seconds, onDone])

  const progress = remaining / seconds
  const circumference = 2 * Math.PI * 44
  const bg = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.25)' : '#D1D5DB'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 24, background: bg }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: dim, margin: 0 }}>Repos</p>
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="55" cy="55" r="44" fill="none" stroke={dim} strokeWidth="6" />
          <circle cx="55" cy="55" r="44" fill="none" stroke={accent} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 34, fontWeight: 700, color: text, fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>{remaining}</span>
          <span style={{ fontSize: 11, color: dim, marginTop: 2 }}>sec</span>
        </div>
      </div>
      <button
        onClick={onDone}
        style={{ padding: '10px 28px', borderRadius: 12, background: accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
      >
        Passer
      </button>
    </div>
  )
}
