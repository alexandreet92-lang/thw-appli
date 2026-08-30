// QApp.jsx — Main questionnaire orchestrator

// ── EmailJS config ─────────────────────────────────────────────────────────
// 1. Créez un compte sur https://www.emailjs.com (gratuit)
// 2. Ajoutez un service (Gmail ou SMTP) → notez le Service ID
// 3. Créez un template avec les variables : {{from_name}} {{from_email}} {{subject}} {{message}}
// 4. Copiez votre Public Key depuis Account > API Keys
const EMAILJS_SERVICE_ID  = 'service_q6pf4k8';
const EMAILJS_TEMPLATE_ID = 'template_1nbwaae';
const EMAILJS_PUBLIC_KEY  = 'CfhphZjWx6KvCRKfx';
const DEST_EMAIL          = 'alexandre.et92@gmail.com';

function formatEmailBody(d) {
  const lines = [];
  const row = (l, v) => { if (v) lines.push(`${l} : ${v}`); };
  const sep = t => lines.push(`\n▸ ${t.toUpperCase()}`);
  const impL = { prep:'Secondaire/Préparatif', important:'Important', principal:'Principal' };
  const sportL = { running:'Running', cycling:'Cyclisme', triathlon:'Triathlon' };

  sep('Identité');
  row('Nom',          `${d.prenom||''} ${d.nom||''}`.trim());
  row('Âge',          d.age); row('Sexe', d.sexe); row('Email', d.email);
  row('Objectif',     d.objectif);

  sep('Course principale (GTY)');
  row('Événement',    d.gty_nom); row('Sport', d.gty_sport);
  row('Date',         d.gty_date); row('Temps visé', d.gty_temps);

  if ((d.courses||[]).length) {
    sep('Autres courses');
    (d.courses||[]).forEach((c,i) =>
      lines.push(`[${i+1}] ${c.nom||'—'} · ${sportL[c.sport]||c.sport||''} · ${c.date||''} · ${c.temps||''} · ${impL[c.importance]||c.importance||''}`)
    );
  }

  sep('Mode de vie');
  row('Heures/sem',   d.heures_semaine ? `${d.heures_semaine}h` : null);
  row('Contraintes pro',   d.contraintes_pro);
  row('Contraintes perso', d.contraintes_perso);
  row('Blessures',    d.blessures);

  sep('Matériel');
  row('Montre GPS',   d.montre);
  row('Capteur puissance', d.capteur_puissance);
  row('Home trainer', d.home_trainer); row('Salle muscu', d.salle);
  row('Strava',       d.strava==='oui' ? `Oui${d.nom_strava?' · '+d.nom_strava:''}` : d.strava);

  sep('Coaching');
  row('Formule', d.type_coaching==='pack' ? 'Pack 4 semaines' : d.type_coaching==='abo' ? `Abonnement ${d.duree_abo}` : null);
  row('Sport', sportL[d.sport]||d.sport);

  if (d.sport==='running') {
    sep('Profil Running');
    row('Distance cible', d.run_objectif); row('Depuis', d.run_depuis);
    row('Temps visé', d.run_temps_vise);
    row('Volume actuel', d.run_volume_actuel?`${d.run_volume_actuel} km/sem`:null);
    row('Volume habituel', d.run_volume_habituel?`${d.run_volume_habituel} km/sem`:null);
    row('PR', d.run_pr==='oui'?d.run_pr_quoi:'Non');
    row('Autres chronos', d.run_autres_chronos);
    row('Semaine type', d.run_semaine_type);
    row('Pourquoi coach', d.run_pourquoi_coach);
  }
  if (d.sport==='cycling') {
    sep('Profil Cyclisme');
    row('Objectif', d.velo_objectif); row('Depuis', d.velo_depuis);
    row('FTP', d.velo_ftp); row('Profil', d.velo_profil);
    row('Volume', [d.velo_km_mois&&`${d.velo_km_mois}km/mois`, d.velo_h_mois&&`${d.velo_h_mois}h/mois`].filter(Boolean).join(' · ')||null);
    row('Axes amélio.', d.velo_axes); row('Pourquoi coach', d.velo_pourquoi_coach);
  }
  if (d.sport==='triathlon') {
    sep('Profil Triathlon');
    row('Objectif', d.tri_objectif); row('PR', d.tri_pr); row('Temps visé', d.tri_temps_vise);
    row('Volume', d.tri_h_semaine?`${d.tri_h_semaine}h/sem`:null);
    row('Points faibles', Array.isArray(d.tri_point_faible)?d.tri_point_faible.join(', '):d.tri_point_faible);
    row('Pourquoi coach', d.tri_pourquoi_coach);
  }

  sep('Options');
  row('Renfo', d.renfo); row('Suivi', d.suivi);
  row('Infos compl.', d.infos_complementaires);

  return lines.join('\n');
}

async function sendViaEmailJS(d) {
  if (!window.emailjs) throw new Error('EmailJS non chargé');

  const sportL = { running:'Running', cycling:'Cyclisme', triathlon:'Triathlon' };
  const impL   = { prep:'Secondaire/Préparatif', important:'Important', principal:'Principal' };

  const autresCourses = (d.courses||[]).map((c,i) =>
    `[${i+1}] ${c.nom||'—'} · ${sportL[c.sport]||c.sport||''} · ${c.date||''} · ${c.temps||''} · ${impL[c.importance]||c.importance||''}`
  ).join('\n');

  const contraintes = [
    d.contraintes_pro   ? `Pro : ${d.contraintes_pro}`   : '',
    d.contraintes_perso ? `Perso : ${d.contraintes_perso}` : '',
  ].filter(Boolean).join('\n');

  const renfoL = {
    classique       : 'Renfo Classique (+10€/bloc)',
    puissance       : 'Renfo Puissance/Explosivité (+20€/bloc)',
    puissance_inclus: 'Renfo Classique + Puissance (inclus)',
  };
  const suiviL = {
    avance: 'Suivi Avancé (inclus)',
    pro   : 'Suivi Pro (+25€/bloc)',
  };

  const coachingObjectifMap = {
    running:   d.run_objectif,
    cycling:   d.velo_objectif,
    triathlon: d.tri_objectif,
  };

  return window.emailjs.send(
    EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
    {
      // ── Champs exacts demandés ──────────────────────────────────────────
      from_name:               `${d.prenom||''} ${d.nom||''}`.trim() || 'Candidat THW',
      from_email:              d.email || '',
      prenom:                  d.prenom || '',
      nom:                     d.nom || '',
      email:                   d.email || '',
      age:                     d.age || '',
      sexe:                    d.sexe || '',
      objectif_sport:          sportL[d.gty_sport] || d.gty_sport || '',
      objectif_course:         d.gty_nom || '',
      objectif_date:           d.gty_date || '',
      objectif_temps:          d.gty_temps || '',
      autres_courses:          autresCourses,
      heures_par_semaine:      d.heures_semaine ? `${d.heures_semaine}h` : '',
      contraintes:             contraintes,
      blessures:               d.blessures || '',
      montre_gps:              d.montre || '',
      capteur_puissance:       d.capteur_puissance || '',
      home_trainer:            d.home_trainer || '',
      salle_muscu:             d.salle || '',
      strava_connecte:         d.strava === 'oui' ? `Oui${d.nom_strava ? ' · ' + d.nom_strava : ''}` : (d.strava || ''),
      coaching_type:           d.type_coaching === 'pack' ? 'Pack 4 semaines' : d.type_coaching === 'abo' ? 'Abonnement' : '',
      coaching_duree:          d.type_coaching === 'pack' ? '4 semaines' : (d.duree_abo === '3m' ? '3 mois' : d.duree_abo === '6m' ? '6 mois' : d.duree_abo === '1an' ? '1 an' : ''),
      coaching_sport:          sportL[d.sport] || d.sport || '',
      coaching_objectif:       coachingObjectifMap[d.sport] || '',
      option_renfo:            renfoL[d.renfo] || (d.renfo ? d.renfo : 'Non'),
      niveau_suivi:            suiviL[d.suivi] || (d.suivi ? d.suivi : ''),
      infos_complementaires:   d.infos_complementaires || '',
      // ── Récapitulatif complet (champ message) ──────────────────────────
      message:                 formatEmailBody(d),
    },
    EMAILJS_PUBLIC_KEY
  );
}

const Q_TOTAL  = 7;
const Q_TITLES = ['Bienvenue', 'Mode de vie', 'Matériel', 'Coaching', 'Profil sportif', 'Options', 'Confirmation'];

const Q_DEFAULT = {
  prenom:'', nom:'', age:'', sexe:'', email:'', objectif:'',
  gty_nom:'', gty_sport:'', gty_date:'', gty_temps:'',
  courses:[],
  heures_semaine: 8,
  contraintes_pro:'', contraintes_perso:'', blessures:'',
  contraintes_pro:'', contraintes_perso:'', blessures:'',
  montre:'', capteur_puissance:'', home_trainer:'', salle:'', strava:'', nom_strava:'',
  type_coaching:'', duree_abo:'', sport:'',
  run_objectif:'', run_depuis:'', run_volume_actuel:'', run_volume_habituel:'', run_volume_max:'',
  run_augmenter:'', run_augmenter_pourquoi:'', run_pr:'', run_pr_quoi:'', run_autres_chronos:'',
  run_temps_vise:'', run_semaine_type:'', run_connaissances:'', run_pourquoi_coach:'',
  velo_objectif:'', velo_distance:'', velo_deniv:'', velo_depuis:'', velo_ftp:'',
  velo_5min:'', velo_10min:'', velo_20min:'', velo_2h:'', velo_5h:'',
  velo_km_mois:'', velo_km_an:'', velo_h_mois:'', velo_h_an:'',
  velo_profil:'', velo_axes:'', velo_pourquoi_coach:'',
  tri_objectif:'', tri_pr:'', tri_h_semaine:'', tri_seances_semaine:'',
  tri_nage_100:'', tri_nage_400:'', tri_nage_1900:'',
  tri_velo_ftp:'', tri_velo_5min:'', tri_velo_10min:'', tri_velo_20min:'',
  tri_cap_1500:'', tri_cap_5km:'', tri_cap_10km:'', tri_cap_semi:'', tri_cap_marathon:'',
  tri_temps_vise:'', tri_point_faible:[], tri_pourquoi_coach:'',
  renfo:'', suivi:'', infos_complementaires:'',
};

function QApp() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = React.useState(() => {
    try { return parseInt(localStorage.getItem('thw_q_step') || '1') || 1; } catch { return 1; }
  });
  const [data, setData] = React.useState(() => {
    try {
      const saved = localStorage.getItem('thw_q_data');
      return saved ? { ...Q_DEFAULT, ...JSON.parse(saved) } : { ...Q_DEFAULT };
    } catch { return { ...Q_DEFAULT }; }
  });
  const [animDir, setAnimDir] = React.useState(1); // 1=forward, -1=back
  const [transitioning, setTransitioning] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [sending,   setSending]   = React.useState(false);
  const [sendError, setSendError] = React.useState(null);

  async function handleSubmit() {
    setSending(true);
    setSendError(null);
    try {
      await sendViaEmailJS(data);

      // Envoi vers API Supabase
      try {
        await fetch('https://thw-appli.vercel.app/api/questionnaire', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer thw_coaching_secret_2026',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prenom: data.prenom || '',
            nom: data.nom || '',
            email: data.email || '',
            age: data.age || '',
            sexe: ({ homme:'homme', femme:'femme', autre:'autre' }[data.sexe] || 'non_precise'),
            objectif_sport: data.gty_sport || data.sport || '',
            objectif_course: data.gty_nom || '',
            objectif_date: data.gty_date || '',
            objectif_temps: data.gty_temps || '',
            autres_courses: Array.isArray(data.courses) ? data.courses.join(', ') : (data.courses || ''),
            heures_par_semaine: data.heures_semaine || '',
            contraintes: data.contraintes_pro || '',
            blessures: data.blessures || '',
            montre_gps: data.montre || '',
            capteur_puissance: data.capteur_puissance || '',
            home_trainer: data.home_trainer || '',
            salle_muscu: data.salle || '',
            strava_connecte: data.strava === 'oui' ? `Oui${data.nom_strava ? ' · ' + data.nom_strava : ''}` : (data.strava || ''),
            coaching_type: ({ pack:'pack', abo:'abonnement' }[data.type_coaching] || ''),
            coaching_duree: data.type_coaching === 'pack' ? '4 semaines' : (data.duree_abo === '3m' ? '3 mois' : data.duree_abo === '6m' ? '6 mois' : data.duree_abo === '1an' ? '1 an' : ''),
            coaching_sport: data.sport || '',
            coaching_objectif: data.objectif || '',
            option_renfo: data.renfo || '',
            niveau_suivi: ({ avance:'premium', pro:'premium', standard:'standard', essentiel:'essentiel' }[data.suivi] || 'premium'),
            infos_complementaires: data.infos_complementaires || ''
          })
        });
      } catch (apiErr) {
        console.error('Erreur API Supabase:', apiErr);
      }

      // Clear saved form on success
      try { localStorage.removeItem('thw_q_data'); localStorage.removeItem('thw_q_step'); } catch {}
      setSubmitted(true);
    } catch (err) {
      console.error('EmailJS error:', err);
      setSendError("Erreur d'envoi. Vérifie ta connexion ou contacte nous directement.");
    } finally {
      setSending(false);
    }
  }

  // Persist to localStorage
  React.useEffect(() => {
    try { localStorage.setItem('thw_q_step', step); } catch {}
  }, [step]);
  React.useEffect(() => {
    try { localStorage.setItem('thw_q_data', JSON.stringify(data)); } catch {}
  }, [data]);

  function set(key, val) {
    setData(d => ({ ...d, [key]: val }));
  }

  function navigate(dir) {
    if (transitioning) return;
    setAnimDir(dir);
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => Math.max(1, Math.min(Q_TOTAL, s + dir)));
      setTransitioning(false);
      try { window.scrollTo({ top: 0 }); } catch {}
    }, 180);
  }

  function canProceed() {
    switch (step) {
      case 1: return !!(data.prenom && data.email && data.objectif);
      case 2: return true; // heures_semaine has default
      case 3: return !!data.montre;
      case 4: return !!(data.type_coaching && data.sport && (data.type_coaching === 'pack' || data.duree_abo));
      case 5:
        if (data.sport === 'running')   return !!data.run_objectif;
        if (data.sport === 'cycling')   return !!data.velo_objectif;
        if (data.sport === 'triathlon') return !!data.tri_objectif;
        return false;
      case 6: return true;
      default: return true;
    }
  }

  function renderStep() {
    switch (step) {
      case 1: return <QStep1 data={data} set={set}/>;
      case 2: return <QStep2 data={data} set={set}/>;
      case 3: return <QStep3 data={data} set={set}/>;
      case 4: return <QStep4 data={data} set={set}/>;
      case 5:
        if (data.sport === 'running')   return <QStep5Running   data={data} set={set}/>;
        if (data.sport === 'cycling')   return <QStep5Cycling   data={data} set={set}/>;
        if (data.sport === 'triathlon') return <QStep5Triathlon data={data} set={set}/>;
        return (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontFamily: "'DM Sans', sans-serif" }}>
            Retourne à l'étape précédente pour sélectionner ton sport.
          </div>
        );
      case 6: return <QStep6 data={data} set={set}/>;
      case 7: return <QStep7 data={data}/>;
      default: return null;
    }
  }

  const step5Title = step === 5
    ? { running: 'Profil Running', cycling: 'Profil Cyclisme', triathlon: 'Profil Triathlon' }[data.sport] || 'Profil sportif'
    : Q_TITLES[step - 1];

  const stepTitles = [...Q_TITLES];
  stepTitles[4] = step === 5 ? step5Title : 'Profil sportif';

  const stepHints = [
    null,
    'On adapte ton coaching à ta vie, pas l\'inverse.',
    'On optimise ton programme selon ce que tu as.',
    null,
    'Dis-nous où tu en es pour qu\'on sache où t\'emmener.',
    'Personnalise ton accompagnement.',
    null,
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 44 }}>
          <a href="index.html" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-dim)',
            transition: 'color 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Retour
          </a>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(0,200,224,0.3)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>THW Coaching</span>
          </div>
        </div>

        {/* Progress */}
        <QProgressBar step={step} total={Q_TOTAL} titles={stepTitles}/>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.046), rgba(255,255,255,0.020))',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 20,
          padding: '40px 44px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.5), 0 0 40px rgba(0,200,224,0.05)',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? `translateY(${animDir * 10}px)` : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}>
          {/* Top stripe */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #00c8e0 30%, #5b6fff 70%, transparent)' }}/>

          {/* Step header */}
          {step < 7 && (
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#00c8e0', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                Étape {step}
              </div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: 'var(--text)' }}>
                {step5Title !== 'Profil sportif' && step === 5 ? step5Title : Q_TITLES[step - 1]}
              </h2>
              {stepHints[step - 1] && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
                  {stepHints[step - 1]}
                </p>
              )}
            </div>
          )}

          {/* Content */}
          {renderStep()}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, paddingTop: 26, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => step > 1 && navigate(-1)} style={{
              padding: '11px 22px', borderRadius: 10,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              color: step === 1 ? 'var(--text-dim)' : 'var(--text-mid)',
              cursor: step === 1 ? 'default' : 'pointer',
              opacity: step === 1 ? 0.3 : 1, transition: 'all 0.18s',
            }}>← Retour</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Required hint */}
              {!canProceed() && step < 7 && (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Champs requis *
                </span>
              )}

              {step < 7 ? (
                <button onClick={() => canProceed() && navigate(1)} disabled={!canProceed()} style={{
                  padding: '11px 28px', borderRadius: 10,
                  background: canProceed() ? 'linear-gradient(135deg,#00c8e0,#5b6fff)' : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  color: canProceed() ? '#fff' : 'var(--text-dim)',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  boxShadow: canProceed() ? '0 4px 20px rgba(0,200,224,0.32)' : 'none',
                  transition: 'all 0.18s',
                }}>
                  {step === 6 ? 'Voir le récapitulatif →' : 'Continuer →'}
                </button>
              ) : !submitted ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                  {sendError && (
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'#ef4444', maxWidth:280, textAlign:'right' }}>{sendError}</div>
                  )}
                  <button onClick={handleSubmit} disabled={sending} style={{
                    padding: '13px 32px', borderRadius: 12,
                    background: sending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                    border: 'none',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700,
                    color: sending ? 'var(--text-dim)' : '#fff',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    boxShadow: sending ? 'none' : '0 4px 24px rgba(0,200,224,0.42)',
                    transition: 'all 0.18s', display:'flex', alignItems:'center', gap:8,
                  }}>
                    {sending && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 1s linear infinite'}}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    )}
                    {sending ? 'Envoi en cours...' : 'Envoyer ma candidature →'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Submitted success overlay */}
        {submitted && step === 7 && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(7,11,15,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'qFadeIn 0.3s ease',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(0,200,224,0.45)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 14px', color: 'var(--text)' }}>
                Candidature envoyée !
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: 32 }}>
                Merci <strong style={{ color: 'var(--text)' }}>{data.prenom || 'Athlète'}</strong>. Tu recevras un email de confirmation sous{' '}
                <strong style={{ color: '#00c8e0' }}>24h</strong>. Ton appel découverte de{' '}
                <strong style={{ color: '#00c8e0' }}>30 minutes</strong> sera planifié rapidement.
              </p>
              <a href="index.html" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 12,
                background: 'linear-gradient(135deg,#00c8e0,#5b6fff)',
                color: '#fff', textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                boxShadow: '0 4px 20px rgba(0,200,224,0.38)',
              }}>
                ← Retour à l'accueil
              </a>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Tes données sont confidentielles et utilisées uniquement pour construire ton programme.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<QApp/>);
