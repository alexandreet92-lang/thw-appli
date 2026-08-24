'use client'
// Vue Records/Triathlon (DS). Boutons format S/M/70.3/Ironman + All. La jauge
// principale = la COURSE dans son entièreté (temps final). On ne montre PAS les
// jauges par sport directement : elles apparaissent dans la surpage ouverte au
// clic sur une course (décomposition Natation/Vélo/Course + T1/T2 + transitions
// + activité liée éventuelle).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n, currentLocale } from '@/lib/i18n'
import { Segmented } from '@/components/ui/Segmented'
import { TriathlonRadar, type TriFormat } from './RadarChart'
import { toSec, hmsFull } from './triActivities'

const SWIM = '#06b6d4', BIKE = '#3b82f6', RUN = '#f97316' // design-allow-color — teintes sport
const TRI = '#8B5CF6' // design-allow-color — teinte sport triathlon sanctionnée
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de surpage (scrim)
const DANGER = '#EF4444' // design-allow-color — rouge action destructive (supprimer)
const TRANS = 'var(--text-dim)'

// Données réelles d'une activité liée (mêmes champs que le running).
export interface TriLinkedAct {
  distance_m: number | null; elevation_gain_m: number | null
  avg_hr: number | null; max_hr: number | null
  avg_temp_c: number | null; moving_time_s: number | null
}

export interface TriRec {
  id: string
  distance_label: string
  performance: string
  split_swim?: string | null; split_t1?: string | null; split_bike?: string | null
  split_t2?: string | null; split_run?: string | null
  achieved_at: string
  activity_id?: string | null
}

// S / M / 70.3 / Ironman (demande explicite). radar = clé du RadarChart.
const DISTS: { id: string; label: string; radar: TriFormat }[] = [
  { id: 'S', label: 'S', radar: 'M' },
  { id: 'M', label: 'M', radar: 'M' },
  { id: '70.3', label: '70.3', radar: '703' },
  { id: 'Ironman', label: 'Ironman', radar: 'full' },
]

const SEGS: { key: keyof TriRec; label: string; color: string }[] = [
  { key: 'split_swim', label: 'Natation', color: SWIM },
  { key: 'split_t1', label: 'T1', color: TRANS },
  { key: 'split_bike', label: 'Vélo', color: BIKE },
  { key: 'split_t2', label: 'T2', color: TRANS },
  { key: 'split_run', label: 'Course', color: RUN },
]

// ── Surpage détail d'une course triathlon ─────────────────────────
function TriRaceOverlay({ rec, act, onEdit, onDelete, onClose }: {
  rec: TriRec; act?: TriLinkedAct
  onEdit: () => void; onDelete: () => void; onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = setTimeout(() => setMounted(true), 20); return () => clearTimeout(id) }, [])
  const segLabel = (key: keyof TriRec) => key === 'split_swim' ? t('performance.sportSwimming') : key === 'split_bike' ? t('performance.sportBike') : key === 'split_run' ? t('performance.sportRun') : key === 'split_t1' ? 'T1' : 'T2'
  const segSecs = SEGS.map(s => ({ ...s, sec: toSec((rec[s.key] as string) ?? '') }))
  const total = segSecs.reduce((a, s) => a + s.sec, 0) || toSec(rec.performance)
  const transSec = segSecs.filter(s => s.color === TRANS).reduce((a, s) => a + s.sec, 0)
  const pct = (s: number) => (total > 0 ? (s / total) * 100 : 0)
  const sportBars = [
    { label: t('performance.swimAbbr'), color: SWIM, sec: segSecs[0].sec },
    { label: t('performance.sportBike'), color: BIKE, sec: segSecs[2].sec },
    { label: t('performance.sportRun'), color: RUN, sec: segSecs[4].sec },
    { label: 'T1+T2', color: TRANS, sec: transSec },
  ]

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 3300, background: SCRIM, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100dvh - 56px)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{rec.distance_label} · {rec.performance}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '3px 0 0' }}>{new Date(rec.achieved_at).toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          {/* Décomposition : Total empilé + jauges par sport */}
          <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 14px' }}>{t('performance.breakdown')}</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 156 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 40, height: 120, borderRadius: 'var(--r-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', background: 'var(--bg-card2)' }}>
                {segSecs.map(s => (
                  <div key={s.key} title={`${segLabel(s.key)} ${hmsFull(s.sec)}`} style={{ width: '100%', height: mounted ? `${pct(s.sec)}%` : '0%', background: s.color, opacity: s.color === TRANS ? 0.35 : 0.6, transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                ))}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{t('performance.total')}</span>
              <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{hmsFull(total)}</span>
            </div>
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

          {/* Détail chiffré des segments + transitions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginTop: 18 }}>
            {segSecs.filter(s => s.sec > 0).map(s => (
              <div key={s.key}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{segLabel(s.key)}</p>
                <p className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{hmsFull(s.sec)}</p>
              </div>
            ))}
          </div>

          {/* Activité liée */}
          {act && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{t('perf2.linkedActivity')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
                {act.elevation_gain_m != null && <span className="tnum" style={{ fontSize: 11, color: 'var(--text-mid)' }}>D+ {Math.round(act.elevation_gain_m)} m</span>}
                {act.avg_hr != null && <span className="tnum" style={{ fontSize: 11, color: 'var(--text-mid)' }}>FC {act.avg_hr}{act.max_hr ? ` / ${act.max_hr}` : ''} bpm</span>}
                {act.avg_temp_c != null && <span className="tnum" style={{ fontSize: 11, color: 'var(--text-mid)' }}>{Math.round(act.avg_temp_c)}°C</span>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 20px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onEdit} style={{ flex: 1, padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('perf2.edit')}</button>
          <button onClick={() => { if (window.confirm(t('perf2.confirmDelete'))) onDelete() }} style={{ flex: 1, padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'transparent', color: DANGER, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('perf2.delete')}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function TriathlonRecords({ records, profile, actMap, onEdit, onDelete }: {
  records: TriRec[]
  profile: { ftp: number; weight: number }
  actMap?: Record<string, TriLinkedAct>
  onEdit: (fmt: string, rec: TriRec | null) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()
  const [sel, setSel] = useState<string>('70.3')
  const [showAll, setShowAll] = useState(false)
  const [detail, setDetail] = useState<TriRec | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = setTimeout(() => setMounted(true), 30); return () => clearTimeout(id) }, [])

  const selDef = DISTS.find(d => d.id === sel) ?? DISTS[2]
  const races = (showAll ? records : records.filter(r => r.distance_label === sel))
    .slice().sort((a, b) => a.achieved_at.localeCompare(b.achieved_at))
  const secs = races.map(r => toSec(r.performance)).filter(s => s > 0)
  const topSec = (secs.length ? Math.max(...secs) : 3600) * 1.12
  const bestSec = secs.length ? Math.min(...secs) : 0

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' })
  const distTabBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12,
    fontWeight: active ? 600 : 500, border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary-dim)' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-dim)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Boutons format S/M/70.3/Ironman + All */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {DISTS.map(d => (
          <button key={d.id} onClick={() => { setSel(d.id); setShowAll(false) }} style={distTabBtn(!showAll && sel === d.id)}>{d.label}</button>
        ))}
        <button onClick={() => setShowAll(v => !v)} style={{ ...distTabBtn(showAll), marginLeft: 'auto', fontWeight: 600 }}>All</button>
      </div>

      {/* Profil (radar piloté par la distance) — inchangé */}
      {!showAll && <TriathlonRadar profile={profile} format={selDef.radar} />}

      {/* Jauge principale = la course entière. Clic → surpage décomposition. */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {showAll ? t('performance.recordsByDistance') : selDef.label}
          </h2>
          <button onClick={() => onEdit(showAll ? 'M' : sel, null)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            + {t('perf2.addRace') /* Ajouter une course */}
          </button>
        </div>

        {races.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t('performance.noRecordDistance')}</p>
        ) : (
          <div className="rec-gauge-strip" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {races.map(r => {
              const sec = toSec(r.performance)
              const hPct = Math.max(8, (sec / topSec) * 100)
              const isBest = sec === bestSec
              return (
                <button key={r.id} onClick={() => setDetail(r)}
                  style={{ flex: '0 0 72px', width: 72, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0 }}>
                  <span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{r.performance}</span>
                  <div style={{ height: 104, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: 16, height: mounted ? `${hPct}%` : '0%', background: TRI, borderRadius: 8,
                      boxShadow: isBest ? `0 0 0 2px var(--bg-card), 0 0 0 3px ${TRI}` : 'none',
                      transition: 'height 0.9s cubic-bezier(0.25,1,0.5,1)' }} />
                  </div>
                  {showAll && <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-dim)', fontWeight: 600 }}>{r.distance_label}</span>}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 9.5, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDay(r.achieved_at)}</span>
                  {isBest && <span style={{ fontSize: 8, fontWeight: 700, color: TRI }}>★ PR</span>}
                </button>
              )
            })}
          </div>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)', margin: '10px 0 0' }}>{t('perf2.tapRaceForBreakdown') /* Touchez une course pour voir la décomposition */}</p>
      </div>

      {detail && (
        <TriRaceOverlay rec={detail} act={detail.activity_id ? actMap?.[detail.activity_id] : undefined}
          onEdit={() => { const d = detail; setDetail(null); onEdit(d.distance_label, d) }}
          onDelete={() => { onDelete(detail.id); setDetail(null) }}
          onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
