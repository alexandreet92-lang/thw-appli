// Hero with animated app mockup
function AppHero() {
  return (
    <section className="app-hero">
      <div className="grid-overlay"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
        <div style={{ animation: 'fadeUpSlow 0.7s cubic-bezier(0.4,0,0.2,1) both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            border: '1px solid var(--border-mid)',
            background: 'rgba(0,200,224,0.06)',
            borderRadius: 999, marginBottom: 28,
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
            }}>L'app · Disponible iOS & Android</span>
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(44px, 6.5vw, 76px)',
            fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.96,
            margin: '0 0 24px', textWrap: 'balance',
          }}>
            Ton coach,<br/>
            <span style={{
              background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>dans ta poche</span>.<br/>
            <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>24/7.</span>
          </h1>

          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.55,
            color: 'var(--text-mid)', maxWidth: 540, margin: '0 0 36px',
            textWrap: 'pretty',
          }}>
            7 agents Coach IA. Synchronisation Strava, Garmin, Wahoo. Analyse de charge CTL/ATL/TSB temps réel. Planning qui s'adapte à ta forme du jour.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <a href="#" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '12px 20px', borderRadius: 12,
              background: '#000', border: '1px solid rgba(255,255,255,0.18)',
              transition: 'all 0.18s',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Télécharger sur</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 1 }}>App Store</div>
              </div>
            </a>
            <a href="#" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '12px 20px', borderRadius: 12,
              background: '#000', border: '1px solid rgba(255,255,255,0.18)',
              transition: 'all 0.18s',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 20.5V3.5a.5.5 0 0 1 .76-.43l14.13 8.5a.5.5 0 0 1 0 .86L3.76 20.93A.5.5 0 0 1 3 20.5z" fill="url(#play1)"/>
                <defs><linearGradient id="play1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00c8e0"/><stop offset="1" stopColor="#5b6fff"/></linearGradient></defs>
              </svg>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Télécharger sur</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 1 }}>Google Play</div>
              </div>
            </a>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#f59e0b' }}>★★★★★</span> 4.8 · 2k avis
            </span>
            <span>·</span>
            <span>Gratuit avec coaching</span>
          </div>
        </div>

        <HeroPhone/>
      </div>
    </section>
  );
}

function HeroPhone() {
  return (
    <div style={{
      position: 'relative', display: 'flex', justifyContent: 'center',
      animation: 'fadeUpSlow 0.9s 0.15s cubic-bezier(0.4,0,0.2,1) both',
    }}>
      <div style={{
        position: 'absolute', inset: '-20% -10%', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(0,200,224,0.18), transparent 65%)',
        filter: 'blur(40px)',
      }}/>

      <PhoneFrame style={{ animation: 'float 6s ease-in-out infinite', position: 'relative', zIndex: 2 }}>
        <div style={{ padding: '14px 20px 20px', height: 'calc(100% - 36px)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Bonjour, Thomas <span>👋</span></div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Lundi 24 mars · S.12</div>
            </div>
            <ThwLogo size={32} radius={8} alt=""/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {[
              { l: 'CTL', v: '84', c: '#00c8e0' },
              { l: 'ATL', v: '91', c: '#ef4444' },
              { l: 'TSB', v: '−7', c: '#5b6fff' },
            ].map((m, i) => (
              <div key={i} style={{
                position: 'relative', overflow: 'hidden',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 10px',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${m.c}, transparent)` }}/>
                <div style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{m.l}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: m.c, marginTop: 2, lineHeight: 1 }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Next session */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(0,200,224,0.10), rgba(91,111,255,0.06))',
            border: '1px solid rgba(0,200,224,0.25)',
            borderRadius: 12, padding: 12, marginBottom: 12,
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--brand-gradient-h)' }}/>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)' }}>Prochaine séance</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, marginTop: 4, letterSpacing: '-0.01em' }}>Sweet Spot — 2×20min</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)', marginTop: 3 }}>Aujourd'hui · 18h00 · 247W</div>
            <button style={{
              marginTop: 10, width: '100%',
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--brand-gradient)', border: 'none', color: '#fff',
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              boxShadow: '0 2px 12px rgba(0,200,224,0.3)',
            }}>Démarrer la séance →</button>
          </div>

          {/* Mini chart */}
          <div style={{
            background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 10, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Charge S12</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--brand)' }}>487 TSS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 38 }}>
              {[55, 70, 42, 78, 85, 44, 90, 75].map((v, i) => (
                <div key={i} style={{
                  flex: 1, height: `${v}%`,
                  background: i === 7 ? 'linear-gradient(180deg, #00c8e0, rgba(0,200,224,0.3))' : 'linear-gradient(180deg, rgba(91,111,255,0.5), rgba(91,111,255,0.1))',
                  borderRadius: '3px 3px 0 0',
                  boxShadow: i === 7 ? '0 0 8px rgba(0,200,224,0.4)' : 'none',
                  transformOrigin: 'bottom',
                  animation: `chartBarEnter 0.7s ${0.3 + i * 0.06}s cubic-bezier(0.25,1,0.5,1) both`,
                }}/>
              ))}
            </div>
          </div>

          {/* Coach IA chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,200,224,0.06), rgba(91,111,255,0.06))',
            border: '1px solid rgba(91,111,255,0.18)',
          }}>
            <div style={{
              width: 28, height: 28, flexShrink: 0,
              background: 'var(--brand-gradient)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0,200,224,0.4)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 9, fontWeight: 700, background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>COACH IA</div>
              <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 1, lineHeight: 1.3 }}>Charge +8% — protège ta longue.</div>
            </div>
          </div>
        </div>
      </PhoneFrame>

      {/* Floating chips */}
      <div style={{
        position: 'absolute', top: 60, left: 0, zIndex: 3,
        padding: '8px 12px', borderRadius: 12,
        background: 'rgba(7,11,15,0.85)', border: '1px solid rgba(34,197,94,0.3)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'float 5s ease-in-out 0.5s infinite',
      }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Strava sync</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#22c55e', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}/>
          Connecté · 47 act.
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 80, right: 0, zIndex: 3,
        padding: 10, borderRadius: 12,
        background: 'rgba(7,11,15,0.85)', border: '1px solid var(--border-mid)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'float 7s ease-in-out 0.2s infinite',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="44" height="44" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
          <circle cx="24" cy="24" r="18" fill="none" stroke="url(#hgr1)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2*Math.PI*18} strokeDashoffset={2*Math.PI*18*0.25}/>
          <defs>
            <linearGradient id="hgr1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00c8e0"/>
              <stop offset="100%" stopColor="#5b6fff"/>
            </linearGradient>
          </defs>
        </svg>
        <div>
          <div style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Readiness</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--brand)', marginTop: 2 }}>75</div>
        </div>
      </div>
    </div>
  );
}

window.AppHero = AppHero;
