// Interactive Coach IA chat demo with typewriter effect
function CoachDemo() {
  const conversations = [
    {
      q: "Je me sens un peu fatigué cette semaine. Comment ajuster mon planning ?",
      agent: { name: 'Coach Planning', accent: '#5b6fff', icon: 'planning' },
      thinking: ['Analyse de ta charge S12', 'Vérification HRV (−8% vs base)', 'Croisement avec ton sommeil'],
      a: "Ta CTL est à 84 mais ton ATL grimpe à 91 — TSB à −7. Combiné à ton HRV en baisse, c'est un signal de fatigue accumulée.\n\nMa reco : on déplace ton Sweet Spot de mercredi vers samedi, et on remplace mardi par 45min Z2. Tu gardes ta longue dimanche mais à 75% du volume prévu.\n\nObjectif : remonter ton TSB à +2 d'ici lundi prochain sans perdre la forme. Je valide ?",
      tags: [{ l: 'Plan ajusté', c: '#5b6fff' }, { l: '−15% volume', c: '#22c55e' }],
    },
    {
      q: "Crée-moi une séance fractionné intense pour aujourd'hui, 50min dispo.",
      agent: { name: 'Coach Séances', accent: '#00c8e0', icon: 'session' },
      thinking: ['Lecture de ta FTP (286W)', 'Analyse zones cibles', 'Construction blocs 30/30'],
      a: "Vu ta forme actuelle, on attaque un VO2max ciselé :\n\n• 12min échauffement progressif (Z1→Z2)\n• 6×(30s @ 380W / 30s @ 180W)\n• 3min récup Z1\n• 6×(30s @ 380W / 30s @ 180W)\n• 12min retour au calme\n\n→ TSS estimé : 68. Effort dur mais court. Ton corps est prêt.",
      tags: [{ l: 'VO2max', c: '#00c8e0' }, { l: '68 TSS', c: '#f59e0b' }],
    },
  ];

  const [convIdx, setConvIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('idle');
  const [typedQ, setTypedQ] = React.useState('');
  const [thinkStep, setThinkStep] = React.useState(0);
  const [typedA, setTypedA] = React.useState('');
  const [showTags, setShowTags] = React.useState(false);
  const conv = conversations[convIdx];

  React.useEffect(() => {
    let timers = [];
    setTypedQ(''); setTypedA(''); setThinkStep(0); setShowTags(false);
    setPhase('typingQ');

    let i = 0;
    const typeQ = () => {
      if (i < conv.q.length) {
        setTypedQ(conv.q.slice(0, i + 1));
        i++;
        timers.push(setTimeout(typeQ, 28));
      } else {
        timers.push(setTimeout(() => setPhase('thinking'), 400));
      }
    };
    typeQ();

    return () => timers.forEach(clearTimeout);
  }, [convIdx]);

  React.useEffect(() => {
    if (phase !== 'thinking') return;
    const timers = [];
    conv.thinking.forEach((_, idx) => {
      timers.push(setTimeout(() => setThinkStep(idx + 1), (idx + 1) * 700));
    });
    timers.push(setTimeout(() => setPhase('typingA'), conv.thinking.length * 700 + 400));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  React.useEffect(() => {
    if (phase !== 'typingA') return;
    let i = 0;
    let timer;
    const typeA = () => {
      if (i < conv.a.length) {
        setTypedA(conv.a.slice(0, i + 1));
        i += Math.random() > 0.85 ? 2 : 1;
        timer = setTimeout(typeA, 14 + Math.random() * 18);
      } else {
        setShowTags(true);
        timer = setTimeout(() => {
          setConvIdx(c => (c + 1) % conversations.length);
        }, 5500);
      }
    };
    typeA();
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <section id="coach-demo" style={{ paddingTop: 120 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 56, alignItems: 'center' }} className="hero-grid">
        <div>
          <span className="eyebrow">Démo en direct</span>
          <h2 className="section-title">
            Pose une question.<br/>
            <span style={{
              background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Reçois une vraie réponse</span>.
          </h2>
          <p className="section-sub">
            7 agents Coach IA spécialisés — Planning, Séances, Récupération, Nutrition, Performance, Stratégie, Adaptation. Chacun connaît tes données, ton historique, tes objectifs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxWidth: 460 }}>
            {[
              { l: 'Planning', c: '#5b6fff' },
              { l: 'Séances', c: '#00c8e0' },
              { l: 'Récupération', c: '#22c55e' },
              { l: 'Nutrition', c: '#22c55e' },
              { l: 'Training', c: '#f97316' },
              { l: 'Performance', c: '#a855f7' },
            ].map(a => (
              <div key={a.l} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${a.c}30`,
                background: `${a.c}08`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.c, boxShadow: `0 0 6px ${a.c}` }}/>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Coach {a.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="l-card" style={{
          padding: 0, overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          minHeight: 540, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-gradient-h)' }}/>

          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0,200,224,0.4)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{conv.agent.name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}/>
                En ligne · Streaming
              </div>
            </div>
            <span style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${conv.agent.accent}40`,
              background: `${conv.agent.accent}15`,
              color: conv.agent.accent,
              fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{conv.agent.icon}</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
            {/* User msg */}
            <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '14px 14px 4px 14px',
                background: 'rgba(91,111,255,0.12)',
                border: '1px solid rgba(91,111,255,0.25)',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.5,
                color: 'var(--text)',
              }}>
                {typedQ}{phase === 'typingQ' && <span className="cursor-blink"/>}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-dim)', textAlign: 'right', marginTop: 4 }}>
                Toi · maintenant
              </div>
            </div>

            {/* Thinking */}
            {phase === 'thinking' && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%', animation: 'slideUpFade 0.3s ease' }}>
                <div style={{
                  padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
                  background: 'rgba(0,200,224,0.06)',
                  border: '1px solid rgba(0,200,224,0.15)',
                }}>
                  {conv.thinking.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: "'DM Mono', monospace", fontSize: 11,
                      color: i < thinkStep ? 'var(--text-mid)' : 'var(--text-dim)',
                      opacity: i < thinkStep ? 1 : 0.4,
                      marginBottom: i < conv.thinking.length - 1 ? 6 : 0,
                      transition: 'all 0.3s',
                    }}>
                      {i < thinkStep ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00c8e0" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      ) : (
                        <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
                      )}
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI response */}
            {phase === 'typingA' && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '90%', animation: 'slideUpFade 0.3s ease' }}>
                <div style={{
                  padding: '14px 18px', borderRadius: '14px 14px 14px 4px',
                  background: 'linear-gradient(135deg, rgba(0,200,224,0.08), rgba(91,111,255,0.06))',
                  border: '1px solid rgba(0,200,224,0.22)',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.6,
                  color: 'var(--text)', whiteSpace: 'pre-wrap',
                }}>
                  {typedA}{!showTags && <span className="cursor-blink"/>}
                </div>
                {showTags && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, animation: 'slideUpFade 0.3s ease' }}>
                    {conv.tags.map(t => (
                      <span key={t.l} style={{
                        padding: '3px 10px', borderRadius: 999,
                        border: `1px solid ${t.c}40`, background: `${t.c}12`, color: t.c,
                        fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                      }}>{t.l}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-dim)',
            }}>Pose une question à ton coach…</div>
            <button style={{
              width: 38, height: 38, borderRadius: 10, border: 'none',
              background: 'var(--brand-gradient)', color: '#fff',
              boxShadow: '0 2px 12px rgba(0,200,224,0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

window.CoachDemo = CoachDemo;
