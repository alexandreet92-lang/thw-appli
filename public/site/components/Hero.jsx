// Hero section
function Hero() {
  return (
    <section id="hero" style={{ paddingTop: 160, paddingBottom: 80, minHeight: '92vh' }}>
      <div className="grid-overlay"/>
      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">

        {/* Left — copy */}
        <div style={{ animation: 'fadeUpSlow 0.7s cubic-bezier(0.4,0,0.2,1) both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            border: '1px solid var(--border-mid)',
            background: 'rgba(0,200,224,0.06)',
            borderRadius: 999,
            marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--brand)',
              boxShadow: '0 0 8px var(--brand)',
              animation: 'pulse-glow 2s infinite',
            }}/>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mid)',
            }}>Saison 2026 · 12 places restantes</span>
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(48px, 7vw, 84px)',
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 0.96,
            margin: '0 0 24px',
            color: 'var(--text)',
            textWrap: 'balance',
          }}>
            Le coaching qui<br/>transforme ton<br/>
            <span style={{
              background: 'linear-gradient(135deg,#00c8e0 20%,#5b6fff 80%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>potentiel</span>
            <span style={{ color: 'var(--text-dim)' }}> en </span>
            <span style={{
              background: 'linear-gradient(135deg,#5b6fff,#00c8e0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>performance</span>.
          </h1>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--text-mid)',
            maxWidth: 540,
            margin: '0 0 40px',
            textWrap: 'pretty',
          }}>
            Programmes sur-mesure pour athlètes endurance — course, vélo, triathlon, Hyrox.
            Construis ta forme avec un coach humain et l'analyse data temps réel de Coach IA.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#offers" className="btn-primary-lg">
              Choisir mon programme
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
            <a href="#philosophy" className="btn-ghost-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>
              Découvrir la méthode
            </a>
          </div>

          {/* Stats strip */}
          <div style={{
            marginTop: 56,
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            paddingTop: 28,
            borderTop: '1px solid var(--border)',
            maxWidth: 540,
          }}>
            {[
              { v: '247', u: 'athlètes', s: 'coachés en 2025' },
              { v: '92%', u: 'objectifs', s: 'tenus ou dépassés' },
              { v: '4.9', u: '/5', s: 'note moyenne' },
            ].map((st, i) => (
              <div key={i} style={{
                paddingLeft: i === 0 ? 0 : 20,
                borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
                  color: 'var(--text)', lineHeight: 1,
                }}>
                  {st.v}<span style={{ color: 'var(--brand)', fontSize: 16, marginLeft: 3, fontWeight: 600 }}>{st.u === '/5' ? '/5' : ''}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, letterSpacing: '0.04em' }}>
                  {st.u !== '/5' && <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--brand)' }}>{st.u}</span>}
                  {st.u !== '/5' && ' · '}{st.s}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — animated data dashboard */}
        <HeroAnimation/>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div style={{
      position: 'relative',
      animation: 'fadeUpSlow 0.9s 0.15s cubic-bezier(0.4,0,0.2,1) both',
    }}>
      {/* Glow halo */}
      <div style={{
        position: 'absolute', inset: '-10% -5%', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,200,224,0.18), transparent 70%)',
        filter: 'blur(40px)',
      }}/>

      {/* Main app card */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
        border: '1px solid var(--border-mid)',
        borderRadius: 20,
        padding: 18,
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), 0 0 40px rgba(0,200,224,0.08)',
        backdropFilter: 'blur(20px)',
        animation: 'float 6s ease-in-out infinite',
      }}>
        {/* Top stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--brand), var(--brand-alt), transparent)' }}/>

        {/* Header inside card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Bonjour, Thomas <span style={{filter:'grayscale(0)'}}>👋</span></div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Lundi 24 mars · Semaine 12</div>
          </div>
          <div style={{
            display: 'inline-flex', gap: 5, padding: '4px 10px',
            border: '1px solid rgba(34,197,94,0.25)',
            background: 'rgba(34,197,94,0.08)',
            color: '#22c55e',
            borderRadius: 999,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
            alignItems: 'center',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }}/>
            Forme +3
          </div>
        </div>

        {/* Mini metric row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { l: 'CTL', v: '84', c: '#00c8e0', s: '↑ +3' },
            { l: 'ATL', v: '91', c: '#ef4444', s: '↑ Charge' },
            { l: 'TSB', v: '−7', c: '#5b6fff', s: 'En charge' },
          ].map((m, i) => (
            <div key={i} style={{
              position: 'relative', overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 12px',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${m.c}, transparent)` }}/>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{m.l}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: m.c, marginTop: 4, lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)', marginTop: 5 }}>{m.s}</div>
            </div>
          ))}
        </div>

        {/* Next session card */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(0,200,224,0.08), rgba(91,111,255,0.05))',
          border: '1px solid rgba(0,200,224,0.22)',
          borderRadius: 14, padding: 14,
          marginBottom: 12,
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--brand-gradient-h)' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)' }}>Prochaine séance</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, marginTop: 5, letterSpacing: '-0.01em' }}>Sweet Spot — 2×20min</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>Aujourd'hui · 18h00 · 1h45 · 247W cible</div>
            </div>
            <div style={{
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(0,200,224,0.12)', border: '1px solid rgba(0,200,224,0.25)',
              fontSize: 9, fontWeight: 600, color: 'var(--brand)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: "'DM Sans', sans-serif",
            }}>✓ Adaptée</div>
          </div>
        </div>

        {/* Mini chart */}
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Charge · 8 sem.</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--brand)' }}>487 TSS</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
            {[55, 70, 42, 78, 85, 44, 90, 75].map((v, i) => (
              <div key={i} style={{
                flex: 1,
                height: `${v}%`,
                background: i === 7 ? 'linear-gradient(180deg, #00c8e0, rgba(0,200,224,0.3))' : `linear-gradient(180deg, rgba(91,111,255,0.5), rgba(91,111,255,0.1))`,
                borderRadius: '4px 4px 0 0',
                border: i === 7 ? '1px solid rgba(0,200,224,0.5)' : 'none',
                boxShadow: i === 7 ? '0 0 12px rgba(0,200,224,0.4)' : 'none',
                transformOrigin: 'bottom',
                animation: `chartBarEnter 0.7s ${0.3 + i * 0.06}s cubic-bezier(0.25,1,0.5,1) both`,
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Coach IA bubble */}
      <div style={{
        position: 'absolute',
        bottom: -16, left: -28,
        zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'rgba(7,11,15,0.85)',
        border: '1px solid rgba(91,111,255,0.3)',
        borderRadius: 14,
        backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(91,111,255,0.15)',
        animation: 'float 5s ease-in-out 0.5s infinite',
        maxWidth: 240,
      }}>
        <div style={{
          width: 30, height: 30, flexShrink: 0,
          background: 'var(--brand-gradient)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0,200,224,0.4)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>COACH IA</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text)', marginTop: 2, lineHeight: 1.3 }}>Ton corps est prêt. Pousse l'intensité.</div>
        </div>
      </div>

      {/* Floating readiness ring */}
      <div style={{
        position: 'absolute',
        top: -20, right: -16,
        zIndex: 3,
        background: 'rgba(7,11,15,0.85)',
        border: '1px solid var(--border-mid)',
        borderRadius: 14,
        padding: 12,
        backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'float 7s ease-in-out 0.2s infinite',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
          <circle cx="24" cy="24" r="18" fill="none" stroke="url(#hg1)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2*Math.PI*18} strokeDashoffset={2*Math.PI*18*0.25}/>
          <defs>
            <linearGradient id="hg1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00c8e0"/>
              <stop offset="100%" stopColor="#5b6fff"/>
            </linearGradient>
          </defs>
        </svg>
        <div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Readiness</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--brand)', lineHeight: 1, marginTop: 4 }}>75<span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 2 }}>/100</span></div>
        </div>
      </div>
    </div>
  );
}

window.Hero = Hero;
