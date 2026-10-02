'use client'
// Niveau estimé — barres de niveau (remplace les jauges rondes multicolores).
// Échelle Débutant→Élite, piste neutre, repère var(--primary) animé à sa position.
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { MLevelTrack, NUM } from '@/app/injuries/components/mobileUi'

const FB = 'var(--font-body)'

export interface LevelMetric { label: string; display: string; pct: number; qualifier: string; selected?: boolean; onSelect?: () => void }

export function LevelBars({ metrics, mobile }: { metrics: LevelMetric[]; mobile?: boolean }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])
  // Mobile : ligne tappable (≥ 44 px) — libellé · valeur + qualificatif, piste + pouce blanc.
  if (mobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {metrics.map(m => (
          <div key={m.label} role={m.onSelect ? 'button' : undefined} tabIndex={m.onSelect ? 0 : undefined} onClick={m.onSelect}
            onKeyDown={e => { if (m.onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); m.onSelect() } }}
            style={{ cursor: m.onSelect ? 'pointer' : 'default', padding: '10px 12px', margin: '0 -12px', borderRadius: 'var(--r-md)', background: m.selected ? 'var(--surface-chip)' : 'transparent', fontFamily: FB }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{m.label}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ ...NUM, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{m.display}</span>
                {m.qualifier && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{m.qualifier}</span>}
              </span>
            </div>
            <MLevelTrack pct={m.pct} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('performance.levelBeginner')}</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('performance.levelElite')}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }
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
          <div style={{ position: 'relative', height: 6, borderRadius: 'var(--r-pill)', background: 'var(--border)' }}>
            <span style={{ position: 'absolute', top: '50%', left: `${mounted ? Math.max(0, Math.min(100, m.pct)) : 0}%`, width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)', transform: 'translate(-50%,-50%)', transition: 'left 0.9s cubic-bezier(0.25,1,0.5,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
            <span style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.levelBeginner')}</span>
            <span style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.levelElite')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
