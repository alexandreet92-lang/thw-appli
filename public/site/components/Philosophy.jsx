// "The Hybrid Way" — philosophy section
function Philosophy() {
  const pillars = [
    {
      n: '01',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>),
      title: 'Hybride par essence',
      body: "Endurance, force, mobilité — un seul plan cohérent. Pas de silos, pas de compromis. Ton corps progresse comme un système entier.",
      tag: 'MÉTHODE',
    },
    {
      n: '02',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>),
      title: 'Data-driven, humain d\'abord',
      body: "Coach IA analyse ta charge en temps réel — CTL, HRV, sommeil. Ton coach humain ajuste, écoute, décide. La techno sert l'athlète, jamais l'inverse.",
      tag: 'DATA + HUMAIN',
    },
    {
      n: '03',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>),
      title: 'Construit pour durer',
      body: "Pas de pic à tout prix. On construit ta forme sur 12, 24, 48 semaines — avec récupération, prévention, périodisation. La régularité bat l'intensité.",
      tag: 'LONG TERME',
    },
  ];

  return (
    <section id="philosophy" style={{ paddingTop: 80 }}>
      <div style={{ maxWidth: 720, marginBottom: 64 }}>
        <span className="eyebrow">The Hybrid Way</span>
        <h2 className="section-title">
          Une méthode qui<br/>
          <span style={{
            background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>respecte ton corps</span>.
        </h2>
        <p className="section-sub">
          THW — pour <em style={{ color: 'var(--text)', fontStyle: 'normal', fontWeight: 500 }}>The Hybrid Way</em>. Une philosophie née de 10 ans de coaching d'athlètes endurance, codifiée dans une app, livrée par des coachs qui courent, pédalent et soulèvent eux-mêmes.
        </p>
      </div>

      {/* Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="pillars-grid">
        {pillars.map((p, i) => (
          <div key={i} className="l-card philosophy-card" style={{
            padding: 28,
            transition: 'all 0.24s cubic-bezier(0.4,0,0.2,1)',
            animation: `fadeUpSlow 0.6s ${i * 0.1}s cubic-bezier(0.4,0,0.2,1) both`,
          }}>
            {/* Top accent stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: i === 0
                ? 'linear-gradient(90deg, #00c8e0, transparent)'
                : i === 1
                  ? 'linear-gradient(90deg, #5b6fff, transparent)'
                  : 'linear-gradient(90deg, #00c8e0, #5b6fff, transparent)'
            }}/>

            {/* Number + icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(0,200,224,0.08)',
                border: '1px solid rgba(0,200,224,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--brand)',
                boxShadow: '0 0 16px rgba(0,200,224,0.12)',
              }}>{p.icon}</div>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em',
                color: 'rgba(255,255,255,0.06)', lineHeight: 1,
              }}>{p.n}</span>
            </div>

            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-dim)', marginBottom: 12,
            }}>{p.tag}</div>

            <h3 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              margin: '0 0 14px', color: 'var(--text)',
            }}>{p.title}</h3>

            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 14,
              lineHeight: 1.6, color: 'var(--text-mid)', margin: 0,
              textWrap: 'pretty',
            }}>{p.body}</p>
          </div>
        ))}
      </div>

      {/* Sport tags strip */}
      <div style={{
        marginTop: 56,
        padding: '24px 28px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 24,
        justifyContent: 'space-between', flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Disciplines couvertes
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { l: 'Course', c: '#f97316' },
            { l: 'Vélo', c: '#00c8e0' },
            { l: 'Triathlon', c: '#5b6fff' },
            { l: 'Hyrox', c: '#a855f7' },
            { l: 'Trail', c: '#22c55e' },
            { l: 'Force', c: '#f59e0b' },
          ].map(s => (
            <span key={s.l} style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${s.c}33`,
              background: `${s.c}10`,
              color: s.c,
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
              letterSpacing: '0.02em',
            }}>{s.l}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

window.Philosophy = Philosophy;
