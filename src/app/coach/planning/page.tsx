'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — page principale : chaque athlète est une ligne « mini
// tableau de bord ». On y voit d'un coup d'œil : identité, sa SÉANCE DU JOUR,
// le COMPTE À REBOURS vers son objectif (jours + semaines), l'avancement de
// la semaine, et sa charge des 7 derniers jours (sparkline SVG brute).
// Tri + recherche + filtre par groupe. Clic → planning complet de l'athlète.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRoster, type RosterAthlete, type Forme } from '@/lib/coach/roster'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'

const DISP = 'Syne, DM Sans, sans-serif'
const BODY = 'DM Sans, sans-serif'

type SortKey = 'alpha' | 'programmed' | 'sport' | 'goal' | 'race'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'programmed', label: 'À programmer' },
  { key: 'race', label: 'Objectif proche' },
  { key: 'alpha', label: 'A → Z' },
  { key: 'sport', label: 'Sport' },
  { key: 'goal', label: 'Objectif' },
]

const SPORT_COLOR: Record<string, string> = {
  run: '#22c55e', running: '#22c55e', bike: '#3b82f6', cycling: '#3b82f6', swim: '#06b6d4',
  hyrox: '#ef4444', gym: '#f97316', trail: '#f97316', trail_run: '#f97316', rowing: '#14b8a6',
}
const SPORT_LABEL: Record<string, string> = {
  run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation',
  hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron', triathlon: 'Triathlon',
}
const sportColor = (s: string) => SPORT_COLOR[s] ?? 'var(--text-mid)'
const sportLabel = (s: string) => SPORT_LABEL[s] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

const STATUS: Record<Forme, { c: string; label: string }> = {
  ok:       { c: '#22c55e', label: 'En forme' },
  warn:     { c: '#f59e0b', label: 'À surveiller' },
  injured:  { c: '#ef4444', label: 'Blessé' },
  inactive: { c: '#94a3b8', label: 'Inactif' },
}

function mondayOf(d: Date) { const dow = (d.getDay() + 6) % 7; const m = new Date(d); m.setDate(d.getDate() - dow); m.setHours(0, 0, 0, 0); return m }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface TodayRow { user_id: string; sport: string; title: string; duration_min: number | null }
type Row = RosterAthlete & { email: string | null; today: TodayRow[] }

// Sparkline charge 7 j — SVG brute (aucune lib chart, cf. CLAUDE.md).
function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 96, h = 30, n = data.length
  const max = Math.max(1, ...data)
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * (w - 2) + 1)
  const y = (v: number) => h - 3 - (v / max) * (h - 8)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${h} L ${x(0).toFixed(1)} ${h} Z`
  const gid = `sp${Math.round(color.charCodeAt(1) || 0)}`
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => v > 0 && i === n - 1 ? <circle key={i} cx={x(i)} cy={y(v)} r="2.4" fill={color} /> : null)}
    </svg>
  )
}

function Block({ label, children, grow = '1 1 160px' }: { label: string; children: React.ReactNode; grow?: string }) {
  return (
    <div style={{ flex: grow, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

export default function CoachPlanningRoster() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('programmed')
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>('__all__')

  useEffect(() => {
    let alive = true
    void (async () => {
      const roster = await getRoster().catch(() => [] as RosterAthlete[])
      const ids = roster.map(a => a.id)
      const sb = createClient()
      const monday = iso(mondayOf(new Date()))
      const todayIdx = (new Date().getDay() + 6) % 7
      const [emails, today] = await Promise.all([
        (async () => { try { const { data } = await sb.rpc('my_athlete_emails'); return data } catch { return null } })(),
        (async () => {
          if (!ids.length) return [] as TodayRow[]
          try { const { data } = await sb.from('planned_sessions').select('user_id,sport,title,duration_min').in('user_id', ids).eq('week_start', monday).eq('day_index', todayIdx); return (data ?? []) as TodayRow[] } catch { return [] as TodayRow[] }
        })(),
      ])
      if (!alive) return
      const emap = new Map<string, string>()
      if (Array.isArray(emails)) emails.forEach((e: { athlete_id: string; email: string }) => emap.set(e.athlete_id, e.email))
      const tmap = new Map<string, TodayRow[]>()
      today.forEach(t => { const l = tmap.get(t.user_id) ?? []; l.push(t); tmap.set(t.user_id, l) })
      setRows(roster.map(a => ({ ...a, email: emap.get(a.id) ?? null, today: tmap.get(a.id) ?? [] })))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const groups = useMemo(() => Array.from(new Set(rows.map(r => r.group).filter(Boolean))) as string[], [rows])

  const sorted = useMemo(() => {
    const list = rows.filter(r => {
      if (group !== '__all__' && r.group !== group) return false
      if (!q.trim()) return true
      const hay = `${r.name} ${r.email ?? ''} ${r.sports.join(' ')} ${r.goal ?? ''} ${r.race?.name ?? ''}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
    const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, 'fr')
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'alpha': return byName(a, b)
        case 'programmed': return (a.adhTotal > 0 ? 1 : 0) - (b.adhTotal > 0 ? 1 : 0) || byName(a, b)
        case 'race': return (a.race?.days ?? 9e9) - (b.race?.days ?? 9e9) || byName(a, b)
        case 'sport': return (a.sports[0] ?? 'zzz').localeCompare(b.sports[0] ?? 'zzz', 'fr') || byName(a, b)
        case 'goal': return (a.goal ?? 'zzz').localeCompare(b.goal ?? 'zzz', 'fr') || byName(a, b)
        default: return byName(a, b)
      }
    })
  }, [rows, sort, q, group])

  // Synthèse
  const kpi = useMemo(() => ({
    total: rows.length,
    toPlan: rows.filter(r => r.adhTotal === 0).length,
    alert: rows.filter(r => r.status !== 'ok').length,
    raceSoon: rows.filter(r => r.race && r.race.days <= 14).length,
  }), [rows])

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: BODY }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: 27, margin: 0, color: 'var(--text)', letterSpacing: '-0.01em' }}>Planning</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 7, padding: '3px 9px' }}>Coach</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Chaque athlète, sa séance du jour et son objectif — clique pour programmer.</span>
      </div>

      {/* Bandeau de synthèse */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0 18px' }}>
        {[
          { n: kpi.total, l: 'Athlètes', c: 'var(--text)' },
          { n: kpi.toPlan, l: 'Semaine à programmer', c: kpi.toPlan ? '#d97706' : 'var(--text-dim)' },
          { n: kpi.alert, l: 'À surveiller', c: kpi.alert ? '#ef4444' : 'var(--text-dim)' },
          { n: kpi.raceSoon, l: 'Course < 14 j', c: kpi.raceSoon ? 'var(--primary)' : 'var(--text-dim)' },
        ].map((k, i) => (
          <div key={i} style={{ flex: '1 1 130px', minWidth: 120, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontFamily: DISP, fontSize: 24, fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.n}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tri + recherche + groupes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        {SORTS.map(s => (
          <button key={s.key} onClick={() => setSort(s.key)}
            style={{ border: `1px solid ${sort === s.key ? 'color-mix(in srgb, var(--primary) 45%, var(--border))' : 'var(--border)'}`, background: sort === s.key ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-card)', color: sort === s.key ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>{s.label}</button>
        ))}
        {groups.length > 0 && (
          <select value={group} onChange={e => setGroup(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>
            <option value="__all__">Tous les groupes</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un athlète…"
          style={{ marginLeft: 'auto', minWidth: 180, flex: '0 1 260px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: BODY, boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 96, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', opacity: 0.6 }} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 26, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          {rows.length === 0 ? 'Aucun athlète. Invite-en un depuis « Athlètes ».' : 'Aucun résultat.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(r => {
            const st = STATUS[r.status]
            const race = r.race
            const w = race ? Math.floor(race.days / 7) : 0
            const rd = race ? race.days % 7 : 0
            const programmed = r.adhTotal > 0
            const today = r.today
            return (
              <article key={r.id}
                onClick={() => router.push(`/coach/planning/${r.id}`)}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'color-mix(in srgb, var(--primary) 40%, var(--border))'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; router.prefetch(`/coach/planning/${r.id}`) }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'none'; el.style.boxShadow = 'none' }}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '16px 18px 16px 22px', borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', transition: 'transform .16s, box-shadow .16s, border-color .16s', overflow: 'hidden' }}>
                {/* Accent forme */}
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: st.c }} />

                {/* Identité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '2 1 220px', minWidth: 0 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar url={r.avatar} name={r.name} size={46} />
                    <span title={st.label} style={{ position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: '50%', background: st.c, border: '2px solid var(--bg-card)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: DISP, fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>{r.email ?? '—'}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {r.sports.slice(0, 3).map(s => (
                        <span key={s} style={{ fontSize: 10.5, fontWeight: 700, color: sportColor(s), background: `color-mix(in srgb, ${sportColor(s)} 13%, transparent)`, borderRadius: 6, padding: '2px 7px' }}>{sportLabel(s)}</span>
                      ))}
                      {r.group && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', background: 'var(--bg-alt)', borderRadius: 6, padding: '2px 7px' }}>{r.group}</span>}
                    </div>
                  </div>
                </div>

                {/* Séance du jour */}
                <Block label="Séance du jour" grow="1.3 1 190px">
                  {today.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-mid)' }}>
                      <span style={{ fontSize: 16 }}>🌿</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>Repos / récup</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {today.slice(0, 2).map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingLeft: 9, borderLeft: `3px solid ${sportColor(t.sport)}` }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-dim)', flexShrink: 0, whiteSpace: 'nowrap' }}>{[sportLabel(t.sport), t.duration_min ? `${t.duration_min}′` : ''].filter(Boolean).join(' · ')}</span>
                        </div>
                      ))}
                      {today.length > 2 && <span style={{ fontSize: 11, color: 'var(--text-dim)', paddingLeft: 12 }}>+{today.length - 2} autre{today.length - 2 > 1 ? 's' : ''}</span>}
                    </div>
                  )}
                </Block>

                {/* Objectif */}
                <Block label="Objectif" grow="1 1 170px">
                  {race ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="42" height="42" viewBox="0 0 42 42" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                          <circle cx="21" cy="21" r="18" fill="none" stroke="var(--border)" strokeWidth="3" />
                          <circle cx="21" cy="21" r="18" fill="none" stroke={race.days <= 14 ? '#ef4444' : 'var(--primary)'} strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 18} strokeDashoffset={2 * Math.PI * 18 * Math.min(1, race.days / 84)} />
                        </svg>
                        <span style={{ fontFamily: DISP, fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>J-{race.days}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{race.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-mid)', marginTop: 2 }}>{w > 0 ? `${w} sem${rd ? ` ${rd} j` : ''}` : `${race.days} jour${race.days > 1 ? 's' : ''}`}</div>
                      </div>
                    </div>
                  ) : r.goal ? (
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.goal}<div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400, marginTop: 2 }}>Aucune course datée</div></div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>—</span>
                  )}
                </Block>

                {/* Semaine + charge */}
                <Block label="Cette semaine" grow="0 1 168px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      {programmed ? (
                        <>
                          <div style={{ fontFamily: DISP, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{r.adhDone}<span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>/{r.adhTotal}</span></div>
                          <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                            {Array.from({ length: Math.min(7, r.adhTotal) }).map((_, i) => (
                              <span key={i} style={{ width: 10, height: 4, borderRadius: 2, background: i < r.adhDone ? '#22c55e' : 'var(--border-mid)' }} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '4px 10px' }}>À programmer</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Spark data={r.load7?.length ? r.load7 : [0, 0, 0, 0, 0, 0, 0]} color={r.status === 'ok' ? 'var(--primary)' : STATUS[r.status].c} />
                      <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 1 }}>charge 7 j</div>
                    </div>
                  </div>
                </Block>

                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
