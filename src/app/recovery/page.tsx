'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AIAssistantButton from '@/components/ai/AIAssistantButton'

// ── Types pour l'analyse IA ───────────────────────────────────
interface AIReadinessResult {
  score: number
  readinessLevel: 'low' | 'moderate' | 'good' | 'excellent'
  fatigue: number
  recommendation: string
  trainingLoad: 'reduce' | 'maintain' | 'increase'
  todayAdvice: string
}

// ══════════════════════════════════════════════
// MOCK DATA — supprimer quand Supabase branché
// Remplacer par : const data = await supabase.from('recovery_daily_logs')...
// ══════════════════════════════════════════════
const MOCK = {
  date: new Date().toISOString().split('T')[0],
  readiness: 78,
  hrv: 65,            // ms — null si indisponible
  restingHr: 52,      // bpm
  fatigue: 4,         // 1-10
  energy: 7,          // 1-10
  stress: 3,          // 1-10
  motivation: 8,      // 1-10
  pain: 2,            // 1-10
  sleep: {
    durationMin: 452, // 7h32
    bedtime: '23:08',
    wakeTime: '06:40',
    avgDurationMin: 438, // 7h18 moyenne
    quality: 7,          // 1-10
    latencyMin: 12,      // latence endormissement
    awakenings: 1,
    efficiencyPct: 91,
    deepMin: 80,         // null si indispo
    lightMin: 264,
    remMin: 100,         // null si indispo
    nightHr: 48,         // null si indispo
    nightHrv: 58,        // null si indispo
    spo2: 96.8,          // null si indispo
    respRate: 14.2,      // null si indispo
    tempDeviation: -0.1, // null si indispo
  },
  trends: {
    days7: {
      labels:    ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
      hrv:       [58,  62,  60,  55,  61,  68,  65],
      hr:        [54,  53,  55,  56,  54,  52,  52],
      readiness: [72,  75,  70,  65,  73,  80,  78],
      fatigue:   [5,   4,   5,   7,   5,   3,   4],
      sleep:     [6.8, 7.2, 6.9, 6.4, 7.1, 7.8, 7.5],
    },
  },
}

// ── Sources de données (mock) ─────────────────
const DATA_SOURCES = [
  { id: 'strava',  name: 'Strava',  connected: true,  lastSync: 'Il y a 2h',   types: ['Activités', 'Vitesse', 'Distance'] },
  { id: 'garmin',  name: 'Garmin',  connected: false,  lastSync: null,         types: ['Activités', 'Sommeil', 'HRV', 'SpO2'] },
  { id: 'polar',   name: 'Polar',   connected: false,  lastSync: null,         types: ['Activités', 'HRV', 'Sommeil', 'FC'] },
  { id: 'whoop',   name: 'Whoop',   connected: false,  lastSync: null,         types: ['Récupération', 'Sommeil', 'HRV', 'Stress'] },
  { id: 'oura',    name: 'Oura',    connected: false,  lastSync: null,         types: ['Sommeil', 'HRV', 'Température', 'SpO2'] },
]

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

function readinessStatus(score: number): { label: string; color: string; bg: string; desc: string } {
  if (score >= 85) return { label: 'Optimal',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  desc: 'Prêt pour un effort intense. Profite de cette forme.' }
  if (score >= 70) return { label: 'Correct',  color: '#00c8e0', bg: 'rgba(0,200,224,0.12)',  desc: 'Bonne forme générale. Intensité modérée à élevée possible.' }
  if (score >= 55) return { label: 'Prudence', color: '#f97316', bg: 'rgba(249,115,22,0.12)', desc: 'Récupération incomplète. Préfère une séance légère.' }
  return              { label: 'Faible',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  desc: 'Corps fatigué. Privilégie le repos actif ou la récupération.' }
}

function metricColor(v: number, inverted = false): string {
  const score = inverted ? 11 - v : v
  if (score >= 8) return '#22c55e'
  if (score >= 5) return '#f97316'
  return '#ef4444'
}

// ══════════════════════════════════════════════
// SVG LINE CHART
// ══════════════════════════════════════════════
function LineChart({ values, color, height = 56, showDots = true }: {
  values: number[]; color: string; height?: number; showDots?: boolean
}) {
  if (!values.length) return null
  const W = 100
  const H = height
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - 4 - ((v - min) / range) * (H - 8)
    return { x, y }
  })
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M ${pts[0].x},${H} ${pts.map(p => `L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length-1].x},${H} Z`
  const gradId = `g${color.replace('#','')}`

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`}/>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={polyline} strokeLinecap="round" strokeLinejoin="round"/>
      {showDots && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} opacity={i === pts.length-1 ? 1 : 0.45}/>
      ))}
    </svg>
  )
}

// ══════════════════════════════════════════════
// READINESS RING
// ══════════════════════════════════════════════
function ReadinessRing({ score, size = 140 }: { score: number; size?: number }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const raf = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(raf) }, [])

  const status = readinessStatus(score)
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const off = c - (score / 100) * c
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={status.color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={ready ? off : c}
          style={{ filter:`drop-shadow(0 0 6px ${status.color}66)`, transition:'stroke-dashoffset 1.1s cubic-bezier(0.25,1,0.5,1)', willChange:'stroke-dashoffset' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:size > 120 ? 36 : 28, color:status.color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', marginTop:2 }}>/100</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// METRIC BAR (1-10 avec barre colorée)
// ══════════════════════════════════════════════
function MetricBar({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const raf = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(raf) }, [])

  const color = metricColor(value, inverted)
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'var(--text-mid)' }}>{label}</span>
        <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, color }}>{value}<span style={{ fontSize:9, color:'var(--text-dim)', fontWeight:400 }}>/10</span></span>
      </div>
      <div style={{ height:4, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${value * 10}%`, background:color, borderRadius:99,
          transformOrigin:'left center',
          transform: ready ? 'scaleX(1)' : 'scaleX(0)',
          transition:'transform 1.1s cubic-bezier(0.25,1,0.5,1)',
          willChange:'transform',
        }}/>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// CHECK-IN MODAL
// ══════════════════════════════════════════════
function CheckInModal({ onClose, onSave }: { onClose: () => void; onSave: (d: CheckInData) => void }) {
  const [data, setData] = useState<CheckInData>({
    fatigue: 5, energy: 5, stress: 5, motivation: 5, pain: 1, sleepQuality: 5, comment: '',
  })

  const FIELDS: { key: keyof CheckInData; label: string; sub: string; inverted?: boolean }[] = [
    { key:'fatigue',      label:'Fatigue',    sub:'Comment est ton niveau de fatigue générale ?', inverted:true },
    { key:'energy',       label:'Énergie',    sub:'Ressens-tu de l\'énergie pour t\'entraîner ?' },
    { key:'stress',       label:'Stress',     sub:'Niveau de stress mental ou émotionnel',        inverted:true },
    { key:'motivation',   label:'Motivation', sub:'Envie de t\'entraîner aujourd\'hui ?' },
    { key:'pain',         label:'Douleurs',   sub:'Douleurs ou gênes musculaires / articulaires', inverted:true },
    { key:'sleepQuality', label:'Sommeil',    sub:'Qualité perçue de ta nuit' },
  ]

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>Check-in du matin</h3>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'3px 0 0' }}>{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:14 }}>✕</button>
        </div>

        {/* Sliders */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {FIELDS.map(f => {
            const val = data[f.key] as number
            const color = metricColor(val, f.inverted)
            return (
              <div key={f.key}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{f.label}</p>
                    <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{f.sub}</p>
                  </div>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color, minWidth:28, textAlign:'right' }}>{val}</span>
                </div>
                <input type="range" min={1} max={10} value={val}
                  onChange={e => setData(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  style={{ width:'100%', accentColor:color, cursor:'pointer', height:4 }}/>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--text-dim)', marginTop:2 }}>
                  <span>1</span><span>10</span>
                </div>
              </div>
            )
          })}

          {/* Commentaire */}
          <div>
            <p style={{ fontSize:12, fontWeight:600, margin:'0 0 6px' }}>Commentaire libre</p>
            <textarea value={data.comment} onChange={e => setData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Comment tu te sens ce matin ? Des détails particuliers…"
              rows={3}
              style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', resize:'none', lineHeight:1.5 }}/>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:11, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:12, cursor:'pointer' }}>
            Annuler
          </button>
          <button onClick={() => { onSave(data); onClose() }}
            style={{ flex:2, padding:'10px', borderRadius:11, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════
interface CheckInData {
  fatigue: number; energy: number; stress: number; motivation: number
  pain: number; sleepQuality: number; comment: string
}

// ══════════════════════════════════════════════
// SECTION 1 — TODAY
// ══════════════════════════════════════════════
function SectionToday({ data, onCheckIn, onAIAnalysis, aiLoading }: {
  data: typeof MOCK
  onCheckIn: () => void
  onAIAnalysis: () => void
  aiLoading: boolean
}) {
  const status = readinessStatus(data.readiness)

  return (
    <div className="card-enter" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:16 }}>
      {/* Header bulle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap' as const, gap:8 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Today</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:'3px 0 0' }}>État du jour</h2>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onAIAnalysis} disabled={aiLoading}
            style={{ padding:'8px 14px', borderRadius:10, background:'rgba(91,111,255,0.10)', border:'1px solid rgba(91,111,255,0.35)', color:'#5b6fff', fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:12, cursor:aiLoading?'default':'pointer', whiteSpace:'nowrap' as const, opacity:aiLoading?0.6:1 }}>
            {aiLoading ? '⏳ Analyse…' : '🧠 Analyse IA'}
          </button>
          <button onClick={onCheckIn}
            style={{ padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' as const }}>
            Check-in du matin
          </button>
        </div>
      </div>

      {/* Grid principal */}
      <div id="today-grid" style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, alignItems:'start' }}>

        {/* Colonne gauche : ring + statut */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <ReadinessRing score={data.readiness}/>
          <div style={{ textAlign:'center' }}>
            <span style={{ display:'inline-block', padding:'4px 14px', borderRadius:99, background:status.bg, border:`1px solid ${status.color}44`, color:status.color, fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>
              {status.label}
            </span>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'6px 0 0', lineHeight:1.5, maxWidth:140, textAlign:'center' }}>{status.desc}</p>
          </div>
        </div>

        {/* Colonne droite : métriques */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Métriques objectives */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'FC repos', value:`${data.restingHr}`, unit:'bpm', color:'#ef4444', show: data.restingHr != null },
              { label:'HRV',      value:`${data.hrv}`,       unit:'ms',  color:'#00c8e0', show: data.hrv != null },
              { label:'Sommeil',  value:fmtDuration(data.sleep.durationMin), unit:'', color:'#a855f7', show: data.sleep.durationMin != null },
            ].filter(m => m.show).map(m => (
              <div key={m.label} style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', textAlign:'center' }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:m.color, margin:0, lineHeight:1 }}>
                  {m.value}<span style={{ fontSize:10, fontWeight:400, color:'var(--text-dim)' }}>{m.unit}</span>
                </p>
                <p style={{ fontSize:9, color:'var(--text-dim)', margin:'4px 0 0', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Métriques subjectives */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {data.fatigue    != null && <MetricBar label="Fatigue"    value={data.fatigue}    inverted/>}
            {data.energy     != null && <MetricBar label="Énergie"    value={data.energy}/>}
            {data.stress     != null && <MetricBar label="Stress"     value={data.stress}     inverted/>}
            {data.motivation != null && <MetricBar label="Motivation" value={data.motivation}/>}
            {data.pain > 0           && <MetricBar label="Douleurs"   value={data.pain}       inverted/>}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          #today-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════
// SECTION 2 — SLEEP
// ══════════════════════════════════════════════
function SectionSleep({ sleep }: { sleep: typeof MOCK.sleep }) {
  const [showDetail, setShowDetail] = useState(false)

  const totalPhases = (sleep.deepMin ?? 0) + (sleep.lightMin ?? 0) + (sleep.remMin ?? 0)
  const hasPhases   = totalPhases > 0
  const hasAdvanced = sleep.nightHr != null || sleep.spo2 != null || sleep.respRate != null

  // Couleur qualité sommeil
  const qualityColor = sleep.quality >= 8 ? '#22c55e' : sleep.quality >= 6 ? '#00c8e0' : sleep.quality >= 4 ? '#f97316' : '#ef4444'

  return (
    <div className="card-enter card-enter-1" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Sleep</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:'3px 0 0' }}>Analyse du sommeil</h2>
        </div>
        {hasAdvanced && (
          <button onClick={() => setShowDetail(!showDetail)}
            style={{ padding:'6px 14px', borderRadius:9, background:showDetail?'rgba(0,200,224,0.10)':'var(--bg-card2)', border:`1px solid ${showDetail?'#00c8e0':'var(--border)'}`, color:showDetail?'#00c8e0':'var(--text-mid)', fontSize:11, cursor:'pointer' }}>
            {showDetail ? 'Résumé' : 'Voir détail'}
          </button>
        )}
      </div>

      {/* Métriques essentielles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'Durée',     value: fmtDuration(sleep.durationMin),    color:'#a855f7' },
          { label:'Coucher',   value: sleep.bedtime,                      color:'#5b6fff' },
          { label:'Lever',     value: sleep.wakeTime,                     color:'#00c8e0' },
          { label:'Moyenne',   value: fmtDuration(sleep.avgDurationMin),  color:'#6b7280' },
          { label:'Qualité',   value: `${sleep.quality}/10`,              color: qualityColor },
        ].map(m => (
          <div key={m.label} style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', textAlign:'center' }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:m.color, margin:0, lineHeight:1 }}>{m.value}</p>
            <p style={{ fontSize:9, color:'var(--text-dim)', margin:'4px 0 0', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Barre phases sommeil */}
      {hasPhases && (
        <div style={{ marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-mid)', margin:'0 0 8px' }}>Phases de sommeil</p>
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', height:16 }}>
            <div style={{ width:`${(sleep.deepMin!/totalPhases)*100}%`, background:'#5b6fff', transition:'width 0.5s' }}/>
            <div style={{ width:`${(sleep.remMin!/totalPhases)*100}%`,  background:'#00c8e0', transition:'width 0.5s' }}/>
            <div style={{ width:`${(sleep.lightMin!/totalPhases)*100}%`,background:'rgba(168,85,247,0.35)', transition:'width 0.5s' }}/>
          </div>
          <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
            {[
              { label:'Profond', value: fmtDuration(sleep.deepMin!),  color:'#5b6fff' },
              { label:'REM',     value: fmtDuration(sleep.remMin!),   color:'#00c8e0' },
              { label:'Léger',   value: fmtDuration(sleep.lightMin!), color:'rgba(168,85,247,0.7)' },
            ].map(p => (
              <div key={p.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:p.color, flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'var(--text-mid)' }}>{p.label}</span>
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, color:'var(--text)' }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métriques intermédiaires */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8, marginBottom: showDetail && hasAdvanced ? 20 : 0 }}>
        {sleep.latencyMin != null && (
          <div style={{ padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 2px' }}>Latence</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>{sleep.latencyMin} min</p>
          </div>
        )}
        {sleep.awakenings != null && (
          <div style={{ padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 2px' }}>Réveils</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>{sleep.awakenings}x</p>
          </div>
        )}
        {sleep.efficiencyPct != null && (
          <div style={{ padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 2px' }}>Efficacité</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0, color: sleep.efficiencyPct >= 85 ? '#22c55e' : '#f97316' }}>{sleep.efficiencyPct}%</p>
          </div>
        )}
      </div>

      {/* Détail avancé */}
      {showDetail && hasAdvanced && (
        <div style={{ padding:'16px', borderRadius:14, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-dim)', margin:'0 0 12px' }}>Données avancées</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:8 }}>
            {[
              { label:'FC nocturne', value: sleep.nightHr   != null ? `${sleep.nightHr} bpm` : null,  color:'#ef4444' },
              { label:'HRV nuit',    value: sleep.nightHrv  != null ? `${sleep.nightHrv} ms`  : null,  color:'#00c8e0' },
              { label:'SpO2',        value: sleep.spo2      != null ? `${sleep.spo2}%`         : null,  color:'#22c55e' },
              { label:'Respiration', value: sleep.respRate  != null ? `${sleep.respRate} rpm`  : null,  color:'#a855f7' },
              { label:'Température', value: sleep.tempDeviation != null ? `${sleep.tempDeviation > 0 ? '+' : ''}${sleep.tempDeviation}°C` : null, color:'#f97316' },
            ].filter(m => m.value !== null).map(m => (
              <div key={m.label} style={{ textAlign:'center' }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:m.color!, margin:0 }}>{m.value}</p>
                <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// SECTION 3 — RECOVERY TRENDS
// ══════════════════════════════════════════════
function SectionTrends({ data }: { data: typeof MOCK }) {
  const [range, setRange] = useState<'7'>('7')
  const t = data.trends.days7
  const status = readinessStatus(data.readiness)

  // Alertes automatiques
  const alerts: { msg: string; color: string }[] = []
  const lastHrv = t.hrv[t.hrv.length - 1]
  const avgHrv  = t.hrv.reduce((a, b) => a + b, 0) / t.hrv.length
  if (lastHrv < avgHrv * 0.85) alerts.push({ msg:'HRV significativement sous la baseline — récupération insuffisante', color:'#ef4444' })
  const lastHr  = t.hr[t.hr.length - 1]
  const avgHr   = t.hr.reduce((a, b) => a + b, 0) / t.hr.length
  if (lastHr > avgHr * 1.05) alerts.push({ msg:'FC repos au-dessus de la moyenne — surveillance recommandée', color:'#f97316' })
  const lastSleep = t.sleep[t.sleep.length - 1]
  const avgSleep  = t.sleep.reduce((a, b) => a + b, 0) / t.sleep.length
  if (lastSleep < avgSleep * 0.90) alerts.push({ msg:'Qualité de sommeil en baisse sur les derniers jours', color:'#f97316' })

  // Recommandation
  const reco = data.readiness >= 80
    ? { text:'Conditions optimales pour un effort intense. Profite de cette fenêtre.', color:'#22c55e' }
    : data.readiness >= 65
    ? { text:'Intensité modérée recommandée. Évite les séances maximales.', color:'#00c8e0' }
    : { text:'Privilégie la récupération active ou le repos complet aujourd\'hui.', color:'#f97316' }

  const CHARTS = [
    { label:'HRV', unit:'ms', values:t.hrv, color:'#00c8e0', baseline: Math.round(avgHrv) },
    { label:'FC repos', unit:'bpm', values:t.hr, color:'#ef4444', baseline: Math.round(avgHr) },
    { label:'Readiness', unit:'', values:t.readiness, color:status.color, baseline: null },
    { label:'Fatigue', unit:'/10', values:t.fatigue, color:'#f97316', baseline: null },
    { label:'Sommeil', unit:'h', values:t.sleep, color:'#a855f7', baseline: null },
  ]

  return (
    <div className="card-enter card-enter-2" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:8 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Recovery Trends</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:'3px 0 0' }}>Tendances</h2>
        </div>
        {/* Range toggle — 14/30 jours à brancher */}
        <div style={{ display:'flex', gap:4 }}>
          {[['7','7 jours']].map(([v, l]) => (
            <button key={v} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #00c8e0', background:'rgba(0,200,224,0.10)', color:'#00c8e0', fontSize:10, fontWeight:600, cursor:'pointer' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Recommandation */}
      <div style={{ padding:'12px 16px', borderRadius:12, background:`${reco.color}14`, border:`1px solid ${reco.color}33`, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:reco.color, flexShrink:0 }}/>
          <p style={{ fontSize:12, color:reco.color, fontWeight:600, margin:0 }}>{reco.text}</p>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9, background:`${a.color}10`, border:`1px solid ${a.color}33` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:a.color, flexShrink:0 }}/>
              <p style={{ fontSize:11, color:a.color, margin:0 }}>{a.msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Graphiques */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12 }}>
        {CHARTS.map(chart => {
          const last = chart.values[chart.values.length - 1]
          const first = chart.values[0]
          const trend = last - first
          return (
            <div key={chart.label} style={{ padding:'14px', borderRadius:14, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-dim)', margin:0 }}>{chart.label}</p>
                  <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:chart.color, margin:'2px 0 0', lineHeight:1 }}>
                    {typeof last === 'number' && last % 1 !== 0 ? last.toFixed(1) : last}
                    <span style={{ fontSize:10, fontWeight:400, color:'var(--text-dim)' }}>{chart.unit}</span>
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                  <span style={{ fontSize:10, fontWeight:600, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
                    {trend >= 0 ? '+' : ''}{typeof trend === 'number' && trend % 1 !== 0 ? trend.toFixed(1) : trend}
                  </span>
                  {chart.baseline != null && (
                    <span style={{ fontSize:9, color:'var(--text-dim)' }}>moy. {chart.baseline}{chart.unit}</span>
                  )}
                </div>
              </div>
              {/* Mini labels jours */}
              <div style={{ position:'relative', height:60 }}>
                <LineChart values={chart.values} color={chart.color} height={56}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                {t.labels.map((l, i) => (
                  <span key={i} style={{ fontSize:8, color:'var(--text-dim)', textAlign:'center', flex:1 }}>{l}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// SECTION 4 — DATA SOURCES
// ══════════════════════════════════════════════
function SectionDataSources() {
  const connected = DATA_SOURCES.filter(s => s.connected)
  const available  = DATA_SOURCES.filter(s => !s.connected)

  return (
    <div className="card-enter card-enter-3" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:8 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Sources</p>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:'3px 0 0' }}>Sources de données</h2>
        </div>
        <button style={{ padding:'7px 14px', borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:11, cursor:'pointer' }}>
          Ajouter une source
        </button>
      </div>

      {connected.length === 0 && (
        <div style={{ padding:'20px', textAlign:'center', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', marginBottom:14 }}>
          <p style={{ fontSize:13, color:'var(--text-dim)', margin:0 }}>Connecte une application pour enrichir tes données de récupération</p>
        </div>
      )}

      {/* Connectées */}
      {connected.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#22c55e', margin:'0 0 8px' }}>Connectées</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {connected.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, margin:0 }}>{s.name}</p>
                  <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{s.types.join(' · ')}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:10, color:'#22c55e', fontWeight:600 }}>Connecté</span>
                  {s.lastSync && <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0' }}>Synchro {s.lastSync}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disponibles */}
      {available.length > 0 && (
        <div>
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 8px' }}>Disponibles</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {available.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', opacity:0.75 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--border)', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12, fontWeight:600, margin:0, color:'var(--text-mid)' }}>{s.name}</p>
                  <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{s.types.join(' · ')}</p>
                </div>
                <button style={{ padding:'4px 10px', borderRadius:7, background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-mid)', fontSize:10, cursor:'pointer' }}>
                  Connecter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════
export default function RecoveryPage() {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [todayData, setTodayData]     = useState(MOCK)
  const [aiLoading,  setAiLoading]    = useState(false)
  const [aiResult,   setAiResult]     = useState<AIReadinessResult | null>(null)
  const [aiError,    setAiError]      = useState<string | null>(null)

  async function handleAIAnalysis() {
    setAiLoading(true); setAiResult(null); setAiError(null)
    try {
      const res = await fetch('/api/coach-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'readiness_check',
          payload: {
            recentActivities: todayData.trends.days7.readiness.map((r, i) => ({
              sport: 'multisport',
              date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
              durationMin: 45,
              tss: Math.round(r * 0.7),
              rpe: todayData.trends.days7.fatigue[i],
            })),
            sleepQuality: todayData.sleep.quality,
            subjectiveFeeling: todayData.energy,
            hrv: todayData.hrv ?? undefined,
            restingHR: todayData.restingHr ?? undefined,
            notes: `Fatigue: ${todayData.fatigue}/10, Stress: ${todayData.stress}/10, Motivation: ${todayData.motivation}/10, Douleurs: ${todayData.pain}/10`,
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Erreur agent')
      setAiResult(data.result)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setAiLoading(false)
    }
  }

  function handleCheckIn(d: CheckInData) {
    // Mettre à jour les données locales (mock)
    // À remplacer par : await supabase.from('recovery_daily_logs').upsert({...})
    setTodayData(prev => ({
      ...prev,
      fatigue:    d.fatigue,
      energy:     d.energy,
      stress:     d.stress,
      motivation: d.motivation,
      pain:       d.pain,
      sleep: { ...prev.sleep, quality: d.sleepQuality },
    }))
    console.log('[Recovery] Check-in enregistré (mock) :', d)
    // TODO: await supabase.from('recovery_daily_logs').upsert({ user_id, date, ...d })
  }

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>

      {/* Header page */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Récupération</h1>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'5px 0 0' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <AIAssistantButton
          agent="readiness"
          context={{
            page:        'recovery',
            readiness:   todayData.readiness,
            hrv:         todayData.hrv,
            restingHr:   todayData.restingHr,
            fatigue:     todayData.fatigue,
            energy:      todayData.energy,
            stress:      todayData.stress,
            motivation:  todayData.motivation,
            pain:        todayData.pain,
            sleep:       todayData.sleep,
            trends:      todayData.trends,
          }}
        />
      </div>

      <SectionToday    data={todayData} onCheckIn={() => setShowCheckIn(true)} onAIAnalysis={handleAIAnalysis} aiLoading={aiLoading}/>

      {/* ── Résultat analyse IA ─────────────────────────── */}
      {aiError && (
        <div style={{ padding:'12px 18px', borderRadius:14, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', color:'#ef4444', fontSize:12, marginBottom:16 }}>
          {aiError}
        </div>
      )}
      {aiResult && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:24, boxShadow:'var(--shadow-card)', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap' as const, gap:12 }}>
            <div>
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.1em', color:'var(--text-dim)', margin:0 }}>Analyse IA</p>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, margin:'3px 0 0' }}>Coaching du jour</h2>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ textAlign:'center' as const }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:800, margin:0, lineHeight:1,
                  color: aiResult.score >= 80 ? '#22c55e' : aiResult.score >= 60 ? '#00c8e0' : aiResult.score >= 40 ? '#f97316' : '#ef4444' }}>
                  {aiResult.score}
                </p>
                <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0' }}>/ 100</p>
              </div>
              <div style={{ padding:'6px 14px', borderRadius:99, fontSize:12, fontWeight:700,
                background: aiResult.readinessLevel === 'excellent' ? 'rgba(34,197,94,0.12)' : aiResult.readinessLevel === 'good' ? 'rgba(0,200,224,0.12)' : aiResult.readinessLevel === 'moderate' ? 'rgba(249,115,22,0.12)' : 'rgba(239,68,68,0.12)',
                color: aiResult.readinessLevel === 'excellent' ? '#22c55e' : aiResult.readinessLevel === 'good' ? '#00c8e0' : aiResult.readinessLevel === 'moderate' ? '#f97316' : '#ef4444',
                border: '1px solid currentColor' }}>
                {{ low:'Faible', moderate:'Modéré', good:'Bonne forme', excellent:'Optimal' }[aiResult.readinessLevel]}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Charge recommandée */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12,
              background: aiResult.trainingLoad === 'reduce' ? 'rgba(239,68,68,0.07)' : aiResult.trainingLoad === 'increase' ? 'rgba(34,197,94,0.07)' : 'rgba(0,200,224,0.07)',
              border: `1px solid ${aiResult.trainingLoad === 'reduce' ? 'rgba(239,68,68,0.25)' : aiResult.trainingLoad === 'increase' ? 'rgba(34,197,94,0.25)' : 'rgba(0,200,224,0.25)'}` }}>
              <span style={{ fontSize:20 }}>{ aiResult.trainingLoad === 'reduce' ? '🔽' : aiResult.trainingLoad === 'increase' ? '🔼' : '➡️' }</span>
              <div>
                <p style={{ fontSize:11, fontWeight:700, margin:0, color: aiResult.trainingLoad === 'reduce' ? '#ef4444' : aiResult.trainingLoad === 'increase' ? '#22c55e' : '#00c8e0' }}>
                  Charge : { aiResult.trainingLoad === 'reduce' ? 'Réduire' : aiResult.trainingLoad === 'increase' ? 'Augmenter' : 'Maintenir' }
                </p>
                <p style={{ fontSize:11, color:'var(--text-mid)', margin:'2px 0 0' }}>{aiResult.recommendation}</p>
              </div>
            </div>
            {/* Conseil séance */}
            <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(91,111,255,0.07)', border:'1px solid rgba(91,111,255,0.2)' }}>
              <p style={{ fontSize:11, fontWeight:600, color:'#5b6fff', margin:'0 0 4px' }}>Séance du jour</p>
              <p style={{ fontSize:13, color:'var(--text)', margin:0, lineHeight:1.6 }}>{aiResult.todayAdvice}</p>
            </div>
            {/* Fatigue bar */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:10, color:'var(--text-dim)', fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em' }}>Fatigue estimée</span>
                <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'var(--text)' }}>{aiResult.fatigue}/100</span>
              </div>
              <div style={{ height:5, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${aiResult.fatigue}%`, borderRadius:99,
                  background: aiResult.fatigue > 70 ? '#ef4444' : aiResult.fatigue > 45 ? '#f97316' : '#22c55e' }}/>
              </div>
            </div>
          </div>
          <button onClick={() => setAiResult(null)} style={{ marginTop:16, padding:'5px 12px', borderRadius:8, background:'var(--bg-card2)', border:'1px solid var(--border)', color:'var(--text-dim)', fontSize:11, cursor:'pointer', display:'block', marginLeft:'auto' }}>✕ Fermer</button>
        </div>
      )}

      <SectionSleep    sleep={todayData.sleep}/>
      <SectionTrends   data={todayData}/>
      <SectionDataSources/>

      {showCheckIn && (
        <CheckInModal
          onClose={() => setShowCheckIn(false)}
          onSave={handleCheckIn}
        />
      )}

    </div>
  )
}
