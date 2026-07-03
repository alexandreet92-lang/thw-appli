'use client'
// Barre de macro : remplissage COLORÉ (token --macro-*), chiffres NEUTRES.
// Animation 0 → valeur (~0,9 s) au montage et à chaque changement ; prefers-reduced-motion
// respecté (pas d'animation). CSS brut, aucune lib.
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)'

export function MacroBar({ label, consumed, target, color }: {
  label: string
  consumed: number
  target: number
  color: string
}) {
  const { t } = useI18n()
  const ratio = target > 0 ? consumed / target : 0
  const pct = Math.min(ratio, 1)
  const over = target > 0 && consumed > target * 1.02   // dépassement (>2 %)
  const barColor = over ? 'var(--charge-hard)' : color
  const [w, setW] = useState(0)
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce.current) { setW(pct); return }
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: over ? 'var(--charge-hard)' : 'var(--text-mid)', fontWeight: over ? 600 : 400, flexShrink: 0 }}>
          {Math.round(consumed)} / {Math.round(target)} g{over ? ` · ${t('nutrition.macro.exceeded')}` : ''}
        </span>
      </div>
      {/* Piste + repère d'objectif (100 %) à droite ; remplissage coloré (rouge si dépassé) */}
      <div style={{ position: 'relative', width: '100%', height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{ width: `${w * 100}%`, height: '100%', background: barColor, borderRadius: 999, transition: reduce.current ? 'none' : 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  )
}