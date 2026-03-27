'use client'

import { useState, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ─────────────────────────────────────────
type InjuryType = 'douleur' | 'gene' | 'blessure'
type PainType   = 'musculaire' | 'articulaire' | 'tendineuse'
type Context    = 'entrainement' | 'repos' | 'progressif' | 'soudain'
type Status     = 'actif' | 'amelioration' | 'gueri'

interface BodyZone {
  id: string
  label: string
  position: [number, number, number]
  radius: number
}

interface Injury {
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

// ── Body zones (positions sur le modele 3D) ────────
const BODY_ZONES: BodyZone[] = [
  { id:'head',       label:'Tete / Cou',              position:[0,   1.72, 0.05], radius:0.10 },
  { id:'neck',       label:'Nuque / Cervicales',       position:[0,   1.58, -0.05],radius:0.07 },
  { id:'sho_l',      label:'Epaule gauche',            position:[-0.20, 1.46, 0],  radius:0.09 },
  { id:'sho_r',      label:'Epaule droite',            position:[0.20, 1.46, 0],   radius:0.09 },
  { id:'chest',      label:'Pectoraux',                position:[0,   1.35, 0.08], radius:0.12 },
  { id:'uback',      label:'Haut du dos',              position:[0,   1.35,-0.08], radius:0.12 },
  { id:'core',       label:'Abdominaux / Core',        position:[0,   1.15, 0.08], radius:0.11 },
  { id:'lback',      label:'Lombaires',                position:[0,   1.10,-0.08], radius:0.10 },
  { id:'bic_l',      label:'Biceps gauche',            position:[-0.25, 1.25, 0],  radius:0.07 },
  { id:'bic_r',      label:'Biceps droit',             position:[0.25, 1.25, 0],   radius:0.07 },
  { id:'tri_l',      label:'Triceps gauche',           position:[-0.26, 1.22,-0.04],radius:0.07 },
  { id:'tri_r',      label:'Triceps droit',            position:[0.26, 1.22,-0.04], radius:0.07 },
  { id:'hip_l',      label:'Hanche gauche',            position:[-0.12, 0.92, 0],  radius:0.09 },
  { id:'hip_r',      label:'Hanche droite',            position:[0.12, 0.92, 0],   radius:0.09 },
  { id:'glu_l',      label:'Fessier gauche',           position:[-0.10, 0.88,-0.10],radius:0.09 },
  { id:'glu_r',      label:'Fessier droit',            position:[0.10, 0.88,-0.10], radius:0.09 },
  { id:'qua_l',      label:'Quadriceps gauche',        position:[-0.10, 0.62, 0.06],radius:0.09 },
  { id:'qua_r',      label:'Quadriceps droit',         position:[0.10, 0.62, 0.06], radius:0.09 },
  { id:'ham_l',      label:'Ischio-jambier gauche',    position:[-0.10, 0.60,-0.08],radius:0.09 },
  { id:'ham_r',      label:'Ischio-jambier droit',     position:[0.10, 0.60,-0.08], radius:0.09 },
  { id:'kne_l',      label:'Genou gauche',             position:[-0.10, 0.40, 0.05],radius:0.07 },
  { id:'kne_r',      label:'Genou droit',              position:[0.10, 0.40, 0.05], radius:0.07 },
  { id:'cal_l',      label:'Mollet gauche',            position:[-0.09, 0.22,-0.06],radius:0.08 },
  { id:'cal_r',      label:'Mollet droit',             position:[0.09, 0.22,-0.06], radius:0.08 },
  { id:'shi_l',      label:'Tibia gauche',             position:[-0.09, 0.22, 0.06],radius:0.07 },
  { id:'shi_r',      label:'Tibia droit',              position:[0.09, 0.22, 0.06], radius:0.07 },
  { id:'ank_l',      label:'Cheville gauche',          position:[-0.09, 0.06, 0],   radius:0.06 },
  { id:'ank_r',      label:'Cheville droite',          position:[0.09, 0.06, 0],    radius:0.06 },
]

const STATUS_CFG: Record<Status, { label:string; color:string; bg:string }> = {
  actif:        { label:'Actif',          color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
  amelioration: { label:'En amelioration',color:'#ffb340', bg:'rgba(255,179,64,0.12)' },
  gueri:        { label:'Gueri',          color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
}

function intensityColor(v: number): string {
  if (v <= 3) return '#22c55e'
  if (v <= 6) return '#ffb340'
  return '#ef4444'
}

function intensityColorThree(v: number): THREE.Color {
  if (v <= 3) return new THREE.Color('#22c55e')
  if (v <= 6) return new THREE.Color('#ffb340')
  return new THREE.Color('#ef4444')
}

function uid(): string { return `${Date.now()}_${Math.random().toString(36).slice(2)}` }
function today(): string { return new Date().toISOString().split('T')[0] }

function generateAI(zone: string, type: InjuryType, intensity: number, context: Context): string {
  const high = intensity >= 7
  const ctxMsg: Record<Context, string> = {
    entrainement: "Lie a une surcharge ou mauvaise recuperation.",
    repos:        "Apparition au repos — inflammation chronique possible.",
    progressif:   "Developpement progressif : surmenage (overuse).",
    soudain:      "Apparition soudaine : lesion aigue probable.",
  }
  const reco = high
    ? "Arret de l'entrainement sur cette zone. Consulte un kinesitherapeute sous 48h."
    : "Adapte l'entrainement. Evite les seances intenses. Recuperation active conseillee."
  const alert = high
    ? "Si la douleur persiste > 3 jours ou s'intensifie, consulte immediatement."
    : "Surveille l'evolution 3-5 jours. Pas d'amelioration = consultation recommandee."
  return `CAUSE : ${ctxMsg[context]}\n\nRECOMMANDATION : ${reco}\n\nALERTE : ${alert}`
}

const MOCK_INJURIES: Injury[] = [
  {
    id:'i1', zoneId:'kne_l', zoneLabel:'Genou gauche', type:'gene', painType:'articulaire',
    intensity:5, context:'entrainement', date:'2025-03-10', comment:'Douleur a la descente',
    status:'amelioration',
    history:[
      {date:'2025-03-10', intensity:7, note:'Debut douleur post-run'},
      {date:'2025-03-14', intensity:6, note:'Toujours present'},
      {date:'2025-03-18', intensity:5, note:'Legere amelioration'},
      {date:'2025-03-22', intensity:4, note:'Mieux'},
    ],
    aiAnalysis: generateAI('Genou gauche', 'gene', 5, 'entrainement'),
  },
  {
    id:'i2', zoneId:'lback', zoneLabel:'Lombaires', type:'douleur', painType:'musculaire',
    intensity:3, context:'progressif', date:'2025-03-05', comment:'Tension chronique',
    status:'amelioration',
    history:[
      {date:'2025-03-05', intensity:5, note:'Tension apres velo'},
      {date:'2025-03-12', intensity:4, note:'Stable'},
      {date:'2025-03-20', intensity:3, note:'Amelioration'},
    ],
    aiAnalysis: generateAI('Lombaires', 'douleur', 3, 'progressif'),
  },
]

// ── 3D Zone marker ─────────────────────────────────
function ZoneMarker({
  zone, injury, hovered, onHover, onClick,
}: {
  zone: BodyZone
  injury?: Injury
  hovered: boolean
  onHover: (id: string | null) => void
  onClick: (zone: BodyZone) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [localHover, setLocalHover] = useState(false)

  const hasInjury = !!injury && injury.status !== 'gueri'
  const color = hasInjury ? intensityColorThree(injury!.intensity) : new THREE.Color('#00c8e0')
  const opacity = hovered || localHover ? 0.85 : hasInjury ? 0.60 : 0.18
  const scale   = hovered || localHover ? 1.3 : hasInjury ? 1.15 : 1.0

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const s = meshRef.current.scale
    const target = scale
    s.x = THREE.MathUtils.lerp(s.x, target, 0.12)
    s.y = THREE.MathUtils.lerp(s.y, target, 0.12)
    s.z = THREE.MathUtils.lerp(s.z, target, 0.12)
  })

  return (
    <mesh
      ref={meshRef}
      position={zone.position}
      onClick={e => { e.stopPropagation(); onClick(zone) }}
      onPointerEnter={e => { e.stopPropagation(); setLocalHover(true); onHover(zone.id) }}
      onPointerLeave={e => { e.stopPropagation(); setLocalHover(false); onHover(null) }}
    >
      <sphereGeometry args={[zone.radius, 16, 16]}/>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.3}
        metalness={0.1}
        emissive={color}
        emissiveIntensity={hovered || localHover ? 0.6 : hasInjury ? 0.3 : 0.05}
      />
      {(hovered || localHover) && (
        <Html distanceFactor={10} style={{ pointerEvents:'none' }}>
          <div style={{
            background:'rgba(7,11,15,0.88)',
            border:'1px solid rgba(0,200,224,0.4)',
            borderRadius:8, padding:'4px 10px',
            fontSize:11, color:'#00c8e0', fontWeight:600,
            whiteSpace:'nowrap', backdropFilter:'blur(8px)',
            fontFamily:'DM Sans,sans-serif',
            transform:'translateY(-32px)',
            boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
          }}>
            {zone.label}
            {hasInjury && (
              <span style={{
                marginLeft:6, padding:'1px 5px', borderRadius:4,
                background:`${intensityColor(injury!.intensity)}22`,
                color:intensityColor(injury!.intensity), fontSize:10,
              }}>
                {injury!.intensity}/10
              </span>
            )}
          </div>
        </Html>
      )}
    </mesh>
  )
}

// ── Human model ────────────────────────────────────
function HumanModel() {
  const { scene } = useGLTF('https://vazxmixjsiawhamplnpc.supabase.co/storage/v1/object/public/models/human/model.gltf')

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#c8d8e8'),
        roughness: 0.75,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92,
      })
      mesh.material = mat
    }
  })

  return <primitive object={scene} scale={1} position={[0, -1, 0]}/>
}

// ── Fallback stylized body ─────────────────────────
function StylizedBody() {
  const bodyColor = new THREE.Color('#b8ccd8')
  const mat = { color:bodyColor, roughness:0.75, metalness:0.05 }

  return (
    <group position={[0, -0.9, 0]}>
      {/* Head */}
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.13, 32, 32]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.12, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.30, 0]} castShadow>
        <capsuleGeometry args={[0.155, 0.46, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Pelvis */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.135, 0.12, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Left upper arm */}
      <mesh position={[-0.215, 1.36, 0]} rotation={[0,0,0.22]} castShadow>
        <capsuleGeometry args={[0.055, 0.26, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Right upper arm */}
      <mesh position={[0.215, 1.36, 0]} rotation={[0,0,-0.22]} castShadow>
        <capsuleGeometry args={[0.055, 0.26, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Left forearm */}
      <mesh position={[-0.245, 1.10, 0]} rotation={[0,0,0.15]} castShadow>
        <capsuleGeometry args={[0.044, 0.24, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Right forearm */}
      <mesh position={[0.245, 1.10, 0]} rotation={[0,0,-0.15]} castShadow>
        <capsuleGeometry args={[0.044, 0.24, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Left hand */}
      <mesh position={[-0.255, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.048, 16, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Right hand */}
      <mesh position={[0.255, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.048, 16, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Left thigh */}
      <mesh position={[-0.10, 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.072, 0.34, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Right thigh */}
      <mesh position={[0.10, 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.072, 0.34, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Left shin */}
      <mesh position={[-0.10, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.30, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Right shin */}
      <mesh position={[0.10, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.30, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Left foot */}
      <mesh position={[-0.10, 0.04, 0.04]} castShadow>
        <capsuleGeometry args={[0.044, 0.12, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
      {/* Right foot */}
      <mesh position={[0.10, 0.04, 0.04]} castShadow>
        <capsuleGeometry args={[0.044, 0.12, 8, 16]}/>
        <meshStandardMaterial {...mat}/>
      </mesh>
    </group>
  )
}

// ── 3D Scene ───────────────────────────────────────
function Scene({
  injuries, hoveredZone, onHoverZone, onClickZone,
}: {
  injuries: Injury[]
  hoveredZone: string | null
  onHoverZone: (id: string | null) => void
  onClickZone: (zone: BodyZone) => void
}) {
  return (
    <>
      <ambientLight intensity={0.6}/>
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow shadow-mapSize={[1024,1024]}/>
      <directionalLight position={[-3, 3, -2]} intensity={0.4} color="#a0c4ff"/>
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#00c8e0"/>
      <Environment preset="city"/>

      <Suspense fallback={<StylizedBody/>}>
        <StylizedBody/>
      </Suspense>

      {BODY_ZONES.map(zone => (
        <ZoneMarker
          key={zone.id}
          zone={zone}
          injury={injuries.find(i => i.zoneId === zone.id)}
          hovered={hoveredZone === zone.id}
          onHover={onHoverZone}
          onClick={onClickZone}
        />
      ))}

      <ContactShadows position={[0,-1.85,0]} opacity={0.35} scale={3} blur={2.5} far={2}/>
    </>
  )
}

// ── Add Injury Modal ───────────────────────────────
function AddInjuryModal({ zone, onClose, onSave }: { zone:BodyZone; onClose:()=>void; onSave:(i:Injury)=>void }) {
  const [type,      setType]      = useState<InjuryType>('douleur')
  const [painType,  setPainType]  = useState<PainType>('musculaire')
  const [intensity, setIntensity] = useState(5)
  const [context,   setContext]   = useState<Context>('entrainement')
  const [date,      setDate]      = useState(today())
  const [comment,   setComment]   = useState('')
  const iColor = intensityColor(intensity)

  function handleSave() {
    const inj: Injury = {
      id: uid(), zoneId: zone.id, zoneLabel: zone.label,
      type, painType, intensity, context, date, comment, status:'actif',
      history:[{ date, intensity, note:'Premier enregistrement' }],
      aiAnalysis: generateAI(zone.label, type, intensity, context),
    }
    onSave(inj); onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:460, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>Nouvelle blessure</h3>
            <p style={{ fontSize:12, color:'#00c8e0', margin:'3px 0 0' }}>{zone.label}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:9, padding:'5px 10px', cursor:'pointer', color:'var(--text-dim)', fontSize:18 }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:8 }}>Type</p>
          <div style={{ display:'flex', gap:7 }}>
            {(['douleur','gene','blessure'] as InjuryType[]).map(t=>(
              <button key={t} onClick={()=>setType(t)} style={{ flex:1, padding:'8px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:type===t?600:400, borderColor:type===t?'#ef4444':'var(--border)', background:type===t?'rgba(239,68,68,0.12)':'var(--bg-card2)', color:type===t?'#ef4444':'var(--text-mid)' }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:8 }}>Type de douleur</p>
          <div style={{ display:'flex', gap:7 }}>
            {(['musculaire','articulaire','tendineuse'] as PainType[]).map(t=>(
              <button key={t} onClick={()=>setPainType(t)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:10, fontWeight:painType===t?600:400, borderColor:painType===t?'#f97316':'var(--border)', background:painType===t?'rgba(249,115,22,0.12)':'var(--bg-card2)', color:painType===t?'#f97316':'var(--text-mid)' }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>Intensite</p>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:18, fontWeight:700, color:iColor }}>{intensity}<span style={{ fontSize:12, fontWeight:400, color:'var(--text-dim)' }}>/10</span></span>
          </div>
          <input type="range" min={1} max={10} step={1} value={intensity} onChange={e=>setIntensity(parseInt(e.target.value))} style={{ width:'100%', accentColor:iColor, cursor:'pointer' }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:8 }}>Contexte</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {(['entrainement','repos','progressif','soudain'] as Context[]).map(c=>(
              <button key={c} onClick={()=>setContext(c)} style={{ padding:'8px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:context===c?600:400, borderColor:context===c?'#a855f7':'var(--border)', background:context===c?'rgba(168,85,247,0.12)':'var(--bg-card2)', color:context===c?'#a855f7':'var(--text-mid)' }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Date</p>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13, outline:'none' }}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Commentaire</p>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Description..." style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', resize:'none' as const, fontFamily:'DM Sans,sans-serif' }}/>
        </div>
        <button onClick={handleSave} style={{ width:'100%', padding:13, borderRadius:12, background:'linear-gradient(135deg,#ef4444,#f97316)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          Enregistrer + Analyse IA
        </button>
      </div>
    </div>
  )
}

// ── Injury panel ───────────────────────────────────
function InjuryPanel({ injury, onClose, onUpdate }: { injury:Injury; onClose:()=>void; onUpdate:(i:Injury)=>void }) {
  const [status, setStatus] = useState<Status>(injury.status)
  const [newNote, setNewNote] = useState('')
  const [newInt, setNewInt]   = useState(injury.intensity)
  const iColor = intensityColor(injury.intensity)

  function addEntry() {
    if (!newNote.trim()) return
    onUpdate({ ...injury, status, intensity:newInt, history:[...injury.history,{date:today(),intensity:newInt,note:newNote}] })
    setNewNote('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:4 }}>
            <span style={{ padding:'2px 8px', borderRadius:20, background:STATUS_CFG[status].bg, color:STATUS_CFG[status].color, fontSize:10, fontWeight:700 }}>{STATUS_CFG[status].label}</span>
            <span style={{ padding:'2px 8px', borderRadius:20, background:'rgba(239,68,68,0.10)', color:'#ef4444', fontSize:10, fontWeight:600 }}>{injury.type}</span>
          </div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, margin:0 }}>{injury.zoneLabel}</h3>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{injury.painType} · {injury.date}</p>
        </div>
        <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>×</button>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:`${iColor}12`, border:`1px solid ${iColor}33` }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:iColor, lineHeight:1 }}>{injury.intensity}</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 4px' }}>Intensite</p>
          <div style={{ height:6, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
            <div style={{ height:'100%', width:`${injury.intensity*10}%`, background:`linear-gradient(90deg,${iColor}88,${iColor})`, borderRadius:999 }}/>
          </div>
        </div>
      </div>

      {/* Evolution */}
      <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 8px' }}>Evolution</p>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:48 }}>
          {injury.history.map((h,i)=>{
            const c=intensityColor(h.intensity)
            return (
              <div key={i} title={`${h.date}: ${h.intensity}/10`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ width:'100%', height:`${(h.intensity/10)*48}px`, background:`linear-gradient(180deg,${c}cc,${c}44)`, borderRadius:'3px 3px 0 0', minHeight:2 }}/>
                <span style={{ fontSize:7, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{h.date.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI */}
      <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.18)' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#00c8e0', margin:'0 0 7px' }}>Analyse IA</p>
        <p style={{ fontSize:11, color:'var(--text-mid)', lineHeight:1.65, margin:0, whiteSpace:'pre-line' as const }}>{injury.aiAnalysis}</p>
      </div>

      {/* Status */}
      <div style={{ display:'flex', gap:6 }}>
        {(['actif','amelioration','gueri'] as Status[]).map(s=>{
          const c=STATUS_CFG[s]
          return <button key={s} onClick={()=>setStatus(s)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:status===s?c.color:'var(--border)', background:status===s?c.bg:'var(--bg-card2)', color:status===s?c.color:'var(--text-mid)', fontSize:10, fontWeight:status===s?600:400 }}>{c.label}</button>
        })}
      </div>

      {/* Add note */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
          <span style={{ fontSize:10, color:'var(--text-dim)' }}>Intensite</span>
          <input type="range" min={0} max={10} step={1} value={newInt} onChange={e=>setNewInt(parseInt(e.target.value))} style={{ flex:1, accentColor:intensityColor(newInt), cursor:'pointer' }}/>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:intensityColor(newInt), minWidth:28 }}>{newInt}/10</span>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <input value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Note du jour..." onKeyDown={e=>e.key==='Enter'&&addEntry()} style={{ flex:1, padding:'7px 11px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Sans,sans-serif', fontSize:12, outline:'none' }}/>
          <button onClick={addEntry} style={{ padding:'7px 12px', borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>+</button>
        </div>
      </div>

      <button onClick={()=>onUpdate({...injury,status})} style={{ padding:11, borderRadius:12, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>Sauvegarder</button>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function BlessuresPage() {
  const [injuries,    setInjuries]    = useState<Injury[]>(MOCK_INJURIES)
  const [hoveredZone, setHoveredZone] = useState<string|null>(null)
  const [addModal,    setAddModal]    = useState<BodyZone|null>(null)
  const [selectedInj, setSelectedInj] = useState<Injury|null>(null)
  const [pendingZone, setPendingZone] = useState<BodyZone|null>(null)

  const active    = injuries.filter(i=>i.status==='actif')
  const improving = injuries.filter(i=>i.status==='amelioration')
  const healed    = injuries.filter(i=>i.status==='gueri')

  const globalStatus = active.some(i=>i.intensity>=7) ? 'risque' : active.length>0 ? 'vigilance' : 'ok'
  const globalCfg = {
    ok:        { label:'Corps OK',     color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
    vigilance: { label:'Vigilance',    color:'#ffb340', bg:'rgba(255,179,64,0.12)' },
    risque:    { label:'Risque eleve', color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
  }[globalStatus]

  function handleZoneClick(zone: BodyZone) {
    const existing = injuries.find(i=>i.zoneId===zone.id && i.status!=='gueri')
    if (existing) {
      setSelectedInj(existing)
      setPendingZone(null)
    } else {
      setAddModal(zone)
    }
  }

  function handleAdd(inj: Injury) {
    setInjuries(prev=>[...prev,inj])
    setSelectedInj(inj)
  }

  function handleUpdate(updated: Injury) {
    setInjuries(prev=>prev.map(i=>i.id===updated.id?updated:i))
    setSelectedInj(updated)
  }

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%', height:'calc(100vh - 0px)', display:'flex', flexDirection:'column' }}>
      {addModal && <AddInjuryModal zone={addModal} onClose={()=>setAddModal(null)} onSave={handleAdd}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap' as const, gap:10 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Blessures</h1>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'3px 0 0' }}>Suivi interactif · Corps 3D</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ padding:'5px 12px', borderRadius:20, background:globalCfg.bg, border:`1px solid ${globalCfg.color}55`, color:globalCfg.color, fontSize:11, fontWeight:700 }}>{globalCfg.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'Actives',         value:active.length,    color:'#ef4444' },
          { label:'En amelioration', value:improving.length, color:'#ffb340' },
          { label:'Gueries',         value:healed.length,    color:'#22c55e' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px', boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 340px', gap:16, minHeight:0 }} className="md:grid-cols-[1fr_340px]">

        {/* 3D Canvas */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', position:'relative', boxShadow:'var(--shadow-card)', minHeight:400 }}>
          <div style={{ position:'absolute', top:14, left:14, zIndex:10, display:'flex', gap:6 }}>
            <div style={{ padding:'4px 10px', borderRadius:20, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.10)', fontSize:10, color:'rgba(255,255,255,0.6)' }}>
              Drag pour tourner · Scroll pour zoomer
            </div>
          </div>
          <Canvas
            camera={{ position:[0, 0.8, 3.2], fov:42 }}
            shadows
            gl={{ antialias:true, alpha:false }}
            style={{ background:'transparent', width:'100%', height:'100%' }}
          >
            <color attach="background" args={['#080c12']}/>
            <fog attach="fog" args={['#080c12', 6, 14]}/>
            <Scene
              injuries={injuries}
              hoveredZone={hoveredZone}
              onHoverZone={setHoveredZone}
              onClickZone={handleZoneClick}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              minDistance={1.8}
              maxDistance={5}
              minPolarAngle={0.3}
              maxPolarAngle={2.4}
              autoRotate={false}
              dampingFactor={0.08}
              enableDamping
            />
          </Canvas>
          {hoveredZone && (
            <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', padding:'4px 12px', borderRadius:20, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', border:'1px solid rgba(0,200,224,0.3)', fontSize:11, color:'#00c8e0', fontWeight:600, pointerEvents:'none' }}>
              {BODY_ZONES.find(z=>z.id===hoveredZone)?.label} — Cliquer pour signaler
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
          {selectedInj ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:18, boxShadow:'var(--shadow-card)' }}>
              <InjuryPanel injury={selectedInj} onClose={()=>setSelectedInj(null)} onUpdate={handleUpdate}/>
            </div>
          ) : (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:18, boxShadow:'var(--shadow-card)' }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Zone selectionnee</h3>
              <div style={{ textAlign:'center' as const, padding:'20px 0' }}>
                <p style={{ fontSize:32, margin:'0 0 8px' }}>3D</p>
                <p style={{ fontSize:12, color:'var(--text-dim)', margin:0 }}>Clique sur une zone du corps pour signaler une douleur ou voir une blessure existante</p>
              </div>
            </div>
          )}

          {/* Active injuries list */}
          {[...active,...improving].length > 0 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'var(--shadow-card)' }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'0 0 10px' }}>Blessures en cours</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[...active,...improving].map(inj=>{
                  const iColor=intensityColor(inj.intensity)
                  const cfg=STATUS_CFG[inj.status]
                  return (
                    <div key={inj.id} onClick={()=>setSelectedInj(inj)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:10, background:'var(--bg-card2)', borderLeft:`3px solid ${iColor}`, cursor:'pointer' }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`${iColor}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, color:iColor }}>{inj.intensity}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{inj.zoneLabel}</p>
                        <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{inj.type} · {inj.painType}</p>
                      </div>
                      <span style={{ fontSize:9, padding:'2px 6px', borderRadius:20, background:cfg.bg, color:cfg.color, fontWeight:700, flexShrink:0 }}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:14, boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 8px' }}>Legende</p>
            {[
              { c:'#00c8e0', label:'Zone saine (hover)' },
              { c:'#22c55e', label:'Douleur legere (1-3)' },
              { c:'#ffb340', label:'Douleur moderee (4-6)' },
              { c:'#ef4444', label:'Douleur severe (7-10)' },
            ].map(x=>(
              <div key={x.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:x.c, flexShrink:0, boxShadow:`0 0 6px ${x.c}` }}/>
                <span style={{ fontSize:11, color:'var(--text-mid)' }}>{x.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
