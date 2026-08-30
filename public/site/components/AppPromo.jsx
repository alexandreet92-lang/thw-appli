// App promo banner — shown between Philosophy and Offers on the landing page
function AppPromo() {
  const metrics = [
    { l: 'CTL', v: '84', c: '#00c8e0' },
    { l: 'ATL', v: '91', c: '#ef4444' },
    { l: 'TSB', v: '−7', c: '#5b6fff' },
  ];

  const features = [
    { icon: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>, l: '7 agents Coach IA' },
    { icon: <><path d="M3 12h4l3-9 4 18 3-9h4"/></>, l: 'CTL/ATL/TSB temps réel' },
    { icon: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18"/></>, l: 'Sync Strava · Garmin · Wahoo' },
    { icon: <><path d="M12 22s-8-4.5-8-11a8 8 0 0 1 16 0c0 6.5-8 11-8 11z"/><circle cx="12" cy="11" r="3"/></>, l: 'Planning adaptatif' },
  ];

  return (
    <section id="app-promo" style={{ padding: '80px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(0,200,224,0.07) 0%, rgba(91,111,255,0.07) 100%)',
        border: '1px solid rgba(0,200,224,0.22)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 0,
        alignItems: 'stretch',
      }} className="app-promo-grid">
        {/* Glow bg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 100% at 80% 50%, rgba(91,111,255,0.12), transparent 60%)',
        }}/>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #00c8e0 30%, #5b6fff 70%, transparent)' }}/>

        {/* Left content */}
        <div style={{ padding: '48px 52px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0,200,224,0.4)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 22v-4h6v4M12 6h.01"/></svg>
            </div>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'linear-gradient(90deg,#00c8e0,#5b6fff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>L'application THW Coaching</span>
          </div>

          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(30px, 3.5vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05,
            margin: '0 0 16px', textWrap: 'balance',
          }}>
            Ton coach dans ta poche.<br/>
            <span style={{ background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>7 agents IA. 24/7.</span>
          </h2>

          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.55,
            color: 'var(--text-mid)', maxWidth: 480, margin: '0 0 28px', textWrap: 'pretty',
          }}>
            Synchronise Strava, Garmin, Wahoo. Suis ta charge CTL/ATL/TSB. Pose toutes tes questions à ton Coach IA — planning, séances, récup, nutrition — en temps réel.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 12px', borderRadius: 999,
                border: '1px solid var(--border-mid)',
                background: 'rgba(255,255,255,0.035)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--text-mid)',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2">{f.icon}</svg>
                {f.l}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="app.html" className="btn-primary-lg" style={{ fontSize: 14 }}>
              Découvrir l'app
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)', display: 'flex', gap: 12 }}>
              <span>iOS · Android · Web</span>
              <span>·</span>
              <span>Gratuit avec coaching</span>
            </div>
          </div>
        </div>

        {/* Right — mini app preview */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '32px 48px 32px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 300,
        }} className="app-promo-phone">
          {/* Mini phone */}
          <div style={{
            width: 200, height: 380,
            borderRadius: 30, border: '1px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(180deg, #111620, #07090f)',
            padding: 8,
            boxShadow: '0 28px 64px -16px rgba(0,0,0,0.7), 0 0 40px rgba(0,200,224,0.12)',
            animation: 'float 6s ease-in-out infinite',
          }}>
            {/* Screen */}
            <div style={{ width: '100%', height: '100%', borderRadius: 22, background: '#070b0f', overflow: 'hidden', position: 'relative' }}>
              {/* Notch */}
              <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 64, height: 16, background: '#000', borderRadius: '0 0 9px 9px', zIndex: 5 }}/>
              {/* Status */}
              <div style={{ height: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 14px 2px', fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--text-dim)' }}>
                <span>9:41</span><span>●●●</span>
              </div>

              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Bonjour, Thomas 👋</div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 8 }}>
                  {metrics.map(m => (
                    <div key={m.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 6px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${m.c},transparent)` }}/>
                      <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>{m.l}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: '-0.04em', color: m.c, lineHeight: 1.1 }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Next session */}
                <div style={{ background: 'linear-gradient(135deg,rgba(0,200,224,0.1),rgba(91,111,255,0.06))', border: '1px solid rgba(0,200,224,0.22)', borderRadius: 8, padding: '7px 9px', marginBottom: 7, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--brand-gradient-h)' }}/>
                  <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand)', fontWeight: 600 }}>Prochaine séance</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, marginTop: 2 }}>Sweet Spot — 2×20min</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--text-dim)', marginTop: 2 }}>Aujourd'hui · 18h00 · 247W</div>
                </div>

                {/* Chart bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginBottom: 8 }}>
                  {[55, 70, 42, 78, 85, 44, 90, 75].map((v, i) => (
                    <div key={i} style={{ flex: 1, height: `${v}%`, background: i === 7 ? '#00c8e0' : 'rgba(91,111,255,0.4)', borderRadius: '2px 2px 0 0' }}/>
                  ))}
                </div>

                {/* Coach IA chip */}
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '7px 8px', borderRadius: 8, background: 'rgba(91,111,255,0.1)', border: '1px solid rgba(91,111,255,0.18)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'var(--text)', lineHeight: 1.3 }}>Charge +8% — protège ta longue.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div style={{
            position: 'absolute', top: 40, left: 0,
            padding: '7px 10px', borderRadius: 10,
            background: 'rgba(7,11,15,0.88)', border: '1px solid rgba(34,197,94,0.3)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            animation: 'float 5s ease-in-out 0.5s infinite',
          }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)', marginBottom: 2 }}>Strava sync</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}/>
              Connecté · 47 act.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.AppPromo = AppPromo;
