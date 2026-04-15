'use client'

import { useState, useRef, useEffect } from 'react'
// import { createClient } from '@/lib/supabase/client'
import AIAssistantButton from '@/components/ai/AIAssistantButton'

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
type MealType   = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner'
type AddMode    = 'text' | 'manual' | 'photo'
type DayType    = 'low' | 'mid' | 'hard'
type GoalType   = 'performance' | 'loss' | 'gain' | 'maintain'
type PlanMode   = 'strict' | 'flexible'
type ChatRole   = 'user' | 'ai'
type HistRange  = '7j' | '14j'
type MacroKey   = 'p' | 'c' | 'f'

interface Macros { kcal: number; p: number; c: number; f: number }
interface FoodEntry extends Macros { id: string; name: string; qty?: number; confidence?: number }
interface Meal { type: MealType; label: string; entries: FoodEntry[] }
interface SavedMeal { id: string; name: string; entries: FoodEntry[]; totalKcal: number }
interface GoalConfig { id: string; type: GoalType; sport?: string; period?: string; priority: 'high' | 'mid' | 'low' }
interface DayPlan extends Macros { subtitle: string }
interface NutritionPlan {
  low: DayPlan; mid: DayPlan; hard: DayPlan
  protein_g_per_kg: number; mode: PlanMode
  goals: GoalConfig[]; created_at: string
}
interface HistoryDay { label: string; consumed_kcal: number; planned_kcal: number; p: number; c: number; f: number }
interface BodyPoint  { label: string; weight: number; fat_pct?: number; muscle_kg?: number }
interface ChatMessage { id: string; role: ChatRole; content: string; ts: string }
interface Prefs { liked: string[]; disliked: string[]; allergies: string[]; intolerances: string[] }
interface SportContext { today_type: DayType; today_label: string; tomorrow?: string; upcoming_race?: string; tip: string }
interface QuestionnaireData {
  goal: GoalType; multiple_goals: boolean; goals: GoalConfig[]
  age: number; height: number; weight: number; sex: 'm' | 'f'
  main_sport: string; sessions_per_week: number; weekly_vol_h: number
  intensity: 'low' | 'moderate' | 'high' | 'very_high'
  allow_calendar: boolean
  has_smart_scale: boolean; want_scale_connect: boolean
  job_activity: 'sedentary' | 'active' | 'very_active'
  meals_per_day: number; has_breakfast: boolean; breakfast_habit: string
  prefs: Prefs; plan_mode: PlanMode; meal_options: boolean
  cook_time: 'low' | 'mid' | 'high'; travels: boolean
}

// ══════════════════════════════════════════════════════════════════
// FOOD DATABASE — 50 aliments courants (valeurs pour 100g)
// ══════════════════════════════════════════════════════════════════
const FOOD_DB: Record<string, Macros> = {
  'flocons avoine':     { kcal:379, p:13.2, c:67,  f:7   },
  'avoine':             { kcal:379, p:13.2, c:67,  f:7   },
  'riz blanc cuit':     { kcal:130, p:2.7,  c:28,  f:0.3 },
  'riz':                { kcal:130, p:2.7,  c:28,  f:0.3 },
  'pâtes cuites':       { kcal:158, p:5.8,  c:31,  f:0.9 },
  'pâtes':              { kcal:158, p:5.8,  c:31,  f:0.9 },
  'pain complet':       { kcal:247, p:9,    c:46,  f:3.4 },
  'pain':               { kcal:270, p:9,    c:50,  f:3.2 },
  'baguette':           { kcal:275, p:9.4,  c:56,  f:1.2 },
  'quinoa cuit':        { kcal:120, p:4.4,  c:22,  f:1.9 },
  'patate douce':       { kcal:86,  p:1.6,  c:20,  f:0.1 },
  'pomme de terre':     { kcal:77,  p:2,    c:17,  f:0.1 },
  'poulet cuit':        { kcal:165, p:31,   c:0,   f:3.6 },
  'poulet':             { kcal:165, p:31,   c:0,   f:3.6 },
  'thon conserve':      { kcal:116, p:26,   c:0,   f:1   },
  'thon':               { kcal:116, p:26,   c:0,   f:1   },
  'saumon':             { kcal:208, p:20,   c:0,   f:13  },
  'oeuf':               { kcal:155, p:13,   c:1.1, f:11  },
  'oeufs':              { kcal:155, p:13,   c:1.1, f:11  },
  'boeuf':              { kcal:215, p:26,   c:0,   f:12  },
  'steak':              { kcal:215, p:26,   c:0,   f:12  },
  'lait':               { kcal:42,  p:3.4,  c:5,   f:1   },
  'lait entier':        { kcal:61,  p:3.2,  c:4.8, f:3.3 },
  'yaourt grec':        { kcal:97,  p:9,    c:3.6, f:5   },
  'fromage blanc':      { kcal:65,  p:8,    c:3.9, f:1.8 },
  'cottage cheese':     { kcal:98,  p:11.1, c:3.4, f:4.3 },
  'whey':               { kcal:380, p:75,   c:7,   f:5   },
  'whey proteine':      { kcal:380, p:75,   c:7,   f:5   },
  'banane':             { kcal:89,  p:1.1,  c:23,  f:0.3 },
  'pomme':              { kcal:52,  p:0.3,  c:14,  f:0.2 },
  'orange':             { kcal:47,  p:0.9,  c:12,  f:0.1 },
  'myrtilles':          { kcal:57,  p:0.7,  c:14,  f:0.3 },
  'fraises':            { kcal:32,  p:0.7,  c:8,   f:0.3 },
  'beurre cacahuete':   { kcal:588, p:25,   c:20,  f:50  },
  'amandes':            { kcal:579, p:21,   c:22,  f:50  },
  'noix':               { kcal:654, p:15,   c:14,  f:65  },
  'huile olive':        { kcal:884, p:0,    c:0,   f:100 },
  'huile':              { kcal:884, p:0,    c:0,   f:100 },
  'beurre':             { kcal:717, p:0.9,  c:0.1, f:81  },
  'brocoli':            { kcal:34,  p:2.8,  c:7,   f:0.4 },
  'epinards':           { kcal:23,  p:2.9,  c:3.6, f:0.4 },
  'courgette':          { kcal:17,  p:1.2,  c:3.1, f:0.3 },
  'carottes':           { kcal:41,  p:0.9,  c:10,  f:0.2 },
  'lentilles':          { kcal:116, p:9,    c:20,  f:0.4 },
  'pois chiches':       { kcal:164, p:8.9,  c:27,  f:2.6 },
  'chocolat noir':      { kcal:546, p:5,    c:60,  f:31  },
  'miel':               { kcal:304, p:0.3,  c:82,  f:0   },
  'granola':            { kcal:460, p:9,    c:64,  f:20  },
  'gel energetique':    { kcal:260, p:0,    c:65,  f:0   },
  'barre energetique':  { kcal:380, p:7,    c:64,  f:10  },
}

// ══════════════════════════════════════════════════════════════════
// MOCK DATA — supprimer quand Supabase branché
// ══════════════════════════════════════════════════════════════════
const MOCK_SPORT_CONTEXT: SportContext = {
  today_type: 'mid',
  today_label: 'Sortie vélo 2h — Z2/Z3',
  tomorrow: 'Séance run fractionné — intensif',
  upcoming_race: 'Ironman Barcelone dans 18 jours',
  tip: 'Séance longue demain : charge en glucides ce soir. Vise 8g/kg demain matin avant le fractionné.',
}

const MOCK_TODAY = {
  date: new Date().toISOString().split('T')[0],
  consumed: { kcal: 1847, p: 138, c: 192, f: 52 },
  planned:  { kcal: 2600, p: 160, c: 310, f: 72 },
}

const MOCK_HISTORY: HistoryDay[] = [
  { label: 'S-13', consumed_kcal: 2540, planned_kcal: 2600, p: 158, c: 308, f: 70 },
  { label: 'S-12', consumed_kcal: 2210, planned_kcal: 2100, p: 142, c: 248, f: 65 },
  { label: 'S-11', consumed_kcal: 2680, planned_kcal: 2600, p: 162, c: 316, f: 74 },
  { label: 'S-10', consumed_kcal: 3150, planned_kcal: 3200, p: 168, c: 422, f: 78 },
  { label: 'S-9',  consumed_kcal: 2580, planned_kcal: 2600, p: 155, c: 306, f: 71 },
  { label: 'S-8',  consumed_kcal: 1980, planned_kcal: 2100, p: 148, c: 236, f: 60 },
  { label: 'S-7',  consumed_kcal: 2720, planned_kcal: 2600, p: 164, c: 320, f: 76 },
  { label: 'S-6',  consumed_kcal: 2450, planned_kcal: 2600, p: 151, c: 292, f: 68 },
  { label: 'S-5',  consumed_kcal: 2590, planned_kcal: 2600, p: 159, c: 309, f: 73 },
  { label: 'S-4',  consumed_kcal: 3080, planned_kcal: 3200, p: 170, c: 415, f: 77 },
  { label: 'S-3',  consumed_kcal: 2100, planned_kcal: 2100, p: 144, c: 245, f: 62 },
  { label: 'S-2',  consumed_kcal: 2630, planned_kcal: 2600, p: 161, c: 314, f: 73 },
  { label: 'Hier', consumed_kcal: 2480, planned_kcal: 2600, p: 153, c: 298, f: 70 },
  { label: "Auj.", consumed_kcal: 1847, planned_kcal: 2600, p: 138, c: 192, f: 52 },
]

const MOCK_MEALS: Meal[] = [
  { type: 'breakfast', label: 'Petit-déjeuner', entries: [
    { id:'e1', name:'Flocons avoine (90g)', kcal:341, p:11.9, c:60.3, f:6.3, qty:90 },
    { id:'e2', name:'Lait demi-écrémé (200ml)', kcal:84, p:6.8, c:10, f:2.6, qty:200 },
    { id:'e3', name:'Banane (130g)', kcal:116, p:1.4, c:29.9, f:0.4, qty:130 },
  ]},
  { type: 'snack_am', label: 'Collation matin', entries: [] },
  { type: 'lunch', label: 'Déjeuner', entries: [
    { id:'e4', name:'Poulet cuit (200g)', kcal:330, p:62, c:0, f:7.2, qty:200 },
    { id:'e5', name:'Riz blanc cuit (200g)', kcal:260, p:5.4, c:56, f:0.6, qty:200 },
    { id:'e6', name:'Brocoli (150g)', kcal:51, p:4.2, c:10.5, f:0.6, qty:150 },
    { id:'e7', name:'Huile olive (10ml)', kcal:88, p:0, c:0, f:10, qty:10 },
  ]},
  { type: 'snack_pm', label: 'Collation après-midi', entries: [
    { id:'e8', name:'Yaourt grec (150g)', kcal:145, p:13.5, c:5.4, f:7.5, qty:150 },
  ]},
  { type: 'dinner', label: 'Dîner', entries: [] },
]

const MOCK_PLAN: NutritionPlan = {
  low:  { kcal:2100, p:150, c:230, f:65, subtitle:'Repos / récupération' },
  mid:  { kcal:2600, p:160, c:310, f:72, subtitle:'Séance modérée' },
  hard: { kcal:3200, p:170, c:430, f:78, subtitle:'Bloc intensif / course' },
  protein_g_per_kg: 2.0, mode: 'flexible',
  goals: [
    { id:'g1', type:'performance', sport:'Ironman', period:'Avril–Sept 2026', priority:'high' },
    { id:'g2', type:'gain',        sport:'Hyrox',   period:'Oct–Déc 2026',   priority:'mid' },
  ],
  created_at: '2026-03-15',
}

const MOCK_BODY: BodyPoint[] = [
  { label:'S-6', weight:76.1, fat_pct:13.2, muscle_kg:57.8 },
  { label:'S-5', weight:75.8, fat_pct:13.0, muscle_kg:57.9 },
  { label:'S-4', weight:75.6, fat_pct:12.8, muscle_kg:58.1 },
  { label:'S-3', weight:75.4, fat_pct:12.6, muscle_kg:58.2 },
  { label:'S-2', weight:75.3, fat_pct:12.5, muscle_kg:58.3 },
  { label:'Hier', weight:75.2, fat_pct:12.4, muscle_kg:58.4 },
  { label:"Auj.", weight:75.0, fat_pct:12.3, muscle_kg:58.5 },
]

const MOCK_FAVORITES: SavedMeal[] = [
  { id:'fav1', name:'Porridge banane whey', totalKcal:541, entries:[
    { id:'f1', name:'Flocons avoine 90g', kcal:341, p:11.9, c:60.3, f:6.3, qty:90 },
    { id:'f2', name:'Whey 30g', kcal:114, p:22.5, c:2.1, f:1.5, qty:30 },
    { id:'f3', name:'Banane 80g', kcal:71, p:0.9, c:18.4, f:0.2, qty:80 },
  ]},
  { id:'fav2', name:'Riz poulet légumes', totalKcal:641, entries:[
    { id:'f4', name:'Poulet 200g', kcal:330, p:62, c:0, f:7.2, qty:200 },
    { id:'f5', name:'Riz 180g', kcal:234, p:4.9, c:50.4, f:0.5, qty:180 },
    { id:'f6', name:'Légumes 100g', kcal:30, p:2, c:6, f:0.4, qty:100 },
  ]},
  { id:'fav3', name:'Post-training shake', totalKcal:420, entries:[
    { id:'f7', name:'Whey 40g', kcal:152, p:30, c:2.8, f:2, qty:40 },
    { id:'f8', name:'Banane 150g', kcal:134, p:1.7, c:34.5, f:0.5, qty:150 },
    { id:'f9', name:'Lait 200ml', kcal:84, p:6.8, c:10, f:2.6, qty:200 },
  ]},
]

const MOCK_PREFS: Prefs = {
  liked:       ['Flocons avoine', 'Poulet', 'Riz', 'Yaourt grec', 'Banane', 'Whey', 'Amandes'],
  disliked:    ['Sardines', 'Foie de veau'],
  allergies:   [],
  intolerances:['Lactose (léger)'],
}

const MOCK_CHAT: ChatMessage[] = [
  { id:'c0', role:'ai', content:"Bonjour. Je suis ton assistant nutrition, connecté à ton plan et à ton calendrier sportif.\n\nAujourd'hui : sortie vélo 2h (Z2/Z3). Tu es à 1 847 kcal pour l'instant. Il te reste 753 kcal à atteindre — concentre-toi sur le dîner avec des protéines et des glucides complexes.\n\nDemain matin : fractionné intensif. Je te recommande de charger en glucides ce soir.", ts:'08:45' },
]

const AI_RESPONSES: { kw: string[]; r: string }[] = [
  { kw:['faim','collation','snack','grignoter'], r:"Pour une collation efficace après ta sortie vélo :\n\n• Yaourt grec 150g + 30g amandes = ~290 kcal, 18g P\n• Fromage blanc + fruits rouges = ~180 kcal, 12g P\n• Rice cake + beurre de cacahuète = ~230 kcal\n\nVise 15-20g de protéines si c'est post-entraînement." },
  { kw:['plan','objectif','calories','kcal','apport'], r:"Ton plan actuel est orienté performance Ironman.\n\n• Jour Low (repos) : 2 100 kcal\n• Jour Mid (comme aujourd'hui) : 2 600 kcal\n• Jour Hard (bloc / course) : 3 200 kcal\n\nTu es à 71% de ton objectif du jour. Pour ce soir, vise un dîner complet avec 50-60g de glucides et 40g de protéines." },
  { kw:['matin','petit-déj','breakfast','levé','réveil'], r:"Pour ton petit-déjeuner avant une séance, ta routine flocons avoine + lait + banane est excellente.\n\nAvant un fractionné intensif (comme demain), ajoute 20-30g de whey ou 3 oeufs scrambled pour maximiser la synthèse protéique post-effort." },
  { kw:['course','ironman','compétition','race','marathon','triathlon'], r:"À J-18 de l'Ironman Barcelone :\n\n• Cette semaine : maintien des apports habituels\n• J-7 à J-3 : début de la charge glucidique progressive (7g/kg/j)\n• J-2 à J-1 : 8-10g/kg/j de glucides, réduire les fibres et les graisses\n• Matin course : 2-3h avant — repas connu, facilement digestible, 80-100g glucides\n\nÉvite tout aliment nouveau dans les 48h avant la course." },
  { kw:['protéine','muscle','masse','récupération'], r:"Avec ton objectif performance à 2g/kg pour 75kg → 150g de protéines/jour minimum.\n\nAujourd'hui tu es à 138g — manque ~12g. Un yaourt grec 200g + 30g amandes ce soir comblera le déficit.\n\nRépartis les protéines sur 4-5 prises pour maximiser la synthèse musculaire." },
  { kw:['poids','masse grasse','composition','balance'], r:"Ton évolution sur 6 semaines :\n\n• Poids : 76.1 → 75.0 kg (-1.1 kg)\n• Masse grasse : 13.2% → 12.3% (-0.9%)\n• Masse musculaire : 57.8 → 58.5 kg (+0.7 kg)\n\nRecomposition corporelle positive. Tu perds de la masse grasse tout en maintenant/développant ta masse musculaire." },
  { kw:['hydrat','eau','boire'], r:"Hydratation recommandée :\n\n• Base : 35-40ml/kg/jour → 2.6-3L pour 75kg\n• Sport : +500ml par heure d'effort continu\n• Séances longues : boisson isotonique avec électrolytes au-delà d'1h30\n\nAujourd'hui avec ta sortie vélo 2h : vise 3.5-4L total." },
]

const DEFAULT_Q: QuestionnaireData = {
  goal:'performance', multiple_goals:false, goals:[],
  age:31, height:178, weight:75, sex:'m',
  main_sport:'Triathlon', sessions_per_week:8, weekly_vol_h:12,
  intensity:'high',
  allow_calendar:true,
  has_smart_scale:false, want_scale_connect:false,
  job_activity:'sedentary',
  meals_per_day:4, has_breakfast:true, breakfast_habit:'Flocons avoine + lait + banane',
  prefs:{ liked:[], disliked:[], allergies:[], intolerances:[] },
  plan_mode:'flexible', meal_options:true,
  cook_time:'mid', travels:true,
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function nowTs() { return new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) }
function sumM(entries: FoodEntry[]): Macros {
  return entries.reduce((a,e) => ({ kcal:a.kcal+e.kcal, p:a.p+e.p, c:a.c+e.c, f:a.f+e.f }), { kcal:0,p:0,c:0,f:0 })
}
function totalDay(meals: Meal[]): Macros { return sumM(meals.flatMap(m => m.entries)) }

function dayStatus(consumed: number, target: number): { label: string; color: string; bg: string } {
  const r = target > 0 ? consumed / target : 0
  if (r >= 0.95 && r <= 1.1) return { label:'Cohérent',     color:'#22c55e', bg:'rgba(34,197,94,0.12)' }
  if (r >= 0.75 && r <  0.95) return { label:'À ajuster',   color:'#f97316', bg:'rgba(249,115,22,0.12)' }
  if (r < 0.75)               return { label:'Insuffisant', color:'#ef4444', bg:'rgba(239,68,68,0.12)' }
  return                             { label:'Excessif',    color:'#5b6fff', bg:'rgba(91,111,255,0.12)' }
}

function parseTextEntries(text: string): FoodEntry[] {
  const results: FoodEntry[] = []
  const parts = text.toLowerCase().split(/[+\n,;]/).map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    const qtyMatch = part.match(/(\d+)\s*(?:g|ml|kg)?/)
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 100
    const clean = part.replace(/\d+\s*(?:g|ml|kg)?/g, '').replace(/[()]/g, '').trim()
    let bestKey = '', bestScore = 0
    for (const key of Object.keys(FOOD_DB)) {
      if (clean.includes(key) || key.includes(clean)) {
        const score = key.length; if (score > bestScore) { bestScore = score; bestKey = key }
      }
    }
    if (bestKey) {
      const db = FOOD_DB[bestKey]; const r = qty / 100
      results.push({ id:uid(), name:`${bestKey.charAt(0).toUpperCase()+bestKey.slice(1)} (${qty}g)`,
        kcal:Math.round(db.kcal*r), p:Math.round(db.p*r*10)/10, c:Math.round(db.c*r*10)/10, f:Math.round(db.f*r*10)/10,
        qty, confidence:82 })
    } else if (clean.length > 2) {
      results.push({ id:uid(), name:clean.charAt(0).toUpperCase()+clean.slice(1),
        kcal:0,p:0,c:0,f:0, qty, confidence:15 })
    }
  }
  return results
}

function generatePlan(q: QuestionnaireData): NutritionPlan {
  const bmr = q.sex === 'm'
    ? 10*q.weight + 6.25*q.height - 5*q.age + 5
    : 10*q.weight + 6.25*q.height - 5*q.age - 161
  const af = { low:1.375, moderate:1.55, high:1.725, very_high:1.9 }[q.intensity]
  const jaf = { sedentary:1.0, active:1.05, very_active:1.1 }[q.job_activity]
  const base = Math.round(bmr * af * jaf)
  const adj = q.goal==='loss' ? base-300 : q.goal==='gain' ? base+300 : base
  const ppk = q.goal==='performance'||q.goal==='gain' ? 2.0 : 1.7
  const p = Math.round(q.weight * ppk)
  const mk = (kcal: number): DayPlan => {
    const fK = Math.round(kcal*0.25); const cK = kcal - p*4 - fK
    return { kcal, p, c:Math.max(0,Math.round(cK/4)), f:Math.round(fK/9), subtitle:'' }
  }
  return {
    low:  { ...mk(Math.round(adj*0.82)), subtitle:'Repos / récupération' },
    mid:  { ...mk(adj),                  subtitle:'Séance modérée' },
    hard: { ...mk(Math.round(adj*1.28)), subtitle:'Bloc intensif / course' },
    protein_g_per_kg:ppk, mode:q.plan_mode, goals:q.goals,
    created_at:new Date().toISOString().split('T')[0],
  }
}

// ══════════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════
function KcalRing({ consumed, target, size=128 }: { consumed:number; target:number; size?:number }) {
  const r = (size-14)/2; const cx=size/2; const cy=size/2
  const circ = 2*Math.PI*r; const pct = Math.min(1, target>0 ? consumed/target : 0)
  const st = dayStatus(consumed, target)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={10}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={st.color} strokeWidth={10}
        strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round"
        style={{ filter:`drop-shadow(0 0 6px ${st.color}55)`, transition:'stroke-dashoffset .8s' }}/>
      <text x={cx} y={cy-12} textAnchor="middle" fill={st.color}
        fontSize={size>110?22:18} fontFamily="Syne,sans-serif" fontWeight={800}
        style={{ transform:`rotate(90deg) translate(0, 0)` }}/>
    </svg>
  )
}

function KcalRingLabeled({ consumed, target }: { consumed:number; target:number }) {
  const size=148; const r=60; const cx=74; const cy=74
  const circ=2*Math.PI*r; const pct=Math.min(1, target>0 ? consumed/target : 0)
  const st = dayStatus(consumed, target); const remaining=Math.max(0,target-consumed)
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={11}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={st.color} strokeWidth={11}
          strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 8px ${st.color}66)`, transition:'stroke-dashoffset .8s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0 }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:28, color:st.color, lineHeight:1 }}>{Math.round(consumed)}</span>
        <span style={{ fontSize:10, color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif' }}>kcal</span>
        <span style={{ fontSize:9, color:'var(--text-dim)', marginTop:2, fontFamily:'DM Sans,sans-serif' }}>
          {remaining>0 ? `−${Math.round(remaining)} restantes` : 'Objectif atteint'}
        </span>
      </div>
    </div>
  )
}

function MacroBar({ label, value, target, color }: { label:string; value:number; target:number; color:string }) {
  const pct = target>0 ? Math.min(100,(value/target)*100) : 0
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11 }}>
        <span style={{ color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif' }}>{label}</span>
        <span style={{ color:'var(--text-mid)', fontFamily:'DM Mono,monospace', fontWeight:600 }}>
          {Math.round(value)}<span style={{ color:'var(--text-dim)', fontWeight:400 }}>/{Math.round(target)}g</span>
        </span>
      </div>
      <div style={{ height:5, borderRadius:99, background:'var(--border)' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99, transition:'width .5s ease' }}/>
      </div>
    </div>
  )
}

function ConfidenceDot({ score }: { score?: number }) {
  if (!score) return null
  const c = score>=75?'#22c55e':score>=45?'#f97316':'#ef4444'
  return <span title={`Confiance : ${score}%`} style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:c, marginLeft:5, verticalAlign:'middle' }}/>
}

function Pill({ active, color, children, onClick }: { active:boolean; color:string; children:React.ReactNode; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ padding:'6px 14px', borderRadius:99, border:`1px solid ${active?color:'var(--border)'}`,
      background:active?color:'transparent', color:active?'#fff':'var(--text-dim)',
      fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════
// KCAL BAR CHART
// ══════════════════════════════════════════════════════════════════
function KcalBarChart({ data, range, onRange }: { data:HistoryDay[]; range:HistRange; onRange:(r:HistRange)=>void }) {
  const days = range==='7j' ? data.slice(-7) : data
  const maxKcal = Math.max(...days.map(d => Math.max(d.consumed_kcal, d.planned_kcal)), 1)
  const H=90, BW=range==='7j'?38:22, GAP=range==='7j'?10:5
  const totalW = days.length*(BW+GAP)-GAP+2
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:0 }}>Kcal — consommé vs prévu</p>
        <div style={{ display:'flex', gap:6 }}>
          {(['7j','14j'] as HistRange[]).map(r => <Pill key={r} active={range===r} color="#00c8e0" onClick={()=>onRange(r)}>{r}</Pill>)}
        </div>
      </div>
      <div style={{ display:'flex', gap:14, fontSize:9, color:'var(--text-dim)', marginBottom:8 }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:10, height:10, background:'rgba(0,200,224,0.18)', border:'1px solid rgba(0,200,224,0.4)', borderRadius:2 }}/> Prévu</span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ display:'inline-block', width:10, height:10, background:'#00c8e0', borderRadius:2 }}/> Consommé</span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <svg width={totalW} height={H+20} viewBox={`0 0 ${totalW} ${H+20}`} style={{ display:'block' }}>
          {days.map((d, i) => {
            const x = i*(BW+GAP)+1
            const pH = Math.round((d.planned_kcal/maxKcal)*(H-4))
            const cH = Math.round((d.consumed_kcal/maxKcal)*(H-4))
            const isToday = i===days.length-1
            return (
              <g key={i}>
                <rect x={x} y={H-pH} width={BW} height={pH} rx={3}
                  fill="rgba(0,200,224,0.12)" stroke="rgba(0,200,224,0.3)" strokeWidth={1}/>
                <rect x={x} y={H-cH} width={BW} height={cH} rx={3}
                  fill={isToday ? '#00c8e0' : 'rgba(0,200,224,0.65)'}
                  style={{ filter: isToday ? 'drop-shadow(0 0 4px rgba(0,200,224,0.5))' : 'none' }}/>
                <text x={x+BW/2} y={H+13} textAnchor="middle" fontSize={7.5}
                  fill={isToday ? '#00c8e0' : 'var(--text-dim)'}
                  fontFamily="DM Sans,sans-serif" fontWeight={isToday?700:400}>{d.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MACRO TREND CHART
// ══════════════════════════════════════════════════════════════════
function MacroTrendChart({ data, range, onRange }: { data:HistoryDay[]; range:HistRange; onRange:(r:HistRange)=>void }) {
  const [macro, setMacro] = useState<MacroKey>('p')
  const days = range==='7j' ? data.slice(-7) : data
  const key = macro; const values = days.map(d => d[key])
  const maxV = Math.max(...values, 1)
  const H=70; const BW=range==='7j'?38:22; const GAP=range==='7j'?10:5
  const totalW = days.length*(BW+GAP)-GAP+2
  const COLOR = { p:'#22c55e', c:'#f97316', f:'#5b6fff' }[macro]
  const LABEL = { p:'Protéines', c:'Glucides', f:'Lipides' }[macro]
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:0 }}>{LABEL} (g)</p>
        <div style={{ display:'flex', gap:6 }}>
          {(['p','c','f'] as MacroKey[]).map(m => (
            <Pill key={m} active={macro===m} color={{ p:'#22c55e', c:'#f97316', f:'#5b6fff' }[m]} onClick={()=>setMacro(m)}>
              {{ p:'Prot.', c:'Gluc.', f:'Lip.' }[m]}
            </Pill>
          ))}
          <div style={{ width:1, background:'var(--border)', margin:'0 2px' }}/>
          {(['7j','14j'] as HistRange[]).map(r => <Pill key={r} active={range===r} color="#00c8e0" onClick={()=>onRange(r)}>{r}</Pill>)}
        </div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <svg width={totalW} height={H+20} viewBox={`0 0 ${totalW} ${H+20}`} style={{ display:'block' }}>
          {days.map((d, i) => {
            const x = i*(BW+GAP)+1; const v = d[key]; const bH = Math.round((v/maxV)*(H-4))
            const isToday = i===days.length-1
            return (
              <g key={i}>
                <rect x={x} y={H-bH} width={BW} height={bH} rx={3}
                  fill={isToday ? COLOR : `${COLOR}99`}
                  style={{ filter: isToday ? `drop-shadow(0 0 4px ${COLOR}66)` : 'none' }}/>
                <text x={x+BW/2} y={H+13} textAnchor="middle" fontSize={7.5}
                  fill={isToday ? COLOR : 'var(--text-dim)'}
                  fontFamily="DM Sans,sans-serif" fontWeight={isToday?700:400}>{d.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// BODY WEIGHT CHART
// ══════════════════════════════════════════════════════════════════
function BodyWeightChart({ data }: { data: BodyPoint[] }) {
  const [metric, setMetric] = useState<'weight'|'fat_pct'|'muscle_kg'>('weight')
  const vals = data.map(d => d[metric] ?? 0).filter(v => v>0)
  if (!vals.length) return null
  const min=Math.min(...vals), max=Math.max(...vals), range=max-min||1
  const W=100, H=50
  const pts = vals.map((v,i) => ({
    x:(i/(vals.length-1))*W,
    y:H-4-((v-min)/range)*(H-8)
  }))
  const poly = pts.map(p=>`${p.x},${p.y}`).join(' ')
  const area = `M ${pts[0].x},${H} ${pts.map(p=>`L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length-1].x},${H} Z`
  const COLOR = { weight:'#00c8e0', fat_pct:'#f97316', muscle_kg:'#22c55e' }[metric]
  const LABEL = { weight:'Poids (kg)', fat_pct:'Masse grasse (%)', muscle_kg:'Masse musculaire (kg)' }[metric]
  const lastVal = data[data.length-1]
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:0 }}>Balance connectée — {LABEL}</p>
        <div style={{ display:'flex', gap:6 }}>
          {(['weight','fat_pct','muscle_kg'] as const).map(m => (
            <Pill key={m} active={metric===m} color={{ weight:'#00c8e0', fat_pct:'#f97316', muscle_kg:'#22c55e' }[m]} onClick={()=>setMetric(m)}>
              {{ weight:'Poids', fat_pct:'MG', muscle_kg:'MM' }[m]}
            </Pill>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:16, marginBottom:10, fontSize:11 }}>
        <span style={{ color:COLOR, fontFamily:'DM Mono,monospace', fontWeight:700, fontSize:20 }}>
          {metric==='weight' ? lastVal.weight : metric==='fat_pct' ? lastVal.fat_pct : lastVal.muscle_kg}
          <span style={{ fontSize:11, fontWeight:400, color:'var(--text-dim)' }}>{metric==='fat_pct'?'%':' kg'}</span>
        </span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
        <defs>
          <linearGradient id={`bg-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={COLOR} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#bg-${metric})`}/>
        <polyline fill="none" stroke={COLOR} strokeWidth="1.8" points={poly} strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={COLOR} opacity={i===pts.length-1?1:0.4}/>)}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        {data.map((d,i) => <span key={i} style={{ fontSize:7.5, color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif' }}>{d.label}</span>)}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ADD MEAL MODAL
// ══════════════════════════════════════════════════════════════════
function AddMealModal({ mealLabel, onClose, onAdd }: { mealLabel:string; onClose:()=>void; onAdd:(e:FoodEntry[])=>void }) {
  const [mode, setMode]       = useState<AddMode>('text')
  const [text, setText]       = useState('')
  const [parsed, setParsed]   = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [mName, setMName]     = useState('')
  const [mKcal, setMKcal]     = useState('')
  const [mP,    setMP]        = useState('')
  const [mC,    setMC]        = useState('')
  const [mF,    setMF]        = useState('')
  const [mQty,  setMQty]      = useState('100')

  function doAnalyze() {
    setLoading(true)
    setTimeout(() => { setParsed(parseTextEntries(text)); setLoading(false) }, 700)
  }
  function doAddText() { if (parsed.length) { onAdd(parsed); onClose() } }
  function doAddManual() {
    onAdd([{ id:uid(), name:mName||'Aliment', kcal:+mKcal||0, p:+mP||0, c:+mC||0, f:+mF||0, qty:+mQty||100 }])
    onClose()
  }

  const inp: React.CSSProperties = {
    width:'100%', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card2)',
    color:'var(--text-main)', padding:'9px 12px', fontFamily:'DM Sans,sans-serif', fontSize:13, boxSizing:'border-box',
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:480, width:'100%', maxHeight:'88vh', overflowY:'auto', boxShadow:'var(--shadow-card)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>Ajouter un aliment</h3>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{mealLabel}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {([['text','Texte libre'],['manual','Manuel'],['photo','Photo']] as [AddMode,string][]).map(([m,lbl]) => (
            <button key={m} onClick={()=>m!=='photo'&&setMode(m)}
              style={{ flex:1, padding:'8px 0', borderRadius:10, border:`1px solid ${mode===m?'#00c8e0':'var(--border)'}`,
                background:mode===m?'#00c8e0':'transparent', color:mode===m?'#fff':'var(--text-dim)',
                fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:m==='photo'?'not-allowed':'pointer',
                opacity:m==='photo'?0.45:1 }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Text mode */}
        {mode==='text' && (
          <div>
            <p style={{ fontSize:12, color:'var(--text-dim)', marginTop:0, marginBottom:10, lineHeight:1.6 }}>
              Décris ce que tu as mangé — ex. : <em>150g poulet + 200g riz + brocoli</em>
            </p>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={3}
              placeholder="3 oeufs + 80g flocons avoine + banane + 200ml lait"
              style={{ ...inp, resize:'vertical', lineHeight:1.5 }}/>
            <button onClick={doAnalyze} disabled={!text.trim()||loading}
              style={{ marginTop:10, width:'100%', padding:'11px 0', borderRadius:10, border:'none',
                background:'#00c8e0', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700,
                cursor:'pointer', opacity:!text.trim()?0.5:1 }}>
              {loading ? 'Analyse en cours…' : 'Analyser'}
            </button>
            {parsed.length>0 && (
              <div style={{ marginTop:16 }}>
                <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:8 }}>Résultats détectés :</p>
                {parsed.map(e => (
                  <div key={e.id} style={{ background:'var(--bg-card2)', borderRadius:10, padding:'10px 12px', marginBottom:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontSize:13, color:'var(--text-main)' }}>{e.name}</span>
                      <ConfidenceDot score={e.confidence}/>
                      <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>P {e.p}g · G {e.c}g · L {e.f}g</div>
                    </div>
                    <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:'#00c8e0', fontSize:13 }}>{e.kcal} kcal</span>
                  </div>
                ))}
                <button onClick={doAddText}
                  style={{ marginTop:8, width:'100%', padding:'11px 0', borderRadius:10, border:'none',
                    background:'#22c55e', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Ajouter au repas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode==='manual' && (
          <div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Nom de l'aliment</label>
              <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="Ex : Crème de riz" style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[['Quantité (g)','number',mQty,setMQty],['Calories (kcal)','number',mKcal,setMKcal],
                ['Protéines (g)','number',mP,setMP],['Glucides (g)','number',mC,setMC],['Lipides (g)','number',mF,setMF],
              ].map(([lbl,type,val,set]) => (
                <div key={lbl as string}>
                  <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>{lbl as string}</label>
                  <input type={type as string} value={val as string} min={0}
                    onChange={e=>(set as (v:string)=>void)(e.target.value)}
                    style={{ ...inp, fontFamily:'DM Mono,monospace' }}/>
                </div>
              ))}
            </div>
            <button onClick={doAddManual} disabled={!mName.trim()}
              style={{ width:'100%', padding:'11px 0', borderRadius:10, border:'none', background:'#00c8e0',
                color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer',
                opacity:!mName.trim()?0.5:1 }}>
              Ajouter
            </button>
          </div>
        )}

        {/* Photo mode */}
        {mode==='photo' && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-dim)', fontSize:13, lineHeight:1.7 }}>
            Analyse photo par IA.<br/>
            <span style={{ fontSize:11, opacity:0.6 }}>Disponible dans une prochaine mise à jour.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PLAN QUESTIONNAIRE MODAL (11 étapes)
// ══════════════════════════════════════════════════════════════════
function PlanQuestionnaireModal({ onClose, onGenerate }: { onClose:()=>void; onGenerate:(p:NutritionPlan)=>void }) {
  const [step, setStep] = useState(0)
  const [q, setQ]       = useState<QuestionnaireData>(DEFAULT_Q)
  const [plan, setPlan] = useState<NutritionPlan|null>(null)
  const STEPS = 11

  function set<K extends keyof QuestionnaireData>(k:K, v:QuestionnaireData[K]) { setQ(prev=>({...prev,[k]:v})) }
  function setPrefs<K extends keyof Prefs>(k:K, v:Prefs[K]) { setQ(prev=>({...prev,prefs:{...prev.prefs,[k]:v}})) }
  function addTag(k:keyof Prefs, val:string) {
    if (!val.trim()) return
    setQ(prev => ({ ...prev, prefs:{ ...prev.prefs, [k]:[...prev.prefs[k], val.trim()] } }))
  }
  function rmTag(k:keyof Prefs, val:string) {
    setQ(prev => ({ ...prev, prefs:{ ...prev.prefs, [k]:prev.prefs[k].filter(x=>x!==val) } }))
  }

  const inp: React.CSSProperties = { width:'100%', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'9px 12px', fontFamily:'DM Sans,sans-serif', fontSize:13, boxSizing:'border-box' }
  const sel: React.CSSProperties = { ...inp, cursor:'pointer' }

  function btnChoice(active:boolean, color:string='#00c8e0') {
    return { padding:'9px 14px', borderRadius:10, border:`1px solid ${active?color:'var(--border)'}`,
      background:active?color:'transparent', color:active?'#fff':'var(--text-dim)',
      fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer' } as React.CSSProperties
  }

  function TagInput({ field, placeholder }: { field:keyof Prefs; placeholder:string }) {
    const [val, setVal] = useState('')
    return (
      <div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
          {q.prefs[field].map(t => (
            <span key={t} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:99, padding:'3px 10px', fontSize:11, color:'var(--text-mid)', display:'flex', alignItems:'center', gap:5 }}>
              {t} <button onClick={()=>rmTag(field,t)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', padding:0, fontSize:13, lineHeight:1 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){addTag(field,val);setVal('')}}} placeholder={placeholder} style={inp}/>
          <button onClick={()=>{addTag(field,val);setVal('')}} style={{ padding:'0 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', cursor:'pointer', fontSize:18 }}>+</button>
        </div>
      </div>
    )
  }

  function doGenerate() { const p=generatePlan(q); setPlan(p); setStep(10) }

  const nav = (
    <div style={{ display:'flex', gap:10, marginTop:20 }}>
      {step>0 && step<10 && (
        <button onClick={()=>setStep(s=>s-1)} style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer' }}>Retour</button>
      )}
      {step<9 && (
        <button onClick={()=>setStep(s=>s+1)} style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none', background:'#00c8e0', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>Suivant</button>
      )}
      {step===9 && (
        <button onClick={doGenerate} style={{ flex:2, padding:'10px 0', borderRadius:10, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>Générer mon plan</button>
      )}
    </div>
  )

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:28, maxWidth:540, width:'100%', maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--shadow-card)' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:0 }}>
              {step<10 ? `Plan nutritionnel — Étape ${step+1}/${STEPS-1}` : 'Ton plan est prêt'}
            </h3>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>
              {['Objectif principal','Objectifs dans le temps','Profil physique','Activité sportive','Connexion aux autres pages','Balance connectée','Mode de vie','Habitudes alimentaires','Préférences & allergies','Type de plan','Validation'][step]}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>

        {/* Progress */}
        {step<10 && (
          <div style={{ height:3, borderRadius:99, background:'var(--border)', marginBottom:22 }}>
            <div style={{ height:'100%', width:`${((step+1)/10)*100}%`, background:'linear-gradient(90deg,#5b6fff,#00c8e0)', borderRadius:99, transition:'width .3s' }}/>
          </div>
        )}

        {/* Step 0 — Objectif */}
        {step===0 && (
          <div>
            <p style={{ fontSize:13, color:'var(--text-dim)', marginTop:0, marginBottom:14 }}>Quel est ton objectif principal en ce moment ?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {([['performance','Performance'],['loss','Perte de poids'],['gain','Prise de masse'],['maintain','Maintien']] as [GoalType,string][]).map(([v,lbl]) => (
                <button key={v} onClick={()=>set('goal',v)} style={btnChoice(q.goal===v)}>{lbl}</button>
              ))}
            </div>
            {nav}
          </div>
        )}

        {/* Step 1 — Objectifs multiples */}
        {step===1 && (
          <div>
            <p style={{ fontSize:13, color:'var(--text-dim)', marginTop:0, marginBottom:14 }}>As-tu plusieurs objectifs répartis dans l'année ? (ex. Ironman en été, Hyrox en automne)</p>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <button onClick={()=>set('multiple_goals',false)} style={btnChoice(!q.multiple_goals)}>Non — objectif unique</button>
              <button onClick={()=>set('multiple_goals',true)}  style={btnChoice(q.multiple_goals)}>Oui — plusieurs périodes</button>
            </div>
            {q.multiple_goals && (
              <div>
                <p style={{ fontSize:12, color:'var(--text-dim)', marginBottom:10 }}>Définis tes objectifs par période :</p>
                {q.goals.map((g,i) => (
                  <div key={g.id} style={{ background:'var(--bg-card2)', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontWeight:600, fontSize:13, color:'var(--text-main)' }}>{g.sport||g.type}</span>
                      <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:8 }}>{g.period}</span>
                    </div>
                    <button onClick={()=>set('goals',q.goals.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:16 }}>×</button>
                  </div>
                ))}
                <button onClick={()=>set('goals',[...q.goals,{ id:uid(), type:'performance', sport:'', period:'', priority:'mid' }])}
                  style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
                  + Ajouter un objectif
                </button>
              </div>
            )}
            {nav}
          </div>
        )}

        {/* Step 2 — Profil physique */}
        {step===2 && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              {([['Âge','age','number'],['Taille (cm)','height','number'],['Poids (kg)','weight','number']] as [string,keyof QuestionnaireData,string][]).map(([lbl,k,t]) => (
                <div key={k}>
                  <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>{lbl}</label>
                  <input type={t} value={q[k] as number} onChange={e=>set(k,+e.target.value as any)} style={{ ...inp, fontFamily:'DM Mono,monospace' }}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Sexe</label>
                <select value={q.sex} onChange={e=>set('sex',e.target.value as 'm'|'f')} style={sel}>
                  <option value="m">Homme</option><option value="f">Femme</option>
                </select>
              </div>
            </div>
            {nav}
          </div>
        )}

        {/* Step 3 — Activité sportive */}
        {step===3 && (
          <div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Sport principal</label>
              <input value={q.main_sport} onChange={e=>set('main_sport',e.target.value)} placeholder="Triathlon, course à pied, cyclisme…" style={inp}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Séances / semaine</label>
                <input type="number" min={0} max={20} value={q.sessions_per_week} onChange={e=>set('sessions_per_week',+e.target.value)} style={{ ...inp, fontFamily:'DM Mono,monospace' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Volume hebdo (heures)</label>
                <input type="number" min={0} max={40} value={q.weekly_vol_h} onChange={e=>set('weekly_vol_h',+e.target.value)} style={{ ...inp, fontFamily:'DM Mono,monospace' }}/>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:6 }}>Intensité globale</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {([['low','Faible'],['moderate','Modérée'],['high','Élevée'],['very_high','Très élevée']] as const).map(([v,lbl]) => (
                  <button key={v} onClick={()=>set('intensity',v)} style={btnChoice(q.intensity===v)}>{lbl}</button>
                ))}
              </div>
            </div>
            {nav}
          </div>
        )}

        {/* Step 4 — Connexion autres pages */}
        {step===4 && (
          <div>
            <p style={{ fontSize:13, color:'var(--text-dim)', marginTop:0, marginBottom:16, lineHeight:1.7 }}>
              Veux-tu que l'IA lise automatiquement ton planning d'entraînement, tes séances prévues et ton calendrier de courses pour adapter tes apports ?
            </p>
            <div style={{ background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.2)', borderRadius:12, padding:'12px 14px', marginBottom:16, fontSize:12, color:'var(--text-mid)', lineHeight:1.7 }}>
              Si activé : l'IA adapte automatiquement tes kcal, glucides et timing selon les séances longues, les blocs intensifs, les courses proches et les déplacements.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>set('allow_calendar',true)}  style={btnChoice(q.allow_calendar,'#00c8e0')}>Oui (recommandé)</button>
              <button onClick={()=>set('allow_calendar',false)} style={btnChoice(!q.allow_calendar)}>Non</button>
            </div>
            {nav}
          </div>
        )}

        {/* Step 5 — Balance connectée */}
        {step===5 && (
          <div>
            <p style={{ fontSize:13, color:'var(--text-dim)', marginTop:0, marginBottom:14 }}>Utilises-tu une balance connectée ?</p>
            <div style={{ display:'flex', gap:10, marginBottom:q.has_smart_scale?16:0 }}>
              <button onClick={()=>set('has_smart_scale',false)} style={btnChoice(!q.has_smart_scale)}>Non</button>
              <button onClick={()=>set('has_smart_scale',true)}  style={btnChoice(q.has_smart_scale)}>Oui</button>
            </div>
            {q.has_smart_scale && (
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:12, color:'var(--text-dim)', marginBottom:10 }}>Souhaites-tu connecter les données (poids, masse grasse, masse musculaire) à l'application ?</p>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>set('want_scale_connect',true)}  style={btnChoice(q.want_scale_connect)}>Oui</button>
                  <button onClick={()=>set('want_scale_connect',false)} style={btnChoice(!q.want_scale_connect)}>Non</button>
                </div>
              </div>
            )}
            {nav}
          </div>
        )}

        {/* Step 6 — Mode de vie */}
        {step===6 && (
          <div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:6 }}>Activité professionnelle</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {([['sedentary','Sédentaire','Bureau, peu de marche'],['active','Active','Debout, marche régulière'],['very_active','Très active','Travail physique']] as const).map(([v,lbl,sub]) => (
                  <button key={v} onClick={()=>set('job_activity',v)}
                    style={{ ...btnChoice(q.job_activity===v), textAlign:'left', display:'flex', flexDirection:'column', gap:2 }}>
                    <span>{lbl}</span>
                    <span style={{ fontSize:10, opacity:0.7, fontWeight:400 }}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>
            {nav}
          </div>
        )}

        {/* Step 7 — Habitudes */}
        {step===7 && (
          <div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Nombre de repas par jour</label>
              <input type="number" min={2} max={8} value={q.meals_per_day} onChange={e=>set('meals_per_day',+e.target.value)} style={{ ...inp, fontFamily:'DM Mono,monospace', width:120 }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:6 }}>As-tu un petit-déjeuner habituel ?</label>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>set('has_breakfast',true)}  style={btnChoice(q.has_breakfast)}>Oui</button>
                <button onClick={()=>set('has_breakfast',false)} style={btnChoice(!q.has_breakfast)}>Non / je saute le matin</button>
              </div>
            </div>
            {q.has_breakfast && (
              <div>
                <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:4 }}>Que manges-tu habituellement le matin ?</label>
                <textarea value={q.breakfast_habit} onChange={e=>set('breakfast_habit',e.target.value)} rows={2}
                  placeholder="Flocons avoine + lait + banane + café"
                  style={{ ...inp, resize:'none' }}/>
                <p style={{ fontSize:10, color:'var(--text-dim)', marginTop:6, marginBottom:0 }}>Si ta routine est cohérente avec tes objectifs, l'IA la respectera.</p>
              </div>
            )}
            {nav}
          </div>
        )}

        {/* Step 8 — Préférences */}
        {step===8 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {([['liked',"J'aime",'Poulet, riz, avoine...'],['disliked',"J'aime peu",'Sardines, foie...'],['allergies','Allergies','Arachides, gluten...'],['intolerances','Intolerances','Lactose, fructose...']] as [keyof Prefs,string,string][]).map(([field,lbl,ph]) => (
              <div key={field}>
                <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:6 }}>{lbl}</label>
                <TagInput field={field} placeholder={ph}/>
              </div>
            ))}
            {nav}
          </div>
        )}

        {/* Step 9 — Type de plan */}
        {step===9 && (
          <div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:8 }}>Type de plan</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button onClick={()=>set('plan_mode','strict')} style={{ ...btnChoice(q.plan_mode==='strict'), textAlign:'left', display:'flex', flexDirection:'column', gap:4, padding:'12px 14px' }}>
                  <span style={{ fontWeight:700 }}>Plan strict</span>
                  <span style={{ fontSize:11, opacity:0.7, fontWeight:400, lineHeight:1.5 }}>Repas et quantités définis précisément. Idéal pour une prépa compétition ou une perte de poids cadrée.</span>
                </button>
                <button onClick={()=>set('plan_mode','flexible')} style={{ ...btnChoice(q.plan_mode==='flexible'), textAlign:'left', display:'flex', flexDirection:'column', gap:4, padding:'12px 14px' }}>
                  <span style={{ fontWeight:700 }}>Plan flexible</span>
                  <span style={{ fontSize:11, opacity:0.7, fontWeight:400, lineHeight:1.5 }}>Objectifs d'apports, choix libres, équivalences. Meilleure adhérence sur le long terme.</span>
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--text-dim)', display:'block', marginBottom:6 }}>Options de repas (A/B par repas)</label>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>set('meal_options',true)}  style={btnChoice(q.meal_options)}>Oui</button>
                <button onClick={()=>set('meal_options',false)} style={btnChoice(!q.meal_options)}>Non</button>
              </div>
            </div>
            {nav}
          </div>
        )}

        {/* Step 10 — Plan généré */}
        {step===10 && plan && (
          <div>
            <p style={{ fontSize:13, color:'var(--text-dim)', marginTop:0, marginBottom:16 }}>
              Plan {plan.mode==='strict'?'strict':'flexible'} · {q.weight} kg · {q.main_sport}
            </p>
            {([['Jour Low', plan.low,'#5b6fff'],['Jour Mid', plan.mid,'#00c8e0'],['Jour Hard', plan.hard,'#f97316']] as [string,DayPlan,string][]).map(([lbl,d,c]) => (
              <div key={lbl} style={{ background:'var(--bg-card2)', borderRadius:12, padding:'14px 16px', marginBottom:10, border:`1px solid ${c}33` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'var(--text-main)' }}>{lbl}</span>
                    <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:8 }}>{d.subtitle}</span>
                  </div>
                  <span style={{ fontFamily:'DM Mono,monospace', fontWeight:800, color:c, fontSize:17 }}>{d.kcal} kcal</span>
                </div>
                <div style={{ display:'flex', gap:16, fontSize:12 }}>
                  {[['P',d.p,'#22c55e'],['G',d.c,'#f97316'],['L',d.f,'#5b6fff']].map(([k,v,col]) => (
                    <span key={k as string} style={{ color:col as string }}>
                      <strong>{k as string}</strong> {v as number}g
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:4, marginBottom:16 }}>
              Protéines : {plan.protein_g_per_kg}g/kg/j · Généré aujourd'hui
            </p>
            <button onClick={()=>{ onGenerate(plan); onClose() }}
              style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'none', background:'linear-gradient(135deg,#22c55e,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              Enregistrer ce plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// AI CHAT PANEL
// ══════════════════════════════════════════════════════════════════
function AIChatPanel({ messages, onSend, mealContext }: {
  messages: ChatMessage[]
  onSend: (m: ChatMessage) => void
  mealContext?: { kcal:number; p:number; c:number; f:number; targetKcal:number }
}) {
  const [input,   setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || sending) return
    const question = input.trim()
    const userMsg: ChatMessage = { id:uid(), role:'user', content:question, ts:nowTs() }
    onSend(userMsg)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/coach-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'nutrition',
          payload: {
            athleteProfile: { sport: 'multisport' },
            goal: 'performance',
            currentIntake: mealContext ? { kcal:mealContext.kcal, proteinG:mealContext.p, carbsG:mealContext.c, fatG:mealContext.f } : undefined,
            question,
          },
        }),
      })
      const data = await res.json()
      const answer = data.ok && data.result?.answer
        ? data.result.answer
        : "Désolé, je n'ai pas pu analyser ta question. Réessaie dans un instant."
      onSend({ id:uid(), role:'ai', content:answer, ts:nowTs() })
    } catch {
      onSend({ id:uid(), role:'ai', content:"Erreur de connexion au coach IA. Réessaie dans un instant.", ts:nowTs() })
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', marginBottom:14 }}>Assistant nutrition</p>
      {/* Messages */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:280, overflowY:'auto', marginBottom:12 }}>
        {messages.map(m => (
          <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'80%', background:m.role==='user'?'#00c8e0':'var(--bg-card2)', border:m.role==='ai'?'1px solid var(--border)':'none', borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'10px 14px' }}>
              <p style={{ fontSize:13, color:m.role==='user'?'#fff':'var(--text-main)', margin:0, whiteSpace:'pre-wrap', lineHeight:1.6 }}>{m.content}</p>
            </div>
            <span style={{ fontSize:9, color:'var(--text-dim)', marginTop:2 }}>{m.ts}</span>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      {/* Input */}
      <div style={{ display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!sending&&send()}
          placeholder={sending ? 'Coach IA répond…' : 'Pose ta question nutrition…'}
          disabled={sending}
          style={{ flex:1, borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-main)', padding:'10px 14px', fontFamily:'DM Sans,sans-serif', fontSize:13, opacity:sending?0.7:1 }}/>
        <button onClick={send} disabled={sending}
          style={{ padding:'10px 16px', borderRadius:12, border:'none', background:sending?'var(--bg-card2)':'#00c8e0', color:sending?'var(--text-dim)':'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:sending?'default':'pointer', minWidth:80 }}>
          {sending ? '⏳' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SECTION 1 — TODAY NUTRITION
// ══════════════════════════════════════════════════════════════════
function SectionToday({ meals, plan, ctx }: { meals:Meal[]; plan:NutritionPlan|null; ctx:SportContext }) {
  const [range, setRange] = useState<HistRange>('7j')
  const totals  = totalDay(meals)
  const target  = plan ? plan[ctx.today_type] : { kcal:2500, p:150, c:300, f:70 }
  const status  = dayStatus(totals.kcal, target.kcal)
  const dayColor = { low:'#5b6fff', mid:'#00c8e0', hard:'#f97316' }[ctx.today_type]

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:20 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Bilan</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'4px 0 0' }}>Nutrition du jour</h2>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <span style={{ padding:'5px 12px', borderRadius:99, background:status.bg, color:status.color, fontSize:11, fontWeight:700 }}>{status.label}</span>
          <span style={{ padding:'5px 12px', borderRadius:99, background:`${dayColor}18`, color:dayColor, fontSize:11, fontWeight:600 }}>Jour {ctx.today_type==='low'?'Low':ctx.today_type==='mid'?'Mid':'Hard'}</span>
        </div>
      </div>

      {/* Ring + macros */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, alignItems:'center', marginBottom:20 }} id="today-grid">
        <KcalRingLabeled consumed={totals.kcal} target={target.kcal}/>
        <div>
          <MacroBar label="Protéines"   value={totals.p} target={target.p} color="#22c55e"/>
          <MacroBar label="Glucides"    value={totals.c} target={target.c} color="#f97316"/>
          <MacroBar label="Lipides"     value={totals.f} target={target.f} color="#5b6fff"/>
          <div style={{ display:'flex', gap:12, marginTop:10, fontSize:10, color:'var(--text-dim)', flexWrap:'wrap' }}>
            <span>Cible <strong style={{ color:'var(--text-mid)' }}>{target.kcal} kcal</strong></span>
            <span>P <strong style={{ color:'#22c55e' }}>{target.p}g</strong></span>
            <span>G <strong style={{ color:'#f97316' }}>{target.c}g</strong></span>
            <span>L <strong style={{ color:'#5b6fff' }}>{target.f}g</strong></span>
          </div>
        </div>
      </div>

      {/* Séance du jour */}
      <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', marginBottom:20, display:'flex', gap:12 }}>
        <div style={{ width:3, borderRadius:99, background:dayColor, flexShrink:0, minHeight:40 }}/>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:dayColor, margin:'0 0 4px' }}>Séance aujourd'hui</p>
          <p style={{ fontSize:13, color:'var(--text-main)', margin:'0 0 6px', fontWeight:500 }}>{ctx.today_label}</p>
          {ctx.tip && <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, lineHeight:1.6 }}>{ctx.tip}</p>}
          {ctx.upcoming_race && (
            <span style={{ display:'inline-block', marginTop:8, padding:'3px 10px', borderRadius:99, background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:10, fontWeight:600 }}>{ctx.upcoming_race}</span>
          )}
        </div>
      </div>

      {/* Charts */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:20, marginBottom:20 }}>
        <KcalBarChart data={MOCK_HISTORY} range={range} onRange={setRange}/>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:20 }}>
        <MacroTrendChart data={MOCK_HISTORY} range={range} onRange={setRange}/>
      </div>

      <style>{`
        @media (max-width:600px) { #today-grid { grid-template-columns: 1fr !important; justify-items: center; } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SECTION 2 — PLAN & IA
// ══════════════════════════════════════════════════════════════════
function SectionPlan({ plan, ctx, onCreatePlan, showBody, todayTotals }: { plan:NutritionPlan|null; ctx:SportContext; onCreatePlan:()=>void; showBody:boolean; todayTotals?:{kcal:number;p:number;c:number;f:number} }) {
  const [aiMsgs, setAiMsgs] = useState<ChatMessage[]>(MOCK_CHAT)
  const target = plan ? plan[ctx.today_type] : null

  function handleSend(m: ChatMessage) { setAiMsgs(prev => [...prev, m]) }

  if (!plan) {
    return (
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:20 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:'0 0 4px' }}>Intelligence</p>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'0 0 24px' }}>Plan nutritionnel & IA</h2>
        <div style={{ textAlign:'center', padding:'32px 0' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--bg-card2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6M12 9v6" stroke="#00c8e0" strokeWidth={2} strokeLinecap="round"/>
              <circle cx={12} cy={12} r={9} stroke="#00c8e0" strokeWidth={1.5}/>
            </svg>
          </div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700, margin:'0 0 10px' }}>Pas encore de plan nutritionnel</h3>
          <p style={{ fontSize:13, color:'var(--text-dim)', margin:'0 0 24px', maxWidth:340, marginLeft:'auto', marginRight:'auto', lineHeight:1.7 }}>
            L'IA va créer un plan personnalisé basé sur ton profil, tes objectifs, ta charge sportive et ton calendrier.
          </p>
          <button onClick={onCreatePlan}
            style={{ padding:'12px 32px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,200,224,0.3)' }}>
            Faire mon plan nutritionnel
          </button>
        </div>
      </div>
    )
  }

  const dayColor = { low:'#5b6fff', mid:'#00c8e0', hard:'#f97316' }[ctx.today_type]
  const todayDay = plan[ctx.today_type]

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:20 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Intelligence</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'4px 0 0' }}>Plan nutritionnel & IA</h2>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span style={{ padding:'5px 12px', borderRadius:99, background:'var(--bg-card2)', border:'1px solid var(--border)', fontSize:11, color:'var(--text-dim)' }}>
            {plan.mode==='flexible'?'Plan flexible':'Plan strict'}
          </span>
          <button onClick={onCreatePlan}
            style={{ padding:'6px 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
            Recalculer
          </button>
        </div>
      </div>

      {/* Objectifs du plan */}
      {plan.goals.length>0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
          {plan.goals.map(g => (
            <span key={g.id} style={{ padding:'4px 12px', borderRadius:99, background:`rgba(91,111,255,0.1)`, border:'1px solid rgba(91,111,255,0.25)', fontSize:11, color:'#5b6fff' }}>
              {g.sport||g.type} · {g.period}
            </span>
          ))}
        </div>
      )}

      {/* Recommandation du jour */}
      <div style={{ background:`${dayColor}10`, border:`1px solid ${dayColor}33`, borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:dayColor, margin:'0 0 6px' }}>Recommandation du jour</p>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:dayColor }}>{todayDay.kcal} kcal</span>
          <div style={{ display:'flex', gap:14, fontSize:12 }}>
            {[['P',todayDay.p,'#22c55e'],['G',todayDay.c,'#f97316'],['L',todayDay.f,'#5b6fff']].map(([k,v,c]) => (
              <span key={k as string} style={{ color:c as string }}>
                <strong style={{ fontFamily:'DM Mono,monospace' }}>{v as number}g</strong> {k as string}
              </span>
            ))}
          </div>
        </div>
        <p style={{ fontSize:11, color:`${dayColor}cc`, margin:'6px 0 0' }}>{todayDay.subtitle}</p>
      </div>

      {/* 3 day types */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }} id="plan-days">
        {([['Jour Low', plan.low,'#5b6fff'],['Jour Mid', plan.mid,'#00c8e0'],['Jour Hard', plan.hard,'#f97316']] as [string,DayPlan,string][]).map(([lbl,d,c]) => (
          <div key={lbl} style={{ background:'var(--bg-card2)', borderRadius:14, padding:'14px 12px', border:`1px solid ${c}22` }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:c, margin:'0 0 2px' }}>{lbl}</p>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 10px' }}>{d.subtitle}</p>
            <p style={{ fontFamily:'DM Mono,monospace', fontWeight:800, color:c, fontSize:18, margin:'0 0 8px' }}>{d.kcal}<span style={{ fontSize:10, fontWeight:400, color:'var(--text-dim)' }}> kcal</span></p>
            {[['P',d.p,'#22c55e'],['G',d.c,'#f97316'],['L',d.f,'#5b6fff']].map(([k,v,col]) => (
              <div key={k as string} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                <span style={{ color:'var(--text-dim)' }}>{k as string}</span>
                <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color:col as string }}>{v as number}g</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Context : connexion calendrier */}
      {ctx.tomorrow && (
        <div style={{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:12, color:'var(--text-mid)', lineHeight:1.6 }}>
          <span style={{ fontWeight:700, color:'#f97316' }}>Demain · </span>{ctx.tomorrow} — charge glucidique recommandée ce soir.
        </div>
      )}

      {/* Body metrics */}
      {showBody && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:20, marginBottom:20 }}>
          <BodyWeightChart data={MOCK_BODY}/>
        </div>
      )}

      {/* AI Chat */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:20 }}>
        <AIChatPanel messages={aiMsgs} onSend={handleSend} mealContext={todayTotals ? { ...todayTotals, targetKcal: target?.kcal ?? 2500 } : undefined}/>
      </div>

      <style>{`
        @media (max-width:600px) { #plan-days { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SECTION 3 — REPAS, FAVORIS & PRÉFÉRENCES
// ══════════════════════════════════════════════════════════════════
function SectionMeals({ meals, setMeals }: { meals:Meal[]; setMeals:React.Dispatch<React.SetStateAction<Meal[]>> }) {
  const [openMeal, setOpenMeal]   = useState<MealType|null>('breakfast')
  const [addFor,   setAddFor]     = useState<Meal|null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs]         = useState<Prefs>(MOCK_PREFS)
  const [favs, setFavs]           = useState<SavedMeal[]>(MOCK_FAVORITES)

  function addEntries(type:MealType, entries:FoodEntry[]) {
    setMeals(ms => ms.map(m => m.type===type ? { ...m, entries:[...m.entries,...entries] } : m))
  }
  function removeEntry(type:MealType, id:string) {
    setMeals(ms => ms.map(m => m.type===type ? { ...m, entries:m.entries.filter(e=>e.id!==id) } : m))
  }
  function addFav(fav:SavedMeal) {
    setMeals(ms => ms.map(m => m.type==='lunch' ? { ...m, entries:[...m.entries,...fav.entries.map(e=>({...e,id:uid()}))] } : m))
  }

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:20 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:8 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Journée</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, margin:'4px 0 0' }}>Repas, favoris & préférences</h2>
        </div>
        <button onClick={()=>setShowPrefs(true)}
          style={{ padding:'6px 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
          Préférences
        </button>
      </div>

      {/* Meal accordions */}
      <div style={{ marginBottom:24 }}>
        {meals.map(meal => {
          const t = sumM(meal.entries); const isOpen = openMeal===meal.type
          return (
            <div key={meal.type} style={{ border:'1px solid var(--border)', borderRadius:14, marginBottom:8, overflow:'hidden' }}>
              <div onClick={()=>setOpenMeal(isOpen?null:meal.type)}
                style={{ padding:'13px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:isOpen?'var(--bg-card2)':'transparent', transition:'background .2s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:14, color:'var(--text-main)' }}>{meal.label}</span>
                  {meal.entries.length>0 && <span style={{ fontSize:11, color:'var(--text-dim)' }}>{meal.entries.length} aliment{meal.entries.length>1?'s':''}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {meal.entries.length>0 && <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:'#00c8e0', fontSize:13 }}>{Math.round(t.kcal)} kcal</span>}
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={{ transition:'transform .2s', transform:isOpen?'rotate(180deg)':'none' }}>
                    <path d="M3 5l4 4 4-4" stroke="var(--text-dim)" strokeWidth={1.5} strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding:'4px 16px 14px' }}>
                  {meal.entries.length===0 && (
                    <p style={{ fontSize:12, color:'var(--text-dim)', margin:'10px 0 8px', fontStyle:'italic' }}>Aucun aliment enregistré pour ce repas.</p>
                  )}
                  {meal.entries.map(e => (
                    <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize:13, color:'var(--text-main)' }}>{e.name}</span>
                        <ConfidenceDot score={e.confidence}/>
                        <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>P {e.p}g · G {e.c}g · L {e.f}g</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:'#00c8e0', fontSize:12 }}>{Math.round(e.kcal)} kcal</span>
                        <button onClick={()=>removeEntry(meal.type,e.id)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:16, padding:2, lineHeight:1 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setAddFor(meal)}
                    style={{ marginTop:10, width:'100%', padding:'8px', borderRadius:10, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-dim)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
                    + Ajouter un aliment
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Favoris */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:20, marginBottom:20 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', marginBottom:14 }}>Repas sauvegardés</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
          {favs.map(fav => (
            <div key={fav.id} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13, margin:0, color:'var(--text-main)' }}>{fav.name}</p>
                <button onClick={()=>setFavs(f=>f.filter(x=>x.id!==fav.id))} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:14, padding:0, lineHeight:1, flexShrink:0 }}>×</button>
              </div>
              <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 10px' }}>{fav.entries.length} aliment{fav.entries.length>1?'s':''}</p>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:'#00c8e0', fontSize:14 }}>{fav.totalKcal} kcal</span>
                <button onClick={()=>addFav(fav)}
                  style={{ padding:'4px 10px', borderRadius:8, border:'1px solid #00c8e0', background:'rgba(0,200,224,0.08)', color:'#00c8e0', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  Utiliser
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Préférences (inline si showPrefs) */}
      {showPrefs && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:0 }}>Préférences alimentaires</p>
            <button onClick={()=>setShowPrefs(false)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:14 }}>×</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
            {([['liked',"J'aime",'#22c55e'],['disliked',"J'aime peu",'#f97316'],['allergies','Allergies','#ef4444'],['intolerances','Intolerances','#5b6fff']] as [keyof Prefs,string,string][]).map(([k,lbl,c]) => (
              <div key={k}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:c, margin:'0 0 8px' }}>{lbl}</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {prefs[k].length===0 && <span style={{ fontSize:12, color:'var(--text-dim)', fontStyle:'italic' }}>Aucun</span>}
                  {prefs[k].map(item => (
                    <span key={item} style={{ background:`${c}12`, border:`1px solid ${c}30`, borderRadius:99, padding:'3px 10px', fontSize:11, color:c }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:14, marginBottom:0 }}>
            Ces préférences sont prises en compte dans ton plan nutritionnel et les recommandations IA.
          </p>
        </div>
      )}

      {addFor && (
        <AddMealModal mealLabel={addFor.label} onClose={()=>setAddFor(null)} onAdd={entries=>addEntries(addFor.type,entries)}/>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════
export default function NutritionPage() {
  // TODO: charger depuis Supabase nutrition_logs + nutrition_plan
  const [meals,         setMeals]       = useState<Meal[]>(MOCK_MEALS)
  const [plan,          setPlan]        = useState<NutritionPlan|null>(MOCK_PLAN)
  const [showQModal,    setShowQModal]  = useState(false)
  const [sportCtx]                      = useState<SportContext>(MOCK_SPORT_CONTEXT)
  const hasBodyData                     = MOCK_BODY.length > 0
  const todayTotals                     = totalDay(meals)

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      <style>{`
        @media (max-width:767px) {
          .nutrition-header { flex-direction: column !important; gap: 12px !important; }
        }
        @media (max-width:480px) {
          .nutrition-header h1 { font-size: 22px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="nutrition-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Nutrition</h1>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'5px 0 0' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setShowQModal(true)}
            style={{ padding:'8px 18px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#5b6fff,#00c8e0)', color:'#fff', fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 2px 12px rgba(0,200,224,0.3)' }}>
            {plan ? 'Mon plan' : '+ Créer un plan'}
          </button>
          <AIAssistantButton agent="nutrition" context={{ todayKcal: todayTotals.kcal, todayProtein: todayTotals.p, hasPlan: !!plan }} />
        </div>
      </div>

      <SectionToday meals={meals} plan={plan} ctx={sportCtx}/>
      <SectionPlan  plan={plan} ctx={sportCtx} onCreatePlan={()=>setShowQModal(true)} showBody={hasBodyData} todayTotals={{ kcal:todayTotals.kcal, p:todayTotals.p, c:todayTotals.c, f:todayTotals.f }}/>
      <SectionMeals meals={meals} setMeals={setMeals}/>

      {showQModal && (
        <PlanQuestionnaireModal
          onClose={()=>setShowQModal(false)}
          onGenerate={newPlan => {
            setPlan(newPlan)
            // TODO: await supabase.from('nutrition_plan').upsert({ user_id, ...newPlan })
          }}
        />
      )}

    </div>
  )
}
