'use client'
// ══════════════════════════════════════════════════════════════════
// FICHE STRATÉGIE NUTRITION (coach) — remplace le simple éditeur de cibles.
// 1) Intake : fiche de l'athlète (pré-remplie depuis son profil).
// 2) Génération : IA (agent coach) OU calcul manuel — dans les deux cas la
//    stratégie hebdo est éditable à la main ensuite.
// 3) Justification : graphiques (poids cible/réel, macros/semaine, jauges) +
//    « Détail du calcul ». 4) Activation : devient le plan actif de l'athlète
//    (cyclé repos/modéré/dur selon les séances). Le coach ne logge pas de repas.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import {
  computeStrategy, dayKcal, ageFromBirth,
  GOAL_LABEL, WORK_LABEL, METABO_LABEL, FOOD_QUALITY_LABEL, FRICTIONS, DIET_CONSTRAINTS,
  type NutritionIntake, type WeekTarget, type StrategyCalc, type GoalType, type WorkIntensity, type Metabolism, type FoodQuality, type CycleMode, type RangeMode,
} from '@/lib/nutrition/strategy'
import type { NutritionPlanData } from '@/hooks/useNutrition'
import { WeightTrajectoryChart, MacroFluctuationChart, MacroGauges, type WeightPoint } from './charts'

const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }
const CARD: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p style={LBL}>{label}</p>{children}</div>
}
function Chip<T extends string>({ v, cur, onClick, label }: { v: T; cur: T; onClick: (v: T) => void; label: string }) {
  const on = v === cur
  return <button onClick={() => onClick(v)} style={{ padding: '7px 13px', borderRadius: 999, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: on ? 'var(--primary-dim)' : 'var(--bg-card)', color: on ? 'var(--primary)' : 'var(--text-dim)', transition: 'all .15s', boxShadow: on ? '0 1px 6px color-mix(in srgb, var(--primary) 22%, transparent)' : 'none' }}>{label}</button>
}
// Sous-section groupée : petit panneau avec en-tête (numéro + titre) pour aérer
// la fiche d'intake et lui donner une hiérarchie visuelle plus raffinée.
function Group({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '15px 16px 17px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: hint ? 3 : 13 }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--font-display)', flexShrink: 0 }}>{step}</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{title}</h4>
      </div>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 13px', paddingLeft: 31 }}>{hint}</p>}
      {children}
    </div>
  )
}

const DEFAULT_INTAKE: NutritionIntake = {
  weightKg: 70, bodyFatPct: null, heightCm: null, age: null, sex: 'm',
  goalType: 'muscle', targetWeightKg: 72, targetBodyFatPct: null,
  timelineMode: 'exact', timelineWeeks: 8, timelineWeeksMax: null,
  mealsPerDay: 4, workIntensity: 'medium', sessionsMode: 'exact', sessionsPerWeek: 4, sessionsPerWeekMax: null, avgSessionHours: 1, sportBreakdown: [],
  metabolism: 'neutral', foodQuality: 'good', frictions: [], dietConstraints: [],
  cycleMode: 'training', notes: '',
}

interface DBRow { id: string; intake: NutritionIntake; weeks: WeekTarget[]; calc: Partial<StrategyCalc>; source: string; status: string }

export default function CoachNutritionStrategy({ athleteName, activePlan, onSave }: {
  athleteName: string
  activePlan: { plan_data?: NutritionPlanData | null } | null
  onSave: (plan: NutritionPlanData, type: 'manuel') => Promise<void>
}) {
  const [intake, setIntake] = useState<NutritionIntake>(DEFAULT_INTAKE)
  const [weeks, setWeeks] = useState<WeekTarget[]>([])
  const [calc, setCalc] = useState<StrategyCalc | null>(null)
  const [rationale, setRationale] = useState<string>('')
  const [source, setSource] = useState<'manual' | 'ai'>('manual')
  const [rowId, setRowId] = useState<string | null>(null)
  const [actualWeights, setActualWeights] = useState<WeightPoint[]>([])
  const [perSessionKcal, setPerSessionKcal] = useState(600)
  const [loading, setLoading] = useState(true)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const set = (p: Partial<NutritionIntake>) => setIntake(prev => ({ ...prev, ...p }))

  // ── Chargement : profil (pré-remplissage) + stratégie existante + poids réels ──
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const sb = createClient()
        const uid = await resolvePlanningUid(sb)
        if (!uid) { setLoading(false); return }
        const [profRes, perfRes, stratRes, weightRes] = await Promise.all([
          sb.from('profiles').select('weight_kg,height_cm,birth_date,body_fat_pct').eq('id', uid).maybeSingle().then((r: { data: unknown }) => r, () => ({ data: null })),
          sb.from('athlete_performance_profile').select('gender').eq('user_id', uid).maybeSingle().then((r: { data: unknown }) => r, () => ({ data: null })),
          sb.from('nutrition_strategies').select('id,intake,weeks,calc,source,status').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle().then((r: { data: unknown }) => r, () => ({ data: null })),
          sb.from('body_measurements').select('measured_at,weight_kg,fat_mass_percent').eq('user_id', uid).order('measured_at', { ascending: true }).limit(120).then((r: { data: unknown }) => r, () => ({ data: [] })),
        ])
        if (cancel) return
        const prof = (profRes as { data: Record<string, unknown> | null }).data
        const gender = (perfRes as { data: { gender?: string } | null }).data?.gender
        const strat = (stratRes as { data: DBRow | null }).data
        const wlogs = ((weightRes as { data: Array<{ measured_at: string; weight_kg: number; fat_mass_percent: number | null }> | null }).data ?? [])
        setActualWeights(wlogs.filter(w => w.weight_kg > 0).map(w => ({ date: (w.measured_at || '').slice(0, 10), kg: Number(w.weight_kg) })))
        // Dernière mesure de masse grasse (repli si absente du profil).
        const lastFat = [...wlogs].reverse().find(w => w.fat_mass_percent != null)?.fat_mass_percent ?? null

        if (strat?.intake) {
          // Reprise d'une stratégie existante.
          setIntake({ ...DEFAULT_INTAKE, ...strat.intake })
          setWeeks(strat.weeks ?? [])
          setCalc((strat.calc as StrategyCalc) ?? null)
          setSource(strat.source === 'ai' ? 'ai' : 'manual')
          setRowId(strat.id)
          if ((strat.calc as StrategyCalc)?.perSessionKcal) setPerSessionKcal((strat.calc as StrategyCalc).perSessionKcal)
        } else if (prof) {
          // Pré-remplissage depuis le profil de l'athlète.
          set({
            weightKg: (prof.weight_kg as number) || 70,
            heightCm: (prof.height_cm as number) ?? null,
            age: ageFromBirth(prof.birth_date as string | null),
            bodyFatPct: (prof.body_fat_pct as number) ?? lastFat,
            sex: gender === 'f' || gender === 'femme' ? 'f' : 'm',
            targetWeightKg: (prof.weight_kg as number) || 72,
          })
        }
      } catch { /* silencieux */ }
      finally { if (!cancel) setLoading(false) }
    })()
    return () => { cancel = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Génération manuelle (moteur de calcul local) ──
  function generateManual() {
    const s = computeStrategy(intake)
    setWeeks(s.weeks); setCalc(s.calc); setPerSessionKcal(s.calc.perSessionKcal); setSource('manual'); setRationale('')
  }

  // ── Génération IA (agent coach, mode nutrition_strategy) ──
  async function generateAI() {
    setAiBusy(true); setAiErr(null)
    try {
      const base = computeStrategy(intake)
      const payload = { intake, baseline: base.weeks, baselineCalc: base.calc.steps }
      const res = await fetch('/api/coach-stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: 'nutrition', mode: 'nutrition_strategy', messages: [{ role: 'user', content: JSON.stringify(payload) }] }),
      })
      if (!res.ok || !res.body) throw new Error('IA indisponible')
      // Le endpoint STREAME le JSON (SSE-like) : on accumule le texte puis on parse.
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      for (;;) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }) }
      const text = extractStreamText(buf)
      const parsed = JSON.parse(extractJson(text)) as { weeks: WeekTarget[]; rationale?: string; steps?: StrategyCalc['steps']; warnings?: string[] }
      if (!Array.isArray(parsed.weeks) || parsed.weeks.length === 0) throw new Error('Réponse IA vide')
      const normWeeks = parsed.weeks.map((w, i) => ({ i, start: null, weightKg: Number(w.weightKg) || intake.weightKg, kcal: Math.round(Number(w.kcal) || 0), proteines: Math.round(Number(w.proteines) || 0), glucides: Math.round(Number(w.glucides) || 0), lipides: Math.round(Number(w.lipides) || 0), note: w.note }))
      setWeeks(normWeeks)
      setCalc({ ...base.calc, steps: parsed.steps ?? base.calc.steps, warnings: parsed.warnings ?? base.calc.warnings })
      setPerSessionKcal(base.calc.perSessionKcal)
      setRationale(parsed.rationale ?? '')
      setSource('ai')
    } catch (e) { setAiErr(e instanceof Error ? e.message : 'Erreur IA') }
    finally { setAiBusy(false) }
  }

  // Édition manuelle d'une cellule de semaine.
  function editWeek(i: number, patch: Partial<WeekTarget>) {
    setWeeks(prev => prev.map(w => w.i === i ? { ...w, ...patch } : w))
  }

  // ── Persistance stratégie + activation du plan de l'athlète ──
  async function persist(status: 'draft' | 'active') {
    const sb = createClient()
    const uid = await resolvePlanningUid(sb)
    if (!uid) return
    const { data: { session } } = await sb.auth.getSession()
    const row = { user_id: uid, created_by: session?.user?.id ?? uid, intake, weeks, calc: calc ?? {}, source, status }
    if (rowId) await sb.from('nutrition_strategies').update({ ...row, updated_at: new Date().toISOString() }).eq('id', rowId)
    else { const { data } = await sb.from('nutrition_strategies').insert(row).select('id').maybeSingle(); if (data?.id) setRowId(data.id as string) }
  }

  async function activate() {
    if (!weeks.length) return
    // Semaine courante = celle dont l'index correspond au temps écoulé (défaut S1).
    const cur = weeks[0]
    const plan = weekToPlan(cur, perSessionKcal)
    await onSave(plan, 'manuel')        // devient le plan actif de l'athlète (cyclé)
    await persist('active')
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2500)
  }

  const currentWeek = weeks[0] ?? null
  const detailSteps = calc?.steps ?? []
  const warnings = calc?.warnings ?? []

  if (loading) return <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 20 }}>Chargement de la fiche…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── 1. INTAKE ─────────────────────────────────────────── */}
      <div style={CARD}>
        {/* En-tête raffiné */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 18 }}>
          <span style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #22c55e))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 21, boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)' }}>🥗</span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 3px', letterSpacing: '-0.01em' }}>Stratégie nutrition — {athleteName}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>Remplis la fiche (pré-remplie depuis le profil), puis laisse l’IA proposer une stratégie ou définis-la à la main. Le coach ne logge jamais les repas — seul l’athlète le fait.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Morphologie */}
          <Group step={1} title="Morphologie">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 12 }}>
              <Field label="Poids actuel (kg)"><input type="number" step="0.1" style={INP} value={intake.weightKg || ''} onChange={e => set({ weightKg: parseFloat(e.target.value) || 0 })} /></Field>
              <Field label="Masse grasse (%)"><input type="number" step="0.1" style={INP} value={intake.bodyFatPct ?? ''} onChange={e => set({ bodyFatPct: e.target.value ? parseFloat(e.target.value) : null })} placeholder="—" /></Field>
              <Field label="Taille (cm)"><input type="number" style={INP} value={intake.heightCm ?? ''} onChange={e => set({ heightCm: e.target.value ? parseFloat(e.target.value) : null })} placeholder="profil" /></Field>
              <Field label="Âge"><input type="number" style={INP} value={intake.age ?? ''} onChange={e => set({ age: e.target.value ? parseInt(e.target.value) : null })} placeholder="profil" /></Field>
              <Field label="Sexe"><div style={{ display: 'flex', gap: 6 }}><Chip v="m" cur={intake.sex} onClick={v => set({ sex: v })} label="H" /><Chip v="f" cur={intake.sex} onClick={v => set({ sex: v })} label="F" /></div></Field>
            </div>
          </Group>

          {/* Objectif */}
          <Group step={2} title="Objectif">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 13 }}>
              {(Object.keys(GOAL_LABEL) as GoalType[]).map(g => <Chip key={g} v={g} cur={intake.goalType} onClick={v => set({ goalType: v })} label={GOAL_LABEL[g]} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <Field label="Poids cible (kg) *"><input type="number" step="0.1" style={INP} value={intake.targetWeightKg || ''} onChange={e => set({ targetWeightKg: parseFloat(e.target.value) || 0 })} /></Field>
              <Field label="% MG cible (optionnel)"><input type="number" step="0.1" style={INP} value={intake.targetBodyFatPct ?? ''} onChange={e => set({ targetBodyFatPct: e.target.value ? parseFloat(e.target.value) : null })} placeholder="—" /></Field>
              <Field label="Délai">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" style={{ ...INP, width: 70 }} value={intake.timelineWeeks || ''} onChange={e => set({ timelineWeeks: parseInt(e.target.value) || 0 })} />
                  {intake.timelineMode === 'range' && <><span style={{ color: 'var(--text-dim)' }}>à</span><input type="number" style={{ ...INP, width: 70 }} value={intake.timelineWeeksMax ?? ''} onChange={e => set({ timelineWeeksMax: e.target.value ? parseInt(e.target.value) : null })} /></>}
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>sem</span>
                  <Chip v={intake.timelineMode === 'range' ? 'exact' : 'range'} cur={'x' as RangeMode} onClick={() => set({ timelineMode: intake.timelineMode === 'range' ? 'exact' : 'range' })} label={intake.timelineMode === 'range' ? 'Fourchette' : 'Précis'} />
                </div>
              </Field>
            </div>
          </Group>

          {/* Dépense */}
          <Group step={3} title="Dépense & rythme">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 13 }}>
              <Field label="Repas / jour"><select style={INP} value={intake.mealsPerDay} onChange={e => set({ mealsPerDay: parseInt(e.target.value) })}>{[2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}</select></Field>
              <Field label="Séances / sem">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" style={{ ...INP, width: 60 }} value={intake.sessionsPerWeek || ''} onChange={e => set({ sessionsPerWeek: parseInt(e.target.value) || 0 })} />
                  {intake.sessionsMode === 'range' && <><span style={{ color: 'var(--text-dim)' }}>à</span><input type="number" style={{ ...INP, width: 60 }} value={intake.sessionsPerWeekMax ?? ''} onChange={e => set({ sessionsPerWeekMax: e.target.value ? parseInt(e.target.value) : null })} /></>}
                  <Chip v={intake.sessionsMode === 'range' ? 'exact' : 'range'} cur={'x' as RangeMode} onClick={() => set({ sessionsMode: intake.sessionsMode === 'range' ? 'exact' : 'range' })} label={intake.sessionsMode === 'range' ? '↔' : '='} />
                </div>
              </Field>
              <Field label="Durée moy. séance (h)"><input type="number" step="0.25" style={INP} value={intake.avgSessionHours || ''} onChange={e => set({ avgSessionHours: parseFloat(e.target.value) || 0 })} /></Field>
            </div>
            <div style={{ marginBottom: 13 }}>
              <Field label="Niveau de travail / quotidien">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(Object.keys(WORK_LABEL) as WorkIntensity[]).map(w => <Chip key={w} v={w} cur={intake.workIntensity} onClick={v => set({ workIntensity: v })} label={WORK_LABEL[w]} />)}</div>
              </Field>
            </div>
            <Field label="Cyclage des kcal">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {([['weekly', 'Chaque semaine'], ['biweekly', 'Toutes les 2 sem'], ['training', "S'adapte aux entraînements"]] as [CycleMode, string][]).map(([v, l]) => <Chip key={v} v={v} cur={intake.cycleMode} onClick={vv => set({ cycleMode: vv })} label={l} />)}
              </div>
            </Field>
            {intake.cycleMode === 'training' && <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '8px 0 0', lineHeight: 1.5 }}>Les jours sans séance = moins de kcal ; 1 séance = modéré ; 2+ = plus. L’app calcule depuis le planning réel de l’athlète.</p>}
          </Group>

          {/* Terrain */}
          <Group step={4} title="Terrain de l’athlète">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <Field label="Caractéristique"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(Object.keys(METABO_LABEL) as Metabolism[]).map(m => <Chip key={m} v={m} cur={intake.metabolism} onClick={v => set({ metabolism: v })} label={METABO_LABEL[m]} />)}</div></Field>
              <Field label="Qualité alimentaire"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(Object.keys(FOOD_QUALITY_LABEL) as FoodQuality[]).map(q => <Chip key={q} v={q} cur={intake.foodQuality} onClick={v => set({ foodQuality: v })} label={FOOD_QUALITY_LABEL[q]} />)}</div></Field>
              <Field label="Freins (multi)"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{FRICTIONS.map(f => <Multi key={f.key} on={intake.frictions.includes(f.key)} onClick={() => set({ frictions: toggle(intake.frictions, f.key) })} label={f.label} />)}</div></Field>
              <Field label="Contraintes alimentaires (multi)"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DIET_CONSTRAINTS.map(d => <Multi key={d.key} on={intake.dietConstraints.includes(d.key)} onClick={() => set({ dietConstraints: toggle(intake.dietConstraints, d.key) })} label={d.label} />)}</div></Field>
              <Field label="Notes (optionnel)"><textarea rows={2} style={{ ...INP, resize: 'vertical' }} value={intake.notes} onChange={e => set({ notes: e.target.value })} placeholder="Contexte, préférences…" /></Field>
            </div>
          </Group>
        </div>

        {/* Génération */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button onClick={generateManual} disabled={!intake.targetWeightKg} style={{ flex: '1 1 180px', padding: 13, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Calculer (manuel)</button>
          <button onClick={() => void generateAI()} disabled={aiBusy || !intake.targetWeightKg} style={{ flex: '1 1 180px', padding: 13, borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, fontSize: 13.5, cursor: aiBusy ? 'wait' : 'pointer', opacity: aiBusy ? 0.6 : 1, boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent)' }}>{aiBusy ? 'L’IA réfléchit…' : '✨ Générer avec l’IA'}</button>
        </div>
        {aiErr && <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0', fontWeight: 600 }}>{aiErr}</p>}
      </div>

      {/* ── 2. RÉSULTATS ──────────────────────────────────────── */}
      {weeks.length > 0 && currentWeek && (
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: 0 }}>Stratégie sur {weeks.length} semaines</h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: source === 'ai' ? 'var(--primary)' : 'var(--text-dim)', background: source === 'ai' ? 'var(--primary-dim)' : 'var(--bg-card2)', padding: '3px 9px', borderRadius: 999 }}>{source === 'ai' ? '✨ Proposé par l’IA' : 'Calcul manuel'}</span>
          </div>
          {rationale && <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 14px' }}>{rationale}</p>}
          {warnings.map((w, i) => <p key={i} style={{ fontSize: 12, color: '#f59e0b', margin: '0 0 8px', fontWeight: 600 }}>⚠ {w}</p>)}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 8 }}>
            <MacroGauges week={currentWeek} />
            <MacroFluctuationChart weeks={weeks} />
            <WeightTrajectoryChart weeks={weeks} actual={actualWeights} startWeight={intake.weightKg} />
          </div>

          {/* Détail du calcul */}
          <button onClick={() => setShowDetail(s => !s)} style={{ marginTop: 16, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            {showDetail ? '▾ Masquer le détail du calcul' : '▸ Détail du calcul'}
          </button>
          {showDetail && (
            <div style={{ marginTop: 10, background: 'var(--bg-alt)', borderRadius: 12, padding: '12px 14px' }}>
              {detailSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: i < detailSteps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{s.label}</div>
                    {s.detail && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.detail}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. ÉDITEUR SEMAINE PAR SEMAINE (manuel) ───────────── */}
      {weeks.length > 0 && (
        <div style={CARD}>
          <p style={{ ...LBL, color: 'var(--text-mid)' }}>Semaine par semaine — éditable</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                  {['Sem', 'Poids', 'kcal', 'Prot (g)', 'Gluc (g)', 'Lip (g)', 'Note'].map(h => <th key={h} style={{ padding: '6px 8px', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeks.map(w => (
                  <tr key={w.i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 700, color: 'var(--text)' }}>S{w.i + 1}</td>
                    <td style={{ padding: '5px 8px', color: 'var(--text-dim)' }}>{w.weightKg} kg</td>
                    <td style={{ padding: '4px' }}><input type="number" style={cell} value={w.kcal} onChange={e => editWeek(w.i, { kcal: parseInt(e.target.value) || 0 })} /></td>
                    <td style={{ padding: '4px' }}><input type="number" style={cell} value={w.proteines} onChange={e => editWeek(w.i, { proteines: parseInt(e.target.value) || 0 })} /></td>
                    <td style={{ padding: '4px' }}><input type="number" style={cell} value={w.glucides} onChange={e => editWeek(w.i, { glucides: parseInt(e.target.value) || 0 })} /></td>
                    <td style={{ padding: '4px' }}><input type="number" style={cell} value={w.lipides} onChange={e => editWeek(w.i, { lipides: parseInt(e.target.value) || 0 })} /></td>
                    <td style={{ padding: '4px' }}><input style={{ ...cell, width: 120, textAlign: 'left' }} value={w.note ?? ''} onChange={e => editWeek(w.i, { note: e.target.value })} placeholder="…" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => void persist('draft')} style={{ flex: '1 1 160px', padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Enregistrer (brouillon)</button>
            <button onClick={() => void activate()} style={{ flex: '2 1 200px', padding: 12, borderRadius: 12, border: 'none', background: savedFlash ? '#22c55e' : 'var(--primary)', color: 'var(--on-primary)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{savedFlash ? '✓ Plan activé pour l’athlète' : 'Activer comme plan de l’athlète'}</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '8px 0 0' }}>À l’activation, la semaine 1 devient le plan actif de l’athlète, cyclé automatiquement selon ses séances (jour repos / modéré / dur).</p>
        </div>
      )}
    </div>
  )
}

const cell: React.CSSProperties = { width: 66, padding: '6px 7px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 12.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }

function Multi({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ padding: '6px 11px', borderRadius: 999, border: `1px solid ${on ? '#ef4444' : 'var(--border)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: on ? 'rgba(239,68,68,0.12)' : 'var(--bg-card)', color: on ? '#ef4444' : 'var(--text-dim)' }}>{label}</button>
}
function toggle(arr: string[], k: string): string[] { return arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k] }

// Semaine → plan actif de l'athlète (jours cyclés repos/modéré/dur).
function weekToPlan(w: WeekTarget, perSessionKcal: number): NutritionPlanData {
  const low = w.kcal
  const mid = dayKcal(w.kcal, perSessionKcal, 1)
  const hard = dayKcal(w.kcal, perSessionKcal, 2)
  const scaleCarb = (kcal: number) => Math.max(0, Math.round((kcal - w.proteines * 4 - w.lipides * 9) / 4))
  return {
    description: w.note || 'Stratégie coach',
    calories_low: low, calories_mid: mid, calories_hard: hard,
    macros_low: { proteines: w.proteines, glucides: w.glucides, lipides: w.lipides },
    macros_mid: { proteines: w.proteines, glucides: scaleCarb(mid), lipides: w.lipides },
    macros_hard: { proteines: w.proteines, glucides: scaleCarb(hard), lipides: w.lipides },
    jours: [],
  }
}

// Le endpoint coach-stream renvoie un flux SSE-like ; on isole le texte du modèle.
function extractStreamText(buf: string): string {
  // Format attendu : lignes "data: {json anthropic delta}" OU texte brut.
  if (!buf.includes('data:')) return buf
  let out = ''
  for (const line of buf.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('data:')) continue
    const payload = t.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      const j = JSON.parse(payload)
      const delta = j?.delta?.text ?? j?.text ?? (typeof j === 'string' ? j : '')
      if (delta) out += delta
    } catch { out += payload }
  }
  return out || buf
}
// Isole le premier objet JSON {...} d'un texte.
function extractJson(text: string): string {
  const s = text.indexOf('{'); const e = text.lastIndexOf('}')
  return s >= 0 && e > s ? text.slice(s, e + 1) : text
}
