// Configurator.jsx — 4 steps: Sport → Objectif → Formule → Options

function Configurator() {

  // ── Sport SVG icons ────────────────────────────────────────────────────────
  const SPORT_ICONS = {
    running: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="20" cy="5" r="2.4" fill="currentColor"/>
        <path d="M18 8.5 L14.5 13 L17.5 16.5 L13 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.5 13 L10 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14.5 13 L18.5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M13 23 L10 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M17.5 16.5 L21 20 L20 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    cycling: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="8"  cy="21" r="6" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="21" r="6" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8"  cy="21" r="1.2" fill="currentColor"/>
        <circle cx="24" cy="21" r="1.2" fill="currentColor"/>
        <path d="M24 21 L18 10 L12 21 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 21 L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M18 10 L22 9 L23 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 10 L17 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="22" cy="6" r="2" fill="currentColor"/>
      </svg>
    ),
    triathlon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="24" cy="7" r="2.2" fill="currentColor"/>
        <path d="M22 9.5 L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M10 13 L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 11 L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M22 9.5 L25 13 L28 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 9.5 L24 14 L27 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 18 Q6 16 9 18 Q12 20 15 18 Q18 16 21 18 Q24 20 27 18 Q29 16 30 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
      </svg>
    ),
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const SPORTS = [
    { id: 'running',   label: 'Running',   icon: 'running'   },
    { id: 'cycling',   label: 'Cyclisme',  icon: 'cycling'   },
    { id: 'triathlon', label: 'Triathlon', icon: 'triathlon' },
  ];

  const GOALS = {
    running:   [
      { id: '5-10km',   label: '5 – 10 km'      },
      { id: 'semi',     label: 'Semi-marathon'   },
      { id: 'marathon', label: 'Marathon'        },
    ],
    cycling:   [
      { id: 'cyclosport', label: 'Cyclosportive · Montagne' },
      { id: 'ftp',        label: 'Performance FTP'          },
    ],
    triathlon: [
      { id: 'sprint-olympic', label: 'S · M (Sprint / Olympique)' },
      { id: '70.3',           label: '70.3'                       },
    ],
  };

  // Base price per 4-week bloc for each sport+goal combination
  const BASE_PRICES = {
    'running-5-10km':           169,
    'running-semi':             199,
    'running-marathon':         249,
    'cycling-cyclosport':       209,
    'cycling-ftp':              189,
    'triathlon-sprint-olympic': 229,
    'triathlon-70.3':           289,
  };

  // blocs × disc = total factor; months = subscription duration
  const FORMULAS = [
    {
      id: 'pack', label: 'Pack', sub: 'Bloc 4 semaines · résiliable',
      blocs: 1,  disc: 1.00, months: null, badge: null,
      includes: ['Plan personnalisé', 'Suivi Avancé', 'Accès app Premium', 'Appel découverte 30min offert', '1ère semaine gratuite'],
    },
    {
      id: '3m',   label: '3 mois', sub: 'Abonnement · −10%',
      blocs: 3,  disc: 0.90, months: 3,    badge: null,
      includes: ['Tout du Pack', 'Accès app Pro', 'Renfo Classique inclus'],
    },
    {
      id: '6m',   label: '6 mois', sub: 'Abonnement · −15%',
      blocs: 6,  disc: 0.85, months: 6,    badge: null,
      includes: ['Tout du 3 mois', 'Renfo Puissance inclus'],
    },
    {
      id: '12m',  label: '1 an',   sub: 'Abonnement · −20%',
      blocs: 13, disc: 0.80, months: 12,   badge: 'MEILLEUR PRIX',
      includes: ['Tout du 6 mois', 'Suivi Pro inclus', 'Accès app Expert'],
    },
  ];

  // Options: includedIn = formula ids where this option is free (shown as Inclus ✓)
  const OPTIONS = [
    {
      id: 'suivi_pro',
      label: 'Suivi Pro',
      price: 25,
      desc: 'Échanges quotidiens · 1 appel/semaine · Ajustements 3×/semaine · Réponses prioritaires',
      includedIn: ['12m'],
    },
    {
      id: 'renfo_classic',
      label: 'Renfo Classique',
      price: 10,
      desc: '2 séances/semaine · Gainage · Posture · Pliométrie · Prévention blessures',
      includedIn: ['3m', '6m', '12m'],
    },
    {
      id: 'renfo_power',
      label: 'Renfo Puissance / Explosivité',
      price: 20,
      desc: 'Inclut Renfo Classique · Puissance et explosivité neuromusculaire',
      includedIn: ['6m', '12m'],
    },
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  const [step,    setStep]    = React.useState(1);
  const [sport,   setSport]   = React.useState(null);
  const [goal,    setGoal]    = React.useState(null);
  const [formula, setFormula] = React.useState(null);
  const [opts,    setOpts]    = React.useState({});
  const [payMode, setPayMode] = React.useState('monthly'); // 'monthly' | 'once'

  function toggleOpt(id) { setOpts(o => ({ ...o, [id]: !o[id] })); }
  function selectSport(id) { setSport(id); setGoal(null); }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function isIncluded(optId, fId) {
    const opt = OPTIONS.find(o => o.id === optId);
    return fId && opt ? opt.includedIn.includes(fId) : false;
  }

  const basePrice  = (sport && goal) ? (BASE_PRICES[`${sport}-${goal}`] || 0) : 0;
  const selFormula = FORMULAS.find(f => f.id === formula) || null;

  // Extra from paid options (excluded included ones)
  const optExtra = OPTIONS.reduce((s, o) => {
    if (!opts[o.id] || isIncluded(o.id, formula)) return s;
    return s + o.price;
  }, 0);

  const pricePerBloc = basePrice + optExtra;

  function calcTotal(f) {
    if (!f || !basePrice) return null;
    return Math.round(pricePerBloc * f.blocs * f.disc);
  }

  function calcMonthly(f) {
    const t = calcTotal(f);
    return (t && f.months) ? Math.round(t / f.months) : null;
  }

  const totalPrice   = calcTotal(selFormula);
  const monthlyPrice = calcMonthly(selFormula);

  const canNext = (step===1 && sport) || (step===2 && goal) || (step===3 && formula) || step===4;
  const STEP_LABELS = ['Sport', 'Objectif', 'Formule', 'Options'];

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = (active) => ({
    borderRadius: 12,
    background: active
      ? 'linear-gradient(135deg,rgba(0,200,224,0.13),rgba(91,111,255,0.09))'
      : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'rgba(0,200,224,0.45)' : 'var(--border)'}`,
    cursor: 'pointer',
    transition: 'all 0.18s',
    boxShadow: active ? '0 0 22px rgba(0,200,224,0.16)' : 'none',
    position: 'relative',
    overflow: 'hidden',
  });

  // ── Toggle component ───────────────────────────────────────────────────────
  function PayToggle({ size = 'sm' }) {
    const pad = size === 'lg' ? '7px 16px' : '5px 12px';
    const fs  = size === 'lg' ? 12 : 11;
    return (
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 9, padding: 3, width: 'fit-content' }}>
        {[{ v: 'monthly', l: 'Mensuel' }, { v: 'once', l: 'Total' }].map(m => (
          <button key={m.v} onClick={() => setPayMode(m.v)} style={{
            padding: pad, borderRadius: 7, border: 'none', cursor: 'pointer',
            background: payMode === m.v ? 'rgba(0,200,224,0.16)' : 'transparent',
            outline: payMode === m.v ? '1px solid rgba(0,200,224,0.35)' : 'none',
            fontFamily: "'DM Sans', sans-serif", fontSize: fs, fontWeight: 500,
            color: payMode === m.v ? 'var(--brand)' : 'var(--text-dim)',
            transition: 'all 0.18s',
          }}>{m.l}</button>
        ))}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section id="offers" style={{ padding: '100px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <span className="eyebrow">Coaching sur-mesure</span>
        <h2 className="section-title">
          Configure<br/>
          <span style={{ background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ton programme</span>.
        </h2>
        <p className="section-sub">
          Première semaine offerte · Sans engagement sur le Pack · Résiliation à tout moment.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }} className="hero-grid">

        {/* ─── Left stepper ─────────────────────────────────────────────────── */}
        <div className="l-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-gradient-h)' }}/>

          {/* Step indicators */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '20px 28px' }}>
            {STEP_LABELS.map((l, i) => {
              const n = i + 1, done = step > n, active = step === n;
              return (
                <React.Fragment key={n}>
                  <div onClick={() => done && setStep(n)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: done ? 'pointer' : 'default', flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? 'var(--brand-gradient)' : active ? 'rgba(0,200,224,0.12)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid var(--brand)' : done ? 'none' : '1px solid var(--border)',
                      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700,
                      color: done ? '#fff' : active ? 'var(--brand)' : 'var(--text-dim)',
                      boxShadow: active ? '0 0 14px rgba(0,200,224,0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {done
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        : n}
                    </div>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: active ? 'var(--brand)' : done ? 'var(--text-mid)' : 'var(--text-dim)',
                    }}>{l}</span>
                  </div>
                  {i < 3 && (
                    <div style={{
                      flex: 1, height: 1, marginTop: 16,
                      background: done ? 'linear-gradient(90deg,var(--brand),var(--brand-alt))' : 'var(--border)',
                      maxWidth: 60, alignSelf: 'flex-start', transition: 'background 0.3s',
                    }}/>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step content */}
          <div style={{ padding: '36px 32px 28px' }}>

            {/* ── STEP 1: Sport ────────────────────────────────────────────── */}
            {step === 1 && (
              <div style={{ animation: 'fadeUpSlow 0.3s ease both' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Quel est ton sport principal ?</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-mid)', margin: '0 0 28px' }}>
                  Ton programme sera conçu spécifiquement pour cette discipline.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {SPORTS.map(s => (
                    <button key={s.id} onClick={() => selectSport(s.id)} style={{
                      ...card(sport === s.id),
                      borderRadius: 14, padding: '22px 16px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    }}>
                      {sport === s.id && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--brand-gradient-h)' }}/>}
                      <span style={{ color: sport === s.id ? 'var(--brand)' : 'var(--text-mid)', transition: 'color 0.18s' }}>
                        {SPORT_ICONS[s.icon]}
                      </span>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: sport === s.id ? 'var(--brand)' : 'var(--text)' }}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 2: Objectif ──────────────────────────────────────────── */}
            {step === 2 && sport && (
              <div style={{ animation: 'fadeUpSlow 0.3s ease both' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Quel est ton objectif ?</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-mid)', margin: '0 0 28px' }}>
                  Le programme, la périodisation et les séances seront calibrés sur cet objectif.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {GOALS[sport].map(g => {
                    const bp = BASE_PRICES[`${sport}-${g.id}`];
                    const active = goal === g.id;
                    return (
                      <button key={g.id} onClick={() => setGoal(g.id)} style={{
                        ...card(active),
                        borderRadius: 12, padding: '18px 22px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        {active && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--brand-gradient)' }}/>}
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: active ? 'var(--brand)' : 'var(--text)' }}>
                          {g.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {bp && (
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
                              à partir de {bp} €/bloc
                            </span>
                          )}
                          {active && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: Formule ───────────────────────────────────────────── */}
            {step === 3 && (
              <div style={{ animation: 'fadeUpSlow 0.3s ease both' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Choisis ta formule</h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>
                      Plus tu t'engages, plus le tarif est avantageux.
                    </p>
                  </div>
                  <PayToggle size="sm"/>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {FORMULAS.map(f => {
                    const fTotal   = basePrice ? Math.round(pricePerBloc * f.blocs * f.disc) : null;
                    const fMonthly = (fTotal && f.months) ? Math.round(fTotal / f.months) : null;
                    const disc     = Math.round(100 - f.disc * 100);
                    const active   = formula === f.id;

                    return (
                      <button key={f.id} onClick={() => setFormula(f.id)} style={{
                        ...card(active),
                        borderRadius: 14, padding: '16px 18px', textAlign: 'left',
                      }}>
                        {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--brand-gradient-h)' }}/>}
                        {f.badge && (
                          <div style={{ position: 'absolute', top: 10, right: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--brand-gradient)', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
                            {f.badge}
                          </div>
                        )}

                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: active ? 'var(--brand)' : 'var(--text)', marginBottom: 2 }}>{f.label}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>{f.sub}</div>

                        {/* Price display */}
                        {fTotal ? (
                          <div>
                            {f.months ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: active ? 'var(--brand)' : 'var(--text)' }}>
                                    {payMode === 'monthly' ? fMonthly : fTotal}€
                                  </span>
                                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)' }}>
                                    {payMode === 'monthly' ? '/mois' : 'total'}
                                  </span>
                                  {disc > 0 && (
                                    <span style={{ fontSize: 9, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '2px 6px', borderRadius: 999 }}>
                                      −{disc}%
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
                                  {payMode === 'monthly' ? `soit ${fTotal}€ total` : `soit ${fMonthly}€/mois`}
                                </div>
                              </>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: active ? 'var(--brand)' : 'var(--text)' }}>
                                  {fTotal}€
                                </span>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)' }}>/bloc</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
                            Prix selon objectif
                          </div>
                        )}

                        {/* Inclusions */}
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {f.includes.slice(0, 3).map((inc, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" style={{ flexShrink: 0, opacity: 0.7 }}>
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'var(--text-dim)' }}>{inc}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 4: Options ───────────────────────────────────────────── */}
            {step === 4 && (
              <div style={{ animation: 'fadeUpSlow 0.3s ease both' }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Options additionnelles</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-mid)', margin: '0 0 24px' }}>
                  Certaines options sont déjà incluses dans ta formule — elles ne s'ajoutent pas au prix.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {OPTIONS.map(o => {
                    const included = isIncluded(o.id, formula);
                    const checked  = included || !!opts[o.id];
                    return (
                      <button key={o.id} onClick={() => !included && toggleOpt(o.id)} style={{
                        padding: '15px 18px', borderRadius: 12,
                        background: checked ? 'linear-gradient(135deg,rgba(0,200,224,0.09),rgba(91,111,255,0.06))' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${checked ? 'rgba(0,200,224,0.38)' : 'var(--border)'}`,
                        cursor: included ? 'default' : 'pointer',
                        transition: 'all 0.18s',
                        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                      }}>

                        {/* Checkbox or Inclus badge */}
                        {included ? (
                          <div style={{
                            padding: '4px 9px', borderRadius: 6, flexShrink: 0,
                            background: 'rgba(0,200,224,0.12)',
                            border: '1px solid rgba(0,200,224,0.28)',
                          }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                              Inclus ✓
                            </span>
                          </div>
                        ) : (
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                            background: opts[o.id] ? 'var(--brand-gradient)' : 'rgba(255,255,255,0.06)',
                            border: opts[o.id] ? 'none' : '1px solid var(--border-mid)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.18s',
                            boxShadow: opts[o.id] ? '0 0 10px rgba(0,200,224,0.35)' : 'none',
                          }}>
                            {opts[o.id] && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Label + desc */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: checked ? 'var(--brand)' : 'var(--text)', marginBottom: 3 }}>
                            {o.label}
                          </div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.45 }}>
                            {o.desc}
                          </div>
                        </div>

                        {/* Price or Inclus */}
                        {included ? null : (
                          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: opts[o.id] ? 'var(--brand)' : 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            +{o.price}€
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 3 }}>/bloc</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => step > 1 && setStep(s => s - 1)} style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'transparent', border: '1px solid var(--border)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                color: 'var(--text-mid)', cursor: step === 1 ? 'not-allowed' : 'pointer',
                opacity: step === 1 ? 0.3 : 1, transition: 'all 0.18s',
              }}>← Retour</button>

              {step < 4 ? (
                <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} style={{
                  padding: '10px 24px', borderRadius: 10,
                  background: canNext ? 'var(--brand-gradient)' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  color: canNext ? '#fff' : 'var(--text-dim)',
                  cursor: canNext ? 'pointer' : 'not-allowed',
                  boxShadow: canNext ? '0 2px 14px rgba(0,200,224,0.3)' : 'none',
                  transition: 'all 0.18s',
                }}>Continuer →</button>
              ) : (
                <a href="#questionnaire" className="btn-primary-lg" style={{ fontSize: 13 }}>
                  Commencer mon coaching →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right: Live summary ──────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 96 }}>
          <div className="l-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-gradient-h)' }}/>

            <div style={{ padding: '24px 22px 0' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 18 }}>
                Récapitulatif
              </div>

              {/* Summary rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {[
                  { l: 'Sport',    v: sport   ? SPORTS.find(s => s.id === sport)?.label : null },
                  { l: 'Objectif', v: sport && goal ? GOALS[sport]?.find(g => g.id === goal)?.label : null },
                  { l: 'Formule',  v: selFormula ? selFormula.label : null },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-dim)' }}>{r.l}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: r.v ? 'var(--text)' : 'var(--text-dim)', fontStyle: r.v ? 'normal' : 'italic' }}>
                      {r.v || '—'}
                    </span>
                  </div>
                ))}

                {/* Options in summary */}
                {OPTIONS.map(o => {
                  const included = isIncluded(o.id, formula);
                  const selected = !!opts[o.id];
                  if (!included && !selected) return null;
                  return (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', maxWidth: 160 }}>{o.label}</span>
                      {included
                        ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--brand)', fontWeight: 600 }}>Inclus</span>
                        : <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--brand)' }}>+{o.price}€/bloc</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price block */}
            <div style={{
              margin: '0 16px 14px', padding: 18, borderRadius: 14,
              background: selFormula && basePrice ? 'linear-gradient(135deg,rgba(0,200,224,0.10),rgba(91,111,255,0.07))' : 'rgba(255,255,255,0.03)',
              border: selFormula && basePrice ? '1px solid rgba(0,200,224,0.28)' : '1px solid var(--border)',
              position: 'relative', overflow: 'hidden', transition: 'all 0.3s',
            }}>
              {selFormula && basePrice && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--brand-gradient-h)' }}/>}

              {selFormula && basePrice ? (
                <>
                  {selFormula.months ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)' }}>
                          {payMode === 'monthly' ? 'Prix mensuel' : 'Paiement total'}
                        </span>
                        <PayToggle size="sm"/>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--brand)' }}>
                          {payMode === 'monthly' ? monthlyPrice : totalPrice}
                        </span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text-mid)' }}>
                          €{payMode === 'monthly' ? ' / mois' : ' total'}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', marginTop: 5 }}>
                        {payMode === 'monthly'
                          ? `soit ${totalPrice}€ total · engagement ${selFormula.months} mois`
                          : `soit ${monthlyPrice}€/mois · engagement ${selFormula.months} mois`}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', marginBottom: 5 }}>Prix / bloc (4 sem.)</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--brand)' }}>{totalPrice}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text-mid)' }}>€ / bloc</span>
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', marginTop: 5 }}>Sans engagement · résiliable à tout moment</div>
                    </>
                  )}
                  <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    1ère semaine offerte · Appel découverte 30min inclus
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '8px 0' }}>
                  Configure ton programme<br/>pour voir le prix
                </div>
              )}
            </div>

            {/* CTA */}
            <div style={{ padding: '0 16px 18px' }}>
              <a href="#questionnaire" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, textDecoration: 'none', padding: '13px 20px', borderRadius: 12,
                background: 'var(--brand-gradient)',
                boxShadow: '0 4px 20px rgba(0,200,224,0.3)',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  Commencer mon coaching →
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em' }}>
                  Appel découverte gratuit 30min
                </span>
              </a>
            </div>

            {/* Always-included features */}
            <div style={{ padding: '0 22px 22px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
                Inclus dans tous les plans
              </div>
              {[
                'App THW Coaching complète',
                'Coach IA — 7 agents · 24/7',
                'Sync Strava · Garmin · Wahoo',
                'CTL/ATL/TSB temps réel',
                '1ère semaine offerte',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-mid)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Configurator = Configurator;
