'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type SportType = 'run' | 'trail_run' | 'bike' | 'virtual_bike' | 'swim' | 'rowing' | 'hyrox' | 'gym' | 'other'

interface Activity {
  id:               string
  sport:            SportType
  title:            string
  started_at:       string
  distance_m:       number | null
  moving_time_s:    number | null
  elevation_gain_m: number | null
  avg_hr:           number | null
  max_hr:           number | null
  avg_watts:        number | null
  normalized_watts: number | null
  avg_cadence:      number | null
  calories:         number | null
  tss:              number | null
  perceived_effort: number | null
  notes:            string | null
  is_race:          boolean
  streams:          StreamData | null
  laps_data:        LapData[] | null
}

interface StreamData {
  time?:      number[]
  distance?:  number[]
  altitude?:  number[]
  heartrate?: number[]
  velocity?:  number[]
  watts?:     number[]
  cadence?:   number[]
}

interface LapData {
  lap_index:     number
  start_index:   number
  end_index:     number
  distance_m:    number
  moving_time_s: number
  avg_hr:        number | null
  avg_speed_ms:  number | null
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SPORT_LABEL: Record<SportType, string> = {
  run: 'Course', trail_run: 'Trail', bike: 'Vélo', virtual_bike: 'Home Trainer',
  swim: 'Natation', rowing: 'Aviron', hyrox: 'Hyrox', gym: 'Musculation', other: 'Autre',
}

const SPORT_EMOJI: Record<SportType, string> = {
  run: '🏃', trail_run: '⛰️', bike: '🚴', virtual_bike: '🖥️',
  swim: '🏊', rowing: '🚣', hyrox: '⚡', gym: '🏋️', other: '🎯',
}

const SPORT_COLOR: Record<SportType, string> = {
  run: '#3b82f6', trail_run: '#8b5cf6', bike: '#f59e0b', virtual_bike: '#f97316',
  swim: '#06b6d4', rowing: '#10b981', hyrox: '#ef4444', gym: '#6b7280', other: '#94a3b8',
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function fmtDur(s: number | null): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function fmtDist(m: number | null): string {
  if (!m) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}

function fmtPace(sKm: number | null): string {
  if (!sKm || sKm <= 0) return '—'
  const m = Math.floor(sKm / 60)
  const s = Math.floor(sKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoWeek(date: Date): string {
  return getWeekStart(date).toISOString().slice(0, 10)
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// ─────────────────────────────────────────────
// HOOK: useActivities
// ─────────────────────────────────────────────
function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data, error: err } = await sb
        .from('activities')
        .select([
          'id', 'sport', 'title', 'started_at',
          'distance_m', 'moving_time_s', 'elevation_gain_m',
          'avg_hr', 'max_hr', 'avg_watts', 'normalized_watts',
          'avg_cadence', 'calories', 'tss',
          'perceived_effort', 'notes', 'is_race',
          'streams', 'laps_data',
        ].join(', '))
        .order('started_at', { ascending: false })
        .limit(500)
      if (err) throw err
      setActivities((data ?? []) as unknown as Activity[])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { activities, loading, error, reload: load }
}

// ─────────────────────────────────────────────
// HOOK: useWindowWidth
// ─────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return width
}

// ─────────────────────────────────────────────
// SECTION: DONNÉES
// ─────────────────────────────────────────────
function SectionDonnees({ activities }: { activities: Activity[] }) {
  const now = new Date()

  const weeks = useMemo(() => {
    const map = new Map<string, { tss: number; dist: number; time: number; count: number }>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = isoWeek(d)
      if (!map.has(key)) map.set(key, { tss: 0, dist: 0, time: 0, count: 0 })
    }
    for (const a of activities) {
      const key = isoWeek(new Date(a.started_at))
      if (map.has(key)) {
        const w = map.get(key)!
        w.tss  += a.tss ?? 0
        w.dist += a.distance_m ?? 0
        w.time += a.moving_time_s ?? 0
        w.count += 1
      }
    }
    return Array.from(map.entries()).map(([week, v]) => ({ week, ...v }))
  }, [activities])

  const maxTss = Math.max(...weeks.map(w => w.tss), 1)

  const cutoff30 = new Date(now)
  cutoff30.setDate(cutoff30.getDate() - 30)
  const last30 = activities.filter(a => new Date(a.started_at) >= cutoff30)

  const totalDist = last30.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalTime = last30.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalTss  = last30.reduce((s, a) => s + (a.tss ?? 0), 0)
  const hrArr     = last30.filter(a => a.avg_hr).map(a => a.avg_hr!)
  const meanHr    = hrArr.length ? Math.round(avg(hrArr)) : null

  const sportMap = new Map<string, number>()
  for (const a of last30) sportMap.set(a.sport, (sportMap.get(a.sport) ?? 0) + 1)
  const sports = Array.from(sportMap.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: '30j — Séances',   value: last30.length.toString() },
          { label: '30j — Distance',  value: fmtDist(totalDist) },
          { label: '30j — Temps',     value: fmtDur(totalTime) },
          { label: '30j — TSS total', value: totalTss ? Math.round(totalTss).toString() : '—' },
          { label: '30j — FC moy.',   value: meanHr ? `${meanHr} bpm` : '—' },
        ].map(c => (
          <div key={c.label} style={{ background: '#141428', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2a3e' }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly TSS bar chart */}
      <div style={{ background: '#141428', borderRadius: 10, padding: '18px 16px', border: '1px solid #2a2a3e', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 16 }}>Charge hebdomadaire (TSS) — 12 semaines</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
          {weeks.map((w, i) => {
            const h = Math.max(2, Math.round((w.tss / maxTss) * 80))
            const isLast = i === weeks.length - 1
            const d = new Date(w.week)
            const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            return (
              <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  title={`Sem. ${label}\nTSS: ${Math.round(w.tss)}\n${fmtDist(w.dist)}\n${w.count} séance${w.count !== 1 ? 's' : ''}`}
                  style={{
                    width: '80%', height: h,
                    background: isLast ? '#3b82f6' : '#3b82f650',
                    borderRadius: '3px 3px 0 0',
                    cursor: 'default',
                    transition: 'background 0.2s',
                  }}
                />
                {(i === 0 || i % 4 === 0 || isLast) && (
                  <div style={{ fontSize: 9, color: '#555', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sport breakdown */}
      {sports.length > 0 && (
        <div style={{ background: '#141428', borderRadius: 10, padding: '18px 16px', border: '1px solid #2a2a3e' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 14 }}>Répartition des sports — 30 jours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sports.map(([sport, count]) => {
              const col = SPORT_COLOR[sport as SportType] ?? '#888'
              const pct = (count / last30.length) * 100
              return (
                <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 14, width: 22 }}>{SPORT_EMOJI[sport as SportType]}</div>
                  <div style={{ fontSize: 12, color: '#aaa', width: 90 }}>{SPORT_LABEL[sport as SportType]}</div>
                  <div style={{ flex: 1, height: 7, background: '#ffffff10', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#666', width: 32, textAlign: 'right' }}>{count}×</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: ActivityRow
// ─────────────────────────────────────────────
function ActivityRow({ activity, selected, onClick }: { activity: Activity; selected: boolean; onClick: () => void }) {
  const col = SPORT_COLOR[activity.sport] ?? '#888'
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
        background: selected ? '#1e3358' : 'transparent',
        borderLeft: `3px solid ${col}`,
        marginBottom: 2, transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = '#ffffff07' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <div style={{ fontSize: 16, width: 22, flexShrink: 0, textAlign: 'center' }}>{SPORT_EMOJI[activity.sport]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activity.title}
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>{fmtDateShort(activity.started_at)}</div>
      </div>
      <div style={{ fontSize: 11, color: '#999', textAlign: 'right', flexShrink: 0, minWidth: 52 }}>
        {activity.distance_m ? <div>{fmtDist(activity.distance_m)}</div> : null}
        {activity.moving_time_s ? <div>{fmtDur(activity.moving_time_s)}</div> : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: ActivityDetail
// ─────────────────────────────────────────────
function ActivityDetail({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const col = SPORT_COLOR[activity.sport] ?? '#3b82f6'
  const paceS = activity.moving_time_s && activity.distance_m && activity.distance_m > 0
    ? (activity.moving_time_s / activity.distance_m) * 1000
    : null

  const stats = [
    { label: 'Distance',       value: fmtDist(activity.distance_m) },
    { label: 'Durée',          value: fmtDur(activity.moving_time_s) },
    { label: 'Allure',         value: fmtPace(paceS) },
    { label: 'FC moy.',        value: activity.avg_hr       ? `${activity.avg_hr} bpm` : '—' },
    { label: 'FC max.',        value: activity.max_hr       ? `${activity.max_hr} bpm` : '—' },
    { label: 'Dénivelé',       value: activity.elevation_gain_m ? `+${Math.round(activity.elevation_gain_m)} m` : '—' },
    { label: 'Watts moy.',     value: activity.avg_watts    ? `${Math.round(activity.avg_watts)} W` : '—' },
    { label: 'NP',             value: activity.normalized_watts ? `${Math.round(activity.normalized_watts)} W` : '—' },
    { label: 'TSS',            value: activity.tss          ? Math.round(activity.tss).toString() : '—' },
    { label: 'Cadence',        value: activity.avg_cadence  ? `${Math.round(activity.avg_cadence)} rpm` : '—' },
    { label: 'Calories',       value: activity.calories     ? `${Math.round(activity.calories)} kcal` : '—' },
    { label: 'Effort perçu',   value: activity.perceived_effort ? `${activity.perceived_effort}/10` : '—' },
  ].filter(s => s.value !== '—')

  // Altitude sparkline
  const alt = activity.streams?.altitude
  const altSvg = alt && alt.length > 2 ? (() => {
    const mn = Math.min(...alt), mx = Math.max(...alt)
    const range = mx - mn || 1
    const W = 500, H = 56
    const pts = alt.map((v, i) => `${(i / (alt.length - 1)) * W},${H - ((v - mn) / range) * H}`)
    return { path: `M${pts.join('L')} L${W},${H} L0,${H}Z`, mn, mx, W, H }
  })() : null

  return (
    <div style={{ background: '#0f0f22', borderRadius: 12, border: `1px solid ${col}40`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #1e1e30' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{SPORT_EMOJI[activity.sport]}</span>
              <span style={{ fontSize: 11, background: col + '25', color: col, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                {SPORT_LABEL[activity.sport]}
              </span>
              {activity.is_race && (
                <span style={{ fontSize: 11, background: '#ef444425', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>
                  🏆 Compétition
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{activity.title}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{fmtDate(activity.started_at)}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Altitude profile */}
      {altSvg && (
        <div style={{ padding: '12px 18px 0', background: '#0f0f22' }}>
          <svg viewBox={`0 0 ${altSvg.W} ${altSvg.H}`} style={{ width: '100%', height: 56, display: 'block' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id={`ag-${activity.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6b7280" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={altSvg.path} fill={`url(#ag-${activity.id})`} stroke="#6b7280" strokeWidth="1.5" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 2, paddingBottom: 12 }}>
            <span>min {Math.round(altSvg.mn)} m</span>
            <span>max {Math.round(altSvg.mx)} m</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 14 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: '#141428', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {activity.notes && (
          <div style={{ background: '#141428', borderRadius: 8, padding: '12px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 5 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.55 }}>{activity.notes}</div>
          </div>
        )}

        {/* Laps */}
        {activity.laps_data && activity.laps_data.length > 1 && (
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
              Intervalles / Tours — {activity.laps_data.length}
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {activity.laps_data.map((lap, i) => {
                const lp = lap.moving_time_s && lap.distance_m > 0
                  ? (lap.moving_time_s / lap.distance_m) * 1000 : null
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid #ffffff06', fontSize: 12, color: '#999' }}>
                    <span style={{ color: '#555', width: 22 }}>#{i + 1}</span>
                    <span>{fmtDist(lap.distance_m)}</span>
                    <span>{fmtDur(lap.moving_time_s)}</span>
                    {lp && <span>{fmtPace(lp)}</span>}
                    {lap.avg_hr && <span>{Math.round(lap.avg_hr)} bpm</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SECTION: ANALYSE
// ─────────────────────────────────────────────
function SectionAnalyse({ activities }: { activities: Activity[] }) {
  const [selected, setSelected] = useState<Activity | null>(null)
  const [search, setSearch] = useState('')
  const [filterSport, setFilterSport] = useState<'all' | SportType>('all')
  const [filterRace, setFilterRace] = useState<'all' | 'race' | 'training'>('all')

  const allSports = useMemo(() => Array.from(new Set(activities.map(a => a.sport))), [activities])

  const filtered = useMemo(() => activities.filter(a => {
    if (filterSport !== 'all' && a.sport !== filterSport) return false
    if (filterRace === 'race' && !a.is_race) return false
    if (filterRace === 'training' && a.is_race) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [activities, filterSport, filterRace, search])

  const width = useWindowWidth()
  const showSide = width >= 900

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected && showSide ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
      {/* Left: list */}
      <div>
        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une activité…"
            style={{
              flex: '1 1 160px', background: '#141428', border: '1px solid #2a2a3e',
              borderRadius: 7, padding: '7px 12px', color: '#e0e0e0', fontSize: 12, outline: 'none',
            }}
          />
          <select
            value={filterSport}
            onChange={e => setFilterSport(e.target.value as 'all' | SportType)}
            style={{ background: '#141428', border: '1px solid #2a2a3e', borderRadius: 7, padding: '7px 10px', color: '#e0e0e0', fontSize: 12, outline: 'none' }}
          >
            <option value="all">Tous les sports</option>
            {allSports.map(s => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
          </select>
          <select
            value={filterRace}
            onChange={e => setFilterRace(e.target.value as 'all' | 'race' | 'training')}
            style={{ background: '#141428', border: '1px solid #2a2a3e', borderRadius: 7, padding: '7px 10px', color: '#e0e0e0', fontSize: 12, outline: 'none' }}
          >
            <option value="all">Tout</option>
            <option value="training">Entraînements</option>
            <option value="race">Compétitions</option>
          </select>
        </div>

        <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>
          {filtered.length} activité{filtered.length !== 1 ? 's' : ''}
        </div>

        <div style={{ maxHeight: 560, overflowY: 'auto', paddingRight: 2 }}>
          {filtered.map(a => (
            <ActivityRow
              key={a.id}
              activity={a}
              selected={selected?.id === a.id}
              onClick={() => setSelected(prev => prev?.id === a.id ? null : a)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#444', fontSize: 14 }}>Aucune activité</div>
          )}
        </div>
      </div>

      {/* Right: detail (desktop side-by-side or below on mobile) */}
      {selected && (
        <div style={showSide ? { position: 'sticky', top: 72 } : { marginTop: 16 }}>
          <ActivityDetail activity={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* Mobile: detail below list */}
      {selected && !showSide && (
        <div style={{ marginTop: 16 }}>
          <ActivityDetail activity={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SECTION: PROGRESSION
// ─────────────────────────────────────────────
function SectionProgression({ activities }: { activities: Activity[] }) {
  const bests = useMemo(() => {
    const map: Record<string, { longestDist: Activity | null; fastestPace: Activity | null; highestTss: Activity | null; longestTime: Activity | null }> = {}
    for (const a of activities) {
      if (!map[a.sport]) map[a.sport] = { longestDist: null, fastestPace: null, highestTss: null, longestTime: null }
      const r = map[a.sport]

      if (a.distance_m && a.distance_m > (r.longestDist?.distance_m ?? 0)) r.longestDist = a
      if (a.moving_time_s && a.moving_time_s > (r.longestTime?.moving_time_s ?? 0)) r.longestTime = a
      if (a.tss && a.tss > (r.highestTss?.tss ?? 0)) r.highestTss = a

      const pace = a.moving_time_s && a.distance_m && a.distance_m > 500
        ? (a.moving_time_s / a.distance_m) * 1000 : null
      const bestPace = r.fastestPace?.moving_time_s && r.fastestPace?.distance_m
        ? (r.fastestPace.moving_time_s / r.fastestPace.distance_m) * 1000 : null
      if (pace && (bestPace === null || pace < bestPace)) r.fastestPace = a
    }
    return map
  }, [activities])

  const sports = Object.keys(bests) as SportType[]

  const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90)
  const recent = activities.filter(a => new Date(a.started_at) >= cutoff90).slice(0, 6)

  if (sports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#444', fontSize: 14 }}>
        Aucune donnée de progression
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 18 }}>Records personnels — toutes périodes</div>

      {sports.map(sport => {
        const col = SPORT_COLOR[sport] ?? '#888'
        const b = bests[sport]

        const records = [
          {
            label: 'Plus longue distance',
            activity: b.longestDist,
            value: fmtDist(b.longestDist?.distance_m ?? null),
          },
          {
            label: 'Allure la plus rapide',
            activity: b.fastestPace,
            value: (() => {
              const a = b.fastestPace
              if (!a?.moving_time_s || !a?.distance_m) return '—'
              return fmtPace((a.moving_time_s / a.distance_m) * 1000)
            })(),
          },
          {
            label: 'TSS le plus élevé',
            activity: b.highestTss,
            value: b.highestTss?.tss ? Math.round(b.highestTss.tss).toString() : '—',
          },
          {
            label: 'Sortie la plus longue',
            activity: b.longestTime,
            value: fmtDur(b.longestTime?.moving_time_s ?? null),
          },
        ].filter(r => r.activity && r.value !== '—')

        if (!records.length) return null

        const count = activities.filter(a => a.sport === sport).length

        return (
          <div key={sport} style={{ background: '#141428', borderRadius: 10, border: '1px solid #2a2a3e', marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a3e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{SPORT_EMOJI[sport]}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: col }}>{SPORT_LABEL[sport]}</span>
              <span style={{ fontSize: 11, color: '#444', marginLeft: 'auto' }}>{count} séance{count !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1, background: '#1e1e30' }}>
              {records.map(r => (
                <div key={r.label} style={{ background: '#141428', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{r.value}</div>
                  {r.activity && (
                    <div style={{ fontSize: 10, color: '#444' }}>
                      {fmtDateShort(r.activity.started_at)} — {r.activity.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Recent highlights */}
      {recent.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 14 }}>Activités récentes — 90 jours</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {recent.map(a => {
              const col = SPORT_COLOR[a.sport] ?? '#888'
              return (
                <div key={a.id} style={{ background: '#141428', borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${col}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{SPORT_EMOJI[a.sport]}</span>
                    <span style={{ fontSize: 10, color: '#666' }}>{fmtDateShort(a.started_at)}</span>
                    {a.is_race && <span style={{ fontSize: 10, color: '#ef4444' }}>🏆</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
                    {a.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#777' }}>
                    {a.distance_m && <span>{fmtDist(a.distance_m)}</span>}
                    {a.moving_time_s && <span>{fmtDur(a.moving_time_s)}</span>}
                    {a.tss && <span>{Math.round(a.tss)} TSS</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// NAVIGATION CONFIG
// ─────────────────────────────────────────────
type Section = 'donnees' | 'analyse' | 'progression'

const NAV: { id: Section; label: string; icon: string; desc: string }[] = [
  { id: 'donnees',     label: 'Données',     icon: '📊', desc: 'Charge et volume' },
  { id: 'analyse',     label: 'Analyse',     icon: '🔍', desc: 'Activités détaillées' },
  { id: 'progression', label: 'Progression', icon: '📈', desc: 'Records et tendances' },
]

// ─────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────
export default function TrainingPage() {
  const { activities, loading, error, reload } = useActivities()
  const [section, setSection] = useState<Section>('donnees')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < 768

  const activeNav = NAV.find(n => n.id === section)!

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', color: '#e0e0e0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#0d0d1a', borderBottom: '1px solid #1e1e30',
        padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 18 }}>🏋️</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Training</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && <span style={{ fontSize: 11, color: '#666' }}>Chargement…</span>}
          {!loading && <span style={{ fontSize: 11, color: '#444' }}>{activities.length} activités</span>}
          <button
            onClick={reload}
            title="Rafraîchir"
            style={{ background: 'none', border: '1px solid #2a2a3e', borderRadius: 6, color: '#777', cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto' }}>

        {/* ── SIDEBAR (desktop only) ── */}
        {!isMobile && (
          <aside style={{
            width: 216, flexShrink: 0,
            padding: '22px 12px',
            borderRight: '1px solid #1e1e30',
            position: 'sticky', top: 57, height: 'calc(100vh - 57px)', overflowY: 'auto',
            alignSelf: 'flex-start',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: 1.2, paddingLeft: 10, marginBottom: 10 }}>
              MENU
            </div>
            {NAV.map(n => {
              const active = n.id === section
              return (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none',
                    borderRadius: 8, padding: '10px 10px', cursor: 'pointer', marginBottom: 2,
                    borderLeft: `3px solid ${active ? '#3b82f6' : 'transparent'}`,
                    background: active ? '#172040' : 'transparent',
                    transition: 'background 0.15s',
                  } as React.CSSProperties}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff07' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{n.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#60a5fa' : '#bbb' }}>
                        {n.label}
                      </div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{n.desc}</div>
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Sidebar stats */}
            {!loading && activities.length > 0 && (
              <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #1e1e30', paddingLeft: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: 1.2, marginBottom: 10 }}>RÉSUMÉ</div>
                {[
                  { label: 'Total', value: activities.length },
                  { label: 'Cette semaine', value: activities.filter(a => isoWeek(new Date(a.started_at)) === isoWeek(new Date())).length },
                  { label: 'Compétitions', value: activities.filter(a => a.is_race).length },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
                    <span style={{ color: '#555' }}>{s.label}</span>
                    <span style={{ color: '#aaa', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* ── CONTENT ── */}
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px 14px' : '24px 28px' }}>

          {/* Mobile dropdown nav */}
          {isMobile && (
            <div style={{ marginBottom: 18 }}>
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                style={{
                  width: '100%', background: '#141428', border: '1px solid #2a2a3e',
                  borderRadius: 10, padding: '11px 14px', cursor: 'pointer', color: '#e0e0e0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 17 }}>{activeNav.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{activeNav.label}</span>
                  <span style={{ fontSize: 11, color: '#555' }}>— {activeNav.desc}</span>
                </div>
                <span style={{
                  fontSize: 11, color: '#666',
                  transform: mobileMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                }}>▼</span>
              </button>

              {mobileMenuOpen && (
                <div style={{ background: '#141428', border: '1px solid #2a2a3e', borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
                  {NAV.map(n => {
                    const active = n.id === section
                    return (
                      <button
                        key={n.id}
                        onClick={() => { setSection(n.id); setMobileMenuOpen(false) }}
                        style={{
                          width: '100%', textAlign: 'left', background: active ? '#172040' : 'none',
                          border: 'none', padding: '12px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e1e30',
                        }}
                      >
                        <span style={{ fontSize: 17 }}>{n.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, color: active ? '#60a5fa' : '#ccc', fontWeight: active ? 600 : 400 }}>{n.label}</div>
                          <div style={{ fontSize: 11, color: '#555' }}>{n.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{ fontSize: 22 }}>{activeNav.icon}</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#fff' }}>{activeNav.label}</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#555', marginTop: 2 }}>{activeNav.desc}</p>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div style={{ background: '#2a0a0a', border: '1px solid #ef444440', borderRadius: 10, padding: '18px 20px', color: '#ef4444' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Erreur de chargement</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{error}</div>
              <button onClick={reload} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
                Réessayer
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <div>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: '#141428', borderRadius: 10, height: 72, marginBottom: 10 }} />
              ))}
            </div>
          )}

          {/* Sections */}
          {!loading && !error && section === 'donnees'     && <SectionDonnees activities={activities} />}
          {!loading && !error && section === 'analyse'     && <SectionAnalyse activities={activities} />}
          {!loading && !error && section === 'progression' && <SectionProgression activities={activities} />}
        </main>
      </div>

      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.65; } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 3px; }
        select option { background: #141428; color: #e0e0e0; }
        input::placeholder { color: #444; }
        button:focus { outline: none; }
      `}</style>
    </div>
  )
}
