// PricingOverview — section tarifs informatifs (sans bouton de paiement)
// Intégrée dans app.html, avant FinalAppCTA.

const PRICING_FEATURES = [
  { label: 'Modèle IA'            },
  { label: 'Messages chat'        },
  { label: 'Plans entraînement'   },
  { label: 'Plans nutrition'      },
  { label: 'Briefing quotidien'   },
  { label: 'Historique activités' },
  { label: 'Sync Strava'          },
  { label: 'Stockage'             },
];

const PRICING_PLANS = [
  {
    id: 'premium', name: 'Premium',
    ai: 'Hermes', aiModel: 'Claude Haiku',
    price: { monthly: 14, annual: 132 },
    accent: '#00c8e0', featured: false,
    vals: ['Hermes', '30/mois', '2/mois', '1/mois', '4×/sem', '6 mois', '100/mois', '1 Go'],
  },
  {
    id: 'pro', name: 'Pro',
    ai: 'Athena', aiModel: 'Claude Sonnet',
    price: { monthly: 26, annual: 249 },
    accent: '#00c8e0', featured: true,
    vals: ['Athena', '100/mois', '6/mois', '3/mois', 'Quotidien + web', '24 mois', 'Illimité', '5 Go'],
  },
  {
    id: 'expert', name: 'Expert',
    ai: 'Zeus', aiModel: 'Claude Sonnet · 16k',
    price: { monthly: 49, annual: 468 },
    accent: '#f59e0b', featured: false,
    vals: ['Zeus', '300/mois', '20/mois', '10/mois', 'Prioritaire + web', 'Illimité', 'Illimité', '20 Go'],
  },
];

function PricingOverview() {
  const [billing, setBilling] = React.useState('monthly');

  return (
    <section id="tarifs" style={{ paddingTop: 120 }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Tarifs</span>
        <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
          Trois formules.{' '}
          <span style={{
            background: 'linear-gradient(135deg, #00c8e0 20%, #5b6fff 80%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Une IA dédiée</span>.
        </h2>
        <p className="section-sub" style={{ margin: '0 auto 28px', textAlign: 'center' }}>
          Commence gratuitement pendant 14 jours — sans carte bancaire.
        </p>

        {/* Billing toggle */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 999, padding: 4, gap: 2,
        }}>
          {[
            { v: 'monthly', label: 'Mensuel' },
            { v: 'annual',  label: 'Annuel'  },
          ].map(({ v, label }) => {
            const active = billing === v;
            return (
              <button key={v} onClick={() => setBilling(v)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 999, border: 'none',
                background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-dim)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}>
                {label}
                {v === 'annual' && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 999,
                    background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}>2 mois offerts</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan cards row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14, marginBottom: 32,
      }} className="how-grid">
        {PRICING_PLANS.map((plan) => {
          const displayPrice = billing === 'annual'
            ? Math.round(plan.price.annual / 12)
            : plan.price.monthly;

          return (
            <div key={plan.id} style={{
              position: 'relative', overflow: 'hidden',
              background: plan.featured
                ? `linear-gradient(180deg, ${plan.accent}0d 0%, rgba(7,11,15,0.97) 50%)`
                : 'rgba(255,255,255,0.022)',
              border: plan.featured
                ? `1px solid ${plan.accent}55`
                : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '22px 22px 20px',
            }}>
              {/* Top accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: plan.featured ? 3 : 2,
                background: plan.featured
                  ? `linear-gradient(90deg, ${plan.accent}, #5b6fff)`
                  : `linear-gradient(90deg, ${plan.accent}60, transparent 60%)`,
              }} />

              {/* Popular badge */}
              {plan.featured && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  padding: '3px 10px', borderRadius: 999,
                  background: 'linear-gradient(135deg, #00c8e0, #5b6fff)',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 9,
                  fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: '#fff',
                }}>Le plus populaire</div>
              )}

              {/* AI identity */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', borderRadius: 8,
                background: `${plan.accent}10`, border: `1px solid ${plan.accent}28`,
                marginBottom: 14,
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 9,
                  color: plan.accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                }}>{plan.ai}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 9,
                  color: 'var(--text-dim)',
                }}>{plan.aiModel}</span>
              </div>

              {/* Name */}
              <div style={{
                fontFamily: "'Syne', sans-serif", fontSize: 22,
                fontWeight: 800, letterSpacing: '-0.04em',
                color: 'var(--text)', marginBottom: 10,
              }}>{plan.name}</div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 4 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-mid)', fontWeight: 500, paddingBottom: 6 }}>€</span>
                <span style={{
                  fontFamily: "'Syne', sans-serif", fontSize: 44,
                  fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 1,
                  color: plan.accent, transition: 'opacity 0.15s',
                }}>{displayPrice}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', paddingBottom: 8, paddingLeft: 2 }}>/mois</span>
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                color: 'var(--text-dim)',
              }}>
                {billing === 'annual'
                  ? <>Facturé <span style={{ color: 'var(--text-mid)', fontWeight: 500 }}>{plan.price.annual} €/an</span></>
                  : <>ou <span style={{ color: 'var(--text-mid)', fontWeight: 500 }}>{plan.price.annual} €/an</span> — 2 mois offerts</>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div style={{
        background: 'rgba(255,255,255,0.016)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ padding: '18px 22px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fonctionnalité</div>
          </div>
          {PRICING_PLANS.map(plan => (
            <div key={plan.id} style={{
              padding: '18px 16px',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              background: plan.featured ? 'rgba(0,200,224,0.04)' : 'transparent',
            }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: plan.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{plan.ai}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>{plan.name}</div>
            </div>
          ))}
        </div>

        {/* Rows */}
        {PRICING_FEATURES.map((row, ri) => (
          <div key={ri} style={{
            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
            borderBottom: ri < PRICING_FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <div style={{
              padding: '12px 22px',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              color: 'var(--text-dim)', display: 'flex', alignItems: 'center',
            }}>{row.label}</div>
            {PRICING_PLANS.map(plan => (
              <div key={plan.id} style={{
                padding: '12px 16px',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                background: plan.featured ? 'rgba(0,200,224,0.02)' : 'transparent',
                display: 'flex', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 12,
                  fontWeight: 500, color: plan.accent,
                }}>{plan.vals[ri]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Trial note */}
      <div style={{
        textAlign: 'center', marginTop: 22,
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-dim)',
      }}>
        14 jours d'essai gratuit · Sans carte bancaire · Résiliable à tout moment
      </div>
    </section>
  );
}

window.PricingOverview = PricingOverview;
