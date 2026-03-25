'use client'

import { useState, useRef, useEffect } from 'react'

type MainTab   = 'training' | 'recovery' | 'nutrition'
type Period    = '1S' | '6S' | '1M' | '3M' | '6M' | '1A'
type SportZone = 'run' | 'bike'
type MealType  = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner'
type ChatRole  = 'user' | 'ai'
type PlusMenu  = 'photo' | 'plan' | 'saved' | null
type PlanStep  = 'intro' | 'questionnaire' | 'result' | null

const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444']
const ZONE_LABELS = ['Z1','Z2','Z3','Z4','Z5']

const TRAINING_DATA: Record<Period,{volumeH:number;sessions:number;tss:number;rpe:number;sports:{run:number;bike:number;swim:number;hyrox:number;gym:number};zones:{run:number[];bike:number[]};types:number[]}> = {
  '1S':{volumeH:12.4,sessions:8, tss:487, rpe:6.2,sports:{run:3.5,bike:5,swim:2,hyrox:1.2,gym:0.7},zones:{run:[15,40,25,15,5],bike:[10,35,30,20,5]},types:[10,30,15,25,10,5,5]},
  '6S':{volumeH:68,  sessions:42,tss:2840,rpe:6.0,sports:{run:20,bike:28,swim:10,hyrox:6,gym:4},   zones:{run:[20,38,22,15,5],bike:[12,33,28,22,5]},types:[12,28,14,26,10,6,4]},
  '1M':{volumeH:48,  sessions:30,tss:1920,rpe:6.1,sports:{run:14,bike:20,swim:8,hyrox:4,gym:2},    zones:{run:[18,38,24,15,5],bike:[11,34,29,21,5]},types:[11,29,14,26,10,6,4]},
  '3M':{volumeH:145, sessions:90,tss:5800,rpe:6.0,sports:{run:42,bike:60,swim:24,hyrox:12,gym:7},  zones:{run:[19,37,23,16,5],bike:[12,33,28,22,5]},types:[12,28,14,26,10,6,4]},
  '6M':{volumeH:290, sessions:178,tss:11600,rpe:5.9,sports:{run:84,bike:120,swim:48,hyrox:24,gym:14},zones:{run:[20,36,24,15,5],bike:[13,32,28,22,5]},types:[13,27,14,26,10,6,4]},
  '1A':{volumeH:580, sessions:350,tss:23000,rpe:5.8,sports:{run:168,bike:240,swim:96,hyrox:48,gym:28},zones:{run:[21,35,24,15,5],bike:[14,31,28,22,5]},types:[14,26,14,26,10,6,4]},
}

const LOAD_WEEKS=[{w:'S7',ctl:72,atl:68,tsb:4},{w:'S8',ctl:76,atl:82,tsb:-6},{w:'S9',ctl:78,atl:88,tsb:-10},{w:'S10',ctl:80,atl:75,tsb:5},{w:'S11',ctl:82,atl:90,tsb:-8},{w:'S12',ctl:84,atl:91,tsb:-7}]
const HRV_DATA=[58,62,55,60,63,57,54,59,65,61,58,56,60,62,64,59,57,55,58,61,63,60,58,57,61,63,65,62,59,58]
const SLEEP_DATA=[7.2,6.8,7.5,8.0,7.1,6.5,7.8,7.3,6.9,7.6,8.1,7.4,6.7,7.9,7.2,6.8,7.5,8.0,7.2,6.9,7.6,7.4,6.8,7.1,7.8,8.2,7.3,7.0,6.8,7.5]
const RESTHR_DATA=[44,46,43,45,44,47,45,44,43,46,44,45,43,44,46,45,43,44,45,43,44,46,44,43,45,44,43,44,45,44]

interface FoodEntry{id:string;name:string;cal:number;p:number;g:number;l:number;detail?:string}
interface MealSection{type:MealType;label:string;emoji:string;entries:FoodEntry[]}
interface ChatMessage{id:string;role:ChatRole;content:string;timestamp:string}
interface SavedMeal{id:string;name:string;entries:FoodEntry[];totalCal:number}
interface NutriPlan{calories:number;protein:number;carbs:number;fat:number;byDay:{low:{cal:number;p:number;g:number;l:number};mid:{cal:number;p:number;g:number;l:number};hard:{cal:number;p:number;g:number;l:number}}}
interface QuestionnaireData{weight:number;height:number;age:number;sex:'m'|'f';goal:'loss'|'gain'|'maintain'|'performance';activity:'low'|'moderate'|'high';trainingH:number;allergies:string}

const DEFAULT_Q:QuestionnaireData={weight:75,height:178,age:31,sex:'m',goal:'performance',activity:'moderate',trainingH:12,allergies:''}

const INITIAL_MEALS:MealSection[]=[
  {type:'breakfast',label:'Petit-déjeuner',emoji:'☀️',entries:[
    {id:'f1',name:'Flocons avoine + lait + banane',cal:380,p:14,g:62,l:8},
  ]},
  {type:'snack_am',label:'Collation matin',emoji:'🍎',entries:[]},
  {type:'lunch',label:'Déjeuner',emoji:'🥗',entries:[
    {id:'f3',name:'Poulet riz légumes',cal:620,p:48,g:65,l:14},
  ]},
  {type:'snack_pm',label:'Goûter',emoji:'🍌',entries:[]},
  {type:'dinner',label:'Dîner',emoji:'🌙',entries:[]},
]

const INITIAL_CHAT:ChatMessage[]=[{
  id:'0',role:'ai',
  content:'👋 Bonjour ! Je suis ton assistant nutrition IA.\n\nUtilise les sections ci-dessus pour enregistrer tes repas — je calcule les valeurs nutritionnelles précises via une analyse IA réelle.\n\nTu peux aussi me poser des questions sur ta nutrition.',
  timestamp:'09:00',
}]

const SAVED_MEALS_INIT:SavedMeal[]=[
  {id:'sm1',name:'Petit-dej endurance',totalCal:520,entries:[
    {id:'se1',name:'Porridge avoine + myrtilles',cal:320,p:10,g:58,l:6},
    {id:'se2',name:'Yaourt grec 0%',cal:100,p:17,g:6,l:0},
  ]},
]

const AI_CHAT_RESPONSES=[
  '💡 Pour optimiser ta récupération, vise 1.8-2g de protéines par kg de poids corporel par jour. Avec 75kg, ça fait ~135-150g minimum.',
  '⚡ Les glucides sont ton carburant principal en endurance. Les jours Hard, vise 6-8g/kg soit 450-600g. Les jours Low, tu peux réduire à 4-5g/kg.',
  '🔍 L\'hydratation est souvent négligée. Vise 35-40ml/kg/jour + 500ml par heure de sport.',
  '📊 Ton apport calorique semble adapté à ta charge. Continue sur cette lancée les jours d\'entraînement.',
  '🏃 Avant une séance longue (+2h), charge en glucides la veille : pâtes, riz, patate douce. Évite les fibres 2h avant l\'effort.',
]

function uid():string{return `${Date.now()}_${Math.random().toString(36).slice(2)}`}
function nowTime():string{return new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function formatH(h:number):string{const hh=Math.floor(h),mm=Math.round((h-hh)*60);return mm>0?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`}
function totalMacros(meals:MealSection[]){const all=meals.flatMap(m=>m.entries);return{cal:all.reduce((s,e)=>s+e.cal,0),p:all.reduce((s,e)=>s+e.p,0),g:all.reduce((s,e)=>s+e.g,0),l:all.reduce((s,e)=>s+e.l,0)}}

// ── Analyse IA réelle ─────────────────────────────
async function analyzeFood(text:string):Promise<FoodEntry> {
  try {
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        messages:[{
          role:'user',
          content:`Tu es un expert en nutrition sportive. Analyse ce repas et calcule les valeurs nutritionnelles PRÉCISES.

Repas : "${text}"

Règles importantes :
- Utilise les valeurs nutritionnelles réelles de chaque aliment
- Pour les marques mentionnées (Bjorg, Danone, etc.), utilise leurs valeurs exactes si tu les connais
- Si pas de quantité précisée, utilise une portion standard réaliste (ex: 1 œuf = 60g, 1 banane = 120g, 1 yaourt = 125g)
- Calcule le TOTAL de tous les aliments mentionnés
- Sois précis

Réponds UNIQUEMENT avec ce JSON, rien d'autre, pas de markdown :
{"name":"description courte","cal":730,"p":33,"g":92,"l":18,"detail":"3 œufs 210kcal + yaourt 90kcal + etc"}`
        }]
      })
    })
    const data=await response.json()
    const raw=data.content[0].text.replace(/```json|```/g,'').trim()
    const parsed=JSON.parse(raw)
    return{id:uid(),name:parsed.name||text,cal:parsed.cal||0,p:parsed.p||0,g:parsed.g||0,l:parsed.l||0,detail:parsed.detail}
  } catch(e) {
    return{id:uid(),name:text,cal:0,p:0,g:0,l:0,detail:'Erreur d\'analyse'}
  }
}

function calcBMR(w:number,h:number,a:number,s:'m'|'f'):number{return s==='m'?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161}
function generatePlan(q:QuestionnaireData):NutriPlan{
  const bmr=calcBMR(q.weight,q.height,q.age,q.sex)
  const af={low:1.2,moderate:1.55,high:1.9}[q.activity]
  const tdee=bmr*af+q.trainingH*8*60/7
  const base=q.goal==='loss'?tdee*0.85:q.goal==='gain'?tdee*1.10:tdee
  const protein=Math.round(q.weight*(q.goal==='performance'?2.0:1.8))
  const fat=Math.round(q.weight*1.1)
  const carbs=Math.round((base-protein*4-fat*9)/4)
  return{calories:Math.round(base),protein,carbs,fat,byDay:{low:{cal:Math.round(base*0.85),p:protein,g:Math.round(carbs*0.70),l:fat},mid:{cal:Math.round(base),p:protein,g:carbs,l:fat},hard:{cal:Math.round(base*1.15),p:protein,g:Math.round(carbs*1.25),l:fat}}}
}

// ── UI atoms ──────────────────────────────────────
function StatBox({label,value,color}:{label:string;value:string|number;color?:string}){
  return(
    <div style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:12,padding:'11px 13px'}}>
      <p style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',margin:'0 0 4px'}}>{label}</p>
      <p style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:color||'var(--text)',margin:0}}>{value}</p>
    </div>
  )
}

function PeriodSel({value,onChange}:{value:Period;onChange:(p:Period)=>void}){
  const opts:[Period,string][]=[['1S','1S'],['6S','6S'],['1M','1M'],['3M','3M'],['6M','6M'],['1A','1A']]
  return(
    <div style={{display:'flex',gap:3,flexWrap:'wrap' as const}}>
      {opts.map(([id,l])=>(
        <button key={id} onClick={()=>onChange(id)}
          style={{padding:'3px 9px',borderRadius:6,border:'1px solid',fontSize:10,cursor:'pointer',
            borderColor:value===id?'#00c8e0':'var(--border)',
            background:value===id?'rgba(0,200,224,0.10)':'var(--bg-card2)',
            color:value===id?'#00c8e0':'var(--text-dim)',fontWeight:value===id?600:400}}>
          {l}
        </button>
      ))}
    </div>
  )
}

function Donut({slices,size=72,stroke=8,center}:{slices:{pct:number;color:string}[];size?:number;stroke?:number;center?:React.ReactNode}){
  const r=(size-stroke)/2,c=2*Math.PI*r;let cum=0
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
        {slices.filter(s=>s.pct>0).map((s,i)=>{const dash=(s.pct/100)*c,off=-cum*c/100;cum+=s.pct;return<circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="butt" strokeDasharray={`${dash} ${c}`} strokeDashoffset={off} opacity={0.85}/>})}
      </svg>
      {center&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{center}</div>}
    </div>
  )
}

function LineChart({data,color='#00c8e0',height=60}:{data:number[];color?:string;height?:number}){
  if(!data.length) return null
  const min=Math.min(...data)*0.95,max=Math.max(...data)*1.05,w=300
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${height-((v-min)/(max-min))*height}`).join(' ')
  const area=`0,${height} ${pts} ${w},${height}`
  return(
    <svg viewBox={`0 0 ${w} ${height}`} style={{width:'100%',height,overflow:'visible'}}>
      <defs><linearGradient id={`lg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0.02"/></linearGradient></defs>
      <polygon points={area} fill={`url(#lg${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function MacroBar({label,value,target,color}:{label:string;value:number;target:number;color:string}){
  const pct=Math.min(value/target*100,100)
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
        <span style={{color:'var(--text-mid)'}}>{label}</span>
        <span style={{fontFamily:'DM Mono,monospace',color}}>{value}g <span style={{color:'var(--text-dim)'}}>/ {target}g</span></span>
      </div>
      <div style={{height:5,borderRadius:999,overflow:'hidden',background:'var(--border)'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:999,transition:'width 0.5s'}}/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// TRAINING TAB
// ════════════════════════════════════════════════
function TrainingTab(){
  const [period,setPeriod]=useState<Period>('1S')
  const [zoneSport,setZoneSport]=useState<SportZone>('run')
  const d=TRAINING_DATA[period]
  const sportTotal=Object.values(d.sports).reduce((s,v)=>s+v,0)
  const sportList=[
    {key:'run',  label:'Running',    color:'#22c55e',v:d.sports.run},
    {key:'bike', label:'Cyclisme',   color:'#3b82f6',v:d.sports.bike},
    {key:'swim', label:'Natation',   color:'#38bdf8',v:d.sports.swim},
    {key:'hyrox',label:'Hyrox',      color:'#ef4444',v:d.sports.hyrox},
    {key:'gym',  label:'Musculation',color:'#f97316',v:d.sports.gym},
  ].filter(s=>s.v>0)
  const typeLabels=['Récup','EF','SL1','Sweet Spot','SL2','VMA','Mixte']
  const typeColors=['#9ca3af','#22c55e','#38bdf8','#eab308','#f97316','#ef4444','#a78bfa']
  const maxLoad=Math.max(...LOAD_WEEKS.map(w=>Math.max(w.ctl,w.atl)))

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Vue d'ensemble</h2>
          <PeriodSel value={period} onChange={setPeriod}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}} className="md:grid-cols-4">
          <StatBox label="Volume"    value={formatH(d.volumeH)} color="#00c8e0"/>
          <StatBox label="Séances"   value={d.sessions}          color="#ffb340"/>
          <StatBox label="TSS total" value={d.tss}               color="#5b6fff"/>
          <StatBox label="RPE moyen" value={`${d.rpe.toFixed(1)}/10`} color="#f97316"/>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Charge training — CTL / ATL / TSB</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          <StatBox label="CTL — Forme"   value={84} color="#00c8e0"/>
          <StatBox label="ATL — Fatigue" value={91} color="#ff5f5f"/>
          <StatBox label="TSB — Balance" value={-7} color="#5b6fff"/>
        </div>
        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:300,display:'flex',gap:6,alignItems:'flex-end',height:80}}>
            {LOAD_WEEKS.map((w,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{width:'100%',display:'flex',flexDirection:'column',gap:2}}>
                  <div style={{height:`${(w.ctl/maxLoad)*70}px`,background:'rgba(0,200,224,0.70)',borderRadius:'3px 3px 0 0'}}/>
                  <div style={{height:`${(w.atl/maxLoad)*70}px`,background:'rgba(255,95,95,0.55)',borderRadius:'3px 3px 0 0'}}/>
                </div>
                <span style={{fontSize:9,fontFamily:'DM Mono,monospace',color:'var(--text-dim)'}}>{w.w}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          {[{c:'#00c8e0',l:'CTL'},{c:'#ff5f5f',l:'ATL'},{c:'#5b6fff',l:'TSB'}].map(x=>(
            <span key={x.l} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:x.c}}>
              <span style={{width:8,height:8,borderRadius:2,background:x.c,display:'inline-block'}}/>{x.l}
            </span>
          ))}
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Répartition par sport</h2>
          <PeriodSel value={period} onChange={setPeriod}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' as const}}>
          <Donut slices={sportList.map(s=>({pct:s.v/sportTotal*100,color:s.color}))} size={84} stroke={10}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
            {sportList.map(s=>{
              const pct=Math.round(s.v/sportTotal*100)
              return(
                <div key={s.key} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0,display:'inline-block'}}/>
                  <span style={{flex:1,fontSize:12,color:'var(--text-mid)'}}>{s.label}</span>
                  <div style={{flex:2,height:5,borderRadius:999,overflow:'hidden',background:'var(--border)'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:s.color,opacity:0.8,borderRadius:999}}/>
                  </div>
                  <span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:s.color,width:30,textAlign:'right' as const}}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap' as const,gap:8}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Zones d'intensité</h2>
          <PeriodSel value={period} onChange={setPeriod}/>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {(['run','bike'] as SportZone[]).map(s=>(
            <button key={s} onClick={()=>setZoneSport(s)}
              style={{padding:'5px 12px',borderRadius:8,border:'1px solid',cursor:'pointer',
                borderColor:zoneSport===s?(s==='run'?'#22c55e':'#3b82f6'):'var(--border)',
                background:zoneSport===s?(s==='run'?'rgba(34,197,94,0.10)':'rgba(59,130,246,0.10)'):'var(--bg-card2)',
                color:zoneSport===s?(s==='run'?'#22c55e':'#3b82f6'):'var(--text-dim)',
                fontSize:12,fontWeight:zoneSport===s?600:400}}>
              {s==='run'?'🏃 Running':'🚴 Cyclisme'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:3,height:12,borderRadius:6,overflow:'hidden',marginBottom:8}}>
          {d.zones[zoneSport].map((pct,i)=><div key={i} style={{flex:pct,background:ZONE_COLORS[i],opacity:0.85}}/>)}
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
          {d.zones[zoneSport].map((pct,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:3}}>
              <span style={{width:7,height:7,borderRadius:2,background:ZONE_COLORS[i],display:'inline-block'}}/>
              <span style={{fontSize:10,color:ZONE_COLORS[i],fontFamily:'DM Mono,monospace',fontWeight:600}}>{ZONE_LABELS[i]} {pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Types de séances</h2>
          <PeriodSel value={period} onChange={setPeriod}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' as const}}>
          <Donut slices={d.types.map((pct,i)=>({pct,color:typeColors[i]}))} size={80} stroke={10}/>
          <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px 12px'}}>
            {typeLabels.map((t,i)=>(
              <div key={t} style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{width:7,height:7,borderRadius:2,background:typeColors[i],display:'inline-block',flexShrink:0}}/>
                <span style={{fontSize:11,color:'var(--text-mid)',flex:1}}>{t}</span>
                <span style={{fontSize:11,fontFamily:'DM Mono,monospace',color:typeColors[i],fontWeight:600}}>{d.types[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// RECOVERY TAB
// ════════════════════════════════════════════════
function RecoveryTab(){
  const [hrvPeriod,setHrvPeriod]=useState<'7j'|'30j'>('7j')
  const hrvData=hrvPeriod==='7j'?HRV_DATA.slice(-7):HRV_DATA.slice(-30)
  const avgHrv=Math.round(hrvData.reduce((s,v)=>s+v,0)/hrvData.length)
  const readiness=75
  const rc=readiness>=70?'#00c8e0':readiness>=50?'#ffb340':'#ef4444'
  const rl=readiness>=70?'Bonne forme':readiness>=50?'Fatigue modérée':'Fatigue élevée'
  const avgSleep=(SLEEP_DATA.slice(-14).reduce((s,v)=>s+v,0)/14).toFixed(1)

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:'var(--bg-card)',border:`1px solid ${rc}33`,borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' as const}}>
          <Donut slices={[{pct:readiness,color:rc}]} size={80} stroke={9}
            center={<div style={{textAlign:'center' as const}}><span style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:rc}}>{readiness}</span><span style={{fontSize:8,color:'var(--text-dim)',display:'block'}}>/100</span></div>}/>
          <div style={{flex:1}}>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:rc,margin:0}}>{rl}</p>
            <p style={{fontSize:12,color:'var(--text-dim)',margin:'3px 0 12px'}}>Readiness score · Aujourd'hui</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              <StatBox label="HRV moy."  value={`${avgHrv}ms`}  color="#00c8e0"/>
              <StatBox label="FC repos"  value="44bpm"            color="#22c55e"/>
              <StatBox label="Sommeil"   value={`${avgSleep}h`}  color="#5b6fff"/>
              <StatBox label="Fatigue"   value="3/10"             color="#ffb340"/>
            </div>
          </div>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap' as const,gap:8}}>
          <div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>HRV (VFC)</h2>
            <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>Moy. <span style={{color:'#00c8e0',fontWeight:600,fontFamily:'DM Mono,monospace'}}>{avgHrv}ms</span> · Tendance <span style={{color:'#22c55e'}}>↑ Positive</span></p>
          </div>
          <div style={{display:'flex',gap:4}}>
            {(['7j','30j'] as const).map(p=>(
              <button key={p} onClick={()=>setHrvPeriod(p)}
                style={{padding:'4px 10px',borderRadius:7,border:'1px solid',fontSize:11,cursor:'pointer',
                  borderColor:hrvPeriod===p?'#00c8e0':'var(--border)',
                  background:hrvPeriod===p?'rgba(0,200,224,0.10)':'var(--bg-card2)',
                  color:hrvPeriod===p?'#00c8e0':'var(--text-dim)'}}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <LineChart data={hrvData} color="#00c8e0" height={56}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:'var(--text-dim)'}}>
          <span>-{hrvData.length}j</span><span>Aujourd'hui</span>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 4px'}}>Sommeil — 14 jours</h2>
        <p style={{fontSize:11,color:'var(--text-dim)',margin:'0 0 10px'}}>Moy. <span style={{color:'#5b6fff',fontWeight:600,fontFamily:'DM Mono,monospace'}}>{avgSleep}h</span> · Objectif 8h</p>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:52}}>
          {SLEEP_DATA.slice(-14).map((v,i)=>{
            const c=v>=7.5?'#22c55e':v>=6.5?'#ffb340':'#ef4444'
            return<div key={i} style={{flex:1,height:`${(v/9)*52}px`,minHeight:2,borderRadius:'3px 3px 0 0',background:`linear-gradient(180deg,${c}bb,${c}44)`}}/>
          })}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:'var(--text-dim)'}}>
          <span>-14j</span><span>Aujourd'hui</span>
        </div>
      </div>

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:'0 0 4px'}}>FC de repos</h2>
        <p style={{fontSize:11,color:'var(--text-dim)',margin:'0 0 10px'}}>Actuelle <span style={{color:'#22c55e',fontWeight:600,fontFamily:'DM Mono,monospace'}}>44bpm</span> · Moy. 30j 44.5bpm</p>
        <LineChart data={RESTHR_DATA} color="#22c55e" height={48}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:'var(--text-dim)'}}>
          <span>-30j</span><span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// NUTRITION TAB
// ════════════════════════════════════════════════
function NutritionTab(){
  const [meals,setMeals]=useState<MealSection[]>(INITIAL_MEALS)
  const [chat,setChat]=useState<ChatMessage[]>(INITIAL_CHAT)
  const [chatInput,setChatInput]=useState('')
  const [chatLoading,setChatLoading]=useState(false)
  const [plusOpen,setPlusOpen]=useState(false)
  const [plusMode,setPlusMode]=useState<PlusMenu>(null)
  const [planStep,setPlanStep]=useState<PlanStep>(null)
  const [nutPlan,setNutPlan]=useState<NutriPlan|null>(null)
  const [savedMeals,setSavedMeals]=useState<SavedMeal[]>(SAVED_MEALS_INIT)
  const [activeMealLog,setActiveMealLog]=useState<MealType|null>(null)
  const [mealInput,setMealInput]=useState('')
  const [mealLoading,setMealLoading]=useState(false)
  const [saveModal,setSaveModal]=useState<{mealType:MealType}|null>(null)
  const [saveName,setSaveName]=useState('')
  const [qData,setQData]=useState<QuestionnaireData>(DEFAULT_Q)
  const [qStep,setQStep]=useState(0)
  const chatRef=useRef<HTMLDivElement>(null)

  const CAL_TARGET=nutPlan?.calories??3100
  const P_TARGET=nutPlan?.protein??185
  const G_TARGET=nutPlan?.carbs??380
  const L_TARGET=nutPlan?.fat??95
  const totals=totalMacros(meals)
  const CAL_WEEK=[2850,3100,2750,3200,2950,3050,totals.cal]
  const macroTotal=totals.p*4+totals.g*4+totals.l*9||1
  const macroSlices=[{pct:totals.p*4/macroTotal*100,color:'#3b82f6'},{pct:totals.g*4/macroTotal*100,color:'#22c55e'},{pct:totals.l*9/macroTotal*100,color:'#f97316'}]

  useEffect(()=>{if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight},[chat])

  function sendChat(){
    if(!chatInput.trim()) return
    const um:ChatMessage={id:uid(),role:'user',content:chatInput,timestamp:nowTime()}
    setChat(p=>[...p,um]); setChatInput(''); setChatLoading(true)
    setTimeout(()=>{
      const am:ChatMessage={id:uid(),role:'ai',content:AI_CHAT_RESPONSES[Math.floor(Math.random()*AI_CHAT_RESPONSES.length)],timestamp:nowTime()}
      setChat(p=>[...p,am]); setChatLoading(false)
    },900)
  }

  // ── Analyse IA réelle ──────────────────────────
  async function logMeal(mealType:MealType){
    if(!mealInput.trim()) return
    const inputCopy=mealInput
    setMealLoading(true)
    setMealInput('')

    // Message "en cours" dans le chat
    const loadingId=uid()
    const loadingMsg:ChatMessage={id:loadingId,role:'ai',content:'⏳ Analyse nutritionnelle en cours…',timestamp:nowTime()}
    setChat(p=>[...p,loadingMsg])

    const entry=await analyzeFood(inputCopy)
    setMeals(p=>p.map(m=>m.type===mealType?{...m,entries:[...m.entries,entry]}:m))

    const secLabel=INITIAL_MEALS.find(m=>m.type===mealType)?.label||''
    const aiContent=`📝 Ajouté à **${secLabel}**\n\n✅ ${entry.name}\n\n**${entry.cal} kcal** · ${entry.p}g protéines · ${entry.g}g glucides · ${entry.l}g lipides${entry.detail?`\n\n💡 ${entry.detail}`:''}`
    setChat(p=>p.map(m=>m.id===loadingId?{...m,content:aiContent}:m))
    setActiveMealLog(null)
    setMealLoading(false)
  }

  function removeEntry(mealType:MealType,id:string){
    setMeals(p=>p.map(m=>m.type===mealType?{...m,entries:m.entries.filter(e=>e.id!==id)}:m))
  }

  function useSavedMeal(sm:SavedMeal,mealType:MealType){
    setMeals(p=>p.map(m=>m.type===mealType?{...m,entries:[...m.entries,...sm.entries.map(e=>({...e,id:uid()}))]}:m))
    setPlusMode(null); setPlusOpen(false); setActiveMealLog(null)
  }

  function saveMealFn(){
    if(!saveName.trim()||!saveModal) return
    const sec=meals.find(m=>m.type===saveModal.mealType)
    if(!sec?.entries.length) return
    setSavedMeals(p=>[...p,{id:uid(),name:saveName,entries:[...sec.entries],totalCal:sec.entries.reduce((s,e)=>s+e.cal,0)}])
    setSaveModal(null); setSaveName('')
  }

  const qSteps=[
    {
      title:'Profil de base',
      content:(
        <div style={{display:'flex',flexDirection:'column',gap:11}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[{label:'Poids (kg)',k:'weight'},{label:'Taille (cm)',k:'height'},{label:'Âge',k:'age'}].map(f=>(
              <div key={f.k}>
                <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{f.label}</p>
                <input type="number" value={(qData as any)[f.k]} onChange={e=>setQData({...qData,[f.k]:parseFloat(e.target.value)||0})}
                  style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/>
              </div>
            ))}
            <div>
              <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Sexe</p>
              <div style={{display:'flex',gap:6}}>
                {[{v:'m',l:'Homme'},{v:'f',l:'Femme'}].map(o=>(
                  <button key={o.v} onClick={()=>setQData({...qData,sex:o.v as 'm'|'f'})}
                    style={{flex:1,padding:'7px',borderRadius:9,border:'1px solid',cursor:'pointer',
                      borderColor:qData.sex===o.v?'#00c8e0':'var(--border)',
                      background:qData.sex===o.v?'rgba(0,200,224,0.10)':'var(--bg-card2)',
                      color:qData.sex===o.v?'#00c8e0':'var(--text-mid)',fontSize:12}}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title:'Objectif',
      content:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            {v:'performance',l:'Performance',d:'Optimiser énergie et récupération',c:'#00c8e0'},
            {v:'loss',l:'Perte de poids',d:'Léger déficit calorique',c:'#22c55e'},
            {v:'gain',l:'Prise de masse',d:'Léger surplus calorique',c:'#f97316'},
            {v:'maintain',l:'Maintien',d:'Équilibre énergétique',c:'#9ca3af'},
          ].map(o=>(
            <button key={o.v} onClick={()=>setQData({...qData,goal:o.v as any})}
              style={{padding:'11px 14px',borderRadius:11,border:'1px solid',cursor:'pointer',textAlign:'left' as const,
                borderColor:qData.goal===o.v?o.c:'var(--border)',
                background:qData.goal===o.v?`${o.c}11`:'var(--bg-card2)',color:'var(--text-mid)'}}>
              <p style={{fontSize:13,fontWeight:600,margin:'0 0 1px',color:qData.goal===o.v?o.c:'var(--text)'}}>{o.l}</p>
              <p style={{fontSize:11,color:'var(--text-dim)',margin:0}}>{o.d}</p>
            </button>
          ))}
        </div>
      )
    },
    {
      title:'Activité & Volume',
      content:(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:8}}>Activité quotidienne</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[{v:'low',l:'Faible',d:'Travail de bureau'},{v:'moderate',l:'Modérée',d:'Actif au quotidien'},{v:'high',l:'Élevée',d:'Travail physique'}].map(o=>(
                <button key={o.v} onClick={()=>setQData({...qData,activity:o.v as any})}
                  style={{padding:'9px 13px',borderRadius:10,border:'1px solid',cursor:'pointer',textAlign:'left' as const,
                    borderColor:qData.activity===o.v?'#00c8e0':'var(--border)',
                    background:qData.activity===o.v?'rgba(0,200,224,0.10)':'var(--bg-card2)',
                    color:qData.activity===o.v?'#00c8e0':'var(--text-mid)'}}>
                  <span style={{fontSize:13,fontWeight:qData.activity===o.v?600:400}}>{o.l}</span>
                  <span style={{fontSize:11,color:'var(--text-dim)',marginLeft:6}}>{o.d}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6}}>Volume sport / semaine</p>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="range" min={0} max={25} step={0.5} value={qData.trainingH} onChange={e=>setQData({...qData,trainingH:parseFloat(e.target.value)})}
                style={{flex:1,accentColor:'#00c8e0',cursor:'pointer'}}/>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:'#00c8e0',minWidth:38}}>{qData.trainingH}h</span>
            </div>
          </div>
          <div>
            <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Allergies / intolérances</p>
            <input value={qData.allergies} onChange={e=>setQData({...qData,allergies:e.target.value})} placeholder="Ex: gluten, lactose, végétarien…"
              style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/>
          </div>
        </div>
      )
    }
  ]

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>

      {/* Bilan jour */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:20,boxShadow:'var(--shadow-card)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Bilan du jour</h2>
          {nutPlan&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0'}}>Plan actif ✓</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14,flexWrap:'wrap' as const}}>
          <Donut slices={[{pct:Math.min(totals.cal/CAL_TARGET*100,100),color:'#ffb340'}]} size={78} stroke={9}
            center={<div style={{textAlign:'center' as const}}><span style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#ffb340',lineHeight:1}}>{totals.cal}</span><span style={{fontSize:8,color:'var(--text-dim)',display:'block'}}>kcal</span></div>}/>
          <Donut slices={macroSlices} size={60} stroke={8} center={<span style={{fontSize:8,color:'var(--text-dim)'}}>macros</span>}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
            <MacroBar label="Protéines" value={totals.p} target={P_TARGET} color="#3b82f6"/>
            <MacroBar label="Glucides"  value={totals.g} target={G_TARGET} color="#22c55e"/>
            <MacroBar label="Lipides"   value={totals.l} target={L_TARGET} color="#f97316"/>
          </div>
        </div>
        <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:5}}>Calories 7 jours vs objectif {CAL_TARGET} kcal</p>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:36}}>
          {CAL_WEEK.map((v,i)=>{
            const pct=Math.min(v/CAL_TARGET,1.1),isToday=i===6
            const c=pct>=0.95?'#22c55e':pct>=0.80?'#ffb340':'#ef4444'
            return(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{width:'100%',height:`${pct/1.1*36}px`,minHeight:2,borderRadius:'3px 3px 0 0',background:isToday?c:`${c}55`,border:isToday?`1px solid ${c}88`:'none'}}/>
                <span style={{fontSize:9,fontFamily:'DM Mono,monospace',color:isToday?c:'var(--text-dim)'}}>{['L','M','M','J','V','S','A'][i]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sections repas */}
      {meals.map(section=>{
        const secTot={cal:section.entries.reduce((s,e)=>s+e.cal,0),p:section.entries.reduce((s,e)=>s+e.p,0),g:section.entries.reduce((s,e)=>s+e.g,0),l:section.entries.reduce((s,e)=>s+e.l,0)}
        const isLog=activeMealLog===section.type
        return(
          <div key={section.type} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow-card)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>{section.emoji}</span>
                <div>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,margin:0}}>{section.label}</p>
                  {secTot.cal>0&&<p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace'}}>{secTot.cal}kcal · {secTot.p}g P · {secTot.g}g G · {secTot.l}g L</p>}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setSaveModal({mealType:section.type})} title="Enregistrer comme repas type"
                  style={{padding:'4px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-dim)',fontSize:11,cursor:'pointer'}}>💾</button>
                <button onClick={()=>setActiveMealLog(isLog?null:section.type)}
                  style={{padding:'5px 12px',borderRadius:8,border:'1px solid',cursor:'pointer',
                    borderColor:isLog?'#00c8e0':'var(--border)',
                    background:isLog?'rgba(0,200,224,0.10)':'var(--bg-card2)',
                    color:isLog?'#00c8e0':'var(--text-mid)',fontSize:12,fontWeight:600}}>
                  {isLog?'✕':'+ Ajouter'}
                </button>
              </div>
            </div>
            {section.entries.length>0&&(
              <div style={{borderTop:'1px solid var(--border)'}}>
                {section.entries.map(e=>(
                  <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg-card2)'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:500,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.name}</p>
                      <p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace'}}>{e.cal}kcal · {e.p}g P · {e.g}g G · {e.l}g L</p>
                      {e.detail&&<p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0',fontStyle:'italic' as const}}>{e.detail}</p>}
                    </div>
                    <button onClick={()=>removeEntry(section.type,e.id)} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:14,padding:'2px 4px',flexShrink:0}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {isLog&&(
              <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',background:'var(--bg-card2)'}}>
                <p style={{fontSize:11,color:'var(--text-dim)',marginBottom:6}}>
                  Décris ce que tu as mangé — <strong style={{color:'#00c8e0'}}>l'IA calcule les macros précisément</strong>
                </p>
                <div style={{display:'flex',gap:8}}>
                  <textarea value={mealInput} onChange={e=>setMealInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();logMeal(section.type)} }}
                    placeholder="Ex: 3 œufs au plat, 1 yaourt grec, 2 cuillères de miel, 1 banane, 50g céréales Bjorg crousti chocolat…"
                    rows={2}
                    style={{flex:1,padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Sans,sans-serif',fontSize:13,outline:'none',resize:'none' as const}}/>
                  <button onClick={()=>logMeal(section.type)} disabled={mealLoading||!mealInput.trim()}
                    style={{padding:'8px 14px',borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',alignSelf:'flex-end',opacity:mealLoading||!mealInput.trim()?0.5:1}}>
                    {mealLoading?'⏳':'→ IA'}
                  </button>
                </div>
                {savedMeals.length>0&&(
                  <div style={{marginTop:8}}>
                    <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:5}}>Repas enregistrés :</p>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                      {savedMeals.map(sm=>(
                        <button key={sm.id} onClick={()=>useSavedMeal(sm,section.type)}
                          style={{padding:'4px 10px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:11,cursor:'pointer'}}>
                          💾 {sm.name} · {sm.totalCal}kcal
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Chat IA */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-card)'}}>
        <div style={{padding:'13px 16px',borderBottom:'1px solid var(--border)'}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>🤖 Assistant IA Nutrition</h2>
          <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>Questions sur ta nutrition, tes objectifs, tes besoins — discussion libre</p>
        </div>
        <div ref={chatRef} style={{height:220,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:7}}>
          {chat.map(m=>(
            <div key={m.id} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{maxWidth:'88%',padding:'8px 12px',fontSize:12,lineHeight:1.6,
                borderRadius:m.role==='user'?'12px 4px 12px 12px':'4px 12px 12px 12px',
                background:m.role==='user'?'rgba(91,111,255,0.12)':'rgba(0,200,224,0.07)',
                border:m.role==='user'?'1px solid rgba(91,111,255,0.20)':'1px solid rgba(0,200,224,0.15)',
                whiteSpace:'pre-line' as const}}>
                {m.content.replace(/\*\*/g,'')}
              </div>
            </div>
          ))}
          {chatLoading&&<div style={{display:'flex',justifyContent:'flex-start'}}><div style={{padding:'8px 12px',borderRadius:'4px 12px 12px 12px',background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.15)',fontSize:12,color:'var(--text-dim)'}}>⏳</div></div>}
        </div>
        <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--bg-card2)'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative'}}>
              <button onClick={()=>setPlusOpen(!plusOpen)}
                style={{width:36,height:36,borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                +
              </button>
              {plusOpen&&(
                <div style={{position:'absolute',bottom:'calc(100% + 8px)',left:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:12,padding:6,boxShadow:'var(--shadow)',zIndex:50,minWidth:210}}>
                  {[
                    {id:'photo',emoji:'📷',label:'Photo du repas',sub:'Bientôt disponible'},
                    {id:'plan', emoji:'🧠',label:'Plan nutritionnel',sub:'Personnalisé selon ton profil'},
                    {id:'saved',emoji:'💾',label:'Repas enregistrés',sub:`${savedMeals.length} repas type`},
                  ].map(item=>(
                    <button key={item.id} onClick={()=>{setPlusMode(item.id as PlusMenu);setPlusOpen(false)}}
                      style={{width:'100%',padding:'8px 10px',borderRadius:9,background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}>
                      <span style={{fontSize:18}}>{item.emoji}</span>
                      <div>
                        <p style={{fontSize:12,fontWeight:500,margin:0,color:'var(--text)'}}>{item.label}</p>
                        <p style={{fontSize:10,color:'var(--text-dim)',margin:0}}>{item.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()} }}
              placeholder="Pose une question sur ta nutrition…"
              style={{flex:1,padding:'8px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Sans,sans-serif',fontSize:13,outline:'none'}}/>
            <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
              style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:chatLoading||!chatInput.trim()?0.5:1}}>
              →
            </button>
          </div>
        </div>
      </div>

      {/* ── Plan nutritionnel modal ── */}
      {plusMode==='plan'&&(
        <div onClick={()=>setPlusMode(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:700,margin:0}}>🧠 Plan nutritionnel</h3>
              <button onClick={()=>{setPlusMode(null);setPlanStep(null);setQStep(0)}} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16}}>✕</button>
            </div>
            {planStep===null&&(
              <div>
                <div style={{padding:'14px 16px',borderRadius:12,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.15)',marginBottom:16}}>
                  <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,margin:0}}>
                    👋 Je vais créer un plan <strong>100% personnalisé</strong> basé sur ton profil, ta charge d'entraînement et tes objectifs.<br/><br/>
                    Pour calculer tes besoins précis j'ai besoin de quelques informations. <strong>2 minutes</strong> suffisent.
                  </p>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:16}}>
                  {['Calcul du métabolisme de base (formule Mifflin)','Ajustement selon ta charge sportive hebdomadaire','Répartition optimale des macros (P/G/L)','Adaptation Low / Mid / Hard'].map((t,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-mid)'}}>
                      <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#00c8e0',flexShrink:0}}>{i+1}</span>
                      {t}
                    </div>
                  ))}
                </div>
                <button onClick={()=>setPlanStep('questionnaire')}
                  style={{width:'100%',padding:13,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                  → Répondre au questionnaire
                </button>
              </div>
            )}
            {planStep==='questionnaire'&&(
              <div>
                <div style={{display:'flex',gap:4,marginBottom:16}}>
                  {qSteps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:999,background:i<=qStep?'#00c8e0':'var(--border)',transition:'background 0.3s'}}/>)}
                </div>
                <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 14px',color:'#00c8e0'}}>{qSteps[qStep].title}</h3>
                {qSteps[qStep].content}
                <div style={{display:'flex',gap:10,marginTop:18}}>
                  {qStep>0&&<button onClick={()=>setQStep(s=>s-1)} style={{flex:1,padding:11,borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>← Retour</button>}
                  <button onClick={()=>{if(qStep<qSteps.length-1) setQStep(s=>s+1); else{const p=generatePlan(qData);setNutPlan(p);setPlanStep('result')}}}
                    style={{flex:2,padding:11,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                    {qStep<qSteps.length-1?'Continuer →':'✓ Générer mon plan'}
                  </button>
                </div>
              </div>
            )}
            {planStep==='result'&&nutPlan&&(
              <div>
                <div style={{padding:'14px 16px',borderRadius:12,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.15)',marginBottom:14}}>
                  <p style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#00c8e0',margin:'0 0 10px'}}>🎯 Apports cibles</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                    {[{l:'Calories',v:`${nutPlan.calories} kcal`,c:'#ffb340'},{l:'Protéines',v:`${nutPlan.protein}g`,c:'#3b82f6'},{l:'Glucides',v:`${nutPlan.carbs}g`,c:'#22c55e'},{l:'Lipides',v:`${nutPlan.fat}g`,c:'#f97316'}].map(x=>(
                      <div key={x.l} style={{padding:'8px 10px',borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                        <p style={{fontSize:10,color:'var(--text-dim)',margin:'0 0 3px'}}>{x.l}</p>
                        <p style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:600,color:x.c,margin:0}}>{x.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',marginBottom:8}}>Adaptation par journée</p>
                {[{l:'Repos / Low',d:nutPlan.byDay.low,c:'#22c55e'},{l:'Mid',d:nutPlan.byDay.mid,c:'#ffb340'},{l:'Hard',d:nutPlan.byDay.hard,c:'#ef4444'}].map(dt=>(
                  <div key={dt.l} style={{padding:'10px 14px',borderRadius:10,background:`${dt.c}09`,border:`1px solid ${dt.c}30`,marginBottom:7}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:12,fontWeight:600,color:dt.c}}>{dt.l}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:12,color:dt.c,fontWeight:700}}>{dt.d.cal} kcal</span>
                    </div>
                    <p style={{fontSize:11,color:'var(--text-dim)',margin:'3px 0 0',fontFamily:'DM Mono,monospace'}}>P:{dt.d.p}g · G:{dt.d.g}g · L:{dt.d.l}g</p>
                  </div>
                ))}
                <button onClick={()=>{setPlusMode(null);setPlanStep(null);setQStep(0)}}
                  style={{width:'100%',padding:11,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:8}}>
                  ✓ Appliquer ce plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repas enregistrés modal */}
      {plusMode==='saved'&&(
        <div onClick={()=>setPlusMode(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:440,width:'100%',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>💾 Repas enregistrés</h3>
              <button onClick={()=>setPlusMode(null)} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16}}>✕</button>
            </div>
            {savedMeals.length===0&&<p style={{fontSize:13,color:'var(--text-dim)',textAlign:'center' as const,padding:'20px 0'}}>Aucun repas enregistré.</p>}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {savedMeals.map(sm=>(
                <div key={sm.id} style={{padding:'12px 14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <p style={{fontSize:13,fontWeight:600,margin:0}}>{sm.name}</p>
                    <span style={{fontSize:12,fontFamily:'DM Mono,monospace',color:'#ffb340',fontWeight:600}}>{sm.totalCal} kcal</span>
                  </div>
                  {sm.entries.map(e=><p key={e.id} style={{fontSize:11,color:'var(--text-dim)',margin:'1px 0',fontFamily:'DM Mono,monospace'}}>· {e.name}</p>)}
                  <div style={{display:'flex',gap:5,marginTop:10,flexWrap:'wrap' as const}}>
                    {meals.map(m=>(
                      <button key={m.type} onClick={()=>useSavedMeal(sm,m.type)}
                        style={{flex:1,minWidth:60,padding:'5px 4px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:10,cursor:'pointer'}}>
                        {m.emoji} {m.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save meal modal */}
      {saveModal&&(
        <div onClick={()=>setSaveModal(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:380,width:'100%'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'0 0 12px'}}>💾 Enregistrer ce repas</h3>
            <p style={{fontSize:12,color:'var(--text-dim)',margin:'0 0 12px'}}>{meals.find(m=>m.type===saveModal.mealType)?.entries.length??0} aliment(s) seront enregistrés</p>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Nom du repas type…"
              style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setSaveModal(null)} style={{flex:1,padding:11,borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>Annuler</button>
              <button onClick={saveMealFn} style={{flex:2,padding:11,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>💾 Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════
export default function DataPage(){
  const [tab,setTab]=useState<MainTab>('training')
  const TABS:[MainTab,string,string,string][]=[
    ['training', 'Training',  '#3b82f6','rgba(59,130,246,0.10)'],
    ['recovery', 'Recovery',  '#22c55e','rgba(34,197,94,0.10)' ],
    ['nutrition','Nutrition', '#ffb340','rgba(255,179,64,0.10)'],
  ]
  return(
    <div style={{padding:'24px 28px',maxWidth:'100%'}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0}}>Données & Analyse</h1>
        <p style={{fontSize:12.5,color:'var(--text-dim)',margin:'5px 0 0'}}>Training · Recovery · Nutrition</p>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' as const}}>
        {TABS.map(([id,label,color,bg])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,minWidth:100,padding:'11px 16px',borderRadius:12,border:'1px solid',cursor:'pointer',
              borderColor:tab===id?color:'var(--border)',
              background:tab===id?bg:'var(--bg-card)',
              color:tab===id?color:'var(--text-mid)',
              fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:tab===id?700:400,
              boxShadow:tab===id?`0 0 0 1px ${color}33`:'var(--shadow-card)',transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>
      {tab==='training'  && <TrainingTab/>}
      {tab==='recovery'  && <RecoveryTab/>}
      {tab==='nutrition' && <NutritionTab/>}
    </div>
  )
}
