// Animated charts: CTL/ATL/TSB curve, HR zones, Power curve
function ChartsSection() {
  const [tab, setTab] = React.useState('load');
  const [animKey, setAnimKey] = React.useState(0);

  React.useEffect(() => {
    setAnimKey(k => k + 1);
  }, [tab]);

  return (
    <section id="charts" style={{ paddingTop: 120 }}>
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <span className="eyebrow">Visualisations</span>
        <h2 className="section-title">
          Tes données,<br/>
          <span style={{
            background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>en images claires</span>.
        </h2>
        <p className="section-sub">
          Charge d'entraînement, zones de fréquence cardiaque, courbe de puissance — tout est calculé en temps réel à partir de tes activités synchronisées.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, width: 'fit-content',
      }}>
        {[
          { id: 'load', l: 'Charge CTL/ATL/TSB' },
          { id: 'hr', l: 'Zones FC' },
          { id: 'power', l: 'Courbe de puissance' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: tab === t.id ? 'var(--brand-gradient)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text-mid)',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: tab === t.id ? '0 2px 12px rgba(0,200,224,0.28)' : 'none',
          }}>{t.l}</button>
        ))}
      </div>

      <div className="l-card" key={animKey} style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-gradient-h)' }}/>
        {tab === 'load' && <LoadChart/>}
        {tab === 'hr' && <HRZones/>}
        {tab === 'power' && <PowerCurve/>}
      </div>
    </section>
  );
}

function LoadChart() {
  const W = 920, H = 320;
  const days = 56;
  // Synthetic CTL/ATL/TSB curves
  const ctl = Array.from({length: days}, (_, i) => 60 + Math.sin(i/8)*5 + i*0.4);
  const atl = Array.from({length: days}, (_, i) => 70 + Math.sin(i/3)*15 + i*0.3);
  const tsb = ctl.map((c, i) => c - atl[i]);

  const xScale = i => 60 + (i / (days-1)) * (W - 100);
  const yScaleLoad = v => H - 50 - ((v - 30) / 80) * (H - 80);
  const yScaleTSB = v => H/2 - (v / 30) * 60;

  const pathFor = (arr, scale) => arr.map((v, i) => `${i===0?'M':'L'}${xScale(i)} ${scale(v)}`).join(' ');
  const areaFor = (arr, scale) => `${pathFor(arr, scale)} L${xScale(days-1)} ${H-50} L${xScale(0)} ${H-50} Z`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Charge d'entraînement · 8 dernières semaines</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Calculé chaque nuit à partir de tes TSS</div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { l: 'CTL · Forme', c: '#00c8e0', v: '84' },
            { l: 'ATL · Fatigue', c: '#ef4444', v: '91' },
            { l: 'TSB · Forme nette', c: '#5b6fff', v: '−7' },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 3, background: s.c, borderRadius: 2, boxShadow: `0 0 6px ${s.c}` }}/>
              <div>
                <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{s.l}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: '-0.03em', color: s.c }}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c8e0" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#00c8e0" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="atlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i} x1="60" x2={W-40} y1={50 + i * (H-100)/4} y2={50 + i * (H-100)/4}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        ))}

        {/* Y axis labels */}
        {[110, 90, 70, 50, 30].map((v, i) => (
          <text key={v} x="50" y={55 + i * (H-100)/4} textAnchor="end"
            fontFamily="DM Mono" fontSize="10" fill="rgba(238,242,247,0.38)">{v}</text>
        ))}

        {/* Zero line for TSB */}
        <line x1="60" x2={W-40} y1={H/2} y2={H/2} stroke="rgba(91,111,255,0.18)" strokeWidth="1" strokeDasharray="3 3"/>

        {/* ATL area + line */}
        <path d={areaFor(atl, yScaleLoad)} fill="url(#atlGrad)"
          style={{ animation: 'fadeUpSlow 1.4s 0.4s ease both' }}/>
        <path d={pathFor(atl, yScaleLoad)} fill="none" stroke="#ef4444" strokeWidth="2"
          strokeDasharray="2000" strokeDashoffset="2000"
          style={{ animation: 'drawLine 2s 0.2s cubic-bezier(0.4,0,0.2,1) forwards', '--len': 2000 }}/>

        {/* CTL area + line */}
        <path d={areaFor(ctl, yScaleLoad)} fill="url(#ctlGrad)"
          style={{ animation: 'fadeUpSlow 1.4s 0.7s ease both' }}/>
        <path d={pathFor(ctl, yScaleLoad)} fill="none" stroke="#00c8e0" strokeWidth="2.5"
          strokeDasharray="2000" strokeDashoffset="2000"
          style={{ animation: 'drawLine 2s 0.5s cubic-bezier(0.4,0,0.2,1) forwards', '--len': 2000, filter: 'drop-shadow(0 0 4px rgba(0,200,224,0.4))' }}/>

        {/* TSB bars */}
        {tsb.map((v, i) => (
          <rect key={i} x={xScale(i) - 4} y={Math.min(H/2, yScaleTSB(v))}
            width="3" height={Math.abs(yScaleTSB(v) - H/2)}
            fill={v >= 0 ? '#5b6fff' : '#ef4444'} opacity="0.4"
            style={{ animation: `chartBarEnter 0.4s ${0.8 + i * 0.012}s cubic-bezier(0.25,1,0.5,1) both`, transformOrigin: `${xScale(i)}px ${H/2}px` }}/>
        ))}

        {/* Current dot */}
        <circle cx={xScale(days-1)} cy={yScaleLoad(ctl[days-1])} r="6" fill="#00c8e0"
          style={{ animation: 'glowPulse 2s 2.4s infinite, slideUpFade 0.4s 2.2s both' }}/>
        <circle cx={xScale(days-1)} cy={yScaleLoad(ctl[days-1])} r="3" fill="#fff"
          style={{ animation: 'slideUpFade 0.4s 2.4s both' }}/>

        {/* X axis labels */}
        {['S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'].map((l, i) => (
          <text key={l} x={xScale(i * 8)} y={H-25} textAnchor="middle"
            fontFamily="DM Mono" fontSize="10"
            fill={i === 7 ? '#00c8e0' : 'rgba(238,242,247,0.38)'}
            fontWeight={i === 7 ? 700 : 400}>{l}</text>
        ))}
      </svg>
    </div>
  );
}

function HRZones() {
  const zones = [
    { z: 'Z1', l: 'Récupération', range: '< 132 bpm', pct: 18, c: '#22c55e' },
    { z: 'Z2', l: 'Endurance', range: '132–148 bpm', pct: 42, c: '#00c8e0' },
    { z: 'Z3', l: 'Tempo', range: '148–162 bpm', pct: 22, c: '#5b6fff' },
    { z: 'Z4', l: 'Seuil', range: '162–175 bpm', pct: 12, c: '#f59e0b' },
    { z: 'Z5', l: 'VO2max', range: '> 175 bpm', pct: 6, c: '#ef4444' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Répartition zones FC · S12</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>FC max 187 bpm · 12h45 d'entraînement</div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--brand)' }}>
          Polarisé · Z2 dominant ✓
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 56, borderRadius: 12, overflow: 'hidden', marginBottom: 32, border: '1px solid var(--border)' }}>
        {zones.map((z, i) => (
          <div key={z.z} style={{
            width: `${z.pct}%`,
            background: `linear-gradient(180deg, ${z.c}, ${z.c}aa)`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            color: '#fff', fontFamily: "'Syne', sans-serif", fontWeight: 700,
            transformOrigin: 'left',
            animation: `barFill 1.2s ${i * 0.15}s cubic-bezier(0.25,1,0.5,1) both`,
            boxShadow: `inset 0 0 16px ${z.c}66`,
          }}>
            <div style={{ fontSize: 14, letterSpacing: '-0.02em' }}>{z.z}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.85 }}>{z.pct}%</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {zones.map((z, i) => (
          <div key={z.z} style={{
            padding: 14, borderRadius: 12,
            background: `${z.c}10`, border: `1px solid ${z.c}30`,
            animation: `slideUpFade 0.5s ${0.5 + i * 0.08}s ease both`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: z.c, boxShadow: `0 0 6px ${z.c}` }}/>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: z.c }}>{z.z}</span>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text)', marginBottom: 4 }}>{z.l}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)' }}>{z.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PowerCurve() {
  const W = 920, H = 320;
  // Power-duration curve points: [seconds, watts]
  const pts = [
    [5, 980], [15, 720], [30, 540], [60, 410],
    [120, 348], [180, 322], [300, 305], [600, 292],
    [1200, 282], [1800, 274], [3600, 260],
  ];

  const xMin = Math.log(5), xMax = Math.log(3600);
  const yMin = 240, yMax = 1000;
  const xScale = s => 60 + ((Math.log(s) - xMin) / (xMax - xMin)) * (W - 100);
  const yScale = w => H - 50 - ((w - yMin) / (yMax - yMin)) * (H - 80);

  const path = pts.map((p, i) => `${i===0?'M':'L'}${xScale(p[0])} ${yScale(p[1])}`).join(' ');
  const area = `${path} L${xScale(pts[pts.length-1][0])} ${H-50} L${xScale(pts[0][0])} ${H-50} Z`;

  const ftpY = yScale(286);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Courbe de puissance · Vélo · 90 jours</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Records par durée — extraits de tes activités</div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>FTP</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--brand)' }}>286<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 4 }}>W</span></div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>5s peak</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: '#5b6fff' }}>980<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 4 }}>W</span></div>
          </div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="powGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c8e0" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#5b6fff" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="powLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b6fff"/>
            <stop offset="100%" stopColor="#00c8e0"/>
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1="60" x2={W-40} y1={50 + i * (H-100)/3} y2={50 + i * (H-100)/3}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        ))}

        {/* FTP threshold line */}
        <line x1="60" x2={W-40} y1={ftpY} y2={ftpY} stroke="#00c8e0" strokeWidth="1" strokeDasharray="4 4" opacity="0.4"
          style={{ animation: 'fadeUpSlow 0.6s 1.8s both' }}/>
        <text x={W-44} y={ftpY-6} textAnchor="end" fontFamily="DM Mono" fontSize="10" fill="#00c8e0"
          style={{ animation: 'fadeUpSlow 0.6s 1.8s both' }}>FTP 286W</text>

        {/* Y labels */}
        {[1000, 750, 500, 250].map((v, i) => (
          <text key={v} x="50" y={55 + i * (H-100)/3} textAnchor="end"
            fontFamily="DM Mono" fontSize="10" fill="rgba(238,242,247,0.38)">{v}W</text>
        ))}

        {/* X labels */}
        {[
          { s: 5, l: '5s' }, { s: 60, l: '1min' }, { s: 300, l: '5min' },
          { s: 1200, l: '20min' }, { s: 3600, l: '1h' },
        ].map(t => (
          <text key={t.l} x={xScale(t.s)} y={H-25} textAnchor="middle"
            fontFamily="DM Mono" fontSize="10" fill="rgba(238,242,247,0.38)">{t.l}</text>
        ))}

        <path d={area} fill="url(#powGrad)"
          style={{ animation: 'fadeUpSlow 1s 1.2s ease both' }}/>
        <path d={path} fill="none" stroke="url(#powLine)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray="2000" strokeDashoffset="2000"
          style={{ animation: 'drawLine 2s 0.4s cubic-bezier(0.4,0,0.2,1) forwards', '--len': 2000, filter: 'drop-shadow(0 0 6px rgba(0,200,224,0.5))' }}/>

        {/* Points */}
        {pts.map((p, i) => (
          <circle key={i} cx={xScale(p[0])} cy={yScale(p[1])} r="4" fill="#070b0f" stroke="#00c8e0" strokeWidth="2"
            style={{ animation: `slideUpFade 0.3s ${1.5 + i * 0.08}s both` }}/>
        ))}
      </svg>
    </div>
  );
}

window.ChartsSection = ChartsSection;
