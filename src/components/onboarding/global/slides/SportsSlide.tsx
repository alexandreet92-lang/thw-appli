'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

const SPORTS = [
  { name: 'onboarding.g.sports.cycling',      color: '#06B6D4' },
  { name: 'onboarding.g.sports.running',      color: '#10B981' },
  { name: 'onboarding.g.sports.trail',        color: '#F59E0B' },
  { name: 'onboarding.g.sports.swimming',     color: '#3B82F6' },
  { name: 'onboarding.g.sports.strength',     color: '#8B5CF6' },
  { name: 'onboarding.g.sports.ski',          color: '#06B6D4' },
  { name: 'onboarding.g.sports.yoga',         color: '#EC4899' },
  { name: 'onboarding.g.sports.hyrox',        color: '#EF4444' },
  { name: 'onboarding.g.sports.rowing',       color: '#F97316' },
  { name: 'onboarding.g.sports.mtb',          color: '#10B981' },
  { name: 'onboarding.g.sports.homeTrainer',  color: '#3B82F6' },
  { name: 'onboarding.g.sports.padel',        color: '#F59E0B' },
]

export const SPORTS_META = {
  badge: 'onboarding.g.sports.badge',
  title: 'onboarding.g.sports.title',
  description: 'onboarding.g.sports.desc',
  keyPoints: [
    'onboarding.g.sports.kp1',
    'onboarding.g.sports.kp2',
    'onboarding.g.sports.kp3',
  ],
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

export function SportsVisual() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const doubled = [...SPORTS, ...SPORTS]

  useEffect(() => {
    const id = setInterval(() => setOffset(o => o + 1), 25)
    return () => clearInterval(id)
  }, [])

  const itemWidth = 110
  const totalW = SPORTS.length * itemWidth
  const x = -(offset % totalW)

  return (
    <div style={{ overflow: 'hidden', margin: '0 -24px' }}>
      <div style={{
        display: 'flex', gap: 10,
        transform: `translateX(${x}px)`,
        padding: '10px 24px',
        width: 'max-content',
        willChange: 'transform',
      }}>
        {doubled.map((sport, i) => (
          <div key={i} style={{
            padding: '8px 18px', borderRadius: 24, flexShrink: 0,
            background: `rgba(${hexRgb(sport.color)}, 0.12)`,
            border: `1px solid rgba(${hexRgb(sport.color)}, 0.3)`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: sport.color, fontFamily: 'DM Sans, sans-serif' }}>{t(sport.name)}</span>
          </div>
        ))}
      </div>

      {/* Second row inverse */}
      <div style={{
        display: 'flex', gap: 10,
        transform: `translateX(${-x - 55}px)`,
        padding: '0 24px 10px',
        width: 'max-content',
        willChange: 'transform',
      }}>
        {doubled.map((sport, i) => (
          <div key={i} style={{
            padding: '8px 18px', borderRadius: 24, flexShrink: 0,
            background: `rgba(${hexRgb(sport.color)}, 0.07)`,
            border: `1px solid rgba(${hexRgb(sport.color)}, 0.15)`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: `rgba(${hexRgb(sport.color)}, 0.7)`, fontFamily: 'DM Sans, sans-serif' }}>{t(sport.name)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
