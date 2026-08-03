'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Catalogue PUBLIC des programmes — accessible à tout le monde.
// Parcours les programmes publiés par les coachs, ouvre une fiche détaillée.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { listPublishedPrograms, LEVEL_LABEL, type CoachProgram } from '@/lib/coach/programs'
import { listPublishedCoaches, type CoachProfile } from '@/lib/coach/vitrine'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', trail: 'Trail', triathlon: 'Triathlon', rowing: 'Aviron' }

export default function ProgramsCatalog() {
  const [programs, setPrograms] = useState<CoachProgram[] | null>(null)
  const [coaches, setCoaches] = useState<Record<string, CoachProfile>>({})
  const [q, setQ] = useState('')
  const [sport, setSport] = useState<string>('')

  useEffect(() => {
    void listPublishedPrograms().then(setPrograms).catch(() => setPrograms([]))
    void listPublishedCoaches().then(list => {
      const m: Record<string, CoachProfile> = {}
      list.forEach(c => { m[c.coach_id] = c })
      setCoaches(m)
    }).catch(() => {})
  }, [])

  const sports = useMemo(() => Array.from(new Set((programs ?? []).flatMap(p => p.sports))), [programs])
  const filtered = (programs ?? []).filter(p => {
    if (sport && !p.sports.includes(sport)) return false
    if (!q.trim()) return true
    const coach = coaches[p.coach_id]?.display_name ?? ''
    return `${p.title} ${p.description ?? ''} ${coach}`.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Programmes</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 20px' }}>Des programmes d'entraînement conçus par les coachs — ajoute-les à ton planning en un clic.</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un programme, un coach…"
          style={{ flex: 1, minWidth: 200, boxSizing: 'border-box', padding: '11px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }} />
        <select value={sport} onChange={e => setSport(e.target.value)}
          style={{ padding: '11px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }}>
          <option value="">Tous les sports</option>
          {sports.map(s => <option key={s} value={s}>{SPORT_LABEL[s] ?? s}</option>)}
        </select>
      </div>

      {programs === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Aucun programme pour l'instant</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 0' }}>Reviens bientôt — les coachs publient leurs programmes.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(p => {
            const coach = coaches[p.coach_id]
            const sessions = p.structure.reduce((n, w) => n + w.sessions.length, 0)
            return (
              <Link key={p.id} href={`/programmes/${p.id}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; el.style.transform = 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>{p.title}</div>
                {coach?.display_name && <div style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>par {coach.display_name}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                  <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks}</span> sem. · <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{sessions}</span> séances{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}
                </div>
                {p.sports.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                    {p.sports.slice(0, 4).map(s => <span key={s} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-card2)', padding: '4px 9px', borderRadius: 999 }}>{SPORT_LABEL[s] ?? s}</span>)}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
