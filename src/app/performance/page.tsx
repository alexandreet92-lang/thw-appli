'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { CountUp } from '@/components/ui/AnimatedBar'
import DatasTab from './DatasTab'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid, isCoachScoped } from '@/lib/planning/scope'
import type { TestSport, FieldDef } from './testTypes'
import { RAW_INPUTS, computeDerived, derivedToVals } from './testCompute'
import { TESTS, PROTOCOLS, DIFFICULTY_COLOR, TEST_SPORT_TO_PLANNING } from '@/lib/tests/protocols'
import type { TestDef, TestProtocol } from '@/lib/tests/protocols'
import {
  TEST_BENCHMARKS,
  computeTestScoreResult,
  LevelTable,
  TestScoreDisplay,
  ScoreBadge,
  levelFromScore,
} from './PerformanceTestLevels'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { PERFORMANCE_ONBOARDING } from '@/onboarding/configs/performance.config'
import { ProfilGlobalGrid, type Metric } from '@/app/performance/components/profil/ProfilGlobalGrid'
import { TestCard } from '@/app/performance/components/tests/TestCard'
import { TabbedPageLayout } from '@/components/ui/TabbedPageLayout'
import { useGuideTabDemo } from '@/components/guide/guideDemo'
import { User, Database, FlaskConical } from 'lucide-react'
import { ProfilSpecific } from '@/app/performance/components/profil/ProfilSpecific'
import { analyzeYear, saveSnapshot, loadSnapshots, type Snapshots, type AnalyzeResult, type SportKey } from '@/lib/performance/analyzeProfile'
import { LevelBars } from '@/app/performance/components/profil/LevelBars'
import { BenchmarkSheet } from '@/app/performance/components/profil/BenchmarkSheet'
import { currentLocale } from '@/lib/i18n'

// ── Types ───────────────────────────────────────────────────────
type PerfTab = 'profil' | 'datas' | 'tests'
interface SelectedDatum { label: string; value: string }


// Profil VIDE par défaut : aucune donnée personnelle codée en dur. Chaque athlète
// renseigne ses propres valeurs ; tant qu'une donnée n'est pas saisie elle reste
// à 0 / '' et s'affiche « — » (jamais les chiffres d'un autre athlète ou du coach).
const INIT_PROFILE = {
  ftp: 0, weight: 0, age: 0, lthr: 0, hrMax: 0, hrRest: 0,
  thresholdPace: '', vma: 0, css: '', vo2max: 0,
}


// ── Smart message builder ────────────────────────────────────────
function buildAIMessage(datum: SelectedDatum): string {
  const { label, value } = datum
  const l = label.toLowerCase()
  if (l === 'vo2max')                  return `Que signifie mon VO2max de ${value} ? Est-ce un bon niveau et comment l'améliorer ?`
  if (l === 'ftp')                     return `Mon FTP est de ${value}. Comment progresser en puissance au seuil ?`
  if (l === 'vma')                     return `Avec une VMA de ${value}, quels entraînements spécifiques me conseilles-tu ?`
  if (l === 'css')                     return `Ma CSS est de ${value}. Comment améliorer mon endurance en natation ?`
  if (l.includes('fc max'))            return `Ma FC max est de ${value}. Est-ce normal pour mon profil d'athlète ?`
  if (l.includes('fc repos'))          return `Ma FC au repos est de ${value}. Que m'indique cette valeur sur ma récupération ?`
  if (l.includes('lthr'))              return `Mon LTHR est de ${value}. Comment utiliser cette donnée pour calibrer mes zones d'intensité ?`
  if (l.includes('allure'))            return `Mon allure seuil est de ${value}. Quel programme pour l'améliorer ?`
  if (l.includes('w/kg'))              return `Mon ratio puissance/poids est de ${value}. Comment l'améliorer ?`
  if (l.startsWith('z') && l.includes('zone')) return `Explique-moi ${label} (${value}). Quels entraînements dois-je faire dans cette zone ?`
  if (l.includes('zone'))              return `Explique-moi ${label} : ${value}. Quels entraînements dois-je faire dans cette zone ?`
  if (l.includes('run') || l.includes('course') || l.includes('km') || l.includes('marathon') || l.includes('semi'))
                                       return `Mon record sur ${label} est de ${value}. Comment progresser sur cette distance ?`
  if (l.includes('natation') || l.includes('swim')) return `Mon record en ${label} est de ${value}. Comment améliorer ma vitesse en natation ?`
  if (l.includes('aviron') || l.includes('row'))    return `Mon record en ${label} est de ${value}. Comment améliorer mes temps en aviron ?`
  if (l.includes('hyrox'))             return `Mon temps Hyrox sur "${label}" est de ${value}. Comment améliorer cette station ?`
  if (l.includes('1rm') || l.includes('rm') || l.includes('reps')) return `Mon record de ${label} est de ${value}. Comment progresser en musculation sur ce mouvement ?`
  return `Analyse ma donnée de performance "${label}" : ${value}. Quel est ce niveau et comment puis-je progresser ?`
}

// ── UI primitives ────────────────────────────────────────────────
function StatBox({ label, value, unit, sub, color, onSelect, selected }: {
  label: string; value: string|number; unit?: string; sub?: string; color?: string;
  onSelect?: () => void; selected?: boolean;
}) {
  const isInt = typeof value === 'number' && value >= 0 && Number.isInteger(value)
  return (
    <div
      className="card-enter"
      onClick={onSelect}
      style={{
        background: selected ? 'rgba(6,182,212,0.08)' : 'var(--bg-card2)',
        border: `1px solid ${selected ? '#06B6D4' : 'var(--border)'}`,
        borderRadius:12, padding:'11px 13px',
        cursor: onSelect ? 'pointer' : undefined,
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        boxShadow: selected ? '0 0 0 2px rgba(6,182,212,0.15)' : undefined,
        userSelect: 'none' as const,
      }}
    >
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:selected?'#06B6D4':color||'var(--text)', margin:0, lineHeight:1 }}>
        {isInt ? <CountUp value={value as number} /> : value}
        {unit && <span style={{ fontSize:11, fontWeight:400, color:'var(--text-dim)', marginLeft:3 }}>{unit}</span>}
      </p>
      {sub && <p style={{ fontSize:10, color:'var(--text-dim)', margin:'3px 0 0' }}>{sub}</p>}
    </div>
  )
}


function NInput({ label, value, onChange, unit, step }: { label:string; value:number; onChange:(v:number)=>void; unit?:string; step?:number }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>
        {label}{unit && <span style={{ fontWeight:400, marginLeft:3, textTransform:'none' as const }}>({unit})</span>}
      </p>
      <input type="number" value={value === 0 ? '' : value} step={step||1} placeholder="—" onChange={e => onChange(parseFloat(e.target.value)||0)}
        style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
    </div>
  )
}

function TInput({ label, value, onChange, placeholder }: { label:string; value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <div>
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', marginBottom:4 }}>{label}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}/>
    </div>
  )
}

// ── Responsive hook ──────────────────────────────────────────────
function useWindowWidth(): number {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

// ── Floating bubble ──────────────────────────────────────────────
function SelectedDatumBubble({ datum, onClear, onAsk }: {
  datum: SelectedDatum; onClear: () => void; onAsk: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const { t } = useI18n()
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <div style={{
      position:'fixed', bottom:88, left:'50%', transform:'translateX(-50%)',
      zIndex:1100,
      display:'flex', alignItems:'center', gap:10,
      padding:'10px 14px 10px 16px',
      borderRadius:14,
      background:'var(--bg-card)',
      border:'1px solid rgba(6,182,212,0.45)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(6,182,212,0.08)',
      animation:'cardEnter 0.22s cubic-bezier(0.4,0,0.2,1) both',
      maxWidth:'calc(100vw - 48px)',
      whiteSpace:'nowrap' as const,
    }}>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>{datum.label}</p>
        <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#06B6D4', margin:0 }}>{datum.value}</p>
      </div>
      <button
        onClick={onAsk}
        style={{
          padding:'7px 14px', borderRadius:10,
          background:'linear-gradient(135deg,#06B6D4,#5b6fff)',
          border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
          whiteSpace:'nowrap' as const, flexShrink:0,
        }}
      >
        {t('performance.askAICoach')}
      </button>
      <button
        onClick={onClear}
        style={{
          width:24, height:24, borderRadius:6, border:'1px solid var(--border)',
          background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer',
          fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0, lineHeight:1,
        }}
      >×</button>
    </div>,
    document.body
  )
}

// ── Profil Spécifique : champs par sport ──────────────────────────
type SportSpecId = 'running' | 'cycling' | 'swimming' | 'hyrox'
interface SportSpecField { key: string; label: string; unit?: string; placeholder?: string; type?: 'number' | 'text' }
const SPORT_SPEC_FIELDS: Record<SportSpecId, SportSpecField[]> = {
  running: [
    { key:'fc_ef',          label:'FC Endurance Fondamentale', unit:'bpm' },
    { key:'fc_sl1',         label:'FC Seuil 1 (SL1)',          unit:'bpm' },
    { key:'fc_sl2',         label:'FC Seuil 2 (SL2)',          unit:'bpm' },
    { key:'allure_ef_low',  label:'Allure EF basse',           unit:'/km',  placeholder:'ex: 5:30' },
    { key:'allure_ef_high', label:'Allure EF haute',           unit:'/km',  placeholder:'ex: 5:00' },
    { key:'allure_sl1',     label:'Allure SL1',                unit:'/km',  placeholder:'ex: 4:30' },
    { key:'allure_sl2',     label:'Allure SL2',                unit:'/km',  placeholder:'ex: 4:10' },
    { key:'allure_vma',     label:'Allure VMA',                unit:'/km',  placeholder:'ex: 3:15' },
  ],
  cycling: [
    { key:'fc_ef',          label:'FC Endurance Fondamentale', unit:'bpm' },
    { key:'fc_sl1',         label:'FC SL1',                    unit:'bpm' },
    { key:'fc_sl2',         label:'FC SL2',                    unit:'bpm' },
    { key:'watts_ef_low',   label:'Watts EF bas',              unit:'W' },
    { key:'watts_ef_high',  label:'Watts EF haut',             unit:'W' },
    { key:'watts_sl1',      label:'Watts SL1',                 unit:'W' },
    { key:'watts_sl2',      label:'Watts SL2',                 unit:'W' },
    { key:'watts_pma',      label:'Watts PMA',                 unit:'W' },
    { key:'max_power',      label:'Puissance max sprint',      unit:'W' },
  ],
  swimming: [
    { key:'css',            label:'CSS (allure seuil)',         unit:'/100m', placeholder:'ex: 1:28' },
    { key:'t400m',          label:'400m chrono référence',     unit:'mm:ss', placeholder:'ex: 5:52' },
  ],
  hyrox: [
    { key:'wall_ball_max',  label:'Wall Ball max reps',        unit:'reps' },
    { key:'run_compromised',label:'Allure run compromised',    unit:'/km',   placeholder:'ex: 4:05' },
    { key:'farmer_max_m',   label:'Farmer Carry max distance', unit:'m' },
    { key:'bbj_100m',       label:'BBJ 100m temps',            unit:'mm:ss' },
    { key:'lunges_200m',    label:'Lunges 200m temps',         unit:'mm:ss' },
    { key:'sled_push_100m', label:'Sled Push 100m',            unit:'mm:ss' },
    { key:'sled_pull_100m', label:'Sled Pull 100m',            unit:'mm:ss' },
    { key:'ski_erg_2000m',  label:'SkiErg 2000m',              unit:'mm:ss' },
    { key:'row_2000m',      label:'Rowing 2000m',              unit:'mm:ss' },
  ],
}
const SPORT_SPEC_TABS: { id: SportSpecId; label: string; color: string }[] = [
  { id:'running',  label:'Running',  color:'#22c55e' },
  { id:'cycling',  label:'Cyclisme', color:'#06B6D4' },
  { id:'swimming', label:'Natation', color:'#38bdf8' },
  { id:'hyrox',    label:'Hyrox',    color:'#ef4444' },
]

// ── Premium stat card ────────────────────────────────────────────
function ProfilTab({ onSelect, selectedDatum, profile: p, setProfile: setP, onAnalyzeProfile }: {
  onSelect: (label: string, value: string) => void
  selectedDatum: SelectedDatum | null
  profile: typeof INIT_PROFILE
  setProfile: React.Dispatch<React.SetStateAction<typeof INIT_PROFILE>>
  onAnalyzeProfile?: () => Promise<void>
}) {
  const [editing,      setEditing]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [savedOk,      setSavedOk]      = useState(false)
  const [analyzing,    setAnalyzing]    = useState(false)
  const [profLoading,  setProfLoading]  = useState(true)
  const [profileEmpty, setProfileEmpty] = useState(false)
  const isMobile = useWindowWidth() < 768
  const { t } = useI18n()

  // Profil Spécifique
  const [specSport,  setSpecSport]  = useState<SportSpecId>('running')
  const [specParams, setSpecParams] = useState<Record<SportSpecId, Record<string, string>>>({
    running: {}, cycling: {}, swimming: {}, hyrox: {},
  })
  const [specSaving, setSpecSaving] = useState(false)
  const [specSavedOk,setSpecSavedOk]= useState(false)
  const [benchOpen,   setBenchOpen]  = useState(false)

  // ── Profil par année : analyse depuis les activités + instantanés ──
  const [profileYear, setProfileYear] = useState(new Date().getFullYear())
  const [snapshots, setSnapshots] = useState<Snapshots>({ byYear: {}, years: [] })
  const [specAnalyzing, setSpecAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const autoRan = useRef(false)

  const runSpecAnalyze = useCallback(async (yr: number) => {
    setSpecAnalyzing(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      const res = await analyzeYear(sb, uid, yr)
      setAnalyzeResult(res)
      await saveSnapshot(sb, uid, res)
      setSnapshots(await loadSnapshots(sb, uid))
    } finally {
      setSpecAnalyzing(false)
    }
  }, [])

  // Charge les instantanés au montage ; si une 1ʳᵉ analyse a déjà eu lieu, on
  // recalcule l'année courante automatiquement (« le système tourne tout seul »).
  useEffect(() => {
    void (async () => {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      const snaps = await loadSnapshots(sb, uid)
      setSnapshots(snaps)
      if (snaps.years.length > 0 && !autoRan.current) {
        autoRan.current = true
        void runSpecAnalyze(new Date().getFullYear())
      }
    })()
  }, [runSpecAnalyze])

  const profileYears = Array.from(new Set([new Date().getFullYear(), ...snapshots.years])).sort((a, b) => b - a)
  const specKey = specSport === 'swimming' ? null : (specSport as SportKey)
  const curSnapshot = specKey ? snapshots.byYear[String(profileYear)]?.[specKey] : undefined
  const specNotEnough = !!specKey && !curSnapshot && analyzeResult?.year === profileYear && analyzeResult.sports[specKey] != null && !analyzeResult.sports[specKey].enough

  // W/kg seulement si FTP ET poids sont renseignés, sinon « — ».
  const wkg = (p.ftp > 0 && p.weight > 0) ? (p.ftp / p.weight).toFixed(2) : '—'

  // ── Charger depuis Supabase au montage ─────────────────────────
  useEffect(() => {
    void (async () => {
      setProfLoading(true)
      try {
        const sb = createClient()
        const uid = await resolvePlanningUid(sb)
        if (!uid) return

        const [perfRes, profilesRes, specRes] = await Promise.all([
          sb.from('athlete_performance_profile')
            .select('ftp_watts,hr_max,hr_rest,lthr_run,threshold_pace_s_km,css_s_100m,vma_km_h,vo2max_ml_kg_min,age_years')
            .eq('user_id', uid).maybeSingle(),
          sb.from('profiles').select('weight_kg').eq('id', uid).maybeSingle(),
          sb.from('athlete_sport_profile').select('sport,params').eq('user_id', uid),
        ])

        const perf = perfRes.data
        const prof = profilesRes.data

        if (perf || prof) {
          setProfileEmpty(false)
          setP(prev => ({
            ...prev,
            ftp:           perf?.ftp_watts           ?? prev.ftp,
            hrMax:         perf?.hr_max              ?? prev.hrMax,
            hrRest:        perf?.hr_rest             ?? prev.hrRest,
            lthr:          perf?.lthr_run            ?? prev.lthr,
            vma:           perf?.vma_km_h            ?? prev.vma,
            vo2max:        perf?.vo2max_ml_kg_min     ?? prev.vo2max,
            age:           perf?.age_years           ?? prev.age,
            weight:        prof?.weight_kg           ?? prev.weight,
            thresholdPace: perf?.threshold_pace_s_km
              ? `${Math.floor(perf.threshold_pace_s_km / 60)}:${String(perf.threshold_pace_s_km % 60).padStart(2,'0')}`
              : prev.thresholdPace,
            css: perf?.css_s_100m
              ? `${Math.floor(perf.css_s_100m / 60)}:${String(perf.css_s_100m % 60).padStart(2,'0')}`
              : prev.css,
          }))
        } else {
          setProfileEmpty(true)
        }

        if (specRes.data) {
          const merged: Record<SportSpecId, Record<string, string>> = { running: {}, cycling: {}, swimming: {}, hyrox: {} }
          for (const row of specRes.data as { sport: string; params: Record<string, string> }[]) {
            if (row.sport in merged) {
              merged[row.sport as SportSpecId] = row.params ?? {}
            }
          }
          setSpecParams(merged)
        }
      } finally {
        setProfLoading(false)
      }
    })()
  }, [setP])

  // ── Sauvegarder le profil global ───────────────────────────────
  async function handleSaveGlobal() {
    setSaving(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return

      // Parse allure seuil → secondes/km
      const tParts = p.thresholdPace.split(':').map(Number)
      const threshSec = tParts.length === 2 ? tParts[0] * 60 + (tParts[1] || 0) : 0

      // Parse CSS → secondes/100m
      const cParts = p.css.split(':').map(Number)
      const cssSec = cParts.length === 2 ? cParts[0] * 60 + (cParts[1] || 0) : 0

      await Promise.all([
        sb.from('athlete_performance_profile').upsert({
          user_id:              uid,
          ftp_watts:            p.ftp,
          hr_max:               p.hrMax,
          hr_rest:              p.hrRest,
          lthr_run:             p.lthr,
          lthr_bike:            p.lthr,
          vma_km_h:             p.vma,
          vo2max_ml_kg_min:     p.vo2max,
          age_years:            p.age,
          threshold_pace_s_km:  threshSec || null,
          css_s_100m:           cssSec || null,
          updated_at:           new Date().toISOString(),
        }, { onConflict: 'user_id' }),
        sb.from('profiles').upsert({ id: uid, weight_kg: p.weight }, { onConflict: 'id' }),
      ])
      // Zones modifiées → planning / éditeur rechargent leurs zones immédiatement.
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('thw:zones-changed'))
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Sauvegarder le profil spécifique ───────────────────────────
  async function handleSaveSpec() {
    setSpecSaving(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      await sb.from('athlete_sport_profile').upsert({
        user_id:    uid,
        sport:      specSport,
        params:     specParams[specSport],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,sport' })
      setSpecSavedOk(true)
      setTimeout(() => setSpecSavedOk(false), 2500)
    } finally {
      setSpecSaving(false)
    }
  }

  function isSel(label: string, value: string | number, unit?: string) {
    const v = `${value}${unit ? ` ${unit}` : ''}`
    return selectedDatum?.label === label && selectedDatum?.value === v
  }

  function setSpecField(key: string, val: string) {
    setSpecParams(prev => ({ ...prev, [specSport]: { ...prev[specSport], [key]: val } }))
  }

  // Métrique d'affichage : tant que l'athlète n'a pas renseigné la donnée, on
  // montre « — » (non cliquable) — jamais une valeur par défaut.
  const mNum = (label: string, val: number, unit: string, sub?: string): Metric =>
    val > 0
      ? { label, value: val, unit, sub, selected: isSel(label, val, unit), onSelect: () => onSelect(label, `${val} ${unit}`) }
      : { label, value: '—', selected: false, onSelect: () => {} }
  const mTxt = (label: string, val: string, unit: string): Metric =>
    val
      ? { label, value: val, unit, selected: selectedDatum?.label === label, onSelect: () => onSelect(label, `${val}${unit}`) }
      : { label, value: '—', selected: false, onSelect: () => {} }

  if (profLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:'var(--text-dim)', fontSize:13, gap:10 }}>
        <span style={{ width:16, height:16, border:'2px solid var(--border)', borderTopColor:'#06B6D4', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>
        {t('performance.loadingProfile')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)', paddingTop: 'var(--space-4)' }}>

      {profileEmpty && (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('performance.profileNotConfigured')}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', margin: 'var(--space-1) 0 0' }}>{t('performance.profileNotConfiguredDesc')}</p>
          </div>
          <button onClick={() => setEditing(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{t('performance.complete')} →</button>
        </div>
      )}

      {/* Profil Global */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div>
            <h2 data-guide="perf-profil-global" style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('performance.globalProfile')}</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', margin: 'var(--space-1) 0 0' }}>{t('performance.globalProfileSubtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'baseline' }}>
            {!editing && onAnalyzeProfile && (
              <button data-guide="perf-analyze" onClick={() => { setAnalyzing(true); onAnalyzeProfile().finally(() => setAnalyzing(false)) }} disabled={analyzing} style={{ border: 'none', background: 'transparent', cursor: analyzing ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)', opacity: analyzing ? 0.6 : 1 }}>{analyzing ? t('performance.analyzing') : t('performance.analyze')}</button>
            )}
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-dim)' }}>{t('performance.cancel')}</button>
                <button onClick={() => { void handleSaveGlobal() }} disabled={saving} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)', opacity: saving ? 0.6 : 1 }}>{saving ? t('performance.saving') : savedOk ? t('performance.saved') : t('performance.save')}</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{t('performance.edit')}</button>
            )}
          </div>
        </div>
        {editing ? (
          // Mêmes 8 données que la grille d'affichage (sans Poids ni Âge).
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            <NInput label="FTP" unit="W" value={p.ftp} onChange={v => setP({ ...p, ftp: v })} />
            <TInput label={t('performance.thresholdPace')} value={p.thresholdPace} onChange={v => setP({ ...p, thresholdPace: v })} placeholder="4:08" />
            <NInput label="VMA" unit="km/h" value={p.vma} onChange={v => setP({ ...p, vma: v })} step={0.5} />
            <TInput label="CSS" value={p.css} onChange={v => setP({ ...p, css: v })} placeholder="1:28" />
            <NInput label={t('performance.hrMax')} unit="bpm" value={p.hrMax} onChange={v => setP({ ...p, hrMax: v })} />
            <NInput label={t('performance.hrRest')} unit="bpm" value={p.hrRest} onChange={v => setP({ ...p, hrRest: v })} />
            <NInput label="LTHR" unit="bpm" value={p.lthr} onChange={v => setP({ ...p, lthr: v })} />
            <NInput label="VO2max" value={p.vo2max} onChange={v => setP({ ...p, vo2max: v })} />
          </div>
        ) : (
          <ProfilGlobalGrid isMobile={isMobile} metrics={[
            { ...mNum('FTP', p.ftp, 'W'), sub: (p.ftp > 0 && p.weight > 0) ? `${wkg} W/kg` : undefined },
            mTxt('Allure seuil', p.thresholdPace, '/km'),
            mNum('VMA', p.vma, 'km/h'),
            mTxt('CSS', p.css, '/100m'),
            mNum('FC max', p.hrMax, 'bpm'),
            mNum('FC repos', p.hrRest, 'bpm'),
            mNum('LTHR', p.lthr, 'bpm'),
            mNum('VO2max', p.vo2max, 'ml/kg/min'),
          ]} />
        )}
      </div>

      {/* Profil Spécifique */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('performance.specificProfile')}</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', margin: 'var(--space-1) 0 var(--space-4)' }}>{t('performance.specificProfileSubtitle')}</p>
        <ProfilSpecific p={p} wkg={wkg} specSport={specSport} onSport={setSpecSport} params={specParams[specSport]} fields={SPORT_SPEC_FIELDS[specSport]} onEditBenchmarks={() => setBenchOpen(true)}
          snapshot={curSnapshot} year={profileYear} years={profileYears} onYear={setProfileYear}
          onAnalyze={() => void runSpecAnalyze(profileYear)} analyzing={specAnalyzing} notEnough={specNotEnough} />
      </div>

      {/* Niveau estimé */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>{t('performance.estimatedLevel')}</h2>
        <LevelBars metrics={[
          wkg !== '—'
            ? { label: 'W/kg', display: wkg, pct: Math.min(parseFloat(wkg) / 6 * 100, 100), qualifier: parseFloat(wkg) >= 4.5 ? t('performance.levelExpert') : parseFloat(wkg) >= 3.5 ? t('performance.levelAdvanced') : parseFloat(wkg) >= 2.5 ? t('performance.levelIntermediate') : t('performance.levelBeginner'), selected: selectedDatum?.label === 'W/kg', onSelect: () => onSelect('W/kg', `${wkg} W/kg`) }
            : { label: 'W/kg', display: '—', pct: 0, qualifier: '' },
          p.vo2max > 0
            ? { label: 'VO2max', display: `${p.vo2max}`, pct: Math.min(p.vo2max / 80 * 100, 100), qualifier: p.vo2max >= 65 ? t('performance.levelElite') : p.vo2max >= 55 ? t('performance.levelHigh') : p.vo2max >= 45 ? t('performance.levelGood') : t('performance.levelAverage'), selected: selectedDatum?.label === 'VO2max', onSelect: () => onSelect('VO2max', `${p.vo2max} ml/kg/min`) }
            : { label: 'VO2max', display: '—', pct: 0, qualifier: '' },
          p.hrRest > 0
            ? { label: 'FC repos', display: `${p.hrRest}`, pct: Math.min(Math.max(0, 80 - p.hrRest) / 50 * 100, 100), qualifier: p.hrRest <= 40 ? t('performance.levelElite') : p.hrRest <= 50 ? t('performance.levelHigh') : p.hrRest <= 60 ? t('performance.levelGood') : t('performance.levelAverage'), selected: selectedDatum?.label === 'FC repos', onSelect: () => onSelect('FC repos', `${p.hrRest} bpm`) }
            : { label: 'FC repos', display: '—', pct: 0, qualifier: '' },
        ]} />
      </div>

      {benchOpen && (
        <BenchmarkSheet
          title={SPORT_SPEC_TABS.find(t => t.id === specSport)!.label}
          fields={SPORT_SPEC_FIELDS[specSport]}
          values={specParams[specSport]}
          onChange={(k, v) => setSpecField(k, v)}
          onSave={async () => { await handleSaveSpec(); setBenchOpen(false) }}
          saving={specSaving}
          onClose={() => setBenchOpen(false)}
        />
      )}
    </div>
  )
}


// ════════════════════════════════════════════════
// ONGLET TESTS — types, données, composants
// ════════════════════════════════════════════════
interface OpenTest { sport: TestSport; test: TestDef }


const TEST_SPORT_TABS: { id: TestSport; label: string; short: string; color: string; bg: string; icon: React.ReactNode }[] = [
  {
    id: 'running', label: 'Running', short: 'Run', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 4a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none"/><path d="M7 20l3-6 3 3 3-7"/><path d="M15 4l-2 4-3 1-2 4"/></svg>,
  },
  {
    id: 'cycling', label: 'Cyclisme', short: 'Vélo', color: '#06B6D4', bg: 'rgba(6,182,212,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17l4-10h4l4 10M9 7h6"/></svg>,
  },
  {
    id: 'natation', label: 'Natation', short: 'Nata', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 18c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2 3.6-.6 5-2"/><path d="M2 12c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2"/><path d="M14 6l-2-4-3 4 2 1"/></svg>,
  },
  {
    id: 'aviron', label: 'Aviron', short: 'Row', color: '#14b8a6', bg: 'rgba(20,184,166,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 19l14-14M5 5l7 7M12 12l7 7"/></svg>,
  },
  {
    id: 'hyrox', label: 'Hyrox', short: 'HRX', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
]

// Sport du test → codes activities.sport_type (pour proposer les activités à lier).
const TEST_SPORT_TO_ACTIVITY: Record<TestSport, string[]> = {
  running: ['run', 'trail_run'],
  cycling: ['bike', 'virtual_bike'],
  natation: ['swim'],
  aviron: ['rowing'],
  hyrox: ['hyrox', 'hiit'],
}



// ── Icônes réutilisables pour les sections ──
function IcoTarget() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg> }
function IcoWarn()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IcoCheck()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
function IcoFlame()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg> }
function IcoList()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function IcoBook()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> }
function IcoClock()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IcoSave()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }

interface TestHistoryEntry { id: string; date: string; valeurs: Record<string, string>; documents?: { name: string; path: string; size: number; type: string }[] }

function TestProtocolPanel({ open: ot, onClose, onFtpUpdate }: { open: OpenTest | null; onClose: () => void; onFtpUpdate?: (ftp: number) => void }) {
  const [vals, setVals]               = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [history, setHistory]         = useState<TestHistoryEntry[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingDocs, setPendingDocs] = useState<{ file: File; name: string }[]>([])
  const [gender, setGender]           = useState<'M' | 'F'>('M')
  const [weightKg, setWeightKg]       = useState<number>(0)
  const [weightSaving, setWeightSaving] = useState(false)
  const [activities, setActivities]   = useState<{ id: string; title: string; started_at: string; sport_type: string; distance_m: number | null }[]>([])
  const [activityId, setActivityId]   = useState<string>('')
  const [planOpen, setPlanOpen]       = useState(false)
  const [planDate, setPlanDate]       = useState<string>('')
  const [planSaving, setPlanSaving]   = useState(false)
  const [planDone, setPlanDone]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  const testId = ot?.test.id ?? null

  // Charge le genre, le poids et les activités (même sport) de l'athlète scopé.
  useEffect(() => {
    const load = async () => {
      try {
        const sb = createClient()
        const uid = await resolvePlanningUid(sb)
        if (!uid) return
        const [perfRes, profRes] = await Promise.all([
          sb.from('athlete_performance_profile').select('gender').eq('user_id', uid).maybeSingle(),
          sb.from('profiles').select('weight_kg').eq('id', uid).maybeSingle(),
        ])
        if (perfRes.data?.gender === 'f') setGender('F')
        if (profRes.data?.weight_kg) setWeightKg(Number(profRes.data.weight_kg))

        // Activités du même sport que le test, récentes d'abord (pour le lien).
        if (ot) {
          const codes = TEST_SPORT_TO_ACTIVITY[ot.sport] ?? []
          if (codes.length > 0) {
            const { data } = await sb
              .from('activities')
              .select('id,title,started_at,sport_type,distance_m')
              .eq('user_id', uid)
              .in('sport_type', codes)
              .order('started_at', { ascending: false })
              .limit(40)
            if (data) setActivities(data as typeof activities)
          } else {
            setActivities([])
          }
        }
      } catch { /* ignore */ }
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  // Sauvegarde du poids athlète (au moment du test) → profiles + propagation zones.
  const saveWeight = useCallback(async (w: number) => {
    if (w <= 0) return
    setWeightSaving(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      await sb.from('profiles').upsert({ id: uid, weight_kg: w }, { onConflict: 'id' })
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('thw:zones-changed'))
    } finally {
      setWeightSaving(false)
    }
  }, [])

  const loadHistory = useCallback(async (testName: string, sport: string) => {
    setHistLoading(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      const { data: defData } = await sb
        .from('test_definitions')
        .select('id')
        .eq('nom', testName)
        .eq('sport', sport)
        .maybeSingle()
      if (!defData?.id) return
      const { data } = await sb
        .from('test_results')
        .select('id, date, valeurs, documents')
        .eq('user_id', uid)
        .eq('test_definition_id', defData.id)
        .order('date', { ascending: false })
        .limit(10)
      if (data) setHistory(data as TestHistoryEntry[])
    } finally {
      setHistLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ot) return
    setVals({})
    setSaved(false)
    setShowHistory(false)
    void loadHistory(ot.test.name, ot.sport)
  }, [testId, loadHistory])

  if (!ot || typeof document === 'undefined') return null

  const cfg   = TEST_SPORT_TABS.find(t => t.id === ot.sport)!
  const proto = PROTOCOLS[ot.test.id]

  function setVal(cle: string, v: string) { setVals(p => ({...p, [cle]: v})); setSaved(false) }

  // Champs de saisie = valeurs BRUTES (RAW_INPUTS si redéfini, sinon protocole).
  const inputFields: FieldDef[] = (ot ? (RAW_INPUTS[ot.test.id] ?? proto?.fields) : undefined) ?? []

  // Valeurs sauvegardées = brutes + valeurs calculées (clés canoniques lues par le
  // scoring/radar) + poids au moment du test.
  function buildSaveVals(): Record<string, string> {
    if (!ot) return vals
    const derived = computeDerived(ot.test.id, vals, weightKg, gender)
    const out: Record<string, string> = { ...vals, ...derivedToVals(derived) }
    if (weightKg > 0) out['__weight_kg'] = String(weightKg)
    return out
  }

  async function handleSave() {
    if (!ot) return
    const required = inputFields.filter(f => f.required)
    if (required.some(f => !vals[f.cle]?.trim())) return

    setSaving(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      const { data: defData } = await sb
        .from('test_definitions')
        .select('id')
        .eq('nom', ot.test.name)
        .eq('sport', ot.sport)
        .maybeSingle()

      // Upload des documents en attente
      const uploadedDocs: { name: string; path: string; size: number; type: string }[] = []
      for (const doc of pendingDocs) {
        const safeName = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${uid}/${ot.test.id}/${Date.now()}_${safeName}`
        const { data: up } = await sb.storage.from('test-documents').upload(path, doc.file, { upsert: false })
        if (up) uploadedDocs.push({ name: doc.name, path: up.path, size: doc.file.size, type: doc.file.type })
      }

      const saveVals = buildSaveVals()

      await sb.from('test_results').insert({
        user_id: uid,
        test_definition_id: defData?.id ?? null,
        date: new Date().toISOString().slice(0, 10),
        valeurs: saveVals,
        documents: uploadedDocs,
        activity_id: activityId || null,
      })

      // Persiste le poids au moment du test (au cas où modifié dans le panneau).
      if (weightKg > 0) await saveWeight(weightKg)

      // Also save structured score to performance_tests
      const scoreResult = computeTestScoreResult(ot.test.id, saveVals, gender)
      if (scoreResult) {
        await sb.from('performance_tests').insert({
          user_id:    uid,
          sport:      ot.sport,
          test_type:  ot.test.id,
          performed_at: new Date().toISOString(),
          result:     JSON.stringify({ score: scoreResult.overall, level: scoreResult.level.label }),
          value:      scoreResult.overall,
          score:      parseFloat(scoreResult.overall.toFixed(2)),
          level:      scoreResult.level.label,
          gender:     gender.toLowerCase(),
        })

        // Update performance_scores radar — for select tests
        const axisMap: Record<string, { sport: string; axis: string; rawKey?: string; rawFn?: (v: Record<string,string>) => number }> = {
          'cp20':               { sport: 'cycling', axis: 'ftp_wkg',        rawKey: 'ftp_wkg' },
          'vo2max-cycling':     { sport: 'cycling', axis: 'pma_wkg',        rawKey: 'pma_wkg' },
          'vma':                { sport: 'running', axis: 'vma',            rawKey: 'vma_kmh' },
          'running-10km':       { sport: 'running', axis: 'pace_10k',       rawKey: 'time_10km_sec',
            rawFn: (v) => { const t = parseFloat(v['time_10km_sec']??''); return t > 0 ? t / 10 : 0 } }, // s/km
          'running-economie-fc':{ sport: 'running', axis: 'pace_semi',      rawKey: 'pace_fc150_sec' },
          'cycling-grimpeur':   { sport: 'cycling', axis: 'end4h_wkg',      rawKey: 'climb_wkg' },
        }
        const map = axisMap[ot.test.id]
        if (map) {
          const rawVal = map.rawFn ? map.rawFn(saveVals) : parseFloat(saveVals[map.rawKey ?? ''] ?? '')
          if (rawVal > 0) {
            await sb.from('performance_scores').upsert(
              { user_id: uid, sport: map.sport, axis: map.axis, raw_value: rawVal },
              { onConflict: 'user_id,sport,axis' }
            )
          }
        }
      }

      // Auto-update du FTP du profil pour les tests qui le calculent (CP20, Ramp test).
      if (ot.test.id === 'cp20' || ot.test.id === 'vo2max-cycling') {
        const ftpW = Math.round(parseFloat(saveVals['ftp'] ?? '') || 0)
        if (ftpW > 0) {
          await sb.from('athlete_performance_profile').upsert(
            { user_id: uid, ftp_watts: ftpW, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('thw:zones-changed'))
          onFtpUpdate?.(ftpW)
        }
      }

      setSaved(true)
      setVals({})
      setPendingDocs([])
      setTimeout(() => setSaved(false), 3000)
      void loadHistory(ot.test.name, ot.sport)
    } finally {
      setSaving(false)
    }
  }

  // Ajoute le test comme séance planifiée à une date choisie (planning de l'athlète
  // scopé si coach, sinon le sien). source='coach' requis par la RLS côté coach.
  async function addToPlanning() {
    if (!ot || !planDate) return
    setPlanSaving(true)
    try {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) return
      const d = new Date(planDate + 'T00:00:00')
      // Lundi de la semaine (day_index 0 = lundi … 6 = dimanche).
      const dow = (d.getDay() + 6) % 7
      const monday = new Date(d); monday.setDate(d.getDate() - dow)
      const weekStart = monday.toISOString().slice(0, 10)
      const durMin = parseInt(String(ot.test.duration).match(/\d+/)?.[0] ?? '', 10) || 30
      const protoNow = PROTOCOLS[ot.test.id]
      const notes = protoNow
        ? `Test — ${ot.test.name}. ${protoNow.objectif}\nÉtapes : ${protoNow.etapes.join(' · ')}`
        : `Test — ${ot.test.name}. ${ot.test.desc}`
      const intensity = ot.test.difficulty === 'Maximal' ? 'high' : ot.test.difficulty === 'Intense' ? 'medium' : 'low'
      await sb.from('planned_sessions').insert({
        user_id:      uid,
        week_start:   weekStart,
        day_index:    dow,
        sport:        TEST_SPORT_TO_PLANNING[ot.sport],
        title:        `Test · ${ot.test.name}`,
        duration_min: durMin,
        status:       'planned',
        intensity,
        notes,
        blocks:       [],
        plan_variant: 'A',
        source:       isCoachScoped() ? 'coach' : 'test',
      })
      setPlanDone(true)
      setTimeout(() => { setPlanDone(false); setPlanOpen(false) }, 2200)
    } finally {
      setPlanSaving(false)
    }
  }

  const SH = ({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
      <span style={{ color, opacity:0.9 }}>{icon}</span>
      <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color }}>{label}</span>
    </div>
  )

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(0,0,0,0.60)', backdropFilter:'blur(4px)', animation:'cardEnter 0.2s ease both' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:'var(--bg-card)', borderRadius:'22px 22px 0 0', border:'1px solid var(--border)', borderBottom:'none', padding:'20px 22px 44px', boxShadow:'0 -10px 50px rgba(0,0,0,0.35)', animation:'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both', maxHeight:'calc(100dvh - 72px)', overflowY:'auto' as const }}>

        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 18px' }}/>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:`${cfg.color}18`, border:`1px solid ${cfg.color}40`, display:'flex', alignItems:'center', justifyContent:'center', color:cfg.color, flexShrink:0 }}>
              {cfg.icon}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, margin:0, letterSpacing:'-0.02em' }}>{ot.test.name}</h2>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${DIFFICULTY_COLOR[ot.test.difficulty]}20`, color:DIFFICULTY_COLOR[ot.test.difficulty], textTransform:'uppercase' as const, letterSpacing:'0.07em', flexShrink:0 }}>{ot.test.difficulty}</span>
              </div>
              <p style={{ fontSize:11, color:cfg.color, margin:0, fontWeight:600 }}>{cfg.label} · {ot.test.duration}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>×</button>
        </div>

        {!proto ? (
          <div style={{ textAlign:'center' as const, padding:'32px 0', color:'var(--text-dim)', fontSize:13 }}>
            {t('performance.protocolInProgress')}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Objectif */}
            <div style={{ padding:'13px 16px', borderRadius:13, background:`${cfg.color}0d`, border:`1px solid ${cfg.color}30` }}>
              <SH icon={<IcoTarget/>} label={t('performance.objective')} color={cfg.color}/>
              <p style={{ fontSize:13, color:'var(--text)', margin:0, lineHeight:1.65 }}>{proto.objectif}</p>
            </div>

            {/* Avertissement */}
            {proto.avertissement && (
              <div style={{ padding:'12px 16px', borderRadius:13, background:'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.35)' }}>
                <SH icon={<IcoWarn/>} label={t('performance.warning')} color="#f97316"/>
                <p style={{ fontSize:12.5, color:'var(--text-mid)', margin:0, lineHeight:1.6 }}>{proto.avertissement}</p>
              </div>
            )}

            {/* Conditions + Échauffement — grid 2 col */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <SH icon={<IcoCheck/>} label={t('performance.conditions')} color="var(--text-mid)"/>
                <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  {proto.conditions.map((c,i) => (
                    <li key={i} style={{ fontSize:11.5, color:'var(--text-mid)', lineHeight:1.5 }}>{c}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <SH icon={<IcoFlame/>} label={t('performance.warmup')} color="#f59e0b"/>
                <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  {proto.echauffement.map((e,i) => (
                    <li key={i} style={{ fontSize:11.5, color:'var(--text-mid)', lineHeight:1.5 }}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Étapes */}
            <div style={{ padding:'13px 16px', borderRadius:13, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <SH icon={<IcoList/>} label={t('performance.protocolSteps')} color="var(--text)"/>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {proto.etapes.map((e, i) => (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, fontWeight:700, color:cfg.color, width:18, flexShrink:0, paddingTop:2 }}>{i+1}.</span>
                    <p style={{ fontSize:12.5, color:'var(--text)', margin:0, lineHeight:1.6 }}>{e}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interprétation */}
            <div style={{ padding:'13px 16px', borderRadius:13, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.25)' }}>
              <SH icon={<IcoBook/>} label={t('performance.resultsInterpretation')} color="#22c55e"/>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {proto.interpretation.map((r, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ color:'#22c55e', fontSize:12, flexShrink:0, paddingTop:1 }}>→</span>
                    <p style={{ fontSize:12.5, color:'var(--text-mid)', margin:0, lineHeight:1.55 }}>{t(r)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Erreurs + Fréquence — grid 2 col */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.20)' }}>
                <SH icon={<IcoWarn/>} label={t('performance.commonMistakes')} color="#ef4444"/>
                <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  {proto.erreurs.map((e,i) => (
                    <li key={i} style={{ fontSize:11.5, color:'var(--text-mid)', lineHeight:1.5 }}>{e}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.22)' }}>
                <SH icon={<IcoClock/>} label={t('performance.frequency')} color="#818cf8"/>
                <p style={{ fontSize:12, color:'var(--text-mid)', margin:0, lineHeight:1.6 }}>{proto.frequence}</p>
              </div>
            </div>

            {/* Saisie des résultats */}
            {inputFields.length > 0 && (() => {
              const scoreResult = computeTestScoreResult(ot.test.id, buildSaveVals(), gender)
              const hasBench = ot.test.id in TEST_BENCHMARKS
              const derived = computeDerived(ot.test.id, vals, weightKg, gender)
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ padding:'14px 16px', borderRadius:13, background:'var(--bg-card2)', border:`1px solid ${cfg.color}35` }}>
                    {/* Gender toggle in header */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <SH icon={<IcoSave/>} label={t('performance.enterMyResults')} color={cfg.color}/>
                      {hasBench && (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:'var(--text-dim)' }}>{t('performance.gender')}</span>
                          <div style={{ display:'flex', background:'var(--bg)', borderRadius:7, overflow:'hidden', border:'1px solid var(--border)' }}>
                            {(['M','F'] as const).map(g => (
                              <button key={g} onClick={() => setGender(g)} style={{ padding:'3px 11px', background:gender===g?cfg.color:'transparent', border:'none', cursor:'pointer', color:gender===g?'#fff':'var(--text-dim)', fontSize:11, fontWeight:700, transition:'background 0.15s' }}>{g}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
                      {inputFields.map(f => (
                        <div key={f.cle} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <label style={{ fontSize:11, color:'var(--text-dim)', fontWeight:600 }}>
                            {f.label}{f.unite ? <span style={{ color:'var(--text-dim)', fontWeight:400 }}> ({f.unite})</span> : null}
                            {f.required && <span style={{ color:cfg.color }}>*</span>}
                          </label>
                          <input
                            value={vals[f.cle] ?? ''}
                            onChange={e => setVal(f.cle, e.target.value)}
                            placeholder={f.placeholder ?? (f.unite ? t('performance.inUnit', { unit: f.unite }) : '—')}
                            style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:13, fontFamily:'DM Mono,monospace', outline:'none', width:'100%', boxSizing:'border-box' as const }}
                          />
                          {f.helper && <span style={{ fontSize:10, color:'var(--text-dim)' }}>{f.helper}</span>}
                        </div>
                      ))}
                    </div>

                    {/* Poids de l'athlète au moment du test (éditable → W/kg exacts). */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:11, padding:'8px 11px', borderRadius:9, background:'var(--bg)', border:'1px solid var(--border)' }}>
                      <span style={{ fontSize:11, color:'var(--text-dim)', fontWeight:600, flexShrink:0 }}>{t('performance.weightAtTest')}</span>
                      <input
                        type="number" inputMode="decimal" value={weightKg > 0 ? weightKg : ''} placeholder="—"
                        onChange={e => setWeightKg(parseFloat(e.target.value) || 0)}
                        onBlur={() => { void saveWeight(weightKg) }}
                        style={{ width:74, padding:'5px 8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text)', fontSize:13, fontFamily:'DM Mono,monospace', outline:'none', textAlign:'right' as const }}
                      />
                      <span style={{ fontSize:11, color:'var(--text-dim)' }}>kg</span>
                      {weightSaving && <span style={{ fontSize:10, color:'var(--text-dim)' }}>…</span>}
                    </div>

                    {/* Résultats calculés — chaque valeur en W est doublée d'un W/kg. */}
                    {derived.length > 0 && (
                      <div style={{ marginTop:11, padding:'11px 13px', borderRadius:10, background:`${cfg.color}0d`, border:`1px solid ${cfg.color}30` }}>
                        <div style={{ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:cfg.color, marginBottom:8 }}>{t('performance.computedResults')}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 12px' }}>
                          {derived.filter(d => !d.hidden).map(d => (
                            <div key={d.key} style={{ display:'flex', flexDirection:'column', gap:1 }}>
                              <span style={{ fontSize:10, color:'var(--text-dim)', fontWeight:600 }}>{d.label}</span>
                              <span className="tnum" style={{ fontSize:15, fontWeight:700, color:'var(--text)', fontFamily:'DM Mono,monospace' }}>
                                {d.display ?? d.value}{d.unit && !d.display ? <span style={{ fontSize:11, color:'var(--text-dim)', marginLeft:3 }}>{d.unit}</span> : null}
                                {d.wkg && weightKg > 0 && (
                                  <span style={{ fontSize:11, color:cfg.color, marginLeft:7, fontWeight:600 }}>· {(d.value / weightKg).toFixed(2)} W/kg</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        {derived.some(d => d.wkg) && weightKg <= 0 && (
                          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'8px 0 0' }}>{t('performance.setWeightForWkg')}</p>
                        )}
                      </div>
                    )}

                    {/* Lier une activité (même sport, récentes d'abord). */}
                    {activities.length > 0 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:11 }}>
                        <label style={{ fontSize:11, color:'var(--text-dim)', fontWeight:600 }}>{t('performance.linkActivity')}</label>
                        <select
                          value={activityId}
                          onChange={e => setActivityId(e.target.value)}
                          style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:12.5, fontFamily:'DM Sans,sans-serif', outline:'none', width:'100%', boxSizing:'border-box' as const, cursor:'pointer' }}
                        >
                          <option value="">{t('performance.noActivityLinked')}</option>
                          {activities.map(a => (
                            <option key={a.id} value={a.id}>
                              {new Date(a.started_at).toLocaleDateString('fr-FR')} · {a.title || t('performance.activity')}{a.distance_m ? ` · ${(a.distance_m/1000).toFixed(1)} km` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={() => { void handleSave() }}
                      disabled={saving}
                      style={{ marginTop:12, width:'100%', padding:'10px', borderRadius:10, background:saved ? 'rgba(34,197,94,0.25)' : saving ? 'var(--bg-card2)' : `${cfg.color}22`, color:saved ? '#22c55e' : saving ? 'var(--text-dim)' : cfg.color, fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.2s', border:`1px solid ${saved ? 'rgba(34,197,94,0.5)' : saving ? 'var(--border)' : cfg.color+'40'}` }}
                    >
                      {saved ? t('performance.resultsSaved') : saving ? t('performance.saving') : t('performance.saveThisTest')}
                    </button>

                    {/* Ajouter ce test au planning à une date choisie. */}
                    <div style={{ marginTop:10, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                      {!planOpen ? (
                        <button
                          onClick={() => setPlanOpen(true)}
                          style={{ width:'100%', padding:'9px', borderRadius:9, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-mid)', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'DM Sans,sans-serif' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
                          {t('performance.addToPlanning')}
                        </button>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <input
                            type="date" value={planDate} onChange={e => setPlanDate(e.target.value)}
                            style={{ flex:1, padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:12.5, fontFamily:'DM Sans,sans-serif', outline:'none' }}
                          />
                          <button
                            onClick={() => { void addToPlanning() }}
                            disabled={!planDate || planSaving}
                            style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${cfg.color}40`, background:planDone ? 'rgba(34,197,94,0.25)' : `${cfg.color}22`, color:planDone ? '#22c55e' : cfg.color, fontSize:12.5, fontWeight:700, cursor:(!planDate||planSaving)?'not-allowed':'pointer', whiteSpace:'nowrap' as const, fontFamily:'DM Sans,sans-serif' }}
                          >
                            {planDone ? t('performance.added') : planSaving ? t('performance.saving') : t('performance.confirm')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live score display */}
                  {scoreResult && (
                    <TestScoreDisplay result={scoreResult} accentColor={cfg.color} />
                  )}

                  {/* Level reference table — always visible for scored tests */}
                  {hasBench && (
                    <div style={{ padding:'14px 16px', borderRadius:13, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth={2}><path d="M3 3h18M3 9h18M3 15h18M3 21h18"/></svg>
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:cfg.color }}>{t('performance.referenceLevels')}</span>
                        {scoreResult && (
                          <ScoreBadge score={scoreResult.overall} level={scoreResult.level} size="sm" />
                        )}
                      </div>
                      <LevelTable
                        testId={ot.test.id}
                        gender={gender}
                        currentScore={scoreResult?.overall ?? null}
                        accentColor={cfg.color}
                      />
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Documents */}
            <div style={{ padding:'14px 16px', borderRadius:13, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <SH icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label={t('performance.documents')} color="var(--text-mid)"/>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                style={{ display:'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files ?? [])
                  setPendingDocs(prev => [...prev, ...files.map(f => ({ file: f, name: f.name }))])
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />
              {pendingDocs.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
                  {pendingDocs.map((doc, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--border)' }}>
                      <span style={{ fontSize:11, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{doc.name}</span>
                      <span style={{ fontSize:10, color:'var(--text-dim)', marginLeft:8, flexShrink:0 }}>{(doc.file.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setPendingDocs(p => p.filter((_, j) => j !== i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:16, lineHeight:1, padding:'0 0 0 8px', flexShrink:0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ width:'100%', padding:'8px', borderRadius:9, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = cfg.color; (e.currentTarget as HTMLButtonElement).style.color = cfg.color }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t('performance.addFile')}
              </button>
              {pendingDocs.length > 0 && (
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'6px 0 0', textAlign:'center' as const }}>
                  {t('performance.filesWillUpload', { n: pendingDocs.length })}
                </p>
              )}
            </div>

            {/* Historique des résultats */}
            {(history.length > 0 || histLoading) && (
              <div style={{ padding:'14px 16px', borderRadius:13, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <div
                  onClick={() => setShowHistory(h => !h)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <IcoClock/>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-mid)' }}>
                      {t('performance.history')} ({history.length})
                    </span>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2} style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {showHistory && (
                  histLoading ? (
                    <p style={{ fontSize:11, color:'var(--text-dim)', margin:'10px 0 0' }}>{t('performance.loading')}</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:10 }}>
                      {history.map(entry => (
                        <div key={entry.id} style={{ padding:'9px 12px', borderRadius:9, background:'var(--bg)', border:'1px solid var(--border)' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                            <p style={{ fontSize:10, fontWeight:700, color:cfg.color, margin:0, fontFamily:'DM Mono,monospace' }}>{entry.date}</p>
                            {entry.documents && entry.documents.length > 0 && (
                              <span style={{ fontSize:9, color:'var(--text-dim)', display:'flex', alignItems:'center', gap:3 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                {entry.documents.length} doc{entry.documents.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'4px 12px' }}>
                            {Object.entries(entry.valeurs).map(([k, v]) => {
                              if (!v) return null
                              const fieldDef = proto?.fields.find(f => f.cle === k)
                              return (
                                <span key={k} style={{ fontSize:11, color:'var(--text-mid)' }}>
                                  <span style={{ color:'var(--text-dim)' }}>{fieldDef?.label ?? k} : </span>
                                  <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color:'var(--text)' }}>{v}{fieldDef?.unite ? ` ${fieldDef.unite}` : ''}</span>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

// TestCard extrait dans components/tests/TestCard.tsx (patron unique, neutre).

// ════════════════════════════════════════════════
// HISTORIQUE TESTS GLOBAL
// ════════════════════════════════════════════════
interface GlobalTestResult {
  id: string
  date: string
  valeurs: Record<string, string>
  documents?: { name: string; path: string; size: number; type: string }[]
  nom: string
  sport?: string
}

function HistoriqueTestsPanel({ onClose }: { onClose: () => void }) {
  const [results,  setResults]  = useState<GlobalTestResult[]>([])
  const [loading,  setLoading]  = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid) { setLoading(false); return }
      const { data } = await sb
        .from('test_results')
        .select('id, date, valeurs, documents, test_definitions(nom, sport)')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(100)
      if (data) {
        setResults(data.map((r: Record<string, unknown>) => {
          const td = r.test_definitions as { nom?: string; sport?: string } | null
          return {
            id: r.id as string,
            date: r.date as string,
            valeurs: (r.valeurs ?? {}) as Record<string, string>,
            documents: (r.documents ?? []) as GlobalTestResult['documents'],
            nom: td?.nom ?? '—',
            sport: td?.sport,
          }
        }))
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (typeof document === 'undefined') return null

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(currentLocale(), { day:'2-digit', month:'short', year:'numeric' })

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(0,0,0,0.60)', backdropFilter:'blur(4px)', animation:'cardEnter 0.2s ease both' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:'var(--bg-card)', borderRadius:'22px 22px 0 0', border:'1px solid var(--border)', borderBottom:'none', padding:'20px 22px 44px', boxShadow:'0 -10px 50px rgba(0,0,0,0.35)', animation:'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both', maxHeight:'calc(100dvh - 72px)', overflowY:'auto' as const }}>

        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 18px' }}/>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, margin:'0 0 3px', letterSpacing:'-0.02em' }}>{t('performance.testsHistory')}</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>{t('performance.allDisciplinesSortedByDate')}</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center' as const, padding:'40px 0', color:'var(--text-dim)', fontSize:13 }}>{t('performance.loading')}</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign:'center' as const, padding:'40px 0' }}>
            <p style={{ fontSize:14, color:'var(--text-dim)', marginBottom:8 }}>{t('performance.noTestSaved')}</p>
            <p style={{ fontSize:12, color:'var(--text-dim)' }}>{t('performance.noTestSavedDesc')}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {results.map(r => {
              const sportCfg = r.sport ? TEST_SPORT_TABS.find(t => t.id === r.sport) : undefined
              const vals = Object.entries(r.valeurs).filter(([,v]) => v && String(v).trim())
              return (
                <div key={r.id} style={{ padding:'13px 16px', borderRadius:14, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom: vals.length > 0 ? 10 : 0 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' as const }}>
                        {sportCfg && (
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${sportCfg.color}18`, color:sportCfg.color, textTransform:'uppercase' as const, letterSpacing:'0.07em', flexShrink:0 }}>{sportCfg.label}</span>
                        )}
                        <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:0, color:'var(--text)' }}>{r.nom}</h3>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <p style={{ fontSize:11, color:'var(--text-dim)', margin:0, fontFamily:'DM Mono,monospace' }}>{fmtDate(r.date)}</p>
                        {r.documents && r.documents.length > 0 && (
                          <span style={{ fontSize:9, color:'var(--text-dim)', display:'flex', alignItems:'center', gap:3 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            {r.documents.length} doc{r.documents.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {vals.length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
                      {vals.slice(0, 6).map(([k, v]) => (
                        <div key={k} style={{ padding:'4px 10px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                          <span style={{ fontSize:10, color:'var(--text-dim)' }}>{k}: </span>
                          <span style={{ fontSize:10, fontWeight:700, color:'var(--text)', fontFamily:'DM Mono,monospace' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

// ════════════════════════════════════════════════
// ONGLET TESTS
// ════════════════════════════════════════════════
function TestsTab({ profile, onAnalyzeTest, initialSport, initialTestId, onFtpUpdate }: {
  profile: typeof INIT_PROFILE
  onAnalyzeTest?: (test: TestDef) => Promise<void>
  initialSport?: TestSport
  initialTestId?: string
  onFtpUpdate?: (ftp: number) => void
}) {
  const [testSport,      setTestSport]      = useState<TestSport>(initialSport ?? 'running')
  const [openTest,       setOpenTest]       = useState<OpenTest | null>(null)
  const [showHistorique, setShowHistorique] = useState(false)
  const [sportMenuOpen,  setSportMenuOpen]  = useState(false)
  const isMobile = useWindowWidth() < 768
  const { t } = useI18n()

  // Open specific test on mount when navigated via URL params
  useEffect(() => {
    if (!initialSport || !initialTestId) return
    const sport = initialSport
    const found = TESTS[sport]?.find(t => t.id === initialTestId)
    if (found) {
      setTestSport(sport)
      setOpenTest({ sport, test: found })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cfg   = TEST_SPORT_TABS.find(t => t.id === testSport)!
  const tests = TESTS[testSport]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header row: tabs + Historique button */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, flexWrap:'wrap' as const }}>

        {/* Sélecteur de sport — menu déroulant (une seule commande, desktop + mobile) */}
        <div style={{ position:'relative', flex:1, minWidth:180, maxWidth:320 }}>
          <button
            onClick={() => setSportMenuOpen(o => !o)}
            style={{ width:'100%', padding:'10px 14px', borderRadius:12, border:'1px solid', borderColor:sportMenuOpen?cfg.color:'var(--border)', background:'var(--bg-card)', color:cfg.color, fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'var(--shadow-card)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:9 }}>
            <span style={{ display:'flex' }}>{cfg.icon}</span>
            <span style={{ flex:1, textAlign:'left' as const }}>{cfg.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ transform:sportMenuOpen?'rotate(180deg)':'none', transition:'transform 0.15s', opacity:0.7 }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {sportMenuOpen && (
            <>
              <div onClick={() => setSportMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:40 }}/>
              <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:41, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 12px 34px rgba(0,0,0,0.24)', overflow:'hidden', padding:4 }}>
                {TEST_SPORT_TABS.map(s => (
                  <button key={s.id} onClick={() => { setTestSport(s.id); setSportMenuOpen(false) }}
                    style={{ width:'100%', padding:'9px 11px', borderRadius:9, border:'none', cursor:'pointer', background:testSport===s.id?s.bg:'transparent', color:testSport===s.id?s.color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:testSport===s.id?700:500, display:'flex', alignItems:'center', gap:10, transition:'background 0.12s' }}>
                    <span style={{ display:'flex', opacity:testSport===s.id?1:0.65 }}>{s.icon}</span>{s.label}
                    <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-dim)' }}>{TESTS[s.id].length}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bouton Historique */}
        <button
          onClick={() => setShowHistorique(true)}
          style={{ padding:'9px 14px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-dim)', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' as const, transition:'border-color 0.15s, color 0.15s', flexShrink:0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#5b6fff'; (e.currentTarget as HTMLButtonElement).style.color = '#5b6fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)' }}
        >
          <IcoClock/>
          {t('performance.history')}
        </button>
      </div>

      {/* Section label */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:3, height:18, borderRadius:2, background:cfg.color }}/>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'var(--text)' }}>{cfg.label}</span>
        <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:`${cfg.color}15`, color:cfg.color, fontWeight:600 }}>
          {tests.length} test{tests.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap:12 }}>
        {tests.map(test => (
          <TestCard key={test.id} test={test} onOpen={() => setOpenTest({ sport:testSport, test })}/>
        ))}
      </div>

      {/* Protocol panel */}
      {openTest && <TestProtocolPanel open={openTest} onClose={() => setOpenTest(null)} onFtpUpdate={onFtpUpdate}/>}

      {/* Historique global */}
      {showHistorique && <HistoriqueTestsPanel onClose={() => setShowHistorique(false)}/>}
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
// URL param → internal test ID mapping
const HYROX_TEST_URL_MAP: Record<string, string> = {
  'force':                   'hyrox-force',
  'endurance-fonctionnelle': 'hyrox-endurance-wod',
  'explosivite':             'hyrox-explosivite',
}

export default function PerformancePage() {
  const [tab, setTab]                   = useState<PerfTab>('profil')
  const [profile, setProfile]           = useState({ ...INIT_PROFILE })
  const { show, dismiss }               = usePageOnboarding(PERFORMANCE_ONBOARDING.pageId, PERFORMANCE_ONBOARDING.version)
  const [selectedDatum, setSelectedDatum] = useState<SelectedDatum | null>(null)
  const [aiOpen, setAiOpen]             = useState(false)
  const [aiPrefill, setAiPrefill]       = useState('')
  const [aiInitLabel, setAiInitLabel]   = useState<string | undefined>(undefined)
  const [aiInitMsg,   setAiInitMsg]     = useState<string | undefined>(undefined)
  const [initialTest, setInitialTest]   = useState<{ sport: TestSport; testId: string } | null>(null)
  const isMobile = useWindowWidth() < 768
  const { t } = useI18n()
  // Le guide peut basculer d'onglet (profil/datas/tests) pour montrer chaque section.
  useGuideTabDemo('perf', (k) => setTab(k as PerfTab))

  // Read URL params on first mount — navigate to specific test if needed
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const tabParam  = params.get('tab')
    const sportParam = params.get('sport')
    const testParam  = params.get('test')
    if (tabParam === 'tests') {
      setTab('tests')
      if (sportParam && testParam) {
        const sport  = sportParam as TestSport
        const testId = HYROX_TEST_URL_MAP[testParam] ?? testParam
        setInitialTest({ sport, testId })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onSelectDatum(label: string, value: string) {
    setSelectedDatum(prev =>
      prev?.label === label && prev?.value === value ? null : { label, value }
    )
  }

  async function handleAnalyzeProfile() {
    try {
      const res  = await fetch('/api/performance-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyzeProfile', payload: { profile } }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      setAiInitLabel(t('performance.analyzeMyProfile'))
      setAiInitMsg(data.reply ?? data.error ?? t('performance.analysisError'))
      setAiOpen(true)
    } catch {
      setAiInitLabel(t('performance.analyzeMyProfile'))
      setAiInitMsg(t('performance.networkError'))
      setAiOpen(true)
    }
  }

  async function handleAnalyzeTest(test: TestDef) {
    try {
      const res  = await fetch('/api/performance-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyzeTest', payload: { testName: test.name, testResults: {}, profile } }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      setAiInitLabel(t('performance.analysisOf', { name: test.name }))
      setAiInitMsg(data.reply ?? data.error ?? t('performance.analysisError'))
      setAiOpen(true)
    } catch {
      setAiInitLabel(t('performance.analysisOf', { name: test.name }))
      setAiInitMsg(t('performance.networkError'))
      setAiOpen(true)
    }
  }

  async function handleAsk() {
    if (!selectedDatum) return
    setSelectedDatum(null)
    try {
      const res  = await fetch('/api/performance-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'explainData', payload: { dataName: selectedDatum.label, dataValue: selectedDatum.value } }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      setAiInitLabel(`${selectedDatum.label} : ${selectedDatum.value}`)
      setAiInitMsg(data.reply ?? data.error ?? t('performance.analysisError'))
      setAiOpen(true)
    } catch {
      setAiInitLabel(`${selectedDatum.label} : ${selectedDatum.value}`)
      setAiInitMsg(t('performance.networkError'))
      setAiPrefill(buildAIMessage(selectedDatum))
      setAiOpen(true)
    }
  }

  return (
    <>
      <PageHelp config={PERFORMANCE_ONBOARDING} show={show} onDismiss={dismiss} />

      {/* ── Sous-navigation de page (composant réutilisable) ── */}
      <TabbedPageLayout
        title="Performance"
        tabs={[{ id: 'profil', label: t('performance.tabProfil'), subtitle: t('performance.tabProfilSubtitle'), icon: User }, { id: 'datas', label: t('performance.tabDatas'), subtitle: t('performance.tabDatasSubtitle'), icon: Database }, { id: 'tests', label: t('performance.tabTests'), subtitle: t('performance.tabTestsSubtitle'), icon: FlaskConical }]}
        active={tab}
        onChange={setTab}
        renderPanel={id => id === 'profil' ? (
          <ProfilTab onSelect={onSelectDatum} selectedDatum={selectedDatum} profile={profile} setProfile={setProfile} onAnalyzeProfile={handleAnalyzeProfile} />
        ) : id === 'datas' ? (
          <DatasTab onSelect={onSelectDatum} selectedDatum={selectedDatum} profile={profile} onOpenAI={prompt => { setAiPrefill(prompt); setAiOpen(true) }} onNavigateToTests={() => setTab('tests')} />
        ) : (
          <TestsTab profile={profile} onAnalyzeTest={handleAnalyzeTest} initialSport={initialTest?.sport} initialTestId={initialTest?.testId} onFtpUpdate={ftp => setProfile(prev => ({ ...prev, ftp }))} />
        )}
      />

      {/* ── Bulle flottante de sélection ── */}
      {selectedDatum && (
        <SelectedDatumBubble
          datum={selectedDatum}
          onClear={() => setSelectedDatum(null)}
          onAsk={handleAsk}
        />
      )}

      {/* ── Panel Coach IA ── */}
      <AIPanel
        open={aiOpen}
        onClose={() => { setAiOpen(false); setAiPrefill(''); setAiInitMsg(undefined); setAiInitLabel(undefined) }}
        initialAgent="performance"
        prefillMessage={aiPrefill}
        initialUserLabel={aiInitLabel}
        initialAssistantMsg={aiInitMsg}
        context={{ page:'performance', profile }}
      />
    </>
  )
}
