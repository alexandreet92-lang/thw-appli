'use client'
// ══════════════════════════════════════════════════════════════════
// ActivityShowcase — bloc « activités » d'un profil (façon Strava) :
// jauge verticale du volume horaire par sport (survol → h + %), heatmap de
// régularité (~1 an), série de semaines actives, et 7 dernières activités.
// Reçoit les données déjà agrégées + filtrées par la RPC (confidentialité).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import SlideSheet from '@/components/ui/SlideSheet'
import { staticRouteMapUrl } from '@/lib/staticMap'
import type { ActivityShowcaseData, RecentActivity, RecordItem } from '@/lib/profile/activityShowcase'
import { hoursByFamily, activeWeekStreak, sportMeta, bestRecord, recordsForSport, fmtHoursSec, polylineToSvgPath, decodePolyline } from '@/lib/profile/activityShowcase'

// Couleurs (hex) du tracé par famille de sport, pour la carte Mapbox.
const SPORT_HEX: Record<string, string> = { running: '22c55e', cycling: '3b82f6', swim: '0ea5e9', rowing: '8b5cf6', gym: 'f97316', hyrox: 'ef4444', other: '9ca3af' }
function routePoints(polyline: string | null): { lat: number; lng: number }[] {
  return decodePolyline(polyline).map(([lat, lng]) => ({ lat, lng }))
}

// Créneaux de records par sport (selon la spec).
const RUN_SLOTS: { label: string; aliases: string[] }[] = [
  { label: '1500 m', aliases: ['1500m', '1500'] }, { label: '5 km', aliases: ['5km', '5000m'] },
  { label: '10 km', aliases: ['10km', '10000m'] }, { label: 'Semi', aliases: ['semi', 'semimarathon', 'halfmarathon', '21km', '21097m', '21.1km'] },
  { label: 'Marathon', aliases: ['marathon', '42km', '42195m', '42.195km'] }, { label: '100 km', aliases: ['100km', '100000m'] },
]
const BIKE_SLOTS: { label: string; aliases: string[] }[] = [
  { label: '5 min', aliases: ['5min', '5'] }, { label: '10 min', aliases: ['10min', '10'] },
  { label: '20 min', aliases: ['20min', '20'] }, { label: '1 h', aliases: ['1h', '60min'] },
]
const TRI_SLOTS: { label: string; aliases: string[] }[] = [
  { label: 'S', aliases: ['s', 'sprint'] }, { label: 'M', aliases: ['m', 'olympique', 'olympic'] },
  { label: '70.3', aliases: ['703', 'half', 'halfironman', '70.3'] }, { label: 'Ironman', aliases: ['ironman', 'full'] },
]

const DAY_LABELS = ['L', '', 'M', '', 'J', '', 'D']
const MONTH = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

const fmtDur = (s: number | null) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
const fmtDist = (m: number | null) => m && m > 0 ? `${Math.round(m / 100) / 10} km` : null
const fmtPace = (s: number | null) => { if (!s || s <= 0) return null; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km` }
const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTH[d.getMonth()]}` }

export default function ActivityShowcase({ data, isOwner }: { data: ActivityShowcaseData; isOwner: boolean }) {
  const [detail, setDetail] = useState<RecentActivity | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  if (!data.can_view) {
    return (
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
        {isOwner
          ? 'Tes activités sont masquées sur ton profil (réglable ci-dessous).'
          : data.visibility === 'followers'
            ? 'Activités réservées aux abonnés. Abonne-toi pour les voir.'
            : 'Cet athlète a rendu ses activités privées.'}
      </p>
    )
  }
  const families = hoursByFamily(data.hours_by_sport)
  const totalSec = families.reduce((n, f) => n + f.seconds, 0)
  const streak = activeWeekStreak(data.weekly)
  const totalHours = Math.round(totalSec / 3600)

  if (totalSec === 0 && data.recent.length === 0) {
    return <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>Aucune activité pour l’instant.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Volume par sport (jauge verticale) + régularité */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <VolumeGauge families={families} totalSec={totalSec} totalHours={totalHours} />
        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          <MiniStat n={streak} unit={streak > 1 ? 'semaines' : 'semaine'} label="Série active" accent />
          <MiniStat n={data.ytd_count} unit="activités" label={`depuis janvier`} />
          <MiniStat n={totalHours} unit="h" label="Volume cette année" />
        </div>
      </div>

      {/* Meilleures performances par sport */}
      <RecordsSection records={data.records} />

      {/* Graphique : volume par semaine */}
      {data.weekly.some(w => w.count > 0) && (
        <div>
          <Label>Volume par semaine</Label>
          <WeeklyChart weekly={data.weekly} />
        </div>
      )}

      {/* Heatmap de régularité */}
      <div>
        <Label>Régularité</Label>
        <Heatmap daily={data.daily} />
      </div>

      {/* Dernières activités */}
      {data.recent.length > 0 && (
        <div>
          <Label>Dernières activités</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recent.slice(0, 7).map(a => <ActivityRow key={a.id} a={a} onOpen={() => setDetail(a)} />)}
          </div>
          {data.recent.length > 7 && (
            <button onClick={() => setAllOpen(true)}
              style={{ marginTop: 12, width: '100%', padding: '11px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              Voir toutes les activités →
            </button>
          )}
        </div>
      )}

      {/* Toutes les activités — surpage coulissante */}
      <SlideSheet open={allOpen} onClose={() => setAllOpen(false)} title="Toutes les activités">
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.recent.map(a => <ActivityRow key={a.id} a={a} onOpen={() => setDetail(a)} />)}
        </div>
      </SlideSheet>

      {/* Détail de l'activité — surpage coulissante droite→gauche */}
      <SlideSheet open={!!detail} onClose={() => setDetail(null)} title="Activité">
        {detail && <ActivityDetailView a={detail} />}
      </SlideSheet>
    </div>
  )
}

// ── Détail d'une activité (dans la surpage) ──
function ActivityDetailView({ a }: { a: RecentActivity }) {
  const fam = sportFamilyLocal(a.sport)
  const meta = sportMeta(fam)
  const pts = routePoints(a.polyline)
  const mapUrl = staticRouteMapUrl(pts, { width: 640, height: 360, color: SPORT_HEX[fam] ?? '9ca3af' })
  const path = polylineToSvgPath(a.polyline, 640, 320)
  const stats: { label: string; value: string }[] = []
  const dist = fmtDist(a.distance_m); if (dist) stats.push({ label: 'Distance', value: dist })
  if (a.seconds) stats.push({ label: 'Durée', value: fmtDur(a.seconds) })
  const pace = fmtPace(a.avg_pace_s_km); if (pace) stats.push({ label: 'Allure', value: pace })
  if (a.distance_m && a.seconds && a.seconds > 0 && (fam === 'cycling' || !pace)) stats.push({ label: 'Vitesse moy.', value: `${Math.round(a.distance_m / a.seconds * 3.6 * 10) / 10} km/h` })
  if (a.avg_watts) stats.push({ label: 'Puissance moy.', value: `${Math.round(a.avg_watts)} W` })
  if (a.elevation_gain_m) stats.push({ label: 'Dénivelé +', value: `${Math.round(a.elevation_gain_m)} m` })
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: meta.color }} />
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-mid)' }}>{meta.label}</span>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{a.title}</h2>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>{new Date(a.started_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      {/* Carte réelle (Mapbox) ou tracé SVG en repli */}
      {mapUrl ? (
        <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 18, boxShadow: '0 4px 18px rgba(0,0,0,0.12)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mapUrl} alt="Tracé de l'activité" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      ) : path ? (
        <div style={{ background: meta.color, borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 18 }}>
          <svg viewBox="0 0 640 320" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <path d={path} fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }} />
          </svg>
        </div>
      ) : null}
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{s.label}</div>
            <div className="tnum" style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Jauge verticale : volume horaire empilé par sport ──
function VolumeGauge({ families, totalSec, totalHours }: { families: { key: string; hours: number; seconds: number }[]; totalSec: number; totalHours: number }) {
  const [hover, setHover] = useState<string | null>(null)
  if (totalSec === 0) return null
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
      {/* Barre */}
      <div style={{ position: 'relative', width: 46, height: 210, display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card2)', flexShrink: 0 }}>
        {families.map(f => {
          const pct = f.seconds / totalSec * 100
          const on = hover === f.key
          return (
            <div key={f.key} onMouseEnter={() => setHover(f.key)} onMouseLeave={() => setHover(h => h === f.key ? null : h)}
              style={{ height: `${pct}%`, background: sportMeta(f.key).color, opacity: hover && !on ? 0.55 : 1, transition: 'opacity 150ms', cursor: 'default', position: 'relative' }} />
          )
        })}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 }}>
          <span className="tnum" style={{ fontSize: 18, fontWeight: 800, color: 'var(--on-primary)', textShadow: '0 1px 3px rgba(0,0,0,0.35)', fontVariantNumeric: 'tabular-nums' }}>{totalHours}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-primary)', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>heures</span>
        </div>
      </div>
      {/* Légende */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, justifyContent: 'center' }}>
        {families.map(f => {
          const pct = Math.round(f.seconds / totalSec * 100)
          const on = hover === f.key
          return (
            <div key={f.key} onMouseEnter={() => setHover(f.key)} onMouseLeave={() => setHover(h => h === f.key ? null : h)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hover && !on ? 0.5 : 1, transition: 'opacity 150ms' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: sportMeta(f.key).color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', minWidth: 74 }}>{sportMeta(f.key).label}</span>
              <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: on ? 'var(--text)' : 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{fmtHoursSec(f.seconds)}</span>
              <span className="tnum" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Heatmap type calendrier (semaines × jours) ──
function Heatmap({ daily }: { daily: { d: string; count: number; seconds: number }[] }) {
  const byDay = new Map(daily.map(x => [x.d, x]))
  const maxSec = Math.max(1, ...daily.map(x => x.seconds))
  // 53 semaines finissant à la semaine courante (lundi).
  const today = new Date()
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0)
  const weeks: { key: string; sec: number; cnt: number }[][] = []
  const monthTicks: { col: number; label: string }[] = []
  let lastMonth = -1
  for (let w = 52; w >= 0; w--) {
    const col: { key: string; sec: number; cnt: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday); date.setDate(monday.getDate() - w * 7 + d)
      const key = date.toISOString().slice(0, 10)
      const rec = byDay.get(key)
      col.push({ key, sec: rec?.seconds ?? 0, cnt: rec?.count ?? 0 })
      if (d === 0) { const m = date.getMonth(); if (m !== lastMonth) { monthTicks.push({ col: 52 - w, label: MONTH[m] }); lastMonth = m } }
    }
    weeks.push(col)
  }
  const bucket = (sec: number) => sec <= 0 ? 0 : sec < maxSec * 0.25 ? 0.35 : sec < maxSec * 0.5 ? 0.55 : sec < maxSec * 0.8 ? 0.78 : 1
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 3, marginLeft: 16 }}>
          {weeks.map((_, i) => {
            const tick = monthTicks.find(t => t.col === i)
            return <div key={i} style={{ width: 11, fontSize: 8.5, color: 'var(--text-dim)' }}>{tick ? tick.label : ''}</div>
          })}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'space-between' }}>
            {DAY_LABELS.map((d, i) => <span key={i} style={{ fontSize: 8.5, color: 'var(--text-dim)', height: 11, lineHeight: '11px' }}>{d}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {weeks.map((col, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {col.map(cell => {
                  const b = bucket(cell.sec)
                  return <div key={cell.key} title={cell.cnt > 0 ? `${cell.key} · ${cell.cnt} activité${cell.cnt > 1 ? 's' : ''} · ${fmtDur(cell.sec)}` : cell.key}
                    style={{ width: 11, height: 11, borderRadius: 3, background: b === 0 ? 'var(--bg-card2)' : 'var(--primary)', opacity: b === 0 ? 1 : b }} />
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityRow({ a, onOpen }: { a: RecentActivity; onOpen: () => void }) {
  const fam = sportFamilyLocal(a.sport)
  const meta = sportMeta(fam)
  const bits = [fmtDist(a.distance_m), fmtDur(a.seconds), fmtPace(a.avg_pace_s_km) ?? (a.avg_watts ? `${Math.round(a.avg_watts)} W` : null), a.elevation_gain_m ? `${Math.round(a.elevation_gain_m)} m D+` : null].filter(Boolean)
  const pts = routePoints(a.polyline)
  const mapUrl = staticRouteMapUrl(pts, { width: 128, height: 88, color: SPORT_HEX[fam] ?? '9ca3af' })
  const path = polylineToSvgPath(a.polyline, 72, 46)
  return (
    <button onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)' }}>
      {/* Vignette : vraie carte Mapbox si dispo, sinon tracé SVG, sinon pastille */}
      <div style={{ width: 64, height: 44, borderRadius: 8, background: path ? meta.color : 'var(--bg-card)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {mapUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={mapUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : path
            ? <svg viewBox="0 0 72 46" style={{ width: '100%', height: '100%' }}><path d={path} fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>
            : <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
        <div className="tnum" style={{ fontSize: 11.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(a.started_at)} · {bits.join(' · ')}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.03em', flexShrink: 0 }}>{meta.label}</span>
    </button>
  )
}
function sportFamilyLocal(sportType: string): string {
  const F: Record<string, string> = { run: 'running', trail_run: 'running', bike: 'cycling', virtual_bike: 'cycling', swim: 'swim', open_water_swim: 'swim', rowing: 'rowing', gym: 'gym', crossfit: 'gym', hiit: 'gym', yoga: 'gym', ski: 'other', hyrox: 'hyrox', other: 'other' }
  return F[sportType] ?? 'other'
}

// ── Records par sport ──
function RecordsSection({ records }: { records: RecordItem[] }) {
  const has = (sport: string) => records.some(r => r.sport === sport)
  const runBox = has('run')
  const bikeBox = has('bike')
  const triBox = has('triathlon')
  const hyroxRecs = recordsForSport(records, 'hyrox')
  const swimRecs = recordsForSport(records, 'swim')
  if (!runBox && !bikeBox && !triBox && !hyroxRecs.length && !swimRecs.length) return null
  return (
    <div>
      <Label>Meilleures performances</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {runBox && <RecordCard sportKey="running" title="Course" rows={RUN_SLOTS.map(s => ({ label: s.label, value: bestRecord(records, 'run', s.aliases)?.value ?? null }))} />}
        {bikeBox && <RecordCard sportKey="cycling" title="Vélo (puissance)" rows={BIKE_SLOTS.map(s => ({ label: s.label, value: bestRecord(records, 'bike', s.aliases)?.value ?? null }))} />}
        {triBox && <RecordCard sportKey="swim" title="Triathlon" rows={TRI_SLOTS.map(s => ({ label: s.label, value: bestRecord(records, 'triathlon', s.aliases)?.value ?? null }))} />}
        {hyroxRecs.length > 0 && <RecordCard sportKey="hyrox" title="Hyrox" rows={hyroxRecs.map(r => ({ label: r.label, value: r.perf }))} />}
        {swimRecs.length > 0 && <RecordCard sportKey="swim" title="Natation" rows={swimRecs.map(r => ({ label: r.label, value: r.perf }))} />}
      </div>
    </div>
  )
}
function RecordCard({ sportKey, title, rows }: { sportKey: string; title: string; rows: { label: string; value: string | null }[] }) {
  const color = sportMeta(sportKey).color
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>{r.label}</span>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: r.value ? 'var(--text)' : 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{r.value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Graphique volume par semaine (barres, bascule distance / temps) ──
function WeeklyChart({ weekly }: { weekly: { week: string; count: number; distance_m: number; seconds: number }[] }) {
  const [metric, setMetric] = useState<'time' | 'dist'>('time')
  const [hover, setHover] = useState<number | null>(null)
  const val = (w: { distance_m: number; seconds: number }) => metric === 'dist' ? w.distance_m / 1000 : w.seconds
  const max = Math.max(1, ...weekly.map(val))
  const fmt = (v: number) => metric === 'dist' ? `${Math.round(v * 10) / 10} km` : fmtHoursSec(v)
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <Toggle on={metric === 'time'} onClick={() => setMetric('time')}>Temps</Toggle>
        <Toggle on={metric === 'dist'} onClick={() => setMetric('dist')}>Distance</Toggle>
      </div>
      {/* overflow visible + padding haut : la bulle n'est jamais coupée */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, paddingTop: 30, overflow: 'visible' }}>
        {weekly.map((w, i) => {
          const v = val(w); const on = hover === i
          return (
            <div key={w.week} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(h => h === i ? null : h)}
              style={{ flex: '1 1 0', minWidth: 2, height: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
              <div style={{ width: '100%', height: `${Math.max(v > 0 ? 3 : 0, v / max * 100)}%`, borderRadius: '2px 2px 0 0', background: on ? 'var(--text)' : 'var(--primary)', opacity: on ? 1 : 0.85, transition: 'opacity 120ms' }} />
              {on && (
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, zIndex: 10, background: 'var(--text)', color: 'var(--bg-card)', borderRadius: 7, padding: '5px 9px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                  {new Date(w.week).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {fmt(v)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{children}</button>
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>{children}</div>
}
function MiniStat({ n, unit, label, accent }: { n: number; unit: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span className="tnum" style={{ fontSize: 26, fontWeight: 800, color: accent ? 'var(--primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>{label}</div>
    </div>
  )
}
