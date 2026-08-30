// Key features grid + How it works + Final CTA
function Features() {
  const features = [
    {
      icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>,
      title: 'Planning personnalisé',
      body: "Plan hebdomadaire généré selon ta charge, tes objectifs et ton calendrier. Réajusté chaque nuit.",
      tag: '7 agents IA',
      c: '#5b6fff',
    },
    {
      icon: <path d="M3 12h4l3-9 4 18 3-9h4"/>,
      title: 'Analyse de charge CTL/ATL/TSB',
      body: "Suivi PMC complet avec courbes temps réel, prédictions de forme, alertes surmenage.",
      tag: 'Temps réel',
      c: '#00c8e0',
    },
    {
      icon: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></>,
      title: 'Coach IA — 24/7',
      body: "Streaming token par token. 7 agents : Planning, Séances, Récup, Nutrition, Performance, Stratégie, Adaptation.",
      tag: 'Claude · streaming',
      c: '#5b6fff',
    },
    {
      icon: <><path d="M12 22s-8-4.5-8-11a8 8 0 0 1 16 0c0 6.5-8 11-8 11z"/><circle cx="12" cy="11" r="3"/></>,
      title: 'Sync Strava · Garmin · Wahoo',
      body: "OAuth natif. Tes activités, FC, puissance, GPS — importés automatiquement.",
      tag: 'Auto-sync',
      c: '#f97316',
    },
    {
      icon: <><path d="M20 7L9 18l-5-5"/><path d="M4 19h16"/></>,
      title: 'Séances guidées',
      body: "Démarre la séance, suis tes intervalles, valide. Calcul automatique du TSS.",
      tag: 'Live',
      c: '#22c55e',
    },
    {
      icon: <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>,
      title: 'Readiness · HRV · Sommeil',
      body: "Score quotidien construit sur HRV, sommeil, FC repos. Reco d'intensité du jour.",
      tag: 'Daily',
      c: '#a855f7',
    },
    {
      icon: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
      title: 'Bilan biomécanique',
      body: "Modèle 3D du corps. Suivi blessures, charge par groupe musculaire, prévention.",
      tag: '3D',
      c: '#ef4444',
    },
    {
      icon: <><path d="M6 2l1.5 7L12 5l4.5 4L18 2"/><path d="M6 22h12"/></>,
      title: 'Nutrition périodisée',
      body: "Macros calculés selon ta journée. Repas pré-séance, récup, hydratation.",
      tag: 'Sport-spécifique',
      c: '#22c55e',
    },
  ];

  return (
    <section id="features" style={{ paddingTop: 120 }}>
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <span className="eyebrow">Fonctionnalités</span>
        <h2 className="section-title">
          Tout ce qu'il faut.<br/>
          <span style={{ background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rien de superflu</span>.
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="l-card philosophy-card" style={{
            padding: 24, transition: 'all 0.24s cubic-bezier(0.4,0,0.2,1)',
            animation: `fadeUpSlow 0.5s ${i * 0.06}s cubic-bezier(0.4,0,0.2,1) both`,
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${f.c}, transparent)` }}/>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${f.c}12`, border: `1px solid ${f.c}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: f.c, marginBottom: 16,
              boxShadow: `0 0 12px ${f.c}22`,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{f.icon}</svg>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: f.c, marginBottom: 8 }}>{f.tag}</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 8px', color: 'var(--text)' }}>{f.title}</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, lineHeight: 1.55, color: 'var(--text-mid)', margin: 0, textWrap: 'pretty' }}>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Connecte tes appareils',
      body: 'Strava, Garmin, Wahoo, Polar, COROS, Apple Health. OAuth en un clic. Tes 90 derniers jours sont importés automatiquement.',
      brands: ['Strava', 'Garmin', 'Wahoo', 'Polar', 'COROS'],
    },
    {
      n: '02',
      title: 'Reçois ton plan sur-mesure',
      body: "Coach IA analyse ton profil, ta forme, tes objectifs. Plan hebdomadaire personnalisé livré en moins de 60s.",
      brands: ['Plan généré', 'Réajusté chaque nuit'],
    },
    {
      n: '03',
      title: 'Suis ta progression',
      body: "Séances guidées dans l'app. CTL/ATL/TSB en temps réel. Coach IA dispo 24/7 pour t'expliquer, ajuster, motiver.",
      brands: ['Live tracking', '7 agents IA'],
    },
  ];

  return (
    <section id="how" style={{ paddingTop: 120 }}>
      <div style={{ maxWidth: 720, marginBottom: 56 }}>
        <span className="eyebrow">Comment ça marche</span>
        <h2 className="section-title">
          De zéro à<br/>
          <span style={{ background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>première séance</span>{' '}en 3 étapes.
        </h2>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute', top: 60, left: '12%', right: '12%', height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(0,200,224,0.4), rgba(91,111,255,0.4), transparent)',
          zIndex: 0,
        }} className="how-line"/>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, position: 'relative', zIndex: 1 }} className="how-grid">
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', animation: `fadeUpSlow 0.6s ${i * 0.15}s cubic-bezier(0.4,0,0.2,1) both` }}>
              {/* Step circle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, rgba(0,200,224,0.18), rgba(7,11,15,0.95))',
                  border: '1px solid rgba(0,200,224,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 32px rgba(0,200,224,0.25), inset 0 0 16px rgba(0,200,224,0.1)',
                  fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
                  background: '#070b0f',
                  color: 'var(--brand)',
                  position: 'relative',
                }}>
                  {s.n}
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: '50%',
                    border: '1px solid rgba(0,200,224,0.18)',
                    animation: 'pulse-glow 3s infinite',
                  }}/>
                </div>
              </div>

              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--text)' }}>{s.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)', margin: '0 auto 16px', maxWidth: 320, textWrap: 'pretty' }}>{s.body}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                {s.brands.map(b => (
                  <span key={b} style={{
                    padding: '4px 10px', borderRadius: 999,
                    border: '1px solid var(--border-mid)', background: 'rgba(255,255,255,0.03)',
                    fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--text-mid)',
                  }}>{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  return (
    <section id="platforms" style={{ paddingTop: 120 }}>
      <div className="l-card" style={{
        position: 'relative', overflow: 'hidden', padding: 0,
        background: 'linear-gradient(135deg, rgba(0,200,224,0.08), rgba(91,111,255,0.06))',
        border: '1px solid rgba(0,200,224,0.22)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-gradient-h)' }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(0,200,224,0.15), transparent 60%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center', padding: '56px 56px', position: 'relative', zIndex: 2 }} className="platforms-grid">
          <div>
            <span className="eyebrow">Disponible partout</span>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              iOS · Android · Web.
            </h2>
            <p className="section-sub" style={{ marginBottom: 32 }}>
              Synchronisation cross-device. Commence sur ton iPhone le matin, valide ta séance sur Garmin, retrouve l'analyse sur ton Mac le soir.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '14px 22px', borderRadius: 12,
                background: '#000', border: '1px solid rgba(255,255,255,0.18)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Télécharger</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>App Store</div>
                </div>
              </a>
              <a href="#" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '14px 22px', borderRadius: 12,
                background: '#000', border: '1px solid rgba(255,255,255,0.18)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 20.5V3.5a.5.5 0 0 1 .76-.43l14.13 8.5a.5.5 0 0 1 0 .86L3.76 20.93A.5.5 0 0 1 3 20.5z" fill="url(#play2)"/>
                  <defs><linearGradient id="play2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00c8e0"/><stop offset="1" stopColor="#5b6fff"/></linearGradient></defs>
                </svg>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Disponible</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>Google Play</div>
                </div>
              </a>
              <a href="https://app.thwcoaching.fr" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '14px 22px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-mid)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ouvrir</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>Web app</div>
                </div>
              </a>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
              <span>★ 4.8 App Store</span>
              <span>·</span>
              <span>★ 4.7 Play Store</span>
              <span>·</span>
              <span>2.1k athlètes actifs</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div style={{ transform: 'translateY(20px) rotate(-4deg) scale(0.85)' }}>
              <PhoneFrame>
                <div style={{ padding: 14, height: 'calc(100% - 36px)' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Performance</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70, marginBottom: 12 }}>
                    {[40, 55, 48, 70, 65, 82, 75, 90].map((v, i) => (
                      <div key={i} style={{ flex: 1, height: `${v}%`, background: i === 7 ? '#00c8e0' : 'rgba(91,111,255,0.4)', borderRadius: '3px 3px 0 0' }}/>
                    ))}
                  </div>
                  {['CTL 84', 'TSB −7', 'FTP 286W'].map(l => (
                    <div key={l} style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 5, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text)' }}>{l}</div>
                  ))}
                </div>
              </PhoneFrame>
            </div>
            <div style={{ transform: 'rotate(4deg) scale(0.85)' }}>
              <PhoneFrame>
                <div style={{ padding: 14, height: 'calc(100% - 36px)' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Coach IA</div>
                  <div style={{ padding: 10, background: 'rgba(91,111,255,0.12)', borderRadius: 10, fontSize: 11, color: 'var(--text)', marginBottom: 8 }}>Comment ajuster ?</div>
                  <div style={{ padding: 10, background: 'linear-gradient(135deg, rgba(0,200,224,0.1), rgba(91,111,255,0.06))', border: '1px solid rgba(0,200,224,0.22)', borderRadius: 10, fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
                    Ta CTL est à 84. On déplace le Sweet Spot vers samedi<span className="cursor-blink"/>
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalAppCTA() {
  return (
    <section style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(91,111,255,0.10), rgba(0,200,224,0.08))',
        border: '1px solid rgba(91,111,255,0.25)',
        borderRadius: 24, padding: '64px 56px', textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(91,111,255,0.18), transparent 60%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, var(--brand-alt), var(--brand), transparent)' }}/>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Aller plus loin</span>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 20px',
            textWrap: 'balance',
          }}>
            L'app, c'est le début.<br/>
            <span style={{ background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Le coaching humain, c'est le saut</span>.
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: 'var(--text-mid)',
            lineHeight: 1.55, margin: '0 auto 36px', maxWidth: 540, textWrap: 'pretty',
          }}>
            Ajoute un coach humain dédié 7j/7 — qui voit ce que la donnée ne dit pas, qui te connaît, qui décide.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="index.html#offers" className="btn-primary-lg">
              Découvrir le coaching humain
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
            <a href="#" className="btn-ghost-lg">Continuer avec l'app seule</a>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Features = Features;
window.HowItWorks = HowItWorks;
window.Platforms = Platforms;
window.FinalAppCTA = FinalAppCTA;
