'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Annuaire des coachs — vitrines publiées qui acceptent des demandes.
// L'athlète parcourt et ouvre une vitrine (/c/[slug]) pour demander.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listPublishedCoaches, type CoachProfile } from '@/lib/coach/vitrine'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renfo', hyrox: 'Hyrox', trail: 'Trail', triathlon: 'Triathlon', rowing: 'Aviron' }

export default function CoachesDirectory() {
  const [coaches, setCoaches] = useState<CoachProfile[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => { void listPublishedCoaches().then(setCoaches).catch(() => setCoaches([])) }, [])

  const filtered = (coaches ?? []).filter(c => {
    if (!q.trim()) return true
    const hay = `${c.display_name ?? ''} ${c.headline ?? ''} ${c.location ?? ''} ${c.sports.map(s => SPORT_LABEL[s] ?? s).join(' ')}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <div style={{ width: '100%', maxWidth: 920, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Trouver un coach</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 20px' }}>Parcours les coachs de la communauté et envoie ta demande.</p>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par nom, sport, ville…"
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', marginBottom: 20 }} />

      {coaches === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Aucun coach pour l’instant</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 0' }}>Reviens bientôt — les coachs arrivent.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(c => {
            const name = c.display_name || 'Coach'
            return (
              <Link key={c.coach_id} href={`/c/${c.slug}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; el.style.transform = 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {c.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.logo_url} alt={name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {c.location && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{c.location}</div>}
                  </div>
                </div>
                {c.headline && <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{c.headline}</p>}
                {c.sports.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                    {c.sports.slice(0, 4).map(s => <span key={s} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-card2)', padding: '4px 9px', borderRadius: 999 }}>{SPORT_LABEL[s] ?? s}</span>)}
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
