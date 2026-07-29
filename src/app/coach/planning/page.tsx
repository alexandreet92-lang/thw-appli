'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PLANNING COACH — les séances à venir de chaque athlète, en lecture.
// (L'assignation de séances viendra dans une phase ultérieure.)
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listMyAthletes, type AthleteSummary } from '@/lib/coach/relationships'
import { getPlanning, type PlannedRow } from '@/lib/coach/athlete-data'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return d } }

export default function CoachPlanning() {
  const [rows, setRows] = useState<{ athlete: AthleteSummary; sessions: PlannedRow[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const athletes = await listMyAthletes().catch(() => [])
      const withPlans = await Promise.all(athletes.map(async a => ({ athlete: a, sessions: await getPlanning(a.id).catch(() => []) })))
      if (!cancelled) { setRows(withPlans); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'Syne,DM Sans,sans-serif' }}>Planning</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>Les séances à venir de tes athlètes.</p>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Chargement…</p>
      ) : rows.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>Aucun athlète. Invite-en un depuis « Athlètes ».</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.map(({ athlete, sessions }) => (
            <div key={athlete.id} style={{ ...card }}>
              <Link href={`/coach/athlete/${athlete.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: sessions.length ? 10 : 0 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, fontSize: 13 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {athlete.avatar_url ? <img src={athlete.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (athlete.first_name || athlete.full_name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{athlete.full_name || athlete.first_name || 'Athlète'}</span>
              </Link>
              {sessions.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Aucune séance planifiée.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sessions.slice(0, 8).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-dim)', width: 92, flexShrink: 0, fontSize: 12 }}>{DAYS[s.day_index] ?? '?'} {fmtDate(s.week_start)}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || s.sport || 'Séance'}</span>
                      <span style={{ color: 'var(--text-dim)', flexShrink: 0, fontSize: 12 }}>{[s.duration_min ? `${s.duration_min} min` : '', s.intensity ?? ''].filter(Boolean).join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
