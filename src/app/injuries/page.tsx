'use client'

import { useState, useRef } from 'react'

type InjuryType   = 'douleur' | 'gene' | 'blessure'
type PainType     = 'musculaire' | 'articulaire' | 'tendineuse'
type Context      = 'entrainement' | 'repos' | 'progressif' | 'soudain'
type Status       = 'actif' | 'amelioration' | 'gueri'
type BodySide     = 'front' | 'back'

interface BodyZone {
  id: string; label: string; cx: number; cy: number
  rx: number; ry: number; side: BodySide
}

interface Injury {
  id: string; zoneId: string; zoneLabel: string
  type: InjuryType; painType: PainType; intensity: number
  context: Context; date: string; comment: string
  status: Status
  history: { date: string; intensity: number; note: string }[]
  aiAnalysis: string
}

const ZONES_FRONT: BodyZone[] = [
  { id:'head',       label:'Tete / Cou',              cx:200, cy:52,  rx:28, ry:32, side:'front' },
  { id:'sho_l',      label:'Epaule gauche',            cx:135, cy:110, rx:20, ry:16, side:'front' },
  { id:'sho_r',      label:'Epaule droite',            cx:265, cy:110, rx:20, ry:16, side:'front' },
  { id:'chest',      label:'Pectoraux',                cx:200, cy:135, rx:38, ry:25, side:'front' },
  { id:'bic_l',      label:'Biceps gauche',            cx:122, cy:160, rx:13, ry:22, side:'front' },
  { id:'bic_r',      label:'Biceps droit',             cx:278, cy:160, rx:13, ry:22, side:'front' },
  { id:'core',       label:'Abdominaux / Core',        cx:200, cy:195, rx:32, ry:30, side:'front' },
  { id:'far_l',      label:'Avant-bras gauche',        cx:110, cy:210, rx:11, ry:20, side:'front' },
  { id:'far_r',      label:'Avant-bras droit',         cx:290, cy:210, rx:11, ry:20, side:'front' },
  { id:'hip_l',      label:'Hanche gauche',            cx:165, cy:255, rx:20, ry:18, side:'front' },
  { id:'hip_r',      label:'Hanche droite',            cx:235, cy:255, rx:20, ry:18, side:'front' },
  { id:'qua_l',      label:'Quadriceps gauche',        cx:162, cy:308, rx:22, ry:35, side:'front' },
  { id:'qua_r',      label:'Quadriceps droit',         cx:238, cy:308, rx:22, ry:35, side:'front' },
  { id:'kne_l',      label:'Genou gauche',             cx:162, cy:357, rx:18, ry:13, side:'front' },
  { id:'kne_r',      label:'Genou droit',              cx:238, cy:357, rx:18, ry:13, side:'front' },
  { id:'shi_l',      label:'Tibia gauche',             cx:160, cy:400, rx:14, ry:28, side:'front' },
  { id:'shi_r',      label:'Tibia droit',              cx:240, cy:400, rx:14, ry:28, side:'front' },
  { id:'ank_l',      label:'Cheville gauche',          cx:158, cy:445, rx:14, ry:10, side:'front' },
  { id:'ank_r',      label:'Cheville droite',          cx:242, cy:445, rx:14, ry:10, side:'front' },
]

const ZONES_BACK: BodyZone[] = [
  { id:'neck',       label:'Nuque / Cervicales',       cx:200, cy:82,  rx:22, ry:18, side:'back' },
  { id:'tra_l',      label:'Trapeze gauche',            cx:155, cy:110, rx:20, ry:16, side:'back' },
  { id:'tra_r',      label:'Trapeze droit',             cx:245, cy:110, rx:20, ry:16, side:'back' },
  { id:'uback',      label:'Haut du dos',               cx:200, cy:143, rx:38, ry:25, side:'back' },
  { id:'tri_l',      label:'Triceps gauche',            cx:122, cy:162, rx:13, ry:22, side:'back' },
  { id:'tri_r',      label:'Triceps droit',             cx:278, cy:162, rx:13, ry:22, side:'back' },
  { id:'lback',      label:'Lombaires',                 cx:200, cy:210, rx:30, ry:28, side:'back' },
  { id:'glu_l',      label:'Fessier gauche',            cx:168, cy:263, rx:24, ry:20, side:'back' },
  { id:'glu_r',      label:'Fessier droit',             cx:232, cy:263, rx:24, ry:20, side:'back' },
  { id:'ham_l',      label:'Ischio-jambier gauche',     cx:163, cy:315, rx:21, ry:35, side:'back' },
  { id:'ham_r',      label:'Ischio-jambier droit',      cx:237, cy:315, rx:21, ry:35, side:'back' },
  { id:'cal_l',      label:'Mollet gauche',             cx:160, cy:400, rx:16, ry:32, side:'back' },
  { id:'cal_r',      label:'Mollet droit',              cx:240, cy:400, rx:16, ry:32, side:'back' },
  { id:'ach_l',      label:"Tendon Achille gauche",     cx:156, cy:449, rx:12, ry:10, side:'back' },
  { id:'ach_r',      label:"Tendon Achille droit",      cx:244, cy:449, rx:12, ry:10, side:'back' },
]

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  actif:       { label:'Actif',         color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
  amelioration:{ label:'En amelioration', color:'#ffb340', bg:'rgba(255,179,64,0.12)' },
  gueri:       { label:'Gueri',         color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
}

function intensityColor(v: number): string {
  if (v <= 3) return '#22c55e'
  if (v <= 6) return '#ffb340'
  return '#ef4444'
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
    : "Adapte l'entrainement. Evite les seances intenses sur cette zone. Recuperation active conseillee."
  const alert = high
    ? "Si la douleur persiste plus de 3 jours ou s'intensifie, consulte immediatement."
    : "Surveille l'evolution 3-5 jours. Pas d'amelioration = consultation recommandee."
  return `CAUSE : ${ctxMsg[context]}\n\nRECOMMANDATION : ${reco}\n\nALERTE : ${alert}`
}

const MOCK_INJURIES: Injury[] = [
  {
    id:'i1', zoneId:'kne_l', zoneLabel:'Genou gauche', type:'gene', painType:'articulaire',
    intensity:5, context:'entrainement', date:'2025-03-10', comment:'Douleur a la descente des escaliers',
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
      {date:'2025-03-05', intensity:5, note:'Tension apres seance velo'},
      {date:'2025-03-12', intensity:4, note:'Stable'},
      {date:'2025-03-20', intensity:3, note:'Amelioration'},
    ],
    aiAnalysis: generateAI('Lombaires', 'douleur', 3, 'progressif'),
  },
]

// ── Human Body SVG ─────────────────────────────────
function HumanBody({
  side, injuries, hoveredZone, onHover, onZoneClick,
}: {
  side: BodySide
  injuries: Injury[]
  hoveredZone: string | null
  onHover: (id: string | null) => void
  onZoneClick: (zone: BodyZone) => void
}) {
  const zones = side === 'front' ? ZONES_FRONT : ZONES_BACK
  const injuredIds = injuries.filter(i => i.status !== 'gueri').map(i => i.zoneId)
  const healed = injuries.filter(i => i.status === 'gueri').map(i => i.zoneId)

  function zoneColor(id: string): string {
    const inj = injuries.find(i => i.zoneId === id && i.status !== 'gueri')
    if (inj) return intensityColor(inj.intensity)
    if (healed.includes(id)) return '#22c55e'
    return 'rgba(0,200,224,0.25)'
  }

  function zoneFill(id: string): string {
    const inj = injuries.find(i => i.zoneId === id && i.status !== 'gueri')
    if (inj) return `${intensityColor(inj.intensity)}55`
    if (healed.includes(id)) return 'rgba(34,197,94,0.20)'
    if (hoveredZone === id) return 'rgba(0,200,224,0.30)'
    return 'rgba(0,200,224,0.06)'
  }

  return (
    <svg viewBox="0 0 400 490" style={{ width:'100%', maxWidth:340, height:'auto', filter:'drop-shadow(0 4px 24px rgba(0,200,224,0.08))' }}>
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(0,200,224,0.05)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Body silhouette */}
      {side === 'front' ? (
        <g opacity="0.90">
          {/* Head */}
          <ellipse cx="200" cy="52" rx="28" ry="32" fill="rgba(180,200,220,0.18)" stroke="rgba(0,200,224,0.35)" strokeWidth="1.2"/>
          {/* Neck */}
          <rect x="190" y="82" width="20" height="18" rx="6" fill="rgba(180,200,220,0.15)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          {/* Torso */}
          <path d="M140 100 Q135 98 130 110 L118 235 Q118 242 128 245 L172 248 Q182 240 182 232 L178 170 L222 170 L218 232 Q218 240 228 248 L272 245 Q282 242 282 235 L270 110 Q265 98 260 100 Z" fill="rgba(180,200,220,0.15)" stroke="rgba(0,200,224,0.30)" strokeWidth="1.2"/>
          {/* Pelvis */}
          <path d="M172 248 Q182 270 200 272 Q218 270 228 248 Z" fill="rgba(180,200,220,0.15)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          {/* Left arm */}
          <path d="M130 110 Q118 115 112 130 L100 230 Q100 238 110 240 L122 240 Q130 238 130 230 L128 130 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Right arm */}
          <path d="M270 110 Q282 115 288 130 L300 230 Q300 238 290 240 L278 240 Q270 238 270 230 L272 130 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Left leg */}
          <path d="M172 272 L148 370 Q146 380 150 390 L170 470 Q172 475 178 475 L188 475 Q194 475 195 468 L190 370 L195 272 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          {/* Right leg */}
          <path d="M228 272 L252 370 Q254 380 250 390 L230 470 Q228 475 222 475 L212 475 Q206 475 205 468 L210 370 L205 272 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
        </g>
      ) : (
        <g opacity="0.90">
          <ellipse cx="200" cy="52" rx="28" ry="32" fill="rgba(180,200,220,0.18)" stroke="rgba(0,200,224,0.35)" strokeWidth="1.2"/>
          <rect x="190" y="82" width="20" height="18" rx="6" fill="rgba(180,200,220,0.15)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          <path d="M140 100 Q135 98 130 110 L118 235 Q118 242 128 245 L172 248 Q182 240 182 232 L178 170 L222 170 L218 232 Q218 240 228 248 L272 245 Q282 242 282 235 L270 110 Q265 98 260 100 Z" fill="rgba(180,200,220,0.15)" stroke="rgba(0,200,224,0.30)" strokeWidth="1.2"/>
          <path d="M172 248 Q182 270 200 272 Q218 270 228 248 Z" fill="rgba(180,200,220,0.15)" stroke="rgba(0,200,224,0.25)" strokeWidth="1"/>
          <path d="M130 110 Q118 115 112 130 L100 230 Q100 238 110 240 L122 240 Q130 238 130 230 L128 130 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          <path d="M270 110 Q282 115 288 130 L300 230 Q300 238 290 240 L278 240 Q270 238 270 230 L272 130 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          <path d="M172 272 L148 370 Q146 380 150 390 L170 470 Q172 475 178 475 L188 475 Q194 475 195 468 L190 370 L195 272 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
          <path d="M228 272 L252 370 Q254 380 250 390 L230 470 Q228 475 222 475 L212 475 Q206 475 205 468 L210 370 L205 272 Z" fill="rgba(180,200,220,0.14)" stroke="rgba(0,200,224,0.28)" strokeWidth="1"/>
        </g>
      )}

      {/* Clickable zones */}
      {zones.map(z => {
        const isHovered = hoveredZone === z.id
        const inj = injuries.find(i => i.zoneId === z.id && i.status !== 'gueri')
        const isInjured = !!inj
        return (
          <g key={z.id}>
            <ellipse
              cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill={zoneFill(z.id)}
              stroke={zoneColor(z.id)}
              strokeWidth={isHovered || isInjured ? 2 : 1}
              style={{ cursor:'pointer', transition:'all 0.15s' }}
              filter={isInjured ? 'url(#glow)' : undefined}
              onMouseEnter={() => onHover(z.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onZoneClick(z)}
            />
            {isInjured && inj && (
              <circle
                cx={z.cx + z.rx - 5} cy={z.cy - z.ry + 5} r="6"
                fill={intensityColor(inj.intensity)}
                stroke="#fff" strokeWidth="1.5"
                style={{ pointerEvents:'none' }}
              />
            )}
            {isHovered && (
              <text x={z.cx} y={z.cy + z.ry + 12} textAnchor="middle"
                style={{ fontSize:9, fill:'#00c8e0', fontFamily:'DM Sans,sans-serif', fontWeight:600, pointerEvents:'none' }}>
                {z.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Add Injury Modal ───────────────────────────────
function AddInjuryModal({
  zone, onClose, onSave,
}: {
  zone: BodyZone; onClose: () => void; onSave: (inj: Injury) => void
}) {
  const [type,     setType]     = useState<InjuryType>('douleur')
  const [painType, setPainType] = useState<PainType>('musculaire')
  const [intensity,setIntensity]= useState(5)
  const [context,  setContext]  = useState<Context>('entrainement')
  const [date,     setDate]     = useState(today())
  const [comment,  setComment]  = useState('')

  const iColor = intensityColor(intensity)

  function handleSave() {
    const ai = generateAI(zone.label, type, intensity, context)
    const inj: Injury = {
      id: uid(), zoneId: zone.id, zoneLabel: zone.label,
      type, painType, intensity, context, date, comment, status:'actif',
      history: [{ date, intensity, note:'Premier enregistrement' }],
      aiAnalysis: ai,
    }
    onSave(inj)
    onClose()
  }

  const btnBase: React.CSSProperties = { padding:'7px 12px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:500, transition:'all 0.15s' }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>Nouvelle blessure</h3>
            <p style={{ fontSize:12, color:'#00c8e0', margin:'3px 0 0' }}>{zone.label}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:9, padding:'5px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>x</button>
        </div>

        {/* Type */}
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Type</p>
        <div style={{ display:'flex', gap:7, marginBottom:16 }}>
          {(['douleur','gene','blessure'] as InjuryType[]).map(t => (
            <button key={t} onClick={() => setType(t)} style={{ ...btnBase, flex:1, borderColor:type===t?'#ef4444':'var(--border)', background:type===t?'rgba(239,68,68,0.12)':'var(--bg-card2)', color:type===t?'#ef4444':'var(--text-mid)' }}>{t}</button>
          ))}
        </div>

        {/* Pain type */}
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Type de douleur</p>
        <div style={{ display:'flex', gap:7, marginBottom:16 }}>
          {(['musculaire','articulaire','tendineuse'] as PainType[]).map(t => (
            <button key={t} onClick={() => setPainType(t)} style={{ ...btnBase, flex:1, borderColor:painType===t?'#f97316':'var(--border)', background:painType===t?'rgba(249,115,22,0.12)':'var(--bg-card2)', color:painType===t?'#f97316':'var(--text-mid)', fontSize:10 }}>{t}</button>
          ))}
        </div>

        {/* Intensity */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:0 }}>Intensite</p>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:16, fontWeight:700, color:iColor }}>{intensity}<span style={{ fontSize:11, fontWeight:400, color:'var(--text-dim)' }}>/10</span></span>
          </div>
          <input type="range" min={1} max={10} step={1} value={intensity} onChange={e => setIntensity(parseInt(e.target.value))}
            style={{ width:'100%', accentColor:iColor, cursor:'pointer' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--text-dim)', marginTop:3 }}>
            <span>Legere</span><span>Moderee</span><span>Severe</span>
          </div>
        </div>

        {/* Context */}
        <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Contexte d'apparition</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:16 }}>
          {(['entrainement','repos','progressif','soudain'] as Context[]).map(c => (
            <button key={c} onClick={() => setContext(c)} style={{ ...btnBase, borderColor:context===c?'#a855f7':'var(--border)', background:context===c?'rgba(168,85,247,0.12)':'var(--bg-card2)', color:context===c?'#a855f7':'var(--text-mid)' }}>{c}</button>
          ))}
        </div>

        {/* Date */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Date d'apparition</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Mono,monospace', fontSize:13, outline:'none' }}/>
        </div>

        {/* Comment */}
        <div style={{ marginBottom:20 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:6 }}>Commentaire</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Description de la douleur..."
            style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontSize:13, outline:'none', resize:'none' as const, fontFamily:'DM Sans,sans-serif' }}/>
        </div>

        <button onClick={handleSave}
          style={{ width:'100%', padding:13, borderRadius:12, background:'linear-gradient(135deg,#ef4444,#f97316)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          Enregistrer + Analyse IA
        </button>
      </div>
    </div>
  )
}

// ── Injury Detail Modal ────────────────────────────
function InjuryDetailModal({ injury, onClose, onUpdate }: { injury: Injury; onClose: () => void; onUpdate: (i: Injury) => void }) {
  const [status, setStatus] = useState<Status>(injury.status)
  const [newNote, setNewNote] = useState('')
  const [newIntensity, setNewIntensity] = useState(injury.intensity)
  const iColor = intensityColor(injury.intensity)
  const cfg = STATUS_CFG[status]

  function addEntry() {
    if (!newNote.trim()) return
    const updated: Injury = {
      ...injury,
      status,
      intensity: newIntensity,
      history: [...injury.history, { date: today(), intensity: newIntensity, note: newNote }],
    }
    onUpdate(updated)
    setNewNote('')
  }

  const maxH = Math.max(...injury.history.map(h => h.intensity))

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border-mid)', padding:24, maxWidth:540, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ padding:'3px 10px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.color}44`, color:cfg.color, fontSize:10, fontWeight:700 }}>{cfg.label}</span>
              <span style={{ padding:'3px 10px', borderRadius:20, background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)', color:'#ef4444', fontSize:10, fontWeight:600 }}>{injury.type}</span>
            </div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, margin:0 }}>{injury.zoneLabel}</h3>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'2px 0 0' }}>{injury.painType} · depuis {injury.date}</p>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:9, padding:'5px 9px', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}>x</button>
        </div>

        {/* Intensity gauge */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12, background:`${iColor}0e`, border:`1px solid ${iColor}33`, marginBottom:16 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:32, fontWeight:800, color:iColor, lineHeight:1 }}>{injury.intensity}</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 4px' }}>Intensite de la douleur</p>
            <div style={{ height:7, borderRadius:999, overflow:'hidden', background:'var(--border)' }}>
              <div style={{ height:'100%', width:`${injury.intensity*10}%`, background:`linear-gradient(90deg,${iColor}88,${iColor})`, borderRadius:999 }}/>
            </div>
          </div>
        </div>

        {/* Evolution chart */}
        <div style={{ background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', margin:'0 0 10px', textTransform:'uppercase' as const, letterSpacing:'0.07em' }}>Evolution</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:60 }}>
            {injury.history.map((h, i) => {
              const c = intensityColor(h.intensity)
              return (
                <div key={i} title={`${h.date}: ${h.intensity}/10 — ${h.note}`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ width:'100%', height:`${(h.intensity/10)*60}px`, background:`linear-gradient(180deg,${c}cc,${c}44)`, borderRadius:'3px 3px 0 0', minHeight:3 }}/>
                  <span style={{ fontSize:8, fontFamily:'DM Mono,monospace', color:'var(--text-dim)' }}>{h.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Analysis */}
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(0,200,224,0.06)', border:'1px solid rgba(0,200,224,0.18)', marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#00c8e0', margin:'0 0 8px' }}>Analyse IA</p>
          <p style={{ fontSize:12, color:'var(--text-mid)', lineHeight:1.7, margin:0, whiteSpace:'pre-line' as const }}>{injury.aiAnalysis}</p>
        </div>

        {/* Status update */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:8 }}>Statut</p>
          <div style={{ display:'flex', gap:7 }}>
            {(['actif','amelioration','gueri'] as Status[]).map(s => {
              const c = STATUS_CFG[s]
              return (
                <button key={s} onClick={() => setStatus(s)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid', cursor:'pointer', borderColor:status===s?c.color:'var(--border)', background:status===s?c.bg:'var(--bg-card2)', color:status===s?c.color:'var(--text-mid)', fontSize:11, fontWeight:status===s?600:400 }}>{c.label}</button>
              )
            })}
          </div>
        </div>

        {/* Add note */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', marginBottom:7 }}>Ajouter une entree</p>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>Intensite</span>
            <input type="range" min={0} max={10} step={1} value={newIntensity} onChange={e => setNewIntensity(parseInt(e.target.value))}
              style={{ flex:1, accentColor:intensityColor(newIntensity), cursor:'pointer' }}/>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:700, color:intensityColor(newIntensity), minWidth:28 }}>{newIntensity}/10</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Note du jour..." onKeyDown={e => e.key === 'Enter' && addEntry()}
              style={{ flex:1, padding:'8px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)', color:'var(--text)', fontFamily:'DM Sans,sans-serif', fontSize:13, outline:'none' }}/>
            <button onClick={addEntry} style={{ padding:'8px 14px', borderRadius:9, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Ajouter</button>
          </div>
        </div>

        <button onClick={() => { onUpdate({...injury, status}); onClose() }}
          style={{ width:'100%', padding:11, borderRadius:12, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', border:'none', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          Sauvegarder
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function BlessuresPage() {
  const [side,          setSide]          = useState<BodySide>('front')
  const [hoveredZone,   setHoveredZone]   = useState<string | null>(null)
  const [addModal,      setAddModal]      = useState<BodyZone | null>(null)
  const [detailModal,   setDetailModal]   = useState<Injury | null>(null)
  const [injuries,      setInjuries]      = useState<Injury[]>(MOCK_INJURIES)
  const [rotateAnim,    setRotateAnim]    = useState(false)

  const active   = injuries.filter(i => i.status === 'actif')
  const improving= injuries.filter(i => i.status === 'amelioration')
  const healed   = injuries.filter(i => i.status === 'gueri')

  let globalStatus: 'ok' | 'vigilance' | 'risque' = 'ok'
  if (active.some(i => i.intensity >= 7)) globalStatus = 'risque'
  else if (active.length > 0)             globalStatus = 'vigilance'

  const globalCfg = {
    ok:        { label:'Corps OK',      color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
    vigilance: { label:'Vigilance',     color:'#ffb340', bg:'rgba(255,179,64,0.12)' },
    risque:    { label:'Risque eleve',  color:'#ef4444', bg:'rgba(239,68,68,0.12)'  },
  }[globalStatus]

  function handleZoneClick(zone: BodyZone) {
    const existing = injuries.find(i => i.zoneId === zone.id && i.status !== 'gueri')
    if (existing) {
      setDetailModal(existing)
    } else {
      setAddModal(zone)
    }
  }

  function handleAdd(inj: Injury) {
    setInjuries(prev => [...prev, inj])
  }

  function handleUpdate(updated: Injury) {
    setInjuries(prev => prev.map(i => i.id === updated.id ? updated : i))
    setDetailModal(null)
  }

  return (
    <div style={{ padding:'24px 28px', maxWidth:'100%' }}>
      {addModal    && <AddInjuryModal    zone={addModal}     onClose={() => setAddModal(null)}    onSave={handleAdd}/>}
      {detailModal && <InjuryDetailModal injury={detailModal} onClose={() => setDetailModal(null)} onUpdate={handleUpdate}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap' as const, gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>Blessures</h1>
          <p style={{ fontSize:12.5, color:'var(--text-dim)', margin:'5px 0 0' }}>Suivi des douleurs et recuperation</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ padding:'6px 14px', borderRadius:20, background:globalCfg.bg, border:`1px solid ${globalCfg.color}55`, color:globalCfg.color, fontSize:12, fontWeight:700 }}>
            {globalCfg.label}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Actives',        value:active.length,    color:'#ef4444' },
          { label:'En amelioration',value:improving.length, color:'#ffb340' },
          { label:'Gueries',        value:healed.length,    color:'#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', boxShadow:'var(--shadow-card)' }}>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.07em', color:'var(--text-dim)', margin:'0 0 4px' }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }} className="md:grid-cols-2">

        {/* Body */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', marginBottom:16 }}>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:0 }}>Corps interactif</h2>
            <div style={{ display:'flex', gap:6 }}>
              {(['front','back'] as BodySide[]).map(s => (
                <button key={s} onClick={() => setSide(s)}
                  style={{ padding:'5px 14px', borderRadius:9, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:side===s?600:400, borderColor:side===s?'#00c8e0':'var(--border)', background:side===s?'rgba(0,200,224,0.10)':'var(--bg-card2)', color:side===s?'#00c8e0':'var(--text-mid)' }}>
                  {s === 'front' ? 'Face' : 'Dos'}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize:11, color:'var(--text-dim)', margin:'0 0 16px', textAlign:'center' as const }}>
            Clique sur une zone pour signaler une douleur
          </p>

          <div style={{ width:'100%', display:'flex', justifyContent:'center', position:'relative' }}>
            <HumanBody
              side={side}
              injuries={injuries}
              hoveredZone={hoveredZone}
              onHover={setHoveredZone}
              onZoneClick={handleZoneClick}
            />
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:14, marginTop:16, flexWrap:'wrap' as const, justifyContent:'center' }}>
            {[
              { c:'rgba(0,200,224,0.30)', label:'Zone saine' },
              { c:'#22c55e',             label:'Douleur legere (1-3)' },
              { c:'#ffb340',             label:'Douleur moderee (4-6)' },
              { c:'#ef4444',             label:'Douleur severe (7-10)' },
            ].map(x => (
              <span key={x.label} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-dim)' }}>
                <span style={{ width:10, height:10, borderRadius:3, background:x.c, display:'inline-block' }}/>
                {x.label}
              </span>
            ))}
          </div>
        </div>

        {/* Injury list */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 14px' }}>Blessures en cours</h2>
            {active.length === 0 && improving.length === 0 ? (
              <div style={{ textAlign:'center' as const, padding:'24px 0' }}>
                <p style={{ fontSize:28, margin:'0 0 8px' }}>OK</p>
                <p style={{ fontSize:13, color:'var(--text-dim)', margin:0 }}>Aucune blessure active</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[...active, ...improving].map(inj => {
                  const cfg = STATUS_CFG[inj.status]
                  const iColor = intensityColor(inj.intensity)
                  const last = inj.history[inj.history.length - 1]
                  const trend = inj.history.length > 1
                    ? inj.history[inj.history.length-1].intensity - inj.history[inj.history.length-2].intensity
                    : 0
                  return (
                    <div key={inj.id} onClick={() => setDetailModal(inj)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:`1px solid ${iColor}33`, cursor:'pointer', borderLeft:`3px solid ${iColor}` }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:`${iColor}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:iColor }}>{inj.intensity}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <p style={{ fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{inj.zoneLabel}</p>
                          {trend !== 0 && (
                            <span style={{ fontSize:10, color:trend < 0 ? '#22c55e' : '#ef4444' }}>{trend < 0 ? 'amelioration' : 'aggravation'}</span>
                          )}
                        </div>
                        <p style={{ fontSize:10, color:'var(--text-dim)', margin:'2px 0 0' }}>{inj.type} · {inj.painType} · {inj.date}</p>
                      </div>
                      <span style={{ padding:'3px 8px', borderRadius:20, background:cfg.bg, color:cfg.color, fontSize:9, fontWeight:700, flexShrink:0 }}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {active.length > 0 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px', color:'#ef4444' }}>Recommandations training</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {active.map(inj => (
                  <div key={inj.id} style={{ padding:'10px 13px', borderRadius:10, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#ef4444', margin:'0 0 4px' }}>{inj.zoneLabel} — intensite {inj.intensity}/10</p>
                    <p style={{ fontSize:11, color:'var(--text-mid)', margin:0 }}>
                      {inj.intensity >= 7
                        ? 'Arret recommande. Pas de seance sur cette zone.'
                        : inj.intensity >= 4
                        ? 'Reduire intensite de 30-40%. Eviter les efforts sur cette zone.'
                        : 'Surveillance. Adapter si douleur pendant la seance.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Healed history */}
          {healed.length > 0 && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:20, boxShadow:'var(--shadow-card)' }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, margin:'0 0 12px' }}>Historique</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {healed.map(inj => (
                  <div key={inj.id} onClick={() => setDetailModal(inj)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--bg-card2)', border:'1px solid var(--border)', cursor:'pointer', opacity:0.75 }}>
                    <span style={{ fontSize:16 }}>OK</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12, fontWeight:500, margin:0 }}>{inj.zoneLabel}</p>
                      <p style={{ fontSize:10, color:'var(--text-dim)', margin:'1px 0 0' }}>{inj.type} · {inj.date}</p>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'rgba(34,197,94,0.12)', color:'#22c55e', fontWeight:700 }}>Gueri</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
