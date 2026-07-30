'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — vue d'entrée : la liste des athlètes sous forme de
// tableau simple et lisible (photo, nom, email, sport, objectif, état de
// programmation de la semaine). Tri multi-critères. Un clic sur une ligne
// ouvre le planning complet de l'athlète (/coach/planning/[id]).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRoster, type RosterAthlete } from '@/lib/coach/roster'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'

const DISP = 'Syne, DM Sans, sans-serif'
const BODY = 'DM Sans, sans-serif'

type SortKey = 'alpha' | 'programmed' | 'sport' | 'goal'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'alpha', label: 'Ordre alphabétique' },
  { key: 'programmed', label: 'Semaine à programmer' },
  { key: 'sport', label: 'Sport' },
  { key: 'goal', label: 'Objectif' },
]

const SPORT_LABEL: Record<string, string> = {
  run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation',
  hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron', triathlon: 'Triathlon',
}
const sportLabel = (s: string) => SPORT_LABEL[s] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

type Row = RosterAthlete & { email: string | null }

export default function CoachPlanningRoster() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('programmed')
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      const [roster, emails] = await Promise.all([
        getRoster().catch(() => [] as RosterAthlete[]),
        (async () => {
          try { const { data } = await createClient().rpc('my_athlete_emails'); return data } catch { return null }
        })(),
      ])
      if (!alive) return
      const emap = new Map<string, string>()
      if (Array.isArray(emails)) emails.forEach((e: { athlete_id: string; email: string }) => emap.set(e.athlete_id, e.email))
      setRows(roster.map(a => ({ ...a, email: emap.get(a.id) ?? null })))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const sorted = useMemo(() => {
    const list = rows.filter(r => {
      if (!q.trim()) return true
      const hay = `${r.name} ${r.email ?? ''} ${r.sports.join(' ')} ${r.goal ?? ''}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
    const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, 'fr')
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'alpha': return byName(a, b)
        case 'programmed': {
          // Non programmés (adhTotal === 0) en premier : ceux qui demandent du travail.
          const pa = a.adhTotal > 0 ? 1 : 0, pb = b.adhTotal > 0 ? 1 : 0
          return pa - pb || byName(a, b)
        }
        case 'sport': return (a.sports[0] ?? 'zzz').localeCompare(b.sports[0] ?? 'zzz', 'fr') || byName(a, b)
        case 'goal': return (a.goal ?? 'zzz').localeCompare(b.goal ?? 'zzz', 'fr') || byName(a, b)
        default: return byName(a, b)
      }
    })
  }, [rows, sort, q])

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: BODY }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: 26, margin: 0, color: 'var(--text)', letterSpacing: '-0.01em' }}>Planning</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 7, padding: '3px 9px' }}>Coach</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>Choisis un athlète pour ouvrir et programmer son planning.</p>

      {/* Barre de tri + recherche */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em', marginRight: 2 }}>Trier</span>
        {SORTS.map(s => (
          <button key={s.key} onClick={() => setSort(s.key)}
            style={{ border: `1px solid ${sort === s.key ? 'color-mix(in srgb, var(--primary) 45%, var(--border))' : 'var(--border)'}`, background: sort === s.key ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-card)', color: sort === s.key ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>{s.label}</button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"
          style={{ marginLeft: 'auto', minWidth: 180, flex: '0 1 260px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: BODY, boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : sorted.length === 0 ? (
        <div style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 22, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          {rows.length === 0 ? 'Aucun athlète. Invite-en un depuis « Athlètes ».' : 'Aucun résultat pour cette recherche.'}
        </div>
      ) : (
        <div style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Athlète', 'Email', 'Sport', 'Objectif', 'Semaine en cours', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 4 ? 'center' : 'left', padding: '11px 16px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const programmed = r.adhTotal > 0
                  return (
                    <tr key={r.id} onClick={() => router.push(`/coach/planning/${r.id}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      {/* Athlète */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                          <Avatar url={r.avatar} name={r.name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                            {r.group && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.group}</div>}
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-mid)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email ?? '—'}</td>
                      {/* Sport */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {r.sports.length === 0 ? <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>—</span>
                            : r.sports.slice(0, 3).map(s => (
                              <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px', whiteSpace: 'nowrap' }}>{sportLabel(s)}</span>
                            ))}
                        </div>
                      </td>
                      {/* Objectif */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: r.goal || r.race ? 'var(--text)' : 'var(--text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.goal || (r.race ? r.race.name : '—')}
                      </td>
                      {/* Semaine en cours */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {programmed ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#16a34a', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 999, padding: '4px 10px' }}>
                            ✓ {r.adhTotal} séance{r.adhTotal > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '4px 10px' }}>
                            À programmer
                          </span>
                        )}
                      </td>
                      {/* Chevron */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
