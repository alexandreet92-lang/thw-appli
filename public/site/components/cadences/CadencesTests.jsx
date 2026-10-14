/* ════════════════════════════════════════════════════════════════
   Decaform — « Les tests » : la liste de toutes les batteries.
   Une carte par test (public, épreuves, jours, durée, répartition des qualités),
   filtre par public, lien vers la page de chaque test (cadences.html?test=<clé>).
   Les chiffres viennent de /api/cadences/products (config des batteries).
   Publie window.CadTestsPage (page entière) et window.CadTestsSection (encart).
   ════════════════════════════════════════════════════════════════ */
(function () {
  var APP_URL = (typeof window !== 'undefined' && window.APP_URL) || 'https://thw-appli.vercel.app';
  var AUDIENCES = [
    { key: 'all', label: 'Tous' },
    { key: 'enfants', label: 'Enfants' },
    { key: 'ados', label: 'Ados' },
    { key: 'adultes', label: 'Adultes' },
    { key: 'seniors', label: 'Seniors' },
  ];
  // Même couleur par qualité que le reste de Decaform (la lecture ne change pas d'une page à l'autre).
  var QCOLOR = { vitesse: '#f59e0b', force: '#ef4444', puissance: '#f97316', explosivite: '#eab308', endurance: '#22c55e', endurance_musculaire: '#84cc16', vo2max: '#06b6d4', coordination: '#a855f7' };

  function useProducts() {
    var s = React.useState(null); var data = s[0], setData = s[1];
    var e = React.useState(false); var err = e[0], setErr = e[1];
    var n = React.useState(0); var tries = n[0], setTries = n[1];
    React.useEffect(function () {
      var dead = false;
      function get(base) {
        var p = fetch(base + '/api/cadences/products').then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); });
        return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 10000); })]);
      }
      setErr(false);
      get('').catch(function () { return get(APP_URL); })
        .then(function (j) { if (!dead) setData(j.products || []); })
        .catch(function () { if (!dead) setErr(true); });
      return function () { dead = true; };
    }, [tries]);
    return { data: data, err: err, retry: function () { setData(null); setTries(function (t) { return t + 1; }); } };
  }

  /* Mini radar : les qualités du test, surface = part du score que chacune pèse. SVG brut, sans lib. */
  function MiniRadar(props) {
    var items = props.items || [];
    var n = items.length || 7;
    var size = 132, cx = size / 2, cy = size / 2, R = size / 2 - 8;
    var max = Math.max.apply(null, items.map(function (q) { return q.share; }).concat([0.01]));
    function pt(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)]; }
    var poly = items.map(function (q, i) { var p = pt(i, Math.max(0.12, q.share / max)); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var ring = function (f) { return items.map(function (_, i) { var p = pt(i, f); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
    return (
      <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img" aria-label="Répartition des qualités" style={{ flexShrink: 0 }}>
        {[0.5, 1].map(function (f) { return <polygon key={f} points={ring(f)} fill="none" stroke="var(--border-mid)" strokeWidth="1"/>; })}
        {items.map(function (_, i) { var p = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--border)" strokeWidth="1"/>; })}
        <polygon points={poly} fill="var(--brand)" fillOpacity="0.22" stroke="var(--brand)" strokeWidth="1.6" strokeLinejoin="round"/>
        {items.map(function (q, i) { var p = pt(i, Math.max(0.12, q.share / max)); return <circle key={q.key} cx={p[0]} cy={p[1]} r="2.6" fill={QCOLOR[q.key] || 'var(--brand)'}/>; })}
      </svg>
    );
  }

  function agesOf(c) { return c.ageMax >= 80 && c.ageMin >= 65 ? c.ageMin + ' ans et +' : (c.ageMax >= 80 ? c.ageMin + ' à ' + c.ageMax + ' ans' : c.ageMin + (c.ageMax === c.ageMin ? '' : '–' + c.ageMax) + ' ans'); }

  function Stat(props) {
    return (
      <div style={{ display: 'grid', gap: 1 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>{props.v}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)' }}>{props.l}</span>
      </div>
    );
  }

  function TestCard(props) {
    var c = props.p;
    var top = c.qualityShare.slice().sort(function (a, b) { return b.share - a.share; }).slice(0, 3);
    return (
      <a className="cad-testcard tilt" data-tilt="3" href={'cadences.html?test=' + encodeURIComponent(c.testKey)}>
        <div className="cad-testcard-top">
          <span className="cad-testcard-badge">{c.audienceLabel}</span>
          <span className="cad-testcard-go" aria-hidden="true">→</span>
        </div>
        <div className="cad-testcard-title">{c.title}</div>
        <p className="cad-testcard-tag">{c.tagline}</p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <MiniRadar items={c.qualityShare}/>
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Stat v={c.totalTests} l="épreuves"/>
              <Stat v={c.testDays} l={c.testDays > 1 ? 'jours de test' : 'jour de test'}/>
              <Stat v={c.totalPoints} l="points"/>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text)' }}>{c.perDay}</strong> par séance
              <br/>Surtout : {top.map(function (q) { return q.label.toLowerCase(); }).join(', ')}
            </div>
          </div>
        </div>
        <div className="cad-testcard-foot">Voir le test · {agesOf(c)}</div>
      </a>
    );
  }

  function CardsGrid(props) {
    var list = props.list;
    return (
      <div className="cad-testgrid">
        {list.map(function (p) { return <TestCard key={p.testKey} p={p}/>; })}
      </div>
    );
  }

  function Loading(props) {
    if (props.err) {
      return (
        <div className="cad-err" role="alert" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Le serveur n’a pas répondu. Vérifie ta connexion, puis réessaie.</span>
          <button type="button" className="cad-link" onClick={props.retry}>Réessayer</button>
        </div>
      );
    }
    return <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-dim)', padding: '30px 0' }}>Chargement des tests…</div>;
  }

  function TestsStyle() {
    return (
      <style>{`
        .cad-testgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 18px; }
        .cad-testcard { display: grid; gap: 12px; align-content: start; text-decoration: none; color: var(--text); background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 8px 28px rgba(8,20,40,.07); transition: border-color .18s, box-shadow .18s, transform .18s; }
        html.dark .cad-testcard { box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.25); }
        .cad-testcard:hover { border-color: var(--brand); box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 12px 34px rgba(0,200,224,.16); }
        .cad-testcard:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .cad-testcard-top { display: flex; justify-content: space-between; align-items: center; }
        .cad-testcard-badge { font-family: var(--font-mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--brand); background: rgba(0,200,224,.1); border-radius: 999px; padding: 4px 10px; }
        .cad-testcard-go { font-size: 18px; color: var(--text-dim); transition: transform .18s, color .18s; }
        .cad-testcard:hover .cad-testcard-go { transform: translateX(4px); color: var(--brand); }
        .cad-testcard-title { font-family: var(--font-display); font-weight: 600; font-size: 24px; line-height: 1.15; }
        .cad-testcard-tag { margin: 0; font-family: var(--font-body); font-size: 14px; line-height: 1.55; color: var(--text-mid); }
        .cad-testcard-foot { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--brand); padding-top: 10px; border-top: 1px solid var(--border); }
        .cad-tfilter { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 26px; }
        .cad-tfilter button { font-family: var(--font-body); font-size: 13.5px; font-weight: 600; padding: 9px 16px; cursor: pointer; border-radius: 999px; color: var(--text); background: var(--bg-card); border: 1px solid var(--border-mid); transition: all .15s; }
        .cad-tfilter button[aria-pressed="true"] { color: #fff; background: var(--brand-gradient); border-color: transparent; box-shadow: 0 3px 14px rgba(0,200,224,.3); }
        @media (prefers-reduced-motion: reduce) { .cad-testcard, .cad-testcard-go { transition: none; } }
      `}</style>
    );
  }

  /* Page entière « Les tests ». */
  function CadTestsPage() {
    var pr = useProducts();
    var f = React.useState('all'); var filter = f[0], setFilter = f[1];
    var list = (pr.data || []).filter(function (p) { return filter === 'all' || p.audience === filter; });
    var present = {}; (pr.data || []).forEach(function (p) { present[p.audience] = true; });
    return (
      <div>
        <CadStyleLite/><TestsStyle/>
        <SiteHeader active="cadences"/>
        <main className="cad-wrap">
          <div className="cad-hero">
            <div className="eyebrow">Les tests</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(30px,5vw,46px)', lineHeight: 1.1, margin: '6px 0 12px', color: 'var(--text)' }}>Un test pour chaque âge.</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.65, color: 'var(--text-mid)', margin: 0 }}>
              Même méthode partout : un score sur 1000, des qualités physiques mesurées une à une et un niveau pour chacune. Les épreuves, le matériel et les barèmes s’adaptent à l’âge. Choisis le tien pour voir le détail.
            </p>
          </div>
          <div className="cad-tfilter" role="group" aria-label="Filtrer par public">
            {AUDIENCES.filter(function (a) { return a.key === 'all' || present[a.key]; }).map(function (a) {
              return <button key={a.key} type="button" aria-pressed={filter === a.key} onClick={function () { setFilter(a.key); }}>{a.label}</button>;
            })}
          </div>
          {!pr.data ? <Loading err={pr.err} retry={pr.retry}/> : <CardsGrid list={list}/>}
        </main>
        <SiteFooter/>
      </div>
    );
  }

  /* Encart pour la page Découvrir : quelques cartes + bouton vers la liste complète. */
  function CadTestsSection() {
    var pr = useProducts();
    return (
      <div>
        <TestsStyle/>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div className="eyebrow center">Les tests</div>
          <h2 className="st-h2">Un test pour chaque âge.</h2>
          <p className="st-lede" style={{ margin: '0 auto' }}>Enfants, ados, adultes, seniors : la même méthode, des épreuves adaptées.</p>
        </div>
        {!pr.data ? <Loading err={pr.err} retry={pr.retry}/> : <CardsGrid list={pr.data}/>}
        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <a className="btn btn-cyan btn-lg mag" href="tests.html">Voir tous les tests</a>
        </div>
      </div>
    );
  }

  /* Styles de base de la page (cad-wrap, cad-hero, cad-err, cad-link) quand CadencesApp n'est pas chargé. */
  function CadStyleLite() {
    return (
      <style>{`
        .cad-wrap { max-width: min(1460px, 94vw); margin: 0 auto; padding: 104px 24px 80px; color: var(--text); }
        @media (max-width: 640px) { .cad-wrap { max-width: 100%; padding: 92px 16px 64px; } }
        .cad-hero { max-width: 820px; }
        .cad-err { font-family: var(--font-body); font-size: 13px; color: var(--text); background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3); border-radius: var(--radius-sm); padding: 10px 12px; }
        .cad-link { background: none; border: none; padding: 0; cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--brand); }
      `}</style>
    );
  }

  window.CadTestsPage = CadTestsPage;
  window.CadTestsSection = CadTestsSection;
})();
