'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type InjuryType = 'douleur' | 'gene' | 'blessure'
type PainType   = 'musculaire' | 'articulaire' | 'tendineuse'
type Context    = 'entrainement' | 'repos' | 'progressif' | 'soudain'
type Status     = 'actif' | 'amelioration' | 'gueri'

interface BodyZone {
  id: string
  label: string
  path: string
  cx: number
  cy: number
  side: 'front' | 'back'
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

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  actif:        { label: 'Actif',           color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  amelioration: { label: 'En amelioration', color: '#ffb340', bg: 'rgba(255,179,64,0.12)'  },
  gueri:        { label: 'Gueri',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
}

function iColor(v: number): string {
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
    progressif:   'Surmenage progressif (overuse).',
    soudain:      'Lesion aigue probable — soyez prudent.',
  }
  const reco = intensity >= 7
    ? "Stop entrainement sur cette zone. Kinesitherapeute sous 48h."
    : "Adapter l'intensite. Eviter les efforts sur cette zone. Recup active."
  const alert = intensity >= 7
    ? "Si douleur > 3 jours ou s'intensifie : consulte immediatement."
    : "Surveille 3-5 jours. Pas d'amelioration = consultation."
  return `CAUSE\n${ctx[context]}\n\nRECOMMANDATION\n${reco}\n\nALERTE\n${alert}`
}

// ── SVG paths for a realistic human silhouette ─────
// Front zones
const FRONT_ZONES: BodyZone[] = [
  { id:'head',    label:'Tete / Cou',           path:'M200,18 C218,18 232,30 234,46 C236,62 228,76 216,82 C210,85 200,86 200,86 C200,86 190,85 184,82 C172,76 164,62 166,46 C168,30 182,18 200,18Z', cx:200, cy:52, side:'front' },
  { id:'neck_f',  label:'Cou',                  path:'M188,86 C192,88 196,90 200,90 C204,90 208,88 212,86 L214,106 C210,108 206,109 200,109 C194,109 190,108 186,106Z', cx:200, cy:97, side:'front' },
  { id:'sho_l',   label:'Epaule gauche',         path:'M140,106 C130,108 122,116 118,126 C114,136 116,148 124,154 C130,158 138,158 144,154 L154,130 C158,120 156,110 148,106Z', cx:133, cy:130, side:'front' },
  { id:'sho_r',   label:'Epaule droite',         path:'M260,106 C270,108 278,116 282,126 C286,136 284,148 276,154 C270,158 262,158 256,154 L246,130 C242,120 244,110 252,106Z', cx:267, cy:130, side:'front' },
  { id:'chest',   label:'Pectoraux',             path:'M154,106 C162,104 176,102 200,102 C224,102 238,104 246,106 L248,142 C244,150 228,158 200,158 C172,158 156,150 152,142Z', cx:200, cy:132, side:'front' },
  { id:'bic_l',   label:'Biceps gauche',         path:'M118,126 C114,132 112,140 112,150 C112,160 114,170 118,178 L136,174 C138,166 138,156 136,146 C134,136 130,128 124,124Z', cx:118, cy:152, side:'front' },
  { id:'bic_r',   label:'Biceps droit',          path:'M282,126 C286,132 288,140 288,150 C288,160 286,170 282,178 L264,174 C262,166 262,156 264,146 C266,136 270,128 276,124Z', cx:282, cy:152, side:'front' },
  { id:'core',    label:'Abdominaux / Core',      path:'M152,142 C156,150 170,160 200,162 C230,160 244,150 248,142 L246,196 C240,206 224,214 200,214 C176,214 160,206 154,196Z', cx:200, cy:180, side:'front' },
  { id:'far_l',   label:'Avant-bras gauche',      path:'M112,178 C110,186 110,196 112,208 C114,218 118,226 124,230 L138,222 C136,214 134,204 134,194 C134,184 136,176 138,172L118,176Z', cx:115, cy:202, side:'front' },
  { id:'far_r',   label:'Avant-bras droit',       path:'M288,178 C290,186 290,196 288,208 C286,218 282,226 276,230 L262,222 C264,214 266,204 266,194 C266,184 264,176 262,172L282,176Z', cx:285, cy:202, side:'front' },
  { id:'hip_l',   label:'Hanche gauche',          path:'M154,196 C158,204 162,212 164,222 C166,232 166,240 164,246 L188,248 C190,238 190,228 188,218 C186,208 182,200 178,196Z', cx:163, cy:222, side:'front' },
  { id:'hip_r',   label:'Hanche droite',          path:'M246,196 C242,204 238,212 236,222 C234,232 234,240 236,246 L212,248 C210,238 210,228 212,218 C214,208 218,200 222,196Z', cx:237, cy:222, side:'front' },
  { id:'qua_l',   label:'Quadriceps gauche',      path:'M164,246 C162,254 160,264 160,276 C160,296 162,316 166,332 L186,328 C184,314 184,296 184,278 C184,262 184,250 184,248Z', cx:165, cy:290, side:'front' },
  { id:'qua_r',   label:'Quadriceps droit',       path:'M236,246 C238,254 240,264 240,276 C240,296 238,316 234,332 L214,328 C216,314 216,296 216,278 C216,262 216,250 216,248Z', cx:235, cy:290, side:'front' },
  { id:'kne_l',   label:'Genou gauche',           path:'M166,332 C164,340 163,348 164,356 C165,364 168,370 174,374 L184,370 C182,364 180,356 180,348 C180,340 182,334 184,330Z', cx:168, cy:353, side:'front' },
  { id:'kne_r',   label:'Genou droit',            path:'M234,332 C236,340 237,348 236,356 C235,364 232,370 226,374 L216,370 C218,364 220,356 220,348 C220,340 218,334 216,330Z', cx:232, cy:353, side:'front' },
  { id:'shi_l',   label:'Tibia / Jambe gauche',   path:'M174,374 C170,382 168,394 168,408 C168,422 170,436 174,446 L186,442 C184,430 182,416 182,404 C182,392 184,382 186,376Z', cx:172, cy:410, side:'front' },
  { id:'shi_r',   label:'Tibia / Jambe droite',   path:'M226,374 C230,382 232,394 232,408 C232,422 230,436 226,446 L214,442 C216,430 218,416 218,404 C218,392 216,382 214,376Z', cx:228, cy:410, side:'front' },
  { id:'ank_l',   label:'Cheville gauche',        path:'M168,446 C166,452 166,458 168,464 C170,468 174,470 180,470 C184,470 187,468 188,464 L186,444Z', cx:176, cy:458, side:'front' },
  { id:'ank_r',   label:'Cheville droite',        path:'M232,446 C234,452 234,458 232,464 C230,468 226,470 220,470 C216,470 213,468 212,464 L214,444Z', cx:224, cy:458, side:'front' },
]

const BACK_ZONES: BodyZone[] = [
  { id:'neck_b',  label:'Nuque / Cervicales',     path:'M188,86 C192,88 196,90 200,90 C204,90 208,88 212,86 L214,110 C210,112 206,113 200,113 C194,113 190,112 186,110Z', cx:200, cy:99, side:'back' },
  { id:'tra_l',   label:'Trapeze gauche',          path:'M140,106 C130,108 122,116 118,126 L138,128 C144,120 150,114 158,110 L154,106Z', cx:138, cy:117, side:'back' },
  { id:'tra_r',   label:'Trapeze droit',           path:'M260,106 C270,108 278,116 282,126 L262,128 C256,120 250,114 242,110 L246,106Z', cx:262, cy:117, side:'back' },
  { id:'uback',   label:'Haut du dos',             path:'M158,110 C170,106 184,104 200,104 C216,104 230,106 242,110 L244,150 C236,156 220,160 200,160 C180,160 164,156 156,150Z', cx:200, cy:134, side:'back' },
  { id:'tri_l',   label:'Triceps gauche',          path:'M118,126 C114,134 112,144 112,154 C112,162 114,170 118,178 L134,172 C132,164 132,154 134,144 C136,134 138,126 140,122Z', cx:117, cy:152, side:'back' },
  { id:'tri_r',   label:'Triceps droit',           path:'M282,126 C286,134 288,144 288,154 C288,162 286,170 282,178 L266,172 C268,164 268,154 266,144 C264,134 262,126 260,122Z', cx:283, cy:152, side:'back' },
  { id:'lback',   label:'Lombaires',               path:'M156,150 C164,156 180,162 200,164 C220,162 236,156 244,150 L242,196 C234,206 220,212 200,214 C180,212 166,206 158,196Z', cx:200, cy:182, side:'back' },
  { id:'glu_l',   label:'Fessier gauche',          path:'M158,196 C162,204 164,214 164,224 C164,236 162,244 160,250 L186,250 C186,240 186,228 184,218 C182,208 178,200 174,196Z', cx:163, cy:224, side:'back' },
  { id:'glu_r',   label:'Fessier droit',           path:'M242,196 C238,204 236,214 236,224 C236,236 238,244 240,250 L214,250 C214,240 214,228 216,218 C218,208 222,200 226,196Z', cx:237, cy:224, side:'back' },
  { id:'ham_l',   label:'Ischio-jambier gauche',   path:'M160,250 C158,262 158,276 160,292 C162,308 166,324 170,334 L186,328 C184,316 182,302 182,288 C182,274 182,260 182,252Z', cx:165, cy:292, side:'back' },
  { id:'ham_r',   label:'Ischio-jambier droit',    path:'M240,250 C242,262 242,276 240,292 C238,308 234,324 230,334 L214,328 C216,316 218,302 218,288 C218,274 218,260 218,252Z', cx:235, cy:292, side:'back' },
  { id:'cal_l',   label:'Mollet gauche',           path:'M170,334 C168,344 166,356 166,368 C166,382 168,396 172,408 C174,416 178,422 182,426 L188,420 C186,412 184,400 184,386 C184,372 186,360 188,350 L186,330Z', cx:170, cy:380, side:'back' },
  { id:'cal_r',   label:'Mollet droit',            path:'M230,334 C232,344 234,356 234,368 C234,382 232,396 228,408 C226,416 222,422 218,426 L212,420 C214,412 216,400 216,386 C216,372 214,360 212,350 L214,330Z', cx:230, cy:380, side:'back' },
  { id:'ach_l',   label:"Tendon Achille gauche",   path:'M182,426 C180,432 178,440 178,448 C178,454 180,460 184,464 L192,462 C190,456 190,448 192,442 L188,422Z', cx:182, cy:446, side:'back' },
  { id:'ach_r',   label:"Tendon Achille droit",    path:'M218,426 C220,432 222,440 222,448 C222,454 220,460 216,464 L208,462 C210,456 210,448 208,442 L212,422Z', cx:218, cy:446, side:'back' },
]

const MOCK_INJURIES: Injury[] = [
  {
    id:'i1', zoneId:'kne_l', zoneLabel:'Genou gauche', type:'gene', painType:'articulaire',
    intensity:5, context:'entrainement', date:'2025-03-10', comment:'Douleur descente escaliers',
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

// ── Body SVG component ─────────────────────────────
function BodySVG({
  side,
  injuries,
  hoveredZone,
  onHover,
  onZoneClick,
  rotateY,
}: {
  side: 'front' | 'back'
  injuries: Injury[]
  hoveredZone: string | null
  onHover: (id: string | null) => void
  onZoneClick: (zone: BodyZone) => void
  rotateY: number
}) {
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES

  function getFill(zone: BodyZone): string {
    const inj = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
    if (inj) return iColor(inj.intensity) + '55'
    if (hoveredZone === zone.id) return 'rgba(0,200,224,0.35)'
    return 'rgba(0,200,224,0.05)'
  }

  function getStroke(zone: BodyZone): string {
    const inj = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
    if (inj) return iColor(inj.intensity)
    if (hoveredZone === zone.id) return '#00c8e0'
    return 'rgba(0,200,224,0.18)'
  }

  function getStrokeWidth(zone: BodyZone): number {
    const inj = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
    if (inj || hoveredZone === zone.id) return 1.5
    return 0.8
  }

  const perspective = Math.abs(Math.cos(rotateY * Math.PI / 180))
  const skewX = Math.sin(rotateY * Math.PI / 180) * 8

  return (
    <svg
      viewBox="0 0 400 490"
      style={{
        width: '100%',
        maxWidth: 320,
        height: 'auto',
        transform: `perspective(800px) rotateY(${rotateY % 360}deg)`,
        transition: 'none',
        filter: 'drop-shadow(0 8px 32px rgba(0,200,224,0.12))',
        userSelect: 'none',
      }}
    >
      <defs>
        {/* Body gradient */}
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8d8e8" stopOpacity="0.95"/>
          <stop offset="50%" stopColor="#b0c4d8" stopOpacity="0.90"/>
          <stop offset="100%" stopColor="#9ab4cc" stopOpacity="0.85"/>
        </linearGradient>
        <linearGradient id="bodyGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a3a4a" stopOpacity="0.95"/>
          <stop offset="50%" stopColor="#1e2e3e" stopOpacity="0.90"/>
          <stop offset="100%" stopColor="#162433" stopOpacity="0.85"/>
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0.8 0.9 0 0  0 0.9 1 0 0  0 0 0 0.8 0" result="colored"/>
          <feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="headShade" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ddeeff" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#8aa0b8" stopOpacity="0.1"/>
        </radialGradient>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="200" cy="245" rx="130" ry="220" fill="rgba(0,200,224,0.03)"/>

      {side === 'front' ? (
        <g>
          {/* Shadow under feet */}
          <ellipse cx="200" cy="482" rx="80" ry="6" fill="rgba(0,0,0,0.15)"/>
          {/* Head */}
          <ellipse cx="200" cy="50" rx="32" ry="36" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.4)" strokeWidth="1.2"/>
          <ellipse cx="200" cy="50" rx="32" ry="36" fill="url(#headShade)"/>
          {/* Neck */}
          <path d="M188,84 L188,100 C192,103 196,104 200,104 C204,104 208,103 212,100 L212,84 C208,87 204,88 200,88 C196,88 192,87 188,84Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Torso */}
          <path d="M152,104 C162,100 178,98 200,98 C222,98 238,100 248,104 L252,170 L250,200 C244,214 226,222 200,222 C174,222 156,214 150,200 L148,170Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.35)" strokeWidth="1.2"/>
          {/* Chest line */}
          <path d="M175,120 C182,128 192,132 200,132 C208,132 218,128 225,120" fill="none" stroke="rgba(0,200,224,0.15)" strokeWidth="0.8"/>
          {/* Abs lines */}
          <path d="M190,150 L190,200 M200,148 L200,202 M210,150 L210,200" fill="none" stroke="rgba(0,200,224,0.12)" strokeWidth="0.7"/>
          <path d="M184,166 C190,168 200,168 216,166 M184,182 C190,184 200,184 216,182" fill="none" stroke="rgba(0,200,224,0.12)" strokeWidth="0.7"/>
          {/* Pelvis */}
          <path d="M150,200 C156,218 172,230 200,232 C228,230 244,218 250,200 L250,212 C244,226 228,238 200,240 C172,238 156,226 150,212Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Left arm */}
          <path d="M152,104 C140,106 128,116 120,130 C114,144 112,160 114,176 C116,190 120,202 126,210 L140,206 C136,198 132,186 130,172 C128,158 130,144 136,132 C142,120 150,110 158,106Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Right arm */}
          <path d="M248,104 C260,106 272,116 280,130 C286,144 288,160 286,176 C284,190 280,202 274,210 L260,206 C264,198 268,186 270,172 C272,158 270,144 264,132 C258,120 250,110 242,106Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Left forearm + hand */}
          <path d="M126,210 C122,222 120,236 122,250 C124,262 128,272 134,278 L142,270 C138,264 136,254 136,242 C136,230 138,220 140,212Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          <ellipse cx="138" cy="280" rx="12" ry="9" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="0.8"/>
          {/* Right forearm + hand */}
          <path d="M274,210 C278,222 280,236 278,250 C276,262 272,272 266,278 L258,270 C262,264 264,254 264,242 C264,230 262,220 260,212Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          <ellipse cx="262" cy="280" rx="12" ry="9" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="0.8"/>
          {/* Left thigh */}
          <path d="M172,240 C164,244 158,254 156,268 C154,282 154,298 156,314 C158,326 162,336 168,342 L184,338 C180,330 178,320 178,308 C178,296 178,282 180,270 C182,260 184,250 186,244Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Right thigh */}
          <path d="M228,240 C236,244 242,254 244,268 C246,282 246,298 244,314 C242,326 238,336 232,342 L216,338 C220,330 222,320 222,308 C222,296 222,282 220,270 C218,260 216,250 214,244Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Left knee */}
          <ellipse cx="172" cy="352" rx="18" ry="14" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Right knee */}
          <ellipse cx="228" cy="352" rx="18" ry="14" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Left shin */}
          <path d="M160,366 C156,378 154,394 154,410 C154,424 156,436 160,446 L176,442 C174,432 174,420 174,408 C174,396 176,384 178,374Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Right shin */}
          <path d="M240,366 C244,378 246,394 246,410 C246,424 244,436 240,446 L224,442 C226,432 226,420 226,408 C226,396 224,384 222,374Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Left foot */}
          <path d="M154,446 C150,454 148,462 150,468 C152,472 158,475 166,475 C174,475 178,472 178,468 L176,444Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Right foot */}
          <path d="M246,446 C250,454 252,462 250,468 C248,472 242,475 234,475 C226,475 222,472 222,468 L224,444Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Shading overlay */}
          <path d="M152,104 C160,100 178,98 200,98 L200,240 C172,238 156,226 150,212 L148,170Z" fill="rgba(255,255,255,0.04)"/>
        </g>
      ) : (
        <g>
          {/* Shadow */}
          <ellipse cx="200" cy="482" rx="80" ry="6" fill="rgba(0,0,0,0.15)"/>
          {/* Head back */}
          <ellipse cx="200" cy="50" rx="32" ry="36" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.4)" strokeWidth="1.2"/>
          {/* Neck back */}
          <path d="M188,84 L188,100 C192,103 196,104 200,104 C204,104 208,103 212,100 L212,84 C208,87 204,88 200,88 C196,88 192,87 188,84Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Back torso */}
          <path d="M152,104 C162,100 178,98 200,98 C222,98 238,100 248,104 L252,170 L250,200 C244,214 226,222 200,222 C174,222 156,214 150,200 L148,170Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.35)" strokeWidth="1.2"/>
          {/* Spine line */}
          <path d="M200,104 L200,224" fill="none" stroke="rgba(0,200,224,0.15)" strokeWidth="0.8"/>
          {/* Shoulder blades */}
          <path d="M160,118 C162,126 166,134 172,138 C176,140 182,138 184,134" fill="none" stroke="rgba(0,200,224,0.18)" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M240,118 C238,126 234,134 228,138 C224,140 218,138 216,134" fill="none" stroke="rgba(0,200,224,0.18)" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Pelvis back */}
          <path d="M150,200 C156,218 172,230 200,232 C228,230 244,218 250,200 L250,212 C244,226 228,238 200,240 C172,238 156,226 150,212Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Left arm back */}
          <path d="M152,104 C140,106 128,116 120,130 C114,144 112,160 114,176 C116,190 120,202 126,210 L140,206 C136,198 132,186 130,172 C128,158 130,144 136,132 C142,120 150,110 158,106Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Right arm back */}
          <path d="M248,104 C260,106 272,116 280,130 C286,144 288,160 286,176 C284,190 280,202 274,210 L260,206 C264,198 268,186 270,172 C272,158 270,144 264,132 C258,120 250,110 242,106Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Forearms back */}
          <path d="M126,210 C122,222 120,236 122,250 C124,262 128,272 134,278 L142,270 C138,264 136,254 136,242 C136,230 138,220 140,212Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          <path d="M274,210 C278,222 280,236 278,250 C276,262 272,272 266,278 L258,270 C262,264 264,254 264,242 C264,230 262,220 260,212Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          {/* Glutes */}
          <path d="M160,224 C158,232 158,240 162,248 C166,254 172,258 180,258 C184,258 188,256 190,252 C192,256 196,260 200,260 C204,260 208,256 210,252 C212,256 216,258 220,258 C228,258 234,254 238,248 C242,240 242,232 240,224 C232,226 218,228 200,228 C182,228 168,226 160,224Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.3)" strokeWidth="1"/>
          {/* Hamstrings */}
          <path d="M164,258 C160,270 158,284 158,298 C158,312 160,326 164,338 L180,334 C178,322 178,308 178,296 C178,284 180,272 182,262Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          <path d="M236,258 C240,270 242,284 242,298 C242,312 240,326 236,338 L220,334 C222,322 222,308 222,296 C222,284 220,272 218,262Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Calves */}
          <path d="M164,338 C160,350 158,364 160,378 C162,390 166,400 172,408 C176,414 182,418 186,418 L188,412 C184,408 180,400 178,390 C176,378 176,364 178,352Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          <path d="M236,338 C240,350 242,364 240,378 C238,390 234,400 228,408 C224,414 218,418 212,418 L212,412 C216,408 220,400 222,390 C224,378 224,364 222,352Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Achilles + feet back */}
          <path d="M180,420 L178,448 C176,456 176,464 178,468 C180,472 184,474 188,474 C192,474 196,472 196,468 L194,440Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="0.9"/>
          <path d="M220,420 L222,448 C224,456 224,464 222,468 C220,472 216,474 212,474 C208,474 204,472 204,468 L206,440Z" fill="url(#bodyGrad)" stroke="rgba(0,200,224,0.25)" strokeWidth="0.9"/>
        </g>
      )}

      {/* Clickable zones */}
      {zones.map(zone => {
        const inj = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
        const isHov = hoveredZone === zone.id
        const hasInj = !!inj
        return (
          <g key={zone.id}>
            <path
              d={zone.path}
              fill={getFill(zone)}
              stroke={getStroke(zone)}
              strokeWidth={getStrokeWidth(zone)}
              style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
              filter={hasInj ? 'url(#glow)' : isHov ? 'url(#softglow)' : undefined}
              onMouseEnter={() => onHover(zone.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onZoneClick(zone)}
            />
            {hasInj && inj && (
              <circle
                cx={zone.cx + 12} cy={zone.cy - 10} r={7}
                fill={iColor(inj.intensity)}
                stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"
                style={{ pointerEvents: 'none' }}
                filter="url(#glow)"
              />
            )}
            {isHov && (
              <text
                x={zone.cx} y={zone.cy + 4}
                textAnchor="middle"
                style={{
                  fontSize: 9,
                  fill: '#00c8e0',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  pointerEvents: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}
              >
                {zone.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Add Injury Modal ───────────────────────────────
function AddInjuryModal({ zone, onClose, onSave }: { zone: BodyZone; onClose: () => void; onSave: (i: Injury) => void }) {
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border-mid)', padding: 24, maxWidth: 460, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>Nouvelle blessure</h3>
            <p style={{ fontSize: 12, color: '#00c8e0', margin: '3px 0 0', fontWeight: 600 }}>{zone.label}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 9, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 18 }}>x</button>
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 7 }}>Type</p>
        <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
          {(['douleur','gene','blessure'] as InjuryType[]).map(t => (
            <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: type === t ? 600 : 400, borderColor: type === t ? '#ef4444' : 'var(--border)', background: type === t ? 'rgba(239,68,68,0.12)' : 'var(--bg-card2)', color: type === t ? '#ef4444' : 'var(--text-mid)' }}>{t}</button>
          ))}
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 7 }}>Type de douleur</p>
        <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
          {(['musculaire','articulaire','tendineuse'] as PainType[]).map(t => (
            <button key={t} onClick={() => setPainType(t)} style={{ flex: 1, padding: '7px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 10, fontWeight: painType === t ? 600 : 400, borderColor: painType === t ? '#f97316' : 'var(--border)', background: painType === t ? 'rgba(249,115,22,0.12)' : 'var(--bg-card2)', color: painType === t ? '#f97316' : 'var(--text-mid)' }}>{t}</button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: 0 }}>Intensite</p>
            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 18, fontWeight: 700, color: c }}>{intensity}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>/10</span></span>
          </div>
          <input type="range" min={1} max={10} step={1} value={intensity} onChange={e => setIntensity(parseInt(e.target.value))} style={{ width: '100%', accentColor: c, cursor: 'pointer' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-dim)', marginTop: 3 }}>
            <span>Legere</span><span>Moderee</span><span>Severe</span>
          </div>
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 7 }}>Contexte</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 16 }}>
          {(['entrainement','repos','progressif','soudain'] as Context[]).map(ct => (
            <button key={ct} onClick={() => setContext(ct)} style={{ padding: '8px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: context === ct ? 600 : 400, borderColor: context === ct ? '#a855f7' : 'var(--border)', background: context === ct ? 'rgba(168,85,247,0.12)' : 'var(--bg-card2)', color: context === ct ? '#a855f7' : 'var(--text-mid)' }}>{ct}</button>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 6 }}>Date</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Mono,monospace', fontSize: 13, outline: 'none' }}/>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 6 }}>Commentaire</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Description de la douleur..." style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none' as const, fontFamily: 'DM Sans,sans-serif' }}/>
        </div>
        <button onClick={save} style={{ width: '100%', padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#f97316)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Enregistrer + Analyse IA
        </button>
      </div>
    </div>
  )
}

// ── Injury Detail Panel ────────────────────────────
function InjuryDetail({ injury, onClose, onUpdate }: { injury: Injury; onClose: () => void; onUpdate: (i: Injury) => void }) {
  const [status,   setStatus]   = useState<Status>(injury.status)
  const [newNote,  setNewNote]  = useState('')
  const [newInt,   setNewInt]   = useState(injury.intensity)
  const c = iColor(injury.intensity)
  const cfg = STATUS_CFG[status]

  function addEntry() {
    if (!newNote.trim()) return
    onUpdate({ ...injury, status, intensity: newInt, history: [...injury.history, { date: today(), intensity: newInt, note: newNote }] })
    setNewNote('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, border: `1px solid ${cfg.color}44` }}>{cfg.label}</span>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.10)', color: '#ef4444', fontSize: 10, fontWeight: 600 }}>{injury.type}</span>
          </div>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>{injury.zoneLabel}</h3>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{injury.painType} · depuis {injury.date}</p>
        </div>
        <button onClick={onClose} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16 }}>x</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: `${c}12`, border: `1px solid ${c}33` }}>
        <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: c, lineHeight: 1 }}>{injury.intensity}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 4px' }}>Intensite de la douleur</p>
          <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${injury.intensity * 10}%`, background: `linear-gradient(90deg,${c}88,${c})`, borderRadius: 999, transition: 'width 0.4s' }}/>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: '0 0 8px' }}>Evolution</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 50 }}>
          {injury.history.map((h, i) => {
            const hc = iColor(h.intensity)
            return (
              <div key={i} title={`${h.date}: ${h.intensity}/10 — ${h.note}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', height: `${(h.intensity / 10) * 50}px`, background: `linear-gradient(180deg,${hc}cc,${hc}44)`, borderRadius: '3px 3px 0 0', minHeight: 3 }}/>
                <span style={{ fontSize: 7, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>{h.date.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,200,224,0.06)', border: '1px solid rgba(0,200,224,0.18)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#00c8e0', margin: '0 0 7px' }}>Analyse IA</p>
        <p style={{ fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' as const }}>{injury.aiAnalysis}</p>
      </div>

      <div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 7 }}>Statut</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['actif','amelioration','gueri'] as Status[]).map(s => {
            const sc = STATUS_CFG[s]
            return <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: '7px', borderRadius: 9, border: '1px solid', cursor: 'pointer', borderColor: status === s ? sc.color : 'var(--border)', background: status === s ? sc.bg : 'var(--bg-card2)', color: status === s ? sc.color : 'var(--text-mid)', fontSize: 10, fontWeight: status === s ? 600 : 400 }}>{sc.label}</button>
          })}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: 7 }}>Ajouter une entree</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>Intensite</span>
          <input type="range" min={0} max={10} step={1} value={newInt} onChange={e => setNewInt(parseInt(e.target.value))} style={{ flex: 1, accentColor: iColor(newInt), cursor: 'pointer' }}/>
          <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 700, color: iColor(newInt), minWidth: 30 }}>{newInt}/10</span>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Note du jour..." onKeyDown={e => e.key === 'Enter' && addEntry()} style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 12, outline: 'none' }}/>
          <button onClick={addEntry} style={{ padding: '8px 13px', borderRadius: 9, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <button onClick={() => onUpdate({ ...injury, status })} style={{ padding: 11, borderRadius: 12, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        Sauvegarder
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function BlessuresPage() {
  const [injuries,    setInjuries]    = useState<Injury[]>(MOCK_INJURIES)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [addModal,    setAddModal]    = useState<BodyZone | null>(null)
  const [selectedInj, setSelectedInj] = useState<Injury | null>(null)
  const [side,        setSide]        = useState<'front' | 'back'>('front')
  const [rotateY,     setRotateY]     = useState(0)
  const [isDragging,  setIsDragging]  = useState(false)
  const [zoom,        setZoom]        = useState(1)
  const dragStart = useRef<{ x: number; rotY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const active    = injuries.filter(i => i.status === 'actif')
  const improving = injuries.filter(i => i.status === 'amelioration')
  const healed    = injuries.filter(i => i.status === 'gueri')

  const globalStatus = active.some(i => i.intensity >= 7) ? 'risque' : active.length > 0 ? 'vigilance' : 'ok'
  const globalCfg = {
    ok:        { label: 'Corps OK',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
    vigilance: { label: 'Vigilance',   color: '#ffb340', bg: 'rgba(255,179,64,0.12)' },
    risque:    { label: 'Risque eleve',color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  }[globalStatus]

  // Drag to rotate
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, rotY: rotateY }
  }, [rotateY])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    const delta = e.clientX - dragStart.current.x
    const newRotY = dragStart.current.rotY + delta * 0.5
    setRotateY(newRotY)
    // Auto switch front/back based on rotation
    const normalized = ((newRotY % 360) + 360) % 360
    if (normalized > 90 && normalized < 270) {
      setSide('back')
    } else {
      setSide('front')
    }
  }, [isDragging])

  const onMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
  }, [])

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.touches[0].clientX, rotY: rotateY }
  }, [rotateY])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStart.current) return
    const delta = e.touches[0].clientX - dragStart.current.x
    const newRotY = dragStart.current.rotY + delta * 0.5
    setRotateY(newRotY)
    const normalized = ((newRotY % 360) + 360) % 360
    if (normalized > 90 && normalized < 270) {
      setSide('back')
    } else {
      setSide('front')
    }
  }, [isDragging])

  const onTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
  }, [])

  // Scroll to zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(prev => Math.min(2.0, Math.max(0.7, prev - e.deltaY * 0.001)))
  }, [])

  function handleZoneClick(zone: BodyZone) {
    const existing = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
    if (existing) setSelectedInj(existing)
    else setAddModal(zone)
  }

  function handleAdd(inj: Injury) {
    setInjuries(prev => [...prev, inj])
    setSelectedInj(inj)
  }

  function handleUpdate(updated: Injury) {
    setInjuries(prev => prev.map(i => i.id === updated.id ? updated : i))
    setSelectedInj(updated)
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {addModal && <AddInjuryModal zone={addModal} onClose={() => setAddModal(null)} onSave={handleAdd}/>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Blessures</h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 0' }}>Corps interactif · Drag pour tourner · Scroll pour zoomer</p>
        </div>
        <span style={{ padding: '6px 14px', borderRadius: 20, background: globalCfg.bg, border: `1px solid ${globalCfg.color}55`, color: globalCfg.color, fontSize: 12, fontWeight: 700 }}>
          {globalCfg.label}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { label: 'Actives',          value: active.length,    color: '#ef4444' },
          { label: 'En amelioration',  value: improving.length, color: '#ffb340' },
          { label: 'Gueries',          value: healed.length,    color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: '0 0 3px' }}>{s.label}</p>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }} className="md:grid-cols-[1fr_340px]">

        {/* 3D Body viewer */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card)', position: 'relative', minHeight: 480 }}>
          {/* Controls bar */}
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setSide('front'); setRotateY(0) }}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 10, fontWeight: side === 'front' ? 600 : 400, borderColor: side === 'front' ? '#00c8e0' : 'var(--border)', background: side === 'front' ? 'rgba(0,200,224,0.12)' : 'var(--bg-card2)', color: side === 'front' ? '#00c8e0' : 'var(--text-dim)' }}>
                Face
              </button>
              <button onClick={() => { setSide('back'); setRotateY(180) }}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 10, fontWeight: side === 'back' ? 600 : 400, borderColor: side === 'back' ? '#00c8e0' : 'var(--border)', background: side === 'back' ? 'rgba(0,200,224,0.12)' : 'var(--bg-card2)', color: side === 'back' ? '#00c8e0' : 'var(--text-dim)' }}>
                Dos
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setZoom(z => Math.min(2.0, z + 0.15))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              <button onClick={() => setZoom(1)} style={{ padding: '2px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 9 }}>{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => Math.max(0.7, z - 0.15))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
            </div>
          </div>

          {/* Canvas area */}
          <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={onWheel}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 480,
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,200,224,0.04) 0%, transparent 70%)',
              paddingTop: 56,
              paddingBottom: 20,
              userSelect: 'none',
            }}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.2s' }}>
              <BodySVG
                side={side}
                injuries={injuries}
                hoveredZone={hoveredZone}
                onHover={setHoveredZone}
                onZoneClick={handleZoneClick}
                rotateY={rotateY}
              />
            </div>
          </div>

          {/* Hover label bottom */}
          {hoveredZone && (
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', borderRadius: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,200,224,0.3)', fontSize: 11, color: '#00c8e0', fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap' as const }}>
              {(() => { const all = [...FRONT_ZONES, ...BACK_ZONES]; return all.find(z => z.id === hoveredZone)?.label })()}
              &nbsp;— Cliquer pour signaler
            </div>
          )}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 14, right: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { c: '#22c55e', label: 'Legere 1-3' },
              { c: '#ffb340', label: 'Moderee 4-6' },
              { c: '#ef4444', label: 'Severe 7-10' },
            ].map(x => (
              <span key={x.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text-dim)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c, flexShrink: 0, boxShadow: `0 0 5px ${x.c}` }}/>
                {x.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedInj ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
              <InjuryDetail injury={selectedInj} onClose={() => setSelectedInj(null)} onUpdate={handleUpdate}/>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Zone selectionnee</h3>
              <div style={{ textAlign: 'center' as const, padding: '18px 0' }}>
                <div style={{ fontSize: 36, margin: '0 0 8px' }}>+</div>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                  Clique sur une zone du corps pour signaler une douleur ou voir une blessure
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '8px 0 0', opacity: 0.6 }}>
                  Drag pour tourner · Scroll pour zoomer
                </p>
              </div>
            </div>
          )}

          {[...active, ...improving].length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Blessures en cours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...active, ...improving].map(inj => {
                  const c = iColor(inj.intensity)
                  const cfg = STATUS_CFG[inj.status]
                  const trend = inj.history.length > 1 ? inj.history[inj.history.length-1].intensity - inj.history[inj.history.length-2].intensity : 0
                  return (
                    <div key={inj.id} onClick={() => setSelectedInj(inj)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 10, background: 'var(--bg-card2)', borderLeft: `3px solid ${c}`, cursor: 'pointer' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 800, color: c }}>{inj.intensity}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{inj.zoneLabel}</p>
                          {trend !== 0 && <span style={{ fontSize: 9, color: trend < 0 ? '#22c55e' : '#ef4444' }}>{trend < 0 ? 'amelioration' : 'aggravation'}</span>}
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '1px 0 0' }}>{inj.type} · {inj.painType}</p>
                      </div>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {healed.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-dim)' }}>Historique gueries</h3>
              {healed.map(inj => (
                <div key={inj.id} onClick={() => setSelectedInj(inj)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'var(--bg-card2)', border: '1px solid var(--border)', cursor: 'pointer', opacity: 0.7, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#22c55e' }}>OK</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, margin: 0 }}>{inj.zoneLabel}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0 }}>{inj.date}</p>
                  </div>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 700 }}>Gueri</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
