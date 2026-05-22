'use client'
import { useState } from 'react'

interface MealData { calories: number; protein_g: number; fat_g: number }

export function computeMealScore({ calories, protein_g, fat_g }: MealData): 'good' | 'medium' | 'poor' {
  if (!calories) return 'medium'
  const p = (protein_g * 4) / calories
  const f = (fat_g     * 9) / calories
  if (p >= 0.20 && f <= 0.45) return 'good'
  if (p <  0.10 || f >  0.60) return 'poor'
  return 'medium'
}

const CFG = {
  good:   { color: '#10B981', tip: 'Bon equilibre proteines/lipides' },
  medium: { color: '#F59E0B', tip: 'Equilibre moyen'                 },
  poor:   { color: '#EF4444', tip: 'Pauvre en proteines'             },
}

interface Props { calories: number; prot: number; fat: number }

export default function MealScoreDot({ calories, prot, fat }: Props) {
  const [show, setShow] = useState(false)
  const { color, tip } = CFG[computeMealScore({ calories, protein_g: prot, fat_g: fat })]
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, cursor: 'help' }}
        onMouseEnter={() => setShow(true)}  onMouseLeave={() => setShow(false)}
        onTouchStart={() => setShow(true)}  onTouchEnd={() => setTimeout(() => setShow(false), 1200)} />
      {show && (
        <div style={{ position: 'absolute', top: 12, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: 'var(--text)', whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {tip}
        </div>
      )}
    </div>
  )
}
