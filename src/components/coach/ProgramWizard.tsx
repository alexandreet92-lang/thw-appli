'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramWizard — création d'un programme coach en 4 étapes :
//   1. Programme     — titre, sports, semaines, type de prépa, objectif
//   2. Séances       — construction semaine/jour (VRAI éditeur), phases,
//                      types de journée, séances clés, conseils hebdo
//   3. Récap         — volume global, aperçu hebdo (barres empilées + charge),
//                      volume par sport, phases
//   4. Finalisation  — prix, essai, IA (+ explication détaillée), publication
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import {
  updateProgram, computeProgramFullStats, LEVEL_LABEL, PREP_LABEL, SPORTTYPE_TO_KEY, KEY_TO_SPORTTYPE,
  PHASE_PALETTE, DAY_TYPES, DAY_TYPE_LABEL, DAY_TYPE_COLOR,
  type CoachProgram, type ProgramWeek, type ProgramSession, type ProgramLevel, type PrepType, type QuestionItem, type DayType,
} from '@/lib/coach/programs'
import { SessionEditor } from '@/components/planning/SessionEditor'
import SlideSheet from '@/components/ui/SlideSheet'
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
/** Session (retour de l'éditeur) → ProgramSession, en préservant les métas programme. */
function fromSession(s: Session, day: number, prev?: ProgramSession): ProgramSession {
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
    key: prev?.key ?? false,
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
const STEPS = ['Programme', 'Séances', 'Récap', 'Finalisation']

export default function ProgramWizard({ program, onDone }: { program: CoachProgram; onDone: (p: CoachProgram) => void }) {
  const [step, setStep] = useState(1)
  const [p, setP] = useState<CoachProgram>(program)
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState<{ wi: number; si: number | null; day: number } | null>(null)
  const [aiSheet, setAiSheet] = useState(false)
  const [recapSport, setRecapSport] = useState<string>('all')
  const set = (patch: Partial<CoachProgram>) => setP(prev => ({ ...prev, ...patch }))

  // Assure `duration_weeks` semaines dans la structure (sans perdre l'existant).
  const weeks: ProgramWeek[] = (() => {
    const w = [...p.structure]
    while (w.length < p.duration_weeks) w.push({ label: `Semaine ${w.length + 1}`, sessions: [] })
    return w.slice(0, p.duration_weeks)
  })()
  const setWeeks = (w: ProgramWeek[]) => set({ structure: w })
  const setWeek = (i: number, patch: Partial<ProgramWeek>) => setWeeks(weeks.map((w, j) => j === i ? { ...w, ...patch } : w))
  const removeSession = (wi: number, si: number) => setWeek(wi, { sessions: weeks[wi].sessions.filter((_, j) => j !== si) })
  const toggleKey = (wi: number, si: number) => setWeek(wi, { sessions: weeks[wi].sessions.map((s, j) => j === si ? { ...s, key: !s.key } : s) })
  const cycleDayType = (wi: number, day: number) => {
    const cur = weeks[wi].dayTypes ?? Array(7).fill(null)
    const order: (DayType | null)[] = [null, ...DAY_TYPES]
    const idx = order.indexOf(cur[day] ?? null)
    const next = order[(idx + 1) % order.length]
    const dt = [...cur]; dt[day] = next
    setWeek(wi, { dayTypes: dt })
  }
  const onEditorSave = (s: Session) => {
    if (!editor) return
    const prev = editor.si === null ? undefined : weeks[editor.wi].sessions[editor.si]
    const ps = fromSession(s, editor.day, prev)
    const cur = weeks[editor.wi].sessions
    const next = editor.si === null ? [...cur, ps] : cur.map((x, j) => j === editor.si ? ps : x)
    setWeek(editor.wi, { sessions: next })
    setEditor(null)
  }
  const toggleSport = (k: string) => set({ sports: p.sports.includes(k) ? p.sports.filter(x => x !== k) : [...p.sports, k] })
  const addPhase = () => set({ phases: [...p.phases, { label: '', fromWeek: 1, toWeek: Math.min(p.duration_weeks, 3), color: PHASE_PALETTE[p.phases.length % PHASE_PALETTE.length] }] })
  const setPhase = (i: number, patch: Partial<CoachProgram['phases'][number]>) => set({ phases: p.phases.map((ph, j) => j === i ? { ...ph, ...patch } : ph) })
  const removePhase = (i: number) => set({ phases: p.phases.filter((_, j) => j !== i) })
  const addQuestion = () => set({ questionnaire: [...p.questionnaire, { id: `q_${Date.now()}`, label: '', type: 'text' }] })
  const setQuestion = (i: number, patch: Partial<QuestionItem>) => set({ questionnaire: p.questionnaire.map((q, j) => j === i ? { ...q, ...patch } : q) })
  const removeQuestion = (i: number) => set({ questionnaire: p.questionnaire.filter((_, j) => j !== i) })

  // Phase (couleur) à laquelle appartient une semaine (0-based) — pour teinter l'en-tête.
  const phaseOfWeek = (wi: number): { label: string; color: string } | null => {
    const w1 = wi + 1
    for (let i = 0; i < p.phases.length; i++) {
      const ph = p.phases[i]
      if (w1 >= ph.fromWeek && w1 <= ph.toWeek) return { label: ph.label || `Phase ${i + 1}`, color: ph.color || PHASE_PALETTE[i % PHASE_PALETTE.length] }
    }
    return null
  }

  const persist = async (patch: Partial<CoachProgram>) => {
    const next = { ...p, ...patch, structure: weeks }
    setP(next)
    await updateProgram(p.id, { title: next.title, description: next.description, objective: next.objective, prep_type: next.prep_type, sports: next.sports, level: next.level, duration_weeks: next.duration_weeks, structure: next.structure, published: next.published, price_cents: next.price_cents, trial_days: next.trial_days, ai_enabled: next.ai_enabled, questionnaire: next.questionnaire, phases: next.phases })
    return next
  }

  const goNext = async () => { setBusy(true); try { await persist({}); setStep(s => Math.min(STEPS.length, s + 1)) } finally { setBusy(false) } }
  const finish = async (published: boolean) => { setBusy(true); try { const next = await persist({ published }); onDone(next) } finally { setBusy(false) } }

  const stats = computeProgramFullStats(weeks)

  return (
    <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      {/* Fil des étapes */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STEPS.map((lbl, i) => (
          <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 4, borderRadius: 999, background: step >= i + 1 ? 'var(--primary)' : 'var(--bg-card2)' }} />
            <div style={{ fontSize: 11.5, fontWeight: 700, color: step >= i + 1 ? 'var(--text)' : 'var(--text-dim)', marginTop: 6 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* ── ÉTAPE 1 — Programme ── */}
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
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>Un programme peut mêler plusieurs sports. Tu choisiras le sport de chaque séance dans l’éditeur.</p>
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

      {/* ── ÉTAPE 2 — Séances ── */}
      {step === 2 && (
        <div>
          {/* Phases de préparation (bandes de couleur sur les semaines) */}
          <div style={{ ...card, padding: 16, marginBottom: 14 }}>
            <div style={secLbl0}>Phases de préparation</div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>Chaque phase colore une plage de semaines (ex. Développement, Affûtage).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.phases.map((ph, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {PHASE_PALETTE.map(c => (
                      <button key={c} onClick={() => setPhase(i, { color: c })} aria-label="Couleur"
                        style={{ width: 20, height: 20, borderRadius: 999, border: (ph.color ?? PHASE_PALETTE[i % PHASE_PALETTE.length]) === c ? '2px solid var(--text)' : '2px solid transparent', background: c, cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                  <input value={ph.label} onChange={e => setPhase(i, { label: e.target.value })} style={{ ...inp, flex: 1, minWidth: 150 }} placeholder="Nom de la phase" />
                  <input type="number" min={1} max={p.duration_weeks} value={ph.fromWeek} onChange={e => setPhase(i, { fromWeek: Math.max(1, Math.min(p.duration_weeks, Number(e.target.value) || 1)) })} style={{ ...inp, width: 60, flex: 'none' }} aria-label="Semaine début" />
                  <span style={{ color: 'var(--text-dim)' }}>→</span>
                  <input type="number" min={1} max={p.duration_weeks} value={ph.toWeek} onChange={e => setPhase(i, { toWeek: Math.max(1, Math.min(p.duration_weeks, Number(e.target.value) || 1)) })} style={{ ...inp, width: 60, flex: 'none' }} aria-label="Semaine fin" />
                  <button onClick={() => removePhase(i)} aria-label="Retirer" style={removeBtn}>×</button>
                </div>
              ))}
              <button onClick={addPhase} style={addBtn}>+ Ajouter une phase</button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px' }}>Clique un jour pour créer une séance dans le vrai éditeur (blocs, zones, %VMA/%PMA). L’étoile marque une séance clé. Clique un jour (en-tête) pour définir son intensité.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {weeks.map((w, wi) => {
              const ph = phaseOfWeek(wi)
              const wk = stats.weekly[wi]
              const dayTypes = w.dayTypes ?? Array(7).fill(null)
              const sportsInWeek = Object.entries(wk?.minutesBySport ?? {}).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1])
              return (
                <div key={wi} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  {/* Bande de phase */}
                  <div style={{ height: 4, background: ph ? ph.color : 'var(--bg-card2)' }} />
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{w.label || `Semaine ${wi + 1}`}</div>
                      {ph && <span style={{ fontSize: 10.5, fontWeight: 700, color: ph.color, background: 'var(--bg-card2)', borderRadius: 999, padding: '2px 9px' }}>{ph.label}</span>}
                      <span style={{ flex: 1 }} />
                      {wk && wk.hours > 0 && <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)' }}>{wk.hours} h</span>}
                    </div>

                    {/* Grille 7 jours */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                      {DAY_LABELS.map((dl, day) => {
                        const dt = dayTypes[day] as DayType | null
                        const daySessions = w.sessions.map((s, si) => ({ s, si })).filter(({ s }) => (s.day ?? 0) === day)
                        return (
                          <div key={day} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 6, minHeight: 96, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <button onClick={() => cycleDayType(wi, day)} title="Type de journée"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)' }}>{dl}</span>
                              <span style={{ width: 22, height: 3, borderRadius: 2, background: dt ? DAY_TYPE_COLOR[dt] : 'transparent' }} />
                            </button>
                            {daySessions.map(({ s, si }) => (
                              <div key={si} style={{ position: 'relative', borderRadius: 'var(--r-sm)', background: 'var(--bg-card)' }}>
                                <button onClick={() => setEditor({ wi, si, day })}
                                  style={{ border: 'none', background: 'transparent', borderRadius: 'var(--r-sm)', padding: '6px 5px', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sportDot(s.sport) }} />
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, wordBreak: 'break-word', paddingRight: 12 }}>{s.nom || 'Séance'}</span>
                                  {s.duree ? <span className="tnum" style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{s.duree}′</span> : null}
                                </button>
                                <button onClick={() => toggleKey(wi, si)} aria-label="Séance clé" title="Séance clé"
                                  style={{ position: 'absolute', top: 2, right: 2, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                                  <Star filled={!!s.key} />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => setEditor({ wi, si: null, day })} aria-label="Ajouter"
                              style={{ marginTop: 'auto', border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--primary)', fontSize: 16, cursor: 'pointer', padding: '2px 0' }}>+</button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Volume par sport de la semaine */}
                    {sportsInWeek.length > 0 && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                        {sportsInWeek.map(([sp, m]) => (
                          <span key={sp} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-mid)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: sportDot(sp) }} />
                            {SPORT_LABEL[sp] ?? sp} <strong className="tnum">{Math.round(m / 60 * 10) / 10} h</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Conseil de la semaine (colonne coach) */}
                    <textarea value={w.notes ?? ''} onChange={e => setWeek(wi, { notes: e.target.value })} rows={2}
                      placeholder="Conseil de la semaine (charge, focus, récupération…)"
                      style={{ ...inp, marginTop: 10, resize: 'vertical', fontSize: 13 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Légende types de journée */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
            {DAY_TYPES.map(d => (
              <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-dim)' }}>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: DAY_TYPE_COLOR[d] }} />{DAY_TYPE_LABEL[d]}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
            <button onClick={() => setStep(1)} style={ghost}>← Retour</button>
            <button onClick={goNext} disabled={busy} style={{ ...primary, minWidth: 160 }}>{busy ? '…' : 'Continuer →'}</button>
          </div>
        </div>
      )}

      {/* Le VRAI éditeur de séance (mode programme : multi-sport, sans zones athlète) */}
      {editor && (
        <SessionEditor
          mode={editor.si === null ? 'create' : 'edit'}
          reserveMode
          programMode
          session={editor.si === null ? undefined : toSession(weeks[editor.wi].sessions[editor.si])}
          initialSport={editor.si === null ? (KEY_TO_SPORTTYPE[p.sports[0]] ?? 'run') : undefined}
          onClose={() => setEditor(null)}
          onSave={onEditorSave}
          onDelete={editor.si !== null ? () => { removeSession(editor.wi, editor.si as number); setEditor(null) } : undefined}
        />
      )}

      {/* ── ÉTAPE 3 — Récap ── */}
      {step === 3 && (
        <div style={card}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.title}</div>
          {p.objective && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 14 }}>{p.objective}</div>}

          {/* Volume global du programme */}
          <div style={secLbl0}>Volume global</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 6 }}>
            <Stat n={p.duration_weeks} label="Semaines" />
            <Stat n={stats.base.total} label="Séances" />
            <Stat n={stats.totalHours} label="Heures" />
            <Stat n={stats.enduranceSessions} label="Endurance" />
            <Stat n={stats.qualitySessions} label="Seuil / max / spé" />
            {stats.avgRpe != null && <Stat n={stats.avgRpe} label="RPE moyen" />}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 6 }}>
            {stats.busiestWeek && <span>Semaine la plus chargée : <strong>S{stats.busiestWeek.index + 1}</strong> · {stats.busiestWeek.hours} h</span>}
            {stats.longestSession && <span>Séance la plus longue : <strong>{stats.longestSession.nom}</strong> · {stats.longestSession.duree}′ <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>(S{stats.longestSession.weekIndex + 1} · {DAY_LABELS[stats.longestSession.day]})</span></span>}
          </div>

          {/* Aperçu hebdomadaire — barres empilées par sport */}
          <div style={secLbl}>Aperçu hebdomadaire</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={() => setRecapSport('all')} style={chip(recapSport === 'all')}>Tous</button>
            {stats.base.bySport.map(s => <button key={s.sport} onClick={() => setRecapSport(s.sport)} style={chip(recapSport === s.sport)}>{SPORT_LABEL[s.sport] ?? s.sport}</button>)}
          </div>
          <WeeklyBars weekly={stats.weekly} recapSport={recapSport} />

          {/* Charge estimée (SN/SM proxy) par semaine */}
          <div style={secLbl}>Charge estimée par semaine <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>· proxy fatigue (durée × intensité)</span></div>
          <LoadLine weekly={stats.weekly} />

          {/* Volume par sport — jauges horizontales */}
          <div style={secLbl}>Volume par sport</div>
          {stats.base.bySport.length === 0 ? <Empty>Aucune séance renseignée.</Empty> : (() => {
            const maxMin = Math.max(1, ...stats.base.bySport.map(s => s.minutes))
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.base.bySport.map(s => (
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

          {/* Phases — timeline colorée */}
          {p.phases.length > 0 && (
            <>
              <div style={secLbl}>Phases</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {p.phases.map((ph, i) => {
                  const span = Math.max(1, ph.toWeek - ph.fromWeek + 1)
                  const col = ph.color || PHASE_PALETTE[i % PHASE_PALETTE.length]
                  return (
                    <div key={i} style={{ flex: span, minWidth: 0 }}>
                      <div style={{ height: 8, borderRadius: 999, background: col }} />
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.label || 'Phase'}</div>
                      <div className="tnum" style={{ fontSize: 10, color: 'var(--text-dim)' }}>S{ph.fromWeek}–S{ph.toWeek}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={ghost}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button onClick={goNext} disabled={busy} style={{ ...primary, minWidth: 150 }}>{busy ? '…' : 'Continuer →'}</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 — Finalisation ── */}
      {step === 4 && (
        <div style={card}>
          <div style={secLbl0}>Prix du programme</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)', lineHeight: 1, fontSize: 'clamp(44px,10vw,72px)', fontVariantNumeric: 'tabular-nums' }}>
              {p.price_cents > 0 ? `${p.price_cents / 100}` : 'Gratuit'}
              {p.price_cents > 0 && <span style={{ fontSize: '0.4em', fontWeight: 600, color: 'var(--text-mid)', marginLeft: 4 }}>€</span>}
            </div>
            <Field label="Modifier le prix (€)" hint="0 = gratuit" style={{ width: 150, flex: 'none', margin: 0 }}>
              <input type="number" min={0} step={1} value={p.price_cents ? p.price_cents / 100 : 0} onChange={e => set({ price_cents: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })} style={inp} />
            </Field>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>
            {p.price_cents > 0 ? `Commission plateforme : ${p.ai_enabled ? 30 : 10} %. Tu reçois ${Math.round(p.price_cents * (p.ai_enabled ? 70 : 90) / 100) / 100} € par vente (avant frais Stripe).` : 'Programme gratuit — aucune commission.'}
          </p>

          {/* Essai gratuit */}
          <div style={secLbl}>Essai gratuit</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 3, 7].map(d => <button key={d} onClick={() => set({ trial_days: d })} style={chip(p.trial_days === d)}>{d === 0 ? 'Aucun' : `${d} jours`}</button>)}
          </div>

          {/* IA */}
          <div style={secLbl}>Programme intelligent (IA)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Toggle on={p.ai_enabled} onClick={() => set({ ai_enabled: !p.ai_enabled })} label={p.ai_enabled ? 'IA activée — cibles adaptées à chaque athlète' : 'Activer l’IA (cibles personnalisées)'} />
            <button onClick={() => setAiSheet(true)} style={{ ...addBtn, background: 'var(--bg-card2)' }}>Comment marche l’IA ? →</button>
          </div>
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
            <button onClick={() => setStep(3)} style={ghost}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => void finish(false)} disabled={busy} style={ghost}>Enregistrer en brouillon</button>
            <button onClick={() => void finish(true)} disabled={busy} style={{ ...primary, minWidth: 150 }}>{busy ? '…' : 'Publier'}</button>
          </div>
        </div>
      )}

      {/* Surpage : explication détaillée de l'IA */}
      <SlideSheet open={aiSheet} onClose={() => setAiSheet(false)} title="Le programme intelligent (IA)">
        <AiExplainer />
      </SlideSheet>
    </div>
  )
}

// ── Barres verticales empilées par sport (aperçu hebdo) ──
function WeeklyBars({ weekly, recapSport }: { weekly: { index: number; minutesBySport: Record<string, number> }[]; recapSport: string }) {
  const maxMin = Math.max(1, ...weekly.map(w => recapSport === 'all'
    ? Object.values(w.minutesBySport).reduce((a, b) => a + b, 0)
    : (w.minutesBySport[recapSport] ?? 0)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 140, padding: '0 2px 22px', overflowX: 'auto' }}>
      {weekly.map(w => {
        const entries = Object.entries(w.minutesBySport).filter(([sp, m]) => m > 0 && (recapSport === 'all' || sp === recapSport))
          .sort((a, b) => b[1] - a[1])   // plus gros volume en bas
        const total = entries.reduce((a, [, m]) => a + m, 0)
        return (
          <div key={w.index} style={{ flex: '1 0 18px', minWidth: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
            <div style={{ width: '78%', maxWidth: 26, display: 'flex', flexDirection: 'column-reverse', height: `${Math.round(total / maxMin * 100)}%`, borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
              {entries.map(([sp, m]) => (
                <div key={sp} title={`${SPORT_LABEL[sp] ?? sp} · ${Math.round(m / 60 * 10) / 10} h`} style={{ height: `${Math.round(m / total * 100)}%`, background: sportDot(sp) }} />
              ))}
            </div>
            <span style={{ position: 'absolute', bottom: -20, fontSize: 9.5, color: 'var(--text-dim)' }}>{w.index + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Ligne de charge estimée par semaine (SVG raw, pas de lib) ──
function LoadLine({ weekly }: { weekly: { index: number; load: number }[] }) {
  if (weekly.length === 0) return <Empty>Aucune donnée.</Empty>
  const max = Math.max(1, ...weekly.map(w => w.load))
  const W = 100, H = 40
  const step = weekly.length > 1 ? W / (weekly.length - 1) : 0
  const pts = weekly.map((w, i) => `${(i * step).toFixed(2)},${(H - (w.load / max) * (H - 6) - 3).toFixed(2)}`).join(' ')
  const area = `0,${H} ${pts} ${((weekly.length - 1) * step).toFixed(2)},${H}`
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 64, overflow: 'visible' }}>
        <polygon points={area} fill="var(--primary)" opacity={0.12} />
        <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {weekly.map((w, i) => (
          <circle key={i} cx={i * step} cy={H - (w.load / max) * (H - 6) - 3} r={1.6} fill="var(--primary)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}

// ── Contenu de la surpage IA ──
function AiExplainer() {
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
  const Ex = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '12px 14px', margin: '10px 0', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>{children}</div>
  )
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 64px' }}>
      <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.6, marginTop: 0 }}>
        Sans IA, ton programme est un modèle fixe : chaque athlète reçoit les mêmes séances. Avec l’IA, le programme s’<strong style={{ color: 'var(--text)' }}>adapte automatiquement à chaque athlète</strong> à partir de ses données (zones, seuils, historique) au moment où il le démarre.
      </p>

      <Block title="1. Des cibles relatives, pas absolues">
        Tu construis tes séances en <strong>pourcentages</strong> : %VMA en course, %PMA/FTP à vélo, zones de FC. Tu ne vois jamais l’allure ou la puissance exacte — parce qu’elle dépend de l’athlète.
        <Ex>Tu écris : <strong>« 6 × 3 min à 90 % VMA »</strong>.<br />L’athlète A (VMA 16) verra <strong>4:10/km</strong>. L’athlète B (VMA 20) verra <strong>3:20/km</strong>. Même séance, cibles personnalisées.</Ex>
      </Block>

      <Block title="2. Calage sur le niveau de l’athlète">
        À l’adoption, l’IA lit le profil de l’athlète (tests, activités Strava, seuils) et convertit chaque cible relative en valeur précise, avec ses propres zones d’allure / de puissance affichées.
      </Block>

      <Block title="3. Questionnaire de démarrage">
        Si des données manquent, l’IA pose les questions que <em>tu</em> as définies (record sur 10 km, disponibilité hebdo…) pour caler le programme sans attendre.
      </Block>

      <Block title="4. Ce que ça change pour toi">
        Un seul programme sert des athlètes de tous niveaux, sans réécriture. C’est la raison de la commission plus élevée sur les programmes IA — la personnalisation est prise en charge automatiquement à chaque vente.
      </Block>

      <Block title="Ce que l’IA ne fait pas">
        Elle ne réécrit pas ta logique d’entraînement ni l’ordre de tes séances : ta structure, tes phases et tes séances clés restent exactement telles que tu les as conçues. L’IA ne fait que traduire tes cibles relatives en valeurs concrètes pour chaque athlète.
      </Block>
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
        <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-card)', transition: 'left 160ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </button>
  )
}
function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'var(--charge-mid)' : 'none'} stroke={filled ? 'var(--charge-mid)' : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

const SPORT_DOT: Record<string, string> = { running: '--sport-run', cycling: '--sport-bike', swim: '--sport-swim', gym: '--sport-gym', hyrox: '--sport-hyrox', rowing: '--sport-rowing', trail: '--sport-run', triathlon: '--sport-swim' }
function sportDot(s: string): string { return `var(${SPORT_DOT[s] ?? '--sport-run'})` }

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const secLbl0: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px' }
const secLbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '22px 0 10px' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }
const primary: React.CSSProperties = { padding: '11px 18px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '11px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }
const addBtn: React.CSSProperties = { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const removeBtn: React.CSSProperties = { width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card)', color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }
function chip(on: boolean): React.CSSProperties {
  return { padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }
}
