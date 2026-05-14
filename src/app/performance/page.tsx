'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import AIAssistantButton from '@/components/ai/AIAssistantButton'
import { CountUp } from '@/components/ui/AnimatedBar'
import DatasTab from './DatasTab'
import { createClient } from '@/lib/supabase/client'
import {
  TEST_BENCHMARKS,
  computeTestScoreResult,
  LevelTable,
  TestScoreDisplay,
  ScoreBadge,
  levelFromScore,
} from './PerformanceTestLevels'

const AIPanel = dynamic(() => import('@/components/ai/AIPanel'), { ssr: false })

// ── Types ───────────────────────────────────────────────────────
type PerfTab = 'profil' | 'datas' | 'tests'
interface SelectedDatum { label: string; value: string }


const INIT_PROFILE = {
  ftp: 301, weight: 75, age: 31, lthr: 172, hrMax: 192, hrRest: 44,
  thresholdPace: '4:08', vma: 18.5, css: '1:28', vo2max: 62,
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
function Card({ children, style, delay }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  return (
    <div
      className="card-enter"
      style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:20, boxShadow:'var(--shadow-card)', animationDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </div>
  )
}

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
        background: selected ? 'rgba(0,200,224,0.08)' : 'var(--bg-card2)',
        border: `1px solid ${selected ? '#00c8e0' : 'var(--border)'}`,
        borderRadius:12, padding:'11px 13px',
        cursor: onSelect ? 'pointer' : undefined,
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        boxShadow: selected ? '0 0 0 2px rgba(0,200,224,0.15)' : undefined,
        userSelect: 'none' as const,
      }}
    >
      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:selected?'#00c8e0':color||'var(--text)', margin:0, lineHeight:1 }}>
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
      <input type="number" value={value} step={step||1} onChange={e => onChange(parseFloat(e.target.value)||0)}
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


// ── Floating bubble ──────────────────────────────────────────────
function SelectedDatumBubble({ datum, onClear, onAsk }: {
  datum: SelectedDatum; onClear: () => void; onAsk: () => void
}) {
  const [mounted, setMounted] = useState(false)
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
      border:'1px solid rgba(0,200,224,0.45)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,200,224,0.08)',
      animation:'cardEnter 0.22s cubic-bezier(0.4,0,0.2,1) both',
      maxWidth:'calc(100vw - 48px)',
      whiteSpace:'nowrap' as const,
    }}>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>{datum.label}</p>
        <p style={{ fontFamily:'DM Mono,monospace', fontSize:14, fontWeight:700, color:'#00c8e0', margin:0 }}>{datum.value}</p>
      </div>
      <button
        onClick={onAsk}
        style={{
          padding:'7px 14px', borderRadius:10,
          background:'linear-gradient(135deg,#00c8e0,#5b6fff)',
          border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
          whiteSpace:'nowrap' as const, flexShrink:0,
        }}
      >
        Demander au Coach IA
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
  { id:'cycling',  label:'Cyclisme', color:'#00c8e0' },
  { id:'swimming', label:'Natation', color:'#38bdf8' },
  { id:'hyrox',    label:'Hyrox',    color:'#ef4444' },
]

// ════════════════════════════════════════════════
// ONGLET PROFIL
// ════════════════════════════════════════════════
function ProfilTab({ onSelect, selectedDatum, profile: p, setProfile: setP, onAnalyzeProfile }: {
  onSelect: (label: string, value: string) => void
  selectedDatum: SelectedDatum | null
  profile: typeof INIT_PROFILE
  setProfile: React.Dispatch<React.SetStateAction<typeof INIT_PROFILE>>
  onAnalyzeProfile?: () => Promise<void>
}) {
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [savedOk,   setSavedOk]   = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [profLoading, setProfLoading] = useState(true)

  // Profil Spécifique
  const [specSport,  setSpecSport]  = useState<SportSpecId>('running')
  const [specParams, setSpecParams] = useState<Record<SportSpecId, Record<string, string>>>({
    running: {}, cycling: {}, swimming: {}, hyrox: {},
  })
  const [specSaving, setSpecSaving] = useState(false)
  const [specSavedOk,setSpecSavedOk]= useState(false)

  const wkg = (p.ftp / p.weight).toFixed(2)

  // ── Charger depuis Supabase au montage ─────────────────────────
  useEffect(() => {
    void (async () => {
      setProfLoading(true)
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return

        const [perfRes, profilesRes, specRes] = await Promise.all([
          sb.from('athlete_performance_profile')
            .select('ftp_watts,hr_max,hr_rest,lthr_run,threshold_pace_s_km,css_s_100m,vma_km_h,vo2max_ml_kg_min,age_years')
            .eq('user_id', user.id).maybeSingle(),
          sb.from('profiles').select('weight_kg').eq('id', user.id).maybeSingle(),
          sb.from('athlete_sport_profile').select('sport,params').eq('user_id', user.id),
        ])

        const perf = perfRes.data
        const prof = profilesRes.data

        if (perf || prof) {
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
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      // Parse allure seuil → secondes/km
      const tParts = p.thresholdPace.split(':').map(Number)
      const threshSec = tParts.length === 2 ? tParts[0] * 60 + (tParts[1] || 0) : 0

      // Parse CSS → secondes/100m
      const cParts = p.css.split(':').map(Number)
      const cssSec = cParts.length === 2 ? cParts[0] * 60 + (cParts[1] || 0) : 0

      await Promise.all([
        sb.from('athlete_performance_profile').upsert({
          user_id:              user.id,
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
        sb.from('profiles').upsert({ id: user.id, weight_kg: p.weight }, { onConflict: 'id' }),
      ])
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
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      await sb.from('athlete_sport_profile').upsert({
        user_id:    user.id,
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

  if (profLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:'var(--text-dim)', fontSize:13, gap:10 }}>
        <span style={{ width:16, height:16, border:'2px solid var(--border)', borderTopColor:'#00c8e0', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>
        Chargement du profil…
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Profil Global ── */}
      <Card>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap' as const, gap:8 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <div style={{ width:3, height:16, borderRadius:2, background:'linear-gradient(180deg,#00c8e0,#5b6fff)' }}/>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Profil Global</h2>
            </div>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0 11px' }}>Paramètres physiologiques transversaux</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {!editing && onAnalyzeProfile && (
              <button
                onClick={() => { setAnalyzing(true); onAnalyzeProfile().finally(() => setAnalyzing(false)) }}
                disabled={analyzing}
                style={{ padding:'6px 14px', borderRadius:9, background:'linear-gradient(135deg,#f97316,#fb923c)', border:'1px solid transparent', color:'#fff', fontSize:12, cursor:analyzing?'not-allowed':'pointer', fontWeight:600, opacity:analyzing?0.7:1, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' as const }}
              >
                {analyzing ? <><span style={{ width:11, height:11, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>Analyse…</> : 'Analyser'}
              </button>
            )}
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  style={{ padding:'6px 12px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                  Annuler
                </button>
                <button
                  onClick={() => { void handleSaveGlobal() }}
                  disabled={saving}
                  style={{ padding:'6px 14px', borderRadius:9, background:savedOk?'rgba(34,197,94,0.25)':'linear-gradient(135deg,#00c8e0,#5b6fff)', border:`1px solid ${savedOk?'rgba(34,197,94,0.5)':'transparent'}`, color:savedOk?'#22c55e':'#fff', fontSize:12, cursor:saving?'not-allowed':'pointer', fontWeight:600, opacity:saving?0.7:1 }}>
                  {saving ? 'Enregistrement…' : savedOk ? '✓ Enregistré' : 'Enregistrer'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                style={{ padding:'6px 14px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                Modifier
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-3">
            <NInput label="FTP" unit="W" value={p.ftp} onChange={v => setP({...p,ftp:v})}/>
            <NInput label="Poids" unit="kg" value={p.weight} onChange={v => setP({...p,weight:v})} step={0.5}/>
            <NInput label="Age" value={p.age} onChange={v => setP({...p,age:v})}/>
            <NInput label="FC max" unit="bpm" value={p.hrMax} onChange={v => setP({...p,hrMax:v})}/>
            <NInput label="FC repos" unit="bpm" value={p.hrRest} onChange={v => setP({...p,hrRest:v})}/>
            <NInput label="LTHR" unit="bpm" value={p.lthr} onChange={v => setP({...p,lthr:v})}/>
            <NInput label="VMA" unit="km/h" value={p.vma} onChange={v => setP({...p,vma:v})} step={0.5}/>
            <NInput label="VO2max" value={p.vo2max} onChange={v => setP({...p,vo2max:v})}/>
            <TInput label="Allure seuil" value={p.thresholdPace} onChange={v => setP({...p,thresholdPace:v})} placeholder="4:08"/>
            <TInput label="CSS" value={p.css} onChange={v => setP({...p,css:v})} placeholder="1:28"/>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }} className="md:grid-cols-4">
            <StatBox label="FTP"          value={p.ftp}            unit="W"        sub={`${wkg} W/kg`} color="#00c8e0" onSelect={() => onSelect('FTP', `${p.ftp} W`)} selected={isSel('FTP', p.ftp, 'W')}/>
            <StatBox label="Allure seuil" value={p.thresholdPace}  unit="/km"      color="#22c55e"     onSelect={() => onSelect('Allure seuil', `${p.thresholdPace}/km`)} selected={selectedDatum?.label==='Allure seuil'}/>
            <StatBox label="VMA"          value={p.vma}            unit="km/h"     color="#22c55e"     onSelect={() => onSelect('VMA', `${p.vma} km/h`)} selected={isSel('VMA', p.vma, 'km/h')}/>
            <StatBox label="CSS"          value={p.css}            unit="/100m"    color="#38bdf8"     onSelect={() => onSelect('CSS', `${p.css}/100m`)} selected={selectedDatum?.label==='CSS'}/>
            <StatBox label="FC max"       value={p.hrMax}          unit="bpm"      color="#ef4444"     onSelect={() => onSelect('FC max', `${p.hrMax} bpm`)} selected={isSel('FC max', p.hrMax, 'bpm')}/>
            <StatBox label="FC repos"     value={p.hrRest}         unit="bpm"      color="#22c55e"     onSelect={() => onSelect('FC repos', `${p.hrRest} bpm`)} selected={isSel('FC repos', p.hrRest, 'bpm')}/>
            <StatBox label="LTHR"         value={p.lthr}           unit="bpm"      color="#f97316"     onSelect={() => onSelect('LTHR', `${p.lthr} bpm`)} selected={isSel('LTHR', p.lthr, 'bpm')}/>
            <StatBox label="VO2max"       value={p.vo2max}         unit="ml/kg/min" color="#a855f7"   onSelect={() => onSelect('VO2max', `${p.vo2max} ml/kg/min`)} selected={isSel('VO2max', p.vo2max, 'ml/kg/min')}/>
          </div>
        )}
      </Card>

      {/* ── Profil Spécifique ── */}
      <Card>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
            <div style={{ width:3, height:16, borderRadius:2, background:'linear-gradient(180deg,#f97316,#ef4444)' }}/>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>Profil Spécifique</h2>
          </div>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0 11px' }}>Benchmarks personnels par discipline — références de forme actuelles</p>
        </div>
        {/* Sport tabs */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:14 }}>
          {SPORT_SPEC_TABS.map(t => (
            <button key={t.id} onClick={() => setSpecSport(t.id)} style={{
              padding:'5px 13px', borderRadius:8, border:'1px solid',
              borderColor: specSport === t.id ? t.color : 'var(--border)',
              background: specSport === t.id ? `${t.color}15` : 'var(--bg-card2)',
              color: specSport === t.id ? t.color : 'var(--text-mid)',
              fontSize:11, fontWeight: specSport === t.id ? 700 : 400, cursor:'pointer', transition:'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>
        {/* Fields grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:9 }} className="md:grid-cols-3">
          {SPORT_SPEC_FIELDS[specSport].map(f => (
            <div key={f.key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)' }}>
                {f.label}{f.unit && <span style={{ fontWeight:400, marginLeft:3, textTransform:'none' as const }}>({f.unit})</span>}
              </label>
              <input
                type="text"
                value={specParams[specSport][f.key] ?? ''}
                onChange={e => setSpecField(f.key, e.target.value)}
                placeholder={f.placeholder ?? (f.unit ? `En ${f.unit}` : '—')}
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:12, outline:'none' }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => { void handleSaveSpec() }}
          disabled={specSaving}
          style={{ marginTop:12, width:'100%', padding:'9px', borderRadius:10, background:specSavedOk?'rgba(34,197,94,0.20)':SPORT_SPEC_TABS.find(t=>t.id===specSport)!.color+'22', color:specSavedOk?'#22c55e':SPORT_SPEC_TABS.find(t=>t.id===specSport)!.color, fontSize:12, fontWeight:700, cursor:specSaving?'not-allowed':'pointer', border:`1px solid ${specSavedOk?'rgba(34,197,94,0.4)':SPORT_SPEC_TABS.find(t=>t.id===specSport)!.color+'40'}`, transition:'all 0.2s' }}
        >
          {specSaving ? 'Enregistrement…' : specSavedOk ? '✓ Benchmarks enregistrés' : `Enregistrer benchmarks ${SPORT_SPEC_TABS.find(t=>t.id===specSport)!.label}`}
        </button>
      </Card>

      {/* ── Niveau estimé ── */}
      <Card>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 14px' }}>Niveau estimé</h2>
        {[
          { label:'W/kg',    val:parseFloat(wkg), max:6,  display:`${wkg} W/kg`,           color:'#00c8e0', desc:parseFloat(wkg)>=4.5?'Expert':parseFloat(wkg)>=3.5?'Avancé':'Intermédiaire' },
          { label:'VO2max',  val:p.vo2max,        max:80, display:`${p.vo2max} ml/kg/min`,  color:'#a855f7', desc:p.vo2max>=65?'Élite':p.vo2max>=55?'Élevé':'Moyen' },
          { label:'FC repos',val:80-p.hrRest,     max:50, display:`${p.hrRest} bpm`,        color:'#22c55e', desc:p.hrRest<=40?'Élite':p.hrRest<=50?'Élevé':'Moyen' },
        ].map(item => {
          const sel = selectedDatum?.label === item.label
          return (
            <div key={item.label} onClick={() => onSelect(item.label, item.display)}
              style={{ marginBottom:12, padding:'8px 10px', borderRadius:10, cursor:'pointer', background:sel?`${item.color}10`:undefined, border:`1px solid ${sel?item.color+'55':'transparent'}`, transition:'background 0.15s, border-color 0.15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'var(--text-mid)' }}>{item.label}</span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:`${item.color}22`, color:item.color, fontWeight:600 }}>{item.desc}</span>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:item.color }}>{item.display}</span>
                </div>
              </div>
              <div style={{ height:7, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
                <div style={{ height:'100%', width:`${Math.min(Math.abs(item.val)/item.max*100,100)}%`, background:`linear-gradient(90deg,${item.color}88,${item.color})`, borderRadius:999 }}/>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}


// ════════════════════════════════════════════════
// ONGLET TESTS — types, données, composants
// ════════════════════════════════════════════════
type TestSport = 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox'
interface TestDef {
  id: string; name: string; desc: string; duration: string
  difficulty: 'Modéré' | 'Intense' | 'Maximal'
}
interface OpenTest { sport: TestSport; test: TestDef }
interface FieldDef {
  cle: string; label: string; unite: string | null; type: 'number' | 'string'
  placeholder?: string; helper?: string; required?: boolean
}
interface TestProtocol {
  objectif: string; avertissement?: string
  conditions: string[]; echauffement: string[]
  etapes: string[]; interpretation: string[]
  erreurs: string[]; frequence: string
  fields: FieldDef[]
}

const DIFFICULTY_COLOR: Record<TestDef['difficulty'], string> = {
  'Modéré': '#22c55e', 'Intense': '#f59e0b', 'Maximal': '#ef4444',
}

const TEST_SPORT_TABS: { id: TestSport; label: string; short: string; color: string; bg: string; icon: React.ReactNode }[] = [
  {
    id: 'running', label: 'Running', short: 'Run', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 4a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none"/><path d="M7 20l3-6 3 3 3-7"/><path d="M15 4l-2 4-3 1-2 4"/></svg>,
  },
  {
    id: 'cycling', label: 'Cyclisme', short: 'Vélo', color: '#00c8e0', bg: 'rgba(0,200,224,0.10)',
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

const TESTS: Record<TestSport, TestDef[]> = {
  running: [
    { id:'vma',                    name:'VMA',                   desc:'Vitesse Maximale Aérobie sur piste. Détermine ton allure plafond pour calibrer toutes tes zones d\'entraînement.',                 duration:'~6 min',    difficulty:'Maximal' },
    { id:'running-endurance-pct',  name:'Endurance',             desc:'% de la VMA tenu sur marathon. Mesure l\'efficacité aérobie : plus vous courez le marathon près de votre VMA, meilleur le profil.', duration:'42 km',     difficulty:'Maximal' },
    { id:'running-10km',           name:'Résistance 10 km',      desc:'Meilleur temps sur 10 km. Combine vitesse et endurance au seuil lactique. Référence mondiale : 26:24 (H) / 29:01 (F).',             duration:'27–62 min', difficulty:'Maximal' },
    { id:'running-economie-fc',    name:'Économie de course',    desc:'Allure tenue à FC 150 bpm. Mesure l\'efficacité de course et l\'économie de mouvement — calculé depuis vos sorties avec capteur FC.',duration:'30 min',    difficulty:'Modéré'  },
    { id:'running-recup-fc',       name:'Récupération FC',       desc:'Chute de FC en 1 minute après effort intense. Indicateur clé de condition cardiovasculaire générale — calculé automatiquement.',     duration:'5 min',     difficulty:'Intense' },
    { id:'vo2max-run',    name:'VO2max',       desc:'Test d\'effort gradué pour mesurer la consommation maximale d\'oxygène. Paliers progressifs jusqu\'à épuisement.',                                      duration:'20–35 min', difficulty:'Maximal' },
    { id:'lactate-run',   name:'Test lactate',  desc:'Mesure de la lactatémie à différentes intensités. Zones précises, identification du seuil SL1 et SL2.',                                                duration:'60–90 min', difficulty:'Modéré'  },
    { id:'cooper',        name:'Cooper',         desc:'12 minutes d\'effort maximal en continu. Distance parcourue → estimation VO2max selon la formule Cooper.',                                              duration:'12 min',    difficulty:'Maximal' },
    { id:'tmi',           name:'TMI',            desc:'Test de Maintien d\'Intensité. Mesure la capacité à tenir une allure au seuil lactate sur durée prolongée.',                                          duration:'30 min',    difficulty:'Intense' },
  ],
  cycling: [
    { id:'cp20',             name:'FTP',            desc:'Critical Power 20 min — puissance moyenne × 0.95 = FTP. Exprimé en W/kg. Indicateur principal en cyclisme.',                                    duration:'~35 min',    difficulty:'Maximal' },
    { id:'vo2max-cycling',   name:'PMA / Sprint',   desc:'Test rampe sur ergocycle (paliers +20W/min) pour la PMA, ou sprint 5s pour la puissance neuromusculaire maximale. Exprimé en W/kg.',             duration:'15–25 min',  difficulty:'Maximal' },
    { id:'endurance-cycling',name:'Endurance 3h',   desc:'% du FTP tenu sur 3h en puissance normalisée. Mesure l\'efficience aérobie sur longue durée. Calculé depuis vos sorties enregistrées.',         duration:'180 min',    difficulty:'Modéré'  },
    { id:'cycling-z4',       name:'Résistance Z4',  desc:'Durée maximale tenue à Z4 (95-105% FTP) en un effort continu. Mesure la capacité à soutenir un effort au seuil — clé pour les courses.',        duration:'12–70 min',  difficulty:'Intense' },
    { id:'cycling-grimpeur', name:'Grimpeur',       desc:'Puissance normalisée (W/kg) sur un effort de montée 20–40 min. Indicateur clé pour les cyclistes qui font des courses avec dénivelé.',           duration:'20–40 min',  difficulty:'Maximal' },
    { id:'critical-power',   name:'Critical Power', desc:'Modèle multi-durées (3–12–20 min) pour tracer la courbe puissance-durée et calculer W\' et CP.',                                                  duration:'2 × séances', difficulty:'Maximal' },
    { id:'lactate-cycling',  name:'Lactate',        desc:'Profil lactatémique sur ergocycle. Paliers de 5 min, prise de sang au doigt. Zones ultra-précises.',                                              duration:'60–90 min',  difficulty:'Modéré'  },
    { id:'endurance-4h',         name:'Endurance 4h',   desc:'Test de 4h en zone 2 (60–65% FTP). Calibration longue de l\'endurance fondamentale et mesure de la dérive cardiaque sur ultra-endurance.',   duration:'240 min',    difficulty:'Modéré'  },
    { id:'wingate',          name:'Wingate',        desc:'Sprint anaérobie de 30 secondes à résistance maximale. Mesure puissance de crête et capacité anaérobie.',                                         duration:'30 sec',     difficulty:'Maximal' },
  ],
  natation: [
    { id:'css',       name:'CSS',  desc:'Critical Swim Speed — allure au seuil lactate en natation. Calculée depuis le 400m et le 200m.',              duration:'~30 min', difficulty:'Intense' },
    { id:'vmax-swim', name:'VMax', desc:'Vitesse maximale sur 25 ou 50m. Mesure la puissance explosive en eau et le sprint nage.',                      duration:'~15 min', difficulty:'Maximal' },
    { id:'hypoxie',   name:'Hypoxie', desc:'Distance maximale parcourue en apnée complète au crawl, sans aucune respiration. Mesure la capacité respiratoire et la résistance à l\'hypoxie.', duration:'1–3 min', difficulty:'Intense' },
  ],
  aviron: [
    { id:'2000m-row',  name:'2000m',           desc:'Test référence Concept2. Effort anaérobie lactique de ~7 min. Comparaison mondiale via le classement Concept2.',                                    duration:'~7 min',  difficulty:'Maximal' },
    { id:'10000m-row', name:'Endurance 10000m',desc:'Capacité aérobie et gestion de l\'allure sur longue durée. Mesure de la dérive technique et cardiaque.',                                            duration:'~40 min', difficulty:'Modéré'  },
    { id:'30min-row',  name:'30 minutes',      desc:'Distance maximale parcourue en 30 minutes. Estimateur direct du FTP aviron (split /500m de référence).',                                            duration:'30 min',  difficulty:'Intense' },
    { id:'power-row',  name:'Power',           desc:'Test de puissance explosive sur ergomètre. Sprint de 10 secondes à résistance maximale.',                                                           duration:'10 sec',  difficulty:'Maximal' },
    { id:'vo2max-row', name:'VO2max',          desc:'Test rampe sur ergomètre. Résistance croissante toutes les 60 secondes jusqu\'à épuisement. Détermine la PMA aviron.',                              duration:'15–20 min',difficulty:'Maximal' },
  ],
  hyrox: [
    { id:'run-compromised',          name:'Run Compromised',          desc:'Temps cumulé des 8 × 1 km de running en course Hyrox. Indicateur clé d\'endurance spécifique sous fatigue après stations.',                                  duration:'analyse auto', difficulty:'Intense' },
    { id:'hyrox-force',              name:'Force',                    desc:'Score de force globale : Deadlift 1RM, Squat 1RM, Bench Press 1RM et max reps PDC. Directement corrélé aux stations sled, sandbag et wall ball.',              duration:'2–3 séances',  difficulty:'Maximal' },
    { id:'hyrox-endurance-wod',      name:'Endurance Fonctionnelle',  desc:'5 rounds de 20 tractions / 40 pompes / 60 squats. Mesure la capacité à enchaîner des mouvements fonctionnels sous fatigue — représentatif 2e moitié Hyrox.',   duration:'20–50 min',    difficulty:'Maximal' },
    { id:'hyrox-explosivite',        name:'Explosivité',              desc:'Saut avant (1 saut), triple saut (3 enchaînés) et sprint 20 m. Mesure la puissance explosive des membres inférieurs — clé pour les Burpee Broad Jumps.',        duration:'20 min',       difficulty:'Maximal' },
    { id:'pft',            name:'PFT',             desc:'Performance Fitness Test — circuit Hyrox complet chronométré. Référence globale pour évaluer ton niveau.',                                      duration:'50–90 min', difficulty:'Maximal' },
    { id:'station',        name:'Station isolée',  desc:'Test chronométré sur une station Hyrox spécifique au choix. Identifie tes points faibles station par station.',                                 duration:'3–8 min',   difficulty:'Intense' },
    { id:'bbj',              name:'BBJ 80m',          desc:'Burpee Broad Jump — 80m officiels Hyrox chronométrés. Mesure la puissance explosive et l\'endurance anaérobie.',                                duration:'3–5 min',   difficulty:'Intense' },
    { id:'bbj-200m',         name:'BBJ 200m',         desc:'Burpee Broad Jumps sur 200m. Endurance anaérobie prolongée — double la distance officielle pour identifier les limites lactiques.',              duration:'5–8 min',   difficulty:'Intense' },
    { id:'bbj-400m',         name:'BBJ 400m',         desc:'Burpee Broad Jumps sur 400m — épreuve d\'endurance extrême. Mesure la dégradation technique et la résistance lactique sur longue durée.',     duration:'10–18 min', difficulty:'Maximal' },
    { id:'farmer-carry',     name:'Farmer Carry',     desc:'Charges standardisées Hyrox (24/32 kg). Chrono sur 200m. Test de grip et gainage.',                                                             duration:'2–4 min',   difficulty:'Intense' },
    { id:'farmer-carry-max', name:'Farmer Carry Max', desc:'Distance maximale au poids officiel Hyrox sans poser les charges. Mesure l\'endurance de grip et la capacité neuromusculaire en portage.',      duration:'2–5 min',   difficulty:'Intense' },
    { id:'wall-ball',        name:'Wall Ball 100',    desc:'100 Wall Balls chronométrées. Mesure puissance-endurance des membres inférieurs et explosivité du push.',                                       duration:'5 min',     difficulty:'Intense' },
    { id:'wall-ball-max-reps',name:'Wall Ball Max',   desc:'Nombre maximal de reps Wall Ball au poids officiel Hyrox sur série continue jusqu\'à épuisement technique.',                                   duration:'5–10 min',  difficulty:'Intense' },
    { id:'wall-ball-tabata', name:'Wall Ball Tabata', desc:'10 Wall Ball + 10s pause balle au-dessus de la tête, répéter jusqu\'à épuisement. Toutes les reps comptent même en milieu de série.',           duration:'10–20 min', difficulty:'Intense' },
    { id:'sled-push',      name:'Sled Push',       desc:'Poids maximal poussé sur 25m × 4 allers-retours. Test de force-vitesse sur sled Hyrox standardisé.',                                           duration:'2–4 min',   difficulty:'Maximal' },
    { id:'sled-pull',      name:'Sled Pull',       desc:'Poids maximal tiré sur 25m × 4 allers-retours avec corde. Test de force de traction et endurance musculaire.',                                  duration:'2–4 min',   difficulty:'Maximal' },
  ],
}

// ════════════════════════════════════════════════
// PROTOCOLES — contenu détaillé par test
// ════════════════════════════════════════════════
const PROTOCOLS: Record<string, TestProtocol> = {
  // ── Running ─────────────────────────────────
  'vo2max-run': {
    objectif: "Mesurer la consommation maximale d'oxygène (VO2max) par un effort gradué jusqu'à épuisement volontaire.",
    avertissement: "Test médical — réaliser idéalement sous supervision. Contre-indiqué si douleur thoracique ou pathologie cardiaque non contrôlée.",
    conditions: ["Reposé 48h sans effort intense", "À jeun depuis 2h minimum", "Piste ou tapis de course calibré", "Capteur cardiaque thoracique recommandé"],
    echauffement: ["10 min à 50–60% FCmax", "2 × 30s d'accélération progressive", "5 min de marche récupération"],
    etapes: ["Palier 1 : allure facile (60–70% FCmax), 3 min", "Augmenter l'allure de 0,5 km/h toutes les 1–2 min", "Continuer jusqu'à épuisement volontaire ou FC plateau", "Enregistrer la vitesse et la FC à l'arrêt"],
    interpretation: ["VO2max estimé : 15 × FCmax / FCrepos (formule Uth)", "Excellent H : > 60 ml/kg/min · Bon : 50–60 · Moyen : 40–50", "Excellent F : > 55 ml/kg/min · Bon : 45–55 · Moyen : 35–45"],
    erreurs: ["Partir trop vite sur les premiers paliers", "Arrêter avant l'épuisement réel", "Mauvaise calibration du tapis ou de la piste"],
    frequence: "1–2 fois/an — test exigeant, non reproductible à court terme",
    fields: [
      { cle:'vo2max', label:'VO2max mesuré', unite:'ml/kg/min', type:'number', required:true },
      { cle:'vvma', label:'Vitesse à VO2max (vVO2max)', unite:'km/h', type:'number' },
      { cle:'fcmax', label:'FC maximale atteinte', unite:'bpm', type:'number' },
      { cle:'duree', label:'Durée totale du test', unite:'min', type:'number' },
    ],
  },
  'vma': {
    objectif: "Déterminer la Vitesse Maximale Aérobie (VMA) pour calibrer toutes les zones d'entraînement running.",
    avertissement: "Effort maximal jusqu'à épuisement volontaire. Contre-indiqué en cas de douleur musculaire aiguë, tendinopathie active ou pathologie cardiaque non contrôlée. Échauffement obligatoire.",
    conditions: ["Piste 400m plate", "Vent nul ou faible", "Reposé 48h", "Chaussures légères de compétition"],
    echauffement: ["15 min à allure très facile", "3 × 100m progressifs", "5 min marche"],
    etapes: ["Option VAMEVAL : départ à 8 km/h, +0,5 km/h toutes les 1 min (balise sonore)", "Option Brue court : paliers de 2 min, +1 km/h à chaque palier", "Option 6 min all-out : VMA ≈ distance (m) / 100", "Arrêt quand impossible de tenir l'allure 2 paliers consécutifs"],
    interpretation: ["VMA = vitesse du dernier palier tenu complet", "Elite : > 22 km/h · Bon : 18–22 · Moyen : 15–18 · Débutant : < 15", "Z1 < 60% VMA · Z2 : 60–75% · Z3 : 75–85% · Z4 : 85–95% · Z5 : 95–105%"],
    erreurs: ["Partir trop fort sur l'option 6 min", "Courir en dehors de la piste (vent, virages)", "Ne pas respecter les balises sonores VAMEVAL"],
    frequence: "2–3 fois/an (début, mi et fin de saison)",
    fields: [
      { cle:'vma', label:'VMA', unite:'km/h', type:'number', placeholder:'Ex: 17.5', required:true },
      { cle:'methode', label:'Méthode utilisée', unite:null, type:'string', placeholder:'VAMEVAL / Brue / 6min' },
      { cle:'fcmax', label:'FC max atteinte', unite:'bpm', type:'number' },
    ],
  },
  'lactate-run': {
    objectif: "Établir un profil lactatémique précis pour identifier SL1 (seuil aérobie) et SL2 (seuil anaérobie) avec mesure sanguine à chaque palier.",
    avertissement: "Protocole invasif — nécessite un lactomètre (Lactate Scout, Arkray…), des bandelettes et des lancettes. Matériel stérile obligatoire.",
    conditions: ["Repos 48h", "À jeun depuis 3h (pas de glucides rapides)", "Piste ou tapis calibré", "Lactomètre + bandelettes + lancettes + alcool + gants"],
    echauffement: ["10 min à 55% FCmax", "Mesure lactate de base (au repos)"],
    etapes: ["Palier 1 : 3 min @ 60% FCmax → mesure lactate à la fin", "Palier 2 : 3 min @ 65% FCmax → mesure", "Paliers suivants : +5% FCmax toutes les 3 min → mesure", "Continuer jusqu'à > 8 mmol/L ou épuisement", "Tracer la courbe lactate/allure — SL1 ≈ 2 mmol/L, SL2 ≈ 4 mmol/L"],
    interpretation: ["SL1 (seuil aérobie) : rupture de pente à ~2 mmol/L", "SL2 (seuil anaérobie) : ~4 mmol/L", "Zone 2 = entre SL1 et SL2 · Intervalles = au-dessus de SL2"],
    erreurs: ["Mauvaise prise de sang (doigt froid, hémolise)", "Paliers trop courts (< 3 min = pas de stabilisation)", "FC non stabilisée entre deux paliers"],
    frequence: "1 fois/an minimum — idéalement début et fin de bloc d'entraînement",
    fields: [
      { cle:'sl1_allure', label:'Allure au SL1', unite:'/km', type:'string', placeholder:'Ex: 5:30' },
      { cle:'sl1_fc', label:'FC au SL1', unite:'bpm', type:'number' },
      { cle:'sl1_lactat', label:'Lactate au SL1', unite:'mmol/L', type:'number' },
      { cle:'sl2_allure', label:'Allure au SL2', unite:'/km', type:'string', placeholder:'Ex: 4:45' },
      { cle:'sl2_fc', label:'FC au SL2', unite:'bpm', type:'number' },
      { cle:'sl2_lactat', label:'Lactate au SL2', unite:'mmol/L', type:'number' },
    ],
  },
  'cooper': {
    objectif: "Mesurer la distance maximale parcourue en 12 minutes pour estimer le VO2max selon la formule Cooper.",
    conditions: ["Piste 400m (ou GPS de précision)", "Météo clémente — sans vent fort", "Reposé 48h"],
    echauffement: ["10 min à allure très facile", "2 × 100m en accélération progressive", "5 min marche active"],
    etapes: ["Départ au signal, effort maximal soutenu pendant exactement 12 min", "Réguler l'allure : trop essoufflé à la 3e min = trop rapide", "Viser une allure légèrement inférieure à ton allure de compétition 5km", "Marquer la distance exacte à l'arrêt du chrono (en mètres)"],
    interpretation: ["VO2max ≈ (distance en m − 504,9) / 44,73", "Distance > 3200m : excellent · 2800–3200m : bon · 2400–2800m : moyen · < 2400m : à améliorer", "Répéter dans les mêmes conditions pour suivre la progression"],
    erreurs: ["Partir trop vite → marche forcée en fin de test", "Test par vent fort (fausse les mesures)", "Mesure GPS imprécise en milieu urbain ou avec virages"],
    frequence: "Toutes les 8–12 semaines",
    fields: [
      { cle:'distance', label:'Distance parcourue', unite:'m', type:'number', placeholder:'Ex: 2950', required:true },
      { cle:'vo2max_estime', label:'VO2max estimé', unite:'ml/kg/min', type:'number', helper:'(distance − 504,9) / 44,73' },
      { cle:'fcmax', label:'FC fin de test', unite:'bpm', type:'number' },
    ],
  },
  'tmi': {
    objectif: "Mesurer la capacité à maintenir l'allure au seuil anaérobie (SL2) pendant 30 minutes continues.",
    conditions: ["Connaître son allure SL2 ou LTHR au préalable", "Piste ou route plate", "Capteur FC thoracique", "Reposé 48h"],
    echauffement: ["15 min progressif", "3 × 2 min à l'allure seuil avec 2 min récup"],
    etapes: ["Courir exactement 30 min à l'allure SL2 (87–92% FCmax)", "Enregistrer FC, allure et RPE toutes les 5 min", "Mesurer la dérive cardiaque : ∆FC entre min 5 et min 30", "Si dérive > 5 bpm → allure surestimée, recalibrer"],
    interpretation: ["Dérive FC < 3 bpm = excellente capacité aérobie", "Dérive 3–8 bpm = zone de travail correcte", "Dérive > 10 bpm = allure trop élevée ou fatigue cumulée", "Allure tenue 30 min ≈ allure marathon cible"],
    erreurs: ["Partir trop vite et accumuler de la fatigue prématurément", "Oublier de noter la FC toutes les 5 min", "Dénivelé ou vent qui biaise l'allure réelle"],
    frequence: "Toutes les 6–8 semaines en période de construction aérobie",
    fields: [
      { cle:'allure_moy', label:'Allure moyenne', unite:'/km', type:'string', placeholder:'Ex: 4:30', required:true },
      { cle:'fc_debut', label:'FC à 5 min', unite:'bpm', type:'number' },
      { cle:'fc_fin', label:'FC à 30 min', unite:'bpm', type:'number' },
      { cle:'derive_fc', label:'Dérive cardiaque', unite:'bpm', type:'number', helper:'FC fin − FC début' },
    ],
  },
  // ── Cyclisme ────────────────────────────────
  'cp20': {
    objectif: "Mesurer la puissance maximale soutenue sur 20 min pour estimer la FTP (FTP = puissance moy × 0,95).",
    avertissement: "Effort maximal soutenu 20 min — très exigeant sur le plan cardiovasculaire. Contre-indiqué sans capteur de puissance calibré, ou si douleur au genou/hanche/lombaire. Échauffement complet obligatoire.",
    conditions: ["Capteur de puissance (wattmètre) indispensable", "Vélo en parfait état ou ergocycle calibré", "Reposé 48–72h", "Température < 25°C"],
    echauffement: ["20 min à 55–65% FTP", "3 × 1 min @ 105% FTP avec 1 min récup", "5 min récup légère avant le départ test"],
    etapes: ["20 min all-out en cherchant à maintenir la puissance la plus haute possible", "Première minute : ne pas dépasser +5% au-dessus de l'objectif", "Maintenir constant — variations > 20W dégradent la puissance moyenne", "Enregistrer la puissance moyenne exacte sur les 20 min"],
    interpretation: ["FTP estimée = puissance moyenne × 0,95", "W/kg > 5,0 : niveau World Tour · 4,0–5,0 : élite amateur · 3,5–4,0 : compétiteur · < 3,5 : loisir", "Recalculer toutes les zones Z1–Z6 avec la nouvelle FTP"],
    erreurs: ["Départ trop fort → effondrement en fin de test", "Test sur route avec arrêts (signaux, trafic)", "Warm-up insuffisant — garantit une sous-performance"],
    frequence: "Toutes les 4–8 semaines selon la période d'entraînement",
    fields: [
      { cle:'puissance_moy', label:'Puissance moyenne 20 min', unite:'W', type:'number', required:true },
      { cle:'ftp', label:'FTP estimée (×0,95)', unite:'W', type:'number', helper:'Puissance moy × 0,95' },
      { cle:'ftp_kg', label:'FTP en W/kg', unite:'W/kg', type:'number' },
      { cle:'fcmax', label:'FC max atteinte', unite:'bpm', type:'number' },
    ],
  },
  'critical-power': {
    objectif: "Modéliser la courbe puissance-durée (CP + W') à partir de 2 efforts maximaux de durées différentes.",
    conditions: ["Capteur de puissance indispensable", "2 séances séparées de 48h minimum", "Ergocycle ou home trainer calibré"],
    echauffement: ["20 min progressif + 2 × 1 min à haute intensité", "Repos 10 min avant chaque effort test"],
    etapes: ["Effort 1 : 3 min all-out — puissance max maintenable (séance A)", "Effort 2 : 12 min all-out — puissance max maintenable (séance B)", "Calcul CP = (P12 × 12 − P3 × 3) / (12 − 3)", "Calcul W' = (P3 − CP) × 3 × 60 en joules"],
    interpretation: ["CP ≈ puissance seuil critique (proche de la FTP)", "W' = réserve anaérobie — typiquement 15–25 kJ", "W' élevé = capacité à produire des efforts courts intenses répétés", "Le modèle CP prédit la performance sur toute durée d'effort"],
    erreurs: ["Efforts non maximaux (sous-estime CP et W')", "Pas assez de repos entre les 2 séances (48h minimum)", "Capteur de puissance non calibré = résultats non fiables"],
    frequence: "2 fois/an (début et milieu de saison)",
    fields: [
      { cle:'puiss_3min', label:'Puissance moy 3 min', unite:'W', type:'number', required:true },
      { cle:'puiss_12min', label:'Puissance moy 12 min', unite:'W', type:'number', required:true },
      { cle:'cp', label:'Critical Power (CP)', unite:'W', type:'number', helper:'(P12×12 − P3×3) / (12−3)' },
      { cle:'wprime', label:"W' (réserve anaérobie)", unite:'kJ', type:'number' },
    ],
  },
  'lactate-cycling': {
    objectif: "Établir le profil lactatémique sur ergocycle pour des zones d'entraînement ultra-précises en cyclisme.",
    avertissement: "Protocole invasif — mesures sanguines au doigt à chaque palier. Lactomètre et matériel stérile obligatoires.",
    conditions: ["Ergocycle calibré (Wahoo Kickr, Tacx Neo ou similaire)", "Lactomètre + bandelettes + lancettes", "Reposé 72h", "À jeun depuis 3h (pas de glucides rapides)"],
    echauffement: ["10 min @ 100W ou 50% FTP", "Mesure lactate de base au repos"],
    etapes: ["Palier 1 : 5 min @ 40% FTP → mesure lactate + FC", "Palier 2 : 5 min @ 50% FTP → mesure", "Paliers suivants : +10% FTP toutes les 5 min → mesure", "Continuer jusqu'à > 8 mmol/L ou épuisement", "Tracer la courbe lactate/puissance — SL1 ≈ 2 mmol/L, SL2 ≈ 4 mmol/L"],
    interpretation: ["SL1 (seuil aérobie) : rupture de pente à ~2 mmol/L", "SL2 (seuil anaérobie) : 4 mmol/L", "Zone 2 cible = puissance entre SL1 et SL2", "Permet de valider ou corriger la FTP estimée au CP20"],
    erreurs: ["Paliers trop courts (< 4 min = pas de stabilisation FC)", "Mauvaise prise de sang (doigt froid ou insuffisant)", "Ergocycle non calibré = puissance erronée"],
    frequence: "1 fois/an minimum — test de référence annuel",
    fields: [
      { cle:'sl1_puiss', label:'Puissance au SL1', unite:'W', type:'number' },
      { cle:'sl1_fc', label:'FC au SL1', unite:'bpm', type:'number' },
      { cle:'sl1_lactat', label:'Lactate au SL1', unite:'mmol/L', type:'number' },
      { cle:'sl2_puiss', label:'Puissance au SL2', unite:'W', type:'number' },
      { cle:'sl2_fc', label:'FC au SL2', unite:'bpm', type:'number' },
    ],
  },
  'endurance-cycling': {
    objectif: "Calibrer la zone 2 et mesurer la dérive cardiaque à puissance modérée sur 2 heures continues.",
    conditions: ["Capteur de puissance", "FTP connue au préalable", "Parcours plat ou home trainer", "Eau disponible en permanence"],
    echauffement: ["10 min léger puis directement à la puissance cible — l'intensité est modérée"],
    etapes: ["Rouler 120 min à 60–65% FTP (zone 2 basse)", "Enregistrer FC toutes les 15 min", "Mesurer la dérive cardiaque (∆FC entre min 15 et min 105)", "Ne pas dépasser la puissance cible — discipline stricte", "Noter les sensations et RPE toutes les 30 min"],
    interpretation: ["Dérive FC < 5 bpm = zone 2 bien calibrée, bonne capacité lipidique", "Dérive 5–10 bpm = limite zone 2, intensité légèrement haute", "Dérive > 10 bpm = trop intense, baisser la puissance cible", "Test idéal pour valider les adaptations après un bloc d'endurance"],
    erreurs: ["Intensité trop élevée dès le départ", "Pause ou arrêt qui casse la continuité", "Pas d'enregistrement FC continu"],
    frequence: "Toutes les 6–8 semaines",
    fields: [
      { cle:'puissance_cible', label:'Puissance cible', unite:'W', type:'number' },
      { cle:'fc_15min', label:'FC à 15 min', unite:'bpm', type:'number' },
      { cle:'fc_105min', label:'FC à 105 min', unite:'bpm', type:'number' },
      { cle:'derive_fc', label:'Dérive cardiaque', unite:'bpm', type:'number', helper:'FC 105 min − FC 15 min' },
      { cle:'rpm_moy', label:'Cadence moyenne', unite:'rpm', type:'number' },
    ],
  },
  'vo2max-cycling': {
    objectif: "Déterminer la Puissance Maximale Aérobie (PMA) par test rampe sur ergocycle à paliers progressifs.",
    conditions: ["Ergocycle calibré ou home trainer de précision", "Capteur de puissance", "Reposé 48h"],
    echauffement: ["15 min progressif à 50–65% FTP", "1 × 1 min effort vif, puis 3 min récup"],
    etapes: ["Départ à 100W ou 50% FTP estimée", "Augmenter de 20W toutes les 60 secondes", "Maintenir la cadence > 80 rpm à chaque palier", "Arrêt quand impossible de maintenir la cadence cible", "PMA = puissance du dernier palier tenu complet"],
    interpretation: ["PMA/poids > 5 W/kg : élite · 4–5 : bon · 3–4 : moyen · < 3 : débutant", "FTP ≈ 72–80% de la PMA selon profil", "Intervalles VO2max recommandés à 90–110% PMA", "VO2max ≈ PMA (W) × 10,8 / poids (kg) + 7"],
    erreurs: ["Cadence trop basse (< 80 rpm) → sous-estime la PMA", "Démarrage à une puissance trop élevée", "Home trainer non calibré = résultats non fiables"],
    frequence: "2–3 fois/an",
    fields: [
      { cle:'pma', label:'PMA (puissance max aérobie)', unite:'W', type:'number', required:true },
      { cle:'pma_kg', label:'PMA en W/kg', unite:'W/kg', type:'number' },
      { cle:'vo2max_estime', label:'VO2max estimé', unite:'ml/kg/min', type:'number', helper:'PMA × 10,8 / poids + 7' },
      { cle:'fcmax', label:'FC max atteinte', unite:'bpm', type:'number' },
    ],
  },
  'wingate': {
    objectif: "Mesurer la puissance anaérobie alactique de crête et la capacité anaérobie sur 30 secondes all-out.",
    avertissement: "Effort extrêmement violent — ne pas réaliser si douleur musculaire ou tendineuse. Échauffement obligatoire.",
    conditions: ["Ergocycle Wingate ou ergomètre à résistance fixe (Monark, Technogym)", "Résistance : 7,5% du poids corporel", "Pas de home trainer standard — résistance physique requise"],
    echauffement: ["15 min progressif", "3 × 5s sprint à ~60% de la résistance Wingate", "10 min récup facile"],
    etapes: ["Partir depuis la vitesse nulle (pas de départ lancé)", "Signal → sprint MAXIMAL pendant 30 secondes sans ralentir", "Mesure automatique : puissance de crête (Ppeak), puissance moyenne (Pmoy), Pmin", "Indice de fatigue (IF) = (Ppeak − Pmin) / Ppeak × 100"],
    interpretation: ["Ppeak H : 700–1200W · Élite : > 1200W", "Ppeak F : 450–800W · Élite : > 800W", "IF < 30% : bonne résistance à la fatigue · IF > 50% : profil explosif, faible endurance anaérobie", "Ppeak/kg > 12 W/kg = sprinter élite"],
    erreurs: ["Départ trop lent → perd la puissance de crête", "Résistance mal calculée (sous ou sur-estimée)", "Ergomètre inadapté (home trainer = résultats non fiables)"],
    frequence: "4–6 fois/an hors phase de récupération",
    fields: [
      { cle:'ppeak', label:'Puissance de crête', unite:'W', type:'number', required:true },
      { cle:'pmoy', label:'Puissance moyenne 30s', unite:'W', type:'number' },
      { cle:'pmin', label:'Puissance minimale', unite:'W', type:'number' },
      { cle:'if_fatigue', label:'Indice de fatigue', unite:'%', type:'number', helper:'(Ppeak − Pmin) / Ppeak × 100' },
      { cle:'ppeak_kg', label:'Ppeak en W/kg', unite:'W/kg', type:'number' },
    ],
  },
  // ── Natation ────────────────────────────────
  'css': {
    objectif: "Mesurer la Critical Swim Speed (CSS = vitesse au seuil lactate en natation) à partir du 400m et du 200m chrono.",
    conditions: ["Piscine 25m ou 50m (noter la longueur)", "Reposé 48h", "Chronomètre ou touchpad électronique", "Départ depuis le mur (pas de plongeon)"],
    echauffement: ["400m progressif en nages variées", "6 × 50m @ 80% avec 20s récup", "5 min repos complet avant le test"],
    etapes: ["400m all-out — noter le temps exact en secondes (T400)", "Repos actif léger 10 min", "200m all-out — noter le temps exact en secondes (T200)", "CSS = (400 − 200) / (T400 − T200) en m/s", "Allure CSS : 100 / CSS = secondes pour 100m"],
    interpretation: ["CSS < 1:20/100m : élite · 1:20–1:35 : compétiteur · 1:35–1:50 : loisir amélioré", "Zone 2 nage ≈ CSS + 10–15 s/100m", "CSS est ton allure seuil — base de tous les intervals en natation"],
    erreurs: ["Pause trop courte entre 400m et 200m", "Virage sans toucher le mur (perd des mètres)", "Piscine de longueur inconnue ou virages lents"],
    frequence: "Toutes les 6–8 semaines",
    fields: [
      { cle:'t400', label:'Temps 400m', unite:'s', type:'number', placeholder:'Ex: 360', required:true },
      { cle:'t200', label:'Temps 200m', unite:'s', type:'number', placeholder:'Ex: 160', required:true },
      { cle:'css', label:'CSS calculée', unite:'s/100m', type:'number', helper:'(400−200)/(T400−T200) × 100' },
    ],
  },
  'vmax-swim': {
    objectif: "Mesurer la vitesse maximale de nage sur 25 ou 50 mètres pour évaluer la puissance explosive en eau.",
    conditions: ["Piscine 25m ou 50m", "Départ depuis le mur (ou bloc si disponible)", "Récupération complète entre les efforts (5–8 min)"],
    echauffement: ["600m progressif en nages variées", "4 × 25m de plus en plus vite avec 1 min récup chacun"],
    etapes: ["3 × 25m all-out avec 5 min récup entre chaque", "Ou 2 × 50m all-out avec 8 min récup", "Conserver le meilleur temps de la série", "Calculer la vitesse : Vmax = distance / temps (m/s)"],
    interpretation: ["25m H < 12s : sprinter élite · 12–14s : bon · > 16s : à travailler", "25m F < 13,5s : élite · 13,5–15,5s : bon · > 17s : à travailler", "Écart 50m vs 25m × 2 > 4s = forte fatigue explosive → travail anaérobie recommandé"],
    erreurs: ["Pas assez de récupération entre les sprints", "Virage compté dans la distance sur 50m en bassin 25m", "Nage parasitée par d'autres nageurs dans le couloir"],
    frequence: "1 fois/mois en période compétitive",
    fields: [
      { cle:'t25m', label:'Meilleur temps 25m', unite:'s', type:'number', placeholder:'Ex: 14.2' },
      { cle:'t50m', label:'Meilleur temps 50m', unite:'s', type:'number', placeholder:'Ex: 30.5' },
      { cle:'nage', label:'Nage utilisée', unite:null, type:'string', placeholder:'Crawl / Brasse / Dos / Papillon' },
    ],
  },
  // ── Aviron ──────────────────────────────────
  '2000m-row': {
    objectif: "Test référence mondial Concept2 sur 2000m — mesure la capacité anaérobie lactique et la puissance aérobie en aviron.",
    conditions: ["Ergomètre Concept2 Model D/E ou Dynamic", "Damper réglé à 4–5", "Reposé 72h", "Salle < 20°C de préférence"],
    echauffement: ["10 min léger @ split cible +30s/500m", "4 × 20s puissance élevée avec 40s repos", "5 min récup facile"],
    etapes: ["Départ explosif — puissance max sur les 5 premières secondes", "Réguler rapidement sur les 500m suivants (ne pas s'effondrer)", "Maintenir un split constant sur les 500–1500m intermédiaires", "Dernier 500m : tout donner progressivement"],
    interpretation: ["Niveau Recreational : H > 7:00 · F > 8:00", "Niveau Competitive : H 6:30–7:00 · F 7:30–8:00", "Niveau Performance : H < 6:30 · F < 7:30", "Split moyen → puissance : P = 2,80 / (split/500)³"],
    erreurs: ["Départ trop violent → effondrement à 1000m", "Damper trop élevé (> 6) → s'épuise plus vite", "Pas de stratégie de split préparée"],
    frequence: "2–3 fois/an — jamais deux fois en moins de 6 semaines",
    fields: [
      { cle:'temps_total', label:'Temps total', unite:null, type:'string', placeholder:'Ex: 6:52.3', required:true },
      { cle:'split_moy', label:'Split moyen /500m', unite:'/500m', type:'string', placeholder:'Ex: 1:43.0' },
      { cle:'puissance_moy', label:'Puissance moyenne', unite:'W', type:'number' },
      { cle:'spm_moy', label:'Cadence moyenne', unite:'spm', type:'number' },
      { cle:'fcmax', label:'FC maximale', unite:'bpm', type:'number' },
    ],
  },
  '10000m-row': {
    objectif: "Évaluer la capacité aérobie et la gestion de l'allure sur 10 000m — endurance fondamentale aviron.",
    conditions: ["Concept2 ou ergomètre calibré", "Eau à portée", "Reposé 48h"],
    echauffement: ["5 min @ split cible +30s/500m — l'intensité étant modérée, pas de warm-up long nécessaire"],
    etapes: ["Départ à split cible (2000m split + 15–20s/500m)", "Maintenir cadence et split de façon régulière", "Mesurer la dérive FC : noter toutes les 2000m", "Dernier 1000m : légère accélération si les réserves le permettent"],
    interpretation: ["Dérive FC < 8 bpm sur l'ensemble = bonne capacité aérobie", "Split stable (± 2s) = excellente gestion d'allure", "Écart normal split 10000m/2000m = +15–25s/500m"],
    erreurs: ["Partir trop vite surtout si réalisé après le 2000m", "Omettre de noter les FC intermédiaires", "Cadence trop élevée (> 24 spm sur longue durée = inefficient)"],
    frequence: "1 fois/mois en période de construction aérobie",
    fields: [
      { cle:'temps_total', label:'Temps total', unite:null, type:'string', placeholder:'Ex: 40:15.0', required:true },
      { cle:'split_moy', label:'Split moyen /500m', unite:'/500m', type:'string' },
      { cle:'fc_debut', label:'FC à 2000m', unite:'bpm', type:'number' },
      { cle:'fc_fin', label:'FC à 10000m', unite:'bpm', type:'number' },
    ],
  },
  '30min-row': {
    objectif: "Mesurer la distance maximale couverte en 30 minutes — estimateur direct du FTP aviron (split /500m de référence).",
    conditions: ["Concept2 en mode chrono (ne pas afficher Distance Remaining)", "Damper 4–5", "Reposé 48h"],
    echauffement: ["10 min progressif", "2 × 30s puissance élevée avec 2 min récup"],
    etapes: ["Lancer le chrono, ramer 30 min en effort soutenu constant", "Viser un split constant tout au long (± 3s/500m max)", "Dernières 5 min : accélération progressive si les réserves le permettent", "Relever la distance totale exacte à l'arrêt du chrono"],
    interpretation: ["Split moyen /500m du 30 min ≈ FTP aviron", "FTP aviron (puissance) : P = 2,80 / (split/500)³", "Comparer aux classements Concept2 en ligne dans ta catégorie"],
    erreurs: ["Départ trop fort → résultat sous-estimé sur la 2e moitié", "Regarder le temps restant trop souvent (pression mentale)", "Cadence inconstante qui fragmente l'effort"],
    frequence: "Toutes les 4–6 semaines",
    fields: [
      { cle:'distance', label:'Distance totale', unite:'m', type:'number', placeholder:'Ex: 8350', required:true },
      { cle:'split_moy', label:'Split moyen /500m', unite:'/500m', type:'string' },
      { cle:'fcmax', label:'FC maximale', unite:'bpm', type:'number' },
      { cle:'puissance_moy', label:'Puissance moyenne', unite:'W', type:'number' },
    ],
  },
  'power-row': {
    objectif: "Mesurer la puissance explosive de crête sur 10 secondes en sprint maximal sur ergomètre aviron.",
    conditions: ["Concept2 ou Rowerg en mode sprint", "Reposé 48h", "Échauffement obligatoire"],
    echauffement: ["10 min progressif", "3 × 5s accélération progressive avec 2 min récup"],
    etapes: ["3 tentatives × 10s sprint all-out avec 5 min récup entre chaque", "Départ depuis l'immobilité complète (vitesse zéro)", "Sprint maximal — puissance de crête enregistrée par le PM5", "Conserver le meilleur résultat des 3 tentatives"],
    interpretation: ["H : > 900W exceptionnel · 700–900W très bon · 500–700W bon", "F : > 650W exceptionnel · 500–650W très bon · 350–500W bon", "Puissance/poids > 10 W/kg = profil sprint de haut niveau"],
    erreurs: ["Départ trop précipité — perd le placement initial", "Récupération insuffisante entre les tentatives", "Damper trop élevé (n'améliore pas la puissance réelle mesurée)"],
    frequence: "1 fois/mois en phase de développement de puissance",
    fields: [
      { cle:'ppeak', label:'Puissance de crête', unite:'W', type:'number', required:true },
      { cle:'ppeak_kg', label:'Puissance/poids', unite:'W/kg', type:'number' },
      { cle:'spm_peak', label:'Cadence au pic', unite:'spm', type:'number' },
    ],
  },
  'vo2max-row': {
    objectif: "Déterminer la puissance maximale aérobie (PMA) en aviron par test rampe sur ergomètre à paliers progressifs.",
    conditions: ["Concept2 ou ergomètre calibré", "Damper 4–5", "Reposé 48h"],
    echauffement: ["10 min @ split cible +40s/500m", "2 × 30s puissance élevée avec 3 min récup"],
    etapes: ["Départ @ 2000m split + 30s/500m", "Baisser le split de 2s (ou augmenter de ~10W) toutes les 60 secondes", "Continuer jusqu'à incapacité à maintenir la cadence cible (> 18 spm)", "PMA = puissance du dernier palier complet tenu"],
    interpretation: ["PMA/poids > 5 W/kg : élite", "VO2max ≈ (PMA × 10,8 / poids) + 7 (estimation)", "FTP aviron ≈ 75–80% de la PMA"],
    erreurs: ["Paliers trop longs → fatigue prématurée qui sous-estime la PMA", "Cadence trop haute dès le début → inefficacité technique", "Pas d'échauffement → sous-performance garantie"],
    frequence: "2–3 fois/an",
    fields: [
      { cle:'pma', label:'PMA (puissance max)', unite:'W', type:'number', required:true },
      { cle:'split_pma', label:'Split à la PMA', unite:'/500m', type:'string' },
      { cle:'fcmax', label:'FC maximale', unite:'bpm', type:'number' },
    ],
  },
  // ── Hyrox ───────────────────────────────────
  'pft': {
    objectif: "Performance Fitness Test — circuit Hyrox complet pour évaluer le niveau global et identifier les points à améliorer station par station.",
    avertissement: "Effort total sur 50–90 min incluant 8km de course et 8 stations. Ne pas réaliser à moins de 5 jours d'une compétition officielle.",
    conditions: ["Espace > 25m linéaire pour le sled", "Matériel standardisé Hyrox (SkiErg, Sled, Sandbag, Wall Ball…)", "Partenaire pour chrono et sécurité", "Reposé 72h"],
    echauffement: ["15 min progressif en course", "1 série légère de chaque station à ~40% de l'effort"],
    etapes: ["Run 1km + SkiErg 1000m", "Run 1km + Sled Push 4×25m", "Run 1km + Sled Pull 4×25m", "Run 1km + Burpee Broad Jumps 80m", "Run 1km + Rowing 1000m", "Run 1km + Farmer Carry 200m", "Run 1km + Sandbag Lunges 100m", "Run 1km + Wall Balls 100 reps"],
    interpretation: ["< 1h : niveau élite · 1h–1h15 : compétiteur · 1h15–1h30 : performance · > 1h30 : progression", "Analyser split Run vs Stations pour identifier les maillons faibles", "Roxzone = temps total stations / temps total course × 100"],
    erreurs: ["Partir trop vite sur les runs du début", "Négliger la technique sur Sled Push (perte d'énergie)", "Mauvaise hydratation en cours d'effort"],
    frequence: "2–3 fois/an — jamais < 3 semaines avant une compétition",
    fields: [
      { cle:'temps_total', label:'Temps total', unite:null, type:'string', placeholder:'Ex: 1:08:45', required:true },
      { cle:'roxzone', label:'Roxzone (stations)', unite:null, type:'string' },
      { cle:'run_total', label:'Total runs (8km)', unite:null, type:'string' },
      { cle:'fcmax', label:'FC maximale', unite:'bpm', type:'number' },
    ],
  },
  'station': {
    objectif: "Test chronométré d'une station Hyrox isolée pour mesurer la performance spécifique et identifier les faiblesses.",
    conditions: ["Matériel standardisé pour la station choisie", "Poids officiels Hyrox selon catégorie H / F", "Reposé 48h"],
    echauffement: ["10 min cardio léger", "2–3 séries légères de la station @ 40% effort"],
    etapes: ["Choisir la station à tester (SkiErg, Sled Push, Sled Pull, BBJ, Rowing, FC, SBL, Wall Ball)", "Distances et répétitions officielles Hyrox strictement respectées", "Chrono lancé au signal, arrêté à la fin de la dernière rep / distance", "Comparer au split obtenu en compétition ou lors du PFT"],
    interpretation: ["Comparer au split de référence de ta catégorie d'âge", "Un split > +20% par rapport à tes meilleures stations = point faible prioritaire", "Calculer l'impact théorique sur le temps total PFT"],
    erreurs: ["Ne pas respecter les poids ou distances officiels", "Mauvaise technique sous fatigue (risque blessure + perte de temps)", "Absence de warm-up spécifique avant la station"],
    frequence: "1 fois/semaine par station en période de spécialisation Hyrox",
    fields: [
      { cle:'station', label:'Station testée', unite:null, type:'string', placeholder:'Ex: Wall Ball', required:true },
      { cle:'temps', label:'Temps réalisé', unite:null, type:'string', placeholder:'Ex: 3:42', required:true },
      { cle:'poids', label:'Poids utilisé', unite:'kg', type:'number' },
    ],
  },
  'bbj': {
    objectif: "20 Burpee Broad Jumps chronométrés — mesure la puissance explosive et l'endurance anaérobie des membres inférieurs.",
    conditions: ["Sol plat non glissant", "Distance officielle Hyrox : 80m (4 allers-retours de 20m)", "Poids corporel uniquement"],
    echauffement: ["10 min cardio léger", "3 BBJ lents puis 3 BBJ @ 60%"],
    etapes: ["20 BBJ consécutifs à effort maximal", "Chrono démarré au premier mouvement, arrêté au retour sur la ligne de départ", "Technique : planche — saut pieds joints — maximum en longueur — ramener les pieds", "Ne pas poser les genoux au sol pendant la planche (pénalité)"],
    interpretation: ["< 2:30 : élite · 2:30–3:00 : très bon · 3:00–3:45 : moyen · > 3:45 : à améliorer", "Rythme régulier préférable à un sprint-pause-sprint", "Comparer au split BBJ en compétition Hyrox (station 4 = 80m)"],
    erreurs: ["Sauts trop courts — économise les forces mais augmente le temps", "Genoux au sol pendant la planche (hors règle Hyrox)", "Départ trop explosif → cassure à mi-parcours"],
    frequence: "1 fois/semaine en phase de préparation Hyrox",
    fields: [
      { cle:'temps_20bbj', label:'Temps 20 BBJ', unite:null, type:'string', placeholder:'Ex: 2:48', required:true },
      { cle:'distance_moy', label:'Distance moy par saut', unite:'m', type:'number', helper:'Distance totale / 20' },
    ],
  },
  'farmer-carry': {
    objectif: "Farmer Carry sur 200m standardisé — mesure l'endurance de grip, du gainage et la vitesse de déplacement chargé.",
    conditions: ["2 kettlebells ou barres : 32 kg H / 24 kg F (poids officiels Hyrox)", "Couloir 25m minimum (4 allers-retours)", "Sol plat"],
    echauffement: ["5 min marche active", "1 × 50m @ 50% de la charge", "3 min récup"],
    etapes: ["Prendre les charges, partir au signal", "Marcher sur 200m aller-retour (4 × 25m + demi-tours)", "Pose des charges autorisée uniquement à la ligne de demi-tour", "Chrono arrêté au franchissement de la ligne d'arrivée"],
    interpretation: ["< 1:20 : élite · 1:20–1:45 : bon · 1:45–2:15 : moyen · > 2:15 : à améliorer", "Lâcher les charges entre les plots = pénalité 5s en compétition", "Si > 2 min → prioriser travail grip + gainage"],
    erreurs: ["Courber le dos sous la charge (risque lombaire)", "Lâcher les charges hors des zones autorisées", "Pas assez de récup avant le test"],
    frequence: "1 fois/semaine en phase de force-endurance",
    fields: [
      { cle:'temps_200m', label:'Temps 200m', unite:null, type:'string', placeholder:'Ex: 1:38', required:true },
      { cle:'poids', label:'Poids par main', unite:'kg', type:'number' },
      { cle:'poses', label:'Nombre de poses', unite:null, type:'number' },
    ],
  },
  'wall-ball': {
    objectif: "100 Wall Balls chronométrées — mesure la puissance-endurance des membres inférieurs et l'explosivité du push bras.",
    conditions: ["Wall Ball 9 kg H / 6 kg F (poids officiels Hyrox)", "Mur plat avec cible à 3m de hauteur", "Sol antidérapant"],
    echauffement: ["10 min cardio", "20 reps @ 50–60%", "3 min récup"],
    etapes: ["100 Wall Balls — poses de la balle autorisées (comptabilisées dans le temps)", "Fléchir en dessous du parallèle à chaque rep (genoux au niveau des hanches)", "Balle au-dessus de la cible (3m) à chaque rep valide", "Chrono arrêté à la 100e répétition valide"],
    interpretation: ["< 4:00 : élite · 4:00–5:00 : bon · 5:00–6:30 : moyen · > 6:30 : à améliorer", "Stratégie en séries courtes (15–20 reps + pause 5s) souvent plus rapide que le continu", "Douleur avant-bras → travail grip · Douleur quads → force spécifique Wall Ball"],
    erreurs: ["Squat pas assez profond (rep non valide)", "Balle en dessous de la cible (rep invalide)", "Tenir trop longtemps sans poser → effondrement technique"],
    frequence: "1 fois/semaine en période de spécialisation Hyrox",
    fields: [
      { cle:'temps_100', label:'Temps 100 reps', unite:null, type:'string', placeholder:'Ex: 4:45', required:true },
      { cle:'poids_balle', label:'Poids de la balle', unite:'kg', type:'number' },
      { cle:'nb_poses', label:'Nombre de poses', unite:null, type:'number' },
    ],
  },
  'sled-push': {
    objectif: "Sled Push 4 × 25m — mesure la force propulsive et la résistance anaérobie sur travail de sled poussé.",
    conditions: ["Sled Hyrox standard : +100 kg H / +60 kg F", "Surface synthétique ou tartan (pas sur béton brut)", "4 passages de 25m = 100m total"],
    echauffement: ["10 min cardio", "1 × 25m @ ~50% de la charge officielle"],
    etapes: ["Dos à la ligne de départ, sled en face", "Pousser le sled sur 25m, demi-tour, repousser (4 passages)", "Puissance générée par poussée basse, cadence de pas rapide", "Chrono arrêté après le 4e franchissement de ligne"],
    interpretation: ["< 1:30 : élite · 1:30–2:00 : bon · 2:00–2:45 : moyen · > 2:45 : à améliorer", "Sled Push est la station la plus énergivore → point faible à prioriser", "Force quadriceps + position basse = facteurs clés de performance"],
    erreurs: ["Position trop haute → perd de la puissance de transmission", "Pousser avec les bras seuls sans engagement des jambes", "Mauvaise inclinaison des mains (doit être dans l'axe du sled)"],
    frequence: "1 fois/semaine en phase de développement de force",
    fields: [
      { cle:'temps', label:'Temps 4×25m', unite:null, type:'string', placeholder:'Ex: 1:52', required:true },
      { cle:'charge', label:'Charge totale sled', unite:'kg', type:'number' },
    ],
  },
  'sled-pull': {
    objectif: "Sled Pull 4 × 25m à la corde — mesure la force de traction, l'endurance du dos et la résistance du grip.",
    conditions: ["Sled Hyrox : +100 kg H / +60 kg F", "Corde de 15m minimum", "Surface adaptée (synthétique)"],
    echauffement: ["10 min cardio", "1 × 25m @ ~50% de la charge"],
    etapes: ["Faire face au sled, corde tendue", "Tirer le sled vers soi main par main en reculant", "Ligne d'arrivée → demi-tour, tirer le sled dans l'autre sens (4 passages)", "Chrono arrêté au franchissement de la 4e ligne"],
    interpretation: ["< 2:00 : élite · 2:00–2:45 : bon · 2:45–3:30 : moyen · > 3:30 : à améliorer", "Endurance de grip souvent le facteur limitant", "Forte sollicitation dorsale → prévoir récupération musculaire active"],
    erreurs: ["Lâcher la corde sans contrôle (risque de chute)", "Tirer avec le dos voûté (risque lombaire)", "Demi-tour trop lent entre les passages"],
    frequence: "1 fois/semaine en phase de force-endurance",
    fields: [
      { cle:'temps', label:'Temps 4×25m', unite:null, type:'string', placeholder:'Ex: 2:20', required:true },
      { cle:'charge', label:'Charge totale sled', unite:'kg', type:'number' },
    ],
  },
  // ── Cyclisme Endurance (variantes) ─────────
  'endurance-4h': {
    objectif: "Test de 4h en zone 2 (60–65% FTP) — calibrage long de l'endurance fondamentale et mesure de la dérive cardiaque sur ultra-endurance.",
    conditions: ["Capteur de puissance", "FTP connue", "Home trainer ou route plate", "Hydratation et nutrition prévues (60g glucides/h)", "Reposé 48h"],
    echauffement: ["15 min léger puis directement à la puissance cible"],
    etapes: ["Rouler 240 min à 60–65% FTP (zone 2)", "Enregistrer FC toutes les 30 min", "Mesurer la dérive cardiaque (∆FC entre min 15 et min 210)", "Maintenir la puissance constante", "Gérer la nutrition : ~60g glucides/h recommandés"],
    interpretation: ["Dérive FC < 5 bpm sur 4h = zone 2 excellente, forte capacité aérobie de base", "Dérive 5–12 bpm = adaptations nécessaires en endurance longue durée", "Dérive > 15 bpm = intensité trop haute ou déficit nutritionnel", "Si puissance chute de > 5% après 3h → glycogène insuffisant ou intensité surestimée"],
    erreurs: ["Partir trop fort en début de séance", "Négliger la nutrition — chute de puissance à 2h–3h = déficit glucidique", "Arrêts qui cassent la continuité aérobie"],
    frequence: "1 fois / 6–8 semaines en bloc de construction aérobie longue",
    fields: [
      { cle:'fc_15min',   label:'FC à 15 min',            unite:'bpm', type:'number' as const },
      { cle:'fc_120min',  label:'FC à 2h',                unite:'bpm', type:'number' as const },
      { cle:'fc_210min',  label:'FC à 3h30',              unite:'bpm', type:'number' as const },
      { cle:'derive_fc',  label:'Dérive cardiaque totale', unite:'bpm', type:'number' as const, helper:'FC 3h30 − FC 15 min' },
      { cle:'puissance_moy', label:'Puissance moyenne',    unite:'W',   type:'number' as const },
    ],
  },
  'endurance-drift': {
    objectif: "Test en 3 blocs progressifs : 2h EF basse + 2h EF moyenne + 1h EF haute. Calibre les 3 sous-zones de l'endurance fondamentale par la réponse cardiaque.",
    conditions: ["Capteur de puissance et FC thoracique", "Home trainer ou route plate", "Hydratation disponible", "FTP connue"],
    echauffement: ["10 min léger puis directement au bloc 1"],
    etapes: ["Bloc 1 (2h) @ 55–60% FTP — enregistrer FC toutes les 30 min", "Bloc 2 (2h) @ 62–68% FTP — noter l'élévation FC entre les blocs", "Bloc 3 (1h) @ 68–75% FTP — mesurer FC finale", "Ne pas dépasser les zones cibles", "Calculer les dérives FC dans chaque bloc et entre les blocs"],
    interpretation: ["FC stable dans chaque bloc = bonne capacité aérobie dans cette zone", "Élévation FC > 10 bpm en passant au bloc suivant = seuil de fatigue identifié", "Si FC s'emballe au bloc 3 → EF haute dépasse le seuil réel"],
    erreurs: ["Transitions de blocs trop abruptes — monter en 5 min", "Oublier de noter les FC à chaque demi-heure", "Mauvaise nutrition sur test de 5h"],
    frequence: "1 fois / bloc de 8–12 semaines",
    fields: [
      { cle:'fc_bloc1_debut', label:'FC début bloc 1',     unite:'bpm', type:'number' as const },
      { cle:'fc_bloc1_fin',   label:'FC fin bloc 1 (2h)',  unite:'bpm', type:'number' as const },
      { cle:'fc_bloc2_debut', label:'FC début bloc 2',     unite:'bpm', type:'number' as const },
      { cle:'fc_bloc2_fin',   label:'FC fin bloc 2 (4h)',  unite:'bpm', type:'number' as const },
      { cle:'fc_bloc3_fin',   label:'FC fin bloc 3 (5h)',  unite:'bpm', type:'number' as const },
      { cle:'puiss_cible_1',  label:'Puissance cible bloc 1', unite:'W', type:'number' as const },
      { cle:'puiss_cible_2',  label:'Puissance cible bloc 2', unite:'W', type:'number' as const },
      { cle:'puiss_cible_3',  label:'Puissance cible bloc 3', unite:'W', type:'number' as const },
    ],
  },
  'endurance-long-ftp': {
    objectif: "Simuler un fond long (3h30–5h30) suivi de 20 min à FTP + 10 min récupération. Mesure la capacité à produire de la puissance au seuil après fatigue.",
    conditions: ["Capteur de puissance", "FTP connue et récente", "Ravitaillement pour toute la durée", "Reposé 72h — test très exigeant"],
    echauffement: ["Directement dans le bloc endurance — l'intensité est modérée par définition"],
    etapes: ["Phase 1 (3h30–5h30) : rouler à 55–65% FTP — endurance fondamentale", "Phase 2 (20 min) : sans pause, passer à 95–105% FTP — maintenir la puissance malgré la fatigue", "Phase 3 (10 min) : récupération @ 40–50% FTP — noter la FC de récupération", "Comparer la puissance FTP obtenue ici à la puissance CP20 à frais"],
    interpretation: ["Puissance FTP post-endurance > 90% CP20 = très bonne résistance à la fatigue", "80–90% = fatigue normale — continuer à construire la base", "< 80% = base aérobie insuffisante ou volume trop élevé", "FC récup doit descendre de > 30 bpm en 5 min"],
    erreurs: ["Partir trop fort en phase FTP par envie de compenser la fatigue", "Négliger la nutrition sur la phase endurance", "Ne pas noter les puissances intermédiaires"],
    frequence: "1 fois / 8 semaines — test de spécificité longue distance",
    fields: [
      { cle:'duree_endurance',      label:'Durée phase endurance',       unite:'min', type:'number' as const, required:true },
      { cle:'puiss_endurance',      label:'Puissance moyenne endurance',  unite:'W',   type:'number' as const },
      { cle:'puiss_ftp_20min',      label:'Puissance moyenne 20 min FTP', unite:'W',   type:'number' as const, required:true },
      { cle:'pct_ftp',              label:'% de la FTP atteint',          unite:'%',   type:'number' as const, helper:'(Puiss 20min / FTP) × 100' },
      { cle:'fc_fin_endurance',     label:'FC fin phase endurance',       unite:'bpm', type:'number' as const },
      { cle:'fc_5min_recup',        label:'FC après 5 min récup',         unite:'bpm', type:'number' as const },
    ],
  },
  // ── Natation Hypoxie ────────────────────────
  'hypoxie': {
    objectif: "Mesurer la distance maximale parcourue en apnée complète (sans aucune respiration) au crawl — mesure de la capacité respiratoire et de la résistance à l'hypoxie.",
    avertissement: "Protocole avec risque de syncope hypoxique. OBLIGATOIRE : partenaire de sécurité en bord de bassin + maître-nageur informé. Ne JAMAIS réaliser seul.",
    conditions: ["Piscine avec couloir dédié", "Maître-nageur ou partenaire obligatoire (sécurité)", "Reposé 48h", "Ne jamais faire ce test seul — risque vital"],
    echauffement: ["600m nage à allure très facile", "5 min de respiration ventrale profonde (ne pas hyperventiler — contre-productif et dangereux)"],
    etapes: ["Prendre une dernière grande inspiration sur le bord", "Pousser sur le mur, nager au crawl à allure modérée-soutenue", "Nager sans respirer aussi loin que possible", "Sortir de l'eau ou s'arrêter dès que l'envie de respirer devient irrésistible", "Mesurer la distance exacte parcourue en mètres"],
    interpretation: ["< 25m : niveau de base · 25–50m : intermédiaire · 50–75m : bon · > 75m : excellent", "Progression de +5m en 4 semaines = adaptation hypoxique efficace", "Utiliser pour calibrer les exercices d'apnée fractionnée (3 × 25m récup complète)"],
    erreurs: ["Hyperventiler avant le départ — interdit (risque de syncope hypoxique)", "Nager trop vite — augmente la consommation d'O₂ et réduit la distance", "Réaliser ce test sans surveillance"],
    frequence: "1 fois / 3–4 semaines",
    fields: [
      { cle:'distance', label:'Distance parcourue', unite:'m', type:'number' as const, placeholder:'Ex: 45', required:true },
      { cle:'bassin',   label:'Longueur du bassin',  unite:'m', type:'number' as const, placeholder:'25 ou 50' },
    ],
  },
  // ── Hyrox variantes ────────────────────────
  'bbj-200m': {
    objectif: "BBJ sur 200m — double la distance officielle Hyrox. Mesure l'endurance anaérobie et la résistance à la dégradation technique sur durée prolongée.",
    conditions: ["Sol plat non glissant", "200m continus (8 allers-retours de 25m ou 4 allers de 50m)", "Poids corporel uniquement"],
    echauffement: ["10 min cardio léger", "5 BBJ lents + 5 BBJ à 80%"],
    etapes: ["200m de BBJ consécutifs à effort maximal — rythme constant recommandé", "Chrono démarré au 1er mouvement, arrêté au franchissement de la ligne d'arrivée", "Technique officielle : planche — saut pieds joints — maximum longueur — ramener les pieds", "Genoux au sol = +5s de pénalité"],
    interpretation: ["< 5:30 : élite · 5:30–7:00 : bon · 7:00–8:30 : moyen · > 8:30 : à améliorer", "Ratio temps 200m / (2 × temps 80m) > 2.4 → endurance BBJ à travailler"],
    erreurs: ["Partir trop vite sur les 5 premiers mètres → effondrement à mi-parcours", "Réduction de la longueur de saut sous fatigue", "Mauvaise technique sur les 100 derniers mètres"],
    frequence: "1 fois / 2 semaines en préparation Hyrox spécifique",
    fields: [
      { cle:'temps_200m',    label:'Temps 200m BBJ',         unite:null, type:'string' as const, placeholder:'Ex: 6:15', required:true },
      { cle:'distance_moy',  label:'Distance moy par saut',  unite:'m',  type:'number' as const },
    ],
  },
  'bbj-400m': {
    objectif: "BBJ sur 400m — épreuve d'endurance extrême. Mesure la dégradation technique et la résistance lactique sur très longue durée.",
    conditions: ["Sol plat", "400m continus (piste ou couloir)", "Poids corporel uniquement", "Eau disponible — test de 10–18 min"],
    echauffement: ["10 min cardio", "10 BBJ lents + 5 BBJ rapides", "5 min marche récup"],
    etapes: ["400m de BBJ à effort modéré-soutenu — gestion d'allure obligatoire", "Stratégie recommandée : 200m @ 80% + 200m all-out, ou rythme constant", "Chrono global arrêté à la ligne d'arrivée"],
    interpretation: ["< 13 min : élite · 13–16 min : bon · > 18 min : à travailler", "Index de dégradation : (temps 400m / 2 × temps 200m) − 1 → objectif < 15%"],
    erreurs: ["Départ trop explosif — cassure à 150m garantie", "Mauvaise gestion du carrefour technique-physique", "Oublier la nutrition si > 15 min"],
    frequence: "1 fois / mois en cycle de préparation Hyrox",
    fields: [
      { cle:'temps_400m',        label:'Temps 400m BBJ',          unite:null, type:'string' as const, placeholder:'Ex: 14:30', required:true },
      { cle:'distance_moy_saut', label:'Distance moy par saut',   unite:'m',  type:'number' as const },
    ],
  },
  'farmer-carry-max': {
    objectif: "Distance maximale parcourue au poids officiel Hyrox sans poser les charges — mesure l'endurance de grip et la capacité neuromusculaire en portage.",
    conditions: ["2 kettlebells : 32 kg H / 24 kg F (poids officiels Hyrox)", "Couloir 25m minimum", "Sol plat", "Partenaire de sécurité"],
    echauffement: ["5 min marche", "100m @ 40% de la charge", "3 min récup complète"],
    etapes: ["Prendre les charges, partir au signal", "Marcher sans poser les charges le plus loin possible (allers-retours de 25m)", "Les demi-tours sont autorisés aux bornes", "Arrêt et mesure de la distance dès que les charges doivent être posées"],
    interpretation: ["< 100m : grip et endurance à prioriser · 100–200m : intermédiaire · > 300m : bon · > 500m : excellent", "Si distance < 200m → prioriser travail grip (dead hang, farmer carry progressif)"],
    erreurs: ["Courber le dos sous la charge (risque lombaire)", "Prise trop serrée dès le départ (épuise le grip prématurément)", "Essayer de courir → réduit la distance"],
    frequence: "1 fois / 2 semaines",
    fields: [
      { cle:'distance_max',       label:'Distance maximale',       unite:'m',  type:'number' as const, placeholder:'Ex: 280', required:true },
      { cle:'poids_par_main',     label:'Poids par main',          unite:'kg', type:'number' as const },
      { cle:'nb_allers_retours',  label:'Allers-retours réalisés', unite:null, type:'number' as const },
    ],
  },
  'wall-ball-max-reps': {
    objectif: "Nombre maximal de répétitions Wall Ball au poids officiel Hyrox (9kg H / 6kg F) sur série continue jusqu'à épuisement technique complet.",
    conditions: ["Wall Ball 9kg H / 6kg F", "Mur plat avec cible à 3m", "Sol antidérapant"],
    echauffement: ["10 min cardio", "20 reps @ 50%", "5 min récup"],
    etapes: ["Commencer la série, continuer sans s'arrêter tant que la technique est maintenue", "Arrêt volontaire ou arrêt technique (balle sous la cible, squat insuffisant)", "Compter toutes les répétitions valides"],
    interpretation: ["< 40 reps : à travailler · 40–80 : intermédiaire · 80–120 : bon · > 120 : élite", "Si < 100 reps → la station Wall Ball peut limiter ton PFT"],
    erreurs: ["Continuer avec mauvaise technique (ne compte pas, risque blessure)", "Pas assez de récupération avant le test", "Poids de balle incorrect"],
    frequence: "1 fois / 3 semaines",
    fields: [
      { cle:'max_reps',     label:'Nombre max de reps',   unite:'reps', type:'number' as const, required:true },
      { cle:'poids_balle',  label:'Poids de la balle',    unite:'kg',   type:'number' as const },
      { cle:'arret_raison', label:"Raison de l'arrêt",    unite:null,   type:'string' as const, placeholder:'Fatigue musculaire / technique / grip' },
    ],
  },
  'wall-ball-tabata': {
    objectif: "10 Wall Ball + 10 secondes de pause balle maintenue au-dessus de la tête, répété jusqu'à épuisement. Toutes les reps comptent même en milieu de série.",
    conditions: ["Wall Ball 9kg H / 6kg F", "Mur plat cible à 3m", "Sol antidérapant", "Chrono visible ou assistant"],
    echauffement: ["10 min cardio", "2 séries de 5 reps + 10s pause à 50%"],
    etapes: ["Faire 10 reps Wall Ball", "Tenir la balle à hauteur de poitrine ou au-dessus de la tête pendant 10s", "Reprendre immédiatement 10 nouvelles reps dès la fin des 10s", "Répéter jusqu'à épuisement complet ou arrêt technique", "Compter le total de reps valides — y compris les reps d'une série incomplète"],
    interpretation: ["10 séries (100 reps) = bon niveau · 15 séries (150 reps) = excellent", "Test qui révèle l'endurance spécifique aux pauses imposées en compétition"],
    erreurs: ["Balle posée au sol pendant la pause (doit être maintenue)", "Pause > 10s — arrêter le test, protocole non respecté", "Mauvaise technique sur les reps finales"],
    frequence: "1 fois / 2–3 semaines",
    fields: [
      { cle:'total_reps',  label:'Total reps valides',         unite:'reps', type:'number' as const, required:true },
      { cle:'nb_series',   label:'Nb de séries complètes ×10', unite:null,   type:'number' as const },
      { cle:'poids_balle', label:'Poids de la balle',          unite:'kg',   type:'number' as const },
    ],
  },
  // ── Run Compromised ─────────────────────────
  'run-compromised': {
    objectif: "Mesurer le temps cumulé des 8 × 1 km de running en course Hyrox — indicateur d'endurance spécifique sous fatigue.",
    conditions: ["Lors d'une vraie course Hyrox ou d'un test complet en salle", "Enregistrement Garmin / Supabase avec splits par km"],
    echauffement: ["Échauffement complet Hyrox standard 15 min"],
    etapes: ["Réaliser une course Hyrox complète (ou test intégral PFT)", "Relever le temps cumulé de running : somme des 8 × 1 km", "Comparer avec les courses précédentes pour suivre la progression"],
    interpretation: ["Analysé automatiquement depuis vos courses Hyrox enregistrées", "Ou saisir manuellement le temps total running en mm:ss"],
    erreurs: ["Confondre le temps total et le temps running seul", "Ne pas inclure les 8 fractions complètes"],
    frequence: "À chaque course Hyrox",
    fields: [
      { cle:'run_time_sec', label:'Temps running total (secondes)', unite:'s', type:'number' as const, placeholder:'Ex: 2520 (= 42:00)', required: true },
    ],
  },
  // ── Hyrox Force ─────────────────────────────
  'hyrox-force': {
    objectif: "Évaluer la force globale via 3 mouvements fondamentaux corrélés aux stations Hyrox (sled, sandbag, wall ball).",
    avertissement: "Efforts maximaux avec charges lourdes (1RM). Spotter obligatoire sur Squat et Bench Press. Contre-indiqué en cas de douleur lombaire, articulaire ou de fatigue musculaire aiguë. Échauffement spécifique par mouvement obligatoire.",
    conditions: ["Reposé 48h", "Échauffement spécifique à la force", "Barres olympiques + capteur de charge ou cage de squat"],
    echauffement: ["10 min cardio léger", "2–3 séries montantes par mouvement avant le 1RM"],
    etapes: ["Deadlift 1RM : charges progressives, repos 3–5 min entre essais", "Squat barre 1RM : même protocole", "Bench Press 1RM puis max reps au poids du corps (PDC)", "Calculer les ratios charge / poids du corps pour chaque exercice"],
    interpretation: ["Score Force = moyenne des 3 sous-scores (DL + SQ + Bench)", "Bench = moyenne (1RM ratio + max reps PDC)", "Un ratio DL > 2.5× est optimal pour les stations sled"],
    erreurs: ["Ne pas forcer le 1RM sans spotters", "Confondre poids barre totale et charge ajoutée"],
    frequence: "1 fois par mois en préparation, 1 fois par bloc en compétition",
    fields: [
      { cle:'dl_charge',    label:'Deadlift 1RM (kg)',         unite:'kg',   type:'number' as const, placeholder:'Ex: 150',  required: true },
      { cle:'body_weight',  label:'Poids du corps (kg)',        unite:'kg',   type:'number' as const, placeholder:'Ex: 75',   required: true },
      { cle:'sq_charge',    label:'Squat 1RM (kg)',            unite:'kg',   type:'number' as const, placeholder:'Ex: 120' },
      { cle:'bench_1rm',    label:'Bench Press 1RM (kg)',      unite:'kg',   type:'number' as const, placeholder:'Ex: 100' },
      { cle:'bench_reps',   label:'Max reps bench au PDC',     unite:'reps', type:'number' as const, placeholder:'Ex: 15' },
    ],
  },
  // ── Hyrox Endurance Fonctionnelle ────────────
  'hyrox-endurance-wod': {
    objectif: "Mesurer la capacité à enchaîner des mouvements fonctionnels sous fatigue — très représentatif de la 2ème moitié d'un Hyrox.",
    avertissement: "Effort maximal de 20 à 50 min enchaînant tractions, pompes et squats. Contre-indiqué si douleur à l'épaule, au coude ou au genou. Ne pas réaliser moins de 48h après une séance intense. Échauffement mobilité obligatoire.",
    conditions: ["Barre de traction fixe + espace sol plat", "Chronomètre visible", "Reposé 48h"],
    echauffement: ["10 min mobilité", "1 série légère à 50% de chaque mouvement"],
    etapes: ["5 rounds pour le temps : 20 tractions / 40 pompes / 60 squats", "Pas de repos imposé entre exercices ni entre rounds", "Chronométrer dès le départ de la 1ère traction jusqu'à la dernière squat"],
    interpretation: ["< 12' (H) / < 16' (F) : niveau Alien", "Résultat directement comparé aux niveaux de référence ci-dessous"],
    erreurs: ["Tractions incomplètes (menton sous la barre = invalide)", "Squats peu profonds (hanche sous genou requis)", "Pompes sans contact de la poitrine au sol"],
    frequence: "1 fois par mois",
    fields: [
      { cle:'wod_time_sec', label:'Temps total (secondes)', unite:'s', type:'number' as const, placeholder:'Ex: 1080 (= 18:00)', required: true },
    ],
  },
  // ── Hyrox Explosivité ─────────────────────────
  'hyrox-explosivite': {
    objectif: "Mesurer la puissance explosive des membres inférieurs sous 3 angles : saut horizontal unique, sauts répétés, sprint accéléré.",
    avertissement: "Efforts explosifs maximaux — risque de claquage ou entorse sur surface inadaptée. Contre-indiqué en cas de douleur aux ischio-jambiers, quadriceps ou cheville. Sol antidérapant impératif. Échauffement neuromusculaire obligatoire.",
    conditions: ["Sol plat antidérapant", "Ruban de mesure au sol", "Chronométrage électronique ou assistant pour le sprint"],
    echauffement: ["15 min cardio léger", "3 × 3 squats sautés progressifs", "Lignes hautes 2 × 20m"],
    etapes: ["3 tentatives pour chaque exercice — retenir le meilleur", "Saut avant : pieds joints, propulsion maximale vers l'avant, mesurer de la pointe des pieds jusqu'au talon d'atterrissage", "Triple saut : 3 sauts enchaînés sans repositionnement, mesurer la distance totale", "Sprint 20m : départ lancé, chrono déclenché au premier mouvement"],
    interpretation: ["Score Explosivité = moyenne des 3 sous-scores", "Le saut avant est le meilleur prédicteur de la puissance de BBJ"],
    erreurs: ["Pas de préparation balistique = résultat sous-estimé", "Mal mesurer le triple saut (compter à partir du pied de départ)", "Sprint sur surface glissante (chaussures adaptées requis)"],
    frequence: "1 fois par mois en préparation",
    fields: [
      { cle:'saut_avant_m',  label:'Saut avant (mètres)',        unite:'m',   type:'number' as const, placeholder:'Ex: 2.45', required: true },
      { cle:'triple_saut_m', label:'Triple saut (mètres total)', unite:'m',   type:'number' as const, placeholder:'Ex: 7.10' },
      { cle:'sprint20m_s',   label:'Sprint 20m (secondes)',      unite:'s',   type:'number' as const, placeholder:'Ex: 3.25' },
    ],
  },
  // ── Cycling Z4 ───────────────────────────────
  'cycling-z4': {
    objectif: "Mesurer la durée maximale tenable à 95-105% du FTP (Zone 4) en un effort continu.",
    conditions: ["Ergocycle ou home trainer avec capteur de puissance", "FTP connu et à jour", "Reposé 48h"],
    echauffement: ["20 min montée progressive", "3 × 1 min à 100% FTP avec 2 min récup"],
    etapes: ["Partir à 100% FTP et maintenir autant que possible", "Arrêter dès que la puissance chute > 5% pendant 30s consécutives", "Enregistrer la durée exacte"],
    interpretation: ["Mesuré depuis vos meilleures sorties enregistrées ou manuellement", "> 55 min : profil Élite seuil / < 20 min : endurance seuil à développer"],
    erreurs: ["Partir trop fort (dépasser 105% FTP détruit la durée)", "FTP pas à jour (fausse l'intensité cible)"],
    frequence: "1 fois par cycle de 6 semaines",
    fields: [
      { cle:'z4_duration_min', label:'Durée à Z4 (minutes)', unite:'min', type:'number' as const, placeholder:'Ex: 35', required: true },
    ],
  },
  // ── Cycling Grimpeur ─────────────────────────
  'cycling-grimpeur': {
    objectif: "Mesurer la puissance normalisée (W/kg) sur un effort de montée de 20 à 40 minutes.",
    conditions: ["Montée de 20-40 min (Col ou segment Strava/Garmin)", "Capteur de puissance", "Conditions météo favorables"],
    echauffement: ["30 min à allure endurance sur le plat", "3 × 2 min à FTP avant attaque de la montée"],
    etapes: ["Attaquer la montée cible à effort maximal soutenu (20–40 min)", "Enregistrer la puissance normalisée et le poids du corps", "Calculer le ratio W/kg"],
    interpretation: ["Calculé automatiquement depuis vos meilleures montées (filtrer segments > 4% de pente, durée 20-40 min)", "Ou saisir manuellement après analyse de votre fichier .fit"],
    erreurs: ["Vent de face (sous-estime la puissance)", "Ne pas utiliser un segment court (< 15 min) qui sur-estime la capacité longue"],
    frequence: "Début et fin de saison, ou à chaque nouveau col clé",
    fields: [
      { cle:'climb_wkg', label:'Puissance montée W/kg', unite:'W/kg', type:'number' as const, placeholder:'Ex: 3.6', required: true },
    ],
  },
  // ── Running Endurance % ──────────────────────
  'running-endurance-pct': {
    objectif: "Mesurer l'efficacité aérobie : ratio vitesse marathon / VMA × 100.",
    conditions: ["VMA connue et récente (< 3 mois)", "Meilleur temps marathon officiel ou enregistré"],
    echauffement: ["N/A — basé sur des performances existantes"],
    etapes: ["Convertir le temps marathon en vitesse (km/h)", "Diviser par la VMA × 100 pour obtenir le %", "Ex : marathon 3h30 (12 km/h) / VMA 16 km/h = 75%"],
    interpretation: ["> 80% : profil marathonien efficace", "Un bon ratio indique que votre endurance est très développée par rapport à votre vitesse maximale"],
    erreurs: ["VMA datée de plus de 6 mois (résultat peu fiable)", "Utiliser un temps marathon estimé plutôt que mesuré"],
    frequence: "À chaque nouveau marathon / nouvelle VMA",
    fields: [
      { cle:'endurance_pct', label:'% VMA marathon', unite:'%', type:'number' as const, placeholder:'Ex: 75', required: true },
      { cle:'marathon_time', label:'Temps marathon (mm:ss)', unite:'h:mm:ss', type:'string' as const, placeholder:'Ex: 3:30:00', helper:'Optionnel — pour référence' },
      { cle:'vma_used',      label:'VMA utilisée', unite:'km/h', type:'number' as const, placeholder:'Ex: 16.0' },
    ],
  },
  // ── Running 10km ─────────────────────────────
  'running-10km': {
    objectif: "Mesurer la performance sur 10 km — distance de référence pour la résistance à allure seuil.",
    avertissement: "Effort maximal sur 10 km. Ne pas réaliser en cas de douleur musculaire ou tendineuse active, de fièvre ou fatigue cumulée. Échauffement de 20 min minimum obligatoire.",
    conditions: ["Piste ou route plate (<20m dénivelé)", "GPS de précision", "Conditions météo neutres (< 20°C, vent < 15 km/h)"],
    echauffement: ["20 min à allure facile", "4 × 100m progressifs", "5 min marche"],
    etapes: ["Courir 10 km à l'effort le plus soutenu possible", "Enregistrer le temps final (mm:ss)"],
    interpretation: ["Référence mondiale : 26:24 (H, Joshua Cheptegei) / 29:01 (F, Beatrice Chebet)", "Bon niveau amateur H : < 40 min / F : < 46 min"],
    erreurs: ["Partir trop vite sur le premier km", "Parcours non validé (dénivelé ou distance imprécise)"],
    frequence: "1 fois par mois en préparation, 2-3 fois par saison",
    fields: [
      { cle:'time_10km_sec', label:'Temps 10km (secondes)', unite:'s', type:'number' as const, placeholder:'Ex: 2160 (= 36:00)', required: true },
    ],
  },
  // ── Running Économie FC ──────────────────────
  'running-economie-fc': {
    objectif: "Mesurer l'efficacité de course via l'allure tenue à FC 150 bpm.",
    conditions: ["Capteur FC thoracique", "Piste ou route plate", "Conditions thermoneutres (15-20°C)"],
    echauffement: ["15 min à allure très facile jusqu'à FC stable"],
    etapes: ["Courir à FC stable de 145-155 bpm pendant 20-30 min", "Relever l'allure moyenne (s/km) pendant la période stable", "Calculé automatiquement depuis vos sorties avec capteur FC"],
    interpretation: ["Plus l'allure est rapide à FC 150, meilleure est l'économie de course", "Amélioration typique : 10-20 s/km en 3-6 mois d'entraînement"],
    erreurs: ["FC instable (vent, chaleur, caféine)", "Capteur optique au poignet (FC moins précise)"],
    frequence: "1 fois par mois — mesure de progression à long terme",
    fields: [
      { cle:'pace_fc150_sec', label:'Allure à FC150 (s/km)', unite:'s/km', type:'number' as const, placeholder:'Ex: 270 (= 4:30/km)', required: true },
    ],
  },
  // ── Running Récupération FC ──────────────────
  'running-recup-fc': {
    objectif: "Mesurer la chute de FC dans la 1ère minute après un effort intense — indicateur de condition cardiovasculaire.",
    conditions: ["Capteur FC thoracique", "Effort maximal soutenu 3-5 min juste avant", "Arrêt complet (assis ou couché)"],
    echauffement: ["20 min montée progressive", "2 × 2 min à 95% FCmax"],
    etapes: ["Réaliser un effort à > 90% FCmax pendant 3-5 min", "S'arrêter complètement en notant la FC max atteinte", "Relever la FC exactement 60s après l'arrêt", "Calculer la chute : FC_max − FC_60s"],
    interpretation: ["Calculé automatiquement depuis vos activités avec FC enregistrées", "Une baisse > 30 bpm indique un très bon niveau de condition"],
    erreurs: ["Continuer à marcher pendant la mesure (fausse la baisse)", "Utiliser la FC sur montre sans capteur thoracique"],
    frequence: "1 fois par mois — évolue lentement",
    fields: [
      { cle:'fc_drop_bpm', label:'Chute FC en 1 minute (bpm)', unite:'bpm', type:'number' as const, placeholder:'Ex: 32', required: true },
    ],
  },
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

function TestProtocolPanel({ open: ot, onClose }: { open: OpenTest | null; onClose: () => void }) {
  const [vals, setVals]               = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [history, setHistory]         = useState<TestHistoryEntry[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingDocs, setPendingDocs] = useState<{ file: File; name: string }[]>([])
  const [gender, setGender]           = useState<'M' | 'F'>('M')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const testId = ot?.test.id ?? null

  // Load athlete gender from Supabase
  useEffect(() => {
    const load = async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb
          .from('athlete_performance_profile')
          .select('gender')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data?.gender === 'f') setGender('F')
      } catch { /* ignore */ }
    }
    void load()
  }, [])

  const loadHistory = useCallback(async (testName: string, sport: string) => {
    setHistLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
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
        .eq('user_id', user.id)
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

  // Build compound vals before saving (compute ratios for force test)
  function buildSaveVals(): Record<string, string> {
    if (!ot) return vals
    if (ot.test.id === 'hyrox-force') {
      const bw = parseFloat(vals['body_weight'] ?? '') || 0
      const out = { ...vals }
      if (bw > 0) {
        const dl = parseFloat(vals['dl_charge'] ?? '') || 0
        if (dl > 0) out['dl_ratio']         = (dl / bw).toFixed(3)
        const sq = parseFloat(vals['sq_charge'] ?? '') || 0
        if (sq > 0) out['sq_ratio']         = (sq / bw).toFixed(3)
        const b1 = parseFloat(vals['bench_1rm'] ?? '') || 0
        if (b1 > 0) out['bench_1rm_ratio']  = (b1 / bw).toFixed(3)
      }
      return out
    }
    return vals
  }

  async function handleSave() {
    if (!ot) return
    const protoNow = PROTOCOLS[ot.test.id]
    const required = protoNow?.fields.filter(f => f.required) ?? []
    if (required.some(f => !vals[f.cle]?.trim())) return

    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
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
        const path = `${user.id}/${ot.test.id}/${Date.now()}_${safeName}`
        const { data: up } = await sb.storage.from('test-documents').upload(path, doc.file, { upsert: false })
        if (up) uploadedDocs.push({ name: doc.name, path: up.path, size: doc.file.size, type: doc.file.type })
      }

      const saveVals = buildSaveVals()

      await sb.from('test_results').insert({
        user_id: user.id,
        test_definition_id: defData?.id ?? null,
        date: new Date().toISOString().slice(0, 10),
        valeurs: saveVals,
        documents: uploadedDocs,
      })

      // Also save structured score to performance_tests
      const scoreResult = computeTestScoreResult(ot.test.id, saveVals, gender)
      if (scoreResult) {
        await sb.from('performance_tests').insert({
          user_id:    user.id,
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
              { user_id: user.id, sport: map.sport, axis: map.axis, raw_value: rawVal },
              { onConflict: 'user_id,sport,axis' }
            )
          }
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

  const SH = ({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
      <span style={{ color, opacity:0.9 }}>{icon}</span>
      <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color }}>{label}</span>
    </div>
  )

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(0,0,0,0.60)', backdropFilter:'blur(4px)', animation:'cardEnter 0.2s ease both' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:'var(--bg-card)', borderRadius:'22px 22px 0 0', border:'1px solid var(--border)', borderBottom:'none', padding:'20px 22px 44px', boxShadow:'0 -10px 50px rgba(0,0,0,0.35)', animation:'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both', maxHeight:'90vh', overflowY:'auto' as const }}>

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
            Protocole en cours de rédaction…
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Objectif */}
            <div style={{ padding:'13px 16px', borderRadius:13, background:`${cfg.color}0d`, border:`1px solid ${cfg.color}30` }}>
              <SH icon={<IcoTarget/>} label="Objectif" color={cfg.color}/>
              <p style={{ fontSize:13, color:'var(--text)', margin:0, lineHeight:1.65 }}>{proto.objectif}</p>
            </div>

            {/* Avertissement */}
            {proto.avertissement && (
              <div style={{ padding:'12px 16px', borderRadius:13, background:'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.35)' }}>
                <SH icon={<IcoWarn/>} label="Attention" color="#f97316"/>
                <p style={{ fontSize:12.5, color:'var(--text-mid)', margin:0, lineHeight:1.6 }}>{proto.avertissement}</p>
              </div>
            )}

            {/* Conditions + Échauffement — grid 2 col */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <SH icon={<IcoCheck/>} label="Conditions" color="var(--text-mid)"/>
                <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  {proto.conditions.map((c,i) => (
                    <li key={i} style={{ fontSize:11.5, color:'var(--text-mid)', lineHeight:1.5 }}>{c}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                <SH icon={<IcoFlame/>} label="Échauffement" color="#f59e0b"/>
                <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  {proto.echauffement.map((e,i) => (
                    <li key={i} style={{ fontSize:11.5, color:'var(--text-mid)', lineHeight:1.5 }}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Étapes */}
            <div style={{ padding:'13px 16px', borderRadius:13, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <SH icon={<IcoList/>} label="Protocole — étapes" color="var(--text)"/>
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
              <SH icon={<IcoBook/>} label="Interprétation des résultats" color="#22c55e"/>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {proto.interpretation.map((r, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ color:'#22c55e', fontSize:12, flexShrink:0, paddingTop:1 }}>→</span>
                    <p style={{ fontSize:12.5, color:'var(--text-mid)', margin:0, lineHeight:1.55 }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Erreurs + Fréquence — grid 2 col */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.20)' }}>
                <SH icon={<IcoWarn/>} label="Erreurs courantes" color="#ef4444"/>
                <ul style={{ margin:0, padding:'0 0 0 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  {proto.erreurs.map((e,i) => (
                    <li key={i} style={{ fontSize:11.5, color:'var(--text-mid)', lineHeight:1.5 }}>{e}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.22)' }}>
                <SH icon={<IcoClock/>} label="Fréquence" color="#818cf8"/>
                <p style={{ fontSize:12, color:'var(--text-mid)', margin:0, lineHeight:1.6 }}>{proto.frequence}</p>
              </div>
            </div>

            {/* Saisie des résultats */}
            {proto.fields.length > 0 && (() => {
              const valsForScore = ot.test.id === 'hyrox-force' ? buildSaveVals() : vals
              const scoreResult = computeTestScoreResult(ot.test.id, valsForScore, gender)
              const hasBench = ot.test.id in TEST_BENCHMARKS
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ padding:'14px 16px', borderRadius:13, background:'var(--bg-card2)', border:`1px solid ${cfg.color}35` }}>
                    {/* Gender toggle in header */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <SH icon={<IcoSave/>} label="Saisir mes résultats" color={cfg.color}/>
                      {hasBench && (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:'var(--text-dim)' }}>Genre :</span>
                          <div style={{ display:'flex', background:'var(--bg)', borderRadius:7, overflow:'hidden', border:'1px solid var(--border)' }}>
                            {(['M','F'] as const).map(g => (
                              <button key={g} onClick={() => setGender(g)} style={{ padding:'3px 11px', background:gender===g?cfg.color:'transparent', border:'none', cursor:'pointer', color:gender===g?'#fff':'var(--text-dim)', fontSize:11, fontWeight:700, transition:'background 0.15s' }}>{g}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
                      {proto.fields.map(f => (
                        <div key={f.cle} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <label style={{ fontSize:11, color:'var(--text-dim)', fontWeight:600 }}>
                            {f.label}{f.unite ? <span style={{ color:'var(--text-dim)', fontWeight:400 }}> ({f.unite})</span> : null}
                            {f.required && <span style={{ color:cfg.color }}>*</span>}
                          </label>
                          <input
                            value={vals[f.cle] ?? ''}
                            onChange={e => setVal(f.cle, e.target.value)}
                            placeholder={f.placeholder ?? (f.unite ? `En ${f.unite}` : '—')}
                            style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:13, fontFamily:'DM Mono,monospace', outline:'none', width:'100%', boxSizing:'border-box' as const }}
                          />
                          {f.helper && <span style={{ fontSize:10, color:'var(--text-dim)' }}>{f.helper}</span>}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { void handleSave() }}
                      disabled={saving}
                      style={{ marginTop:12, width:'100%', padding:'10px', borderRadius:10, background:saved ? 'rgba(34,197,94,0.25)' : saving ? 'var(--bg-card2)' : `${cfg.color}22`, color:saved ? '#22c55e' : saving ? 'var(--text-dim)' : cfg.color, fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'DM Sans,sans-serif', transition:'all 0.2s', border:`1px solid ${saved ? 'rgba(34,197,94,0.5)' : saving ? 'var(--border)' : cfg.color+'40'}` }}
                    >
                      {saved ? '✓ Résultats enregistrés' : saving ? 'Enregistrement…' : 'Enregistrer ce test'}
                    </button>
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
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:cfg.color }}>Niveaux de référence</span>
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
              <SH icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label="Documents" color="var(--text-mid)"/>
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
                Ajouter un fichier (PDF, image, document…)
              </button>
              {pendingDocs.length > 0 && (
                <p style={{ fontSize:10, color:'var(--text-dim)', margin:'6px 0 0', textAlign:'center' as const }}>
                  {pendingDocs.length} fichier{pendingDocs.length > 1 ? 's' : ''} — seront uploadés à l&apos;enregistrement
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
                      Historique ({history.length})
                    </span>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2} style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {showHistory && (
                  histLoading ? (
                    <p style={{ fontSize:11, color:'var(--text-dim)', margin:'10px 0 0' }}>Chargement…</p>
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

function TestCard({ test, accentColor, onOpen }: { test: TestDef; accentColor: string; onOpen: () => void }) {
  const diffColor = DIFFICULTY_COLOR[test.difficulty]
  return (
    <div
      className="card-enter"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen() }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `${accentColor}55`
        el.style.boxShadow   = `0 0 0 1px ${accentColor}20, var(--shadow-card)`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border)'
        el.style.boxShadow   = 'var(--shadow-card)'
      }}
      style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px', boxShadow:'var(--shadow-card)', display:'flex', flexDirection:'column', gap:12, cursor:'pointer', transition:'border-color 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const, marginBottom:6 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0, color:'var(--text)', letterSpacing:'-0.01em' }}>{test.name}</h3>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:`${diffColor}20`, color:diffColor, textTransform:'uppercase' as const, letterSpacing:'0.07em', flexShrink:0 }}>{test.difficulty}</span>
        </div>
        <p style={{ fontSize:12, color:'var(--text-dim)', margin:0, lineHeight:1.6, display:'-webkit-box', WebkitBoxOrient:'vertical' as const, WebkitLineClamp:2, overflow:'hidden' }}>
          {test.desc}
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span style={{ fontSize:11, color:'var(--text-dim)', fontFamily:'DM Mono,monospace' }}>{test.duration}</span>
        </div>
        <span style={{ fontSize:11, color:accentColor, fontWeight:600, display:'flex', alignItems:'center', gap:4, opacity:0.8 }}>
          Voir le protocole
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </div>
    </div>
  )
}

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

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await sb
        .from('test_results')
        .select('id, date, valeurs, documents, test_definitions(nom, sport)')
        .eq('user_id', user.id)
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

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(0,0,0,0.60)', backdropFilter:'blur(4px)', animation:'cardEnter 0.2s ease both' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:'var(--bg-card)', borderRadius:'22px 22px 0 0', border:'1px solid var(--border)', borderBottom:'none', padding:'20px 22px 44px', boxShadow:'0 -10px 50px rgba(0,0,0,0.35)', animation:'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both', maxHeight:'90vh', overflowY:'auto' as const }}>

        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 18px' }}/>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, margin:'0 0 3px', letterSpacing:'-0.02em' }}>Historique des tests</h2>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:0 }}>Toutes disciplines · triés par date</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center' as const, padding:'40px 0', color:'var(--text-dim)', fontSize:13 }}>Chargement…</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign:'center' as const, padding:'40px 0' }}>
            <p style={{ fontSize:14, color:'var(--text-dim)', marginBottom:8 }}>Aucun test enregistré</p>
            <p style={{ fontSize:12, color:'var(--text-dim)' }}>Ouvre un protocole de test et clique sur &quot;Enregistrer ce test&quot; pour commencer.</p>
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
function TestsTab({ profile, onAnalyzeTest, initialSport, initialTestId }: {
  profile: typeof INIT_PROFILE
  onAnalyzeTest?: (test: TestDef) => Promise<void>
  initialSport?: TestSport
  initialTestId?: string
}) {
  const [testSport,      setTestSport]      = useState<TestSport>(initialSport ?? 'running')
  const [openTest,       setOpenTest]       = useState<OpenTest | null>(null)
  const [showHistorique, setShowHistorique] = useState(false)

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

        {/* Sport tabs desktop */}
        <div className="hidden md:flex" style={{ gap:8, flexWrap:'wrap' as const, flex:1 }}>
          {TEST_SPORT_TABS.map(t => (
            <button key={t.id} onClick={() => setTestSport(t.id)}
              style={{ flex:1, minWidth:110, padding:'10px 14px', borderRadius:12, border:'1px solid', cursor:'pointer', borderColor:testSport===t.id?t.color:'var(--border)', background:testSport===t.id?t.bg:'var(--bg-card)', color:testSport===t.id?t.color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:testSport===t.id?700:400, boxShadow:testSport===t.id?`0 0 0 1px ${t.color}33`:'var(--shadow-card)', transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <span style={{ opacity:testSport===t.id?1:0.6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Sport tabs mobile */}
        <div className="md:hidden" style={{ display:'flex', gap:5, flexWrap:'wrap' as const, flex:1 }}>
          {TEST_SPORT_TABS.map(t => (
            <button key={t.id} onClick={() => setTestSport(t.id)}
              style={{ flex:1, minWidth:58, padding:'7px 5px', borderRadius:10, border:'1px solid', cursor:'pointer', borderColor:testSport===t.id?t.color:'var(--border)', background:testSport===t.id?t.bg:'var(--bg-card)', color:testSport===t.id?t.color:'var(--text-mid)', fontFamily:'DM Sans,sans-serif', fontSize:11, fontWeight:testSport===t.id?700:400, transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
              <span style={{ opacity:testSport===t.id?1:0.6 }}>{t.icon}</span>{t.short}
            </button>
          ))}
        </div>

        {/* Bouton Historique */}
        <button
          onClick={() => setShowHistorique(true)}
          style={{ padding:'9px 14px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-dim)', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' as const, transition:'border-color 0.15s, color 0.15s', flexShrink:0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#5b6fff'; (e.currentTarget as HTMLButtonElement).style.color = '#5b6fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)' }}
        >
          <IcoClock/>
          Historique
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(1,1fr)', gap:12 }} className="md:grid-cols-2">
        {tests.map(test => (
          <TestCard key={test.id} test={test} accentColor={cfg.color} onOpen={() => setOpenTest({ sport:testSport, test })}/>
        ))}
      </div>

      {/* Protocol panel */}
      {openTest && <TestProtocolPanel open={openTest} onClose={() => setOpenTest(null)}/>}

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
  const [selectedDatum, setSelectedDatum] = useState<SelectedDatum | null>(null)
  const [aiOpen, setAiOpen]             = useState(false)
  const [aiPrefill, setAiPrefill]       = useState('')
  const [aiInitLabel, setAiInitLabel]   = useState<string | undefined>(undefined)
  const [aiInitMsg,   setAiInitMsg]     = useState<string | undefined>(undefined)
  const [initialTest, setInitialTest]   = useState<{ sport: TestSport; testId: string } | null>(null)

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
      setAiInitLabel('Analyse mon profil')
      setAiInitMsg(data.reply ?? data.error ?? 'Erreur lors de l\'analyse.')
      setAiOpen(true)
    } catch {
      setAiInitLabel('Analyse mon profil')
      setAiInitMsg('Erreur réseau. Vérifie ta connexion et réessaie.')
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
      setAiInitLabel(`Analyse : ${test.name}`)
      setAiInitMsg(data.reply ?? data.error ?? 'Erreur lors de l\'analyse.')
      setAiOpen(true)
    } catch {
      setAiInitLabel(`Analyse : ${test.name}`)
      setAiInitMsg('Erreur réseau. Vérifie ta connexion et réessaie.')
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
      setAiInitMsg(data.reply ?? data.error ?? 'Erreur lors de l\'analyse.')
      setAiOpen(true)
    } catch {
      setAiInitLabel(`${selectedDatum.label} : ${selectedDatum.value}`)
      setAiInitMsg('Erreur réseau. Vérifie ta connexion et réessaie.')
      setAiPrefill(buildAIMessage(selectedDatum))
      setAiOpen(true)
    }
  }

  const TABS: { id: PerfTab; label: string; short: string; color: string; bg: string }[] = [
    { id:'profil', label:'Profil', short:'Profil', color:'#00c8e0', bg:'rgba(0,200,224,0.10)'  },
    { id:'datas',  label:'Datas',  short:'Datas',  color:'#f97316', bg:'rgba(249,115,22,0.10)' },
    { id:'tests',  label:'Tests',  short:'Tests',  color:'#22c55e', bg:'rgba(34,197,94,0.10)'  },
  ]

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Performance</h1>
          <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>Profil · Zones · Records · Tests</p>
        </div>
        <AIAssistantButton agent="performance" context={{ page:'performance' }}/>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' as const }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab-btn${tab===t.id?' active':''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      {tab === 'profil' && (
        <ProfilTab
          onSelect={onSelectDatum}
          selectedDatum={selectedDatum}
          profile={profile}
          setProfile={setProfile}
          onAnalyzeProfile={handleAnalyzeProfile}
        />
      )}
      {tab === 'datas'  && <DatasTab  onSelect={onSelectDatum} selectedDatum={selectedDatum} profile={profile} onOpenAI={prompt => { setAiPrefill(prompt); setAiOpen(true) }} onNavigateToTests={() => setTab('tests')} />}
      {tab === 'tests'  && (
        <TestsTab
          profile={profile}
          onAnalyzeTest={handleAnalyzeTest}
          initialSport={initialTest?.sport}
          initialTestId={initialTest?.testId}
        />
      )}

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
    </div>
  )
}
