'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramWizard — création d'un programme en 3 étapes :
//   1. Données principales (titre, sports, semaines, type de prépa, objectif)
//   2. Construction semaine par semaine (séances)
//   3. Récap (stats par sport) + Brouillon / Publié
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import {
  updateProgram, computeProgramStats, defaultTargetUnit, LEVEL_LABEL, PREP_LABEL,
  type CoachProgram, type ProgramWeek, type ProgramSession, type ProgramLevel, type PrepType, type ProgramTarget, type QuestionItem,
} from '@/lib/coach/programs'

const SPORTS: { key: string; label: string }[] = [
  { key: 'running', label: 'Course' }, { key: 'cycling', label: 'Vélo' }, { key: 'swim', label: 'Natation' },
  { key: 'gym', label: 'Renforcement' }, { key: 'hyrox', label: 'Hyrox' }, { key: 'trail', label: 'Trail' },
  { key: 'triathlon', label: 'Triathlon' }, { key: 'rowing', label: 'Aviron' },
]
const SPORT_LABEL: Record<string, string> = Object.fromEntries(SPORTS.map(s => [s.key, s.label]))
const PREPS: PrepType[] = ['endurance', 'force', 'hybride', 'competition', 'reprise', 'perte_poids']
const LEVELS: ProgramLevel[] = ['debutant', 'intermediaire', 'avance', 'tous']
const TYPES = ['Endurance', 'Sortie longue', 'Seuil', 'VMA / Intervalles', 'Récupération', 'Renforcement', 'Technique', 'Compétition', 'Repos']
const isDistanceSport = (s: string) => ['running', 'cycling', 'swim', 'trail', 'triathlon', 'rowing'].includes(s)

export default function ProgramWizard({ program, onDone }: { program: CoachProgram; onDone: (p: CoachProgram) => void }) {
  const [step, setStep] = useState(1)
  const [p, setP] = useState<CoachProgram>(program)
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<CoachProgram>) => setP(prev => ({ ...prev, ...patch }))

  // Assure `duration_weeks` semaines dans la structure (sans perdre l'existant).
  const weeks: ProgramWeek[] = (() => {
    const w = [...p.structure]
    while (w.length < p.duration_weeks) w.push({ label: `Semaine ${w.length + 1}`, sessions: [] })
    return w
  })()
  const setWeeks = (w: ProgramWeek[]) => set({ structure: w })
  const setWeek = (i: number, patch: Partial<ProgramWeek>) => setWeeks(weeks.map((w, j) => j === i ? { ...w, ...patch } : w))
  const addSession = (wi: number) => setWeek(wi, { sessions: [...weeks[wi].sessions, { nom: '', sport: p.sports[0] ?? 'running' }] })
  const setSession = (wi: number, si: number, patch: Partial<ProgramSession>) => setWeek(wi, { sessions: weeks[wi].sessions.map((s, j) => j === si ? { ...s, ...patch } : s) })
  const setTarget = (wi: number, si: number, patch: Partial<ProgramTarget>) => {
    const cur = weeks[wi].sessions[si].target ?? {}
    setSession(wi, si, { target: { ...cur, ...patch } })
  }
  const removeSession = (wi: number, si: number) => setWeek(wi, { sessions: weeks[wi].sessions.filter((_, j) => j !== si) })
  const toggleSport = (k: string) => set({ sports: p.sports.includes(k) ? p.sports.filter(x => x !== k) : [...p.sports, k] })
  const addQuestion = () => set({ questionnaire: [...p.questionnaire, { id: `q_${Date.now()}`, label: '', type: 'text' }] })
  const setQuestion = (i: number, patch: Partial<QuestionItem>) => set({ questionnaire: p.questionnaire.map((q, j) => j === i ? { ...q, ...patch } : q) })
  const removeQuestion = (i: number) => set({ questionnaire: p.questionnaire.filter((_, j) => j !== i) })

  const persist = async (patch: Partial<CoachProgram>) => {
    const next = { ...p, ...patch, structure: weeks }
    setP(next)
    await updateProgram(p.id, { title: next.title, description: next.description, objective: next.objective, prep_type: next.prep_type, sports: next.sports, level: next.level, duration_weeks: next.duration_weeks, structure: next.structure, published: next.published, price_cents: next.price_cents, trial_days: next.trial_days, ai_enabled: next.ai_enabled, questionnaire: next.questionnaire })
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

      {/* ── ÉTAPE 2 ── */}
      {step === 2 && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px' }}>Ajoute les séances de chaque semaine. Tu peux laisser une semaine vide (repos).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {weeks.map((w, wi) => (
              <div key={wi} style={{ ...card, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{w.label || `Semaine ${wi + 1}`}</div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{w.sessions.length} séance{w.sessions.length > 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {w.sessions.map((s, si) => (
                    <div key={si} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 12 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input value={s.nom} onChange={e => setSession(wi, si, { nom: e.target.value })} style={{ ...inp, flex: 2, minWidth: 150 }} placeholder="Nom de la séance" />
                        <select value={s.sport} onChange={e => setSession(wi, si, { sport: e.target.value })} style={{ ...inp, width: 120, flex: 'none' }}>
                          {SPORTS.map(sp => <option key={sp.key} value={sp.key}>{sp.label}</option>)}
                        </select>
                        <select value={s.type ?? ''} onChange={e => setSession(wi, si, { type: e.target.value || undefined })} style={{ ...inp, width: 150, flex: 'none' }}>
                          <option value="">Type</option>
                          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => removeSession(wi, si)} aria-label="Retirer" style={removeBtn}>×</button>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <LabeledInput label="Durée" unit="min" value={s.duree} onChange={v => setSession(wi, si, { duree: v })} />
                        {isDistanceSport(s.sport) && <LabeledInput label="Distance" unit={s.sport === 'swim' ? 'm' : 'km'} value={s.distance} onChange={v => setSession(wi, si, { distance: v })} />}
                        <LabeledInput label="RPE" unit="/10" value={s.rpe} onChange={v => setSession(wi, si, { rpe: v })} max={10} />
                        <input value={s.description ?? ''} onChange={e => setSession(wi, si, { description: e.target.value })} style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Détail (optionnel)" />
                      </div>
                      {/* Cible d'effort : fourchette + relatif */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 700 }}>Cible</span>
                        <input value={s.target?.low ?? ''} onChange={e => setTarget(wi, si, { low: e.target.value || undefined })} placeholder="de" style={{ ...inp, width: 70, flex: 'none', padding: '8px 10px' }} />
                        <span style={{ color: 'var(--text-dim)' }}>→</span>
                        <input value={s.target?.high ?? ''} onChange={e => setTarget(wi, si, { high: e.target.value || undefined })} placeholder="à" style={{ ...inp, width: 70, flex: 'none', padding: '8px 10px' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 34 }}>{defaultTargetUnit(s.sport)}</span>
                        <input value={s.target?.relative ?? ''} onChange={e => setTarget(wi, si, { relative: e.target.value || undefined })} placeholder="ou en relatif — Zone 4, 85–90 % FTP, allure 10k +10s" style={{ ...inp, flex: 1, minWidth: 180, padding: '8px 10px' }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addSession(wi)} style={addBtn}>+ Ajouter une séance</button>
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

          <div style={secLbl}>Par sport</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.bySport.length === 0 ? <Empty>Aucune séance renseignée.</Empty> : stats.bySport.map(s => (
              <div key={s.sport} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sportDot(s.sport), flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{SPORT_LABEL[s.sport] ?? s.sport}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }} className="tnum">
                  {s.sessions} séances · {Math.round(s.minutes / 60 * 10) / 10} h{s.rpe ? ` · RPE ${s.rpe}` : ''}{s.distance ? ` · ${s.distance} ${s.sport === 'swim' ? 'm' : 'km'}` : ''}
                </span>
              </div>
            ))}
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

function LabeledInput({ label, unit, value, onChange, max }: { label: string; unit: string; value?: number; onChange: (v: number | undefined) => void; max?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', borderRadius: 'var(--r-md)', padding: '6px 10px' }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 600 }}>{label}</span>
      <input type="number" min={0} max={max} value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
        style={{ width: 52, border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{unit}</span>
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
