/* ════════════════════════════════════════════════════════════════
   Decaform — page d'UNE épreuve (protocole, matériel, barème).
   Une page statique par épreuve (epreuve-<slug>.html, générée par scripts/seo/build.mjs) qui définit
   window.CAD_EPREUVE = { slug, key }. Les données viennent de /api/cadences/catalog (config des batteries).
   Lisible sans compte ; un compte n'est exigé que pour PASSER le test.
   Publie window.CadEpreuvePage.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var APP_URL = (typeof window !== 'undefined' && window.APP_URL) || 'https://thw-appli.vercel.app';
  // CadencesCharts.jsx (qui publie CadTr / CadT / CadUseLang) n'est pas chargé sur cette page : versions locales équivalentes.
  function lang() { try { return (window.THWLang && window.THWLang.getLang && window.THWLang.getLang()) || 'fr'; } catch (e) { return 'fr'; } }
  var tr = function (x) {
    if (window.CadTr) return window.CadTr(x);
    var l = lang(); if (l === 'fr') return x;
    var d = window.THW_I18N_DICT && window.THW_I18N_DICT[l];
    return (d && d[x]) || x;
  };
  var Tp = function (x, v) {
    if (window.CadT) return window.CadT(x, v);
    var s = tr(x);
    return v ? s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ''; }) : s;
  };
  function useLang() {
    var st = React.useState(0);
    React.useEffect(function () {
      if (!window.THWLang || !window.THWLang.onChange) return undefined;
      return window.THWLang.onChange(function () { st[1](function (n) { return n + 1; }); });
    }, []);
    return st[0];
  }

  function getJson(path) {
    function get(base) {
      var p = fetch(base + path).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); });
      return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 10000); })]);
    }
    return get('').catch(function () { return get(APP_URL); });
  }

  function fmt(v, unit) {
    if (v == null) return '—';
    if (unit === 's' && v >= 60) { var m = Math.floor(v / 60), s = Math.round(v - m * 60); return m + ':' + ('0' + s).slice(-2) + ' min'; }
    var n = Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return n + (unit ? ' ' + unit : '');
  }

  function Style() {
    return (
      <style>{`
        .ep-wrap { max-width: 920px; margin: 0 auto; padding: 104px 24px 80px; color: var(--text); }
        @media (max-width: 640px) { .ep-wrap { padding: 92px 16px 64px; } }
        .ep-crumb { font-family: var(--font-body); font-size: 13px; color: var(--text-dim); margin-bottom: 18px; }
        .ep-crumb a { color: var(--text-dim); text-decoration: none; }
        .ep-crumb a:hover { color: var(--text); text-decoration: underline; }
        .ep-h1 { font-family: var(--font-display); font-weight: 600; font-size: clamp(28px, 4.6vw, 42px); line-height: 1.1; margin: 6px 0 12px; color: var(--text); }
        .ep-lead { font-family: var(--font-body); font-size: 16.5px; line-height: 1.65; color: var(--text-mid); margin: 0 0 26px; max-width: 720px; }
        .ep-grid { display: grid; gap: 16px; }
        .ep-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px 22px; }
        .ep-card h2 { font-family: var(--font-display); font-weight: 600; font-size: 18px; margin: 0 0 10px; color: var(--text); }
        .ep-card p, .ep-card li { font-family: var(--font-body); font-size: 15px; line-height: 1.65; color: var(--text-mid); }
        .ep-card ul, .ep-card ol { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
        .ep-card .ep-sub { font-weight: 600; color: var(--text); margin: 0 0 4px; }
        .ep-tab { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: 14.5px; }
        .ep-tab th, .ep-tab td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text-mid); }
        .ep-tab th { color: var(--text-dim); font-weight: 600; font-size: 12.5px; }
        .ep-cta { display: flex; gap: 20px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .ep-cta p { margin: 0; max-width: 520px; }
        .ep-links { display: flex; flex-wrap: wrap; gap: 8px 16px; }
        .ep-links a { font-family: var(--font-body); font-size: 14px; color: var(--brand); text-decoration: none; }
        .ep-links a:hover { text-decoration: underline; }
        .ep-err { font-family: var(--font-body); font-size: 14px; color: var(--text); background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3); border-radius: var(--radius-sm); padding: 10px 12px; }
      `}</style>
    );
  }

  function CadEpreuvePage() {
    useLang();
    var cfg = window.CAD_EPREUVE || {};
    var s1 = React.useState(null), cat = s1[0], setCat = s1[1];
    var s2 = React.useState(null), list = s2[0], setList = s2[1];
    var s3 = React.useState(false), err = s3[0], setErr = s3[1];
    React.useEffect(function () {
      var dead = false;
      getJson('/api/cadences/catalog?test_key=' + encodeURIComponent(cfg.key || 'decaform'))
        .then(function (j) { if (!dead) setCat(j); }).catch(function () { if (!dead) setErr(true); });
      getJson('/api/cadences/epreuves').then(function (j) { if (!dead) setList(j.epreuves || []); }).catch(function () {});
      return function () { dead = true; };
    }, []);
    var H = window.SiteHeader, F = window.SiteFooter;
    var t = cat && (cat.tests || []).filter(function (x) { return x.slug === cfg.slug; })[0];
    var proto = (cat && cat.protocols && cat.protocols[cfg.slug]) || {};
    var key = cfg.key || 'decaform';
    var testHref = key === 'forme' ? 'test-de-forme.html' : key === 'decaform' ? 'cadences.html' : 'cadences.html?test=' + key;
    var same = (list || []).filter(function (e) { return t && e.group === t.group && e.slug !== t.slug; });
    return (
      <div>
        <Style/>
        {H ? <H active="cadences"/> : null}
        <main className="ep-wrap">
          <nav className="ep-crumb" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <a href="tests.html">Les tests</a>{t ? <span> / {t.group}</span> : null}</nav>
          {err ? <div className="ep-err" role="alert">Le serveur n’a pas répondu. Vérifie ta connexion, puis recharge la page.</div> : null}
          {t ? (
            <div>
              <div className="eyebrow">{t.group}</div>
              <h1 className="ep-h1">{t.name}</h1>
              {proto.objectif ? <p className="ep-lead">{proto.objectif}</p> : null}
              <div className="ep-grid">
                {proto.materiel && proto.materiel.length ? (
                  <section className="ep-card"><h2>Matériel</h2><ul>{proto.materiel.map(function (m, i) { return <li key={i}>{m}</li>; })}</ul></section>
                ) : null}
                {proto.etapes && proto.etapes.length ? (
                  <section className="ep-card"><h2>Comment faire</h2><ol>{proto.etapes.map(function (e, i) { return <li key={i}>{e}</li>; })}</ol></section>
                ) : null}
                {proto.warmup ? (
                  <section className="ep-card"><h2>Échauffement</h2><p className="ep-sub">{proto.warmup.titre}</p><p style={{ margin: 0 }}>{proto.warmup.texte}</p></section>
                ) : null}
                <section className="ep-card">
                  <h2>Ce qui est noté</h2>
                  {proto.saisie ? <p style={{ marginTop: 0 }}>{proto.saisie}</p> : null}
                  <p style={{ marginBottom: 0 }}>{t.direction === 'lower_is_better' ? 'Plus le résultat est bas, meilleur est le score.' : 'Plus le résultat est élevé, meilleur est le score.'} {Tp('Cette épreuve vaut {n} points.', { n: t.pts_max })}</p>
                </section>
                {t.male && t.female ? (
                  <section className="ep-card">
                    <h2>Barème de référence</h2>
                    <table className="ep-tab">
                      <thead><tr><th></th><th>Référence</th><th>Maximum</th></tr></thead>
                      <tbody>
                        <tr><td>Homme</td><td>{fmt(t.male.ref, t.unit)}</td><td>{fmt(t.male.max, t.unit)}</td></tr>
                        <tr><td>Femme</td><td>{fmt(t.female.ref, t.unit)}</td><td>{fmt(t.female.max, t.unit)}</td></tr>
                      </tbody>
                    </table>
                    <p style={{ margin: '10px 0 0', fontSize: 13.5 }}>Le niveau « Référence » donne 60 % des points de l’épreuve, le niveau « Maximum » 100 %. Les barèmes sont ajustés à l’âge dans le test complet.</p>
                  </section>
                ) : null}
                <section className="ep-card ep-cta">
                  <p>{Tp('Cette épreuve fait partie du test « {t} ». Un compte est nécessaire pour passer le test et enregistrer tes résultats.', { t: cat.title })}</p>
                  <a className="btn btn-cyan btn-lg" href={testHref}>Voir le test</a>
                </section>
                {same.length ? (
                  <section className="ep-card"><h2>{Tp('Autres épreuves du groupe « {g} »', { g: t.group })}</h2>
                    <div className="ep-links">{same.map(function (e) { return <a key={e.slug} href={e.file}>{e.name}</a>; })}</div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : (!err ? <div style={{ minHeight: 240 }}/> : null)}
        </main>
        {window.ArticleLinks ? <window.ArticleLinks slugs={epreuveArticles(cfg.slug)}/> : null}
        {F ? <F/> : null}
      </div>
    );
  }


  /* Articles liés à une épreuve : un article propre à la qualité mesurée, puis les articles de méthode. */
  function epreuveArticles(slug) {
    var s = String(slug || ''), own = [];
    if (/grip|hang|pullup/.test(s)) own = ['force-de-poigne', 'force-et-sante'];
    else if (/chair|up-and-go|stand|balance|flamingo|walk/.test(s)) own = ['se-lever-du-sol', 'le-corps-et-la-chaise'];
    else if (/pushup|plank|tap/.test(s)) own = ['pompes-et-coeur', 'force-et-sante'];
    else if (/jump|sprint|agility|shuttle|repeat/.test(s)) own = ['puissance-et-force', 'le-mouvement-des-jeunes'];
    else if (/run|row|swim|bike|navette|conditioning|burpees|circuit|mixed/.test(s)) own = ['cardio-et-longevite', 'dose-de-sport'];
    else if (/squat|bench|deadlift|clean|press|curl|rm/.test(s)) own = ['force-et-sante', 'puissance-et-force'];
    return own.concat(['lire-un-bareme', 'test-standardise-ou-ressenti', 'mesurer-pour-progresser']).slice(0, 3);
  }

  window.CadEpreuvePage = CadEpreuvePage;
})();
