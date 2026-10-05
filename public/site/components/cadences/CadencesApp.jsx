/* ════════════════════════════════════════════════════════════════
   CADENCES — le test physique SUR LE SITE (public/site).
   Présentation → démarrer → saisie J1→J12 + score en direct → clôture →
   résultats. Compte du site (THWAccount), appels /api/cadences/* en
   same-origin (cookies). Design du site (Syne/DM Sans/DM Mono, cyan).
   Publie window.CadencesPage.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var F = function () { return window.CadencesFormat; };

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(path, opts);
  }
  function levelColor(palette, level) { return (palette && palette[level]) || '#9ca3af'; }
  function frDate(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return iso; }
  }
  var QK = ['vitesse', 'force', 'puissance', 'explosivite', 'endurance', 'vo2max', 'coordination'];

  // ── Styles propres à CADENCES (le reste vient de colors_and_type.css / site.css) ──
  function CadStyle() {
    return (
      <style>{`
        .cad-wrap { max-width: 920px; margin: 0 auto; padding: 104px 20px 80px; color: var(--text); }
        .cad-input, .cad-select {
          width: 100%; box-sizing: border-box; padding: 11px 13px;
          font-family: var(--font-mono); font-size: 16px; color: var(--text);
          background: var(--input-bg); border: 1px solid var(--border-mid);
          border-radius: var(--radius-sm); outline: none; transition: border-color .15s, box-shadow .15s;
        }
        .cad-select { font-family: var(--font-body); font-size: 14px; padding: 9px 11px; }
        .cad-input:focus, .cad-select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(0,200,224,.18); }
        .cad-input::placeholder { color: var(--text-dim); }
        /* Cartes : bordure + ombre nettes pour ressortir en clair ET sombre. */
        .cad-card { background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 8px 28px rgba(8,20,40,.07); }
        html.dark .cad-card { box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.25); }
        .cad-seg { display: inline-flex; gap: 2px; padding: 3px; background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-btn); }
        .cad-seg button { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 7px 14px; border: none; border-radius: 8px; cursor: pointer; color: var(--text-mid); background: transparent; transition: all .15s; }
        .cad-seg button[aria-pressed="true"] { color: #fff; background: var(--brand-gradient); }
        .cad-chiprow { display: flex; gap: 8px; overflow-x: auto; padding: 14px 0; -webkit-overflow-scrolling: touch; }
        .cad-chip { display: grid; gap: 2px; place-items: center; min-width: 94px; padding: 9px 10px; background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-md); text-decoration: none; color: var(--text); }
        .cad-chip.rest { opacity: .55; }
        .cad-pill { flex: 1; padding: 12px 14px; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; color: var(--text); background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-btn); transition: all .15s; }
        .cad-pill[aria-pressed="true"] { color: #fff; background: var(--brand-gradient); border-color: transparent; box-shadow: 0 3px 14px rgba(0,200,224,.3); }
        .cad-link { background: none; border: none; padding: 0; cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--brand); }
        .cad-proto { display: grid; gap: 6px; font-family: var(--font-body); font-size: 12.5px; line-height: 1.55; color: var(--text-mid); border-left: 2px solid var(--brand); padding-left: 12px; }
        .cad-proto strong { color: var(--text); }
        .cad-err { font-family: var(--font-body); font-size: 13px; color: var(--text); background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3); border-radius: var(--radius-sm); padding: 10px 12px; }
        .cad-feature { background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        /* Contenu riche */
        .cad-section { margin-top: 60px; }
        .cad-note-level { margin-top: 18px; font-family: var(--font-body); font-size: 13px; line-height: 1.55; color: var(--text-mid); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-left: 3px solid var(--brand); border-radius: var(--radius-sm); padding: 11px 14px; }
        .cad-note-level strong { color: var(--text); }
        .cad-badge-ex { position: absolute; top: 14px; right: 14px; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-dim); background: var(--bg-hover); border: 1px solid var(--border-mid); border-radius: 999px; padding: 3px 10px; }
        .cad-preview-grid { display: grid; grid-template-columns: minmax(180px, 220px) 1fr; gap: 28px; align-items: center; }
        .cad-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cad-table { width: 100%; border-collapse: collapse; }
        .cad-table th { font-family: var(--font-body); font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); font-weight: 600; text-align: right; padding: 8px 10px; border-bottom: 1px solid var(--border-mid); white-space: nowrap; }
        .cad-table td { text-align: right; padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--text-mid); font-family: var(--font-mono); font-size: 12.5px; white-space: nowrap; }
        .cad-table tbody tr:hover { background: var(--bg-hover); }
        .cad-table-sm th, .cad-table-sm td { padding: 6px 8px; font-size: 11.5px; }
        .cad-h3 { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text); margin: 0 0 10px; }
        .cad-p { font-family: var(--font-body); font-size: 13.5px; line-height: 1.6; color: var(--text-mid); margin: 0 0 10px; }
        .cad-p strong { color: var(--text); }
        .cad-ul { margin: 0; padding-left: 18px; font-family: var(--font-body); font-size: 13px; line-height: 1.65; color: var(--text-mid); display: grid; gap: 5px; }
        .cad-ul strong { color: var(--text); }
        .cad-warn { border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.07); }
        @media (max-width: 640px) { .cad-preview-grid, .cad-two { grid-template-columns: 1fr !important; } .cad-preview-grid { justify-items: center; } }
      `}</style>
    );
  }

  // ════════════════ ORCHESTRATEUR ════════════════
  function CadencesPage() {
    var account = window.THWAccount.useAccount();
    var loggedIn = !!(account && account.loggedIn !== false && (account.email || account.firstName || account.id));
    var st = React.useState('loading'); var view = st[0], setView = st[1];
    var cat = React.useState(null); var catalog = cat[0], setCatalog = cat[1];
    var cp = React.useState([]); var campaigns = cp[0], setCampaigns = cp[1];
    var rp = React.useState(null); var report = rp[0], setReport = rp[1];
    var md = React.useState('general'); var mode = md[0], setMode = md[1];
    var er = React.useState(null); var error = er[0], setError = er[1];

    // Catalogue (public) — avec délai de garde + bouton Réessayer (plus de « Loading » infini).
    function loadCatalog() {
      setError(null);
      var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 12000); });
      var req = api('/api/cadences/catalog').then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
      Promise.race([req, timeout])
        .then(function (j) { setCatalog(j); })
        .catch(function () { setError('Le serveur n’a pas répondu. Vérifie ta connexion, puis réessaie.'); });
    }
    React.useEffect(loadCatalog, []);

    // Campagnes de l'utilisateur dès qu'on connaît l'état de connexion.
    React.useEffect(function () {
      if (account === undefined) return;      // pas encore résolu
      if (!loggedIn) { setView('intro'); return; }
      api('/api/cadences/campaign').then(function (r) { return r.ok ? r.json() : { campagnes: [] }; })
        .then(function (j) {
          var list = (j && j.campagnes) || [];
          setCampaigns(list);
          var cur = list.filter(function (c) { return c.status === 'in_progress'; })[0];
          if (cur) { loadReport(cur.id, 'test'); }
          else { setView('intro'); }
        }).catch(function () { setView('intro'); });
    }, [account]);

    function loadReport(id, nextView) {
      return api('/api/cadences/report?campaignId=' + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) { setReport(j); if (nextView) setView(nextView); } return j; });
    }
    function reload() { return report && report.campaign ? loadReport(report.campaign.id) : Promise.resolve(); }

    if (!catalog) {
      return (
        <div><CadStyle/><SiteHeader active="cadences"/>
          <main className="cad-wrap">
            {error ? (
              <div className="cad-card" style={{ textAlign: 'center', maxWidth: 440, margin: '40px auto' }}>
                <div className="t-h2">Chargement impossible</div>
                <p className="cad-p" style={{ margin: '10px 0 16px' }}>{error}</p>
                <button type="button" className="thw-btn-primary" onClick={loadCatalog}>Réessayer</button>
              </div>
            ) : <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-mid)' }}>Chargement…</p>}
          </main>
          <SiteFooter/>
        </div>
      );
    }

    var body;
    if (view === 'start') {
      body = <CadStart catalog={catalog} onCreated={function (id) { loadReport(id, 'test'); }} onCancel={function () { setView('intro'); }}/>;
    } else if (view === 'test' && report) {
      body = <CadTest catalog={catalog} report={report} mode={mode} setMode={setMode} reload={reload}
                      onHome={function () { setView('intro'); }}
                      onClosed={function () { reload().then(function () { setView('results'); }); }}/>;
    } else if (view === 'results' && report) {
      body = <CadResults catalog={catalog} report={report} mode={mode} setMode={setMode} onBack={function () { setView('intro'); }}/>;
    } else {
      body = <CadIntro catalog={catalog} loggedIn={loggedIn} campaigns={campaigns}
                       onStart={function () { setView('start'); }}
                       onResume={function (id) { loadReport(id, 'test'); }}
                       onOpenResults={function (id) { loadReport(id, 'results'); }}/>;
    }

    return (
      <div>
        <CadStyle/>
        <SiteHeader active="cadences"/>
        <main className="cad-wrap">
          {error ? <div className="cad-err" role="alert" style={{ marginBottom: 16 }}>{error}</div> : null}
          {body}
        </main>
        <SiteFooter/>
      </div>
    );
  }

  // ════════════════ INTRO / PRÉSENTATION ════════════════
  function CadIntro(props) {
    var cat = props.catalog;
    var enCours = (props.campaigns || []).filter(function (c) { return c.status === 'in_progress'; })[0];
    var terminees = (props.campaigns || []).filter(function (c) { return c.status === 'completed'; });
    return (
      <div>
        <div className="t-label" style={{ color: 'var(--brand)' }}>Test de condition générale</div>
        <h1 className="t-display" style={{ margin: '10px 0 0' }}>CADENCES</h1>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18, lineHeight: 1.4, margin: '14px 0 0', color: 'var(--text)' }}>
          Mesurez vraiment où vous en êtes, physiquement — et suivez vos progrès chaque année.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-mid)', margin: '14px 0 0' }}>
          {cat.totalTests} épreuves réparties sur 12 jours (course, force, haltérophilie, natation, vélo, Hyrox).
          Un score sur {cat.totalPoints} et un niveau par qualité, en barème général ou ajusté à votre âge. Réservé aux 18 à 80 ans.
        </p>
        <div className="cad-note-level">
          <strong>Pour qui ?</strong> Un test exigeant de condition générale, conçu pour des <strong>pratiquants réguliers ayant déjà un certain niveau</strong> — ce n'est pas un test pour débuter.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 22 }}>
          <Feature t="7 qualités" d={cat.qualities.map(function (q) { return q.label; }).join(', ') + '.'}/>
          <Feature t="12 jours" d="Un protocole fixe, à refaire à l'identique d'une année sur l'autre."/>
          <Feature t="Matériel" d="Stade/piste, salle de muscu, piscine, vélo avec capteur, barre de traction."/>
        </div>

        <div style={{ marginTop: 28 }}>
          {!props.loggedIn ? (
            <div className="cad-card">
              <div className="t-h2">Connecte-toi pour passer le test</div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 14px' }}>
                Tes résultats sont enregistrés sur ton compte pour suivre ta progression. Gratuit.
              </p>
              <a className="thw-btn-primary" href={'compte.html?next=' + encodeURIComponent('cadences.html')}>Se connecter / créer un compte</a>
            </div>
          ) : enCours ? (
            <div className="cad-card">
              <div className="t-h2">Un test est en cours</div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 14px' }}>
                Démarré le {frDate(enCours.started_on)} · barème {enCours.scale_sex === 'M' ? 'homme' : 'femme'}, {enCours.age_at_start} ans, {Math.round(enCours.body_weight_kg)} kg.
              </p>
              <button type="button" className="thw-btn-primary" onClick={function () { props.onResume(enCours.id); }}>Reprendre le test →</button>
            </div>
          ) : (
            <button type="button" className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 20px' }} onClick={props.onStart}>Démarrer le test</button>
          )}
        </div>

        {terminees.length ? (
          <div style={{ marginTop: 28 }}>
            <div className="t-h2" style={{ marginBottom: 10 }}>Mes passages</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {terminees.map(function (c) {
                return (
                  <button key={c.id} type="button" onClick={function () { props.onOpenResults(c.id); }}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: 'left',
                                   background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', cursor: 'pointer', color: 'var(--text)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{frDate(c.completed_on || c.started_on)}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)' }}>{c.scale_sex === 'M' ? 'H' : 'F'} · {c.age_at_start} ans · {Math.round(c.body_weight_kg)} kg →</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {window.CadContent.preview(cat)}
        {window.CadContent.qualities(cat)}
        {window.CadContent.protocol(cat)}
        {window.CadContent.bareme(cat)}
        {window.CadContent.scoreExplain(cat)}
        {window.CadContent.transparence(cat)}
        {window.CadContent.warnings(cat)}

        <div className="cad-section" style={{ textAlign: 'center' }}>
          {!props.loggedIn
            ? <a className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }} href={'compte.html?next=' + encodeURIComponent('cadences.html')}>Se connecter pour passer le test</a>
            : <button type="button" className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }} onClick={props.onStart}>Démarrer le test</button>}
        </div>
      </div>
    );
  }
  function Feature(props) {
    return (
      <div className="cad-feature">
        <div className="t-h3" style={{ fontSize: 15 }}>{props.t}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-mid)', marginTop: 5 }}>{props.d}</div>
      </div>
    );
  }

  // ════════════════ DÉMARRAGE ════════════════
  function CadStart(props) {
    var sx = React.useState(null); var sex = sx[0], setSex = sx[1];
    var ag = React.useState(''); var age = ag[0], setAge = ag[1];
    var pd = React.useState(''); var poids = pd[0], setPoids = pd[1];
    var cs = React.useState(false); var consent = cs[0], setConsent = cs[1];
    var bz = React.useState(false); var busy = bz[0], setBusy = bz[1];
    var er = React.useState(null); var err = er[0], setErr = er[1];

    function go() {
      setErr(null);
      if (!sex) return setErr('Choisis le barème (homme / femme).');
      var a = Number(age), p = Number(poids);
      if (!isFinite(a) || a < 18 || a > 80) return setErr('Âge requis : réservé aux 18 à 80 ans.');
      if (!isFinite(p) || p < 30 || p > 250) return setErr('Poids de corps requis (30 à 250 kg).');
      setBusy(true);
      api('/api/cadences/campaign', { method: 'POST', body: JSON.stringify({ sex: sex, scaleSex: sex, age: a, bodyWeightKg: p, shareForCalibration: consent }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) { setErr((res.j && res.j.erreur) || 'Impossible de démarrer.'); setBusy(false); return; }
          props.onCreated(res.j.id);
        }).catch(function () { setErr('Erreur réseau.'); setBusy(false); });
    }

    return (
      <div>
        <button type="button" className="cad-link" onClick={props.onCancel}>← Retour</button>
        <h1 className="t-h1" style={{ margin: '10px 0 0' }}>Démarrer un nouveau test</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)', margin: '8px 0 20px' }}>
          Ton sexe, ton âge et ton poids de corps servent au barème. Ils restent privés.
        </p>
        <div className="cad-card" style={{ display: 'grid', gap: 16 }}>
          <div>
            <div className="t-label" style={{ color: 'var(--text-mid)', marginBottom: 8 }}>Barème</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="cad-pill" aria-pressed={sex === 'M'} onClick={function () { setSex('M'); }}>Homme</button>
              <button type="button" className="cad-pill" aria-pressed={sex === 'F'} onClick={function () { setSex('F'); }}>Femme</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="t-label" style={{ color: 'var(--text-mid)', marginBottom: 8 }}>Âge</div>
              <input className="cad-input" inputMode="numeric" value={age} placeholder="ex. 32" onChange={function (e) { setAge(e.target.value); }} aria-label="Âge"/>
            </div>
            <div>
              <div className="t-label" style={{ color: 'var(--text-mid)', marginBottom: 8 }}>Poids de corps (kg)</div>
              <input className="cad-input" inputMode="decimal" value={poids} placeholder="ex. 78" onChange={function (e) { setPoids(e.target.value); }} aria-label="Poids de corps"/>
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={function (e) { setConsent(e.target.checked); }} style={{ marginTop: 3 }}/>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
              J’accepte que mes résultats anonymisés servent à affiner les barèmes (optionnel, révocable).
            </span>
          </label>
          {err ? <div className="cad-err" role="alert">{err}</div> : null}
          <button type="button" className="thw-btn-primary" style={{ justifySelf: 'start', fontSize: 15, padding: '12px 20px', opacity: busy ? .6 : 1 }} disabled={busy} onClick={go}>
            {busy ? 'Démarrage…' : 'Démarrer le test'}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════ COMMUN ════════════════
  function ModeToggle(props) {
    return (
      <div className="cad-seg">
        <button type="button" aria-pressed={props.mode === 'general'} onClick={function () { props.setMode('general'); }}>Général</button>
        <button type="button" aria-pressed={props.mode === 'age'} onClick={function () { props.setMode('age'); }}>Ajusté à l’âge</button>
      </div>
    );
  }
  function Sel(props) {
    return (
      <label style={{ display: 'grid', gap: 3 }}>
        <span className="t-label" style={{ color: 'var(--text-dim)', fontSize: 10.5 }}>{props.label}</span>
        <select className="cad-select" value={props.value} onChange={function (e) { props.onChange(e.target.value); }}>
          {props.options.map(function (o) { return <option key={o[0]} value={o[0]}>{o[1]}</option>; })}
        </select>
      </label>
    );
  }
  function qualityItemsFrom(catalog, score) {
    return catalog.qualities.map(function (q) {
      var s = (score && score.byQuality && score.byQuality[q.key]) || {};
      var level = s.level || 'Faible';
      return { key: q.key, label: q.label, pct: s.pct || 0, level: level, color: levelColor(catalog.palette, level) };
    });
  }

  // ════════════════ TABLEAU DE BORD / SAISIE ════════════════
  function partCountOf(t) { return t.partCount || 1; }
  function parsePart(t, s) {
    if (!String(s == null ? '' : s).trim()) return null;
    if (t.unit === 's') return F().parseDuration(s);
    var n = Number(String(s).replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function aggDraft(t, d) {
    if (t.isAmrap) {
      var tours = Number(d.parts[0]);
      if (!String(d.parts[0] || '').trim() || !isFinite(tours)) return null;
      var pr = Number(d.partialReps || 0);
      return tours + (isFinite(pr) ? pr : 0) / 35;
    }
    var parsed = (d.parts || []).map(function (p) { return parsePart(t, p); }).filter(function (v) { return v != null; });
    if (!parsed.length) return null;
    if (partCountOf(t) === 1) return parsed[0];
    return F().aggregate(t, parsed);
  }
  function pad(a, n) { var o = a.slice(0, n); while (o.length < n) o.push(''); return o; }
  function emptyDraft(t) {
    return {
      parts: new Array(partCountOf(t)).fill(''), partialReps: '',
      equipment: t.equipmentField === 'chaussures' ? 'normales' : t.equipmentField === 'ceinture' ? 'sans' : null,
      timing: t.hasTiming ? 'manuel' : null, pool: t.hasPool ? 25 : null, variant: t.hasVariant ? 'box' : null,
    };
  }
  function draftFromResult(t, r) {
    var base = emptyDraft(t);
    var parts = (r.raw_parts && r.raw_parts.length) ? r.raw_parts.map(String) : (r.raw_value != null ? [String(r.raw_value)] : base.parts);
    return {
      parts: t.isAmrap ? [parts[0] || ''] : pad(parts, partCountOf(t)),
      partialReps: t.isAmrap ? (parts[1] != null ? String(parts[1]) : '') : '',
      equipment: r.equipment || base.equipment, timing: r.timing_method || base.timing,
      pool: r.pool_length_m || base.pool, variant: r.variant || base.variant,
    };
  }

  function CadTest(props) {
    var cat = props.catalog, rep = props.report;
    var camp = rep.campaign;
    var results = rep.results || [];
    var score = (rep.scores && rep.scores[props.mode]) || { total: 0, globalLevel: 'Faible', byQuality: {}, byTest: {} };
    var resultBySlug = {}; results.forEach(function (r) { resultBySlug[r.test_slug] = r; });

    var ds = React.useState(function () {
      var m = {};
      cat.tests.forEach(function (t) { var r = resultBySlug[t.slug]; m[t.slug] = r ? draftFromResult(t, r) : emptyDraft(t); });
      return m;
    });
    var drafts = ds[0], setDrafts = ds[1];
    var er = React.useState(null); var err = er[0], setErr = er[1];
    var bz = React.useState(false); var closing = bz[0], setClosing = bz[1];

    function setDraft(slug, patch) {
      setDrafts(function (d) { var n = Object.assign({}, d); n[slug] = Object.assign({}, d[slug], patch); return n; });
    }
    function put(payload) {
      return api('/api/cadences/result', { method: 'PUT', body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) { return r.json().then(function (j) { setErr((j && j.erreur) || 'Enregistrement impossible.'); return false; }); } return true; })
        .catch(function () { setErr('Erreur réseau.'); return false; });
    }
    function validate(t) {
      setErr(null);
      var d = drafts[t.slug];
      var value = aggDraft(t, d);
      if (value == null || value <= 0) { setErr(t.name + ' : saisis une valeur valide.'); return; }
      if (t.aggregate === 'sum' && d.parts.some(function (p) { return !String(p || '').trim(); })) { setErr(t.name + ' : renseigne les ' + partCountOf(t) + ' passages.'); return; }
      var rawParts = t.isAmrap ? [Number(d.parts[0]), Number(d.partialReps || 0)]
        : (partCountOf(t) > 1 ? d.parts.map(function (p) { return parsePart(t, p); }).filter(function (v) { return v != null; }) : null);
      put({ campaignId: camp.id, slug: t.slug, value: value, rawParts: rawParts, status: 'validated', equipment: d.equipment, variant: d.variant, timingMethod: d.timing, poolLength: d.pool })
        .then(function (ok) { if (ok) props.reload(); });
    }
    function skip(t, reason) {
      setErr(null);
      put({ campaignId: camp.id, slug: t.slug, status: 'skipped', skipReason: reason }).then(function (ok) { if (ok) props.reload(); });
    }
    function clear(t) {
      setErr(null);
      api('/api/cadences/result', { method: 'DELETE', body: JSON.stringify({ campaignId: camp.id, slug: t.slug }) })
        .then(function (r) { if (r.ok) { setDraft(t.slug, emptyDraft(t)); props.reload(); } else setErr('Impossible d’effacer.'); });
    }
    function close() {
      if (!window.confirm('Clôturer le test ? Les saisies seront figées et ton score définitif calculé.')) return;
      setClosing(true); setErr(null);
      api('/api/cadences/campaign/close', { method: 'POST', body: JSON.stringify({ campaignId: camp.id }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) { if (!res.ok) { setErr((res.j && res.j.erreur) || 'Clôture impossible.'); setClosing(false); return; } props.onClosed(); })
        .catch(function () { setErr('Erreur réseau.'); setClosing(false); });
    }

    var validated = results.filter(function (r) { return r.status === 'validated'; }).length;
    var gColor = levelColor(cat.palette, score.globalLevel);
    var testsByDay = function (day) { return cat.tests.filter(function (t) { return t.day === day; }).sort(function (a, b) { return a.order_in_day - b.order_in_day; }); };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h1 className="t-h1" style={{ margin: 0 }}>Mon test CADENCES</h1>
          <button type="button" className="cad-link" onClick={props.onHome}>← Accueil</button>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: '8px 0 0' }}>
          Barème {camp.scale_sex === 'M' ? 'homme' : 'femme'} · {camp.age_at_start} ans · {Math.round(camp.body_weight_kg)} kg. Saisis chaque épreuve dès qu’elle est faite ; tu peux corriger jusqu’à la clôture.
        </p>

        <section className="cad-card" style={{ marginTop: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div className="t-h2">Où j’en suis</div>
            <ModeToggle mode={props.mode} setMode={props.setMode}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 210px) 1fr', gap: 24, alignItems: 'center' }} className="cad-score-grid">
            <CadScoreDonut total={score.total} totalMax={cat.totalPoints} level={score.globalLevel} color={gColor} size={180}/>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>{validated} / {cat.totalTests} épreuves validées. Score indicatif tant que des épreuves manquent.</div>
              <CadQualityRings items={qualityItemsFrom(cat, score)}/>
            </div>
          </div>
          {validated > 0 ? <button type="button" className="thw-btn-primary" style={{ justifySelf: 'start', opacity: closing ? .6 : 1 }} disabled={closing} onClick={close}>{closing ? 'Clôture…' : 'Clôturer mon test'}</button> : null}
          {err ? <div className="cad-err" role="alert">{err}</div> : null}
        </section>

        <nav className="cad-chiprow" aria-label="Jours du test">
          {cat.days.map(function (d) {
            var tests = testsByDay(d.day);
            var done = tests.filter(function (t) { return resultBySlug[t.slug] && resultBySlug[t.slug].status === 'validated'; }).length;
            return (
              <a key={d.day} className={'cad-chip' + (d.rest ? ' rest' : '')} href={d.rest ? undefined : '#cad-jour-' + d.day}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>J{d.day}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap' }}>{d.label}</span>
                {d.rest ? null : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: done === tests.length ? levelColor(cat.palette, 'Solide') : 'var(--text-mid)' }}>{done}/{tests.length}</span>}
              </a>
            );
          })}
        </nav>

        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-mid)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <strong style={{ color: 'var(--text)' }}>Échauffement général.</strong> {cat.echauffement}
        </p>

        <div style={{ display: 'grid', gap: 24, marginTop: 16 }}>
          {cat.days.map(function (d) {
            return (
              <section key={d.day} id={'cad-jour-' + d.day} style={{ scrollMarginTop: 80 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                  <span className="t-h2">Jour {d.day}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>{d.label}</span>
                </div>
                {d.rest ? (
                  <div className="cad-card" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>Jour de repos — fait partie du protocole. Pas d’épreuve.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {testsByDay(d.day).map(function (t) {
                      var sc = (score.byTest && score.byTest[t.slug]) || null;
                      return <CadTestCard key={t.slug} t={t} draft={drafts[t.slug]} setDraft={function (p) { setDraft(t.slug, p); }}
                                          result={resultBySlug[t.slug]} score={sc} proto={cat.protocols[t.slug]}
                                          palette={cat.palette} bodyWeight={camp.body_weight_kg}
                                          hyroxTable={cat.hyroxThrusterKg} sex={camp.scale_sex}
                                          onValidate={function () { validate(t); }} onSkip={function (reason) { skip(t, reason); }} onClear={function () { clear(t); }}/>;
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <style>{`@media (max-width: 620px){ .cad-score-grid{ grid-template-columns: 1fr !important; justify-items:center; } }`}</style>
      </div>
    );
  }

  function placeholderFor(t) {
    switch (t.unit) { case 's': return 'm:ss ou s'; case 'm': return 'mètres'; case 'kg': return 'kg'; case 'W': return 'watts'; case 'tours': return 'nombre de tours'; default: return ''; }
  }

  function CadTestCard(props) {
    var t = props.t, d = props.draft || emptyDraft(props.t), r = props.result, sc = props.score, proto = props.proto;
    var sp = React.useState(false); var showProto = sp[0], setShowProto = sp[1];
    var sk = React.useState(false); var skipping = sk[0], setSkipping = sk[1];
    var sr = React.useState(''); var skipReason = sr[0], setSkipReason = sr[1];
    var n = partCountOf(t);
    var validated = r && r.status === 'validated';
    var skipped = r && r.status === 'skipped';
    var agg = aggDraft(t, d);
    var derived = agg != null ? F().derivedData(t, agg, props.bodyWeight) : [];
    var scColor = sc ? levelColor(props.palette, sc.level) : 'var(--border)';
    var hyroxKg = null;
    if (t.slug === 'hyrox_circuit' && props.hyroxTable) {
      var hr = props.hyroxTable[props.sex] || [];
      for (var hi = 0; hi < hr.length; hi++) { var hb = hr[hi]; if (props.bodyWeight >= hb.lo && (hb.hi == null || props.bodyWeight < hb.hi)) { hyroxKg = hb.kg; break; } }
    }

    return (
      <div className="cad-card" style={{ display: 'grid', gap: 12, borderColor: validated ? scColor : 'var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="t-h3" style={{ fontSize: 15 }}>{t.name}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{t.group} · {t.pts_max} pts max{proto && proto.flag ? ' · protocole en relecture' : ''}</div>
          </div>
          {validated && sc ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: scColor, whiteSpace: 'nowrap' }}>{Math.round(sc.points)} pts · {sc.level}</span>
          ) : skipped ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)' }}>Non passée</span> : null}
        </div>

        {hyroxKg != null ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text)', background: 'var(--bg-card-2)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '8px 11px' }}>
            <strong>Thrusters : {hyroxKg} kg</strong> · box {props.sex === 'F' ? '40' : '60'} cm · 12 burpees box jump (ta tranche de poids)
          </div>
        ) : null}

        {proto ? (
          <div>
            <button type="button" className="cad-link" onClick={function () { setShowProto(!showProto); }}>{showProto ? 'Masquer le protocole' : 'Voir le protocole'}</button>
            {showProto ? (
              <div>
                <div className="cad-proto" style={{ marginTop: 8 }}>
                  <div><strong>Objectif.</strong> {proto.objectif}</div>
                  <div><strong>Matériel.</strong> {proto.materiel.join(', ')}.</div>
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 2 }}>{proto.etapes.map(function (s, i) { return <li key={i}>{s}</li>; })}</ol>
                  {proto.securite ? <div><strong>Sécurité.</strong> {proto.securite}</div> : null}
                  {proto.echauffementSpecifique ? <div><strong>Échauffement spécifique.</strong> {proto.echauffementSpecifique}</div> : null}
                  {proto.allure ? <div><strong>Allure.</strong> {proto.allure}</div> : null}
                  {proto.box ? <div><strong>Box.</strong> {proto.box}</div> : null}
                  <div><strong>À saisir.</strong> {proto.saisie}</div>
                </div>
                {proto.diagram ? <CadDiagram name={proto.diagram} /> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: n > 1 ? 'repeat(auto-fit, minmax(84px, 1fr))' : '1fr', gap: 8 }}>
            {new Array(n).fill(0).map(function (_, i) {
              return (
                <div key={i}>
                  {n > 1 ? <div className="t-label" style={{ color: 'var(--text-dim)', fontSize: 10.5, marginBottom: 4 }}>{t.aggregate === 'sum' ? 'Passage ' + (i + 1) : 'Essai ' + (i + 1)}</div> : null}
                  <input className="cad-input" inputMode={t.unit === 's' ? 'text' : 'decimal'} placeholder={placeholderFor(t)}
                         value={d.parts[i] || ''} aria-label={t.name + ' valeur ' + (i + 1)}
                         onChange={function (e) { var parts = d.parts.slice(); parts[i] = e.target.value; props.setDraft({ parts: parts }); }}/>
                </div>
              );
            })}
          </div>

          {t.isAmrap ? (
            <div>
              <div className="t-label" style={{ color: 'var(--text-dim)', fontSize: 10.5, marginBottom: 4 }}>Répétitions du tour en cours (optionnel)</div>
              <input className="cad-input" inputMode="numeric" placeholder="ex. 12" value={d.partialReps} onChange={function (e) { props.setDraft({ partialReps: e.target.value }); }} aria-label="Répétitions partielles"/>
            </div>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {t.equipmentField === 'chaussures' ? <Sel label="Chaussures" value={d.equipment || 'normales'} onChange={function (v) { props.setDraft({ equipment: v }); }} options={[['normales', 'Normales'], ['pointes', 'Pointes']]}/> : null}
            {t.equipmentField === 'ceinture' ? <Sel label="Ceinture" value={d.equipment || 'sans'} onChange={function (v) { props.setDraft({ equipment: v }); }} options={[['sans', 'Sans'], ['ceinture', 'Avec ceinture']]}/> : null}
            {t.hasTiming ? <Sel label="Chrono" value={d.timing || 'manuel'} onChange={function (v) { props.setDraft({ timing: v }); }} options={[['manuel', 'Manuel'], ['cellules', 'Cellules'], ['montre', 'Montre']]}/> : null}
            {t.hasPool ? <Sel label="Bassin" value={String(d.pool || 25)} onChange={function (v) { props.setDraft({ pool: Number(v) }); }} options={[['25', '25 m'], ['50', '50 m']]}/> : null}
            {t.hasVariant ? <Sel label="Burpee" value={d.variant || 'box'} onChange={function (v) { props.setDraft({ variant: v }); }} options={[['box', 'Box jump'], ['plate', 'To plate']]}/> : null}
          </div>

          {derived.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontFamily: 'var(--font-body)', fontSize: 12 }}>
              {derived.map(function (dd, i) { return <span key={i} style={{ color: 'var(--text-mid)' }}>{dd.label} : <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{dd.value}</strong></span>; })}
            </div>
          ) : null}

          {skipping ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <input className="cad-input" placeholder="Pourquoi non passée ? (blessure, matériel…)" value={skipReason} onChange={function (e) { setSkipReason(e.target.value); }} aria-label="Motif"/>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="thw-btn-ghost" onClick={function () { props.onSkip(skipReason); setSkipping(false); }}>Confirmer « non passée »</button>
                <button type="button" className="thw-btn-ghost" onClick={function () { setSkipping(false); }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="thw-btn-primary" onClick={props.onValidate}>{validated ? 'Mettre à jour' : 'Valider'}</button>
              {!validated && !skipped ? <button type="button" className="thw-btn-ghost" onClick={function () { setSkipping(true); }}>Passer</button> : null}
              {validated || skipped ? <button type="button" className="thw-btn-ghost" onClick={props.onClear}>Effacer</button> : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════ RÉSULTATS ════════════════
  function CadResults(props) {
    var cat = props.catalog, rep = props.report, camp = rep.campaign;
    var score = (rep.scores && rep.scores[props.mode]) || null;
    var rawBySlug = {}; (rep.results || []).forEach(function (r) { rawBySlug[r.test_slug] = r.raw_value; });

    if (!score) {
      return <div><h1 className="t-h1">Résultats CADENCES</h1><p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-mid)' }}>Aucun score figé pour cette campagne.</p><button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button></div>;
    }
    var gColor = levelColor(cat.palette, score.globalLevel);
    var tests = cat.tests.filter(function (t) { return score.byTest && score.byTest[t.slug]; })
      .sort(function (a, b) { return (score.byTest[b.slug].pct) - (score.byTest[a.slug].pct); });

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="t-label" style={{ color: 'var(--brand)' }}>Résultats</div>
            <h1 className="t-h1" style={{ margin: '6px 0 0' }}>CADENCES</h1>
          </div>
          <button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: '8px 0 0' }}>
          {camp.completed_on ? 'Clôturé le ' + frDate(camp.completed_on) : 'Démarré le ' + frDate(camp.started_on)} · barème {camp.scale_sex === 'M' ? 'homme' : 'femme'} · {camp.age_at_start} ans · {Math.round(camp.body_weight_kg)} kg.
        </p>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ModeToggle mode={props.mode} setMode={props.setMode}/>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)' }}>{props.mode === 'general' ? 'Barème général (21–35 ans).' : 'Barème ajusté à l’âge (tranche ' + camp.age_band + ').'}</span>
        </div>

        <section className="cad-card" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: 24, alignItems: 'center' }} >
          <CadScoreDonut total={score.total} totalMax={cat.totalPoints} level={score.globalLevel} color={gColor} size={196}/>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="t-h3" style={{ fontSize: 15 }}>Par qualité</div>
            <CadQualityRings items={qualityItemsFrom(cat, score)}/>
          </div>
        </section>

        <section className="cad-card" style={{ marginTop: 16, display: 'grid', placeItems: 'center' }}>
          <div className="t-h3" style={{ fontSize: 15, justifySelf: 'start' }}>Profil des 7 qualités</div>
          <CadRadar items={qualityItemsFrom(cat, score)} color={gColor} size={320}/>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 className="t-h2">Détail par épreuve</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: '6px 0 0' }}>De ton point fort à ton point faible. Repères à 60 % (Référence) et 100 % (Max).</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {tests.map(function (t) {
              var s = score.byTest[t.slug];
              var raw = rawBySlug[t.slug];
              var col = levelColor(cat.palette, s.level);
              return (
                <div key={t.slug} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{raw != null ? F().formatValue(t, raw) + ' · ' : ''}{Math.round(s.points)} / {t.pts_max} pts</span>
                  </div>
                  <CadTestBar pct={s.pct} color={col}/>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: col }}>{s.level} · {Math.round(s.pct * 100)} %</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  window.CadencesPage = CadencesPage;
  window.__cadHelpers = { api: api, levelColor: levelColor, frDate: frDate };
})();
