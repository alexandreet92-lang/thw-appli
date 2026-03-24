'use client'

import { useState, useRef } from 'react'

type DayIntensity  = 'recovery' | 'low' | 'mid' | 'hard'
type SportType     = 'run' | 'bike' | 'swim' | 'hyrox' | 'gym'
type SessionStatus = 'planned' | 'done'
type BlockType     = 'warmup' | 'effort' | 'recovery' | 'cooldown'

// ── Profil athlète mock ───────────────────────────
const ATHLETE = { lthr:172, thresholdPace:248, ftp:301, css:88, weight:75 }

// ── Couleurs sports ───────────────────────────────
const SPORT_BG: Record<SportType, string> = {
  swim:  'rgba(56,189,248,0.13)',
  run:   'rgba(34,197,94,0.13)',
  bike:  'rgba(59,130,246,0.13)',
  hyrox: 'rgba(239,68,68,0.13)',
  gym:   'rgba(249,115,22,0.13)',
}
const SPORT_BORDER: Record<SportType, string> = {
  swim:  '#38bdf8',
  run:   '#22c55e',
  bike:  '#3b82f6',
  hyrox: '#ef4444',
  gym:   '#f97316',
}

const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const ZONE_LABELS = ['Z1 — Récup','Z2 — Aérobie','Z3 — Tempo','Z4 — Seuil','Z5 — VO2max']

function parsePace(str:string):number {
  const p = str.replace(',',':').split(':')
  return (parseInt(p[0])||0)*60+(parseInt(p[1])||0)
}

function getZone(sport:SportType, value:string):number {
  if (!value) return 1
  if (sport==='run') {
    const sec=parsePace(value), t=ATHLETE.thresholdPace
    if(sec>t*1.25)return 1; if(sec>t*1.10)return 2; if(sec>t*1.00)return 3; if(sec>t*0.90)return 4; return 5
  }
  if (sport==='bike') {
    const w=parseInt(value)||0, f=ATHLETE.ftp
    if(w<f*0.55)return 1; if(w<f*0.75)return 2; if(w<f*0.87)return 3; if(w<f*1.05)return 4; return 5
  }
  if (sport==='swim') {
    const sec=parsePace(value), c=ATHLETE.css
    if(sec>c*1.30)return 1; if(sec>c*1.15)return 2; if(sec>c*1.05)return 3; if(sec>c*0.97)return 4; return 5
  }
  return 3
}

function calcTSS(blocks:Block[], sport:SportType):number {
  return Math.round(blocks.reduce((tss,b)=>{
    const IF=[0.55,0.70,0.83,0.95,1.10][b.zone-1]
    return tss + (b.durationMin/60)*IF*IF*100*(sport==='bike'?1:0.9)
  },0))
}

function formatDur(min:number):string {
  const h=Math.floor(min/60), m=min%60
  return h===0 ? `0:${String(m).padStart(2,'0')}` : `${h}h${String(m).padStart(2,'0')}`
}

function calcPacePer500(distM:string, timeSec:string):string {
  const d=parseFloat(distM), t=parseFloat(timeSec)
  if(!d||!t) return '—'
  const s500=(t/d)*500
  return `${Math.floor(s500/60)}:${String(Math.round(s500%60)).padStart(2,'0')}/500m`
}

// ── Types ─────────────────────────────────────────
interface Block {
  id:string; type:BlockType; durationMin:number; zone:number
  value:string; hrAvg:string; label:string
}
interface Session {
  id:string; sport:SportType; title:string; time:string
  durationMin:number; tss?:number; main?:boolean
  status:SessionStatus; notes?:string; blocks:Block[]
  isTrainer?:boolean; rpe?:number
  // validation data (tous sports)
  vDuration?:string; vRpe?:number; vNotes?:string
  // bike
  vDistance?:string; vHrAvg?:string; vHrMax?:string
  vSpeed?:string; vElevation?:string; vWatts?:string
  vNpower?:string; vCadence?:string
  // run
  vPace?:string
  // swim (distance en m)
  vSwimDist?:string; vSwimPace?:string
  // hyrox
  vWallballReps?:string; vWallballKg?:string
  vLungeReps?:string; vLungeKg?:string
  vBBJDist?:string; vFarmerDist?:string; vFarmerKg?:string
  vSledPushDist?:string; vSledPushKg?:string
  vSledPullDist?:string; vSledPullKg?:string
  vSkiDist?:string; vSkiTime?:string
  vRowDist?:string; vRowTime?:string
  vRunDist?:string; vRunTime?:string
  completionPct?:number
}
interface WeekDay { day:string; date:string; intensity:DayIntensity; sessions:Session[] }

const SPORT_EMOJI:  Record<SportType,string> = { run:'🏃', bike:'🚴', swim:'🏊', hyrox:'🏋️', gym:'💪' }
const SPORT_LABEL:  Record<SportType,string> = { run:'Running', bike:'Cyclisme', swim:'Natation', hyrox:'Hyrox', gym:'Musculation' }
const INTENSITY_CONFIG: Record<DayIntensity,{label:string;color:string;bg:string;border:string;description:string}> = {
  recovery:{label:'Récup',color:'#9ca3af',bg:'rgba(156,163,175,0.10)',border:'rgba(156,163,175,0.25)',description:'Journée sans séance ou très légère. Permet à l\'organisme de régénérer les fibres musculaires et consolider les adaptations.'},
  low:     {label:'Low',  color:'#22c55e',bg:'rgba(34,197,94,0.10)',  border:'rgba(34,197,94,0.25)',  description:'Journée à faible intensité. Favorise la récupération tout en continuant à stimuler l\'organisme sans générer de fatigue supplémentaire.'},
  mid:     {label:'Mid',  color:'#ffb340',bg:'rgba(255,179,64,0.10)', border:'rgba(255,179,64,0.25)', description:'Journée à intensité modérée, créant une fatigue contrôlée. Le temps de récupération varie selon le niveau et l\'état de forme.'},
  hard:    {label:'Hard', color:'#ff5f5f',bg:'rgba(255,95,95,0.10)',  border:'rgba(255,95,95,0.25)',  description:'Journée à forte intensité générant un stress important. Nécessite généralement un ou plusieurs jours de récupération.'},
}
const INTENSITY_ORDER:DayIntensity[]=['recovery','low','mid','hard']
const BLOCK_TYPE_LABEL:Record<BlockType,string>={warmup:'Échauffement',effort:'Effort',recovery:'Récupération',cooldown:'Retour calme'}

const INITIAL_WEEK:WeekDay[]=[
  {day:'Lun',date:'18',intensity:'mid',sessions:[{id:'s1',sport:'swim',title:'Natation Tech',time:'06:00',durationMin:55,tss:45,status:'done',main:false,blocks:[
    {id:'b1',type:'warmup',durationMin:10,zone:1,value:'2:00',hrAvg:'140',label:'Échauffement'},
    {id:'b2',type:'effort',durationMin:30,zone:3,value:'1:35',hrAvg:'158',label:'Série principale'},
    {id:'b3',type:'cooldown',durationMin:10,zone:1,value:'2:10',hrAvg:'135',label:'Retour calme'},
  ]}]},
  {day:'Mar',date:'19',intensity:'hard',sessions:[{id:'s2',sport:'bike',title:'Sweet Spot 2×20',time:'17:30',durationMin:105,tss:122,status:'done',main:true,blocks:[
    {id:'b4',type:'warmup',durationMin:15,zone:2,value:'180',hrAvg:'145',label:'Échauffement'},
    {id:'b5',type:'effort',durationMin:20,zone:3,value:'255',hrAvg:'162',label:'Sweet Spot 1'},
    {id:'b6',type:'recovery',durationMin:5,zone:1,value:'150',hrAvg:'140',label:'Récup'},
    {id:'b7',type:'effort',durationMin:20,zone:3,value:'258',hrAvg:'165',label:'Sweet Spot 2'},
    {id:'b8',type:'cooldown',durationMin:15,zone:1,value:'160',hrAvg:'138',label:'Retour calme'},
  ]}]},
  {day:'Mer',date:'20',intensity:'low',sessions:[{id:'s3',sport:'run',title:'Endurance Z2',time:'06:30',durationMin:70,tss:68,status:'planned',main:false,blocks:[
    {id:'b9',type:'warmup',durationMin:10,zone:1,value:'5:30',hrAvg:'135',label:'Échauffement'},
    {id:'b10',type:'effort',durationMin:50,zone:2,value:'4:50',hrAvg:'148',label:'Endurance'},
    {id:'b11',type:'cooldown',durationMin:10,zone:1,value:'5:45',hrAvg:'132',label:'Retour calme'},
  ]}]},
  {day:'Jeu',date:'21',intensity:'hard',sessions:[{id:'s4',sport:'hyrox',title:'Hyrox Sim',time:'18:00',durationMin:65,tss:88,status:'planned',main:true,blocks:[]}]},
  {day:'Ven',date:'22',intensity:'mid',sessions:[
    {id:'s5',sport:'swim',title:'6×100m',time:'06:00',durationMin:60,tss:55,status:'planned',main:false,blocks:[]},
    {id:'s6',sport:'run',title:'Tempo Z3',time:'17:00',durationMin:60,tss:65,status:'planned',main:true,blocks:[]},
  ]},
  {day:'Sam',date:'23',intensity:'mid',sessions:[{id:'s7',sport:'bike',title:'Long Z2',time:'08:00',durationMin:180,tss:120,status:'planned',main:true,blocks:[]}]},
  {day:'Dim',date:'24',intensity:'recovery',sessions:[{id:'s8',sport:'run',title:'Récup Z1',time:'10:00',durationMin:40,tss:25,status:'planned',main:false,blocks:[]}]},
]

// ── RPE Slider ────────────────────────────────────
function RPESlider({value, onChange}:{value:number; onChange:(v:number)=>void}) {
  const color = value<=3?'#22c55e':value<=6?'#ffb340':value<=8?'#f97316':'#ef4444'
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:11,color:'var(--text-dim)'}}>RPE</span>
        <span style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:700,color}}>{value.toFixed(1)}/10</span>
      </div>
      <input type="range" min={0} max={10} step={0.5} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{width:'100%',accentColor:color,cursor:'pointer'}}
      />
      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--text-dim)',marginTop:2}}>
        <span>Très facile</span><span>Modéré</span><span>Maximum</span>
      </div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────
function VField({label,value,onChange,placeholder,unit}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;unit?:string}) {
  return (
    <div>
      <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{label}{unit&&<span style={{fontWeight:400,marginLeft:3,textTransform:'none' as const}}>({unit})</span>}</p>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'—'}
        style={{width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:12,outline:'none'}}
      />
    </div>
  )
}

// ── Graphique séance ──────────────────────────────
function SessionChart({blocks,sport}:{blocks:Block[];sport:SportType}) {
  if(!blocks.length) return (
    <div style={{height:80,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:12,fontStyle:'italic'}}>
      Aucun bloc — ajoute des blocs pour voir le graphique
    </div>
  )
  const totalMin=blocks.reduce((s,b)=>s+b.durationMin,0)
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',gap:2,height:100,marginBottom:4}}>
        {blocks.map(b=>{
          const hp=((b.zone/5)*0.85+0.05)*100
          const wp=(b.durationMin/totalMin)*100
          const c=ZONE_COLORS[b.zone-1]
          return (
            <div key={b.id} title={`${b.label} · Z${b.zone} · ${formatDur(b.durationMin)}${b.value?` · ${b.value}`:''}${b.hrAvg?` · ${b.hrAvg}bpm`:''}`}
              style={{width:`${wp}%`,height:`${hp}%`,background:`linear-gradient(180deg,${c}ee,${c}66)`,borderRadius:'4px 4px 0 0',border:`1px solid ${c}88`,cursor:'help',position:'relative',minWidth:6}}>
              {wp>7&&<span style={{position:'absolute',bottom:3,left:'50%',transform:'translateX(-50%)',fontSize:9,fontWeight:700,color:'#fff',textShadow:'0 1px 3px rgba(0,0,0,0.6)',whiteSpace:'nowrap'}}>Z{b.zone}</span>}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:2}}>
        {blocks.map(b=>(
          <div key={b.id} style={{width:`${(b.durationMin/totalMin)*100}%`,minWidth:6}}>
            <div style={{height:3,background:`${ZONE_COLORS[b.zone-1]}55`,borderRadius:1,marginBottom:2}}/>
            {(b.durationMin/totalMin)*100>7&&<p style={{fontSize:9,color:'var(--text-dim)',margin:0,textAlign:'center',fontFamily:'DM Mono,monospace',overflow:'hidden',whiteSpace:'nowrap'}}>{formatDur(b.durationMin)}</p>}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
        {Array.from(new Set(blocks.map(b=>b.zone))).sort().map(z=>(
          <span key={z} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:ZONE_COLORS[z-1]}}>
            <span style={{width:8,height:8,borderRadius:2,background:ZONE_COLORS[z-1],display:'inline-block'}}/>
            {ZONE_LABELS[z-1]}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Builder de blocs ──────────────────────────────
function BlockBuilder({sport,blocks,onChange}:{sport:SportType;blocks:Block[];onChange:(b:Block[])=>void}) {
  const [multiplyId, setMultiplyId] = useState<string|null>(null)
  const [multiplyN,  setMultiplyN]  = useState(2)
  const valueLabel = sport==='bike'?'Watts':sport==='swim'?'Allure /100m':'Allure /km'
  const valuePlh   = sport==='bike'?'250':sport==='swim'?'1:35':'4:30'

  function addBlock() {
    onChange([...blocks,{id:`b_${Date.now()}`,type:'effort',durationMin:10,zone:3,value:sport==='bike'?'220':'4:30',hrAvg:'',label:'Bloc'}])
  }

  function update(id:string, field:keyof Block, val:string|number) {
    onChange(blocks.map(b=>{
      if(b.id!==id) return b
      const u:Block={...b,[field]:val}
      if(field==='value') u.zone=getZone(sport,String(val))
      return u
    }))
  }

  function multiply(id:string, n:number) {
    const idx=blocks.findIndex(b=>b.id===id)
    if(idx<0) return
    const block=blocks[idx]
    const copies=Array.from({length:n-1},(_,i)=>({...block,id:`b_${Date.now()}_${i}`}))
    const newBlocks=[...blocks]
    newBlocks.splice(idx+1,0,...copies)
    onChange(newBlocks)
    setMultiplyId(null)
  }

  return (
    <div>
      {blocks.length>0&&(
        <div style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:12}}>
          <p style={{fontSize:11,fontWeight:600,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:10}}>
            Aperçu · TSS estimé : <span style={{color:'#00c8e0'}}>{calcTSS(blocks,sport)} pts</span>
            <span style={{marginLeft:12,color:'var(--text-dim)',fontWeight:400}}>· {formatDur(blocks.reduce((s,b)=>s+b.durationMin,0))}</span>
          </p>
          <SessionChart blocks={blocks} sport={sport}/>
        </div>
      )}

      {blocks.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
          {blocks.map(b=>(
            <div key={b.id} style={{background:'var(--bg-card2)',border:`1px solid ${ZONE_COLORS[b.zone-1]}44`,borderLeft:`3px solid ${ZONE_COLORS[b.zone-1]}`,borderRadius:10,padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{width:24,height:24,borderRadius:6,background:`${ZONE_COLORS[b.zone-1]}22`,border:`1px solid ${ZONE_COLORS[b.zone-1]}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:ZONE_COLORS[b.zone-1],flexShrink:0}}>Z{b.zone}</span>
                <select value={b.type} onChange={e=>update(b.id,'type',e.target.value)}
                  style={{flex:1,padding:'4px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}>
                  {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
                <input value={b.label} onChange={e=>update(b.id,'label',e.target.value)} placeholder="Nom"
                  style={{flex:1.5,padding:'4px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}/>
                {/* Multiplier */}
                <button onClick={()=>setMultiplyId(multiplyId===b.id?null:b.id)} title="Multiplier ce bloc"
                  style={{width:24,height:24,borderRadius:6,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:700}}>×</button>
                <button onClick={()=>onChange(blocks.filter(x=>x.id!==b.id))}
                  style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:14,padding:'2px 4px',flexShrink:0}}>✕</button>
              </div>

              {/* Multiply panel */}
              {multiplyId===b.id&&(
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'8px 10px',borderRadius:8,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.2)'}}>
                  <span style={{fontSize:11,color:'#00c8e0',fontWeight:500}}>Multiplier par</span>
                  <input type="number" min={2} max={20} value={multiplyN} onChange={e=>setMultiplyN(parseInt(e.target.value)||2)}
                    style={{width:60,padding:'4px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,fontFamily:'DM Mono,monospace',outline:'none'}}/>
                  <button onClick={()=>multiply(b.id,multiplyN)}
                    style={{padding:'4px 12px',borderRadius:7,background:'#00c8e0',border:'none',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                    → {multiplyN}×
                  </button>
                  <button onClick={()=>setMultiplyId(null)}
                    style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:12}}>Annuler</button>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                <div>
                  <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:3}}>Durée (min)</p>
                  <input type="number" value={b.durationMin} onChange={e=>update(b.id,'durationMin',parseInt(e.target.value)||0)}
                    style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'DM Mono,monospace'}}/>
                </div>
                <div>
                  <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:3}}>{valueLabel}</p>
                  <input value={b.value} onChange={e=>update(b.id,'value',e.target.value)} placeholder={valuePlh}
                    style={{width:'100%',padding:'6px 8px',borderRadius:7,border:`1px solid ${ZONE_COLORS[b.zone-1]}66`,background:`${ZONE_COLORS[b.zone-1]}11`,color:'var(--text)',fontSize:12,outline:'none',fontFamily:'DM Mono,monospace'}}/>
                </div>
                <div>
                  <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:3}}>FC moy. (bpm)</p>
                  <input value={b.hrAvg} onChange={e=>update(b.id,'hrAvg',e.target.value)} placeholder="158"
                    style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none',fontFamily:'DM Mono,monospace'}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={addBlock}
        style={{width:'100%',padding:'9px',borderRadius:10,background:'transparent',border:'1px dashed var(--border-mid)',color:'var(--text-dim)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
        + Ajouter un bloc
      </button>
    </div>
  )
}

// ── Validation par sport ──────────────────────────
function ValidateForm({form, setForm, planned}:{form:Session; setForm:(s:Session)=>void; planned:Session}) {
  const s=form.sport
  const f=(key:keyof Session)=>String((form as any)[key]||'')
  const set=(key:keyof Session,val:string)=>setForm({...form,[key]:val})

  // Calcul completion
  function calcCompletion():number {
    const plannedMin=planned.durationMin
    const doneMin=parseInt(form.vDuration||'0')
    if(!plannedMin||!doneMin) return 0
    return Math.min(Math.round((doneMin/plannedMin)*100),100)
  }

  const completion=calcCompletion()
  const compColor=completion>=90?'#22c55e':completion>=70?'#ffb340':'#ef4444'

  return (
    <div>
      {/* Completion preview */}
      {form.vDuration&&(
        <div style={{padding:'10px 14px',borderRadius:10,background:`${compColor}11`,border:`1px solid ${compColor}33`,marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:'var(--text-mid)'}}>Séance réalisée</span>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:compColor}}>{completion}%</span>
        </div>
      )}

      {/* Durée + RPE communs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <VField label="Durée" unit="min" value={f('vDuration')} onChange={v=>set('vDuration',v)} placeholder="60"/>
        <div/>
      </div>
      <div style={{marginBottom:14}}>
        <RPESlider value={form.vRpe??5} onChange={v=>setForm({...form,vRpe:v})}/>
      </div>

      {/* Vélo */}
      {s==='bike'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <VField label="Distance" unit="km" value={f('vDistance')} onChange={v=>set('vDistance',v)} placeholder="60"/>
          <VField label="FC moyenne" unit="bpm" value={f('vHrAvg')} onChange={v=>set('vHrAvg',v)} placeholder="158"/>
          <VField label="FC max" unit="bpm" value={f('vHrMax')} onChange={v=>set('vHrMax',v)} placeholder="178"/>
          <VField label="Vitesse moy." unit="km/h" value={f('vSpeed')} onChange={v=>set('vSpeed',v)} placeholder="32"/>
          <VField label="Dénivelé" unit="m" value={f('vElevation')} onChange={v=>set('vElevation',v)} placeholder="450"/>
          <VField label="Watts moyens" unit="W" value={f('vWatts')} onChange={v=>set('vWatts',v)} placeholder="240"/>
          <VField label="Watts normalisés" unit="W" value={f('vNpower')} onChange={v=>set('vNpower',v)} placeholder="247"/>
          <VField label="Cadence moy." unit="rpm" value={f('vCadence')} onChange={v=>set('vCadence',v)} placeholder="88"/>
        </div>
      )}

      {/* Running */}
      {s==='run'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <VField label="Distance" unit="km" value={f('vDistance')} onChange={v=>set('vDistance',v)} placeholder="10"/>
          <VField label="FC moyenne" unit="bpm" value={f('vHrAvg')} onChange={v=>set('vHrAvg',v)} placeholder="158"/>
          <VField label="FC max" unit="bpm" value={f('vHrMax')} onChange={v=>set('vHrMax',v)} placeholder="175"/>
          <VField label="Dénivelé" unit="m" value={f('vElevation')} onChange={v=>set('vElevation',v)} placeholder="80"/>
          <VField label="Allure moyenne" unit="/km" value={f('vPace')} onChange={v=>set('vPace',v)} placeholder="4:32"/>
        </div>
      )}

      {/* Natation */}
      {s==='swim'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <VField label="Distance" unit="m" value={f('vSwimDist')} onChange={v=>set('vSwimDist',v)} placeholder="2400"/>
          <VField label="FC moyenne" unit="bpm" value={f('vHrAvg')} onChange={v=>set('vHrAvg',v)} placeholder="150"/>
          <VField label="FC max" unit="bpm" value={f('vHrMax')} onChange={v=>set('vHrMax',v)} placeholder="165"/>
          <VField label="Allure moyenne" unit="/100m" value={f('vSwimPace')} onChange={v=>set('vSwimPace',v)} placeholder="1:30"/>
        </div>
      )}

      {/* Hyrox */}
      {s==='hyrox'&&(
        <div style={{marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <VField label="FC moyenne" unit="bpm" value={f('vHrAvg')} onChange={v=>set('vHrAvg',v)} placeholder="165"/>
            <VField label="FC max" unit="bpm" value={f('vHrMax')} onChange={v=>set('vHrMax',v)} placeholder="185"/>
          </div>

          <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'#ef4444',marginBottom:8}}>Stations Hyrox</p>

          {/* SkiErg */}
          <div style={{marginBottom:8,padding:'10px 12px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)'}}>
            <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Ski Erg</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <VField label="Distance" unit="m" value={f('vSkiDist')} onChange={v=>set('vSkiDist',v)} placeholder="1000"/>
              <VField label="Temps" unit="sec" value={f('vSkiTime')} onChange={v=>set('vSkiTime',v)} placeholder="240"/>
              <div>
                <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:4}}>Allure moy.</p>
                <div style={{padding:'7px 10px',borderRadius:8,background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.2)',fontSize:12,fontWeight:600,color:'#ef4444',fontFamily:'DM Mono,monospace'}}>
                  {calcPacePer500(f('vSkiDist'),f('vSkiTime'))}
                </div>
              </div>
            </div>
          </div>

          {/* Row Erg */}
          <div style={{marginBottom:8,padding:'10px 12px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)'}}>
            <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Row Erg (Rameur)</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <VField label="Distance" unit="m" value={f('vRowDist')} onChange={v=>set('vRowDist',v)} placeholder="1000"/>
              <VField label="Temps" unit="sec" value={f('vRowTime')} onChange={v=>set('vRowTime',v)} placeholder="230"/>
              <div>
                <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:4}}>Allure moy.</p>
                <div style={{padding:'7px 10px',borderRadius:8,background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.2)',fontSize:12,fontWeight:600,color:'#ef4444',fontFamily:'DM Mono,monospace'}}>
                  {calcPacePer500(f('vRowDist'),f('vRowTime'))}
                </div>
              </div>
            </div>
          </div>

          {/* Sled Push */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)'}}>
              <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Sled Push</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <VField label="Distance" unit="m" value={f('vSledPushDist')} onChange={v=>set('vSledPushDist',v)} placeholder="25"/>
                <VField label="Charge" unit="kg" value={f('vSledPushKg')} onChange={v=>set('vSledPushKg',v)} placeholder="102"/>
              </div>
            </div>
            <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)'}}>
              <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Sled Pull</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <VField label="Distance" unit="m" value={f('vSledPullDist')} onChange={v=>set('vSledPullDist',v)} placeholder="25"/>
                <VField label="Charge" unit="kg" value={f('vSledPullKg')} onChange={v=>set('vSledPullKg',v)} placeholder="78"/>
              </div>
            </div>
          </div>

          {/* Farmer Carry */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)'}}>
              <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Farmer Carry</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <VField label="Distance" unit="m" value={f('vFarmerDist')} onChange={v=>set('vFarmerDist',v)} placeholder="200"/>
                <div>
                  <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:4}}>Poids/main</p>
                  <select value={f('vFarmerKg')} onChange={e=>set('vFarmerKg',e.target.value)}
                    style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}>
                    <option value="">—</option>
                    <option value="16">16 kg</option>
                    <option value="24">24 kg</option>
                    <option value="32">32 kg</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BBJ */}
            <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)'}}>
              <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Burpee Broad Jump</p>
              <VField label="Distance" unit="m" value={f('vBBJDist')} onChange={v=>set('vBBJDist',v)} placeholder="80"/>
            </div>
          </div>

          {/* Wall Balls */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)'}}>
              <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Wall Balls</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <VField label="Reps" value={f('vWallballReps')} onChange={v=>set('vWallballReps',v)} placeholder="100"/>
                <div>
                  <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:4}}>Poids</p>
                  <select value={f('vWallballKg')} onChange={e=>set('vWallballKg',e.target.value)}
                    style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}>
                    <option value="">—</option>
                    <option value="3">3 kg</option>
                    <option value="6">6 kg</option>
                    <option value="9">9 kg</option>
                    <option value="12">12 kg</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Fentes */}
            <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)'}}>
              <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Sandbag Lunges</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <VField label="Reps" value={f('vLungeReps')} onChange={v=>set('vLungeReps',v)} placeholder="100"/>
                <div>
                  <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:4}}>Poids sac</p>
                  <select value={f('vLungeKg')} onChange={e=>set('vLungeKg',e.target.value)}
                    style={{width:'100%',padding:'6px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none'}}>
                    <option value="">—</option>
                    <option value="10">10 kg</option>
                    <option value="20">20 kg</option>
                    <option value="30">30 kg</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Run Compromised */}
          <div style={{padding:'8px 10px',borderRadius:9,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.12)',marginBottom:8}}>
            <p style={{fontSize:11,fontWeight:600,color:'#ef4444',marginBottom:6}}>Run Compromised</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <VField label="Distance" unit="m" value={f('vRunDist')} onChange={v=>set('vRunDist',v)} placeholder="1000"/>
              <VField label="Temps" unit="sec" value={f('vRunTime')} onChange={v=>set('vRunTime',v)} placeholder="300"/>
            </div>
          </div>
        </div>
      )}

      {/* Commentaire */}
      <div style={{marginBottom:4}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Commentaire</p>
        <textarea value={form.vNotes||''} onChange={e=>setForm({...form,vNotes:e.target.value})} rows={2} placeholder="Ressenti, notes post-séance…"
          style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',resize:'none' as const}}/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// MODAL DÉTAIL
// ════════════════════════════════════════════════
function SessionDetailModal({session,planned,onClose,onSave,onValidate,onDelete}:{
  session:Session; planned:Session; onClose:()=>void
  onSave:(s:Session)=>void; onValidate:(s:Session)=>void; onDelete:(id:string)=>void
}) {
  const [tab,  setTab]  = useState<'view'|'edit'|'validate'>('view')
  const [form, setForm] = useState<Session>({...session,blocks:[...session.blocks]})
  const isEnd=['run','bike','swim'].includes(session.sport)

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:580,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:38,height:38,borderRadius:10,background:SPORT_BG[session.sport],display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{SPORT_EMOJI[session.sport]}</div>
            <div>
              <p style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0}}>{session.title}</p>
              <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>
                {session.time} · {formatDur(session.durationMin)}{session.tss?` · ${session.tss} TSS`:''}
                {session.isTrainer&&<span style={{marginLeft:6,padding:'1px 5px',borderRadius:4,background:'rgba(91,111,255,0.15)',color:'#5b6fff',fontSize:9,fontWeight:700}}>🏠 HT</span>}
                {session.status==='done'&&<span style={{marginLeft:6,padding:'1px 6px',borderRadius:4,background:'#00c8e022',color:'#00c8e0',fontSize:10,fontWeight:700}}>✓ Validée {session.completionPct&&`${session.completionPct}%`}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16}}>✕</button>
        </div>

        <div style={{display:'flex',gap:6,marginBottom:18}}>
          {(['view','edit','validate'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px',borderRadius:10,border:'1px solid',borderColor:tab===t?SPORT_BORDER[session.sport]:'var(--border)',background:tab===t?`${SPORT_BG[session.sport]}`:'var(--bg-card2)',color:tab===t?SPORT_BORDER[session.sport]:'var(--text-mid)',fontSize:12,fontWeight:tab===t?600:400,cursor:'pointer'}}>
              {t==='view'?'📊 Graphique':t==='edit'?'✏️ Modifier':'✅ Valider'}
            </button>
          ))}
        </div>

        {tab==='view'&&(
          <div>
            <div style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 18px',marginBottom:14}}>
              <SessionChart blocks={session.blocks} sport={session.sport}/>
            </div>
            {session.blocks.length>0&&(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {session.blocks.map(b=>(
                  <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:9,background:`${ZONE_COLORS[b.zone-1]}11`,border:`1px solid ${ZONE_COLORS[b.zone-1]}33`,borderLeft:`3px solid ${ZONE_COLORS[b.zone-1]}`}}>
                    <span style={{fontSize:10,fontWeight:700,color:ZONE_COLORS[b.zone-1],width:22,flexShrink:0}}>Z{b.zone}</span>
                    <span style={{flex:1,fontSize:12,fontWeight:500}}>{b.label}</span>
                    <span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text-dim)'}}>{formatDur(b.durationMin)}</span>
                    {b.value&&<span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:ZONE_COLORS[b.zone-1]}}>{b.value}{session.sport==='bike'?'W':''}</span>}
                    {b.hrAvg&&<span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:'var(--text-dim)'}}>{b.hrAvg}bpm</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='edit'&&(
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              {[{key:'title',label:'Titre'},{key:'time',label:'Heure'}].map(f=>(
                <div key={f.key}>
                  <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>{f.label}</p>
                  <input value={(form as any)[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/>
                </div>
              ))}
            </div>

            {/* Durée + RPE en édition */}
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12,marginBottom:14}}>
              <div>
                <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Durée (min)</p>
                <input type="number" value={form.durationMin} onChange={e=>setForm({...form,durationMin:parseInt(e.target.value)||0})}
                  style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <RPESlider value={form.rpe??5} onChange={v=>setForm({...form,rpe:v})}/>
            </div>

            {/* Home trainer vélo */}
            {session.sport==='bike'&&(
              <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',cursor:'pointer'}}
                onClick={()=>setForm({...form,isTrainer:!form.isTrainer})}>
                <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${form.isTrainer?'#3b82f6':'var(--border)'}`,background:form.isTrainer?'#3b82f6':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {form.isTrainer&&<span style={{color:'#fff',fontSize:13,lineHeight:1}}>✓</span>}
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:500,margin:0,color:form.isTrainer?'#3b82f6':'var(--text-mid)'}}>🏠 Home Trainer</p>
                  <p style={{fontSize:11,color:'var(--text-dim)',margin:'1px 0 0'}}>Séance réalisée sur home trainer</p>
                </div>
              </div>
            )}

            <div style={{marginBottom:14}}>
              <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Notes</p>
              <textarea value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})} rows={2}
                style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',resize:'none' as const}}/>
            </div>

            {isEnd&&(
              <div style={{marginBottom:16}}>
                <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:10}}>Blocs d'intensité</p>
                <BlockBuilder sport={session.sport} blocks={form.blocks}
                  onChange={blocks=>setForm({...form,blocks,tss:calcTSS(blocks,session.sport),durationMin:blocks.reduce((s,b)=>s+b.durationMin,0)||form.durationMin})}/>
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>onDelete(session.id)} style={{padding:'10px 14px',borderRadius:11,background:'rgba(255,95,95,0.10)',border:'1px solid rgba(255,95,95,0.25)',color:'#ff5f5f',fontSize:13,cursor:'pointer'}}>Supprimer</button>
              <button onClick={()=>onSave(form)} style={{flex:1,padding:11,borderRadius:11,background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>Sauvegarder</button>
            </div>
          </>
        )}

        {tab==='validate'&&(
          <>
            <ValidateForm form={form} setForm={setForm} planned={planned}/>
            <button onClick={()=>{
              const doneMin=parseInt(form.vDuration||'0')
              const pct=planned.durationMin?Math.min(Math.round((doneMin/planned.durationMin)*100),100):100
              onValidate({...form,status:'done',completionPct:pct})
            }} style={{width:'100%',padding:13,borderRadius:11,background:`linear-gradient(135deg,${SPORT_BORDER[session.sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',marginTop:14}}>
              ✓ Confirmer la séance
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// MODAL AJOUT
// ════════════════════════════════════════════════
function AddSessionModal({dayIndex,onClose,onAdd}:{dayIndex:number;onClose:()=>void;onAdd:(i:number,s:Session)=>void}) {
  const [sport,  setSport]  = useState<SportType>('run')
  const [title,  setTitle]  = useState('')
  const [time,   setTime]   = useState('09:00')
  const [dur,    setDur]    = useState('60')
  const [rpe,    setRpe]    = useState(5)
  const [notes,  setNotes]  = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isHT,   setIsHT]   = useState(false)
  const isEnd=['run','bike','swim'].includes(sport)
  const tss=calcTSS(blocks,sport)
  const totalMin=blocks.reduce((s,b)=>s+b.durationMin,0)

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:540,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>Nouvelle séance</h3>
          <button onClick={onClose} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16}}>✕</button>
        </div>

        {/* Sport */}
        <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',marginBottom:8}}>Sport</p>
        <div style={{display:'flex',gap:7,flexWrap:'wrap' as const,marginBottom:16}}>
          {(Object.keys(SPORT_LABEL) as SportType[]).map(s=>(
            <button key={s} onClick={()=>{setSport(s);setBlocks([]);setIsHT(false)}}
              style={{padding:'7px 13px',borderRadius:9,border:'1px solid',borderColor:sport===s?SPORT_BORDER[s]:'var(--border)',background:sport===s?SPORT_BG[s]:'var(--bg-card2)',color:sport===s?SPORT_BORDER[s]:'var(--text-mid)',fontSize:13,cursor:'pointer',fontWeight:sport===s?600:400}}>
              {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Titre + Heure + Durée */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:10,marginBottom:14}}>
          <div>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Titre</p>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${SPORT_LABEL[sport]} Z2`}
              style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Heure</p>
            <input value={time} onChange={e=>setTime(e.target.value)} placeholder="17:00"
              style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Durée (min)</p>
            <input type="number" value={dur} onChange={e=>setDur(e.target.value)} placeholder="60"
              style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
          </div>
        </div>

        {/* RPE */}
        <div style={{marginBottom:14}}>
          <RPESlider value={rpe} onChange={setRpe}/>
        </div>

        {/* Home Trainer vélo */}
        {sport==='bike'&&(
          <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',cursor:'pointer'}}
            onClick={()=>setIsHT(!isHT)}>
            <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${isHT?'#3b82f6':'var(--border)'}`,background:isHT?'#3b82f6':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {isHT&&<span style={{color:'#fff',fontSize:13,lineHeight:1}}>✓</span>}
            </div>
            <p style={{fontSize:13,fontWeight:500,margin:0,color:isHT?'#3b82f6':'var(--text-mid)'}}>🏠 Home Trainer</p>
          </div>
        )}

        {/* Blocs */}
        {isEnd&&(
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:10}}>Blocs d'intensité</p>
            <BlockBuilder sport={sport} blocks={blocks} onChange={setBlocks}/>
            {blocks.length>0&&(
              <div style={{display:'flex',gap:16,marginTop:8,fontSize:12,color:'var(--text-dim)'}}>
                <span>Durée totale : <strong style={{color:'var(--text)',fontFamily:'DM Mono,monospace'}}>{formatDur(totalMin)}</strong></span>
                <span>TSS estimé : <strong style={{color:SPORT_BORDER[sport],fontFamily:'DM Mono,monospace'}}>{tss} pts</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div style={{marginBottom:18}}>
          <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Notes</p>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Consignes, objectifs…"
            style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',resize:'none' as const}}/>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>Annuler</button>
          <button onClick={()=>{
            onAdd(dayIndex,{id:`s_${Date.now()}`,sport,title:title||SPORT_LABEL[sport],time,
              durationMin:totalMin||parseInt(dur)||60,tss:tss||undefined,status:'planned',
              notes:notes||undefined,blocks,rpe,isTrainer:isHT})
            onClose()
          }} style={{flex:2,padding:11,borderRadius:11,background:`linear-gradient(135deg,${SPORT_BORDER[sport]},#5b6fff)`,border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            + Ajouter au planning
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// MODAL INTENSITÉ
// ════════════════════════════════════════════════
function IntensityModal({intensity,onClose}:{intensity:DayIntensity;onClose:()=>void}) {
  const cfg=INTENSITY_CONFIG[intensity]
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:28,maxWidth:400,width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
          <span style={{padding:'4px 12px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:12,fontWeight:700,textTransform:'uppercase' as const}}>{cfg.label}</span>
          <h3 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>Journée {cfg.label}</h3>
        </div>
        <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,margin:'0 0 20px'}}>{cfg.description}</p>
        <button onClick={onClose} style={{width:'100%',padding:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',borderRadius:11,color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:600,fontSize:13,cursor:'pointer'}}>Compris</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function PlanningPage() {
  const [week,           setWeek]           = useState<WeekDay[]>(INITIAL_WEEK)
  const [intensityModal, setIntensityModal] = useState<DayIntensity|null>(null)
  const [addModal,       setAddModal]       = useState<number|null>(null)
  const [detailModal,    setDetailModal]    = useState<Session|null>(null)
  const [dragOver,       setDragOver]       = useState<number|null>(null)
  const dragSession  = useRef<{sessionId:string;fromDay:number}|null>(null)
  const touchSession = useRef<string|null>(null)
  const touchFromDay = useRef<number|null>(null)

  function addSession(dayIdx:number, session:Session) {
    setWeek(prev=>prev.map((d,i)=>i===dayIdx?{...d,sessions:[...d.sessions,session]}:d))
  }
  function saveSession(updated:Session) {
    setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.map(s=>s.id===updated.id?updated:s)})))
    setDetailModal(null)
  }
  function validateSession(updated:Session) {
    setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.map(s=>s.id===updated.id?{...updated,status:'done' as const}:s)})))
    setDetailModal(null)
  }
  function deleteSession(id:string) {
    setWeek(prev=>prev.map(d=>({...d,sessions:d.sessions.filter(s=>s.id!==id)})))
    setDetailModal(null)
  }
  function changeIntensity(dayIdx:number) {
    setWeek(prev=>prev.map((d,i)=>{
      if(i!==dayIdx) return d
      return {...d,intensity:INTENSITY_ORDER[(INTENSITY_ORDER.indexOf(d.intensity)+1)%INTENSITY_ORDER.length]}
    }))
  }
  function onDragStart(sessionId:string, fromDay:number) { dragSession.current={sessionId,fromDay} }
  function onDrop(toDay:number) {
    if(!dragSession.current) return
    const {sessionId,fromDay}=dragSession.current
    if(fromDay===toDay){dragSession.current=null;setDragOver(null);return}
    setWeek(prev=>{
      const session=prev[fromDay].sessions.find(s=>s.id===sessionId)
      if(!session) return prev
      return prev.map((d,i)=>{
        if(i===fromDay) return {...d,sessions:d.sessions.filter(s=>s.id!==sessionId)}
        if(i===toDay)   return {...d,sessions:[...d.sessions,session]}
        return d
      })
    })
    dragSession.current=null;setDragOver(null)
  }
  function onTouchStartSession(sessionId:string, dayIdx:number) {
    touchSession.current=sessionId; touchFromDay.current=dayIdx
  }
  function onTouchEndSession(e:React.TouchEvent) {
    const touch=e.changedTouches[0]
    const els=document.elementsFromPoint(touch.clientX,touch.clientY)
    const dayEl=els.find(el=>(el as HTMLElement).dataset?.dayIndex!==undefined)
    const toDay=dayEl?parseInt((dayEl as HTMLElement).dataset.dayIndex||'-1'):-1
    if(toDay>=0&&touchSession.current!==null&&touchFromDay.current!==null&&toDay!==touchFromDay.current){
      const sid=touchSession.current, from=touchFromDay.current
      setWeek(prev=>{
        const session=prev[from].sessions.find(s=>s.id===sid)
        if(!session) return prev
        return prev.map((d,i)=>{
          if(i===from) return {...d,sessions:d.sessions.filter(s=>s.id!==sid)}
          if(i===toDay) return {...d,sessions:[...d.sessions,session]}
          return d
        })
      })
    }
    touchSession.current=null; touchFromDay.current=null
  }

  const allSessions=week.flatMap(d=>d.sessions)
  const totalMin=allSessions.reduce((s,x)=>s+x.durationMin,0)
  const totalH=totalMin/60
  const totalTSS=allSessions.reduce((s,x)=>s+(x.tss||0),0)
  const counts=week.reduce((acc,d)=>{acc[d.intensity]=(acc[d.intensity]||0)+1;return acc},{} as Record<DayIntensity,number>)
  const sportH:Record<SportType,number>={run:0,bike:0,swim:0,hyrox:0,gym:0}
  allSessions.forEach(s=>{sportH[s.sport]+=s.durationMin/60})
  const sportEntries=(Object.entries(sportH) as [SportType,number][]).filter(([,h])=>h>0)

  return (
    <div style={{padding:'24px 28px',maxWidth:'100%'}}>

      {intensityModal&&<IntensityModal intensity={intensityModal} onClose={()=>setIntensityModal(null)}/>}
      {addModal!==null&&<AddSessionModal dayIndex={addModal} onClose={()=>setAddModal(null)} onAdd={addSession}/>}
      {detailModal&&<SessionDetailModal
        session={detailModal}
        planned={detailModal}
        onClose={()=>setDetailModal(null)}
        onSave={saveSession}
        onValidate={validateSession}
        onDelete={deleteSession}
      />}

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0}}>Planning</h1>
          <p style={{fontSize:12.5,color:'var(--text-dim)',margin:'5px 0 0'}}>Semaine 12 — 18 au 24 mars · Bloc construction</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{padding:'8px 14px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border-mid)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>← Préc.</button>
          <button style={{padding:'8px 14px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border-mid)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>Suiv. →</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:20}} className="md:grid-cols-4">
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)',display:'flex',alignItems:'center',gap:14}}>
          <div style={{position:'relative',width:60,height:60,flexShrink:0}}>
            <svg width="60" height="60" viewBox="0 0 60 60" style={{transform:'rotate(-90deg)'}}>
              <circle cx="30" cy="30" r="24" fill="none" stroke="var(--border)" strokeWidth="7"/>
              {sportEntries.map(([sport,h],i)=>{
                const pct=h/totalH,circ=2*Math.PI*24,prev=sportEntries.slice(0,i).reduce((s,[,v])=>s+v/totalH,0)
                return <circle key={sport} cx="30" cy="30" r="24" fill="none" stroke={SPORT_BORDER[sport]} strokeWidth="7" strokeLinecap="butt" strokeDasharray={`${pct*circ} ${circ}`} strokeDashoffset={-prev*circ} opacity={0.8}/>
              })}
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:10,color:'#00c8e0'}}>{totalH.toFixed(1)}h</span>
            </div>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 3px'}}>Volume</p>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#00c8e0',margin:0}}>{formatDur(totalMin)}</p>
            <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>{totalTSS} TSS</p>
          </div>
        </div>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)'}}>
          <p style={{fontSize:11,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 10px'}}>Équilibre semaine</p>
          <div style={{display:'flex',gap:3,height:7,borderRadius:999,overflow:'hidden',marginBottom:10}}>
            {INTENSITY_ORDER.filter(k=>counts[k]>0).map(k=>(
              <div key={k} style={{flex:counts[k],background:INTENSITY_CONFIG[k].color,opacity:0.7}}/>
            ))}
          </div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap' as const}}>
            {INTENSITY_ORDER.filter(k=>counts[k]>0).map(k=>(
              <span key={k} style={{padding:'2px 7px',borderRadius:20,background:INTENSITY_CONFIG[k].bg,border:`1px solid ${INTENSITY_CONFIG[k].border}`,color:INTENSITY_CONFIG[k].color,fontSize:10,fontWeight:700}}>
                {counts[k]} {INTENSITY_CONFIG[k].label}
              </span>
            ))}
          </div>
        </div>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)'}}>
          <p style={{fontSize:11,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 8px'}}>Séances</p>
          <p style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:700,color:'#ffb340',margin:0}}>{allSessions.length}<span style={{fontSize:12,color:'var(--text-dim)',marginLeft:4}}>cette sem.</span></p>
        </div>
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:18,boxShadow:'var(--shadow-card)'}}>
          <p style={{fontSize:11,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'var(--text-dim)',margin:'0 0 8px'}}>TSS estimé</p>
          <p style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:700,color:'#5b6fff',margin:0}}>{totalTSS}<span style={{fontSize:12,color:'var(--text-dim)',marginLeft:4}}>pts</span></p>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block" style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)',overflowX:'auto'}}>
        <div style={{minWidth:700}}>
          <div style={{display:'grid',gridTemplateColumns:'44px repeat(7,1fr)',gap:6,marginBottom:10}}>
            <div/>
            {week.map((d,dayIdx)=>{
              const cfg=INTENSITY_CONFIG[d.intensity]
              return (
                <div key={d.day} style={{textAlign:'center' as const}}>
                  <p style={{fontSize:11,color:'var(--text-dim)',textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 2px',fontWeight:500}}>{d.day}</p>
                  <p style={{fontSize:14,fontWeight:600,margin:'0 0 6px'}}>{d.date}</p>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
                    <button onClick={()=>setIntensityModal(d.intensity)} style={{padding:'2px 7px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700,cursor:'pointer'}}>{cfg.label}</button>
                    <button onClick={()=>changeIntensity(dayIdx)} title="Changer" style={{width:16,height:16,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'44px repeat(7,1fr)',gap:6}}>
            <div/>
            {week.map((d,dayIdx)=>(
              <div key={d.day} data-day-index={dayIdx}
                onDragOver={e=>{e.preventDefault();setDragOver(dayIdx)}}
                onDragLeave={()=>setDragOver(null)}
                onDrop={()=>onDrop(dayIdx)}
                style={{minHeight:120,borderRadius:10,padding:4,background:dragOver===dayIdx?'rgba(0,200,224,0.06)':'var(--bg-card2)',border:`1px solid ${dragOver===dayIdx?'rgba(0,200,224,0.3)':'var(--border)'}`,transition:'all 0.15s',display:'flex',flexDirection:'column',gap:4}}>
                {d.sessions.map(s=>(
                  <div key={s.id} draggable onDragStart={()=>onDragStart(s.id,dayIdx)} onClick={()=>setDetailModal(s)}
                    style={{borderRadius:7,padding:'5px 7px',background:SPORT_BG[s.sport],borderLeft:`2px solid ${SPORT_BORDER[s.sport]}`,cursor:'grab',opacity:s.status==='done'?0.75:1,position:'relative'}}>
                    {s.status==='done'&&<span style={{position:'absolute',top:3,right:3,fontSize:8,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 3px',borderRadius:3,fontWeight:700}}>✓{s.completionPct?` ${s.completionPct}%`:''}</span>}
                    {s.isTrainer&&<span style={{position:'absolute',top:3,left:3,fontSize:8}}>🏠</span>}
                    <p style={{fontSize:10,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,paddingLeft:s.isTrainer?'12px':'0'}}>{SPORT_EMOJI[s.sport]} {s.title}</p>
                    <p style={{fontSize:9,opacity:0.7,margin:'2px 0 0',fontFamily:'DM Mono,monospace'}}>{s.time} · {formatDur(s.durationMin)}</p>
                    {s.blocks.length>0&&(
                      <div style={{display:'flex',gap:1,marginTop:3,height:6,borderRadius:2,overflow:'hidden'}}>
                        {s.blocks.map(b=><div key={b.id} style={{flex:b.durationMin,background:ZONE_COLORS[b.zone-1],opacity:0.8}}/>)}
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={()=>setAddModal(dayIdx)} style={{marginTop:'auto',padding:'4px',borderRadius:6,background:'transparent',border:'1px dashed var(--border)',color:'var(--text-dim)',fontSize:11,cursor:'pointer',width:'100%'}}>+</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{display:'flex',flexDirection:'column',gap:10}}>
        {week.map((d,dayIdx)=>{
          const cfg=INTENSITY_CONFIG[d.intensity]
          return (
            <div key={d.day} data-day-index={dayIdx} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:14,boxShadow:'var(--shadow-card)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:d.sessions.length?10:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{textAlign:'center' as const,minWidth:36}}>
                    <p style={{fontSize:10,color:'var(--text-dim)',textTransform:'uppercase' as const,margin:0}}>{d.day}</p>
                    <p style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:0}}>{d.date}</p>
                  </div>
                  <button onClick={()=>setIntensityModal(d.intensity)} style={{padding:'3px 10px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:11,fontWeight:700,cursor:'pointer'}}>{cfg.label}</button>
                  <button onClick={()=>changeIntensity(dayIdx)} style={{width:22,height:22,borderRadius:'50%',background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-dim)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>+</button>
                </div>
                <button onClick={()=>setAddModal(dayIdx)} style={{padding:'5px 10px',borderRadius:8,background:'rgba(0,200,224,0.08)',border:'1px solid rgba(0,200,224,0.2)',color:'#00c8e0',fontSize:12,cursor:'pointer',fontWeight:600}}>+ Ajouter</button>
              </div>
              {d.sessions.length>0&&(
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {d.sessions.map(s=>(
                    <div key={s.id} onClick={()=>setDetailModal(s)}
                      onTouchStart={()=>onTouchStartSession(s.id,dayIdx)}
                      onTouchEnd={onTouchEndSession}
                      style={{display:'flex',flexDirection:'column',padding:'10px 12px',borderRadius:10,background:SPORT_BG[s.sport],borderLeft:`3px solid ${SPORT_BORDER[s.sport]}`,cursor:'pointer',opacity:s.status==='done'?0.75:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:s.blocks.length?6:0}}>
                        <span style={{fontSize:16}}>{SPORT_EMOJI[s.sport]}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:s.main?600:400,margin:0}}>
                            {s.title}
                            {s.isTrainer&&<span style={{marginLeft:5,fontSize:10}}>🏠</span>}
                            {s.status==='done'&&<span style={{marginLeft:6,fontSize:9,background:SPORT_BORDER[s.sport],color:'#fff',padding:'1px 5px',borderRadius:4,fontWeight:700}}>✓{s.completionPct?` ${s.completionPct}%`:''}</span>}
                          </p>
                          <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>{s.time} · {formatDur(s.durationMin)}{s.tss?` · ${s.tss} TSS`:''}</p>
                        </div>
                      </div>
                      {s.blocks.length>0&&(
                        <div style={{display:'flex',gap:1,height:10,borderRadius:3,overflow:'hidden'}}>
                          {s.blocks.map(b=><div key={b.id} style={{flex:b.durationMin,background:ZONE_COLORS[b.zone-1],opacity:0.75}}/>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {d.sessions.length===0&&<p style={{fontSize:12,color:'var(--text-dim)',margin:0,fontStyle:'italic' as const}}>Jour de repos</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
