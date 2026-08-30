// HeroAnimation.jsx
// Premium animated sports data dashboard — 4 looping scenes
// Scene 1: GPS trace drawing  · Scene 2: CTL/ATL/TSB curves
// Scene 3: HR zones lighting  · Scene 4: Performance counters

// ── Helpers ────────────────────────────────────────────────────────────────
function haLerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function haEaseOut3(t) { const c = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - c, 3); }
function haEaseInOut2(t) { const c = Math.max(0, Math.min(1, t)); return c < 0.5 ? 2*c*c : -1+(4-2*c)*c; }

const HA_CYAN   = '#00c8e0';
const HA_INDIGO = '#5b6fff';

// ── Scene 1: GPS Trace ─────────────────────────────────────────────────────
function HAGPSScene({ progress }) {
  const W = 460, H = 284;

  const rawPts = [
    [0.12,0.68],[0.18,0.58],[0.25,0.48],[0.33,0.41],
    [0.40,0.34],[0.48,0.26],[0.57,0.21],[0.65,0.19],
    [0.71,0.23],[0.77,0.30],[0.81,0.40],[0.82,0.50],
    [0.78,0.58],[0.72,0.64],[0.64,0.68],[0.55,0.71],
    [0.45,0.72],[0.35,0.70],[0.25,0.68],[0.18,0.66],
    [0.12,0.68]
  ];
  const pts = rawPts.map(([x,y]) => [x*W, y*H]);
  const d = pts.map((p,i) => `${i===0?'M':'L'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const drawP = haEaseInOut2(progress);

  // Dot along path
  const n = pts.length - 1;
  const raw = drawP * n;
  const di  = Math.min(Math.floor(raw), n-1);
  const df  = raw - di;
  const dx  = haLerp(pts[di][0], pts[di+1][0], df);
  const dy  = haLerp(pts[di][1], pts[di+1][1], df);

  const dist = (drawP * 42.2).toFixed(1);
  const elev = Math.round(drawP * 1240);

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position:'absolute', top:0, left:0 }}>
        <defs>
          <linearGradient id="haPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={HA_CYAN}/>
            <stop offset="100%" stopColor={HA_INDIGO}/>
          </linearGradient>
          <filter id="haGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {[...Array(8)].map((_,i) => (
          <line key={`hg${i}`} x1={0} y1={((i+1)/9)*H} x2={W} y2={((i+1)/9)*H} stroke="rgba(0,200,224,0.07)" strokeWidth="1"/>
        ))}
        {[...Array(10)].map((_,i) => (
          <line key={`vg${i}`} x1={((i+1)/11)*W} y1={0} x2={((i+1)/11)*W} y2={H} stroke="rgba(0,200,224,0.07)" strokeWidth="1"/>
        ))}

        {/* Glow trail */}
        <path d={d} fill="none" stroke={HA_CYAN} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
          strokeOpacity="0.07" pathLength="1" strokeDasharray="1" strokeDashoffset={1-drawP}/>

        {/* Main path */}
        <path d={d} fill="none" stroke="url(#haPathGrad)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          pathLength="1" strokeDasharray="1" strokeDashoffset={1-drawP}
          filter="url(#haGlow)"/>

        {/* Moving dot */}
        {drawP > 0.02 && (
          <>
            <circle cx={dx} cy={dy} r={14} fill={HA_CYAN} fillOpacity="0.10"/>
            <circle cx={dx} cy={dy} r={7}  fill={HA_CYAN} fillOpacity="0.16"/>
            <circle cx={dx} cy={dy} r={4.5} fill={HA_CYAN} style={{ filter:`drop-shadow(0 0 8px ${HA_CYAN})` }}/>
            <circle cx={dx} cy={dy} r={2}  fill="white"/>
          </>
        )}

        {/* Start marker */}
        <circle cx={pts[0][0]} cy={pts[0][1]} r={4} fill="none" stroke={HA_CYAN} strokeWidth="1.5" strokeOpacity="0.55"/>

        {/* Summit label */}
        {drawP > 0.58 && (
          <g opacity={Math.min((drawP-0.58)/0.08, 1)}>
            <circle cx={pts[7][0]} cy={pts[7][1]} r={3.5} fill={HA_INDIGO} style={{ filter:`drop-shadow(0 0 6px ${HA_INDIGO})` }}/>
            <rect x={pts[7][0]-22} y={pts[7][1]-26} width={44} height={17} rx={4}
              fill="rgba(6,10,18,0.88)" stroke={`${HA_INDIGO}55`} strokeWidth="1"/>
            <text x={pts[7][0]} y={pts[7][1]-13} textAnchor="middle"
              fontFamily="'DM Mono', monospace" fontSize={8} fill={HA_INDIGO}>1 240 m</text>
          </g>
        )}
      </svg>

      {/* Header */}
      <div style={{ position:'absolute', top:14, left:14, display:'flex', alignItems:'center', gap:7 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:HA_CYAN, boxShadow:`0 0 10px ${HA_CYAN}` }}/>
        <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:HA_CYAN, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          GPS Live · Marathon Trail Alpes
        </span>
      </div>

      {/* Stats */}
      <div style={{ position:'absolute', bottom:14, left:14, right:14, display:'flex', gap:8 }}>
        {[
          { l:'Distance', v:`${dist} km` },
          { l:'D+',       v:`${elev} m`  },
          { l:'Allure',   v: drawP > 0.05 ? '4:12 /km' : '—' },
        ].map((s,i) => (
          <div key={i} style={{
            flex:1, padding:'8px 10px', borderRadius:8,
            background:'rgba(0,5,10,0.80)', border:'1px solid rgba(0,200,224,0.18)',
            backdropFilter:'blur(10px)',
          }}>
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:9, color:HA_CYAN, letterSpacing:'0.1em', marginBottom:3, textTransform:'uppercase' }}>{s.l}</div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:15, fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em' }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scene 2: CTL / ATL / TSB Curves ────────────────────────────────────────
function HACTLScene({ progress }) {
  const W = 460, H = 284;
  const WEEKS = 16;
  const p = haEaseOut3(progress);

  const ctlData = [42,46,50,53,48,54,58,62,66,70,72,74,78,80,82,84];
  const atlData = [44,52,48,60,45,62,70,58,74,68,80,72,90,76,84,78];
  const tsbData = ctlData.map((c,i) => (c - atlData[i]) * 0.5 + 52);

  const padL=46, padR=20, padT=34, padB=38;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const vis = Math.max(2, Math.floor(p * WEEKS));

  function buildLine(data) {
    const slice = data.slice(0, vis);
    return slice.map((v,i) => {
      const x = padL + (i / (WEEKS-1)) * cW;
      const y = padT + cH - (v / 100) * cH;
      return `${i===0?'M':'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  const ctlLine = buildLine(ctlData);
  const atlLine = buildLine(atlData);
  const tsbLine = buildLine(tsbData);

  const lastCTL = ctlData[vis-1] || 0;
  const lastATL = atlData[vis-1] || 0;
  const lastTSB = tsbData[vis-1] || 50;

  const endX = padL + ((vis-1)/(WEEKS-1))*cW;
  const ctlY = padT + cH - (lastCTL/100)*cH;
  const atlY = padT + cH - (lastATL/100)*cH;
  const tsbY = padT + cH - (lastTSB/100)*cH;

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position:'absolute', top:0, left:0 }}>
        <defs>
          <linearGradient id="haCtlFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={HA_CYAN} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={HA_CYAN} stopOpacity="0.00"/>
          </linearGradient>
          <filter id="haLineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Horizontal grid */}
        {[25,50,75,100].map(v => {
          const y = padT + cH - (v/100)*cH;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={W-padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
              <text x={padL-6} y={y+4} textAnchor="end"
                fontFamily="'DM Mono', monospace" fontSize={8} fill="rgba(255,255,255,0.22)">{v}</text>
            </g>
          );
        })}

        {/* X axis */}
        <line x1={padL} y1={padT+cH} x2={W-padR} y2={padT+cH} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
        {[1,4,8,12,16].map(w => {
          const x = padL + ((w-1)/(WEEKS-1))*cW;
          return <text key={w} x={x} y={H-padB+14} textAnchor="middle"
            fontFamily="'DM Mono', monospace" fontSize={8} fill="rgba(255,255,255,0.2)">S{w}</text>;
        })}

        {/* CTL area fill */}
        {ctlLine && (
          <path d={`${ctlLine} L ${endX},${padT+cH} L ${padL},${padT+cH} Z`}
            fill="url(#haCtlFill)"/>
        )}

        {/* TSB dashed */}
        {tsbLine && (
          <path d={tsbLine} fill="none" stroke={HA_INDIGO} strokeWidth="1.5"
            strokeDasharray="4 3" filter="url(#haLineGlow)"/>
        )}

        {/* ATL line */}
        {atlLine && (
          <path d={atlLine} fill="none" stroke="#ef6060" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" filter="url(#haLineGlow)"/>
        )}

        {/* CTL line */}
        {ctlLine && (
          <path d={ctlLine} fill="none" stroke={HA_CYAN} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" filter="url(#haLineGlow)"/>
        )}

        {/* Live dots */}
        {vis >= 2 && (
          <>
            <circle cx={endX} cy={ctlY} r={4.5} fill={HA_CYAN} style={{ filter:`drop-shadow(0 0 6px ${HA_CYAN})` }}/>
            <circle cx={endX} cy={atlY} r={3.5} fill="#ef6060" style={{ filter:'drop-shadow(0 0 5px #ef6060)' }}/>
            <circle cx={endX} cy={tsbY} r={3}   fill={HA_INDIGO} style={{ filter:`drop-shadow(0 0 5px ${HA_INDIGO})` }}/>
          </>
        )}
      </svg>

      {/* Title */}
      <div style={{ position:'absolute', top:12, left:14 }}>
        <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:HA_CYAN, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Charge d'entraînement · 16 semaines
        </span>
      </div>

      {/* Live values */}
      <div style={{ position:'absolute', top:10, right:14, display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
        {[
          { l:'CTL', v:Math.round(lastCTL*0.84),  c:HA_CYAN    },
          { l:'ATL', v:Math.round(lastATL*0.91),  c:'#ef6060'  },
          { l:'TSB', v:(Math.round(lastCTL*0.84) - Math.round(lastATL*0.91)), c:HA_INDIGO, signed:true },
        ].map(m => (
          <div key={m.l} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:"'Syne', sans-serif", fontSize:17, fontWeight:800, letterSpacing:'-0.04em', color:m.c }}>
              {m.signed && m.v >= 0 ? '+' : ''}{m.v}
            </span>
            <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9, color:m.c, opacity:0.65, letterSpacing:'0.1em' }}>{m.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scene 3: HR Zones ──────────────────────────────────────────────────────
function HAHRScene({ progress }) {
  const p = haEaseOut3(progress);

  const zones = [
    { id:'Z1', name:'Récupération', bpm:'< 120 bpm',  pct:18, color:'#22c55e' },
    { id:'Z2', name:'Endurance',    bpm:'120–140 bpm', pct:38, color:'#84cc16' },
    { id:'Z3', name:'Tempo',        bpm:'140–158 bpm', pct:22, color:'#eab308' },
    { id:'Z4', name:'Seuil',        bpm:'158–172 bpm', pct:14, color:'#f97316' },
    { id:'Z5', name:'VO₂max',       bpm:'> 172 bpm',   pct: 8, color:'#ef4444' },
  ];

  return (
    <div style={{ padding:'14px 16px 14px', height:'100%', display:'flex', flexDirection:'column', gap:6 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:HA_CYAN, boxShadow:`0 0 10px ${HA_CYAN}` }}/>
        <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:HA_CYAN, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Répartition Zones FC · Dernière séance
        </span>
      </div>

      {zones.map((z,i) => {
        const zp  = Math.max(0, Math.min(1, (p * 5.5 - i) / 1));
        const bar = haEaseOut3(zp) * z.pct;
        const lit = zp > 0;

        return (
          <div key={z.id} style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
            {/* Badge */}
            <div style={{
              width:28, height:28, borderRadius:6, flexShrink:0,
              background: lit ? `${z.color}22` : 'rgba(255,255,255,0.04)',
              border:`1px solid ${lit ? z.color+'55' : 'rgba(255,255,255,0.06)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: lit ? `0 0 12px ${z.color}44` : 'none',
              transition:'all 0.35s',
            }}>
              <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9, fontWeight:700, color: lit ? z.color : 'rgba(255,255,255,0.18)' }}>{z.id}</span>
            </div>

            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, fontWeight:500, color: lit ? 'var(--text)' : 'rgba(255,255,255,0.18)', transition:'color 0.35s' }}>{z.name}</span>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9, color: lit ? `${z.color}cc` : 'rgba(255,255,255,0.12)', transition:'color 0.35s' }}>{z.bpm}</span>
                  <span style={{ fontFamily:"'Syne', sans-serif", fontSize:13, fontWeight:700, color: lit ? z.color : 'rgba(255,255,255,0.12)', minWidth:28, textAlign:'right', transition:'color 0.35s' }}>
                    {lit ? `${Math.round(bar)}%` : ''}
                  </span>
                </div>
              </div>
              <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${bar}%`, maxWidth:'100%', borderRadius:3,
                  background: lit ? `linear-gradient(90deg, ${z.color}bb, ${z.color})` : 'transparent',
                  boxShadow: lit ? `0 0 8px ${z.color}88` : 'none',
                  transition:'background 0.3s',
                }}/>
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary badge */}
      <div style={{
        marginTop:4, padding:'7px 12px', borderRadius:8,
        background:'rgba(0,200,224,0.07)', border:'1px solid rgba(0,200,224,0.18)',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        opacity: Math.min(Math.max((p - 0.82)/0.12, 0), 1),
        transition:'opacity 0.4s',
      }}>
        <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, color:'var(--text-mid)' }}>Excellent ratio aérobie</span>
        <span style={{ fontFamily:"'DM Mono', monospace", fontSize:11, color:HA_CYAN, fontWeight:600 }}>56% Z1–Z2</span>
      </div>
    </div>
  );
}

// ── Scene 4: Performance Counters ──────────────────────────────────────────
function HAPerfScene({ progress }) {
  const p = haEaseOut3(progress);

  const metrics = [
    { l:'FTP',    num:287, unit:'W',          target:300, color:HA_CYAN,   delay:0.00 },
    { l:'Allure', num:null,unit:'/km', disp:'3:52',       color:HA_INDIGO, delay:0.12 },
    { l:'TSS',    num:342, unit:'',           target:400, color:'#22c55e', delay:0.25 },
    { l:'VO₂max', num:64,  unit:'ml/kg/min',  target:68,  color:'#f97316', delay:0.38 },
  ];

  return (
    <div style={{ padding:'14px 16px', height:'100%', display:'flex', flexDirection:'column', gap:10 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 10px #22c55e' }}/>
        <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:HA_CYAN, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Métriques Performance · Saison 2026
        </span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flex:1 }}>
        {metrics.map((m,i) => {
          const mp  = Math.max(0, Math.min(1, (p - m.delay) / (1 - m.delay)));
          const ep  = haEaseOut3(mp);
          const val = m.num ? Math.round(m.num * ep) : m.disp;
          const glo = ep > 0.5 ? (ep - 0.5) * 2 : 0;
          const hexGlo = Math.round(glo * 0x55).toString(16).padStart(2,'0');

          return (
            <div key={m.l} style={{
              padding:'13px 15px', borderRadius:12,
              background:`${m.color}0a`,
              border:`1px solid ${m.color}${hexGlo}`,
              position:'relative', overflow:'hidden',
              opacity: ep > 0 ? 1 : 0,
              transform:`translateY(${(1-ep)*10}px)`,
              transition:'opacity 0.35s, transform 0.35s',
              boxShadow:`0 0 ${Math.round(glo*22)}px ${m.color}22`,
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${m.color}, transparent)`, opacity:glo }}/>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:9, color:m.color, letterSpacing:'0.1em', marginBottom:5, opacity:0.8 }}>{m.l}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                <span style={{
                  fontFamily:"'Syne', sans-serif", fontSize:28, fontWeight:800,
                  letterSpacing:'-0.05em', color:m.color,
                  textShadow:`0 0 ${Math.round(glo*18)}px ${m.color}`,
                }}>{val}</span>
                <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9, color:`${m.color}aa` }}>{m.unit}</span>
              </div>
              {m.num && m.target && ep > 0.35 && (
                <div style={{ marginTop:7 }}>
                  <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:2,
                      width:`${(m.num/m.target)*100}%`,
                      background:`linear-gradient(90deg, ${m.color}88, ${m.color})`,
                      boxShadow:`0 0 6px ${m.color}66`,
                    }}/>
                  </div>
                  <div style={{ fontFamily:"'DM Mono', monospace", fontSize:8, color:`${m.color}66`, marginTop:4 }}>obj. {m.target}{m.unit}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trend badge */}
      <div style={{
        padding:'7px 12px', borderRadius:8,
        background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)',
        display:'flex', alignItems:'center', gap:8,
        opacity: Math.min(Math.max((p-0.72)/0.14, 0), 1),
        transition:'opacity 0.4s',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
        <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, color:'#22c55e' }}>+12% depuis le début de saison · Sur la bonne trajectoire</span>
      </div>
    </div>
  );
}

// ── Main HeroAnimation component ────────────────────────────────────────────
function HeroAnimation() {
  const SCENE = 5.5; // seconds per scene
  const FADE  = 0.55;
  const TOTAL = SCENE * 4;

  const [t, setT] = React.useState(0);
  const startRef  = React.useRef(null);

  React.useEffect(() => {
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      setT(((ts - startRef.current) / 1000) % TOTAL);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function sOp(i) {
    const s = i * SCENE, e = s + SCENE;
    if (t < s || t > e) return 0;
    if (t < s + FADE)   return (t - s) / FADE;
    if (t > e - FADE)   return 1 - (t - (e - FADE)) / FADE;
    return 1;
  }

  function sProg(i) {
    const s = i * SCENE;
    return Math.max(0, Math.min(1, (t - s) / (SCENE * 0.88)));
  }

  const activeScene = Math.min(3, Math.floor(t / SCENE));

  const scenes = [
    <HAGPSScene  progress={sProg(0)}/>,
    <HACTLScene  progress={sProg(1)}/>,
    <HAHRScene   progress={sProg(2)}/>,
    <HAPerfScene progress={sProg(3)}/>,
  ];

  return (
    <div style={{ position:'relative', animation:'fadeUpSlow 0.9s 0.15s cubic-bezier(0.4,0,0.2,1) both' }}>

      {/* Ambient glow */}
      <div style={{
        position:'absolute', inset:'-10% -5%', zIndex:0,
        background:'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,200,224,0.18), transparent 70%)',
        filter:'blur(40px)',
      }}/>

      {/* Card */}
      <div style={{
        position:'relative', zIndex:2,
        background:'linear-gradient(180deg, rgba(255,255,255,0.046), rgba(255,255,255,0.020))',
        border:'1px solid var(--border-mid)',
        borderRadius:20,
        overflow:'hidden',
        boxShadow:'0 24px 60px -20px rgba(0,0,0,0.6), 0 0 40px rgba(0,200,224,0.08)',
        backdropFilter:'blur(20px)',
        animation:'float 6s ease-in-out infinite',
      }}>
        {/* Top gradient stripe */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #00c8e0 30%, #5b6fff 70%, transparent)', zIndex:10 }}/>

        {/* Scene stack */}
        <div style={{ position:'relative', height:300 }}>
          {scenes.map((scene,i) => (
            <div key={i} style={{
              position:'absolute', inset:0,
              opacity: sOp(i),
              transition:`opacity ${FADE*0.8}s ease`,
              pointerEvents:'none',
            }}>
              {scene}
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, alignItems:'center', zIndex:10 }}>
          {scenes.map((_,i) => (
            <div key={i} style={{
              width:  i === activeScene ? 20 : 5,
              height: 5, borderRadius:3,
              background: i === activeScene ? HA_CYAN : 'rgba(255,255,255,0.18)',
              boxShadow:  i === activeScene ? `0 0 8px ${HA_CYAN}` : 'none',
              transition:'all 0.45s ease',
            }}/>
          ))}
        </div>
      </div>

      {/* Floating Coach IA bubble */}
      <div style={{
        position:'absolute', bottom:-16, left:-28, zIndex:3,
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 14px',
        background:'rgba(7,11,15,0.88)',
        border:'1px solid rgba(91,111,255,0.30)',
        borderRadius:14,
        backdropFilter:'blur(14px)',
        boxShadow:'0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(91,111,255,0.15)',
        animation:'float 5s ease-in-out 0.5s infinite',
        maxWidth:240,
      }}>
        <div style={{
          width:30, height:30, flexShrink:0,
          background:'linear-gradient(135deg,#00c8e0,#5b6fff)', borderRadius:8,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 16px rgba(0,200,224,0.4)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily:"'Syne', sans-serif", fontSize:10, fontWeight:700, background:'linear-gradient(135deg,#00c8e0,#5b6fff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>COACH IA</div>
          <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, color:'var(--text)', marginTop:2, lineHeight:1.3 }}>Ton corps est prêt. Pousse l'intensité.</div>
        </div>
      </div>

      {/* Floating readiness ring */}
      <div style={{
        position:'absolute', top:-20, right:-16, zIndex:3,
        background:'rgba(7,11,15,0.88)',
        border:'1px solid var(--border-mid)',
        borderRadius:14, padding:12,
        backdropFilter:'blur(14px)',
        boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
        animation:'float 7s ease-in-out 0.2s infinite',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
          <circle cx="24" cy="24" r="18" fill="none" stroke="url(#haRingGrad)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray={2*Math.PI*18} strokeDashoffset={2*Math.PI*18*0.25}/>
          <defs>
            <linearGradient id="haRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00c8e0"/>
              <stop offset="100%" stopColor="#5b6fff"/>
            </linearGradient>
          </defs>
        </svg>
        <div>
          <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:9, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-dim)' }}>Readiness</div>
          <div style={{ fontFamily:"'Syne', sans-serif", fontSize:22, fontWeight:800, letterSpacing:'-0.04em', color:HA_CYAN, lineHeight:1, marginTop:4 }}>
            75<span style={{ fontSize:11, color:'var(--text-dim)', fontWeight:500, marginLeft:2 }}>/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HeroAnimation = HeroAnimation;
