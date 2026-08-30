// FAQ + final CTA + Footer
function FAQ() {
  const [open, setOpen] = React.useState(0);
  const items = [
    { q: "Comment fonctionne l'essai gratuit de 14 jours ?", a: "Tu accèdes à l'app, à ton plan, et à ton coach pendant 14 jours. Aucun paiement n'est prélevé tant que tu n'as pas confirmé. Tu peux annuler en un clic depuis ton profil." },
    { q: "Quel niveau faut-il pour rejoindre THW ?", a: "Aucun minimum. Nos athlètes vont du coureur 5K débutant au triathlète sub-9h. Le plan s'adapte à TON niveau, mesuré à l'arrivée via un bilan de forme et tes derniers entraînements." },
    { q: "Le coach est-il vraiment humain ?", a: "Oui, sur les formules Performance et Elite. Tu as un coach attitré, joignable 7j/7 par chat dans l'app. Coach IA fait l'analyse continue ; le coach humain prend les décisions stratégiques et te connaît." },
    { q: "Puis-je importer mes données Garmin / Strava / Wahoo ?", a: "Oui. Connexion native avec Garmin, Strava, Wahoo, Polar, COROS, Apple Health. Tes séances apparaissent automatiquement, l'analyse de charge se fait en temps réel." },
    { q: "Que se passe-t-il si je me blesse ou tombe malade ?", a: "Mets ton plan en pause depuis l'app. Coach IA détecte les signaux faibles (HRV, FC repos, sommeil) et alerte ton coach. Reprise progressive automatiquement encadrée. Aucun frais." },
  ];

  return (
    <section id="faq" style={{ paddingTop: 120 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64, alignItems: 'flex-start' }} className="faq-grid">
        <div style={{ position: 'sticky', top: 120 }}>
          <span className="eyebrow">Questions</span>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px, 4vw, 48px)' }}>Avant de te lancer.</h2>
          <p className="section-sub" style={{ marginBottom: 24 }}>
            Une autre question ? Écris-nous sur <a href="mailto:hello@thwcoaching.fr" style={{ color: 'var(--brand)', borderBottom: '1px solid var(--brand)' }}>hello@thwcoaching.fr</a>. On répond en moins de 24h.
          </p>
        </div>

        <div>
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{
                borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                borderBottom: '1px solid var(--border)',
                padding: '20px 0',
                cursor: 'pointer',
              }} onClick={() => setOpen(isOpen ? -1 : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <h3 style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 600,
                    letterSpacing: '-0.01em', margin: 0,
                    color: isOpen ? 'var(--text)' : 'var(--text-mid)',
                    transition: 'color 0.18s',
                  }}>{it.q}</h3>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isOpen ? 'var(--brand-gradient)' : 'rgba(255,255,255,0.04)',
                    border: isOpen ? 'none' : '1px solid var(--border-mid)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.24s',
                    flexShrink: 0,
                    boxShadow: isOpen ? '0 0 12px rgba(0,200,224,0.3)' : 'none',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOpen ? 'white' : 'var(--text-mid)'} strokeWidth="2" style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.24s' }}>
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </div>
                </div>
                <div style={{
                  maxHeight: isOpen ? 200 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.24s',
                  opacity: isOpen ? 1 : 0,
                }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    lineHeight: 1.6, color: 'var(--text-mid)',
                    margin: '14px 0 6px', textWrap: 'pretty', maxWidth: 600,
                  }}>{it.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(0,200,224,0.10), rgba(91,111,255,0.08))',
        border: '1px solid rgba(0,200,224,0.22)',
        borderRadius: 24,
        padding: '64px 56px',
        textAlign: 'center',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(0,200,224,0.18), transparent 60%)',
          pointerEvents: 'none',
        }}/>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, var(--brand), var(--brand-alt), transparent)',
        }}/>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Saison 2026</span>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800, letterSpacing: '-0.04em',
            lineHeight: 1.05, margin: '0 0 20px',
            textWrap: 'balance',
          }}>
            Ta meilleure saison commence{' '}
            <span style={{
              background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>aujourd'hui</span>.
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 16,
            color: 'var(--text-mid)', lineHeight: 1.55,
            margin: '0 auto 36px', maxWidth: 540, textWrap: 'pretty',
          }}>
            14 jours d'essai. Sans CB. Sans engagement. Découvre l'app, ton plan, ton coach.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#login" className="btn-primary-lg">
              Démarrer mon essai
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
            <a href="#offers" className="btn-ghost-lg">Comparer les formules</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 1,
      borderTop: '1px solid var(--border)',
      padding: '64px 32px 32px',
      marginTop: 40,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48,
          marginBottom: 56,
        }} className="footer-grid">
          {/* Brand col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ThwLogo size={36} radius={9}/>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>THW Coaching</span>
            </div>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              color: 'var(--text-mid)', lineHeight: 1.6, maxWidth: 320, margin: '0 0 24px',
              textWrap: 'pretty',
            }}>
              The Hybrid Way. Coaching premium pour athlètes endurance et hybrides — depuis Paris, vers le monde.
            </p>

            {/* App link CTA */}
            <a href="https://app.thwcoaching.fr" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              border: '1px solid var(--border-mid)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'rgba(0,200,224,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--brand-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(0,200,224,0.3)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Ouvrir l'app</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>app.thwcoaching.fr →</div>
              </div>
            </a>
          </div>

          {/* Link cols */}
          {[
            { title: 'Coaching', links: ['Essential', 'Performance', 'Elite', 'Comparer', 'Bons cadeaux'] },
            { title: 'Méthode', links: ['The Hybrid Way', 'Coach IA', 'Notre équipe', 'Ressources', 'Blog'] },
            { title: 'Société', links: ['À propos', 'Carrières', 'Presse', 'CGV', 'Confidentialité'] },
          ].map((col, i) => (
            <div key={i}>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-dim)', marginBottom: 18,
              }}>{col.title}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.links.map(l => (
                  <li key={l} style={{ marginBottom: 10 }}>
                    <a href="#" style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                      color: 'var(--text-mid)', transition: 'color 0.18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mid)'}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
            © 2026 THW Coaching · Made in Paris · <span style={{ color: 'var(--text-mid)' }}>v3.2.1</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {[
              { l: 'Instagram', i: <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/> },
              { l: 'YouTube', i: <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM10 15V8.5l5.5 3.25z"/> },
              { l: 'Strava', i: <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.172"/> },
              { l: 'X', i: <path d="M18 4l-7.5 8L18 20M6 4l7.5 8L6 20"/> },
            ].map((s, i) => (
              <a key={i} href="#" aria-label={s.l} style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-mid)',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mid)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{s.i}</svg>
              </a>
            ))}
          </div>
        </div>

        {/* Giant brand wordmark */}
        <div style={{
          marginTop: 40, textAlign: 'center',
          fontFamily: "'Syne', sans-serif",
          fontSize: 'clamp(80px, 18vw, 220px)',
          fontWeight: 800, letterSpacing: '-0.06em',
          lineHeight: 0.85,
          background: 'linear-gradient(180deg, rgba(0,200,224,0.18), rgba(91,111,255,0.05) 60%, transparent)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>THW</div>
      </div>
    </footer>
  );
}

window.FAQ = FAQ;
window.FinalCTA = FinalCTA;
window.Footer = Footer;
