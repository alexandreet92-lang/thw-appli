'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramWizard — création d'un programme en 3 étapes :
//   1. Données principales (titre, sports, semaines, type de prépa, objectif)
//   2. Construction semaine par semaine (séances)
//   3. Récap (stats par sport) + Brouillon / Publié
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import {
  updateProgram, computeProgramStats, LEVEL_LABEL, PREP_LABEL, SPORTTYPE_TO_KEY, KEY_TO_SPORTTYPE,
  type CoachProgram, type ProgramWeek, type ProgramSession, type ProgramLevel, type PrepType, type QuestionItem,
} from '@/lib/coach/programs'
import { SessionEditor } from '@/components/planning/SessionEditor'
import type { Session, SportType } from '@/app/planning/page'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** ProgramSession → Session (pour ouvrir le vrai éditeur en édition). */
function toSession(s: ProgramSession): Session {
  return {
    id: `ps_${Math.random().toString(36).slice(2)}`,
    sport: (s.sportType ?? KEY_TO_SPORTTYPE[s.sport] ?? 'run') as SportType,
    title: s.nom || '',
    time: '09:00',
    durationMin: s.duree ?? 60,
    status: 'planned',
    blocks: s.blocks ?? [],
    rpe: s.rpe ?? 5,
    dayIndex: s.day ?? 0,
    trainingTypes: s.trainingTypes,
    notes: s.notes,
  }
}
/** Session (retour de l'éditeur) → ProgramSession (stockée dans le programme). */
function fromSession(s: Session, day: number): ProgramSession {
  return {
    nom: s.title || 'Séance',
    sport: SPORTTYPE_TO_KEY[s.sport] ?? 'running',
    sportType: s.sport,
    duree: s.durationMin,
    rpe: s.rpe,
    blocks: s.blocks,
    trainingTypes: s.trainingTypes,
    notes: s.notes,
    day,
    type: (s.trainingTypes && s.trainingTypes[0]) || undefined,
  }
}

const SPORTS: { key: string; label: string }[] = [
  { key: 'running', label: 'Course' }, { key: 'cycling', label: 'Vélo' }, { key: 'swim', label: 'Natation' },
  { key: 'gym', label: 'Renforcement' }, { key: 'hyrox', label: 'Hyrox' }, { key: 'trail', label: 'Trail' },
  { key: 'triathlon', label: 'Triathlon' }, { key: 'rowing', label: 'Aviron' },
]
const SPORT_LABEL: Record<string, string> = Object.fromEntries(SPORTS.map(s => [s.key, s.label]))
const PREPS: PrepType[] = ['endurance', 'force', 'hybride', 'competition', 'reprise', 'perte_poids']
const LEVELS: ProgramLevel[] = ['debutant', 'intermediaire', 'avance', 'tous']

export default function ProgramWizard({ program, onDone }: { program: CoachProgram; onDone: (p: CoachProgram) => void }) {
  const [step, setStep] = useState(1)
  const [p, setP] = useState<CoachProgram>(program)
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<{ wi: number; si: number | null; day: number } | null>(null)
  const set = (patch: Partial<CoachProgram>) => setP(prev => ({ ...prev, ...patch }))

  // Assure `duration_weeks` semaines dans la structure (sans perdre l'existant).
  const weeks: ProgramWeek[] = (() => {
    const w = [...p.structure]
    while (w.length < p.duration_weeks) w.push({ label: `Semaine ${w.length + 1}`, sessions: [] })
    return w
  })()
  const setWeeks = (w: ProgramWeek[]) => set({ structure: w })
  const setWeek = (i: number, patch: Partial<ProgramWeek>) => setWeeks(weeks.map((w, j) => j === i ? { ...w, ...patch } : w))
  const removeSession = (wi: number, si: number) => setWeek(wi, { sessions: weeks[wi].sessions.filter((_, j) => j !== si) })
  const onEditorSave = (s: Session) => {
    if (!editor) return
    const ps = fromSession(s, editor.day)
    const cur = weeks[editor.wi].sessions
    const next = editor.si === null ? [...cur, ps] : cur.map((x, j) => j === editor.si ? ps : x)
    setWeek(editor.wi, { sessions: next })
    setEditor(null)
  }
  const toggleSport = (k: string) => set({ sports: p.sports.includes(k) ? p.sports.filter(x => x !== k) : [...p.sports, k] })
  const addPhase = () => set({ phases: [...p.phases, { label: '', fromWeek: 1, toWeek: Math.min(p.duration_weeks, 3) }] })
  const setPhase = (i: number, patch: Partial<CoachProgram['phases'][number]>) => set({ phases: p.phases.map((ph, j) => j === i ? { ...ph, ...patch } : ph) })
  const removePhase = (i: number) => set({ phases: p.phases.filter((_, j) => j !== i) })
  const addQuestion = () => set({ questionnaire: [...p.questionnaire, { id: `q_${Date.now()}`, label: '', type: 'text' }] })
  const setQuestion = (i: number, patch: Partial<QuestionItem>) => set({ questionnaire: p.questionnaire.map((q, j) => j === i ? { ...q, ...patch } : q) })
  const removeQuestion = (i: number) => set({ questionnaire: p.questionnaire.filter((_, j) => j !== i) })

  const persist = async (patch: Partial<CoachProgram>) => {
    const next = { ...p, ...patch, structure: weeks }
    setP(next)
    await updateProgram(p.id, { title: next.title, description: next.description, objective: next.objective, prep_type: next.prep_type, sports: next.sports, level: next.level, duration_weeks: next.duration_weeks, structure: next.structure, published: next.published, price_cents: next.price_cents, trial_days: next.trial_days, ai_enabled: next.ai_enabled, questionnaire: next.questionnaire, phases: next.phases })
    return next
  }

  const goNext = async () => { setBusy(true); try { await persist({}) ; setStep(s => s + 1) } finally { setBusy(false) } }
  const finish = async (published: boolean) => { setBusy(true); try { const next = await persist({ published }); onDone(next) } finally { setBusy(false) } }

  const stats = computeProgramStats(weeks)

  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      {/* Fil des étapes */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['Programme', 'Séances', 'Récap'].map((lbl, i) => (
          <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 4, borderRadius: 999, background: step >= i + 1 ? 'var(--primary)' : 'var(--bg-card2)' }} />
            <div style={{ fontSize: 11.5, fontWeight: 700, color: step >= i + 1 ? 'var(--text)' : 'var(--text-dim)', marginTop: 6 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ── ÉTAPE 1 ── */}
      {step === 1 && (
        <div style={card}>
          <Field label="Titre du programme"><input value={p.title} onChange={e => set({ title: e.target.value })} style={inp} placeholder="Prépa 10 km" /></Field>
          <Field label="Objectif" hint="ex. Prépa 10 km sub 40′ · Prépa marathon sub 3h30"><input value={p.objective ?? ''} onChange={e => set({ objective: e.target.value })} style={inp} placeholder="Prépa 10 km sub 40′" /></Field>

          <div style={secLbl}>Type de préparation</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PREPS.map(t => {
              const on = p.prep_type === t
              return <button key={t} onClick={() => set({ prep_type: on ? null : t })} style={chip(on)}>{PREP_LABEL[t]}</button>
            })}
          </div>

          <div style={secLbl}>Sports</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPORTS.map(s => <button key={s.key} onClick={() => toggleSport(s.key)} style={chip(p.sports.includes(s.key))}>{s.label}</button>)}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Durée (semaines)" style={{ width: 150, flex: 'none' }}>
              <input type="number" min={1} max={52} value={p.duration_weeks} onChange={e => set({ duration_weeks: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })} style={inp} />
            </Field>
            <Field label="Niveau" style={{ flex: 1, minWidth: 160 }}>
              <select value={p.level ?? ''} onChange={e => set({ level: (e.target.value || null) as ProgramLevel | null })} style={inp}>
                <option value="">—</option>
                {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Description (optionnel)"><textarea value={p.description ?? ''} onChange={e => set({ description: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="À qui s'adresse ce programme, prérequis, philosophie…" /></Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
            <button onClick={goNext} disabled={busy || !p.title.trim()} style={{ ...primary, minWidth: 160, opacity: busy || !p.title.trim() ? 0.55 : 1 }}>Continuer →</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 — construction semaine/jour avec le VRAI éditeur ── */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px' }}>Clique un jour pour créer une séance dans le vrai éditeur du planning (blocs, zones, intervalles). Semaine vide = repos.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {weeks.map((w, wi) => (
              <div key={wi} style={{ ...card, padding: 16 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{w.label || `Semaine ${wi + 1}`}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {DAY_LABELS.map((dl, day) => {
                    const daySessions = w.sessions.map((s, si) => ({ s, si })).filter(({ s }) => (s.day ?? 0) === day)
                    return (
                      <div key={day} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 6, minHeight: 92, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'center' }}>{dl}</div>
                        {daySessions.map(({ s, si }) => (
                          <button key={si} onClick={() => setEditor({ wi, si, day })}
                            style={{ border: 'none', borderRadius: 'var(--r-sm)', padding: '6px 5px', cursor: 'pointer', textAlign: 'left', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sportDot(s.sport) }} />
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, wordBreak: 'break-word' }}>{s.nom || 'Séance'}</span>
                            {s.duree ? <span className="tnum" style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{s.duree}′</span> : null}
                          </button>
                        ))}
                        <button onClick={() => setEditor({ wi, si: null, day })} aria-label="Ajouter"
                          style={{ marginTop: 'auto', border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--primary)', fontSize: 16, cursor: 'pointer', padding: '2px 0' }}>+</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
            <button onClick={() => setStep(1)} style={ghost}>← Retour</button>
            <button onClick={goNext} disabled={busy} style={{ ...primary, minWidth: 160 }}>{busy ? '…' : 'Continuer →'}</button>
          </div>
        </div>
      )}

      {/* Le VRAI éditeur de séance du planning (mode réserve : sans date) */}
      {editor && (
        <SessionEditor
          mode={editor.si === null ? 'create' : 'edit'}
          reserveMode
          session={editor.si === null ? undefined : toSession(weeks[editor.wi].sessions[editor.si])}
          initialSport={editor.si === null ? (KEY_TO_SPORTTYPE[p.sports[0]] ?? 'run') : undefined}
          onClose={() => setEditor(null)}
          onSave={onEditorSave}
          onDelete={editor.si !== null ? () => { removeSession(editor.wi, editor.si as number); setEditor(null) } : undefined}
        />
      )}

      {/* ── ÉTAPE 3 ── */}
      {step === 3 && (
        <div style={card}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.title}</div>
          {p.objective && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 14 }}>{p.objective}</div>}

          <div style={{ display: 'flex', gap: 26, marginBottom: 18 }}>
            <Stat n={p.duration_weeks} label="Semaines" />
            <Stat n={stats.total} label="Séances" />
            <Stat n={Math.round(stats.minutes / 60)} label="Heures" />
          </div>

          {/* Volume par sport — jauges horizontales alignées */}
          <div style={secLbl}>Volume par sport</div>
          {stats.bySport.length === 0 ? <Empty>Aucune séance renseignée.</Empty> : (() => {
            const maxMin = Math.max(1, ...stats.bySport.map(s => s.minutes))
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.bySport.map(s => (
                  <div key={s.sport} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: sportDot(s.sport), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{SPORT_LABEL[s.sport] ?? s.sport}</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: 'var(--bg-card2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(s.minutes / maxMin * 100)}%`, borderRadius: 999, background: sportDot(s.sport), transition: 'width 700ms ease' }} />
                    </div>
                    <span className="tnum" style={{ fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {s.sessions} séa · {Math.round(s.minutes / 60 * 10) / 10} h{s.distance ? ` · ${s.distance} ${s.sport === 'swim' ? 'm' : 'km'}` : ''}{s.rpe ? ` · RPE ${s.rpe}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Phases de préparation */}
          <div style={secLbl}>Phases de préparation</div>
          {/* Timeline visuelle des phases */}
          {p.phases.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {p.phases.map((ph, i) => {
                const span = Math.max(1, (ph.toWeek - ph.fromWeek + 1))
                return (
                  <div key={i} style={{ flex: span, minWidth: 0 }}>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--primary)', opacity: 0.35 + (i % 3) * 0.22 }} />
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.label || 'Phase'}</div>
                    <div className="tnum" style={{ fontSize: 10, color: 'var(--text-dim)' }}>S{ph.fromWeek}–S{ph.toWeek}</div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.phases.map((ph, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={ph.label} onChange={e => setPhase(i, { label: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Nom de la phase (ex. Développement seuil)" />
                <input type="number" min={1} max={p.duration_weeks} value={ph.fromWeek} onChange={e => setPhase(i, { fromWeek: Math.max(1, Number(e.target.value) || 1) })} style={{ ...inp, width: 64, flex: 'none' }} aria-label="Semaine début" />
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <input type="number" min={1} max={p.duration_weeks} value={ph.toWeek} onChange={e => setPhase(i, { toWeek: Math.max(1, Number(e.target.value) || 1) })} style={{ ...inp, width: 64, flex: 'none' }} aria-label="Semaine fin" />
                <button onClick={() => removePhase(i)} aria-label="Retirer" style={removeBtn}>×</button>
              </div>
            ))}
            <button onClick={addPhase} style={addBtn}>+ Ajouter une phase</button>
          </div>

          {/* Vente */}
          <div style={secLbl}>Vente</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Prix (€)" hint="0 = gratuit" style={{ width: 130, flex: 'none' }}>
              <input type="number" min={0} step={1} value={p.price_cents ? p.price_cents / 100 : 0} onChange={e => set({ price_cents: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })} style={inp} />
            </Field>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Essai gratuit</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 3, 7].map(d => <button key={d} onClick={() => set({ trial_days: d })} style={chip(p.trial_days === d)}>{d === 0 ? 'Aucun' : `${d} j`}</button>)}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '8px 0 0' }}>
            {p.price_cents > 0 ? `Commission plateforme : ${p.ai_enabled ? 30 : 10} %. Tu reçois ${Math.round(p.price_cents * (p.ai_enabled ? 70 : 90) / 100) / 100} € par vente (avant frais Stripe).` : 'Programme gratuit — aucune commission.'}
          </p>

          {/* IA */}
          <div style={secLbl}>Programme intelligent (IA)</div>
          <Toggle on={p.ai_enabled} onClick={() => set({ ai_enabled: !p.ai_enabled })} label={p.ai_enabled ? 'IA activée — les cibles s’adaptent à chaque athlète' : 'Activer l’IA (cibles personnalisées par athlète)'} />
          {p.ai_enabled && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 10, lineHeight: 1.5 }}>Questionnaire (optionnel) : posé à l’athlète s’il manque de données. Sert à l’IA pour personnaliser.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.questionnaire.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={q.label} onChange={e => setQuestion(i, { label: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Question (ex. Ton meilleur 10 km ?)" />
                    <select value={q.type} onChange={e => setQuestion(i, { type: e.target.value as QuestionItem['type'] })} style={{ ...inp, width: 120, flex: 'none' }}>
                      <option value="text">Texte</option>
                      <option value="number">Nombre</option>
                    </select>
                    <button onClick={() => removeQuestion(i)} aria-label="Retirer" style={removeBtn}>×</button>
                  </div>
                ))}
                <button onClick={addQuestion} style={addBtn}>+ Ajouter une question</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={() => setStep(2)} style={ghost}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => void finish(false)} disabled={busy} style={ghost}>Enregistrer en brouillon</button>
            <button onClick={() => void finish(true)} disabled={busy} style={{ ...primary, minWidth: 150 }}>{busy ? '…' : 'Publier'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, children, style }: { label: string; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: 'block', margin: '14px 0 0', ...style }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>{label}{hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}> · {hint}</span>}</span>
      {children}
    </label>
  )
}
function Stat({ n, label }: { n: number; label: string }) {
  return <div><div className="tnum" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div></div>
}
function Empty({ children }: { children: React.ReactNode }) { return <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{children}</p> }
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
      <span style={{ width: 40, height: 24, borderRadius: 999, background: on ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 160ms', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 160ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </button>
  )
}

const SPORT_DOT: Record<string, string> = { running: '--sport-run', cycling: '--sport-bike', swim: '--sport-swim', gym: '--sport-gym', hyrox: '--sport-hyrox', rowing: '--sport-rowing', trail: '--sport-run', triathlon: '--sport-swim' }
function sportDot(s: string): string { return `var(${SPORT_DOT[s] ?? '--sport-run'})` }

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const secLbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '22px 0 10px' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }
const primary: React.CSSProperties = { padding: '11px 18px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '11px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }
const addBtn: React.CSSProperties = { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const removeBtn: React.CSSProperties = { width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card)', color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }
function chip(on: boolean): React.CSSProperties {
  return { padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }
}
