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
import { useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { hidePricing } from '@/lib/native/platform'
import {
  updateProgram, computeProgramFullStats, LEVEL_LABEL, LEVEL_ORDER, PREP_LABEL, SPORTTYPE_TO_KEY, KEY_TO_SPORTTYPE,
  PHASE_PALETTE, DAY_TYPES, DAY_TYPE_LABEL, DAY_TYPE_COLOR, specialtiesForSport,
  type CoachProgram, type ProgramWeek, type ProgramSession, type ProgramLevel, type PrepType, type QuestionItem, type DayType,
} from '@/lib/coach/programs'

const SUMMARY_MAX = 140 // caractères — résumé court affiché sur la carte
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
const STEPS = ['Programme', 'Séances', 'Récap', 'Finalisation']

export default function ProgramWizard({ program, onDone }: { program: CoachProgram; onDone: (p: CoachProgram) => void }) {
  const { t } = useI18n()
  const hidePrice = hidePricing()
  const [step, setStep] = useState(1)
  const [p, setP] = useState<CoachProgram>(program)
  const [busy, setBusy] = useState(false)
  // editor : si=null → nouvelle séance ; variantIndex défini → on édite/crée une variante de la séance si.
  const [editor, setEditor] = useState<{ wi: number; si: number | null; day: number; variantIndex?: number } | null>(null)
  const [aiSheet, setAiSheet] = useState(false)
  const [recapSport, setRecapSport] = useState<string>('all')
  const [drag, setDrag] = useState<{ wi: number; si: number; x: number; y: number; label: string } | null>(null)
  const [repeatMenu, setRepeatMenu] = useState<{ wi: number; si: number } | null>(null)
  const dragRef = useRef<{ wi: number; si: number } | null>(null)
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
    const { wi, si, day, variantIndex } = editor
    // Enregistrement d'une VARIANTE d'une séance existante.
    if (si !== null && variantIndex != null) {
      const base = weeks[wi].sessions[si]
      const variants = [...(base.variants ?? [])]
      variants[variantIndex] = fromSession(s, day, variants[variantIndex])
      setWeek(wi, { sessions: weeks[wi].sessions.map((x, j) => j === si ? { ...x, variants } : x) })
      setEditor(null); return
    }
    const prev = si === null ? undefined : weeks[wi].sessions[si]
    const ps: ProgramSession = { ...fromSession(s, day, prev), variants: prev?.variants }
    const cur = weeks[wi].sessions
    const next = si === null ? [...cur, ps] : cur.map((x, j) => j === si ? ps : x)
    setWeek(wi, { sessions: next })
    setEditor(null)
  }

  // ── Drag & drop (souris + tactile) : déplacer une séance entre jours/semaines ──
  const cloneSession = (s: ProgramSession): ProgramSession => ({ ...s, blocks: s.blocks?.map(b => ({ ...b })), variants: s.variants?.map(cloneSession) })
  const moveSession = (wi: number, si: number, wi2: number, day2: number) => {
    const s = weeks[wi].sessions[si]; if (!s) return
    if (wi === wi2) { setWeek(wi, { sessions: weeks[wi].sessions.map((x, j) => j === si ? { ...x, day: day2 } : x) }); return }
    setWeeks(weeks.map((w, j) =>
      j === wi ? { ...w, sessions: w.sessions.filter((_, k) => k !== si) }
      : j === wi2 ? { ...w, sessions: [...w.sessions, { ...cloneSession(s), day: day2 }] }
      : w))
  }
  const onDrop = (clientX: number, clientY: number) => {
    const from = dragRef.current; dragRef.current = null; setDrag(null)
    if (!from) return
    const el = (document.elementFromPoint(clientX, clientY) as HTMLElement | null)?.closest('[data-daycell]') as HTMLElement | null
    if (!el) return
    const wi2 = Number(el.dataset.wi), day2 = Number(el.dataset.day)
    if (Number.isNaN(wi2) || Number.isNaN(day2)) return
    moveSession(from.wi, from.si, wi2, day2)
  }

  // ── Répéter une séance le même jour sur plusieurs semaines ──
  const repeatSession = (wi: number, si: number, mode: 'all' | 'alt' | number) => {
    const s = weeks[wi].sessions[si]; if (!s) return
    const targets: number[] = []
    if (mode === 'all') { for (let w = wi + 1; w < weeks.length; w++) targets.push(w) }
    else if (mode === 'alt') { for (let w = wi + 2; w < weeks.length; w += 2) targets.push(w) }
    else { for (let k = 1; k < mode && wi + k < weeks.length; k++) targets.push(wi + k) }
    setRepeatMenu(null)
    if (!targets.length) return
    setWeeks(weeks.map((w, j) => targets.includes(j) ? { ...w, sessions: [...w.sessions, cloneSession(s)] } : w))
  }

  // ── Variantes (« fais ça OU ça ») ──
  const addVariant = (wi: number, si: number) => setEditor({ wi, si, day: weeks[wi].sessions[si].day ?? 0, variantIndex: weeks[wi].sessions[si].variants?.length ?? 0 })
  const removeVariant = (wi: number, si: number, vi: number) => setWeek(wi, { sessions: weeks[wi].sessions.map((x, j) => j === si ? { ...x, variants: (x.variants ?? []).filter((_, k) => k !== vi) } : x) })
  const toggleSport = (k: string) => set({ sports: p.sports.includes(k) ? p.sports.filter(x => x !== k) : [...p.sports, k] })
  // Spécialités proposées = union des spécialités des sports sélectionnés.
  const specialtyOptions = Array.from(new Set(p.sports.flatMap(s => specialtiesForSport(s))))
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
    await updateProgram(p.id, { title: next.title, description: next.description, objective: next.objective, prep_type: next.prep_type, sports: next.sports, specialty: next.specialty, level: next.level, duration_weeks: next.duration_weeks, structure: next.structure, published: next.published, price_cents: next.price_cents, trial_days: next.trial_days, ai_enabled: next.ai_enabled, questionnaire: next.questionnaire, phases: next.phases })
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
          <Field label={t('w1d.programTitle')}><input value={p.title} onChange={e => set({ title: e.target.value })} style={inp} placeholder={t('w1d.programTitlePh')} /></Field>
          <Field label={t('w1d.objective')} hint={t('w1d.objectiveHint')}><input value={p.objective ?? ''} onChange={e => set({ objective: e.target.value })} style={inp} placeholder={t('w1d.objectivePh')} /></Field>

          <div style={secLbl}>{t('w1d.prepType')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PREPS.map(t => {
              const on = p.prep_type === t
              return <button key={t} onClick={() => set({ prep_type: on ? null : t })} style={chip(on)}>{PREP_LABEL[t]}</button>
            })}
          </div>

          <div style={secLbl}>{t('w1d.sports')}</div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>{t('w1d.sportsHelp')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPORTS.map(s => <button key={s.key} onClick={() => toggleSport(s.key)} style={chip(p.sports.includes(s.key))}>{s.label}</button>)}
          </div>

          {/* Spécialité (selon les sports choisis) — 2ᵉ filtre du catalogue */}
          {specialtyOptions.length > 0 && (
            <>
              <div style={secLbl}>{t('w1d.specialty')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {specialtyOptions.map(sp => <button key={sp} onClick={() => set({ specialty: p.specialty === sp ? null : sp })} style={chip(p.specialty === sp)}>{sp}</button>)}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label={t('w1d.durationWeeks')} style={{ width: 150, flex: 'none' }}>
              <input type="number" min={1} max={52} value={p.duration_weeks} onChange={e => set({ duration_weeks: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })} style={inp} />
            </Field>
            <Field label={t('w1d.level')} style={{ flex: 1, minWidth: 160 }}>
              <select value={p.level ?? ''} onChange={e => set({ level: (e.target.value || null) as ProgramLevel | null })} style={inp}>
                <option value="">—</option>
                {LEVEL_ORDER.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </select>
            </Field>
          </div>

          <Field label={t('w1d.summary')} hint={t('w1d.summaryHint', { len: (p.description ?? '').length, max: SUMMARY_MAX })}>
            <textarea value={p.description ?? ''} onChange={e => set({ description: e.target.value.slice(0, SUMMARY_MAX) })} rows={2} maxLength={SUMMARY_MAX} style={{ ...inp, resize: 'vertical' }} placeholder={t('w1d.summaryPh')} />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
            <button onClick={goNext} disabled={busy || !p.title.trim()} style={{ ...primary, minWidth: 160, opacity: busy || !p.title.trim() ? 0.55 : 1 }}>{t('w1d.continue')}</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 — Séances ── */}
      {step === 2 && (
        <div>
          {/* Phases de préparation (bandes de couleur sur les semaines) */}
          <div style={{ ...card, padding: 16, marginBottom: 14 }}>
            <div style={secLbl0}>{t('w1d.prepPhases')}</div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px' }}>{t('w1d.prepPhasesHelp')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.phases.map((ph, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {PHASE_PALETTE.map(c => (
                      <button key={c} onClick={() => setPhase(i, { color: c })} aria-label={t('w1d.color')}
                        style={{ width: 20, height: 20, borderRadius: 999, border: (ph.color ?? PHASE_PALETTE[i % PHASE_PALETTE.length]) === c ? '2px solid var(--text)' : '2px solid transparent', background: c, cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                  <input value={ph.label} onChange={e => setPhase(i, { label: e.target.value })} style={{ ...inp, flex: 1, minWidth: 150 }} placeholder={t('w1d.phaseName')} />
                  <input type="number" min={1} max={p.duration_weeks} value={ph.fromWeek} onChange={e => setPhase(i, { fromWeek: Math.max(1, Math.min(p.duration_weeks, Number(e.target.value) || 1)) })} style={{ ...inp, width: 60, flex: 'none' }} aria-label={t('w1d.weekStart')} />
                  <span style={{ color: 'var(--text-dim)' }}>→</span>
                  <input type="number" min={1} max={p.duration_weeks} value={ph.toWeek} onChange={e => setPhase(i, { toWeek: Math.max(1, Math.min(p.duration_weeks, Number(e.target.value) || 1)) })} style={{ ...inp, width: 60, flex: 'none' }} aria-label={t('w1d.weekEnd')} />
                  <button onClick={() => removePhase(i)} aria-label={t('w1d.remove')} style={removeBtn}>×</button>
                </div>
              ))}
              <button onClick={addPhase} style={addBtn}>{t('w1d.addPhase')}</button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px' }}>{t('w1d.dayHelp')}</p>

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
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{w.label || t('w1d.weekN', { n: wi + 1 })}</div>
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
                          <div key={day} data-daycell data-wi={wi} data-day={day}
                            style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 6, minHeight: 96, display: 'flex', flexDirection: 'column', gap: 5, outline: drag ? '1px dashed var(--border-mid)' : 'none' }}>
                            <button onClick={() => cycleDayType(wi, day)} title={t('w1d.dayType')}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)' }}>{dl}</span>
                              <span style={{ width: 22, height: 3, borderRadius: 2, background: dt ? DAY_TYPE_COLOR[dt] : 'transparent' }} />
                            </button>
                            {daySessions.map(({ s, si }) => {
                              const dragging = drag?.wi === wi && drag?.si === si
                              return (
                              <div key={si} style={{ position: 'relative', borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', opacity: dragging ? 0.4 : 1 }}>
                                <button onClick={() => setEditor({ wi, si, day })}
                                  style={{ border: 'none', background: 'transparent', borderRadius: 'var(--r-sm)', padding: '6px 5px 4px', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sportDot(s.sport) }} />
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, wordBreak: 'break-word', paddingRight: 12 }}>{s.nom || t('w1d.session')}</span>
                                  {s.duree ? <span className="tnum" style={{ fontSize: 9.5, color: 'var(--text-dim)' }}>{s.duree}′</span> : null}
                                </button>
                                {/* Variantes (« ou … ») */}
                                {s.variants?.map((v, vi) => (
                                  <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '0 5px 2px' }}>
                                    <button onClick={() => setEditor({ wi, si, day, variantIndex: vi })} style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 9.5, color: 'var(--text-mid)', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('w1d.orPrefix')}{v.nom || t('w1d.variant')}</button>
                                    <button onClick={() => removeVariant(wi, si, vi)} aria-label={t('w1d.removeVariant')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 11, lineHeight: 1, padding: 0 }}>×</button>
                                  </div>
                                ))}
                                {/* Barre d'actions : glisser · répéter · variante */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px 4px' }}>
                                  <span role="button" aria-label={t('w1d.move')} title={t('w1d.dragToDay')}
                                    onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); dragRef.current = { wi, si }; setDrag({ wi, si, x: e.clientX, y: e.clientY, label: s.nom || t('w1d.session') }) }}
                                    onPointerMove={e => { if (dragRef.current) setDrag(d => d ? { ...d, x: e.clientX, y: e.clientY } : d) }}
                                    onPointerUp={e => { e.stopPropagation(); onDrop(e.clientX, e.clientY) }}
                                    style={{ cursor: 'grab', touchAction: 'none', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1, userSelect: 'none' }}>⠿</span>
                                  <span style={{ flex: 1 }} />
                                  <button onClick={() => setRepeatMenu(repeatMenu?.wi === wi && repeatMenu?.si === si ? null : { wi, si })} aria-label={t('w1d.repeat')} title={t('w1d.repeatWeeks')}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 11, lineHeight: 1, padding: 0 }}>↻</button>
                                  <button onClick={() => addVariant(wi, si)} aria-label={t('w1d.addVariant')} title={t('w1d.proposeVariant')}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12, lineHeight: 1, padding: '0 2px' }}>⎇</button>
                                </div>
                                {/* Menu répéter */}
                                {repeatMenu?.wi === wi && repeatMenu?.si === si && (
                                  <div style={{ position: 'absolute', zIndex: 20, top: '100%', right: 0, marginTop: 2, background: 'var(--bg-elev, var(--bg-card))', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: '0 6px 20px rgba(0,0,0,0.18)', padding: 4, width: 150, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <RepeatOpt onClick={() => repeatSession(wi, si, 'all')}>{t('w1d.repeatAll')}</RepeatOpt>
                                    <RepeatOpt onClick={() => repeatSession(wi, si, 'alt')}>{t('w1d.repeatAlt')}</RepeatOpt>
                                    <RepeatOpt onClick={() => repeatSession(wi, si, 3)}>{t('w1d.repeatNext3')}</RepeatOpt>
                                    <RepeatOpt onClick={() => repeatSession(wi, si, 4)}>{t('w1d.repeatNext4')}</RepeatOpt>
                                  </div>
                                )}
                                <button onClick={() => toggleKey(wi, si)} aria-label={t('w1d.keySession')} title={t('w1d.keySession')}
                                  style={{ position: 'absolute', top: 2, right: 2, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                                  <Star filled={!!s.key} />
                                </button>
                              </div>
                              )
                            })}
                            <button onClick={() => setEditor({ wi, si: null, day })} aria-label={t('w1d.add')}
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
                      placeholder={t('w1d.weekTip')}
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
            <button onClick={() => setStep(1)} style={ghost}>{t('w1d.back')}</button>
            <button onClick={goNext} disabled={busy} style={{ ...primary, minWidth: 160 }}>{busy ? '…' : t('w1d.continue')}</button>
          </div>
        </div>
      )}

      {/* Le VRAI éditeur de séance (mode programme : multi-sport, sans zones athlète) */}
      {editor && (() => {
        const base = editor.si === null ? undefined : weeks[editor.wi].sessions[editor.si]
        const editingVariant = editor.variantIndex != null && base ? base.variants?.[editor.variantIndex] : undefined
        const target = editor.variantIndex != null ? editingVariant : base
        const isCreate = editor.si === null || (editor.variantIndex != null && !editingVariant)
        return (
          <SessionEditor
            mode={isCreate ? 'create' : 'edit'}
            reserveMode
            programMode
            session={target ? toSession(target) : undefined}
            initialSport={isCreate ? (KEY_TO_SPORTTYPE[(target?.sport ?? base?.sport ?? p.sports[0]) as string] ?? 'run') : undefined}
            onClose={() => setEditor(null)}
            onSave={onEditorSave}
            onDelete={
              editor.si !== null && editor.variantIndex != null && editingVariant
                ? () => { removeVariant(editor.wi, editor.si as number, editor.variantIndex as number); setEditor(null) }
                : editor.si !== null && editor.variantIndex == null
                  ? () => { removeSession(editor.wi, editor.si as number); setEditor(null) }
                  : undefined
            }
          />
        )
      })()}

      {/* Fantôme de glisser-déposer */}
      {drag && (
        <div style={{ position: 'fixed', left: drag.x + 10, top: drag.y + 10, zIndex: 15000, pointerEvents: 'none', background: 'var(--bg-card)', border: '1px solid var(--primary)', borderRadius: 'var(--r-sm)', padding: '5px 9px', fontSize: 11, fontWeight: 700, color: 'var(--text)', boxShadow: '0 8px 24px rgba(0,0,0,0.22)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {drag.label}
        </div>
      )}

      {/* ── ÉTAPE 3 — Récap ── */}
      {step === 3 && (
        <div style={card}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.title}</div>
          {p.objective && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 14 }}>{p.objective}</div>}

          {/* Volume global du programme */}
          <div style={secLbl0}>{t('w1d.globalVolume')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 6 }}>
            <Stat n={p.duration_weeks} label={t('w1d.statWeeks')} />
            <Stat n={stats.base.total} label={t('w1d.statSessions')} />
            <Stat n={stats.totalHours} label={t('w1d.statHours')} />
            <Stat n={stats.enduranceSessions} label={t('w1d.statEndurance')} />
            <Stat n={stats.qualitySessions} label={t('w1d.statQuality')} />
            {stats.avgRpe != null && <Stat n={stats.avgRpe} label={t('w1d.statAvgRpe')} />}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 6 }}>
            {stats.busiestWeek && <span>{t('w1d.busiestWeek')} <strong>{t('w1d.weekAbbr')}{stats.busiestWeek.index + 1}</strong> · {stats.busiestWeek.hours} h</span>}
            {stats.longestSession && <span>{t('w1d.longestSession')} <strong>{stats.longestSession.nom}</strong> · {stats.longestSession.duree}′ <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>({t('w1d.weekAbbr')}{stats.longestSession.weekIndex + 1} · {DAY_LABELS[stats.longestSession.day]})</span></span>}
          </div>

          {/* Aperçu hebdomadaire — barres empilées par sport */}
          <div style={secLbl}>{t('w1d.weeklyPreview')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={() => setRecapSport('all')} style={chip(recapSport === 'all')}>{t('w1d.all')}</button>
            {stats.base.bySport.map(s => <button key={s.sport} onClick={() => setRecapSport(s.sport)} style={chip(recapSport === s.sport)}>{SPORT_LABEL[s.sport] ?? s.sport}</button>)}
          </div>
          <WeeklyBars weekly={stats.weekly} recapSport={recapSport} />

          {/* Charge estimée (SN/SM proxy) par semaine */}
          <div style={secLbl}>{t('w1d.estLoad')} <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>{t('w1d.estLoadNote')}</span></div>
          <LoadLine weekly={stats.weekly} />

          {/* Volume par sport — jauges horizontales */}
          <div style={secLbl}>{t('w1d.volumeBySport')}</div>
          {stats.base.bySport.length === 0 ? <Empty>{t('w1d.noSessionYet')}</Empty> : (() => {
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
                      {s.sessions} {t('w1d.sessAbbr')} · {Math.round(s.minutes / 60 * 10) / 10} h{s.distance ? ` · ${s.distance} ${s.sport === 'swim' ? 'm' : 'km'}` : ''}{s.rpe ? ` · RPE ${s.rpe}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Phases — timeline colorée */}
          {p.phases.length > 0 && (
            <>
              <div style={secLbl}>{t('w1d.phases')}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {p.phases.map((ph, i) => {
                  const span = Math.max(1, ph.toWeek - ph.fromWeek + 1)
                  const col = ph.color || PHASE_PALETTE[i % PHASE_PALETTE.length]
                  return (
                    <div key={i} style={{ flex: span, minWidth: 0 }}>
                      <div style={{ height: 8, borderRadius: 999, background: col }} />
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.label || t('w1d.phase')}</div>
                      <div className="tnum" style={{ fontSize: 10, color: 'var(--text-dim)' }}>S{ph.fromWeek}–S{ph.toWeek}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={ghost}>{t('w1d.back')}</button>
            <div style={{ flex: 1 }} />
            <button onClick={goNext} disabled={busy} style={{ ...primary, minWidth: 150 }}>{busy ? '…' : t('w1d.continue')}</button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 — Finalisation ── */}
      {step === 4 && (
        <div style={card}>
          <div style={secLbl0}>{t('w1d.programPrice')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            {/* Grand montant + € masqué dans l'app native (règles App Store) ;
                le champ d'édition reste pour permettre au coach de fixer le prix. */}
            {!hidePrice && (
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)', lineHeight: 1, fontSize: 'clamp(44px,10vw,72px)', fontVariantNumeric: 'tabular-nums' }}>
                {p.price_cents > 0 ? `${p.price_cents / 100}` : t('w1d.free')}
                {p.price_cents > 0 && <span style={{ fontSize: '0.4em', fontWeight: 600, color: 'var(--text-mid)', marginLeft: 4 }}>€</span>}
              </div>
            )}
            <Field label={t('w1d.editPrice')} hint={t('w1d.editPriceHint')} style={{ width: 150, flex: 'none', margin: 0 }}>
              <input type="number" min={0} step={1} value={p.price_cents ? p.price_cents / 100 : 0} onChange={e => set({ price_cents: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })} style={inp} />
            </Field>
          </div>
          {!hidePrice && (
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>
              {p.price_cents > 0 ? t('w1d.commissionNote', { pct: p.ai_enabled ? 30 : 10, amount: Math.round(p.price_cents * (p.ai_enabled ? 70 : 90) / 100) / 100 }) : t('w1d.freeNoCommission')}
            </p>
          )}

          {/* Essai gratuit */}
          <div style={secLbl}>{t('w1d.freeTrial')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 3, 7].map(d => <button key={d} onClick={() => set({ trial_days: d })} style={chip(p.trial_days === d)}>{d === 0 ? t('w1d.none') : t('w1d.nDays', { d })}</button>)}
          </div>

          {/* IA */}
          <div style={secLbl}>{t('w1d.smartProgram')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Toggle on={p.ai_enabled} onClick={() => set({ ai_enabled: !p.ai_enabled })} label={p.ai_enabled ? t('w1d.aiOn') : t('w1d.aiOff')} />
            <button onClick={() => setAiSheet(true)} style={{ ...addBtn, background: 'var(--bg-card2)' }}>{t('w1d.howAiWorks')}</button>
          </div>
          {p.ai_enabled && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 10, lineHeight: 1.5 }}>{t('w1d.questionnaireHelp')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.questionnaire.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={q.label} onChange={e => setQuestion(i, { label: e.target.value })} style={{ ...inp, flex: 1 }} placeholder={t('w1d.questionPh')} />
                    <select value={q.type} onChange={e => setQuestion(i, { type: e.target.value as QuestionItem['type'] })} style={{ ...inp, width: 120, flex: 'none' }}>
                      <option value="text">{t('w1d.typeText')}</option>
                      <option value="number">{t('w1d.typeNumber')}</option>
                    </select>
                    <button onClick={() => removeQuestion(i)} aria-label={t('w1d.remove')} style={removeBtn}>×</button>
                  </div>
                ))}
                <button onClick={addQuestion} style={addBtn}>{t('w1d.addQuestion')}</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={() => setStep(3)} style={ghost}>{t('w1d.back')}</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => void finish(false)} disabled={busy} style={ghost}>{t('w1d.saveDraft')}</button>
            <button onClick={() => void finish(true)} disabled={busy} style={{ ...primary, minWidth: 150 }}>{busy ? '…' : t('w1d.publish')}</button>
          </div>
        </div>
      )}

      {/* Surpage : explication détaillée de l'IA */}
      <SlideSheet open={aiSheet} onClose={() => setAiSheet(false)} title={t('w1d.aiSheetTitle')}>
        <AiExplainer />
      </SlideSheet>
    </div>
  )
}

type WeeklyAgg = { index: number; hours: number; load: number; minutesBySport: Record<string, number> }
const fmtH = (min: number) => `${Math.round(min / 60 * 10) / 10} h`

// ── Barres verticales empilées par sport (aperçu hebdo) — heures + survol ──
function WeeklyBars({ weekly, recapSport }: { weekly: WeeklyAgg[]; recapSport: string }) {
  const { t } = useI18n()
  const [hover, setHover] = useState<number | null>(null)
  const totalOf = (w: WeeklyAgg) => recapSport === 'all'
    ? Object.values(w.minutesBySport).reduce((a, b) => a + b, 0)
    : (w.minutesBySport[recapSport] ?? 0)
  const maxMin = Math.max(1, ...weekly.map(totalOf))
  const showLabels = weekly.length <= 16
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 176, padding: '18px 2px 24px', overflowX: 'auto' }}>
        {weekly.map(w => {
          const entries = Object.entries(w.minutesBySport).filter(([sp, m]) => m > 0 && (recapSport === 'all' || sp === recapSport))
            .sort((a, b) => b[1] - a[1])   // plus gros volume en bas
          const total = totalOf(w)
          const on = hover === w.index
          const nbSea = entries.length // (approx) — utilisé seulement pour l'info-bulle globale
          return (
            <div key={w.index} onMouseEnter={() => setHover(w.index)} onMouseLeave={() => setHover(h => h === w.index ? null : h)}
              style={{ flex: '1 0 20px', minWidth: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: 'default' }}>
              {showLabels && total > 0 && <span className="tnum" style={{ position: 'absolute', top: -2, fontSize: 9, fontWeight: 700, color: on ? 'var(--text)' : 'var(--text-dim)' }}>{fmtH(total)}</span>}
              <div style={{ width: '76%', maxWidth: 28, display: 'flex', flexDirection: 'column-reverse', height: `${Math.round(total / maxMin * 100)}%`, borderRadius: '5px 5px 0 0', overflow: 'hidden', outline: on ? '2px solid var(--text)' : 'none', outlineOffset: 1, transition: 'outline 120ms' }}>
                {entries.map(([sp, m]) => (
                  <div key={sp} style={{ height: `${Math.round(m / total * 100)}%`, background: sportDot(sp) }} />
                ))}
              </div>
              <span style={{ position: 'absolute', bottom: -20, fontSize: 9.5, fontWeight: on ? 700 : 500, color: on ? 'var(--text)' : 'var(--text-dim)' }}>{w.index + 1}</span>
              {on && total > 0 && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', zIndex: 5, background: 'var(--text)', color: 'var(--bg-card)', borderRadius: 8, padding: '6px 9px', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, boxShadow: '0 6px 18px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
                  <div style={{ fontWeight: 800 }}>{t('w1d.week')} {w.index + 1} · {fmtH(total)}</div>
                  {entries.map(([sp, m]) => <div key={sp} style={{ opacity: 0.85 }}>{SPORT_LABEL[sp] ?? sp} · {fmtH(m)}</div>)}
                  {recapSport === 'all' && <div style={{ opacity: 0.7 }}>{nbSea} {t('w1d.sportWord')}{nbSea > 1 ? 's' : ''}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Courbe de charge estimée par semaine (SVG raw) — survol + bulle ──
function LoadLine({ weekly }: { weekly: WeeklyAgg[] }) {
  const { t } = useI18n()
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  if (weekly.length === 0) return <Empty>{t('w1d.noData')}</Empty>
  const max = Math.max(1, ...weekly.map(w => w.load))
  const W = 100, H = 56, PAD = 5
  const n = weekly.length
  const step = n > 1 ? (W - PAD * 2) / (n - 1) : 0
  const xAt = (i: number) => PAD + i * step
  const yAt = (v: number) => H - PAD - (v / max) * (H - PAD * 2)
  const pts = weekly.map((w, i) => `${xAt(i).toFixed(2)},${yAt(w.load).toFixed(2)}`).join(' ')
  const area = `${xAt(0)},${H} ${pts} ${xAt(n - 1)},${H}`
  const gridY = [0.25, 0.5, 0.75].map(f => H - PAD - f * (H - PAD * 2))

  const onMove = (e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect(); if (!r) return
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    setHover(Math.round(frac * (n - 1)))
  }
  const hoverX = hover != null ? (xAt(hover) / W) * 100 : 0

  return (
    <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      style={{ position: 'relative', height: 132, padding: '6px 0' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridY.map((y, i) => <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />)}
        <polygon points={area} fill="url(#loadFill)" />
        <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && <line x1={xAt(hover)} y1={PAD} x2={xAt(hover)} y2={H - PAD} stroke="var(--text-dim)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" strokeDasharray="2 2" />}
        {weekly.map((w, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(w.load)} r={hover === i ? 3 : 1.7} fill="var(--primary)" stroke="var(--bg-card)" strokeWidth={hover === i ? 1 : 0} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {/* Bulle à droite du curseur */}
      {hover != null && (
        <div style={{ position: 'absolute', top: 4, left: `calc(${hoverX}% + 10px)`, transform: hoverX > 72 ? 'translateX(-100%) translateX(-20px)' : 'none', zIndex: 5, background: 'var(--text)', color: 'var(--bg-card)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 6px 18px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
          {t('w1d.week')} {weekly[hover].index + 1} · {t('w1d.loadWord')} {weekly[hover].load}
          <span style={{ display: 'block', fontWeight: 500, opacity: 0.8 }}>{weekly[hover].hours} h {t('w1d.ofSessions')}</span>
        </div>
      )}
    </div>
  )
}

// ── Contenu de la surpage IA ──
function AiExplainer() {
  const { t } = useI18n()
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
        {t('w1d.aiIntro1')}<strong style={{ color: 'var(--text)' }}>{t('w1d.aiIntroStrong')}</strong>{t('w1d.aiIntro2')}
      </p>

      <Block title={t('w1d.aiB1Title')}>
        {t('w1d.aiB1a')}<strong>{t('w1d.aiB1Strong')}</strong>{t('w1d.aiB1b')}
        <Ex>{t('w1d.aiExWrite')}<strong>{t('w1d.aiExTarget')}</strong>.<br />{t('w1d.aiExAthleteA')}<strong>4:10/km</strong>{t('w1d.aiExAthleteB')}<strong>3:20/km</strong>{t('w1d.aiExSame')}</Ex>
      </Block>

      <Block title={t('w1d.aiB2Title')}>
        {t('w1d.aiB2Body')}
      </Block>

      <Block title={t('w1d.aiB3Title')}>
        {t('w1d.aiB3a')}<em>{t('w1d.aiB3Em')}</em>{t('w1d.aiB3b')}
      </Block>

      <Block title={t('w1d.aiB4Title')}>
        {t('w1d.aiB4Body')}
      </Block>

      <Block title={t('w1d.aiB5Title')}>
        {t('w1d.aiB5Body')}
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
function RepeatOpt({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text)', padding: '7px 9px', borderRadius: 'var(--r-sm)' }}>{children}</button>
}
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
