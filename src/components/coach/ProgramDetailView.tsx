'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDetailView — détail d'un programme (structure + « Ajouter à mon
// planning »). Utilisé par la page /programmes/[id] ET la surpage du deck.
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import Link from 'next/link'
import { addProgramToMyPlanning, LEVEL_LABEL, type CoachProgram } from '@/lib/coach/programs'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }

export default function ProgramDetailView({ program, coachName, coachSlug }: { program: CoachProgram; coachName?: string | null; coachSlug?: string | null }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const p = program
  const sessions = p.structure.reduce((n, w) => n + w.sessions.length, 0)

  const add = async () => {
    if (adding) return
    setAdding(true); setErr(null)
    try { setAdded(await addProgramToMyPlanning(p)) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Ajout impossible.') }
    finally { setAdding(false) }
  }

  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <div style={card}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,30px)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>{p.title}</h1>
        {p.objective && <p style={{ fontSize: 14.5, color: 'var(--primary)', fontWeight: 600, margin: '8px 0 0' }}>{p.objective}</p>}
        {coachName && (
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 0' }}>
            par {coachSlug ? <Link href={`/c/${coachSlug}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{coachName}</Link> : coachName}
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
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{SPORT_LABEL[s.sport] ?? s.sport}{s.duree ? ` · ${s.duree} min` : ''}{s.intensite ? ` · ${s.intensite}` : ''}</span>
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

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const primary: React.CSSProperties = { display: 'inline-block', padding: '11px 18px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
