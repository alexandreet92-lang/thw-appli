'use client'
// Vue Records/Triathlon (DS). Sélecteur de distance pilotant profil + records.
// Décomposition (barre Total empilée + barres par sport) + records par distance.
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { Segmented } from '@/components/ui/Segmented'
import { TriathlonRadar, type TriFormat } from './RadarChart'
import { toSec, hmsFull } from './triActivities'

const SWIM = '#06b6d4', BIKE = '#3b82f6', RUN = '#f97316' // design-allow-color — teintes sport
const TRANS = 'var(--text-dim)'

export interface TriRec {
  performance: string
  split_swim?: string | null; split_t1?: string | null; split_bike?: string | null
  split_t2?: string | null; split_run?: string | null
  achieved_at?: string
}

const DISTS: { id: string; label: string; radar: TriFormat }[] = [
  { id: 'M', label: 'M', radar: 'M' },
  { id: '70.3', label: '70.3', radar: '703' },
  { id: 'Ironman', label: 'Full', radar: 'full' },
]

const SEGS: { key: keyof TriRec; label: string; color: string }[] = [
  { key: 'split_swim', label: 'Natation', color: SWIM },
  { key: 'split_t1', label: 'T1', color: TRANS },
  { key: 'split_bike', label: 'Vélo', color: BIKE },
  { key: 'split_t2', label: 'T2', color: TRANS },
  { key: 'split_run', label: 'Course', color: RUN },
]

export function TriathlonRecords({ getBest, getPrev, profile, onEdit }: {
  getBest: (fmt: string) => TriRec | null
  getPrev: (fmt: string) => TriRec | null
  profile: { ftp: number; weight: number }
  onEdit: (fmt: string) => void
}) {
  const { t } = useI18n()
  const [sel, setSel] = useState('70.3')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = setTimeout(() => setMounted(true), 30); return () => clearTimeout(id) }, [])
  const segLabel = (key: keyof TriRec) => key === 'split_swim' ? t('performance.sportSwimming') : key === 'split_bike' ? t('performance.sportBike') : key === 'split_run' ? t('performance.sportRun') : key === 'split_t1' ? 'T1' : 'T2'

  const selDef = DISTS.find(d => d.id === sel)!
  const best = getBest(sel)
  const segSecs = SEGS.map(s => ({ ...s, sec: best ? toSec((best[s.key] as string) ?? '') : 0 }))
  const total = segSecs.reduce((a, s) => a + s.sec, 0)
  const transSec = segSecs.filter(s => s.color === TRANS).reduce((a, s) => a + s.sec, 0)
  // Barres « par sport » : Natation, Vélo, Course, T1+T2 — normalisées au total.
  const sportBars = [
    { label: t('performance.swimAbbr'), color: SWIM, sec: segSecs[0].sec },
    { label: t('performance.sportBike'), color: BIKE, sec: segSecs[2].sec },
    { label: t('performance.sportRun'), color: RUN, sec: segSecs[4].sec },
    { label: 'T1+T2', color: TRANS, sec: transSec },
  ]
  const pct = (s: number) => (total > 0 ? (s / total) * 100 : 0)

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Sélecteur de distance */}
      <Segmented ariaLabel="Distance" value={sel} onChange={setSel}
        options={DISTS.map(d => ({ id: d.id, label: d.label }))} />

      {/* Profil (radar piloté par la distance) */}
      <TriathlonRadar profile={profile} format={selDef.radar} />

      {/* Décomposition */}
      <div style={card}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>{t('performance.breakdown')} — {selDef.label}</h2>
        {total === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t('performance.noRecordDistance')}</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 156 }}>
            {/* Barre Total empilée */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 40, height: 120, borderRadius: 'var(--r-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', background: 'var(--bg-card2)' }}>
                {segSecs.map(s => (
                  <div key={s.key} title={`${segLabel(s.key)} ${hmsFull(s.sec)}`} style={{ width: '100%', height: mounted ? `${pct(s.sec)}%` : '0%', background: s.color, opacity: s.color === TRANS ? 0.35 : 0.6, transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                ))}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.total')}</span>
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{hmsFull(total)}</span>
            </div>
            {/* Barres par sport */}
            {sportBars.map(b => (
              <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 26, height: 120, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: mounted ? `${pct(b.sec)}%` : '0%', background: b.color, opacity: b.color === TRANS ? 0.35 : 0.55, transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{b.label}</span>
                <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-mid)' }}>{b.sec > 0 ? hmsFull(b.sec) : '—'}</span>
              </div>
            ))}
          </div>
        )}
        {/* Légende */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 14 }}>
          {[{ l: t('performance.sportSwimming'), c: SWIM }, { l: t('performance.sportBike'), c: BIKE }, { l: t('performance.sportRun'), c: RUN }, { l: t('performance.transitions'), c: TRANS }].map(x => (
            <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: x.c, opacity: 0.8 }} />{x.l}
            </span>
          ))}
        </div>
      </div>

      {/* Records par distance */}
      <div style={card}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>{t('performance.recordsByDistance')}</h2>
        {DISTS.map(d => {
          const b = getBest(d.id), prev = getPrev(d.id)
          const splits = SEGS.map(s => ({ label: segLabel(s.key), v: (b?.[s.key] as string) ?? null })).filter(s => s.v)
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', borderRadius: 'var(--r-sm)', marginBottom: 4, background: d.id === sel ? 'var(--bg-card2)' : 'transparent' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: splits.length ? 5 : 0 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>{d.label}</span>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: b ? 'var(--text)' : 'var(--text-dim)', marginLeft: 'auto' }}>{b?.performance ?? '—'}</span>
                </div>
                {splits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                    {splits.map(s => (
                      <span key={s.label} className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{s.label} {s.v}</span>
                    ))}
                  </div>
                )}
                {prev && <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.previous')} : {prev.performance}{prev.achieved_at ? ` (${prev.achieved_at.slice(0, 4)})` : ''}</span>}
              </div>
              <button onClick={() => onEdit(d.id)} style={{ flexShrink: 0, padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t('performance.edit')}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
