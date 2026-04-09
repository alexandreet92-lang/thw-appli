'use client'

import { useState, useRef, useEffect } from 'react'

type MealType  = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner'
type ChatRole  = 'user' | 'ai'
type PlusMenu  = 'photo' | 'plan' | 'saved' | null
type PlanStep  = 'intro' | 'questionnaire' | 'result' | null

interface FoodEntry{id:string;name:string;cal:number;p:number;g:number;l:number;detail?:string}
interface MealSection{type:MealType;label:string;emoji:string;entries:FoodEntry[]}
interface ChatMessage{id:string;role:ChatRole;content:string;timestamp:string}
interface SavedMeal{id:string;name:string;entries:FoodEntry[];totalCal:number}
interface NutriPlan{calories:number;protein:number;carbs:number;fat:number;byDay:{low:{cal:number;p:number;g:number;l:number};mid:{cal:number;p:number;g:number;l:number};hard:{cal:number;p:number;g:number;l:number}}}
interface QuestionnaireData{weight:number;height:number;age:number;sex:'m'|'f';goal:'loss'|'gain'|'maintain'|'performance';activity:'low'|'moderate'|'high';trainingH:number;allergies:string}

const DEFAULT_Q:QuestionnaireData={weight:75,height:178,age:31,sex:'m',goal:'performance',activity:'moderate',trainingH:12,allergies:''}

const INITIAL_MEALS:MealSection[]=[
  {type:'breakfast',label:'Petit-déjeuner',emoji:'☀️',entries:[{id:'f1',name:'Flocons avoine + lait + banane',cal:380,p:14,g:62,l:8}]},
  {type:'snack_am',label:'Collation matin',emoji:'🍎',entries:[]},
  {type:'lunch',label:'Déjeuner',emoji:'🥗',entries:[{id:'f3',name:'Poulet riz légumes',cal:620,p:48,g:65,l:14}]},
  {type:'snack_pm',label:'Goûter',emoji:'🍌',entries:[]},
  {type:'dinner',label:'Dîner',emoji:'🌙',entries:[]},
]

const INITIAL_CHAT:ChatMessage[]=[{id:'0',role:'ai',content:'👋 Bonjour ! Je suis ton assistant nutrition.\n\nAjoute tes repas dans les sections ci-dessus — je les analyse avec l\'IA pour des valeurs précises, même pour les produits de marque.\n\nTu peux aussi me poser des questions sur ta nutrition.',timestamp:'09:00'}]
const SAVED_MEALS_INIT:SavedMeal[]=[
  {id:'sm1',name:'Petit-dej endurance',totalCal:520,entries:[{id:'se1',name:'Porridge avoine + myrtilles',cal:320,p:10,g:58,l:6},{id:'se2',name:'Yaourt grec 0%',cal:97,p:17,g:6,l:0}]},
]
const AI_CHAT=[
  '💡 Pour optimiser ta récupération, vise 1.8-2g de protéines par kg. Avec 75kg → 135-150g minimum par jour.',
  '⚡ Jours Hard : 6-8g glucides/kg. Jours Low : 4-5g/kg. Les glucides sont ton carburant principal.',
  '🔍 Hydratation : 35-40ml/kg/jour + 500ml par heure de sport.',
  '📊 Avant séance longue (+2h) : charge en glucides la veille. Évite les fibres 2h avant.',
  '🏃 Post-séance dans les 30min : 20-30g protéines + glucides rapides pour la récupération.',
]

function uid():string{return `${Date.now()}_${Math.random().toString(36).slice(2)}`}
function nowTime():string{return new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function totalMacros(m:MealSection[]){const a=m.flatMap(x=>x.entries);return{cal:a.reduce((s,e)=>s+e.cal,0),p:a.reduce((s,e)=>s+e.p,0),g:a.reduce((s,e)=>s+e.g,0),l:a.reduce((s,e)=>s+e.l,0)}}

async function analyzeFood(text:string):Promise<FoodEntry> {
  try {
    const res=await fetch('/api/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})
    const result=await res.json()
    if(!result.success) throw new Error(result.error)
    const d=result.data
    return{id:uid(),name:d.name||text,cal:d.cal||0,p:d.p||0,g:d.g||0,l:d.l||0,detail:d.detail}
  } catch {
    return{id:uid(),name:text,cal:0,p:0,g:0,l:0,detail:'⚠️ Analyse indisponible — vérifie ta connexion ou la clé API'}
  }
}

function calcBMR(w:number,h:number,a:number,s:'m'|'f'):number{return s==='m'?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161}
function generatePlan(q:QuestionnaireData):NutriPlan{
  const bmr=calcBMR(q.weight,q.height,q.age,q.sex)
  const af={low:1.2,moderate:1.55,high:1.9}[q.activity]
  const tdee=bmr*af+(q.trainingH*8*60/7)
  const base=q.goal==='loss'?tdee*0.85:q.goal==='gain'?tdee*1.10:tdee
  const protein=Math.round(q.weight*(q.goal==='performance'?2.0:1.8))
  const fat=Math.round(q.weight*1.1)
  const carbs=Math.round((base-protein*4-fat*9)/4)
  return{calories:Math.round(base),protein,carbs,fat,byDay:{low:{cal:Math.round(base*0.85),p:protein,g:Math.round(carbs*0.70),l:fat},mid:{cal:Math.round(base),p:protein,g:carbs,l:fat},hard:{cal:Math.round(base*1.15),p:protein,g:Math.round(carbs*1.25),l:fat}}}
}

function Donut({slices,size=72,stroke=8,center}:{slices:{pct:number;color:string}[];size?:number;stroke?:number;center?:React.ReactNode}){
  const r=(size-stroke)/2,c=2*Math.PI*r;let cum=0
  return(<div style={{position:'relative',width:size,height:size,flexShrink:0}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>{slices.filter(s=>s.pct>0).map((s,i)=>{const dash=(s.pct/100)*c,off=-cum*c/100;cum+=s.pct;return<circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="butt" strokeDasharray={`${dash} ${c}`} strokeDashoffset={off} opacity={0.85}/>})}</svg>{center&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{center}</div>}</div>)
}

function MacroBar({label,value,target,color}:{label:string;value:number;target:number;color:string}){
  return(<div><div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}><span style={{color:'var(--text-mid)'}}>{label}</span><span style={{fontFamily:'DM Mono,monospace',color}}>{value}g <span style={{color:'var(--text-dim)'}}>/ {target}g</span></span></div><div style={{height:5,borderRadius:999,overflow:'hidden',background:'var(--border)'}}><div style={{height:'100%',width:`${Math.min(value/target*100,100)}%`,background:color,borderRadius:999,transition:'width 0.5s'}}/></div></div>)
}

export default function NutritionPage(){
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
  const mt=totals.p*4+totals.g*4+totals.l*9||1
  const macroSlices=[{pct:totals.p*4/mt*100,color:'#3b82f6'},{pct:totals.g*4/mt*100,color:'#22c55e'},{pct:totals.l*9/mt*100,color:'#f97316'}]
  const card={background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,boxShadow:'var(--shadow-card)'}

  useEffect(()=>{if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight},[chat])

  function sendChat(){
    if(!chatInput.trim()) return
    setChat(p=>[...p,{id:uid(),role:'user' as ChatRole,content:chatInput,timestamp:nowTime()}])
    setChatInput(''); setChatLoading(true)
    setTimeout(()=>{setChat(p=>[...p,{id:uid(),role:'ai' as ChatRole,content:AI_CHAT[Math.floor(Math.random()*AI_CHAT.length)],timestamp:nowTime()}]);setChatLoading(false)},900)
  }

  async function logMeal(mealType:MealType){
    if(!mealInput.trim()) return
    const inputCopy=mealInput
    setMealLoading(true); setMealInput(''); setActiveMealLog(null)
    const loadId=uid()
    setChat(p=>[...p,{id:loadId,role:'ai' as ChatRole,content:'⏳ Analyse nutritionnelle IA en cours…',timestamp:nowTime()}])
    const entry=await analyzeFood(inputCopy)
    setMeals(p=>p.map(m=>m.type===mealType?{...m,entries:[...m.entries,entry]}:m))
    const secLabel=INITIAL_MEALS.find(m=>m.type===mealType)?.label||''
    const msg=entry.cal>0
      ?`✅ Ajouté à ${secLabel}\n\n${entry.cal} kcal · ${entry.p}g protéines · ${entry.g}g glucides · ${entry.l}g lipides\n\n${entry.detail||''}`
      :`⚠️ ${entry.detail}`
    setChat(p=>p.map(m=>m.id===loadId?{...m,content:msg}:m))
    setMealLoading(false)
  }

  function removeEntry(t:MealType,id:string){setMeals(p=>p.map(m=>m.type===t?{...m,entries:m.entries.filter(e=>e.id!==id)}:m))}
  function useSaved(sm:SavedMeal,t:MealType){setMeals(p=>p.map(m=>m.type===t?{...m,entries:[...m.entries,...sm.entries.map(e=>({...e,id:uid()}))]}:m));setPlusMode(null);setPlusOpen(false);setActiveMealLog(null)}
  function saveMealFn(){
    if(!saveName.trim()||!saveModal) return
    const sec=meals.find(m=>m.type===saveModal.mealType)
    if(!sec?.entries.length) return
    setSavedMeals(p=>[...p,{id:uid(),name:saveName,entries:[...sec.entries],totalCal:sec.entries.reduce((s,e)=>s+e.cal,0)}])
    setSaveModal(null); setSaveName('')
  }

  const qSteps=[
    {title:'Profil de base',content:(
      <div style={{display:'flex',flexDirection:'column',gap:11}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[{label:'Poids (kg)',k:'weight'},{label:'Taille (cm)',k:'height'},{label:'Âge',k:'age'}].map(f=>(<div key={f.k}><p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>{f.label}</p><input type="number" value={(qData as any)[f.k]} onChange={e=>setQData({...qData,[f.k]:parseFloat(e.target.value)||0})} style={{width:'100%',padding:'8px 11px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Mono,monospace',fontSize:13,outline:'none'}}/></div>))}
          <div><p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4}}>Sexe</p><div style={{display:'flex',gap:6}}>{[{v:'m',l:'Homme'},{v:'f',l:'Femme'}].map(o=>(<button key={o.v} onClick={()=>setQData({...qData,sex:o.v as 'm'|'f'})} style={{flex:1,padding:'7px',borderRadius:9,border:'1px solid',cursor:'pointer',borderColor:qData.sex===o.v?'#00c8e0':'var(--border)',background:qData.sex===o.v?'rgba(0,200,224,0.10)':'var(--bg-card2)',color:qData.sex===o.v?'#00c8e0':'var(--text-mid)',fontSize:12}}>{o.l}</button>))}</div></div>
        </div>
      </div>
    )},
    {title:'Objectif',content:(
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{v:'performance',l:'Performance',d:'Optimiser énergie et récupération',c:'#00c8e0'},{v:'loss',l:'Perte de poids',d:'Léger déficit calorique',c:'#22c55e'},{v:'gain',l:'Prise de masse',d:'Léger surplus calorique',c:'#f97316'},{v:'maintain',l:'Maintien',d:'Équilibre énergétique',c:'#9ca3af'}].map(o=>(<button key={o.v} onClick={()=>setQData({...qData,goal:o.v as any})} style={{padding:'11px 14px',borderRadius:11,border:'1px solid',cursor:'pointer',textAlign:'left' as const,borderColor:qData.goal===o.v?o.c:'var(--border)',background:qData.goal===o.v?`${o.c}11`:'var(--bg-card2)',color:'var(--text-mid)'}}><p style={{fontSize:13,fontWeight:600,margin:'0 0 1px',color:qData.goal===o.v?o.c:'var(--text)'}}>{o.l}</p><p style={{fontSize:11,color:'var(--text-dim)',margin:0}}>{o.d}</p></button>))}
      </div>
    )},
    {title:'Activité & Volume',content:(
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div><p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:8}}>Activité quotidienne</p><div style={{display:'flex',flexDirection:'column',gap:6}}>{[{v:'low',l:'Faible',d:'Travail de bureau'},{v:'moderate',l:'Modérée',d:'Actif au quotidien'},{v:'high',l:'Élevée',d:'Travail physique'}].map(o=>(<button key={o.v} onClick={()=>setQData({...qData,activity:o.v as any})} style={{padding:'9px 13px',borderRadius:10,border:'1px solid',cursor:'pointer',textAlign:'left' as const,borderColor:qData.activity===o.v?'#00c8e0':'var(--border)',background:qData.activity===o.v?'rgba(0,200,224,0.10)':'var(--bg-card2)',color:qData.activity===o.v?'#00c8e0':'var(--text-mid)'}}><span style={{fontSize:13,fontWeight:qData.activity===o.v?600:400}}>{o.l}</span><span style={{fontSize:11,color:'var(--text-dim)',marginLeft:6}}>{o.d}</span></button>))}</div></div>
        <div><p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:6}}>Volume sport / semaine</p><div style={{display:'flex',alignItems:'center',gap:10}}><input type="range" min={0} max={25} step={0.5} value={qData.trainingH} onChange={e=>setQData({...qData,trainingH:parseFloat(e.target.value)})} style={{flex:1,accentColor:'#00c8e0',cursor:'pointer'}}/><span style={{fontFamily:'DM Mono,monospace',fontSize:14,fontWeight:700,color:'#00c8e0',minWidth:38}}>{qData.trainingH}h</span></div></div>
        <div><p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:5}}>Allergies / intolérances</p><input value={qData.allergies} onChange={e=>setQData({...qData,allergies:e.target.value})} placeholder="Ex: gluten, lactose, végétarien…" style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none'}}/></div>
      </div>
    )},
  ]

  return(
    <div style={{padding:'24px 28px',maxWidth:'100%'}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:700,letterSpacing:'-0.03em',margin:0}}>Nutrition</h1>
        <p style={{fontSize:12.5,color:'var(--text-dim)',margin:'5px 0 0'}}>Suivi alimentaire · Macros · Plan personnalisé</p>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {/* Bilan jour */}
        <div style={{...card,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>Bilan du jour</h2>
            {nutPlan&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',color:'#00c8e0'}}>Plan actif ✓</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14,flexWrap:'wrap' as const}}>
            <Donut slices={[{pct:Math.min(totals.cal/CAL_TARGET*100,100),color:'#ffb340'}]} size={78} stroke={9} center={<div style={{textAlign:'center' as const}}><span style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#ffb340',lineHeight:1}}>{totals.cal}</span><span style={{fontSize:8,color:'var(--text-dim)',display:'block'}}>kcal</span></div>}/>
            <Donut slices={macroSlices} size={60} stroke={8} center={<span style={{fontSize:8,color:'var(--text-dim)'}}>macros</span>}/>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
              <MacroBar label="Protéines" value={totals.p} target={P_TARGET} color="#3b82f6"/>
              <MacroBar label="Glucides"  value={totals.g} target={G_TARGET} color="#22c55e"/>
              <MacroBar label="Lipides"   value={totals.l} target={L_TARGET} color="#f97316"/>
            </div>
          </div>
          <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:5}}>Calories 7 jours vs objectif {CAL_TARGET} kcal</p>
          <div style={{display:'flex',alignItems:'flex-end',gap:3,height:36}}>
            {CAL_WEEK.map((v,i)=>{const pct=Math.min(v/CAL_TARGET,1.1),isT=i===6,c=pct>=0.95?'#22c55e':pct>=0.80?'#ffb340':'#ef4444';return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><div style={{width:'100%',height:`${pct/1.1*36}px`,minHeight:2,borderRadius:'3px 3px 0 0',background:isT?c:`${c}55`,border:isT?`1px solid ${c}88`:'none'}}/><span style={{fontSize:9,fontFamily:'DM Mono,monospace',color:isT?c:'var(--text-dim)'}}>{['L','M','M','J','V','S','A'][i]}</span></div>)})}
          </div>
        </div>

        {/* Sections repas */}
        {meals.map(section=>{
          const st={cal:section.entries.reduce((s,e)=>s+e.cal,0),p:section.entries.reduce((s,e)=>s+e.p,0),g:section.entries.reduce((s,e)=>s+e.g,0),l:section.entries.reduce((s,e)=>s+e.l,0)}
          const isLog=activeMealLog===section.type
          return(
            <div key={section.type} style={{...card,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:18}}>{section.emoji}</span>
                  <div>
                    <p style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,margin:0}}>{section.label}</p>
                    {st.cal>0&&<p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace'}}>{st.cal}kcal · {st.p}g P · {st.g}g G · {st.l}g L</p>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setSaveModal({mealType:section.type})} style={{padding:'4px 8px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-dim)',fontSize:11,cursor:'pointer'}}>💾</button>
                  <button onClick={()=>setActiveMealLog(isLog?null:section.type)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid',cursor:'pointer',borderColor:isLog?'#00c8e0':'var(--border)',background:isLog?'rgba(0,200,224,0.10)':'var(--bg-card2)',color:isLog?'#00c8e0':'var(--text-mid)',fontSize:12,fontWeight:600}}>{isLog?'✕':'+ Ajouter'}</button>
                </div>
              </div>
              {section.entries.length>0&&<div style={{borderTop:'1px solid var(--border)'}}>
                {section.entries.map(e=>(<div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg-card2)'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:12,fontWeight:500,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.name}</p>
                    <p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0',fontFamily:'DM Mono,monospace'}}>{e.cal}kcal · {e.p}g P · {e.g}g G · {e.l}g L</p>
                    {e.detail&&<p style={{fontSize:10,color:'var(--text-dim)',margin:'1px 0 0',fontStyle:'italic' as const,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.detail}</p>}
                  </div>
                  <button onClick={()=>removeEntry(section.type,e.id)} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:14,padding:'2px 4px',flexShrink:0}}>✕</button>
                </div>))}
              </div>}
              {isLog&&<div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',background:'var(--bg-card2)'}}>
                <p style={{fontSize:11,color:'#00c8e0',marginBottom:6,fontWeight:500}}>
                  🤖 L'IA analyse ton repas et trouve les valeurs exactes, même pour les marques
                </p>
                <p style={{fontSize:10,color:'var(--text-dim)',marginBottom:8}}>
                  Ex: "3 oeufs au plat, 1 yaourt grec nature, 2 cuilleres miel, 1 banane, 50g Bjorg crousti chocolat"
                </p>
                <div style={{display:'flex',gap:8}}>
                  <textarea value={mealInput} onChange={e=>setMealInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();logMeal(section.type)}}}
                    placeholder="Décris ton repas en détail, avec les quantités si possible…"
                    rows={2}
                    style={{flex:1,padding:'8px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Sans,sans-serif',fontSize:13,outline:'none',resize:'none' as const}}/>
                  <button onClick={()=>logMeal(section.type)} disabled={mealLoading||!mealInput.trim()}
                    style={{padding:'8px 14px',borderRadius:9,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',alignSelf:'flex-end',opacity:mealLoading||!mealInput.trim()?0.5:1,minWidth:70}}>
                    {mealLoading?'⏳':'→ IA'}
                  </button>
                </div>
                {savedMeals.length>0&&<div style={{marginTop:8}}><p style={{fontSize:10,color:'var(--text-dim)',marginBottom:5}}>Repas enregistrés :</p><div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>{savedMeals.map(sm=>(<button key={sm.id} onClick={()=>useSaved(sm,section.type)} style={{padding:'4px 10px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:11,cursor:'pointer'}}>💾 {sm.name} · {sm.totalCal}kcal</button>))}</div></div>}
              </div>}
            </div>
          )
        })}

        {/* Chat IA */}
        <div style={{...card,overflow:'hidden'}}>
          <div style={{padding:'13px 16px',borderBottom:'1px solid var(--border)'}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,margin:0}}>🤖 Assistant IA Nutrition</h2>
            <p style={{fontSize:11,color:'var(--text-dim)',margin:'2px 0 0'}}>Questions sur ta nutrition, tes objectifs, tes besoins</p>
          </div>
          <div ref={chatRef} style={{height:220,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:7}}>
            {chat.map(m=>(<div key={m.id} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}><div style={{maxWidth:'88%',padding:'8px 12px',fontSize:12,lineHeight:1.6,borderRadius:m.role==='user'?'12px 4px 12px 12px':'4px 12px 12px 12px',background:m.role==='user'?'rgba(91,111,255,0.12)':'rgba(0,200,224,0.07)',border:m.role==='user'?'1px solid rgba(91,111,255,0.20)':'1px solid rgba(0,200,224,0.15)',whiteSpace:'pre-line' as const}}>{m.content}</div></div>))}
            {chatLoading&&<div style={{display:'flex',justifyContent:'flex-start'}}><div style={{padding:'8px 12px',borderRadius:'4px 12px 12px 12px',background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.15)',fontSize:12,color:'var(--text-dim)'}}>⏳</div></div>}
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--bg-card2)'}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{position:'relative'}}>
                <button onClick={()=>setPlusOpen(!plusOpen)} style={{width:36,height:36,borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
                {plusOpen&&<div style={{position:'absolute',bottom:'calc(100% + 8px)',left:0,background:'var(--bg-card)',border:'1px solid var(--border-mid)',borderRadius:12,padding:6,boxShadow:'var(--shadow)',zIndex:50,minWidth:210}}>
                  {[{id:'photo',emoji:'📷',label:'Photo du repas',sub:'Bientôt disponible'},{id:'plan',emoji:'🧠',label:'Plan nutritionnel',sub:'Personnalisé selon ton profil'},{id:'saved',emoji:'💾',label:'Repas enregistrés',sub:`${savedMeals.length} repas type`}].map(item=>(<button key={item.id} onClick={()=>{setPlusMode(item.id as PlusMenu);setPlusOpen(false)}} style={{width:'100%',padding:'8px 10px',borderRadius:9,background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left' as const}}><span style={{fontSize:18}}>{item.emoji}</span><div><p style={{fontSize:12,fontWeight:500,margin:0,color:'var(--text)'}}>{item.label}</p><p style={{fontSize:10,color:'var(--text-dim)',margin:0}}>{item.sub}</p></div></button>))}
                </div>}
              </div>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}} placeholder="Pose une question sur ta nutrition…" style={{flex:1,padding:'8px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontFamily:'DM Sans,sans-serif',fontSize:13,outline:'none'}}/>
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:chatLoading||!chatInput.trim()?0.5:1}}>→</button>
            </div>
          </div>
        </div>

        {/* Modal plan */}
        {plusMode==='plan'&&<div onClick={()=>setPlusMode(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:700,margin:0}}>🧠 Plan nutritionnel</h3>
              <button onClick={()=>{setPlusMode(null);setPlanStep(null);setQStep(0)}} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16}}>✕</button>
            </div>
            {planStep===null&&<div>
              <div style={{padding:'14px 16px',borderRadius:12,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.15)',marginBottom:16}}>
                <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,margin:0}}>👋 Je vais créer un plan <strong>100% personnalisé</strong> basé sur ton profil, ta charge sportive et tes objectifs. 2 minutes suffisent.</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:16}}>
                {['Calcul du métabolisme de base (formule Mifflin)','Ajustement selon ta charge sportive hebdomadaire','Répartition optimale des macros (P/G/L)','Adaptation Low / Mid / Hard'].map((t,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-mid)'}}><span style={{width:20,height:20,borderRadius:'50%',background:'rgba(0,200,224,0.10)',border:'1px solid rgba(0,200,224,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#00c8e0',flexShrink:0}}>{i+1}</span>{t}</div>))}
              </div>
              <button onClick={()=>setPlanStep('questionnaire')} style={{width:'100%',padding:13,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>→ Répondre au questionnaire</button>
            </div>}
            {planStep==='questionnaire'&&<div>
              <div style={{display:'flex',gap:4,marginBottom:16}}>{qSteps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:999,background:i<=qStep?'#00c8e0':'var(--border)',transition:'background 0.3s'}}/>)}</div>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:'0 0 14px',color:'#00c8e0'}}>{qSteps[qStep].title}</h3>
              {qSteps[qStep].content}
              <div style={{display:'flex',gap:10,marginTop:18}}>
                {qStep>0&&<button onClick={()=>setQStep(s=>s-1)} style={{flex:1,padding:11,borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>← Retour</button>}
                <button onClick={()=>{if(qStep<qSteps.length-1) setQStep(s=>s+1); else{const p=generatePlan(qData);setNutPlan(p);setPlanStep('result')}}} style={{flex:2,padding:11,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>{qStep<qSteps.length-1?'Continuer →':'✓ Générer mon plan'}</button>
              </div>
            </div>}
            {planStep==='result'&&nutPlan&&<div>
              <div style={{padding:'14px 16px',borderRadius:12,background:'rgba(0,200,224,0.07)',border:'1px solid rgba(0,200,224,0.15)',marginBottom:14}}>
                <p style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#00c8e0',margin:'0 0 10px'}}>🎯 Apports cibles</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {[{l:'Calories',v:`${nutPlan.calories} kcal`,c:'#ffb340'},{l:'Protéines',v:`${nutPlan.protein}g`,c:'#3b82f6'},{l:'Glucides',v:`${nutPlan.carbs}g`,c:'#22c55e'},{l:'Lipides',v:`${nutPlan.fat}g`,c:'#f97316'}].map(x=>(<div key={x.l} style={{padding:'8px 10px',borderRadius:9,background:'var(--bg-card)',border:'1px solid var(--border)'}}><p style={{fontSize:10,color:'var(--text-dim)',margin:'0 0 3px'}}>{x.l}</p><p style={{fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:600,color:x.c,margin:0}}>{x.v}</p></div>))}
                </div>
              </div>
              <p style={{fontSize:11,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.07em',color:'var(--text-dim)',marginBottom:8}}>Adaptation par journée</p>
              {[{l:'Repos / Low',d:nutPlan.byDay.low,c:'#22c55e'},{l:'Mid',d:nutPlan.byDay.mid,c:'#ffb340'},{l:'Hard',d:nutPlan.byDay.hard,c:'#ef4444'}].map(dt=>(<div key={dt.l} style={{padding:'10px 14px',borderRadius:10,background:`${dt.c}09`,border:`1px solid ${dt.c}30`,marginBottom:7}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:12,fontWeight:600,color:dt.c}}>{dt.l}</span><span style={{fontFamily:'DM Mono,monospace',fontSize:12,color:dt.c,fontWeight:700}}>{dt.d.cal} kcal</span></div><p style={{fontSize:11,color:'var(--text-dim)',margin:'3px 0 0',fontFamily:'DM Mono,monospace'}}>P:{dt.d.p}g · G:{dt.d.g}g · L:{dt.d.l}g</p></div>))}
              <button onClick={()=>{setPlusMode(null);setPlanStep(null);setQStep(0)}} style={{width:'100%',padding:11,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:8}}>✓ Appliquer ce plan</button>
            </div>}
          </div>
        </div>}

        {/* Modal repas enregistrés */}
        {plusMode==='saved'&&<div onClick={()=>setPlusMode(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:440,width:'100%',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0}}>💾 Repas enregistrés</h3>
              <button onClick={()=>setPlusMode(null)} style={{background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:9,padding:'5px 9px',cursor:'pointer',color:'var(--text-dim)',fontSize:16}}>✕</button>
            </div>
            {savedMeals.length===0&&<p style={{fontSize:13,color:'var(--text-dim)',textAlign:'center' as const,padding:'20px 0'}}>Aucun repas enregistré.</p>}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {savedMeals.map(sm=>(<div key={sm.id} style={{padding:'12px 14px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}><p style={{fontSize:13,fontWeight:600,margin:0}}>{sm.name}</p><span style={{fontSize:12,fontFamily:'DM Mono,monospace',color:'#ffb340',fontWeight:600}}>{sm.totalCal} kcal</span></div>
                {sm.entries.map(e=><p key={e.id} style={{fontSize:11,color:'var(--text-dim)',margin:'1px 0',fontFamily:'DM Mono,monospace'}}>· {e.name}</p>)}
                <div style={{display:'flex',gap:5,marginTop:10,flexWrap:'wrap' as const}}>{meals.map(m=>(<button key={m.type} onClick={()=>useSaved(sm,m.type)} style={{flex:1,minWidth:60,padding:'5px 4px',borderRadius:7,border:'1px solid var(--border)',background:'var(--bg-card)',color:'var(--text-mid)',fontSize:10,cursor:'pointer'}}>{m.emoji} {m.label.split(' ')[0]}</button>))}</div>
              </div>))}
            </div>
          </div>
        </div>}

        {/* Modal save */}
        {saveModal&&<div onClick={()=>setSaveModal(null)} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:380,width:'100%'}}>
            <h3 style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'0 0 12px'}}>💾 Enregistrer ce repas</h3>
            <p style={{fontSize:12,color:'var(--text-dim)',margin:'0 0 12px'}}>{meals.find(m=>m.type===saveModal.mealType)?.entries.length??0} aliment(s) seront enregistrés</p>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Nom du repas type…" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:13,outline:'none',marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setSaveModal(null)} style={{flex:1,padding:11,borderRadius:11,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:13,cursor:'pointer'}}>Annuler</button>
              <button onClick={saveMealFn} style={{flex:2,padding:11,borderRadius:11,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>💾 Enregistrer</button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}
