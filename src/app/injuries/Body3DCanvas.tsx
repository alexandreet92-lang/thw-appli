'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'

type ZoomLevel = 'far' | 'mid' | 'close'
type Status = 'actif' | 'amelioration' | 'gueri'

interface MuscleZone {
  id: string
  label: string
  group: string
  position: [number, number, number]
  scale: [number, number, number]
  minZoom: ZoomLevel
  color: string
}

interface Injury {
  id: string
  zoneId: string
  zoneLabel: string
  status: Status
  intensity: number
  type: string
  painType: string
  context: string
  date: string
  comment: string
  history: { date: string; intensity: number; note: string }[]
  aiAnalysis: string
}

function iColor(v: number): string {
  if (v <= 3) return '#22c55e'
  if (v <= 6) return '#ffb340'
  return '#ef4444'
}

function MuscleMesh({ zone, injuries, hovered, zoomLevel, onHover, onClick }: {
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

  const zoomOrder: ZoomLevel[] = ['far', 'mid', 'close']
  const isVisible = zoomOrder.indexOf(zoomLevel) >= zoomOrder.indexOf(zone.minZoom)

  const baseColor = new THREE.Color(zone.color)
  const injColor = hasInj ? new THREE.Color(iColor(inj!.intensity)) : baseColor
  const emissiveColor = isHov ? new THREE.Color('#00c8e0') : hasInj ? new THREE.Color(iColor(inj!.intensity)) : new THREE.Color(zone.color).multiplyScalar(0.3)

  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    const targetOp = isVisible ? (isHov ? 0.95 : hasInj ? 0.80 : 0.65) : 0
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOp, 0.08)
    const targetEmi = isHov ? 0.5 : hasInj ? 0.3 : 0.05
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmi, 0.1)
    if (hasInj) {
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.04
      meshRef.current.scale.setScalar(pulse)
    } else {
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, isHov ? 1.08 : 1, 0.1))
    }
  })

  if (!isVisible && !hasInj) return null

  return (
    <mesh
      ref={meshRef}
      position={zone.position}
      onClick={e => { e.stopPropagation(); onClick(zone) }}
      onPointerEnter={e => { e.stopPropagation(); onHover(zone.id) }}
      onPointerLeave={e => { e.stopPropagation(); onHover(null) }}
      castShadow
    >
      <capsuleGeometry args={[Math.min(zone.scale[0], zone.scale[2]) * 0.95, zone.scale[1] * 1.6, 8, 16]}/>
      <meshStandardMaterial
        color={injColor}
        emissive={emissiveColor}
        emissiveIntensity={0.05}
        roughness={0.45}
        metalness={0.15}
        transparent
        opacity={0}
      />
      {(isHov || hasInj) && (
        <Html position={[0, zone.scale[1] + 0.08, 0]} distanceFactor={8} style={{ pointerEvents:'none' }}>
          <div style={{
            background:'rgba(4,8,16,0.92)',
            border:`1px solid ${hasInj ? iColor(inj!.intensity) : 'rgba(0,200,224,0.5)'}`,
            borderRadius:8, padding:'4px 10px',
            fontSize:10, fontWeight:600,
            color: hasInj ? iColor(inj!.intensity) : '#00c8e0',
            whiteSpace:'nowrap', backdropFilter:'blur(8px)',
            fontFamily:'DM Sans,sans-serif',
            transform:'translateY(-8px)',
          }}>
            {zone.label}
            {hasInj && <span style={{ marginLeft:6, opacity:0.8 }}>{inj!.intensity}/10</span>}
          </div>
        </Html>
      )}
    </mesh>
  )
}

function HumanBody() {
  const bm = { color: new THREE.Color('#1a2a3a'), roughness:0.7, metalness:0.1, transparent:true, opacity:0.88 }
  const jm = { color: new THREE.Color('#243444'), roughness:0.5, metalness:0.2, transparent:true, opacity:0.9 }
  return (
    <group position={[0,-0.9,0]}>
      <mesh position={[0,1.72,0]} castShadow><sphereGeometry args={[0.13,32,32]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0,1.59,0]} castShadow><cylinderGeometry args={[0.042,0.050,0.14,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0,1.34,0]} castShadow><capsuleGeometry args={[0.148,0.30,8,24]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0,1.10,0]} castShadow><capsuleGeometry args={[0.130,0.18,8,24]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0,0.92,0]} castShadow><capsuleGeometry args={[0.125,0.10,8,24]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[-0.12,1.54,0.04]} rotation={[0,0,0.4]} castShadow><cylinderGeometry args={[0.018,0.018,0.20,8]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[0.12,1.54,0.04]} rotation={[0,0,-0.4]} castShadow><cylinderGeometry args={[0.018,0.018,0.20,8]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[-0.21,1.44,0]} rotation={[0,0,0.18]} castShadow><capsuleGeometry args={[0.052,0.28,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0.21,1.44,0]} rotation={[0,0,-0.18]} castShadow><capsuleGeometry args={[0.052,0.28,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[-0.23,1.12,0]} rotation={[0,0,0.08]} castShadow><capsuleGeometry args={[0.042,0.24,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0.23,1.12,0]} rotation={[0,0,-0.08]} castShadow><capsuleGeometry args={[0.042,0.24,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[-0.24,0.94,0]} castShadow><sphereGeometry args={[0.044,12,12]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[0.24,0.94,0]} castShadow><sphereGeometry args={[0.044,12,12]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[-0.105,0.60,0]} castShadow><capsuleGeometry args={[0.070,0.36,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0.105,0.60,0]} castShadow><capsuleGeometry args={[0.070,0.36,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[-0.105,0.40,0]} castShadow><sphereGeometry args={[0.055,16,16]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[0.105,0.40,0]} castShadow><sphereGeometry args={[0.055,16,16]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[-0.103,0.20,0]} castShadow><capsuleGeometry args={[0.052,0.32,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0.103,0.20,0]} castShadow><capsuleGeometry args={[0.052,0.32,8,16]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[-0.103,0.05,0]} castShadow><sphereGeometry args={[0.042,12,12]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[0.103,0.05,0]} castShadow><sphereGeometry args={[0.042,12,12]}/><meshStandardMaterial {...jm}/></mesh>
      <mesh position={[-0.103,0.02,0.055]} rotation={[0.3,0,0]} castShadow><capsuleGeometry args={[0.036,0.12,8,12]}/><meshStandardMaterial {...bm}/></mesh>
      <mesh position={[0.103,0.02,0.055]} rotation={[0.3,0,0]} castShadow><capsuleGeometry args={[0.036,0.12,8,12]}/><meshStandardMaterial {...bm}/></mesh>
    </group>
  )
}

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

interface Props {
  injuries: Injury[]
  hovered: string | null
  zoomLevel: ZoomLevel
  onHover: (id: string | null) => void
  onZoneClick: (zone: MuscleZone) => void
  onZoomChange: (z: ZoomLevel) => void
  muscleZones: MuscleZone[]
}

export default function Body3DCanvas({ injuries, hovered, zoomLevel, onHover, onZoneClick, onZoomChange, muscleZones }: Props) {
  return (
    <Canvas
      camera={{ position:[0,0.8,4.0], fov:40 }}
      shadows
      gl={{ antialias:true, alpha:false, powerPreference:'high-performance' }}
      style={{ width:'100%', height:'100%', minHeight:520 }}
    >
      <color attach="background" args={['#040810']}/>
      <fog attach="fog" args={['#040810', 8, 18]}/>
      <ambientLight intensity={0.5}/>
      <directionalLight position={[3,5,3]} intensity={1.4} castShadow shadow-mapSize={[2048,2048]}/>
      <directionalLight position={[-3,3,-2]} intensity={0.5} color="#80b0ff"/>
      <pointLight position={[0,3,2]} intensity={0.8} color="#00c8e0" distance={8}/>
      <pointLight position={[0,0,-3]} intensity={0.3} color="#4060a0" distance={6}/>
      <Environment preset="night"/>
      <CameraTracker onZoomChange={onZoomChange}/>
      <group position={[0,-0.1,0]}>
        <HumanBody/>
        {muscleZones.map(zone => (
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
  )
}
