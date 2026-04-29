'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

type InjuryType = 'douleur' | 'gene' | 'blessure'
type PainType   = 'musculaire' | 'articulaire' | 'tendineuse'
type Context    = 'entrainement' | 'repos' | 'progressif' | 'soudain'
type Status     = 'actif' | 'amelioration' | 'gueri'
type ZoomLevel  = 'far' | 'mid' | 'close'

export interface MuscleZone {
  id: string
  label: string
  group: string
  position: [number, number, number]
  scale: [number, number, number]
  minZoom: ZoomLevel
  color: string
}

export interface Injury {
  id: string
  zoneId: string
  zoneLabel: string
  type: InjuryType
  painType: PainType
  intensity: number
  context: Context
  date: string
  comment: string
  status: Status
  history: { date: string; intensity: number; note: string }[]
  aiAnalysis: string
}

export const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  actif:        { label: 'Actif',           color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  amelioration: { label: 'En amelioration', color: '#ffb340', bg: 'rgba(255,179,64,0.12)' },
  gueri:        { label: 'Gueri',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
}

export function iColor(v: number): string {
  if (v <= 3) return '#22c55e'
  if (v <= 6) return '#ffb340'
  return '#ef4444'
}

function uid(): string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function today(): string { return new Date().toISOString().split('T')[0] }

function genAI(zone: string, type: InjuryType, intensity: number, context: Context): string {
  const ctx: Record<Context, string> = {
    entrainement: 'Surcharge ou mauvaise recuperation post-effort.',
    repos:        'Inflammation chronique possible.',
    progressif:   'Surmenage progressif — overuse.',
    soudain:      'Lesion aigue probable.',
  }
  const reco = intensity >= 7
    ? "Stop entrainement sur cette zone. Kine sous 48h."
    : "Adapter l'intensite. Eviter les efforts sur cette zone."
  const alert = intensity >= 7
    ? "Douleur > 3j ou s'intensifie : consulte immediatement."
    : "Surveille 3-5 jours. Pas d'amelioration = consultation."
  return `CAUSE\n${ctx[context]}\n\nRECOMMANDATION\n${reco}\n\nALERTE\n${alert}`
}

export const MUSCLE_ZONES: MuscleZone[] = [
  { id:'head',     label:'Tete / Cou',             group:'head',       position:[0,1.72,0],        scale:[0.14,0.16,0.14], minZoom:'far',   color:'#7090b0' },
  { id:'chest',    label:'Pectoraux',               group:'chest',      position:[0,1.32,0.09],     scale:[0.22,0.12,0.08], minZoom:'far',   color:'#5080a0' },
  { id:'uback',    label:'Haut du dos',             group:'back',       position:[0,1.35,-0.09],    scale:[0.22,0.14,0.08], minZoom:'far',   color:'#4870a0' },
  { id:'lback',    label:'Lombaires',               group:'back',       position:[0,1.10,-0.08],    scale:[0.16,0.10,0.08], minZoom:'far',   color:'#3d6090' },
  { id:'sho_l',    label:'Epaule gauche',           group:'shoulders',  position:[-0.22,1.46,0],    scale:[0.10,0.10,0.10], minZoom:'far',   color:'#5888b0' },
  { id:'sho_r',    label:'Epaule droite',           group:'shoulders',  position:[0.22,1.46,0],     scale:[0.10,0.10,0.10], minZoom:'far',   color:'#5888b0' },
  { id:'core',     label:'Abdominaux',              group:'core',       position:[0,1.15,0.09],     scale:[0.18,0.14,0.08], minZoom:'far',   color:'#4878a8' },
  { id:'glu_l',    label:'Fessier gauche',          group:'glutes',     position:[-0.11,0.88,-0.10],scale:[0.12,0.12,0.10], minZoom:'far',   color:'#4070a0' },
  { id:'glu_r',    label:'Fessier droit',           group:'glutes',     position:[0.11,0.88,-0.10], scale:[0.12,0.12,0.10], minZoom:'far',   color:'#4070a0' },
  { id:'qua_l',    label:'Quadriceps gauche',       group:'quads',      position:[-0.11,0.60,0.07], scale:[0.10,0.18,0.09], minZoom:'far',   color:'#3868a0' },
  { id:'qua_r',    label:'Quadriceps droit',        group:'quads',      position:[0.11,0.60,0.07],  scale:[0.10,0.18,0.09], minZoom:'far',   color:'#3868a0' },
  { id:'ham_l',    label:'Ischio-jambier gauche',   group:'hamstrings', position:[-0.11,0.60,-0.09],scale:[0.09,0.18,0.08], minZoom:'far',   color:'#3060a0' },
  { id:'ham_r',    label:'Ischio-jambier droit',    group:'hamstrings', position:[0.11,0.60,-0.09], scale:[0.09,0.18,0.08], minZoom:'far',   color:'#3060a0' },
  { id:'cal_l',    label:'Mollet gauche',           group:'calves',     position:[-0.10,0.22,-0.07],scale:[0.08,0.14,0.08], minZoom:'far',   color:'#2858a0' },
  { id:'cal_r',    label:'Mollet droit',            group:'calves',     position:[0.10,0.22,-0.07], scale:[0.08,0.14,0.08], minZoom:'far',   color:'#2858a0' },
  { id:'kne_l',    label:'Genou gauche',            group:'knees',      position:[-0.10,0.40,0.06], scale:[0.08,0.07,0.08], minZoom:'far',   color:'#6090b8' },
  { id:'kne_r',    label:'Genou droit',             group:'knees',      position:[0.10,0.40,0.06],  scale:[0.08,0.07,0.08], minZoom:'far',   color:'#6090b8' },
  { id:'bic_l',    label:'Biceps gauche',           group:'arms',       position:[-0.24,1.24,0.02], scale:[0.07,0.12,0.07], minZoom:'far',   color:'#5080b0' },
  { id:'bic_r',    label:'Biceps droit',            group:'arms',       position:[0.24,1.24,0.02],  scale:[0.07,0.12,0.07], minZoom:'far',   color:'#5080b0' },
  { id:'tri_l',    label:'Triceps gauche',          group:'arms',       position:[-0.24,1.22,-0.04],scale:[0.07,0.12,0.06], minZoom:'far',   color:'#4878b0' },
  { id:'tri_r',    label:'Triceps droit',           group:'arms',       position:[0.24,1.22,-0.04], scale:[0.07,0.12,0.06], minZoom:'far',   color:'#4878b0' },
  { id:'trap_l',   label:'Trapeze gauche',          group:'back',       position:[-0.14,1.50,-0.06],scale:[0.08,0.10,0.07], minZoom:'mid',   color:'#3870a8' },
  { id:'trap_r',   label:'Trapeze droit',           group:'back',       position:[0.14,1.50,-0.06], scale:[0.08,0.10,0.07], minZoom:'mid',   color:'#3870a8' },
  { id:'delt_l',   label:'Deltoide gauche',         group:'shoulders',  position:[-0.22,1.46,0.05], scale:[0.06,0.07,0.06], minZoom:'mid',   color:'#6898c0' },
  { id:'delt_r',   label:'Deltoide droit',          group:'shoulders',  position:[0.22,1.46,0.05],  scale:[0.06,0.07,0.06], minZoom:'mid',   color:'#6898c0' },
  { id:'hip_l',    label:'Psoas gauche',            group:'core',       position:[-0.12,0.92,0.04], scale:[0.09,0.09,0.08], minZoom:'mid',   color:'#3868a8' },
  { id:'hip_r',    label:'Psoas droit',             group:'core',       position:[0.12,0.92,0.04],  scale:[0.09,0.09,0.08], minZoom:'mid',   color:'#3868a8' },
  { id:'tib_l',    label:'Tibia gauche',            group:'calves',     position:[-0.10,0.22,0.07], scale:[0.06,0.14,0.06], minZoom:'mid',   color:'#5080b0' },
  { id:'tib_r',    label:'Tibia droit',             group:'calves',     position:[0.10,0.22,0.07],  scale:[0.06,0.14,0.06], minZoom:'mid',   color:'#5080b0' },
  { id:'ank_l',    label:'Cheville gauche',         group:'calves',     position:[-0.09,0.07,0],    scale:[0.07,0.05,0.07], minZoom:'mid',   color:'#6090b8' },
  { id:'ank_r',    label:'Cheville droite',         group:'calves',     position:[0.09,0.07,0],     scale:[0.07,0.05,0.07], minZoom:'mid',   color:'#6090b8' },
  { id:'add_l',    label:'Adducteurs gauches',      group:'quads',      position:[-0.07,0.62,0.03], scale:[0.05,0.16,0.06], minZoom:'close', color:'#2860a8' },
  { id:'add_r',    label:'Adducteurs droits',       group:'quads',      position:[0.07,0.62,0.03],  scale:[0.05,0.16,0.06], minZoom:'close', color:'#2860a8' },
  { id:'ach_l',    label:'Tendon Achille gauche',   group:'calves',     position:[-0.09,0.12,-0.07],scale:[0.04,0.08,0.04], minZoom:'close', color:'#7098c0' },
  { id:'ach_r',    label:'Tendon Achille droit',    group:'calves',     position:[0.09,0.12,-0.07], scale:[0.04,0.08,0.04], minZoom:'close', color:'#7098c0' },
  { id:'obl_l',    label:'Oblique gauche',          group:'core',       position:[-0.09,1.12,0.08], scale:[0.06,0.10,0.05], minZoom:'close', color:'#3060a8' },
  { id:'obl_r',    label:'Oblique droit',           group:'core',       position:[0.09,1.12,0.08],  scale:[0.06,0.10,0.05], minZoom:'close', color:'#3060a8' },
  { id:'rotcuf_l', label:'Coiffe rotateurs gauche', group:'shoulders',  position:[-0.22,1.44,-0.05],scale:[0.07,0.07,0.06], minZoom:'close', color:'#5888c0' },
  { id:'rotcuf_r', label:'Coiffe rotateurs droit',  group:'shoulders',  position:[0.22,1.44,-0.05], scale:[0.07,0.07,0.06], minZoom:'close', color:'#5888c0' },
  { id:'it_l',     label:'Bandelette IT gauche',    group:'quads',      position:[-0.13,0.50,0.04], scale:[0.04,0.20,0.04], minZoom:'close', color:'#2858a8' },
  { id:'it_r',     label:'Bandelette IT droit',     group:'quads',      position:[0.13,0.50,0.04],  scale:[0.04,0.20,0.04], minZoom:'close', color:'#2858a8' },
]

const MOCK_INJURIES: Injury[] = [
  {
    id:'i1', zoneId:'kne_l', zoneLabel:'Genou gauche', type:'gene', painType:'articulaire',
    intensity:5, context:'entrainement', date:'2025-03-10', comment:'Douleur a la descente',
    status:'amelioration',
    history:[
      { date:'2025-03-10', intensity:7, note:'Debut post-run' },
      { date:'2025-03-14', intensity:6, note:'Toujours present' },
      { date:'2025-03-18', intensity:5, note:'Legere amelioration' },
      { date:'2025-03-22', intensity:4, note:'Mieux' },
    ],
    aiAnalysis: genAI('Genou gauche','gene',5,'entrainement'),
  },
  {
    id:'i2', zoneId:'lback', zoneLabel:'Lombaires', type:'douleur', painType:'musculaire',
    intensity:3, context:'progressif', date:'2025-03-05', comment:'Tension chronique',
    status:'amelioration',
    history:[
      { date:'2025-03-05', intensity:5, note:'Apres velo' },
      { date:'2025-03-12', intensity:4, note:'Stable' },
      { date:'2025-03-20', intensity:3, note:'Amelioration' },
    ],
    aiAnalysis: genAI('Lombaires','douleur',3,'progressif'),
  },
]

// Lazy load the 3D canvas only in browser
function LazyCanvas({ injuries, hovered, zoomLevel, onHover, onZoneClick, onZoomChange }: {
  injuries: Injury[]
  hovered: string | null
  zoomLevel: ZoomLevel
  onHover: (id: string | null) => void
  onZoneClick: (zone: MuscleZone) => void
  onZoomChange: (z: ZoomLevel) => void
}) {
  const [Canvas3D, setCanvas3D] = useState<React.ComponentType<{
    injuries: Injury[]
    hovered: string | null
    zoomLevel: ZoomLevel
    onHover: (id: string | null) => void
    onZoneClick: (zone: MuscleZone) => void
    onZoomChange: (z: ZoomLevel) => void
    muscleZones: MuscleZone[]
  }> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    import('./Body3DCanvas').then(mod => {
      setCanvas3D(() => mod.default)
    })
  }, [])

  if (!mounted || !Canvas3D) {
    return (
      <div style={{ width:'100%', height:'100%', minHeight:520, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' as const }}>
          <div style={{ width:40, height:40, border:'3px solid rgba(0,200,224,0.3)', borderTop:'3px solid #00c8e0', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 1s linear infinite' }}/>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, fontFamily:'DM Sans,sans-serif', margin:0 }}>Chargement 3D...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  return (
    <Canvas3D
      injuries={injuries}
      hovered={hovered}
      zoomLevel={zoomLevel}
      onHover={onHover}
      onZoneClick={onZoneClick}
      onZoomChange={onZoomChange}
      muscleZones={MUSCLE_ZONES}
    />
  )
}

function AddInjuryModal({ zone, onClose, onSave }: { zone:MuscleZone; onClose:()=>void; onSave:(i:Injury)=>void }) {
  const [type,      setType]      = useState<InjuryType>('douleur')
  const [painType,  setPainType]  = useState<PainType>('musculaire')
  const [intensity, setIntensity] = useState(5)
  const [context,   setContext]   = useState<Context>('entrainement')
  const [date,      setDate]      = useState(today())
  const [comment,   setComment]   = useState('')
  const c = iColor(intensity)

  function save() {
    onSave({ id:uid(), zoneId:zone.id, zoneLabel:zone.label, type, painType, intensity, context, date, comment, status:'actif', history:[{date,intensity,note:'Premier enregistrement'}], aiAnalysis:genAI(zone.label,type,intensity,context) })
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:460, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>Nouvelle blessure</h3>
            <p style={{ fontSize:12, color:'#00c8e0', margin:'3px 0 0', fontWeight:600 }}>{zone.label}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:9, padding:'5px 10px', cursor:'pointer', color:'var(--text-dim)', fontSize:18 }}>x</button>
        </div>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Type</p>
        <div style={{ display:'flex', gap:7, marginBottom:14 }}>
          {(['douleur','gene','blessure'] as InjuryType[]).map(t=>(
            <button key={t} onClick={()=>setType(t)} style={{ flex:1, padding:'8px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:type===t?600:400, borderColor:type===t?'#ef4444':'var(--border)', background:type===t?'rgba(239,68,68,0.12)':'var(--bg-card2)', color:type===t?'#ef4444':'var(--text-mid)' }}>{t}</button>
          ))}
        </div>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Type de douleur</p>
        <div style={{ display:'flex', gap:7, marginBottom:14 }}>
          {(['musculaire','articulaire','tendineuse'] as PainType[]).map(t=>(
            <button key={t} onClick={()=>setPainType(t)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:10, fontWeight:painType===t?600:400, borderColor:painType===t?'#f97316':'var(--border)', background:painType===t?'rgba(249,115,22,0.12)':'var(--bg-card2)', color:painType===t?'#f97316':'var(--text-mid)' }}>{t}</button>
          ))}
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>Intensite</p>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:700, color:c }}>{intensity}<span style={{ fontSize:12, fontWeight:400, color:'var(--text-dim)' }}>/10</span></span>
          </div>
          <input type="range" min={1} max={10} step={1} value={intensity} onChange={e=>setIntensity(parseInt(e.target.value))} style={{ width:'100%', accentColor:c, cursor:'pointer' }}/>
        </div>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Contexte</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:14 }}>
          {(['entrainement','repos','progressif','soudain'] as Context[]).map(ct=>(
            <button key={ct} onClick={()=>setContext(ct)} style={{ padding:'8px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:context===ct?600:400, borderColor:context===ct?'#a855f7':'var(--border)', background:context===ct?'rgba(168,85,247,0.12)':'var(--bg-card2)', color:context===ct?'#a855f7':'var(--text-mid)' }}>{ct}</button>
          ))}
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Date</p>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13, outline:'none' }}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Commentaire</p>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Description..." style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', resize:'none' as const, fontFamily:'DM Sans,sans-serif' }}/>
        </div>
        <Button variant="destructive" onClick={save} style={{ width: '100%', justifyContent: 'center' }}>Enregistrer + Analyse IA</Button>
      </div>
    </div>
  )
}

function InjuryPanel({ injury, onClose, onUpdate }: { injury:Injury; onClose:()=>void; onUpdate:(i:Injury)=>void }) {
  const [status,  setStatus]  = useState<Status>(injury.status)
  const [newNote, setNewNote] = useState('')
  const [newInt,  setNewInt]  = useState(injury.intensity)
  const c = iColor(injury.intensity)
  const cfg = STATUS_CFG[status]

  function addEntry() {
    if (!newNote.trim()) return
    onUpdate({ ...injury, status, intensity:newInt, history:[...injury.history,{date:today(),intensity:newInt,note:newNote}] })
    setNewNote('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:5 }}>
            <span style={{ padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.color, fontSize:10, fontWeight:700 }}>{cfg.label}</span>
            <span style={{ padding:'2px 8px', borderRadius:20, background:'rgba(239,68,68,0.10)', color:'#ef4444', fontSize:10, fontWeight:600 }}>{injury.type}</span>
          </div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>{injury.zoneLabel}</h3>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{injury.painType} · {injury.date}</p>
        </div>
        <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>x</button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 13px', borderRadius:11, background:`${c}12`, border:`1px solid ${c}33` }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:c, lineHeight:1 }}>{injury.intensity}</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10, color:'var(--text-dim)', margin:'0 0 4px' }}>Intensite</p>
          <div style={{ height:6, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
            <div style={{ height:'100%', width:`${injury.intensity*10}%`, background:`linear-gradient(90deg,${c}88,${c})`, borderRadius:999 }}/>
          </div>
        </div>
      </div>
      <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:11, padding:'11px 13px' }}>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 7px' }}>Evolution</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:44 }}>
          {injury.history.map((h,i)=>{ const hc=iColor(h.intensity); return (
            <div key={i} title={`${h.date}: ${h.intensity}/10`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <div style={{ width:'100%', height:`${(h.intensity/10)*44}px`, background:`linear-gradient(180deg,${hc}cc,${hc}44)`, borderRadius:'3px 3px 0 0', minHeight:2 }}/>
              <span style={{ fontSize:7, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{h.date.slice(5)}</span>
            </div>
          )})}
        </div>
      </div>
      <div style={{ padding:'11px 13px', borderRadius:11, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.18)' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#00c8e0', margin:'0 0 6px' }}>Analyse IA</p>
        <p style={{ fontSize:11, color:'var(--text-mid)', lineHeight:1.65, margin:0, whiteSpace:'pre-line' as const }}>{injury.aiAnalysis}</p>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {(['actif','amelioration','gueri'] as Status[]).map(s=>{ const sc=STATUS_CFG[s]; return (
          <button key={s} onClick={()=>setStatus(s)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:status===s?sc.color:'var(--border)', background:status===s?sc.bg:'var(--bg-card2)', color:status===s?sc.color:'var(--text-mid)', fontSize:10, fontWeight:status===s?600:400 }}>{sc.label}</button>
        )})}
      </div>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
          <span style={{ fontSize:10, color:'var(--text-dim)', flexShrink:0 }}>Intensite</span>
          <input type="range" min={0} max={10} step={1} value={newInt} onChange={e=>setNewInt(parseInt(e.target.value))} style={{ flex:1, accentColor:iColor(newInt), cursor:'pointer' }}/>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:iColor(newInt), minWidth:28 }}>{newInt}/10</span>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <input value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Note du jour..." onKeyDown={e=>e.key==='Enter'&&addEntry()} style={{ flex:1, padding:'7px 11px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Sans,sans-serif', fontSize:12, outline:'none' }}/>
          <Button variant="primary" size="sm" onClick={addEntry}>+</Button>
        </div>
      </div>
      <Button variant="primary" onClick={() => onUpdate({ ...injury, status })} style={{ width: '100%', justifyContent: 'center' }}>Sauvegarder</Button>
    </div>
  )
}

export default function BlessuresPage() {
  const [injuries,    setInjuries]    = useState<Injury[]>(MOCK_INJURIES)
  const [hovered,     setHovered]     = useState<string|null>(null)
  const [addModal,    setAddModal]    = useState<MuscleZone|null>(null)
  const [selectedInj, setSelectedInj] = useState<Injury|null>(null)
  const [zoomLevel,   setZoomLevel]   = useState<ZoomLevel>('far')

  const active    = injuries.filter(i=>i.status==='actif')
  const improving = injuries.filter(i=>i.status==='amelioration')
  const healed    = injuries.filter(i=>i.status==='gueri')

  const globalStatus = active.some(i=>i.intensity>=7)?'risque':active.length>0?'vigilance':'ok'
  const globalCfg = {
    ok:        { label:'Corps OK',    color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
    vigilance: { label:'Vigilance',   color:'#ffb340', bg:'rgba(255,179,64,0.12)' },
    risque:    { label:'Risque eleve',color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
  }[globalStatus]

  function handleZoneClick(zone: MuscleZone) {
    const existing = injuries.find(i=>i.zoneId===zone.id&&i.status!=='gueri')
    if (existing) setSelectedInj(existing)
    else setAddModal(zone)
  }

  function handleAdd(inj: Injury) { setInjuries(p=>[...p,inj]); setSelectedInj(inj) }
  function handleUpdate(u: Injury) { setInjuries(p=>p.map(i=>i.id===u.id?u:i)); setSelectedInj(u) }

  const zoomLabels: Record<ZoomLevel,string> = { far:'Vue globale', mid:'Vue detaillee', close:'Vue precise' }

  return (
    <div style={{ padding:'20px 24px', maxWidth:'100%', display:'flex', flexDirection:'column', gap:14 }}>
      {addModal&&<AddInjuryModal zone={addModal} onClose={()=>setAddModal(null)} onSave={handleAdd}/>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' as const, gap:10 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Blessures</h1>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'3px 0 0' }}>Corps 3D · Drag tourner · Scroll zoomer</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ padding:'4px 10px', borderRadius:20, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:10, fontWeight:600 }}>{zoomLabels[zoomLevel]}</span>
          <span style={{ padding:'5px 12px', borderRadius:20, background:globalCfg.bg, border:`1px solid ${globalCfg.color}55`, color:globalCfg.color, fontSize:11, fontWeight:700 }}>{globalCfg.label}</span>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { label:'Actives',      value:active.length,    color:'#ef4444' },
          { label:'Amelioration', value:improving.length, color:'#ffb340' },
          { label:'Gueries',      value:healed.length,    color:'#22c55e' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'11px 13px', boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14, minHeight:520 }} className="md:grid-cols-[1fr_320px]">
        <div style={{ background:'#040810', borderRadius:18, overflow:'hidden', position:'relative', minHeight:520, boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ position:'absolute', top:14, left:14, zIndex:10 }}>
            <div style={{ padding:'4px 10px', borderRadius:20, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(0,200,224,0.2)', fontSize:9, color:'rgba(255,255,255,0.5)' }}>
              Drag tourner · Scroll zoomer · Clic selectionner
            </div>
          </div>
          <div style={{ position:'absolute', bottom:14, left:14, zIndex:10, display:'flex', gap:5, alignItems:'center' }}>
            {(['far','mid','close'] as ZoomLevel[]).map(z=>(
              <div key={z} style={{ width:7, height:7, borderRadius:'50%', background:zoomLevel===z?'#00c8e0':'rgba(255,255,255,0.2)', transition:'background 0.3s' }}/>
            ))}
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginLeft:4 }}>
              {zoomLevel==='far'?'Gros muscles':zoomLevel==='mid'?'Muscles specifiques':'Muscles profonds'}
            </span>
          </div>
          <LazyCanvas
            injuries={injuries}
            hovered={hovered}
            zoomLevel={zoomLevel}
            onHover={setHovered}
            onZoneClick={handleZoneClick}
            onZoomChange={setZoomLevel}
          />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:11, overflowY:'auto', maxHeight:580 }}>
          {selectedInj?(
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'var(--shadow-card)' }}>
              <InjuryPanel injury={selectedInj} onClose={()=>setSelectedInj(null)} onUpdate={handleUpdate}/>
            </div>
          ):(
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'var(--shadow-card)' }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 10px' }}>Instructions</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  { icon:'🔭', text:'Vue globale : gros groupes musculaires' },
                  { icon:'🔍', text:'Zoom moyen : muscles specifiques' },
                  { icon:'🎯', text:'Zoom max : muscles profonds (adducteurs, coiffe...)' },
                  { icon:'👆', text:'Clic sur un muscle pour signaler une douleur' },
                ].map((x,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'7px 10px', borderRadius:9, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>{x.icon}</span>
                    <p style={{ fontSize:11, color:'var(--text-mid)', margin:0, lineHeight:1.5 }}>{x.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {[...active,...improving].length>0&&(
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:14, boxShadow:'var(--shadow-card)' }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, margin:'0 0 9px' }}>Blessures en cours</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {[...active,...improving].map(inj=>{ const c=iColor(inj.intensity); const cfg=STATUS_CFG[inj.status]; return (
                  <div key={inj.id} onClick={()=>setSelectedInj(inj)} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:9, background:'var(--bg-card2)', borderLeft:`3px solid ${c}`, cursor:'pointer' }}>
                    <div style={{ width:28,height:28,borderRadius:7,background:`${c}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <span style={{ fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:800,color:c }}>{inj.intensity}</span>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:11,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const }}>{inj.zoneLabel}</p>
                      <p style={{ fontSize:9,color:'var(--text-dim)',margin:'1px 0 0' }}>{inj.type} · {inj.painType}</p>
                    </div>
                    <span style={{ fontSize:8,padding:'2px 6px',borderRadius:20,background:cfg.bg,color:cfg.color,fontWeight:700,flexShrink:0 }}>{cfg.label}</span>
                  </div>
                )})}
              </div>
            </div>
          )}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:13, boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Legende</p>
            {[
              { c:'#4878b0', label:'Muscles visibles' },
              { c:'#22c55e', label:'Legere 1-3' },
              { c:'#ffb340', label:'Moderee 4-6' },
              { c:'#ef4444', label:'Severe 7-10' },
            ].map(x=>(
              <div key={x.label} style={{ display:'flex',alignItems:'center',gap:7,marginBottom:5 }}>
                <div style={{ width:9,height:9,borderRadius:'50%',background:x.c,flexShrink:0,boxShadow:`0 0 5px ${x.c}` }}/>
                <span style={{ fontSize:10,color:'var(--text-mid)' }}>{x.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
