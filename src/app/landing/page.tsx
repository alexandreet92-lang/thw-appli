'use client'

import { useState } from 'react'

// ─── Brand colors ─────────────────────────────────────────────
const brand   = '#00c8e0'
const brand2  = '#5b6fff'
const dark    = '#070d1a'
const surf1   = '#0e1526'
const surf2   = '#111c30'
const cardBg  = 'rgba(255,255,255,0.035)'
const bord    = 'rgba(255,255,255,0.08)'
const txt     = '#f1f5f9'
const txtSub  = '#94a3b8'
const grad    = `linear-gradient(135deg, ${brand}, ${brand2})`

// ─── Pricing data ─────────────────────────────────────────────
const FORMULAS = [
  { id:'pack4',  label:'Pack 4 semaines',   blocs:1,  base:120, desc:'1 bloc · Parfait pour tester',     badge:'' },
  { id:'abo3',   label:'Abonnement 3 mois', blocs:3,  base:265, desc:'3 blocs · −26% vs pack',           badge:'Populaire' },
  { id:'abo6',   label:'Abonnement 6 mois', blocs:6,  base:460, desc:'6 blocs · −36% vs pack',           badge:'' },
  { id:'abo12',  label:'Abonnement 1 an',   blocs:12, base:840, desc:'12 blocs · −42% vs pack',          badge:'Meilleur tarif' },
]

const OPTIONS = [
  { id:'suivi_pro',     label:'Suivi Pro',                     pricePerBloc:20, desc:'Retour coach personnalisé chaque semaine' },
  { id:'renfo_classic', label:'Renfo Classique',               pricePerBloc:10, desc:'Musculation force générale intégrée au plan' },
  { id:'renfo_power',   label:'Renfo Puissance / Explosivité', pricePerBloc:20, desc:'Pliométrie, sprint, force spécifique' },
]

const GOALS: Record<string, { label:string; value:string }[]> = {
  running:   [
    { label:'5-10 km',       value:'5_10'    },
    { label:'Semi-marathon', value:'semi'    },
    { label:'Marathon',      value:'marathon'},
  ],
  cyclisme:  [
    { label:'Cyclosportive-Montagne', value:'cyclosport' },
    { label:'Performance FTP',         value:'ftp'        },
  ],
  triathlon: [
    { label:'S-M',  value:'sm'  },
    { label:'70.3', value:'703' },
  ],
}

const SPORTS = [
  { id:'running',   label:'Running',   icon:'🏃', sub:'5 km → Marathon'        },
  { id:'cyclisme',  label:'Cyclisme',  icon:'🚴', sub:'FTP → Cyclosportive'     },
  { id:'triathlon', label:'Triathlon', icon:'🏊', sub:'S → 70.3'               },
]

// ─── App Mockup ───────────────────────────────────────────────
function AppMockup() {
  const barH   = [55, 70, 42, 78, 85, 44, 90, 75]
  const sports = [
    { emoji:'🚴', name:"Sweet Spot 2×20'", meta:'1h45 · 247W · 122 TSS', col:'#2563eb' },
    { emoji:'🏃', name:'Endurance fondamentale',  meta:"1h20 · 4'42/km · 68 TSS",  col:'#16a34a' },
    { emoji:'🏊', name:'Technique + 6×100m',      meta:"55min · 1'28/100m · 45 TSS", col:brand     },
  ]

  return (
    <div style={{
      width:310, height:470,
      background:'#f8fafc',
      borderRadius:22,
      overflow:'hidden',
      boxShadow:'0 0 80px rgba(0,200,224,0.18), 0 50px 120px rgba(0,0,0,0.55)',
      transform:'perspective(1000px) rotateY(-10deg) rotateX(4deg) rotate(-1deg)',
      border:'1px solid rgba(0,200,224,0.3)',
      flexShrink:0,
      position:'relative' as const,
    }}>
      {/* Glow ring */}
      <div style={{
        position:'absolute', inset:-1,
        borderRadius:22,
        background:'transparent',
        boxShadow:'inset 0 0 0 1px rgba(0,200,224,0.15)',
        pointerEvents:'none',
        zIndex:10,
      }}/>

      {/* Topbar */}
      <div style={{ background:'#0e1526', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>THW</div>
          <span style={{ fontSize:11, fontWeight:700, color:'#f1f5f9', fontFamily:'sans-serif' }}>THW Coaching</span>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444' }}/>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#eab308' }}/>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e' }}/>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'13px 14px', height:'calc(100% - 42px)', overflowY:'auto' as const }}>
        <p style={{ fontSize:13, fontWeight:800, color:'#0f172a', margin:'0 0 11px', fontFamily:'sans-serif' }}>Bonjour, Thomas 👋</p>

        {/* KPI cards 2×2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:11 }}>
          {[
            { label:'CTL', val:'84',   sub:'Forme',    col:brand          },
            { label:'ATL', val:'91',   sub:'Fatigue',  col:'#a855f7'      },
            { label:'TSB', val:'−7',   sub:'Balance',  col:'#f97316'      },
            { label:'Vol.', val:'12.4h',sub:'Semaine', col:'#22c55e'      },
          ].map(m => (
            <div key={m.label} style={{ background:'#f1f5f9', borderRadius:9, padding:'8px 10px', border:`1px solid ${m.col}18` }}>
              <p style={{ fontSize:8, fontWeight:700, color:'#64748b', margin:'0 0 2px', textTransform:'uppercase' as const, letterSpacing:'0.05em', fontFamily:'sans-serif' }}>{m.label}</p>
              <p style={{ fontSize:17, fontWeight:900, color:m.col, margin:0, fontFamily:'sans-serif', lineHeight:1 }}>{m.val}</p>
              <p style={{ fontSize:8, color:'#94a3b8', margin:'2px 0 0', fontFamily:'sans-serif' }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div style={{ background:'#f1f5f9', borderRadius:10, padding:'9px 10px', marginBottom:11 }}>
          <p style={{ fontSize:9, fontWeight:700, color:'#475569', margin:'0 0 7px', fontFamily:'sans-serif' }}>Charge hebdomadaire</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:34 }}>
            {barH.map((h, i) => (
              <div key={i} style={{
                flex:1, height:`${h}%`, borderRadius:'3px 3px 0 0',
                background: i===7
                  ? grad
                  : i % 3 === 2
                    ? 'rgba(0,200,224,0.28)'
                    : 'rgba(91,111,255,0.32)',
              }}/>
            ))}
          </div>
        </div>

        {/* Recent sessions */}
        <p style={{ fontSize:9, fontWeight:700, color:'#475569', margin:'0 0 5px', fontFamily:'sans-serif' }}>Séances récentes</p>
        {sports.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:9, background:'#ffffff', border:'1px solid #e2e8f0', marginBottom:4 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:`${s.col}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{s.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:9, fontWeight:700, color:'#0f172a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'sans-serif' }}>{s.name}</p>
              <p style={{ fontSize:8, color:'#64748b', margin:0, fontFamily:'sans-serif' }}>{s.meta}</p>
            </div>
            <div style={{ width:6, height:6, borderRadius:'50%', background:s.col, flexShrink:0 }}/>
          </div>
        ))}

        {/* Readiness ring mini */}
        <div style={{ background:'#f1f5f9', borderRadius:10, padding:'9px 10px', marginTop:6, display:'flex', alignItems:'center', gap:12 }}>
          <svg width={44} height={44} viewBox="0 0 44 44" style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
            <circle cx={22} cy={22} r={17} fill="none" stroke="#e2e8f0" strokeWidth={4}/>
            <circle cx={22} cy={22} r={17} fill="none" stroke="url(#rg-mock)" strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2*Math.PI*17}
              strokeDashoffset={2*Math.PI*17*(1-0.75)}/>
            <defs>
              <linearGradient id="rg-mock" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={brand}/>
                <stop offset="100%" stopColor={brand2}/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <p style={{ fontSize:11, fontWeight:800, color:'#0f172a', margin:0, fontFamily:'sans-serif' }}>75 <span style={{ fontSize:9, color:'#64748b', fontWeight:400 }}>/100</span></p>
            <p style={{ fontSize:9, color:'#64748b', margin:'2px 0 0', fontFamily:'sans-serif' }}>Readiness · Forme</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step pill ────────────────────────────────────────────────
function StepPill({ n, label, active, done }: { n:number; label:string; active:boolean; done:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, opacity: done || active ? 1 : 0.4 }}>
      <div style={{
        width:28, height:28, borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        background: done ? '#22c55e' : active ? grad : 'rgba(255,255,255,0.07)',
        fontSize:12, fontWeight:800, color:'#fff', flexShrink:0,
        boxShadow: active ? `0 0 18px rgba(0,200,224,0.45)` : 'none',
      }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? txt : txtSub }}>{label}</span>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function LandingPage() {
  const [step,    setStep]    = useState(1)
  const [sport,   setSport]   = useState('')
  const [goal,    setGoal]    = useState('')
  const [formula, setFormula] = useState('')
  const [options, setOptions] = useState<string[]>([])

  const toggleOpt = (id:string) =>
    setOptions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const sel      = FORMULAS.find(f => f.id === formula)
  const blocs    = sel?.blocs ?? 0
  const basePx   = sel?.base ?? 0
  const optsPx   = options.reduce((s, id) => {
    const o = OPTIONS.find(o => o.id === id)
    return s + (o ? o.pricePerBloc * blocs : 0)
  }, 0)
  const total    = basePx + optsPx

  const btnStyle = (enabled:boolean): React.CSSProperties => ({
    padding:'12px 28px', borderRadius:10,
    background: enabled ? grad : 'rgba(255,255,255,0.07)',
    border:'none', color:'#fff', fontSize:13, fontWeight:700,
    cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.45,
  })

  const backBtn: React.CSSProperties = {
    background:'none', border:'none', color:txtSub, cursor:'pointer', fontSize:12,
    padding:0, marginBottom:18, display:'flex', alignItems:'center', gap:4,
  }

  const optCard = (selected:boolean): React.CSSProperties => ({
    padding:'16px 20px', borderRadius:12,
    border:`2px solid ${selected ? brand : bord}`,
    background: selected ? 'rgba(0,200,224,0.07)' : cardBg,
    color:txt, cursor:'pointer', display:'flex', alignItems:'center',
    justifyContent:'space-between', width:'100%',
    textAlign:'left' as const,
    transition:'border-color 0.15s, background 0.15s',
  })

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200, overflowY:'auto',
      background:dark, fontFamily:"'DM Sans', system-ui, sans-serif",
      color:txt,
    }}>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:20,
        background:'rgba(7,13,26,0.88)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${bord}`,
        padding:'13px 32px', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:11, color:'#fff', boxShadow:`0 0 20px rgba(0,200,224,0.3)` }}>THW</div>
          <div>
            <p style={{ fontWeight:800, fontSize:14, color:txt, margin:0, letterSpacing:'-0.01em', fontFamily:"'Syne', sans-serif" }}>THW Coaching</p>
            <p style={{ fontSize:10, color:txtSub, margin:0 }}>Coaching hybride endurance + force</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <a href="/login" style={{ fontSize:12, color:txtSub, textDecoration:'none', padding:'7px 14px', borderRadius:8, border:`1px solid ${bord}` }}>
            Se connecter
          </a>
          <a href="#configurateur" style={{ fontSize:12, fontWeight:700, color:'#fff', textDecoration:'none', padding:'9px 18px', borderRadius:9, background:grad, boxShadow:`0 0 20px rgba(0,200,224,0.25)` }}>
            Commencer →
          </a>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        minHeight:'88vh', display:'flex', alignItems:'center',
        padding:'80px 48px 60px',
        background:[
          `radial-gradient(ellipse 70% 70% at 75% 50%, rgba(0,200,224,0.06), transparent)`,
          `radial-gradient(ellipse 50% 80% at 15% 80%, rgba(91,111,255,0.05), transparent)`,
          dark,
        ].join(', '),
        gap:56, flexWrap:'wrap',
      }}>
        {/* Left */}
        <div style={{ flex:'1 1 300px', maxWidth:520 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20, background:'rgba(0,200,224,0.1)', border:`1px solid rgba(0,200,224,0.3)`, marginBottom:24 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:brand, display:'inline-block', boxShadow:`0 0 8px ${brand}` }}/>
            <span style={{ fontSize:11, fontWeight:700, color:brand, letterSpacing:'0.06em', textTransform:'uppercase' as const }}>Première semaine gratuite</span>
          </div>

          <h1 style={{
            fontSize:'clamp(30px, 4vw, 52px)', fontWeight:900, color:txt,
            margin:'0 0 20px', lineHeight:1.1, letterSpacing:'-0.03em',
            fontFamily:"'Syne', sans-serif",
          }}>
            Le coaching hybride<br/>
            <span style={{ background:grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              endurance + force
            </span>
          </h1>

          <p style={{ fontSize:15, color:txtSub, margin:'0 0 32px', lineHeight:1.75, maxWidth:420 }}>
            Planification IA adaptative, suivi Strava automatique, zones personnalisées.
            Pour runners, cyclistes et triathlètes qui veulent aller plus loin.
          </p>

          {/* Sport badges */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:36 }}>
            {[{icon:'🏃',l:'Running'},{icon:'🚴',l:'Cyclisme'},{icon:'🏊',l:'Triathlon'},{icon:'🏋️',l:'Hyrox'}].map(s=>(
              <span key={s.l} style={{ padding:'6px 13px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${bord}`, fontSize:11, fontWeight:600, color:txtSub, display:'flex', alignItems:'center', gap:6 }}>
                {s.icon} {s.l}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
            <a href="#configurateur" style={{
              padding:'15px 30px', borderRadius:13, background:grad, border:'none',
              fontSize:14, fontWeight:700, color:'#fff', textDecoration:'none', display:'inline-block',
              boxShadow:`0 0 32px rgba(0,200,224,0.35), 0 8px 24px rgba(0,0,0,0.3)`,
            }}>
              Configurer mon plan →
            </a>
            <span style={{ fontSize:12, color:txtSub }}>✓ Sem. 1 gratuite &nbsp;·&nbsp; ✓ Résiliable</span>
          </div>
        </div>

        {/* Right: App mockup */}
        <div style={{ flex:'1 1 280px', display:'flex', justifyContent:'center', alignItems:'center', minHeight:500 }}>
          <AppMockup />
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────── */}
      <div style={{
        background:surf1, borderTop:`1px solid ${bord}`, borderBottom:`1px solid ${bord}`,
        padding:'28px 48px', display:'flex', justifyContent:'center',
        gap:'clamp(28px, 7vw, 100px)', flexWrap:'wrap',
      }}>
        {[
          {val:'500+', label:'Athlètes accompagnés'},
          {val:'4',    label:'Sports supportés'},
          {val:'98%',  label:'Satisfaction clients'},
          {val:'IA',   label:'Planification adaptative'},
        ].map(s=>(
          <div key={s.val} style={{ textAlign:'center' as const }}>
            <p style={{ fontSize:26, fontWeight:900, color:txt, margin:'0 0 4px', background:grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontFamily:"'Syne',sans-serif" }}>{s.val}</p>
            <p style={{ fontSize:11, color:txtSub, margin:0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── CONFIGURATEUR ───────────────────────────────────── */}
      <section id="configurateur" style={{ padding:'88px 32px 80px', maxWidth:820, margin:'0 auto' }}>

        <div style={{ textAlign:'center' as const, marginBottom:52 }}>
          <h2 style={{ fontSize:34, fontWeight:900, color:txt, margin:'0 0 12px', letterSpacing:'-0.025em', fontFamily:"'Syne',sans-serif" }}>
            Configure ton coaching
          </h2>
          <p style={{ fontSize:14, color:txtSub, margin:0 }}>
            4 étapes · <span style={{ color:brand, fontWeight:600 }}>Première semaine gratuite incluse dans tous les plans</span>
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:36, justifyContent:'center', flexWrap:'wrap' }}>
          {[
            { n:1, label:'Sport'    },
            { n:2, label:'Objectif' },
            { n:3, label:'Formule'  },
            { n:4, label:'Options'  },
          ].map((s, i) => (
            <div key={s.n} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <StepPill n={s.n} label={s.label} active={step===s.n} done={step>s.n}/>
              {i < 3 && <div style={{ width:24, height:1, background:bord }}/>}
            </div>
          ))}
        </div>

        {/* ── Step card ── */}
        <div style={{
          background:surf2, border:`1px solid ${bord}`, borderRadius:20, padding:'32px 36px',
          marginBottom:step >= 3 ? 14 : 0,
        }}>

          {/* ── STEP 1 : Sport ── */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize:20, fontWeight:800, color:txt, margin:'0 0 6px', fontFamily:"'Syne',sans-serif" }}>Quel est ton sport principal ?</h3>
              <p style={{ fontSize:13, color:txtSub, margin:'0 0 26px' }}>Tu pourras ajouter des sports secondaires dans l'app.</p>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
                {SPORTS.map(s => (
                  <button key={s.id} onClick={() => { setSport(s.id); setGoal('') }}
                    style={optCard(sport===s.id)}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <span style={{ fontSize:26 }}>{s.icon}</span>
                      <div>
                        <p style={{ fontSize:15, fontWeight:700, margin:0, color:txt }}>{s.label}</p>
                        <p style={{ fontSize:11, color:txtSub, margin:'3px 0 0' }}>{s.sub}</p>
                      </div>
                    </div>
                    {sport===s.id && <span style={{ color:brand, fontSize:18 }}>✓</span>}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:28, display:'flex', justifyContent:'flex-end' }}>
                <button disabled={!sport} onClick={() => setStep(2)} style={btnStyle(!!sport)}>
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Objectif ── */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} style={backBtn}>← Retour</button>
              <h3 style={{ fontSize:20, fontWeight:800, color:txt, margin:'0 0 6px', fontFamily:"'Syne',sans-serif" }}>Quel est ton objectif ?</h3>
              <p style={{ fontSize:13, color:txtSub, margin:'0 0 26px' }}>
                En {SPORTS.find(s=>s.id===sport)?.label}
              </p>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
                {(GOALS[sport] ?? []).map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value)}
                    style={optCard(goal===g.value)}>
                    <span style={{ fontSize:14, fontWeight:600 }}>{g.label}</span>
                    {goal===g.value && <span style={{ color:brand, fontSize:16 }}>✓</span>}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:28, display:'flex', justifyContent:'flex-end' }}>
                <button disabled={!goal} onClick={() => setStep(3)} style={btnStyle(!!goal)}>
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : Formule ── */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} style={backBtn}>← Retour</button>
              <h3 style={{ fontSize:20, fontWeight:800, color:txt, margin:'0 0 6px', fontFamily:"'Syne',sans-serif" }}>Choisis ta formule</h3>
              <p style={{ fontSize:13, color:txtSub, margin:'0 0 26px' }}>
                Semaine 1 offerte · Sans engagement sur le Pack
              </p>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
                {FORMULAS.map(f => (
                  <button key={f.id} onClick={() => setFormula(f.id)}
                    style={optCard(formula===f.id)}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:txt }}>{f.label}</span>
                        {f.badge && (
                          <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:10, background:brand, color:'#fff', textTransform:'uppercase' as const, letterSpacing:'0.05em' }}>
                            {f.badge}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize:11, color:txtSub, margin:0 }}>{f.desc}</p>
                    </div>
                    <div style={{ textAlign:'right' as const, flexShrink:0, marginLeft:16 }}>
                      <p style={{ fontSize:20, fontWeight:900, color:formula===f.id?brand:txt, margin:0, fontFamily:"'Syne',sans-serif" }}>{f.base}€</p>
                      <p style={{ fontSize:10, color:txtSub, margin:'2px 0 0' }}>base</p>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:28, display:'flex', justifyContent:'flex-end' }}>
                <button disabled={!formula} onClick={() => setStep(4)} style={btnStyle(!!formula)}>
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4 : Options ── */}
          {step === 4 && (
            <div>
              <button onClick={() => setStep(3)} style={backBtn}>← Retour</button>
              <h3 style={{ fontSize:20, fontWeight:800, color:txt, margin:'0 0 6px', fontFamily:"'Syne',sans-serif" }}>Options supplémentaires</h3>
              <p style={{ fontSize:13, color:txtSub, margin:'0 0 26px' }}>
                Prix par bloc de 4 semaines × {blocs} bloc{blocs > 1 ? 's' : ''} = {blocs * 4} semaines
              </p>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
                {OPTIONS.map(o => (
                  <button key={o.id} onClick={() => toggleOpt(o.id)}
                    style={optCard(options.includes(o.id))}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      {/* Checkbox */}
                      <div style={{
                        width:20, height:20, borderRadius:6,
                        border:`2px solid ${options.includes(o.id) ? brand : bord}`,
                        background: options.includes(o.id) ? brand : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                        transition:'background 0.15s, border-color 0.15s',
                      }}>
                        {options.includes(o.id) && <span style={{ fontSize:11, color:'#fff', lineHeight:1, fontWeight:800 }}>✓</span>}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, margin:0, color:txt }}>{o.label}</p>
                        <p style={{ fontSize:11, color:txtSub, margin:'3px 0 0' }}>{o.desc}</p>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' as const, flexShrink:0, marginLeft:16 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:options.includes(o.id)?brand:txtSub, margin:0 }}>+{o.pricePerBloc}€/bloc</p>
                      <p style={{ fontSize:10, color:txtSub, margin:'3px 0 0' }}>+{o.pricePerBloc*blocs}€ total</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── PRICE SUMMARY (steps 3 & 4) ── */}
        {step >= 3 && (
          <div style={{
            background:surf2, border:`1px solid ${bord}`, borderRadius:16,
            padding:'22px 28px', display:'flex', alignItems:'center',
            justifyContent:'space-between', flexWrap:'wrap', gap:16,
          }}>
            <div>
              <p style={{ fontSize:12, color:txtSub, margin:'0 0 5px' }}>Total estimé</p>
              <p style={{ fontSize:32, fontWeight:900, color:brand, margin:0, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>
                {total > 0 ? `${total}€` : '—'}
              </p>
              {total > 0 && blocs > 1 && (
                <p style={{ fontSize:11, color:txtSub, margin:'6px 0 0' }}>
                  soit {Math.round(total/blocs)}€/bloc · Sem. 1 gratuite incluse
                </p>
              )}
              {total > 0 && blocs === 1 && (
                <p style={{ fontSize:11, color:txtSub, margin:'6px 0 0' }}>Semaine 1 gratuite incluse</p>
              )}
            </div>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:10, alignItems:'flex-end' }}>
              <p style={{ fontSize:11, color:txtSub, margin:0, textAlign:'right' as const }}>
                ✓ Sem. 1 gratuite &nbsp;·&nbsp; ✓ Sans engagement &nbsp;·&nbsp; ✓ Annulable
              </p>
              {step === 4 && (
                <a href="/login?mode=signup" style={{
                  padding:'14px 28px', borderRadius:12,
                  background:grad, fontSize:14, fontWeight:700, color:'#fff',
                  textDecoration:'none', display:'inline-block',
                  boxShadow:`0 0 28px rgba(0,200,224,0.35), 0 6px 18px rgba(0,0,0,0.25)`,
                }}>
                  Commencer mon coaching →
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── FEATURES STRIP ──────────────────────────────────── */}
      <section style={{ padding:'60px 48px', background:surf1, borderTop:`1px solid ${bord}` }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <h2 style={{ fontSize:26, fontWeight:900, color:txt, margin:'0 0 36px', textAlign:'center' as const, fontFamily:"'Syne',sans-serif" }}>
            Tout ce dont tu as besoin
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:18 }}>
            {[
              { icon:'🧠', title:'IA Adaptive',         desc:'Plan généré et ajusté en continu selon tes données réelles.' },
              { icon:'📊', title:'Analytics avancés',   desc:'CTL/ATL/TSB, zones, profil intensité — comme TrainingPeaks.' },
              { icon:'🔗', title:'Strava & Garmin',     desc:'Sync automatique de toutes tes activités. Zéro friction.' },
              { icon:'🏋️', title:'Hybride endurance+force', desc:'Running, cyclisme, Hyrox, renforcement dans un seul plan.' },
              { icon:'📅', title:'Planning visuel',     desc:'Visualise ta semaine, tes blocs, tes charges en un coup d\'œil.' },
              { icon:'🎯', title:'Coaching personnalisé', desc:'Retour coach et ajustements chaque semaine (option Suivi Pro).' },
            ].map(f=>(
              <div key={f.title} style={{ background:surf2, border:`1px solid ${bord}`, borderRadius:14, padding:'20px 22px' }}>
                <div style={{ fontSize:24, marginBottom:10 }}>{f.icon}</div>
                <p style={{ fontSize:13, fontWeight:700, color:txt, margin:'0 0 7px', fontFamily:"'Syne',sans-serif" }}>{f.title}</p>
                <p style={{ fontSize:12, color:txtSub, margin:0, lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${bord}`, padding:'28px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, background:dark }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>THW</div>
          <span style={{ fontSize:12, color:txtSub }}>THW Coaching · 2026 · Coaching hybride endurance + force</span>
        </div>
        <div style={{ display:'flex', gap:22 }}>
          {['Mentions légales','Contact','FAQ'].map(l=>(
            <a key={l} href="#" style={{ fontSize:11, color:txtSub, textDecoration:'none' }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}
