'use client'
// Niveau estimé — barres de niveau (remplace les jauges rondes multicolores).
// Échelle Débutant→Élite, piste neutre, repère var(--primary) animé à sa position.
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

const FB = 'var(--font-body)'

export interface LevelMetric { label: string; display: string; pct: number; qualifier: string; selected?: boolean; onSelect?: () => void }

export function LevelBars({ metrics }: { metrics: LevelMetric[] }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {metrics.map(m => (
        <div key={m.label} onClick={m.onSelect} style={{ cursor: m.onSelect ? 'pointer' : 'default', padding: 'var(--space-2)', borderRadius: 'var(--r-sm)', background: m.selected ? 'var(--bg-card2)' : 'transparent' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{m.label}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{m.display}</span>
              <span style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)' }}>{m.qualifier}</span>
            </span>
          </div>
          <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'var(--border)' }}>
            <span style={{ position: 'absolute', top: '50%', left: `${mounted ? Math.max(0, Math.min(100, m.pct)) : 0}%`, width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)', transform: 'translate(-50%,-50%)', transition: 'left 0.9s cubic-bezier(0.25,1,0.5,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
            <span style={{ fontFamily: FB, fontSize: 9, color: 'var(--text-dim)' }}>{t('performance.levelBeginner')}</span>
            <span style={{ fontFamily: FB, fontSize: 9, color: 'var(--text-dim)' }}>{t('performance.levelElite')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
