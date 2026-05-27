'use client'
import { useState, useEffect } from 'react'

const SPORTS = [
  { name: 'Vélo',        color: '#06B6D4' },
  { name: 'Running',     color: '#10B981' },
  { name: 'Trail',       color: '#F59E0B' },
  { name: 'Natation',    color: '#3B82F6' },
  { name: 'Muscu',       color: '#8B5CF6' },
  { name: 'Ski',         color: '#06B6D4' },
  { name: 'Yoga',        color: '#EC4899' },
  { name: 'Hyrox',       color: '#EF4444' },
  { name: 'Aviron',      color: '#F97316' },
  { name: 'VTT',         color: '#10B981' },
  { name: 'Home Trainer',color: '#3B82F6' },
  { name: 'Padel',       color: '#F59E0B' },
]

export const SPORTS_META = {
  badge: 'Sports',
  title: '15 sports, une seule app',
  description: "GPS haute précision, données temps réel, création de parcours et segments. Chaque sport a ses données spécifiques et ses réglages dédiés.",
  keyPoints: [
    'GPS précis avec Wake Lock (écran allumé)',
    'Création de parcours avec snapping sur les routes',
    'Segments avec classements entre athlètes',
  ],
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

export function SportsVisual() {
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
            <span style={{ fontSize: 13, fontWeight: 600, color: sport.color, fontFamily: 'DM Sans, sans-serif' }}>{sport.name}</span>
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
            <span style={{ fontSize: 12, fontWeight: 500, color: `rgba(${hexRgb(sport.color)}, 0.7)`, fontFamily: 'DM Sans, sans-serif' }}>{sport.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
