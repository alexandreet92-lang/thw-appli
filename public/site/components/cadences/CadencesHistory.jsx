/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — Mon historique / Progression.
   Lit les instantanés de tests (score total, scores par qualité et par
   épreuve) + le profil (poids, âge) + les conditions (température, météo,
   intérieur/extérieur). Graphiques SVG maison (aucune lib).
   Publie window.CadHistory.
   Blocs : tri, courbe du score, tableau triable, progression par qualité,
   records personnels, comparateur, encart « lire avec prudence ».
   ════════════════════════════════════════════════════════════════ */
(function () {
  var MONTHS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function frNum(v, dec) { var n = Number(v); if (!isFinite(n)) return '—'; return (dec ? n.toFixed(dec) : String(Math.round(n))).replace('.', ','); }
  function dOf(iso) { return new Date(String(iso).slice(0, 10) + 'T12:00:00'); }
  function frDate(iso) { var d = dOf(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function shortDate(iso) { var d = dOf(iso); return MONTHS[d.getMonth()].replace('.', '') + ' ' + String(d.getFullYear()).slice(2); }
  function levelColor(cat, lv) { return (cat.palette && cat.palette[lv]) || '#9ca3af'; }
  // Conditions non renseignées (ex. test antérieur à la fonctionnalité) → « — ».
  function hasCond(e) { return e && e.tempC != null; }
  function condLabel(e) { return hasCond(e) ? (e.outdoor ? (frNum(e.tempC) + ' °C · ' + (e.weatherLabel || '')) : 'Intérieur · ' + frNum(e.tempC) + ' °C') : '—'; }
  // Lieu + météo pour la colonne « Conditions » (la température a sa propre colonne).
  function condVenue(e) { return hasCond(e) ? (e.outdoor ? ('Extérieur · ' + (e.weatherLabel || '')) : 'Intérieur') : '—'; }

  // Écart de température au-delà duquel on signale un test (⚠) : seulement un GROS
  // écart peut fausser la comparaison (12 vs 20 °C → non ; 15 vs 30 °C → oui).
  var TEMP_FLAG = 12;
  function flagVs(e, ref) {
    if (!ref || e.id === ref.id) return false;
    if (e.outdoor && ref.outdoor && e.tempC != null && ref.tempC != null && Math.abs(e.tempC - ref.tempC) >= TEMP_FLAG) return true;
    return false;
  }

  function Badge(props) {
    return <span className={'cad-hbadge' + (props.warn ? ' is-warn' : '')}>{props.children}</span>;
  }

  function HistStyle() {
    return (
      <style>{`
        .cad-hsort { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 14px 0 18px; }
        .cad-hsort label { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text-mid); }
        .cad-hsel { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--text); background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: 10px; padding: 8px 12px; cursor: pointer; }
        .cad-hbadge { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; color: var(--text-mid); background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px; }
        .cad-hbadge.is-warn { color: #b45309; background: rgba(245,158,11,.14); border-color: rgba(245,158,11,.4); }
        html.dark .cad-hbadge.is-warn { color: #fcd34d; }
        .cad-htable-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cad-htable { width: 100%; border-collapse: collapse; min-width: 640px; }
        .cad-htable th { font-family: var(--font-body); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border-mid); white-space: nowrap; }
        .cad-htable td { font-family: var(--font-body); font-size: 13px; color: var(--text); padding: 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .cad-htable tbody tr { cursor: pointer; }
        .cad-htable tbody tr:hover { background: var(--bg-card-2); }
        .cad-htable .num { font-family: var(--font-mono); }
        .cad-hscore { font-family: var(--font-display); font-weight: 800; font-size: 16px; }
        .cad-hlvl { display: inline-block; font-family: var(--font-body); font-size: 11.5px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
        .cad-hq { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; margin-top: 12px; }
        .cad-hq-card { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
        .cad-hq-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .cad-hq-top b { font-family: var(--font-body); font-size: 13px; font-weight: 700; color: var(--text); }
        .cad-hq-d { font-family: var(--font-display); font-weight: 800; font-size: 14px; }
        .cad-hq-foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px; font-family: var(--font-body); font-size: 11px; color: var(--text-dim); }
        .cad-hpr { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px 18px; margin-top: 12px; }
        .cad-hpr-row { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); }
        .cad-hpr-n { font-family: var(--font-body); font-size: 12.5px; color: var(--text); font-weight: 600; }
        .cad-hpr-n span { display: block; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-dim); }
        .cad-hpr-v { text-align: right; }
        .cad-hpr-v b { font-family: var(--font-display); font-weight: 800; font-size: 15px; color: var(--brand); }
        .cad-hpr-v span { display: block; font-family: var(--font-body); font-size: 10px; color: var(--text-dim); }
        .cad-hcmp-head { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; margin: 4px 0 14px; }
        .cad-hcmp-side { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
        .cad-hcmp-side b { font-family: var(--font-display); font-weight: 800; font-size: 22px; display: block; }
        .cad-hcmp-side em { font-style: normal; font-family: var(--font-body); font-size: 12px; color: var(--text-mid); }
        .cad-hcmp-vs { font-family: var(--font-display); font-weight: 800; color: var(--text-dim); font-size: 14px; }
        .cad-hcmp-q { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--border); font-family: var(--font-body); font-size: 13px; }
        .cad-hcmp-q b { font-family: var(--font-display); font-weight: 800; }
        .cad-hnote { border-left: 4px solid #f59e0b; }
        .cad-hdelta-up { color: #22c55e; } .cad-hdelta-dn { color: #ef4444; } .cad-hdelta-eq { color: var(--text-dim); }
      `}</style>
    );
  }

  function deltaStr(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + frNum(Math.abs(v)); }
  function deltaCls(v) { return v > 0 ? 'cad-hdelta-up' : v < 0 ? 'cad-hdelta-dn' : 'cad-hdelta-eq'; }

  function CadHistory(props) {
    var cat = props.catalog;
    var hist = (props.history || []).slice().sort(function (a, b) { return dOf(a.date) - dOf(b.date); }); // chronologique
    var byRecent = hist.slice().reverse();
    var latest = byRecent[0];
    var qualities = cat.qualities || [];
    var tests = cat.tests || [];

    var so = React.useState('recent'); var sort = so[0], setSort = so[1];
    var ca = React.useState(latest ? latest.id : null); var cmpA = ca[0], setCmpA = ca[1];
    var cb = React.useState(hist[0] ? hist[0].id : null); var cmpB = cb[0], setCmpB = cb[1];

    if (!hist.length) {
      return (
        <div className="cad-run">
          <button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button>
          <div className="cad-act-eye" style={{ marginTop: 14 }}>Mon historique</div>
          <h1 className="cad-act-t" style={{ fontSize: 30 }}>Pas encore de test</h1>
          <p className="cad-p">Réalise ton premier test CADENCES : il s'affichera ici, et chaque nouveau test viendra nourrir tes courbes de progression.</p>
          <button type="button" className="thw-btn-primary" onClick={props.onStart}>Démarrer un test</button>
        </div>
      );
    }

    function colorOf(e) { return levelColor(cat, e.level); }

    // Tri du tableau.
    var extraCol = null; // { title, val(e)->string, raw(e)->number }
    if (sort.indexOf('test:') === 0) {
      var tslug = sort.slice(5); var tdef = tests.filter(function (t) { return t.slug === tslug; })[0];
      extraCol = { title: tdef ? tdef.name.replace(/\s*\(.*\)$/, '') : tslug,
        val: function (e) { var r = e.tests[tslug]; return r ? (frNum(r.points) + ' / ' + (r.max != null ? r.max : (tdef ? tdef.pts_max : '?'))) : '—'; },
        raw: function (e) { var r = e.tests[tslug]; return r ? r.points : -1; } };
    } else if (sort.indexOf('q:') === 0) {
      var qkey = sort.slice(2); var qdef = qualities.filter(function (q) { return q.key === qkey; })[0];
      extraCol = { title: qdef ? qdef.label : qkey,
        val: function (e) { var r = e.qualities[qkey]; return r ? (frNum(r.pct * 100) + ' %') : '—'; },
        raw: function (e) { var r = e.qualities[qkey]; return r ? r.pct : -1; } };
    }
    var rows = hist.slice();
    if (sort === 'recent') rows = byRecent;
    else if (sort === 'old') rows = hist.slice();
    else if (sort === 'best') rows.sort(function (a, b) { return b.score - a.score; });
    else if (extraCol) rows.sort(function (a, b) { return extraCol.raw(b) - extraCol.raw(a); });

    // Points de la courbe (chronologique).
    var tpoints = hist.map(function (e) {
      return { label: shortDate(e.date), score: e.score, level: e.level, color: colorOf(e),
        sub: frNum(e.weight) + ' kg · ' + condLabel(e), flag: flagVs(e, latest) };
    });

    // Affichage d'une valeur d'épreuve : fourni (maquette) ou formaté depuis la
    // valeur brute + l'unité du catalogue via le formateur du site.
    function fmtVal(t, r) {
      if (r.display) return r.display;
      var v = r.value != null ? r.value : r.valueUsed;
      if (v == null) return '—';
      var F = window.CadencesFormat;
      return F && F.formatValue ? F.formatValue(t, v) : String(v);
    }
    // Records personnels : meilleur résultat par épreuve (plus de points).
    var prs = tests.map(function (t) {
      var best = null, bestE = null;
      hist.forEach(function (e) { var r = e.tests[t.slug]; if (r && (best === null || r.points > best.points)) { best = r; bestE = e; } });
      return best ? { slug: t.slug, name: t.name.replace(/\s*\(.*\)$/, ''), display: fmtVal(t, best), date: bestE.date, points: best.points, max: best.max != null ? best.max : t.pts_max, level: best.level } : null;
    }).filter(Boolean);

    var ea = hist.filter(function (e) { return e.id === cmpA; })[0] || latest;
    var eb = hist.filter(function (e) { return e.id === cmpB; })[0] || hist[0];

    var Lcell = function (lv) { return <span className="cad-hlvl" style={{ color: levelColor(cat, lv), background: levelColor(cat, lv) + '22' }}>{lv}</span>; };

    return (
      <div className="cad-run">
        <HistStyle />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="cad-act-eye">Mon historique CADENCES</div>
            <h1 className="cad-act-t" style={{ fontSize: 30 }}>{hist.length} test{hist.length > 1 ? 's' : ''} · progression</h1>
          </div>
          <button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button>
        </div>
        <p className="cad-p" style={{ marginTop: 6 }}>Depuis {frDate(hist[0].date)}. Compare tes résultats dans le temps — et garde en tête que les conditions comptent.</p>

        {/* Tri global */}
        <div className="cad-hsort">
          <label htmlFor="cad-hsort-sel">Trier les tests par</label>
          <select id="cad-hsort-sel" className="cad-hsel" value={sort} onChange={function (e) { setSort(e.target.value); }}>
            <optgroup label="Général">
              <option value="recent">Plus récent</option>
              <option value="old">Plus ancien</option>
              <option value="best">Meilleur score global</option>
            </optgroup>
            <optgroup label="Meilleur sur une épreuve">
              {tests.map(function (t) { return <option key={t.slug} value={'test:' + t.slug}>{t.name.replace(/\s*\(.*\)$/, '')}</option>; })}
            </optgroup>
            <optgroup label="Meilleur sur une qualité">
              {qualities.map(function (q) { return <option key={q.key} value={'q:' + q.key}>{q.label}</option>; })}
            </optgroup>
          </select>
        </div>

        {/* ① Courbe du score global */}
        <section className="cad-card">
          <h3 className="cad-h3">Score global dans le temps</h3>
          <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Survole un point pour voir le détail. ⚠ = conditions assez différentes du dernier test.</p>
          {window.CadTrendLine ? <window.CadTrendLine points={tpoints} max={cat.totalPoints} levels={cat.levels} palette={cat.palette} /> : null}
        </section>

        {/* ② Tableau de tous les tests */}
        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Tous tes tests</h3>
          <div className="cad-htable-wrap">
            <table className="cad-htable">
              <thead><tr>
                <th>Date</th><th>Score</th><th>Palier</th><th>Poids</th><th>Âge</th><th>🌡️ Temp.</th><th>Conditions</th>
                {extraCol ? <th>{extraCol.title}</th> : null}<th></th>
              </tr></thead>
              <tbody>
                {rows.map(function (e) {
                  return (
                    <tr key={e.id} onClick={function () { props.onOpen && props.onOpen(e.id); }}>
                      <td>{frDate(e.date)} {flagVs(e, latest) ? <Badge warn>⚠</Badge> : null}</td>
                      <td><span className="cad-hscore" style={{ color: colorOf(e) }}>{e.score}</span><span className="num" style={{ color: 'var(--text-dim)', fontSize: 11 }}> / {cat.totalPoints}</span></td>
                      <td>{Lcell(e.level)}</td>
                      <td className="num">{frNum(e.weight)} kg</td>
                      <td className="num">{e.age}</td>
                      <td className="num">{e.tempC != null ? frNum(e.tempC) + ' °C' : '—'}</td>
                      <td>{condVenue(e)}</td>
                      {extraCol ? <td className="num" style={{ fontWeight: 700 }}>{extraCol.val(e)}</td> : null}
                      <td style={{ color: 'var(--brand)', fontWeight: 700 }}>→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ③ Progression par qualité */}
        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Progression par qualité</h3>
          <div className="cad-hq">
            {qualities.map(function (q) {
              var series = hist.map(function (e) { return (e.qualities[q.key] ? e.qualities[q.key].pct : 0) * 100; });
              var d = series[series.length - 1] - series[0];
              var lastLv = latest.qualities[q.key] ? latest.qualities[q.key].level : 'Sédentaire';
              var col = levelColor(cat, lastLv);
              return (
                <div key={q.key} className="cad-hq-card">
                  <div className="cad-hq-top"><b>{q.label}</b><span className={'cad-hq-d ' + deltaCls(d)}>{deltaStr(Math.round(d))}</span></div>
                  {window.CadSparkline ? <window.CadSparkline values={series} color={col} aria={q.label} /> : null}
                  <div className="cad-hq-foot"><span>{frNum(series[0])} %</span><span style={{ color: col, fontWeight: 700 }}>{frNum(series[series.length - 1])} % · {lastLv}</span></div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ④ Records personnels */}
        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Tes records personnels</h3>
          <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Le meilleur résultat atteint sur chaque épreuve, tous tests confondus.</p>
          <div className="cad-hpr">
            {prs.map(function (p) {
              return (
                <div key={p.slug} className="cad-hpr-row">
                  <div className="cad-hpr-n">{p.name}<span>{frDate(p.date)}</span></div>
                  <div className="cad-hpr-v"><b>{p.display}</b><span>{frNum(p.points)} / {p.max} · {p.level}</span></div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ⑤ Comparateur */}
        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Comparer deux tests</h3>
          <div className="cad-hcmp-head">
            <div className="cad-hcmp-side">
              <select className="cad-hsel" style={{ marginBottom: 8, width: '100%' }} value={cmpA} onChange={function (e) { setCmpA(e.target.value); }}>
                {byRecent.map(function (e) { return <option key={e.id} value={e.id}>{frDate(e.date)}</option>; })}
              </select>
              <b style={{ color: colorOf(ea) }}>{ea.score}</b>
              <em>{ea.level} · {frNum(ea.weight)} kg · {condLabel(ea)}</em>
            </div>
            <div className="cad-hcmp-vs">vs</div>
            <div className="cad-hcmp-side">
              <select className="cad-hsel" style={{ marginBottom: 8, width: '100%' }} value={cmpB} onChange={function (e) { setCmpB(e.target.value); }}>
                {byRecent.map(function (e) { return <option key={e.id} value={e.id}>{frDate(e.date)}</option>; })}
              </select>
              <b style={{ color: colorOf(eb) }}>{eb.score}</b>
              <em>{eb.level} · {frNum(eb.weight)} kg · {condLabel(eb)}</em>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span className="cad-p" style={{ margin: 0 }}>Écart total</span>
            <b className={'cad-hq-d ' + deltaCls(ea.score - eb.score)} style={{ fontSize: 22 }}>{deltaStr(ea.score - eb.score)} pts</b>
            {flagVs(ea, eb) ? <Badge warn>⚠ conditions différentes</Badge> : null}
          </div>
          {qualities.map(function (q) {
            var va = ea.qualities[q.key] ? ea.qualities[q.key].pct * 100 : 0;
            var vb = eb.qualities[q.key] ? eb.qualities[q.key].pct * 100 : 0;
            return <div key={q.key} className="cad-hcmp-q"><span>{q.label}</span><b className={deltaCls(va - vb)}>{deltaStr(Math.round(va - vb))} pts</b></div>;
          })}
        </section>

        {/* ⑥ Encart prudence */}
        <section className="cad-card cad-hnote" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Lire ses résultats avec prudence</h3>
          <p className="cad-p" style={{ marginBottom: 0 }}>Un score plus bas ne veut pas forcément dire que tu as régressé. Pour comparer juste : <strong>même période de l'année, en bonne forme, ni blessé ni malade, et une température proche</strong>. Les tests réalisés dans des conditions assez différentes sont signalés par un ⚠.</p>
        </section>
      </div>
    );
  }

  window.CadHistory = CadHistory;
})();
