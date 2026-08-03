'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Fiche PUBLIQUE d'un programme — /programmes/[id]. Accessible à tous.
// Détaille la structure semaine par semaine + « Ajouter à mon planning ».
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getProgram, addProgramToMyPlanning, LEVEL_LABEL, type CoachProgram } from '@/lib/coach/programs'
import { getCoachBriefById, type CoachProfile } from '@/lib/coach/vitrine'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', trail: 'Trail', triathlon: 'Triathlon', rowing: 'Aviron' }

export default function ProgramDetail() {
  const id = String(useParams()?.id ?? '')
  const [p, setP] = useState<CoachProgram | null>(null)
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const prog = await getProgram(id).catch(() => null)
      if (!alive) return
      setP(prog); setLoading(false)
      if (prog) setCoach(await getCoachBriefById(prog.coach_id).catch(() => null))
    })()
    return () => { alive = false }
  }, [id])

  const add = async () => {
    if (!p || adding) return
    setAdding(true); setErr(null)
    try {
      const n = await addProgramToMyPlanning(p)
      setAdded(n)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ajout impossible.')
    } finally { setAdding(false) }
  }

  if (loading) return <div style={wrap}><div style={{ ...card, height: 200, opacity: 0.5 }} /></div>
  if (!p) return (
    <div style={wrap}>
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Programme introuvable</p>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '8px 0 18px' }}>Ce programme n'existe pas ou n'est plus publié.</p>
        <Link href="/programmes" style={{ ...primary, textDecoration: 'none' }}>Voir le catalogue</Link>
      </div>
    </div>
  )

  const sessions = p.structure.reduce((n, w) => n + w.sessions.length, 0)

  return (
    <div style={wrap}>
      <Link href="/programmes" style={back}>← Programmes</Link>

      <div style={card}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,30px)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>{p.title}</h1>
        {coach?.display_name && (
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 0' }}>
            par {coach.slug ? <Link href={`/c/${coach.slug}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{coach.display_name}</Link> : coach.display_name}
          </p>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-dim)', margin: '10px 0 0' }}>
          <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks}</span> semaines · <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{sessions}</span> séances{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}
        </div>
        {p.sports.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {p.sports.map(s => <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-card2)', padding: '5px 11px', borderRadius: 999 }}>{SPORT_LABEL[s] ?? s}</span>)}
          </div>
        )}
        {p.description && <p style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.6, margin: '18px 0 0', whiteSpace: 'pre-wrap' as const }}>{p.description}</p>}

        {/* CTA */}
        <div style={{ marginTop: 22 }}>
          {added !== null ? (
            <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Ajouté à ton planning ✓</p>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 10px' }}><span className="tnum">{added}</span> séances placées à partir de cette semaine.</p>
              <Link href="/planning" style={{ ...primary, textDecoration: 'none' }}>Voir mon planning</Link>
            </div>
          ) : (
            <>
              <button onClick={add} disabled={adding} style={{ ...primary, minWidth: 220 }}>{adding ? 'Ajout…' : 'Ajouter à mon planning'}</button>
              {err && <p style={{ fontSize: 12.5, color: 'var(--danger, #ef4444)', margin: '10px 0 0' }}>{err} {err.toLowerCase().includes('connecte') && <Link href="/auth" style={{ color: 'var(--primary)', fontWeight: 700 }}>Se connecter</Link>}</p>}
            </>
          )}
        </div>
      </div>

      {/* Structure */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {p.structure.map((w, wi) => (
          <div key={wi} style={card}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{w.label || `Semaine ${wi + 1}`}</div>
            {w.sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Repos / semaine libre.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {w.sessions.map((s, si) => (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0 }}>{s.nom || 'Séance'}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {SPORT_LABEL[s.sport] ?? s.sport}{s.duree ? ` · ${s.duree} min` : ''}{s.intensite ? ` · ${s.intensite}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = { width: '100%', maxWidth: 720, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }
const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const primary: React.CSSProperties = { display: 'inline-block', padding: '11px 18px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const back: React.CSSProperties = { display: 'inline-block', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }
