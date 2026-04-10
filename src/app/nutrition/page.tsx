'use client'

import { useState, useEffect, useRef } from 'react'
// import { createClient } from '@/lib/supabase/client'

/* ─── TYPES ─────────────────────────────────────────────────────── */
type MealType = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner'
type AddMode  = 'text' | 'manual' | 'photo'
type PlanStep = 0 | 1 | 2 | 3

interface FoodEntry {
  id: string
  name: string
  kcal: number
  p: number   // protein g
  c: number   // carbs g
  f: number   // fat g
  qty?: number // grams consumed
  confidence?: number // 0-100 for text-parse
}

interface Meal {
  type: MealType
  label: string
  entries: FoodEntry[]
}

interface NutritionPlan {
  low:  { kcal:number; p:number; c:number; f:number }
  mid:  { kcal:number; p:number; c:number; f:number }
  hard: { kcal:number; p:number; c:number; f:number }
  protein_g_per_kg: number
  created_at: string
}

interface QuestionnaireData {
  weight: number
  height: number
  age: number
  sex: 'm' | 'f'
  goal: 'loss' | 'gain' | 'maintain' | 'performance'
  activity: 'low' | 'moderate' | 'high' | 'very_high'
  training_h_week: number
}

/* ─── FOOD DATABASE (per 100g) ──────────────────────────────────── */
/* TODO: replace with nutrition_saved_meals from Supabase */
const FOOD_DB: Record<string, { kcal:number; p:number; c:number; f:number }> = {
  'flocons avoine':      { kcal:379, p:13.2, c:67,  f:7   },
  'avoine':              { kcal:379, p:13.2, c:67,  f:7   },
  'riz blanc cuit':      { kcal:130, p:2.7,  c:28,  f:0.3 },
  'riz':                 { kcal:130, p:2.7,  c:28,  f:0.3 },
  'pâtes cuites':        { kcal:158, p:5.8,  c:31,  f:0.9 },
  'pâtes':               { kcal:158, p:5.8,  c:31,  f:0.9 },
  'pain complet':        { kcal:247, p:9,    c:46,  f:3.4 },
  'pain':                { kcal:270, p:9,    c:50,  f:3.2 },
  'baguette':            { kcal:275, p:9.4,  c:56,  f:1.2 },
  'poulet cuit':         { kcal:165, p:31,   c:0,   f:3.6 },
  'poulet':              { kcal:165, p:31,   c:0,   f:3.6 },
  'thon conserve':       { kcal:116, p:26,   c:0,   f:1   },
  'thon':                { kcal:116, p:26,   c:0,   f:1   },
  'saumon':              { kcal:208, p:20,   c:0,   f:13  },
  'oeuf':                { kcal:155, p:13,   c:1.1, f:11  },
  'oeufs':               { kcal:155, p:13,   c:1.1, f:11  },
  'boeuf haché':         { kcal:215, p:26,   c:0,   f:12  },
  'steak':               { kcal:215, p:26,   c:0,   f:12  },
  'lait entier':         { kcal:61,  p:3.2,  c:4.8, f:3.3 },
  'lait':                { kcal:42,  p:3.4,  c:5,   f:1   },
  'yaourt grec':         { kcal:97,  p:9,    c:3.6, f:5   },
  'fromage blanc':       { kcal:65,  p:8,    c:3.9, f:1.8 },
  'cottage cheese':      { kcal:98,  p:11.1, c:3.4, f:4.3 },
  'whey protéine':       { kcal:380, p:75,   c:7,   f:5   },
  'whey':                { kcal:380, p:75,   c:7,   f:5   },
  'banane':              { kcal:89,  p:1.1,  c:23,  f:0.3 },
  'pomme':               { kcal:52,  p:0.3,  c:14,  f:0.2 },
  'orange':              { kcal:47,  p:0.9,  c:12,  f:0.1 },
  'myrtilles':           { kcal:57,  p:0.7,  c:14,  f:0.3 },
  'fraises':             { kcal:32,  p:0.7,  c:8,   f:0.3 },
  'raisin':              { kcal:67,  p:0.6,  c:17,  f:0.4 },
  'beurre cacahuète':    { kcal:588, p:25,   c:20,  f:50  },
  'amandes':             { kcal:579, p:21,   c:22,  f:50  },
  'noix':                { kcal:654, p:15,   c:14,  f:65  },
  'huile olive':         { kcal:884, p:0,    c:0,   f:100 },
  'huile':               { kcal:884, p:0,    c:0,   f:100 },
  'beurre':              { kcal:717, p:0.9,  c:0.1, f:81  },
  'courgette':           { kcal:17,  p:1.2,  c:3.1, f:0.3 },
  'brocoli':             { kcal:34,  p:2.8,  c:7,   f:0.4 },
  'épinards':            { kcal:23,  p:2.9,  c:3.6, f:0.4 },
  'carottes':            { kcal:41,  p:0.9,  c:10,  f:0.2 },
  'patate douce':        { kcal:86,  p:1.6,  c:20,  f:0.1 },
  'pomme de terre':      { kcal:77,  p:2,    c:17,  f:0.1 },
  'lentilles cuites':    { kcal:116, p:9,    c:20,  f:0.4 },
  'pois chiches':        { kcal:164, p:8.9,  c:27,  f:2.6 },
  'quinoa cuit':         { kcal:120, p:4.4,  c:22,  f:1.9 },
  'granola':             { kcal:460, p:9,    c:64,  f:20  },
  'chocolat noir':       { kcal:546, p:5,    c:60,  f:31  },
  'miel':                { kcal:304, p:0.3,  c:82,  f:0   },
  'gel énergétique':     { kcal:260, p:0,    c:65,  f:0   },
  'barre energetique':   { kcal:380, p:7,    c:64,  f:10  },
  'boisson isotonique':  { kcal:25,  p:0,    c:6,   f:0   },
}

/* ─── MOCK DATA ──────────────────────────────────────────────────── */
/* TODO: replace with nutrition_logs + nutrition_plan from Supabase */
const MOCK_MEALS: Meal[] = [
  {
    type: 'breakfast', label: 'Petit-déjeuner',
    entries: [
      { id: 'e1', name: 'Flocons avoine (90g)', kcal: 341, p: 12, c: 60, f: 6, qty: 90 },
      { id: 'e2', name: 'Lait demi-écrémé (200ml)', kcal: 84, p: 6.8, c: 10, f: 2.6, qty: 200 },
      { id: 'e3', name: 'Banane (130g)', kcal: 116, p: 1.4, c: 30, f: 0.4, qty: 130 },
    ],
  },
  { type: 'snack_am', label: 'Collation matin', entries: [] },
  {
    type: 'lunch', label: 'Déjeuner',
    entries: [
      { id: 'e4', name: 'Poulet cuit (200g)', kcal: 330, p: 62, c: 0, f: 7.2, qty: 200 },
      { id: 'e5', name: 'Riz blanc cuit (200g)', kcal: 260, p: 5.4, c: 56, f: 0.6, qty: 200 },
      { id: 'e6', name: 'Brocoli (150g)', kcal: 51, p: 4.2, c: 10.5, f: 0.6, qty: 150 },
    ],
  },
  {
    type: 'snack_pm', label: 'Collation après-midi',
    entries: [
      { id: 'e7', name: 'Yaourt grec (150g)', kcal: 145, p: 13.5, c: 5.4, f: 7.5, qty: 150 },
    ],
  },
  { type: 'dinner', label: 'Dîner', entries: [] },
]

const MOCK_PLAN: NutritionPlan = {
  low:  { kcal: 2100, p: 150, c: 230, f: 65 },
  mid:  { kcal: 2600, p: 160, c: 310, f: 72 },
  hard: { kcal: 3200, p: 170, c: 430, f: 78 },
  protein_g_per_kg: 2.0,
  created_at: '2026-04-01',
}

const DEFAULT_Q: QuestionnaireData = {
  weight: 75, height: 178, age: 31,
  sex: 'm', goal: 'performance',
  activity: 'moderate', training_h_week: 10,
}

/* ─── HELPERS ────────────────────────────────────────────────────── */
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }

function sumMacros(entries: FoodEntry[]) {
  return entries.reduce(
    (a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  )
}

function totalDay(meals: Meal[]) {
  return sumMacros(meals.flatMap(m => m.entries))
}

/** Parse free text like "150g poulet + 200g riz + banane" */
function parseTextEntries(text: string): FoodEntry[] {
  const results: FoodEntry[] = []
  // split by + or newline
  const parts = text.toLowerCase().split(/[+\n,;]/).map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    // extract quantity: "150g poulet" or "poulet 150g" or "poulet"
    const qtyMatch = part.match(/(\d+)\s*g/)
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 100
    const cleanPart = part.replace(/\d+\s*g/, '').trim()

    // find best match in FOOD_DB
    let bestKey = ''
    let bestScore = 0
    for (const key of Object.keys(FOOD_DB)) {
      if (cleanPart.includes(key) || key.includes(cleanPart)) {
        const score = key.length
        if (score > bestScore) { bestScore = score; bestKey = key }
      }
    }

    if (bestKey) {
      const db = FOOD_DB[bestKey]
      const ratio = qty / 100
      results.push({
        id: uid(),
        name: `${bestKey.charAt(0).toUpperCase() + bestKey.slice(1)} (${qty}g)`,
        kcal: Math.round(db.kcal * ratio),
        p: Math.round(db.p * ratio * 10) / 10,
        c: Math.round(db.c * ratio * 10) / 10,
        f: Math.round(db.f * ratio * 10) / 10,
        qty,
        confidence: 85,
      })
    } else if (cleanPart.length > 2) {
      // unknown food — placeholder
      results.push({
        id: uid(),
        name: cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1),
        kcal: 0, p: 0, c: 0, f: 0, qty,
        confidence: 20,
      })
    }
  }
  return results
}

/** BMR → TDEE → macros by day type */
function generatePlan(q: QuestionnaireData): NutritionPlan {
  // Mifflin-St Jeor
  const bmr = q.sex === 'm'
    ? 10 * q.weight + 6.25 * q.height - 5 * q.age + 5
    : 10 * q.weight + 6.25 * q.height - 5 * q.age - 161

  const actFactor = { low: 1.375, moderate: 1.55, high: 1.725, very_high: 1.9 }[q.activity]
  const tdee = Math.round(bmr * actFactor)

  // goal adjustments
  const base = q.goal === 'loss' ? tdee - 300
    : q.goal === 'gain' ? tdee + 300
    : tdee

  const protein_g_per_kg = q.goal === 'performance' || q.goal === 'gain' ? 2.0 : 1.7
  const p = Math.round(q.weight * protein_g_per_kg)

  const makeDay = (kcal: number) => {
    const pKcal = p * 4
    const fKcal = Math.round(kcal * 0.25)
    const cKcal = kcal - pKcal - fKcal
    return { kcal, p, c: Math.round(cKcal / 4), f: Math.round(fKcal / 9) }
  }

  return {
    low:  makeDay(Math.round(base * 0.85)),
    mid:  makeDay(base),
    hard: makeDay(Math.round(base * 1.25)),
    protein_g_per_kg,
    created_at: new Date().toISOString().split('T')[0],
  }
}

/* ─── SUB-COMPONENTS ─────────────────────────────────────────────── */

function MacroBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>{label}</span>
        <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(value)}g</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

function KcalRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 54, cx = 64, cy = 64
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, target > 0 ? consumed / target : 0)
  const dash = pct * circ
  const remaining = Math.max(0, target - consumed)
  return (
    <svg width={128} height={128} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00c8e0" strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-main)"
        fontSize={22} fontFamily="var(--font-mono)" fontWeight={700}>{Math.round(consumed)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-mid)"
        fontSize={11} fontFamily="var(--font-body)">kcal</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--text-muted)"
        fontSize={10} fontFamily="var(--font-body)">{remaining > 0 ? `−${Math.round(remaining)} restantes` : 'Objectif atteint'}</text>
    </svg>
  )
}

function ConfidenceDot({ score }: { score?: number }) {
  if (score == null) return null
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f97316' : '#ef4444'
  return (
    <span title={`Confiance : ${score}%`}
      style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginLeft: 5, verticalAlign: 'middle' }} />
  )
}

/* ─── ADD MEAL MODAL ─────────────────────────────────────────────── */
function AddMealModal({ mealLabel, onClose, onAdd }: {
  mealLabel: string
  onClose: () => void
  onAdd: (entries: FoodEntry[]) => void
}) {
  const [mode, setMode] = useState<AddMode>('text')
  const [textInput, setTextInput] = useState('')
  const [parsed, setParsed] = useState<FoodEntry[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualKcal, setManualKcal] = useState('')
  const [manualP, setManualP] = useState('')
  const [manualC, setManualC] = useState('')
  const [manualF, setManualF] = useState('')
  const [manualQty, setManualQty] = useState('100')

  function handleParse() {
    setIsParsing(true)
    setTimeout(() => {
      setParsed(parseTextEntries(textInput))
      setIsParsing(false)
    }, 600)
  }

  function handleAddText() {
    if (parsed.length) { onAdd(parsed); onClose() }
  }

  function handleAddManual() {
    const entry: FoodEntry = {
      id: uid(),
      name: manualName || 'Aliment',
      kcal: Number(manualKcal) || 0,
      p: Number(manualP) || 0,
      c: Number(manualC) || 0,
      f: Number(manualF) || 0,
      qty: Number(manualQty) || 100,
    }
    onAdd([entry]); onClose()
  }

  const modes: { id: AddMode; label: string }[] = [
    { id: 'text',   label: 'Texte libre' },
    { id: 'manual', label: 'Manuel' },
    { id: 'photo',  label: 'Photo (bientôt)' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 18 }}>Ajouter — {mealLabel}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => m.id !== 'photo' && setMode(m.id)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid var(--border)',
                background: mode === m.id ? '#00c8e0' : 'transparent',
                color: mode === m.id ? '#fff' : 'var(--text-mid)',
                fontFamily: 'var(--font-body)', fontSize: 13, cursor: m.id === 'photo' ? 'not-allowed' : 'pointer',
                opacity: m.id === 'photo' ? 0.5 : 1 }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Text mode */}
        {mode === 'text' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 12 }}>
              Écris ce que tu as mangé, ex. : <em>150g poulet + 200g riz + brocoli</em>
            </p>
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
              placeholder="150g flocons avoine + 200ml lait + banane"
              rows={3} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-main)',
                color: 'var(--text-main)', padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={handleParse} disabled={!textInput.trim() || isParsing}
              style={{ marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                background: '#00c8e0', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {isParsing ? 'Analyse…' : 'Analyser'}
            </button>
            {parsed.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Résultats :</p>
                {parsed.map(e => (
                  <div key={e.id} style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 14, color: 'var(--text-main)' }}>{e.name}</span>
                      <ConfidenceDot score={e.confidence} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        P {e.p}g · C {e.c}g · L {e.f}g
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00c8e0', fontSize: 14 }}>{e.kcal} kcal</span>
                  </div>
                ))}
                <button onClick={handleAddText}
                  style={{ marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                    background: '#22c55e', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Ajouter au repas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nom</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Ex: Crème de riz"
                style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-main)',
                  color: 'var(--text-main)', padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Quantité (g)', val: manualQty, set: setManualQty },
                { label: 'Calories (kcal)', val: manualKcal, set: setManualKcal },
                { label: 'Protéines (g)', val: manualP, set: setManualP },
                { label: 'Glucides (g)', val: manualC, set: setManualC },
                { label: 'Lipides (g)', val: manualF, set: setManualF },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)} min={0}
                    style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-main)',
                      color: 'var(--text-main)', padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <button onClick={handleAddManual} disabled={!manualName.trim()}
              style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                background: '#00c8e0', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: !manualName.trim() ? 0.5 : 1 }}>
              Ajouter
            </button>
          </div>
        )}

        {mode === 'photo' && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Analyse photo par IA — disponible prochainement.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PLAN QUESTIONNAIRE MODAL ───────────────────────────────────── */
function PlanQuestionnaireModal({ onClose, onGenerate }: {
  onClose: () => void
  onGenerate: (plan: NutritionPlan) => void
}) {
  const [step, setStep] = useState<PlanStep>(0)
  const [q, setQ] = useState<QuestionnaireData>(DEFAULT_Q)
  const [plan, setPlan] = useState<NutritionPlan | null>(null)

  function handleGenerate() {
    const p = generatePlan(q)
    setPlan(p)
    setStep(3)
  }

  const inp = (style?: object) => ({
    width: '100%', borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--bg-main)', color: 'var(--text-main)',
    padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 14,
    boxSizing: 'border-box' as const, ...style,
  })

  const sel = (style?: object) => ({
    ...inp(style), cursor: 'pointer',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 18 }}>
            {step < 3 ? `Plan nutritionnel — Étape ${step + 1}/3` : 'Votre plan généré'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Progress */}
        {step < 3 && (
          <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', marginBottom: 24 }}>
            <div style={{ height: '100%', width: `${((step + 1) / 3) * 100}%`, background: '#00c8e0', borderRadius: 99, transition: 'width .3s' }} />
          </div>
        )}

        {/* Step 0 — Body */}
        {step === 0 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>Quelques informations sur toi pour personnaliser ton plan.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Poids (kg)', key: 'weight' as const, type: 'number' },
                { label: 'Taille (cm)', key: 'height' as const, type: 'number' },
                { label: 'Âge', key: 'age' as const, type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={q[key] as number} onChange={e => setQ(p => ({ ...p, [key]: Number(e.target.value) }))} style={inp()} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sexe</label>
                <select value={q.sex} onChange={e => setQ(p => ({ ...p, sex: e.target.value as 'm' | 'f' }))} style={sel()}>
                  <option value="m">Homme</option>
                  <option value="f">Femme</option>
                </select>
              </div>
            </div>
            <button onClick={() => setStep(1)} style={{ marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: '#00c8e0', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Suivant
            </button>
          </div>
        )}

        {/* Step 1 — Goal & activity */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Objectif principal</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['performance', 'Performance'], ['maintain', 'Maintien'], ['loss', 'Perte de poids'], ['gain', 'Prise de masse']] as const).map(([v, lbl]) => (
                  <button key={v} onClick={() => setQ(p => ({ ...p, goal: v }))}
                    style={{ padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)',
                      background: q.goal === v ? '#00c8e0' : 'transparent',
                      color: q.goal === v ? '#fff' : 'var(--text-mid)',
                      fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Niveau d'activité hors sport</label>
              <select value={q.activity} onChange={e => setQ(p => ({ ...p, activity: e.target.value as QuestionnaireData['activity'] }))} style={sel()}>
                <option value="low">Faible (bureau, peu de marche)</option>
                <option value="moderate">Modéré (actif au quotidien)</option>
                <option value="high">Élevé (travail physique)</option>
                <option value="very_high">Très élevé (travail très physique)</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Heures d'entraînement par semaine</label>
              <input type="number" min={0} max={40} value={q.training_h_week}
                onChange={e => setQ(p => ({ ...p, training_h_week: Number(e.target.value) }))} style={inp()} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}>Retour</button>
              <button onClick={() => setStep(2)} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: '#00c8e0', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Suivant</button>
            </div>
          </div>
        )}

        {/* Step 2 — Confirm */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>Résumé avant génération :</p>
            {[
              ['Poids', `${q.weight} kg`],
              ['Taille', `${q.height} cm`],
              ['Âge', `${q.age} ans`],
              ['Sexe', q.sex === 'm' ? 'Homme' : 'Femme'],
              ['Objectif', { performance: 'Performance', maintain: 'Maintien', loss: 'Perte de poids', gain: 'Prise de masse' }[q.goal]],
              ['Activité', { low: 'Faible', moderate: 'Modéré', high: 'Élevé', very_high: 'Très élevé' }[q.activity]],
              ['Entraînement', `${q.training_h_week}h/semaine`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}>Retour</button>
              <button onClick={handleGenerate} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: '#5b6fff', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Générer mon plan</button>
            </div>
          </div>
        )}

        {/* Step 3 — Result */}
        {step === 3 && plan && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
              Plan personnalisé — {q.weight} kg · {q.goal === 'performance' ? 'Performance' : q.goal}
            </p>
            {([
              ['Jour Low (repos)', plan.low, '#5b6fff'],
              ['Jour Mid (normal)', plan.mid, '#00c8e0'],
              ['Jour Hard (intensif)', plan.hard, '#f97316'],
            ] as [string, typeof plan.low, string][]).map(([label, day, color]) => (
              <div key={label} style={{ background: 'var(--bg-main)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text-main)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color, fontSize: 16 }}>{day.kcal} kcal</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  {[['P', day.p, '#22c55e'], ['G', day.c, '#f97316'], ['L', day.f, '#5b6fff']].map(([lbl, val, c]) => (
                    <span key={lbl as string} style={{ color: c as string }}>
                      <strong>{lbl}</strong> {val}g
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Protéines : {plan.protein_g_per_kg}g/kg · soit {Math.round(plan.protein_g_per_kg * q.weight)}g/j minimum
            </p>
            <button onClick={() => { onGenerate(plan); onClose() }}
              style={{ marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Enregistrer ce plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── SECTION TODAY ──────────────────────────────────────────────── */
function SectionToday({ meals, plan }: { meals: Meal[]; plan: NutritionPlan | null }) {
  const totals = totalDay(meals)
  const target = plan?.mid ?? { kcal: 2500, p: 160, c: 310, f: 72 }
  const tips = [
    'Post-séance : vise 25-30g de protéines + glucides rapides dans les 30 min.',
    `Aujourd'hui tu es à ${Math.round((totals.p / target.p) * 100)}% de ton objectif protéine — continue comme ça.`,
    "Hydratation : 35ml/kg/jour + 500ml par heure d'effort.",
  ]
  const tip = tips[new Date().getMinutes() % tips.length]

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: '0 0 18px' }}>Bilan du jour</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center', background: 'var(--bg-card)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <KcalRing consumed={totals.kcal} target={target.kcal} />
        <div>
          <MacroBar label="Protéines" value={totals.p} total={target.p} color="#22c55e" />
          <MacroBar label="Glucides"  value={totals.c} total={target.c} color="#f97316" />
          <MacroBar label="Lipides"   value={totals.f} total={target.f} color="#5b6fff" />
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Objectif : <strong style={{ color: 'var(--text-main)' }}>{target.kcal} kcal</strong></span>
            <span>P <strong style={{ color: '#22c55e' }}>{target.p}g</strong></span>
            <span>G <strong style={{ color: '#f97316' }}>{target.c}g</strong></span>
            <span>L <strong style={{ color: '#5b6fff' }}>{target.f}g</strong></span>
          </div>
        </div>
      </div>
      {/* AI tip */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c8e0', marginTop: 4, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>{tip}</p>
      </div>
    </div>
  )
}

/* ─── SECTION MEALS ──────────────────────────────────────────────── */
function SectionMeals({ meals, setMeals }: { meals: Meal[]; setMeals: React.Dispatch<React.SetStateAction<Meal[]>> }) {
  const [open, setOpen] = useState<MealType | null>('breakfast')
  const [addFor, setAddFor] = useState<Meal | null>(null)

  function removeEntry(mealType: MealType, entryId: string) {
    setMeals(ms => ms.map(m =>
      m.type === mealType ? { ...m, entries: m.entries.filter(e => e.id !== entryId) } : m
    ))
  }

  function addEntries(mealType: MealType, entries: FoodEntry[]) {
    setMeals(ms => ms.map(m =>
      m.type === mealType ? { ...m, entries: [...m.entries, ...entries] } : m
    ))
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: '0 0 18px' }}>Repas</h2>
      {meals.map(meal => {
        const totals = sumMacros(meal.entries)
        const isOpen = open === meal.type
        return (
          <div key={meal.type} style={{ background: 'var(--bg-card)', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div onClick={() => setOpen(isOpen ? null : meal.type)}
              style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--text-main)' }}>{meal.label}</span>
                {meal.entries.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meal.entries.length} aliment{meal.entries.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {meal.entries.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#00c8e0' }}>{Math.round(totals.kcal)} kcal</span>
                )}
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  <path d="M4 6l4 4 4-4" stroke="var(--text-muted)" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Body */}
            {isOpen && (
              <div style={{ padding: '0 18px 16px' }}>
                {meal.entries.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px', fontStyle: 'italic' }}>Aucun aliment enregistré.</p>
                )}
                {meal.entries.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: 14, color: 'var(--text-main)' }}>{entry.name}</span>
                      <ConfidenceDot score={entry.confidence} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        P {entry.p}g · G {entry.c}g · L {entry.f}g
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00c8e0', fontSize: 13 }}>{Math.round(entry.kcal)} kcal</span>
                      <button onClick={() => removeEntry(meal.type, entry.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setAddFor(meal)}
                  style={{ marginTop: 12, padding: '8px 16px', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', width: '100%' }}>
                  + Ajouter un aliment
                </button>
              </div>
            )}
          </div>
        )
      })}

      {addFor && (
        <AddMealModal
          mealLabel={addFor.label}
          onClose={() => setAddFor(null)}
          onAdd={entries => addEntries(addFor.type, entries)}
        />
      )}
    </div>
  )
}

/* ─── SECTION PLAN ───────────────────────────────────────────────── */
function SectionPlan({ plan, onCreatePlan }: { plan: NutritionPlan | null; onCreatePlan: () => void }) {
  if (!plan) {
    return (
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: '0 0 18px' }}>Plan nutritionnel</h2>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#00c8e0" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: '0 0 8px' }}>Pas encore de plan</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 20px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Génère un plan nutritionnel personnalisé basé sur ton profil, tes objectifs et ta charge d'entraînement.
          </p>
          <button onClick={onCreatePlan}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: '#00c8e0', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Créer mon plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>Plan nutritionnel</h2>
        <button onClick={onCreatePlan}
          style={{ padding: '7px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>
          Recalculer
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }} id="plan-grid">
        {([
          ['Jour Low', plan.low, '#5b6fff', 'Repos · récupération'],
          ['Jour Mid', plan.mid, '#00c8e0', 'Entraînement normal'],
          ['Jour Hard', plan.hard, '#f97316', 'Bloc intensif · course'],
        ] as [string, typeof plan.low, string, string][]).map(([label, day, color, sub]) => (
          <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 14px' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--text-main)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{sub}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, marginBottom: 10 }}>{day.kcal}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}> kcal</span></div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['P', day.p, '#22c55e'], ['G', day.c, '#f97316'], ['L', day.f, '#5b6fff']].map(([lbl, val, c]) => (
                <div key={lbl as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c as string }}>{val}g</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 18px', fontSize: 13, color: 'var(--text-muted)' }}>
        Protéines cibles : <strong style={{ color: 'var(--text-main)' }}>{plan.protein_g_per_kg}g/kg/jour</strong>
        {' · '}Généré le {new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <style>{`
        @media (max-width: 600px) {
          #plan-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ─── PAGE ───────────────────────────────────────────────────────── */
export default function NutritionPage() {
  /* TODO: load from Supabase nutrition_logs + nutrition_plan */
  const [meals, setMeals] = useState<Meal[]>(MOCK_MEALS)
  const [plan, setPlan] = useState<NutritionPlan | null>(MOCK_PLAN)
  const [showPlanModal, setShowPlanModal] = useState(false)

  return (
    <div style={{ padding: '32px 24px', maxWidth: 820, margin: '0 auto' }}>
      <style>{`
        @media (max-width: 767px) {
          .nutrition-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="nutrition-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, margin: '0 0 6px' }}>Nutrition</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => setShowPlanModal(true)}
          style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {plan ? 'Mon plan' : '+ Créer un plan'}
        </button>
      </div>

      <SectionToday meals={meals} plan={plan} />
      <SectionMeals meals={meals} setMeals={setMeals} />
      <SectionPlan plan={plan} onCreatePlan={() => setShowPlanModal(true)} />

      {showPlanModal && (
        <PlanQuestionnaireModal
          onClose={() => setShowPlanModal(false)}
          onGenerate={newPlan => {
            setPlan(newPlan)
            /* TODO: upsert to Supabase nutrition_plan */
          }}
        />
      )}
    </div>
  )
}
