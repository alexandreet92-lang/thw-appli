'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — page principale : chaque athlète est une ligne « mini
// tableau de bord » (séance du jour, compte à rebours objectif, semaine,
// charge 7 j). Tri rapide + filtres stylés (objectif, genre, sport, groupe) +
// menu d'actions par ligne (planning, analyse IA, message, fiche).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRoster, type RosterAthlete, type Forme } from '@/lib/coach/roster'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'
import { FilterMenu, RowActionsMenu, type Opt } from '@/components/coach/CoachMenus'
import { CoachMessageBubble, openCoachMessage } from '@/components/coach/CoachMessageBubble'

const DISP = 'var(--font-display)'
const BODY = 'var(--font-body)'

type SortKey = 'programmed' | 'race' | 'alpha' | 'fatigue'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'programmed', label: 'À programmer' },
  { key: 'race', label: 'Objectif proche' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'alpha', label: 'A → Z' },
]

const SPORT_COLOR: Record<string, string> = {
  run: '#22c55e', running: '#22c55e', bike: '#3b82f6', cycling: '#3b82f6', swim: '#06b6d4',
  hyrox: '#ef4444', gym: '#f97316', trail: '#f97316', trail_run: '#f97316', rowing: '#14b8a6',
}
const SPORT_LABEL: Record<string, string> = {
  run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation',
  hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron', triathlon: 'Triathlon',
}
const GOAL_LABEL: Record<string, string> = {
  performance: 'Performance', force: 'Force', endurance: 'Endurance', hybride: 'Hybride',
  prise_de_masse: 'Prise de masse', masse: 'Prise de masse', perte_de_poids: 'Perte de poids',
  sante: 'Santé', bien_etre: 'Bien-être', competition: 'Compétition',
}
// Liste complète des types d'objectif (le filtre les propose tous, indépendamment des données).
const GOAL_OPTIONS: { value: string; label: string }[] = [
  ['performance', 'Performance'], ['force', 'Force'], ['prise_de_masse', 'Prise de masse'],
  ['perte_de_poids', 'Perte de poids'], ['endurance', 'Endurance'], ['hybride', 'Hybride'],
  ['competition', 'Compétition'], ['sante', 'Santé'], ['bien_etre', 'Bien-être'],
].map(([value, label]) => ({ value, label }))
const GENDER_LABEL: Record<string, string> = { male: 'Homme', female: 'Femme', homme: 'Homme', femme: 'Femme', other: 'Autre' }
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s
const sportColor = (s: string) => SPORT_COLOR[s] ?? 'var(--text-mid)'
const sportLabel = (s: string) => SPORT_LABEL[s] ?? cap(s)
const goalLabel = (s: string) => GOAL_LABEL[s] ?? cap(s)
const genderLabel = (s: string) => GENDER_LABEL[s] ?? cap(s)

const STATUS: Record<Forme, { c: string; label: string }> = {
  ok: { c: '#22c55e', label: 'En forme' }, warn: { c: '#f59e0b', label: 'À surveiller' },
  injured: { c: '#ef4444', label: 'Blessé' }, inactive: { c: '#94a3b8', label: 'Inactif' },
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
  const gid = `sp${Math.round((color.charCodeAt(1) || 0) + (color.charCodeAt(4) || 0))}`
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
  const [fGoal, setFGoal] = useState('__all__')
  const [fGender, setFGender] = useState('__all__')
  const [fSport, setFSport] = useState('__all__')
  const [fGroup, setFGroup] = useState('__all__')

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
        (async () => { if (!ids.length) return [] as TodayRow[]; try { const { data } = await sb.from('planned_sessions').select('user_id,sport,title,duration_min').in('user_id', ids).eq('week_start', monday).eq('day_index', todayIdx); return (data ?? []) as TodayRow[] } catch { return [] as TodayRow[] } })(),
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

  // Options de filtre construites depuis les données présentes.
  const opts = useMemo(() => {
    const uniq = (arr: (string | null)[]) => Array.from(new Set(arr.filter(Boolean))) as string[]
    return {
      goal: GOAL_OPTIONS as Opt[],
      gender: [{ value: 'male', label: 'Homme' }, { value: 'female', label: 'Femme' }] as Opt[],
      sport: uniq(rows.flatMap(r => r.sports)).map(v => ({ value: v, label: sportLabel(v) } as Opt)),
      group: uniq(rows.map(r => r.group)).map(v => ({ value: v, label: v } as Opt)),
    }
  }, [rows])

  const sorted = useMemo(() => {
    const list = rows.filter(r => {
      if (fGoal !== '__all__' && r.goal !== fGoal) return false
      if (fGender !== '__all__' && r.gender !== fGender) return false
      if (fSport !== '__all__' && !r.sports.includes(fSport)) return false
      if (fGroup !== '__all__' && r.group !== fGroup) return false
      if (!q.trim()) return true
      const hay = `${r.name} ${r.email ?? ''} ${r.sports.join(' ')} ${r.goal ?? ''} ${r.race?.name ?? ''}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
    const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, 'fr')
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'programmed': return (a.adhTotal > 0 ? 1 : 0) - (b.adhTotal > 0 ? 1 : 0) || byName(a, b)
        case 'race': return (a.race?.days ?? 9e9) - (b.race?.days ?? 9e9) || byName(a, b)
        case 'fatigue': return (b.fatigue ?? -1) - (a.fatigue ?? -1) || byName(a, b)
        case 'alpha': return byName(a, b)
        default: return byName(a, b)
      }
    })
  }, [rows, sort, q, fGoal, fGender, fSport, fGroup])

  const kpi = useMemo(() => ({
    total: rows.length,
    toPlan: rows.filter(r => r.adhTotal === 0).length,
    alert: rows.filter(r => r.status !== 'ok').length,
    raceSoon: rows.filter(r => r.race && r.race.days <= 14).length,
  }), [rows])

  const analyze = (r: Row) => window.dispatchEvent(new CustomEvent('thw:open-coach', { detail: { prompt: `Analyse ${r.name} : sa charge d'entraînement, sa récupération et son plan de la semaine, et propose des ajustements concrets.` } }))

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: BODY }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 28, margin: 0, color: 'var(--text)' }}>Planning</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 7, padding: '3px 9px' }}>Coach</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Chaque athlète, sa séance du jour et son objectif — clique pour programmer.</span>
      </div>

      {/* Synthèse */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0 18px' }}>
        {[
          { n: kpi.total, l: 'Athlètes', c: 'var(--text)' },
          { n: kpi.toPlan, l: 'Semaine à programmer', c: kpi.toPlan ? '#d97706' : 'var(--text-dim)' },
          { n: kpi.alert, l: 'À surveiller', c: kpi.alert ? '#ef4444' : 'var(--text-dim)' },
          { n: kpi.raceSoon, l: 'Course < 14 j', c: kpi.raceSoon ? 'var(--primary)' : 'var(--text-dim)' },
        ].map((k, i) => (
          <div key={i} style={{ flex: '1 1 130px', minWidth: 120, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 700, color: k.c, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.n}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tri rapide */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Trier</span>
        {SORTS.map(s => (
          <button key={s.key} onClick={() => setSort(s.key)}
            style={{ border: `1px solid ${sort === s.key ? 'color-mix(in srgb, var(--primary) 45%, var(--border))' : 'var(--border)'}`, background: sort === s.key ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-card)', color: sort === s.key ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>{s.label}</button>
        ))}
      </div>

      {/* Filtres stylés + recherche */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Filtrer</span>
        <FilterMenu label="Objectif" value={fGoal} options={opts.goal} onChange={setFGoal} />
        <FilterMenu label="Genre" value={fGender} options={opts.gender} onChange={setFGender} />
        <FilterMenu label="Sport" value={fSport} options={opts.sport} onChange={setFSport} />
        {opts.group.length > 0 && <FilterMenu label="Groupe" value={fGroup} options={opts.group} onChange={setFGroup} />}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"
          style={{ marginLeft: 'auto', minWidth: 170, flex: '0 1 240px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: BODY, boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 96, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', opacity: 0.6 }} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 26, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          {rows.length === 0 ? 'Aucun athlète. Invite-en un depuis « Athlètes ».' : 'Aucun athlète ne correspond à ces filtres.'}
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
                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '16px 16px 16px 22px', borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', transition: 'transform .16s, box-shadow .16s, border-color .16s' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: st.c, borderRadius: '18px 0 0 18px' }} />

                {/* Identité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '2 1 210px', minWidth: 0 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar url={r.avatar} name={r.name} size={46} />
                    <span title={st.label} style={{ position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: '50%', background: st.c, border: '2px solid var(--bg-card)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: DISP, fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>{r.email ?? '—'}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {r.goal && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 6, padding: '2px 7px' }}>{goalLabel(r.goal)}</span>}
                      {r.sports.slice(0, 2).map(s => (
                        <span key={s} style={{ fontSize: 10.5, fontWeight: 700, color: sportColor(s), background: `color-mix(in srgb, ${sportColor(s)} 13%, transparent)`, borderRadius: 6, padding: '2px 7px' }}>{sportLabel(s)}</span>
                      ))}
                      {r.group && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', background: 'var(--bg-alt)', borderRadius: 6, padding: '2px 7px' }}>{r.group}</span>}
                    </div>
                  </div>
                </div>

                {/* Séance du jour */}
                <Block label="Séance du jour" grow="1.3 1 180px">
                  {today.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-mid)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg><span style={{ fontSize: 13.5, fontWeight: 600 }}>Repos / récup</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {today.slice(0, 2).map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, paddingLeft: 9, borderLeft: `3px solid ${sportColor(t.sport)}` }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-dim)', flexShrink: 0, whiteSpace: 'nowrap' }}>{[sportLabel(t.sport), t.duration_min ? `${t.duration_min}′` : ''].filter(Boolean).join(' · ')}</span>
                        </div>
                      ))}
                      {today.length > 2 && <span style={{ fontSize: 11, color: 'var(--text-dim)', paddingLeft: 12 }}>+{today.length - 2}</span>}
                    </div>
                  )}
                </Block>

                {/* Objectif */}
                <Block label="Objectif" grow="1 1 160px">
                  {race ? (
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 800, color: race.days <= 14 ? '#ef4444' : 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>J-{race.days}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600 }}>{w > 0 ? `${w} sem${rd ? ` ${rd} j` : ''}` : `${race.days} j`}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{race.name}</div>
                      <div style={{ height: 4, borderRadius: 3, background: 'var(--border)', marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(4, 100 - Math.min(100, race.days / 84 * 100))}%`, background: race.days <= 14 ? '#ef4444' : 'var(--primary)', borderRadius: 3 }} />
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune course datée</span>
                  )}
                </Block>

                {/* Semaine + charge */}
                <Block label="Cette semaine" grow="0 1 168px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      {programmed ? (
                        <>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{r.adhDone}<span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>/{r.adhTotal}</span></div>
                          <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                            {Array.from({ length: Math.min(7, r.adhTotal) }).map((_, i) => <span key={i} style={{ width: 10, height: 4, borderRadius: 2, background: i < r.adhDone ? '#22c55e' : 'var(--border-mid)' }} />)}
                          </div>
                        </>
                      ) : (
                        <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '4px 10px' }}>À programmer</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Spark data={r.load7?.length ? r.load7 : [0, 0, 0, 0, 0, 0, 0]} color={r.status === 'ok' ? 'var(--primary)' : st.c} />
                      <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 1 }}>charge 7 j</div>
                    </div>
                  </div>
                </Block>

                {/* Actions */}
                <RowActionsMenu actions={[
                  { label: 'Ouvrir le planning', icon: <IcCal />, onClick: () => router.push(`/coach/planning/${r.id}`) },
                  { label: 'Analyser par l’IA', icon: <IcSpark />, onClick: () => analyze(r) },
                  { label: 'Envoyer un message', icon: <IcMsg />, onClick: () => openCoachMessage({ athleteId: r.id, name: r.name, avatar: r.avatar }) },
                  { label: 'Fiche 360°', icon: <IcUser />, onClick: () => router.push(`/coach/athlete/${r.id}`) },
                ]} />
              </article>
            )
          })}
        </div>
      )}

      <CoachMessageBubble />
    </div>
  )
}

const ic = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const IcCal = () => <svg {...ic}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
const IcSpark = () => <svg {...ic}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
const IcMsg = () => <svg {...ic}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
const IcUser = () => <svg {...ic}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
