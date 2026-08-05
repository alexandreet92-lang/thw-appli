'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramDetailView — détail d'un programme : achat (marketplace), accès,
// personnalisation IA (questionnaire → cibles absolues), ajout au planning.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  addProgramToMyPlanning, hasProgramAccess, getMyProgramInstance,
  LEVEL_LABEL, type CoachProgram, type ProgramWeek,
} from '@/lib/coach/programs'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }

export default function ProgramDetailView({ program, coachName, coachSlug }: { program: CoachProgram; coachName?: string | null; coachSlug?: string | null }) {
  const p = program
  const [access, setAccess] = useState<boolean | null>(null)
  const [instance, setInstance] = useState<ProgramWeek[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [askQ, setAskQ] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    void hasProgramAccess(p).then(setAccess).catch(() => setAccess(false))
    void getMyProgramInstance(p.id).then(setInstance).catch(() => {})
  }, [p])

  const structure = instance ?? p.structure
  const sessions = structure.reduce((n, w) => n + w.sessions.length, 0)
  const priceEur = (p.price_cents / 100).toFixed(p.price_cents % 100 === 0 ? 0 : 2)

  const buy = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/programs/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: p.id }) })
      const d = await r.json()
      if (d.url) window.location.href = d.url
      else setErr(d.error ?? 'Paiement impossible.')
    } catch { setErr('Erreur réseau.') } finally { setBusy(false) }
  }

  const personalize = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/programs/personalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: p.id, answers }) })
      const d = await r.json()
      if (d.structure) { setInstance(d.structure); setAskQ(false) }
      else setErr(d.error ?? 'Personnalisation impossible.')
    } catch { setErr('Erreur réseau.') } finally { setBusy(false) }
  }

  const startPersonalize = () => { if (p.questionnaire.length > 0) setAskQ(true); else void personalize() }

  const add = async () => {
    setBusy(true); setErr(null)
    try { setAdded(await addProgramToMyPlanning({ ...p, structure })) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Ajout impossible.') }
    finally { setBusy(false) }
  }

  // Aperçu limité si pas d'accès (payant, non acheté) : 1ʳᵉ semaine seulement.
  const locked = access === false
  const shownWeeks = locked ? structure.slice(0, 1) : structure

  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,30px)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15, flex: 1 }}>{p.title}</h1>
          {p.ai_enabled && <span style={{ padding: '5px 11px', borderRadius: 999, background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>IA</span>}
        </div>
        {p.objective && <p style={{ fontSize: 14.5, color: 'var(--primary)', fontWeight: 600, margin: '8px 0 0' }}>{p.objective}</p>}
        {coachName && (
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 0' }}>
            par {coachSlug ? <Link href={`/c/${coachSlug}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{coachName}</Link> : coachName}
          </p>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-dim)', margin: '10px 0 0' }}>
          <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks}</span> semaines · <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{sessions}</span> séances{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}
        </div>
        {p.description && <p style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.6, margin: '18px 0 0', whiteSpace: 'pre-wrap' as const }}>{p.description}</p>}

        {/* Actions */}
        <div style={{ marginTop: 22 }}>
          {access === null ? null : locked ? (
            <>
              <button onClick={buy} disabled={busy} style={{ ...primary, minWidth: 220 }}>{busy ? '…' : `Acheter — ${priceEur} €`}</button>
              {p.trial_days > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '8px 0 0' }}>Essai {p.trial_days} j inclus.</p>}
            </>
          ) : added !== null ? (
            <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Ajouté à ton planning ✓</p>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 10px' }}><span className="tnum">{added}</span> séances placées à partir de cette semaine.</p>
              <Link href="/planning" style={{ ...primary, textDecoration: 'none' }}>Voir mon planning</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {p.ai_enabled && !instance && <button onClick={startPersonalize} disabled={busy} style={{ ...primary, minWidth: 200 }}>{busy ? 'Personnalisation…' : 'Personnaliser avec l’IA'}</button>}
              <button onClick={add} disabled={busy} style={instance || !p.ai_enabled ? { ...primary, minWidth: 200 } : ghost}>Ajouter à mon planning</button>
            </div>
          )}
          {instance && <p style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, margin: '10px 0 0' }}>Cibles personnalisées pour toi ✓</p>}
          {err && <p style={{ fontSize: 12.5, color: 'var(--danger, #ef4444)', margin: '10px 0 0' }}>{err} {err.toLowerCase().includes('connecte') && <Link href="/auth" style={{ color: 'var(--primary)', fontWeight: 700 }}>Se connecter</Link>}</p>}
        </div>
      </div>

      {/* Questionnaire IA */}
      {askQ && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Quelques questions</div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px' }}>Pour adapter le programme à toi.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {p.questionnaire.map(q => (
              <label key={q.id} style={{ display: 'block' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>{q.label || 'Question'}</span>
                <input type={q.type === 'number' ? 'number' : 'text'} value={answers[q.label] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.label]: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }} />
              </label>
            ))}
          </div>
          <button onClick={() => void personalize()} disabled={busy} style={{ ...primary, marginTop: 16, minWidth: 180 }}>{busy ? 'Personnalisation…' : 'Générer mon programme'}</button>
        </div>
      )}

      {/* Structure */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {shownWeeks.map((w, wi) => (
          <div key={wi} style={card}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{w.label || `Semaine ${wi + 1}`}</div>
            {w.sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Repos / semaine libre.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {w.sessions.map((s, si) => {
                  const t = s.target
                  const range = t && (t.low || t.high) ? `${t.low ?? ''}${t.high ? `–${t.high}` : ''} ${t.unit ?? ''}`.trim() : null
                  const targetTxt = [range, t?.relative].filter(Boolean).join(' · ')
                  return (
                    <div key={si} style={{ padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0 }}>{s.nom || 'Séance'}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{SPORT_LABEL[s.sport] ?? s.sport}{s.duree ? ` · ${s.duree} min` : ''}{s.rpe ? ` · RPE ${s.rpe}` : ''}</span>
                      </div>
                      {(targetTxt || s.description) && (
                        <div style={{ paddingLeft: 17, marginTop: 4, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                          {targetTxt && <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Cible {targetTxt}</span>}
                          {targetTxt && s.description ? ' — ' : ''}{s.description}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
        {locked && structure.length > 1 && (
          <div style={{ ...card, textAlign: 'center', color: 'var(--text-dim)' }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>+ <span className="tnum">{structure.length - 1}</span> semaines — débloquées après l&apos;achat.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const primary: React.CSSProperties = { display: 'inline-block', padding: '11px 18px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const ghost: React.CSSProperties = { display: 'inline-block', padding: '11px 18px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
