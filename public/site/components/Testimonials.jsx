// Athlete testimonials
function Testimonials() {
  const items = [
    {
      name: 'Léa Marchand',
      role: 'Marathonienne',
      sport: 'Course',
      sportColor: '#f97316',
      pr: '2h54',
      prLabel: 'Marathon Paris 2025',
      quote: "J'ai cassé mon mur des 3h en 14 semaines. Le plan s'adaptait littéralement à ma fatigue, mes voyages, mes rhumes. Aucun coach humain seul n'aurait pu réagir aussi vite.",
      tags: ['CTL +24', 'Sub-3h', 'Plan 14 sem'],
    },
    {
      name: 'Mathieu Reverdy',
      role: 'Cycliste / Hyrox',
      sport: 'Vélo + Hyrox',
      sportColor: '#a855f7',
      pr: '01:08',
      prLabel: 'Hyrox Paris Pro',
      quote: "Le hybrid way, c'est pas du marketing. Mon FTP a pris 18W et mes temps Hyrox sont tombés — sans qu'aucune des deux disciplines en pâtisse. Le coach voit ce que je ne vois pas.",
      tags: ['FTP 312W', 'Top 5%', 'Hybride'],
    },
    {
      name: 'Camille Roux',
      role: 'Triathlète IM 70.3',
      sport: 'Triathlon',
      sportColor: '#5b6fff',
      pr: '4h41',
      prLabel: 'IM 70.3 Nice',
      quote: "Reprendre après ma blessure faisait peur. THW a respecté chaque étape — pas un seul retour de douleur en 6 mois. Le bilan biomécanique trimestriel a tout changé.",
      tags: ['0 blessure', 'PB −12min', '6 mois'],
    },
    {
      name: 'Hugo Bertrand',
      role: 'Trail / ultra',
      sport: 'Trail',
      sportColor: '#22c55e',
      pr: '11h22',
      prLabel: 'CCC Chamonix',
      quote: "Coach IA m'a forcé à descendre en intensité une semaine avant la CCC. J'ai râlé. J'ai fini en 11h22, mon meilleur temps. La data avait raison, pas mon ego.",
      tags: ['Sub-12h', 'CCC finisher'],
    },
    {
      name: 'Sarah Vidal',
      role: 'Coureuse 10K / semi',
      sport: 'Course',
      sportColor: '#f97316',
      pr: '37\'18',
      prLabel: '10K Paris',
      quote: "Première fois qu'un programme tient compte de mon cycle, de mon sommeil, de mon vrai vécu. Plus de séances ratées par culpabilité. Que de la progression.",
      tags: ['PB 10K', 'Régularité 92%'],
    },
  ];

  const [idx, setIdx] = React.useState(0);
  const next = () => setIdx(i => (i + 1) % items.length);
  const prev = () => setIdx(i => (i - 1 + items.length) % items.length);

  React.useEffect(() => {
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, []);

  const active = items[idx];

  return (
    <section id="testimonials" style={{ paddingTop: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
        <div style={{ maxWidth: 580 }}>
          <span className="eyebrow">Témoignages athlètes</span>
          <h2 className="section-title">
            Des résultats,<br/>
            <span style={{
              background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>pas des promesses</span>.
          </h2>
        </div>

        {/* Nav arrows */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-dim)', marginRight: 12 }}>
            <span style={{ color: 'var(--brand)' }}>{String(idx + 1).padStart(2, '0')}</span>
            <span style={{ margin: '0 6px' }}>/</span>
            {String(items.length).padStart(2, '0')}
          </span>
          <button onClick={prev} aria-label="Précédent" className="btn-ghost-lg" style={{ padding: 12, borderRadius: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={next} aria-label="Suivant" className="btn-ghost-lg" style={{ padding: 12, borderRadius: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* Main testimonial card */}
      <div style={{
        position: 'relative',
        display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 32,
        alignItems: 'stretch',
      }} className="testi-grid">

        {/* Quote */}
        <div className="l-card" key={idx} style={{
          padding: '40px 44px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          animation: 'fadeUpSlow 0.5s cubic-bezier(0.4,0,0.2,1) both',
          minHeight: 360,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-gradient-h)' }}/>

          {/* Big quote glyph */}
          <div style={{
            fontFamily: "'Syne', sans-serif", fontSize: 96, fontWeight: 800,
            color: 'rgba(0,200,224,0.10)', lineHeight: 0.5, marginBottom: 8,
          }}>"</div>

          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(20px, 2.4vw, 28px)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.35,
            color: 'var(--text)',
            margin: '0 0 32px',
            textWrap: 'balance',
          }}>{active.quote}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Avatar mono */}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `linear-gradient(135deg, ${active.sportColor}55, ${active.sportColor}22)`,
                border: `1px solid ${active.sportColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
                color: active.sportColor,
                letterSpacing: '-0.02em',
              }}>{active.name.split(' ').map(s => s[0]).join('')}</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>{active.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                  {active.role} · <span style={{ color: active.sportColor }}>{active.sport}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {active.tags.map(t => (
                <span key={t} style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: '1px solid rgba(0,200,224,0.2)',
                  background: 'rgba(0,200,224,0.08)',
                  color: 'var(--brand)',
                  fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.04em',
                }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* PR card */}
        <div className="l-card" style={{
          background: `linear-gradient(180deg, ${active.sportColor}15, transparent)`,
          border: `1px solid ${active.sportColor}33`,
          padding: 32,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: 360,
        }} key={`pr-${idx}`}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${active.sportColor}, transparent)` }}/>

          <div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-dim)', marginBottom: 16,
            }}>Record personnel · 2025</div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(56px, 8vw, 88px)',
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 0.9,
              color: active.sportColor,
              animation: 'fadeUpSlow 0.5s cubic-bezier(0.4,0,0.2,1) both',
            }} key={`v-${idx}`}>{active.pr}</div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-mid)',
              marginTop: 16,
            }}>{active.prLabel}</div>
          </div>

          {/* Mini progression viz */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Progression sur 6 mois</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: active.sportColor, fontWeight: 600 }}>+18%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
              {[35, 42, 48, 52, 65, 78, 92].map((h, i) => (
                <div key={i} style={{
                  flex: 1, height: `${h}%`,
                  background: i === 6
                    ? `linear-gradient(180deg, ${active.sportColor}, ${active.sportColor}33)`
                    : `linear-gradient(180deg, ${active.sportColor}55, ${active.sportColor}11)`,
                  borderRadius: '3px 3px 0 0',
                  boxShadow: i === 6 ? `0 0 10px ${active.sportColor}66` : 'none',
                  animation: `chartBarEnter 0.5s ${i * 0.05}s cubic-bezier(0.25,1,0.5,1) both`,
                }}/>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 6 }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Aller au témoignage ${i+1}`} style={{
            width: i === idx ? 28 : 6, height: 6,
            borderRadius: 3,
            background: i === idx ? 'var(--brand)' : 'var(--border-mid)',
            border: 'none', padding: 0, cursor: 'pointer',
            transition: 'all 0.24s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: i === idx ? '0 0 12px rgba(0,200,224,0.4)' : 'none',
          }}/>
        ))}
      </div>
    </section>
  );
}

window.Testimonials = Testimonials;
