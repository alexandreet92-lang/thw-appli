// Coaching offers / pricing
function Offers() {
  const [billing, setBilling] = React.useState('monthly');

  const offers = [
    {
      id: 'essential',
      name: 'Essential',
      tag: 'Pour structurer',
      monthly: 89,
      yearly: 79,
      desc: "Plan d'entraînement personnalisé, ajusté chaque semaine. Idéal pour reprendre une vraie structure.",
      features: [
        { t: 'Plan hebdomadaire personnalisé', i: true },
        { t: 'Accès complet à l\'app THW', i: true },
        { t: 'Coach IA — analyse de charge en temps réel', i: true },
        { t: 'Ajustements automatiques selon ta forme', i: true },
        { t: '1 visio coach / mois', i: true },
        { t: 'Plan nutrition de base', i: true },
        { t: 'Coach humain dédié 7j/7', i: false },
        { t: 'Bilans biomécaniques', i: false },
      ],
      accent: 'rgba(255,255,255,0.06)',
      stripe: 'linear-gradient(90deg, #5b6fff, transparent)',
      cta: 'ghost',
    },
    {
      id: 'performance',
      name: 'Performance',
      tag: 'Le plus choisi',
      monthly: 189,
      yearly: 169,
      desc: "Coaching humain hebdomadaire + l'app + Coach IA. Pour viser un objectif précis : marathon, Hyrox, IM 70.3.",
      features: [
        { t: 'Tout Essential, plus :', i: true, header: true },
        { t: 'Coach humain dédié 7j/7', i: true },
        { t: 'Visio hebdo + ajustements live', i: true },
        { t: 'Plan nutrition complet & périodisé', i: true },
        { t: 'Bilan biomécanique trimestriel', i: true },
        { t: 'Course / compétition prep dédiée', i: true },
        { t: 'Accès groupe athlètes privé', i: true },
        { t: 'Stage en présentiel', i: false },
      ],
      featured: true,
      accent: 'rgba(0,200,224,0.06)',
      stripe: 'var(--brand-gradient-h)',
      cta: 'primary',
    },
    {
      id: 'elite',
      name: 'Elite',
      tag: 'Sur-mesure intégral',
      monthly: 389,
      yearly: 349,
      desc: "Accompagnement 360° avec ton coach principal et son équipe. Pour les athlètes qui jouent un classement.",
      features: [
        { t: 'Tout Performance, plus :', i: true, header: true },
        { t: 'Coach principal + assistants', i: true },
        { t: 'Tests VO2max & lactate annuels', i: true },
        { t: '2 stages en présentiel / an', i: true },
        { t: 'Préparation mentale (sophro)', i: true },
        { t: 'Diététicien sport dédié', i: true },
        { t: 'Suivi kiné partenaire', i: true },
        { t: 'Réservé · 8 places / saison', i: true },
      ],
      accent: 'rgba(91,111,255,0.06)',
      stripe: 'linear-gradient(90deg, #5b6fff, #00c8e0, transparent)',
      cta: 'ghost',
    },
  ];

  return (
    <section id="offers" style={{ paddingTop: 120 }}>
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <span className="eyebrow">Programmes de coaching</span>
        <h2 className="section-title">
          Choisis le niveau<br/>d'accompagnement<br/>
          <span style={{
            background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>qui te ressemble</span>.
        </h2>
        <p className="section-sub">
          Sans engagement. Tu peux changer de formule, mettre en pause, résilier — à tout moment.
        </p>
      </div>

      {/* Billing toggle */}
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex',
          padding: 4,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          gap: 2,
        }}>
          {[
            { id: 'monthly', l: 'Mensuel' },
            { id: 'yearly', l: 'Annuel', save: '−12%' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setBilling(opt.id)} style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 'none',
              background: billing === opt.id ? 'var(--brand-gradient)' : 'transparent',
              color: billing === opt.id ? '#fff' : 'var(--text-mid)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.18s',
              boxShadow: billing === opt.id ? '0 2px 12px rgba(0,200,224,0.28)' : 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {opt.l}
              {opt.save && <span style={{
                fontSize: 10, fontWeight: 600,
                padding: '2px 6px', borderRadius: 999,
                background: billing === opt.id ? 'rgba(255,255,255,0.18)' : 'rgba(34,197,94,0.12)',
                color: billing === opt.id ? '#fff' : '#22c55e',
                letterSpacing: '0.04em',
              }}>{opt.save}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="offers-grid">
        {offers.map((o, i) => (
          <div key={o.id} style={{
            position: 'relative',
            background: o.featured
              ? 'linear-gradient(180deg, rgba(0,200,224,0.06) 0%, rgba(91,111,255,0.04) 100%)'
              : 'var(--bg-card)',
            border: o.featured ? '1px solid rgba(0,200,224,0.32)' : '1px solid var(--border)',
            borderRadius: 20,
            padding: 32,
            overflow: 'hidden',
            boxShadow: o.featured
              ? '0 12px 40px rgba(0,200,224,0.10), 0 0 0 1px rgba(0,200,224,0.10)'
              : 'var(--shadow-card)',
            transform: o.featured ? 'translateY(-8px)' : 'none',
            animation: `fadeUpSlow 0.6s ${i * 0.1}s cubic-bezier(0.4,0,0.2,1) both`,
          }}>
            {/* Top stripe */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: o.featured ? 4 : 3,
              background: o.stripe,
            }}/>

            {/* Featured ribbon */}
            {o.featured && (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                padding: '4px 10px',
                background: 'var(--brand-gradient)',
                borderRadius: 999,
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
                color: '#fff',
                boxShadow: '0 0 16px rgba(0,200,224,0.4)',
              }}>★ Recommandé</div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: o.featured ? 'var(--brand)' : 'var(--text-dim)',
                marginBottom: 12,
              }}>{o.tag}</div>
              <h3 style={{
                fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700,
                letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text)',
              }}>{o.name}</h3>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                lineHeight: 1.55, color: 'var(--text-mid)', margin: 0,
                minHeight: 64,
                textWrap: 'pretty',
              }}>{o.desc}</p>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{
                fontFamily: "'Syne', sans-serif", fontSize: 56, fontWeight: 800,
                letterSpacing: '-0.05em', lineHeight: 1,
                color: o.featured ? 'var(--brand)' : 'var(--text)',
              }}>{billing === 'monthly' ? o.monthly : o.yearly}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: 'var(--text-dim)', fontWeight: 500 }}>€</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>/ mois</span>
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)',
              marginBottom: 24,
              minHeight: 16,
            }}>
              {billing === 'yearly' ? `Facturé ${o.yearly * 12}€/an · ${(o.monthly - o.yearly) * 12}€ économisés` : 'Sans engagement · résiliable à tout moment'}
            </div>

            {/* CTA */}
            <a href="#login" className={o.cta === 'primary' ? 'btn-primary-lg' : 'btn-ghost-lg'} style={{
              width: '100%',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              {o.featured ? 'Démarrer Performance' : `Choisir ${o.name}`}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>

            {/* Features */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              {o.features.map((f, fi) => f.header ? (
                <div key={fi} style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-mid)', marginBottom: 12, marginTop: fi === 0 ? 0 : 12,
                }}>{f.t}</div>
              ) : (
                <div key={fi} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: 10,
                  opacity: f.i ? 1 : 0.36,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: f.i
                      ? (o.featured ? 'rgba(0,200,224,0.14)' : 'rgba(255,255,255,0.06)')
                      : 'transparent',
                    border: f.i ? 'none' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {f.i ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={o.featured ? '#00c8e0' : 'currentColor'} strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18"/></svg>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    color: f.i ? 'var(--text)' : 'var(--text-dim)',
                    lineHeight: 1.45,
                    textDecoration: f.i ? 'none' : 'line-through',
                    textDecorationColor: 'var(--text-dim)',
                  }}>{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reassurance row */}
      <div style={{
        marginTop: 48,
        display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap',
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-dim)',
      }}>
        {[
          { i: '✓', t: '14 jours d\'essai gratuit' },
          { i: '✓', t: 'Sans engagement' },
          { i: '✓', t: 'Résiliation 1 clic' },
          { i: '✓', t: 'Paiement sécurisé Stripe' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{r.i}</span>
            {r.t}
          </div>
        ))}
      </div>
    </section>
  );
}

window.Offers = Offers;
