'use client'
// ══════════════════════════════════════════════════════════════════
// ActivityShowcase — bloc « activités » d'un profil (façon Strava) :
// jauge verticale du volume horaire par sport (survol → h + %), heatmap de
// régularité (~1 an), série de semaines actives, et 7 dernières activités.
// Reçoit les données déjà agrégées + filtrées par la RPC (confidentialité).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import type { ActivityShowcaseData, RecentActivity } from '@/lib/profile/activityShowcase'
import { hoursByFamily, activeWeekStreak, sportMeta } from '@/lib/profile/activityShowcase'

const DAY_LABELS = ['L', '', 'M', '', 'J', '', 'D']
const MONTH = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

const fmtDur = (s: number | null) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
const fmtDist = (m: number | null) => m && m > 0 ? `${Math.round(m / 100) / 10} km` : null
const fmtPace = (s: number | null) => { if (!s || s <= 0) return null; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km` }
const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTH[d.getMonth()]}` }

export default function ActivityShowcase({ data, isOwner }: { data: ActivityShowcaseData; isOwner: boolean }) {
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
            {data.recent.map(a => <ActivityRow key={a.id} a={a} />)}
          </div>
        </div>
      )}
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
              <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: on ? 'var(--text)' : 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{f.hours} h</span>
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

function ActivityRow({ a }: { a: RecentActivity }) {
  const meta = sportMeta(sportFamilyLocal(a.sport))
  const bits = [fmtDist(a.distance_m), fmtDur(a.seconds), fmtPace(a.avg_pace_s_km) ?? (a.avg_watts ? `${Math.round(a.avg_watts)} W` : null), a.elevation_gain_m ? `${Math.round(a.elevation_gain_m)} m D+` : null].filter(Boolean)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
        <div className="tnum" style={{ fontSize: 11.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(a.started_at)} · {bits.join(' · ')}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{meta.label}</span>
    </div>
  )
}
function sportFamilyLocal(sportType: string): string {
  const F: Record<string, string> = { run: 'running', trail_run: 'running', bike: 'cycling', virtual_bike: 'cycling', swim: 'swim', open_water_swim: 'swim', rowing: 'rowing', gym: 'gym', crossfit: 'gym', hiit: 'gym', yoga: 'gym', ski: 'other', hyrox: 'hyrox', other: 'other' }
  return F[sportType] ?? 'other'
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
