'use client'

import { useState, useRef, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Html, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ──────────────────────────────────────────
type InjuryType = 'douleur' | 'gene' | 'blessure'
type PainType   = 'musculaire' | 'articulaire' | 'tendineuse'
type Context    = 'entrainement' | 'repos' | 'progressif' | 'soudain'
type Status     = 'actif' | 'amelioration' | 'gueri'
type ZoomLevel  = 'far' | 'mid' | 'close'

// ── Muscle zone definition ─────────────────────────
interface MuscleZone {
  id: string
  label: string
  group: string // muscle group for far zoom
  position: [number, number, number]
  scale: [number, number, number]
  minZoom: ZoomLevel // minimum zoom to show
  color: string
}

// ── Injury ─────────────────────────────────────────
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

// ── Config ─────────────────────────────────────────
const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  actif:        { label: 'Actif',           color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  amelioration: { label: 'En amelioration', color: '#ffb340', bg: 'rgba(255,179,64,0.12)' },
  gueri:        { label: 'Gueri',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
}

function iColor(v: number): string {
  if (v <= 3) return '#22c55e'
  if (v <= 6) return '#ffb340'
  return '#ef4444'
}
function iColorThree(v: number): THREE.Color {
  return new THREE.Color(iColor(v))
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

// ── All muscle zones with zoom levels ──────────────
const MUSCLE_ZONES: MuscleZone[] = [
  // === FAR ZOOM - major groups ===
  // Head / Neck
  { id:'head',     label:'Tete / Cou',            group:'head',   position:[0, 1.72, 0],      scale:[0.14,0.16,0.14], minZoom:'far',   color:'#7090b0' },
  // Chest
  { id:'chest',    label:'Pectoraux',              group:'chest',  position:[0, 1.32, 0.09],   scale:[0.22,0.12,0.08], minZoom:'far',   color:'#5080a0' },
  // Back
  { id:'uback',    label:'Haut du dos',            group:'back',   position:[0, 1.35,-0.09],   scale:[0.22,0.14,0.08], minZoom:'far',   color:'#4870a0' },
  { id:'lback',    label:'Lombaires',              group:'back',   position:[0, 1.10,-0.08],   scale:[0.16,0.10,0.08], minZoom:'far',   color:'#3d6090' },
  // Shoulders
  { id:'sho_l',    label:'Epaule gauche',          group:'shoulders', position:[-0.22,1.46,0], scale:[0.10,0.10,0.10], minZoom:'far',   color:'#5888b0' },
  { id:'sho_r',    label:'Epaule droite',          group:'shoulders', position:[0.22, 1.46,0], scale:[0.10,0.10,0.10], minZoom:'far',   color:'#5888b0' },
  // Core
  { id:'core',     label:'Abdominaux / Core',      group:'core',   position:[0, 1.15, 0.09],   scale:[0.18,0.14,0.08], minZoom:'far',   color:'#4878a8' },
  // Glutes
  { id:'glu_l',    label:'Fessier gauche',         group:'glutes', position:[-0.11,0.88,-0.10],scale:[0.12,0.12,0.10], minZoom:'far',   color:'#4070a0' },
  { id:'glu_r',    label:'Fessier droit',          group:'glutes', position:[0.11, 0.88,-0.10],scale:[0.12,0.12,0.10], minZoom:'far',   color:'#4070a0' },
  // Quads
  { id:'qua_l',    label:'Quadriceps gauche',      group:'quads',  position:[-0.11,0.60, 0.07],scale:[0.10,0.18,0.09], minZoom:'far',   color:'#3868a0' },
  { id:'qua_r',    label:'Quadriceps droit',       group:'quads',  position:[0.11, 0.60, 0.07],scale:[0.10,0.18,0.09], minZoom:'far',   color:'#3868a0' },
  // Hamstrings
  { id:'ham_l',    label:'Ischio-jambier gauche',  group:'hamstrings', position:[-0.11,0.60,-0.09],scale:[0.09,0.18,0.08], minZoom:'far', color:'#3060a0' },
  { id:'ham_r',    label:'Ischio-jambier droit',   group:'hamstrings', position:[0.11, 0.60,-0.09],scale:[0.09,0.18,0.08], minZoom:'far', color:'#3060a0' },
  // Calves
  { id:'cal_l',    label:'Mollet gauche',          group:'calves', position:[-0.10,0.22,-0.07],scale:[0.08,0.14,0.08], minZoom:'far',   color:'#2858a0' },
  { id:'cal_r',    label:'Mollet droit',           group:'calves', position:[0.10, 0.22,-0.07],scale:[0.08,0.14,0.08], minZoom:'far',   color:'#2858a0' },
  // Knees
  { id:'kne_l',    label:'Genou gauche',           group:'knees',  position:[-0.10,0.40, 0.06],scale:[0.08,0.07,0.08], minZoom:'far',   color:'#6090b8' },
  { id:'kne_r',    label:'Genou droit',            group:'knees',  position:[0.10, 0.40, 0.06],scale:[0.08,0.07,0.08], minZoom:'far',   color:'#6090b8' },
  // Biceps
  { id:'bic_l',    label:'Biceps gauche',          group:'arms',   position:[-0.24,1.24, 0.02],scale:[0.07,0.12,0.07], minZoom:'far',   color:'#5080b0' },
  { id:'bic_r',    label:'Biceps droit',           group:'arms',   position:[0.24, 1.24, 0.02],scale:[0.07,0.12,0.07], minZoom:'far',   color:'#5080b0' },
  // Triceps
  { id:'tri_l',    label:'Triceps gauche',         group:'arms',   position:[-0.24,1.22,-0.04],scale:[0.07,0.12,0.06], minZoom:'far',   color:'#4878b0' },
  { id:'tri_r',    label:'Triceps droit',          group:'arms',   position:[0.24, 1.22,-0.04],scale:[0.07,0.12,0.06], minZoom:'far',   color:'#4878b0' },

  // === MID ZOOM - more specific ===
  { id:'trap_l',   label:'Trapeze gauche',         group:'back',   position:[-0.14,1.50,-0.06],scale:[0.08,0.10,0.07], minZoom:'mid',   color:'#3870a8' },
  { id:'trap_r',   label:'Trapeze droit',          group:'back',   position:[0.14, 1.50,-0.06],scale:[0.08,0.10,0.07], minZoom:'mid',   color:'#3870a8' },
  { id:'delt_l',   label:'Deltoide anterieur gauche', group:'shoulders', position:[-0.22,1.46,0.05],scale:[0.06,0.07,0.06], minZoom:'mid', color:'#6898c0' },
  { id:'delt_r',   label:'Deltoide anterieur droit',  group:'shoulders', position:[0.22, 1.46,0.05],scale:[0.06,0.07,0.06], minZoom:'mid', color:'#6898c0' },
  { id:'hip_l',    label:'Hanche / Psoas gauche',  group:'core',   position:[-0.12,0.92, 0.04],scale:[0.09,0.09,0.08], minZoom:'mid',   color:'#3868a8' },
  { id:'hip_r',    label:'Hanche / Psoas droit',   group:'core',   position:[0.12, 0.92, 0.04],scale:[0.09,0.09,0.08], minZoom:'mid',   color:'#3868a8' },
  { id:'tib_l',    label:'Tibia gauche',           group:'calves', position:[-0.10,0.22, 0.07],scale:[0.06,0.14,0.06], minZoom:'mid',   color:'#5080b0' },
  { id:'tib_r',    label:'Tibia droit',            group:'calves', position:[0.10, 0.22, 0.07],scale:[0.06,0.14,0.06], minZoom:'mid',   color:'#5080b0' },
  { id:'ank_l',    label:'Cheville gauche',        group:'calves', position:[-0.09,0.07, 0],   scale:[0.07,0.05,0.07], minZoom:'mid',   color:'#6090b8' },
  { id:'ank_r',    label:'Cheville droite',        group:'calves', position:[0.09, 0.07, 0],   scale:[0.07,0.05,0.07], minZoom:'mid',   color:'#6090b8' },
  { id:'far_l',    label:'Avant-bras gauche',      group:'arms',   position:[-0.25,1.06, 0],   scale:[0.06,0.10,0.06], minZoom:'mid',   color:'#4070b0' },
  { id:'far_r',    label:'Avant-bras droit',       group:'arms',   position:[0.25, 1.06, 0],   scale:[0.06,0.10,0.06], minZoom:'mid',   color:'#4070b0' },

  // === CLOSE ZOOM - very specific ===
  { id:'add_l',    label:'Adducteurs gauches',     group:'quads',  position:[-0.07,0.62, 0.03],scale:[0.05,0.16,0.06], minZoom:'close', color:'#2860a8' },
  { id:'add_r',    label:'Adducteurs droits',      group:'quads',  position:[0.07, 0.62, 0.03],scale:[0.05,0.16,0.06], minZoom:'close', color:'#2860a8' },
  { id:'ach_l',    label:"Tendon Achille gauche",  group:'calves', position:[-0.09,0.12,-0.07],scale:[0.04,0.08,0.04], minZoom:'close', color:'#7098c0' },
  { id:'ach_r',    label:"Tendon Achille droit",   group:'calves', position:[0.09, 0.12,-0.07],scale:[0.04,0.08,0.04], minZoom:'close', color:'#7098c0' },
  { id:'pec_l',    label:'Pec gauche (chef sternal)', group:'chest', position:[-0.09,1.30,0.10],scale:[0.09,0.09,0.06], minZoom:'close', color:'#4878b0' },
  { id:'pec_r',    label:'Pec droit (chef sternal)',  group:'chest', position:[0.09, 1.30,0.10],scale:[0.09,0.09,0.06], minZoom:'close', color:'#4878b0' },
  { id:'rec_ab',   label:'Grand droit abdomen',   group:'core',   position:[0, 1.15, 0.10],    scale:[0.06,0.14,0.05], minZoom:'close', color:'#3870b0' },
  { id:'obl_l',    label:'Oblique gauche',        group:'core',   position:[-0.09,1.12,0.08],  scale:[0.06,0.10,0.05], minZoom:'close', color:'#3060a8' },
  { id:'obl_r',    label:'Oblique droit',         group:'core',   position:[0.09, 1.12,0.08],  scale:[0.06,0.10,0.05], minZoom:'close', color:'#3060a8' },
  { id:'rotcuf_l', label:'Coiffe rotateurs gauche', group:'shoulders', position:[-0.22,1.44,-0.05],scale:[0.07,0.07,0.06], minZoom:'close', color:'#5888c0' },
  { id:'rotcuf_r', label:'Coiffe rotateurs droit',  group:'shoulders', position:[0.22, 1.44,-0.05],scale:[0.07,0.07,0.06], minZoom:'close', color:'#5888c0' },
  { id:'it_band_l',label:'Bandelette IT gauche',  group:'quads',  position:[-0.13,0.50, 0.04], scale:[0.04,0.20,0.04], minZoom:'close', color:'#2858a8' },
  { id:'it_band_r',label:'Bandelette IT droit',   group:'quads',  position:[0.13, 0.50, 0.04], scale:[0.04,0.20,0.04], minZoom:'close', color:'#2858a8' },
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

// ── Fiber lines (muscle fiber effect) ─────────────
function FiberLines({ position, scale, color, visible }: { position:[number,number,number]; scale:[number,number,number]; color:string; visible:boolean }) {
  const lines = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (lines.current) {
      lines.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = visible ? 0.3 + Math.sin(clock.elapsedTime * 0.5 + i) * 0.1 : 0
      })
    }
  })
  if (!visible) return null
  const c = new THREE.Color(color)
  c.multiplyScalar(1.3)
  return (
    <group ref={lines} position={position}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[
          (i - 2.5) * scale[0] * 0.28,
          0,
          scale[2] * 0.3,
        ]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.002, 0.002, scale[1] * 1.8, 4]}/>
          <meshStandardMaterial color={c} transparent opacity={0.25} emissive={c} emissiveIntensity={0.2}/>
        </mesh>
      ))}
    </group>
  )
}

// ── Single muscle mesh ─────────────────────────────
function MuscleMesh({
  zone, injuries, hovered, zoomLevel, onHover, onClick,
}: {
  zone: MuscleZone
  injuries: Injury[]
  hovered: string | null
  zoomLevel: ZoomLevel
  onHover: (id: string | null) => void
  onClick: (zone: MuscleZone) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const inj = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
  const isHov = hovered === zone.id
  const hasInj = !!inj

  // Zoom visibility
  const zoomOrder: ZoomLevel[] = ['far', 'mid', 'close']
  const zoneIdx = zoomOrder.indexOf(zone.minZoom)
  const currentIdx = zoomOrder.indexOf(zoomLevel)
  const isVisible = currentIdx >= zoneIdx

  // Colors
  const baseColor = new THREE.Color(zone.color)
  const injColor = hasInj ? iColorThree(inj!.intensity) : baseColor
  const emissiveColor = isHov ? new THREE.Color('#00c8e0') : hasInj ? iColorThree(inj!.intensity) : new THREE.Color(zone.color).multiplyScalar(0.3)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    // Animate opacity
    const targetOp = isVisible ? (isHov ? 0.95 : hasInj ? 0.80 : 0.65) : 0
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOp, 0.08)
    // Animate emissive intensity
    const targetEmi = isHov ? 0.5 : hasInj ? 0.3 : 0.05
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmi, 0.1)
    // Animate scale pulse on injury
    if (hasInj) {
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.04
      meshRef.current.scale.setScalar(pulse)
    } else {
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, isHov ? 1.08 : 1, 0.1))
    }
  })

  if (!isVisible && !hasInj) return null

  return (
    <group>
      <mesh
        ref={meshRef}
        position={zone.position}
        onClick={e => { e.stopPropagation(); onClick(zone) }}
        onPointerEnter={e => { e.stopPropagation(); onHover(zone.id) }}
        onPointerLeave={e => { e.stopPropagation(); onHover(null) }}
        castShadow
      >
        <capsuleGeometry args={[
          Math.min(zone.scale[0], zone.scale[2]) * 0.95,
          zone.scale[1] * 1.6,
          8, 16
        ]}/>
        <meshStandardMaterial
          color={injColor}
          emissive={emissiveColor}
          emissiveIntensity={0.05}
          roughness={0.45}
          metalness={0.15}
          transparent
          opacity={0}
        />
      </mesh>
      <FiberLines
        position={zone.position}
        scale={zone.scale}
        color={zone.color}
        visible={isHov && zoomLevel === 'close'}
      />
      {(isHov || hasInj) && (
        <Html position={[zone.position[0], zone.position[1] + zone.scale[1] + 0.08, zone.position[2]]} distanceFactor={8} style={{ pointerEvents:'none' }}>
          <div style={{
            background:'rgba(4,8,16,0.92)',
            border:`1px solid ${hasInj ? iColor(inj!.intensity) : 'rgba(0,200,224,0.5)'}`,
            borderRadius:8, padding:'4px 10px',
            fontSize:10, fontWeight:600,
            color: hasInj ? iColor(inj!.intensity) : '#00c8e0',
            whiteSpace:'nowrap', backdropFilter:'blur(8px)',
            fontFamily:'DM Sans,sans-serif',
            boxShadow:`0 4px 20px ${hasInj ? iColor(inj!.intensity)+'44' : 'rgba(0,200,224,0.2)'}`,
            transform:'translateY(-8px)',
          }}>
            {zone.label}
            {hasInj && <span style={{ marginLeft:6, opacity:0.8 }}>{inj!.intensity}/10</span>}
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Stylized human body skeleton ───────────────────
function HumanBody() {
  const bodyMat = {
    color: new THREE.Color('#1a2a3a'),
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  }
  const jointMat = {
    color: new THREE.Color('#243444'),
    roughness: 0.5,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9,
  }

  return (
    <group position={[0, -0.9, 0]}>
      {/* Head */}
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.13, 32, 32]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.59, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.050, 0.14, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Upper torso */}
      <mesh position={[0, 1.34, 0]} castShadow>
        <capsuleGeometry args={[0.148, 0.30, 8, 24]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Lower torso */}
      <mesh position={[0, 1.10, 0]} castShadow>
        <capsuleGeometry args={[0.130, 0.18, 8, 24]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Pelvis */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.125, 0.10, 8, 24]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Clavicles */}
      <mesh position={[-0.12, 1.54, 0.04]} rotation={[0,0,0.4]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.20, 8]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      <mesh position={[0.12, 1.54, 0.04]} rotation={[0,0,-0.4]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.20, 8]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.21, 1.44, 0]} rotation={[0,0,0.18]} castShadow>
        <capsuleGeometry args={[0.052, 0.28, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Right arm */}
      <mesh position={[0.21, 1.44, 0]} rotation={[0,0,-0.18]} castShadow>
        <capsuleGeometry args={[0.052, 0.28, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Left forearm */}
      <mesh position={[-0.23, 1.12, 0]} rotation={[0,0,0.08]} castShadow>
        <capsuleGeometry args={[0.042, 0.24, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Right forearm */}
      <mesh position={[0.23, 1.12, 0]} rotation={[0,0,-0.08]} castShadow>
        <capsuleGeometry args={[0.042, 0.24, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Hands */}
      <mesh position={[-0.24, 0.94, 0]} castShadow>
        <sphereGeometry args={[0.044, 12, 12]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      <mesh position={[0.24, 0.94, 0]} castShadow>
        <sphereGeometry args={[0.044, 12, 12]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      {/* Left thigh */}
      <mesh position={[-0.105, 0.60, 0]} castShadow>
        <capsuleGeometry args={[0.070, 0.36, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Right thigh */}
      <mesh position={[0.105, 0.60, 0]} castShadow>
        <capsuleGeometry args={[0.070, 0.36, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Knee joints */}
      <mesh position={[-0.105, 0.40, 0]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      <mesh position={[0.105, 0.40, 0]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      {/* Left shin */}
      <mesh position={[-0.103, 0.20, 0]} castShadow>
        <capsuleGeometry args={[0.052, 0.32, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Right shin */}
      <mesh position={[0.103, 0.20, 0]} castShadow>
        <capsuleGeometry args={[0.052, 0.32, 8, 16]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      {/* Ankle joints */}
      <mesh position={[-0.103, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.042, 12, 12]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      <mesh position={[0.103, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.042, 12, 12]}/>
        <meshStandardMaterial {...jointMat}/>
      </mesh>
      {/* Feet */}
      <mesh position={[-0.103, 0.02, 0.055]} rotation={[0.3,0,0]} castShadow>
        <capsuleGeometry args={[0.036, 0.12, 8, 12]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
      <mesh position={[0.103, 0.02, 0.055]} rotation={[0.3,0,0]} castShadow>
        <capsuleGeometry args={[0.036, 0.12, 8, 12]}/>
        <meshStandardMaterial {...bodyMat}/>
      </mesh>
    </group>
  )
}

// ── Scene ──────────────────────────────────────────
function Scene({
  injuries, hovered, zoomLevel, onHover, onZoneClick,
}: {
  injuries: Injury[]
  hovered: string | null
  zoomLevel: ZoomLevel
  onHover: (id: string | null) => void
  onZoneClick: (zone: MuscleZone) => void
}) {
  const { camera } = useThree()

  return (
    <>
      <ambientLight intensity={0.5}/>
      <directionalLight position={[3,5,3]} intensity={1.4} castShadow shadow-mapSize={[2048,2048]}/>
      <directionalLight position={[-3,3,-2]} intensity={0.5} color="#80b0ff"/>
      <pointLight position={[0,3,2]} intensity={0.8} color="#00c8e0" distance={8}/>
      <pointLight position={[0,0,-3]} intensity={0.3} color="#4060a0" distance={6}/>
      <Environment preset="night"/>

      <group position={[0,-0.1,0]}>
        <HumanBody/>
        {MUSCLE_ZONES.map(zone => (
          <MuscleMesh
            key={zone.id}
            zone={zone}
            injuries={injuries}
            hovered={hovered}
            zoomLevel={zoomLevel}
            onHover={onHover}
            onClick={onZoneClick}
          />
        ))}
      </group>

      <ContactShadows position={[0,-2.0,0]} opacity={0.4} scale={4} blur={3} far={3}/>
    </>
  )
}

// ── Camera zoom tracker ────────────────────────────
function CameraTracker({ onZoomChange }: { onZoomChange: (z: ZoomLevel) => void }) {
  const { camera } = useThree()
  const lastZoom = useRef<ZoomLevel>('far')

  useFrame(() => {
    const dist = camera.position.length()
    let zoom: ZoomLevel = 'far'
    if (dist < 2.2) zoom = 'close'
    else if (dist < 3.5) zoom = 'mid'

    if (zoom !== lastZoom.current) {
      lastZoom.current = zoom
      onZoomChange(zoom)
    }
  })
  return null
}

// ── Add Injury Modal ───────────────────────────────
function AddInjuryModal({ zone, onClose, onSave }: { zone: MuscleZone; onClose: ()=>void; onSave: (i: Injury)=>void }) {
  const [type,      setType]      = useState<InjuryType>('douleur')
  const [painType,  setPainType]  = useState<PainType>('musculaire')
  const [intensity, setIntensity] = useState(5)
  const [context,   setContext]   = useState<Context>('entrainement')
  const [date,      setDate]      = useState(today())
  const [comment,   setComment]   = useState('')
  const c = iColor(intensity)

  function save() {
    onSave({
      id: uid(), zoneId: zone.id, zoneLabel: zone.label,
      type, painType, intensity, context, date, comment,
      status: 'actif',
      history: [{ date, intensity, note: 'Premier enregistrement' }],
      aiAnalysis: genAI(zone.label, type, intensity, context),
    })
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
        <button onClick={save} style={{ width:'100%', padding:13, borderRadius:12, background:'linear-gradient(135deg,#ef4444,#f97316)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          Enregistrer + Analyse IA
        </button>
      </div>
    </div>
  )
}

// ── Injury Panel ───────────────────────────────────
function InjuryPanel({ injury, onClose, onUpdate }: { injury:Injury; onClose:()=>void; onUpdate:(i:Injury)=>void }) {
  const [status, setStatus] = useState<Status>(injury.status)
  const [newNote, setNewNote] = useState('')
  const [newInt, setNewInt] = useState(injury.intensity)
  const c = iColor(injury.intensity)

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
            <span style={{ padding:'2px 8px', borderRadius:20, background:STATUS_CFG[status].bg, color:STATUS_CFG[status].color, fontSize:10, fontWeight:700 }}>{STATUS_CFG[status].label}</span>
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
          {injury.history.map((h,i)=>{
            const hc=iColor(h.intensity)
            return <div key={i} title={`${h.date}: ${h.intensity}/10`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <div style={{ width:'100%', height:`${(h.intensity/10)*44}px`, background:`linear-gradient(180deg,${hc}cc,${hc}44)`, borderRadius:'3px 3px 0 0', minHeight:2 }}/>
              <span style={{ fontSize:7, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{h.date.slice(5)}</span>
            </div>
          })}
        </div>
      </div>
      <div style={{ padding:'11px 13px', borderRadius:11, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.18)' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#00c8e0', margin:'0 0 6px' }}>Analyse IA</p>
        <p style={{ fontSize:11, color:'var(--text-mid)', lineHeight:1.65, margin:0, whiteSpace:'pre-line' as const }}>{injury.aiAnalysis}</p>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {(['actif','amelioration','gueri'] as Status[]).map(s=>{
          const sc=STATUS_CFG[s]
          return <button key={s} onClick={()=>setStatus(s)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:status===s?sc.color:'var(--border)', background:status===s?sc.bg:'var(--bg-card2)', color:status===s?sc.color:'var(--text-mid)', fontSize:10, fontWeight:status===s?600:400 }}>{sc.label}</button>
        })}
      </div>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
          <span style={{ fontSize:10, color:'var(--text-dim)', flexShrink:0 }}>Intensite</span>
          <input type="range" min={0} max={10} step={1} value={newInt} onChange={e=>setNewInt(parseInt(e.target.value))} style={{ flex:1, accentColor:iColor(newInt), cursor:'pointer' }}/>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:700, color:iColor(newInt), minWidth:28 }}>{newInt}/10</span>
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
    const existing = injuries.find(i=>i.zoneId===zone.id && i.status!=='gueri')
    if (existing) setSelectedInj(existing)
    else setAddModal(zone)
  }

  function handleAdd(inj: Injury) { setInjuries(p=>[...p,inj]); setSelectedInj(inj) }
  function handleUpdate(u: Injury) { setInjuries(p=>p.map(i=>i.id===u.id?u:i)); setSelectedInj(u) }

  const zoomLabels: Record<ZoomLevel,string> = {
    far:   'Vue globale',
    mid:   'Vue detaillee',
    close: 'Vue precise',
  }

  return (
    <div style={{ padding:'20px 24px', maxWidth:'100%', display:'flex', flexDirection:'column', gap:14 }}>
      {addModal && <AddInjuryModal zone={addModal} onClose={()=>setAddModal(null)} onSave={handleAdd}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' as const, gap:10 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Blessures</h1>
          <p style={{ fontSize:12, color:'var(--text-dim)', margin:'3px 0 0' }}>Corps 3D interactif · Drag pour tourner · Scroll pour zoomer</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ padding:'4px 10px', borderRadius:20, background:'rgba(0,200,224,0.08)', border:'1px solid rgba(0,200,224,0.2)', color:'#00c8e0', fontSize:10, fontWeight:600 }}>
            {zoomLabels[zoomLevel]}
          </span>
          <span style={{ padding:'5px 12px', borderRadius:20, background:globalCfg.bg, border:`1px solid ${globalCfg.color}55`, color:globalCfg.color, fontSize:11, fontWeight:700 }}>
            {globalCfg.label}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { label:'Actives',        value:active.length,    color:'#ef4444' },
          { label:'Amelioration',   value:improving.length, color:'#ffb340' },
          { label:'Gueries',        value:healed.length,    color:'#22c55e' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'11px 13px', boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:9, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 3px' }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14, minHeight:520 }} className="md:grid-cols-[1fr_320px]">

        {/* 3D Canvas */}
        <div style={{ background:'#040810', borderRadius:18, overflow:'hidden', position:'relative', minHeight:520, boxShadow:'0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          {/* Atmospheric background */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,60,120,0.15) 0%, transparent 70%)', pointerEvents:'none', zIndex:1 }}/>

          <div style={{ position:'absolute', top:14, left:14, zIndex:10, display:'flex', gap:7, flexWrap:'wrap' as const }}>
            <div style={{ padding:'4px 10px', borderRadius:20, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(0,200,224,0.2)', fontSize:9, color:'rgba(255,255,255,0.5)' }}>
              Drag · tourner &nbsp;|&nbsp; Scroll · zoomer &nbsp;|&nbsp; Clic · selectionner
            </div>
          </div>

          {/* Zoom indicator */}
          <div style={{ position:'absolute', bottom:14, left:14, zIndex:10, display:'flex', gap:5 }}>
            {(['far','mid','close'] as ZoomLevel[]).map(z=>(
              <div key={z} style={{ width:8, height:8, borderRadius:'50%', background:zoomLevel===z?'#00c8e0':'rgba(255,255,255,0.2)', transition:'background 0.3s', boxShadow:zoomLevel===z?'0 0 8px #00c8e0':undefined }}/>
            ))}
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginLeft:4 }}>
              {zoomLevel==='far'?'Gros muscles':zoomLevel==='mid'?'Muscles specifiques':'Muscles profonds'}
            </span>
          </div>

          <Canvas
            camera={{ position:[0,0.8,4.0], fov:40 }}
            shadows
            gl={{ antialias:true, alpha:false, powerPreference:'high-performance' }}
            style={{ width:'100%', height:'100%', minHeight:520 }}
          >
            <color attach="background" args={['#040810']}/>
            <fog attach="fog" args={['#040810', 8, 18]}/>
            <CameraTracker onZoomChange={setZoomLevel}/>
            <Scene
              injuries={injuries}
              hovered={hovered}
              zoomLevel={zoomLevel}
              onHover={setHovered}
              onZoneClick={handleZoneClick}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              minDistance={1.4}
              maxDistance={5.5}
              minPolarAngle={0.2}
              maxPolarAngle={2.5}
              dampingFactor={0.06}
              enableDamping
              rotateSpeed={0.6}
              zoomSpeed={0.8}
            />
          </Canvas>
        </div>

        {/* Right panel */}
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
                  { icon:'🔭', text:'Vue globale : gros groupes musculaires visibles' },
                  { icon:'🔍', text:'Zoom moyen : muscles specifiques (trapeze, deltoide...)' },
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
                {[...active,...improving].map(inj=>{
                  const c=iColor(inj.intensity)
                  const cfg=STATUS_CFG[inj.status]
                  return(
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
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:13, boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 8px' }}>Legende</p>
            {[
              { c:'#4878b0', label:'Muscles visibles' },
              { c:'#22c55e', label:'Douleur legere (1-3)' },
              { c:'#ffb340', label:'Douleur moderee (4-6)' },
              { c:'#ef4444', label:'Douleur severe (7-10)' },
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
