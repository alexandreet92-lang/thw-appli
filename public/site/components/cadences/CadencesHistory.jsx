/* ════════════════════════════════════════════════════════════════
   Decaform (site) — Mon historique / Progression.
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
  function loc() { return window.CadLocale ? window.CadLocale() : 'fr-FR'; }
  function frDate(iso) { var d = dOf(iso); if (loc() !== 'fr-FR') return d.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function shortDate(iso) { var d = dOf(iso); if (loc() !== 'fr-FR') return d.toLocaleDateString(loc(), { month: 'short', year: '2-digit' }).replace('.', ''); return MONTHS[d.getMonth()].replace('.', '') + ' ' + String(d.getFullYear()).slice(2); }
  function levelColor(cat, lv) { return (cat.palette && cat.palette[lv]) || '#9ca3af'; }
  // Conditions non renseignées (ex. test antérieur à la fonctionnalité) → « — ».
  function hasCond(e) { return e && e.tempC != null; }
  function trw(s) { return window.CadTr ? window.CadTr(s) : s; }
  function condLabel(e) { return hasCond(e) ? (e.outdoor ? (frNum(e.tempC) + ' °C · ' + trw(e.weatherLabel || '')) : trw('Intérieur') + ' · ' + frNum(e.tempC) + ' °C') : '—'; }
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
        .cad-hcmp-q { display: grid; grid-template-columns: 1fr 64px 64px; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--border); font-family: var(--font-body); font-size: 13px; align-items: baseline; }
        .cad-hcmp-q b { font-family: var(--font-display); font-weight: 800; text-align: right; }
        .cad-hcmp-q.is-head { border-bottom: 1px solid var(--border-mid); }
        .cad-hcmp-q.is-head b, .cad-hcmp-q.is-head span { font-family: var(--font-body); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); }
        .cad-hyr-bars { width: 100%; height: auto; display: block; margin: 6px 0 4px; }
        .cad-hyr-bars text { font-family: var(--font-mono); font-size: 11px; fill: var(--text-dim); }
        .cad-hyr-bars .v { font-family: var(--font-display); font-weight: 800; font-size: 13px; fill: var(--text); }
        .cad-hmx td, .cad-hmx th { white-space: nowrap; }
        .cad-hmx tbody tr { cursor: pointer; }
        .cad-hmx tbody tr.is-on td { background: var(--bg-card-2); }
        .cad-hmx td small { display: block; font-family: var(--font-body); font-size: 10.5px; color: var(--text-dim); }
        .cad-bt-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; margin: 12px 0; }
        .cad-bt-seg { display: inline-flex; border: 1px solid var(--border-mid); border-radius: 999px; overflow: hidden; background: var(--bg-card-2); }
        .cad-bt-seg button { border: 0; background: transparent; color: var(--text-mid); font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 7px 14px; cursor: pointer; }
        .cad-bt-seg button[aria-pressed="true"] { background: var(--brand); color: #fff; }
        .cad-bt-csv { border: 1px solid var(--border-mid); background: var(--bg-card-2); color: var(--text); border-radius: 999px; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 7px 14px; cursor: pointer; margin-left: auto; }
        .cad-bt-csv:hover, .cad-bt-csv:focus-visible { border-color: var(--brand); color: var(--brand); outline: none; }
        .cad-bt-wrap { overflow: auto; max-height: min(78vh, 760px); border: 1px solid var(--border); border-radius: var(--radius-md); }
        .cad-bt-wrap:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .cad-bt-table { border-collapse: separate; border-spacing: 0; width: max-content; min-width: 100%; font-family: var(--font-body); font-size: 12.5px; }
        .cad-bt-table th, .cad-bt-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); background: var(--bg-card); white-space: nowrap; text-align: left; vertical-align: middle; }
        .cad-bt-table thead th { position: sticky; top: 0; z-index: 2; background: var(--bg-card-2); font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--text-dim); }
        .cad-bt-table thead tr.cad-bt-grp th { top: 0; text-align: center; border-left: 1px solid var(--border); color: var(--text-mid); }
        .cad-bt-table thead tr:nth-child(2) th { top: 34px; }
        .cad-bt-th button, .cad-bt-grp button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
        .cad-bt-th button:focus-visible, .cad-bt-grp button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
        .cad-bt-th i, .cad-bt-grp i { font-style: normal; font-size: 9px; opacity: .45; }
        .cad-bt-th.is-on i, .cad-bt-grp i { opacity: 1; }
        .cad-bt-th.is-on { color: var(--brand); }
        .cad-bt-sticky { position: sticky; left: 0; z-index: 1; box-shadow: 1px 0 0 var(--border); }
        .cad-bt-table thead th.cad-bt-sticky { z-index: 3; }
        .cad-bt-table tbody tr { cursor: pointer; }
        .cad-bt-table tbody tr:hover td { background: var(--bg-card-2); }
        .cad-bt-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .cad-bt-table td.is-best { box-shadow: inset 0 -2px 0 #f59e0b; font-weight: 700; }
        .cad-bt-cell { line-height: 1.25; }
        .cad-bt-cell small { display: block; font-size: 10.5px; color: var(--text-dim); font-weight: 400; }
        .cad-bt-main { font-weight: 700; }
        .cad-bt-na { color: var(--text-dim); }
        .cad-bt-act { text-align: center; }
        .cad-bt-del { border: 1px solid var(--border-mid); background: transparent; color: var(--text-mid); border-radius: 8px; width: 32px; height: 32px; display: inline-grid; place-items: center; cursor: pointer; }
        .cad-bt-del:hover, .cad-bt-del:focus-visible { color: #ef4444; border-color: #ef4444; outline: none; }
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
    // Épreuves d'anciennes versions (absentes du catalogue servi) : conservées en colonnes, marquées « ancienne version ».
    var legacy = (props.legacyTests || []).map(function (t) { return Object.assign({}, t, { legacy: true }); });
    var tests = (cat.tests || []).concat(legacy);

    var btS = React.useState({ key: 'date', dir: 'desc' }); var bt = btS[0], setBt = btS[1];
    var bmS = React.useState('general'); var bmode = bmS[0], setBmode = bmS[1];
    var bvS = React.useState('points'); var bview = bvS[0], setBview = bvS[1];
    var dlS = React.useState(null); var delTarget = dlS[0], setDelTarget = dlS[1];
    var ca = React.useState(latest ? latest.id : null); var cmpA = ca[0], setCmpA = ca[1];
    var cb = React.useState(hist[0] ? hist[0].id : null); var cmpB = cb[0], setCmpB = cb[1];
    var ytS = React.useState(null); var ytSel = ytS[0], setYtSel = ytS[1];
    var ysS = React.useState('recent'); var ySort = ysS[0], setYSort = ysS[1];

    if (!hist.length) {
      return (
        <div className="cad-run">
          <button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button>
          <div className="cad-act-eye" style={{ marginTop: 14 }}>Mon historique</div>
          <h1 className="cad-act-t" style={{ fontSize: 30 }}>Pas encore de test</h1>
          <p className="cad-p">Réalise ton premier test Decaform : il s'affichera ici, et chaque nouveau test viendra nourrir tes courbes de progression.</p>
          <button type="button" className="thw-btn-primary" onClick={props.onStart}>Démarrer un test</button>
        </div>
      );
    }

    function colorOf(e) { return levelColor(cat, e.level); }

    // Points des deux courbes (chronologique) : général + ajusté à l'âge.
    function colorOfA(e) { return levelColor(cat, e.levelA); }
    var tpoints = hist.map(function (e) {
      return { label: shortDate(e.date), score: e.score, level: e.level, color: colorOf(e),
        sub: frNum(e.weight) + ' kg · ' + condLabel(e), flag: flagVs(e, latest) };
    });
    var tpoints2 = hist.map(function (e) {
      return { label: shortDate(e.date), score: e.scoreA != null ? e.scoreA : e.score, level: e.levelA || e.level, color: colorOfA(e) };
    });
    var hasA = hist.some(function (e) { return e.scoreA != null && e.scoreA !== e.score; });

    // Affichage d'une valeur d'épreuve : fourni (maquette) ou formaté depuis la
    // valeur brute + l'unité du catalogue via le formateur du site.
    function fmtVal(t, r) {
      if (r.display) return r.display;
      var v = r.value != null ? r.value : r.valueUsed;
      if (v == null) return '—';
      var F = window.CadencesFormat;
      // valueUsed = valeur normalisée du moteur : ratio au poids de corps (charges) ou W/kg (vélo).
      if (t.kind === 'ratio' && F && F.formatRatio) return F.formatRatio(t, v);
      return F && F.formatValue ? F.formatValue(t, v) : String(v);
    }
    // Records personnels : meilleur résultat par épreuve (plus de points).
    var prs = tests.map(function (t) {
      var best = null, bestE = null;
      hist.forEach(function (e) { var r = e.tests[t.slug]; if (r && (best === null || r.points > best.points)) { best = r; bestE = e; } });
      return best ? { slug: t.slug, name: t.name.replace(/\s*\(.*\)$/, ''), display: fmtVal(t, best), date: bestE.date, points: best.points, max: best.max != null ? best.max : t.pts_max, level: best.level } : null;
    }).filter(Boolean);

    // ── Grand tableau de tous les résultats ──
    function modeMap(e, kind) { return bmode === 'age' ? (e[kind + 'A'] || e[kind]) : e[kind]; }
    function sortVal(e, key) {
      if (key === 'date') return dOf(e.date).getTime();
      if (key === 'age') return e.age;
      if (key === 'weight') return e.weight;
      if (key === 'score') return e.score;
      if (key === 'scoreA') return e.scoreA != null ? e.scoreA : e.score;
      if (key.indexOf('q:') === 0) { var q = (modeMap(e, 'qualities') || {})[key.slice(2)]; return q ? q.pct : null; }
      if (key.indexOf('t:') === 0) { var r = (modeMap(e, 'tests') || {})[key.slice(2)]; return r ? r.points : null; }
      return null;
    }
    var bRows = hist.slice().sort(function (a, b) {
      var va = sortVal(a, bt.key), vb = sortVal(b, bt.key);
      if (va == null && vb == null) return dOf(b.date) - dOf(a.date);
      if (va == null) return 1; if (vb == null) return -1;
      if (va === vb) return dOf(b.date) - dOf(a.date);
      return bt.dir === 'asc' ? va - vb : vb - va;
    });
    function bestOf(key) {
      var best = null; hist.forEach(function (e) { var v = sortVal(e, key); if (v != null && (best == null || v > best)) best = v; });
      return best;
    }
    function toggleSort(key) {
      setBt(function (cur) { return cur.key === key ? { key: key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key: key, dir: key === 'age' || key === 'weight' ? 'asc' : 'desc' }; });
    }
    var presetVal = bt.key + '|' + bt.dir;
    var PRESETS = ['date|asc', 'date|desc', 'score|desc', 'scoreA|desc'];
    tests.forEach(function (t) { PRESETS.push('t:' + t.slug + '|desc'); });
    qualities.forEach(function (q) { PRESETS.push('q:' + q.key + '|desc'); });
    if (PRESETS.indexOf(presetVal) === -1) presetVal = 'custom';
    function onPreset(v) { if (v === 'custom') return; var i = v.lastIndexOf('|'); setBt({ key: v.slice(0, i), dir: v.slice(i + 1) }); }
    function Th(p) {
      var on = bt.key === p.k;
      return (
        <th className={'cad-bt-th' + (p.cls ? ' ' + p.cls : '') + (on ? ' is-on' : '')} aria-sort={on ? (bt.dir === 'asc' ? 'ascending' : 'descending') : 'none'} title={p.title || null}>
          <button type="button" onClick={function () { toggleSort(p.k); }}>{p.children}<i aria-hidden="true">{on ? (bt.dir === 'asc' ? '▲' : '▼') : '↕'}</i></button>
        </th>
      );
    }
    function delSummary(e) {
      return frDate(e.date) + ' · ' + trw('score général') + ' ' + e.score + ' / ' + cat.totalPoints + ' · ' + Object.keys(e.tests || {}).length + ' ' + trw('épreuves');
    }

    // Export CSV du tableau (ordre de tri courant) : séparateur « ; » et virgule décimale pour Excel en français.
    function exportCsv() {
      var q = function (v) { var t = String(v == null ? '' : v); return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
      var num = function (v, d) { return v == null || !isFinite(v) ? '' : String(Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).replace('.', ','); };
      var head = ['Date', 'Âge', 'Poids (kg)', 'Score général', 'Niveau général', 'Score ajusté à l’âge', 'Niveau ajusté à l’âge'].map(trw);
      var G = trw('général'), A = trw('ajusté à l’âge');
      qualities.forEach(function (x) { head.push(trw(x.label) + ' — ' + G + ' (%)'); head.push(trw(x.label) + ' — ' + A + ' (%)'); });
      tests.forEach(function (t) { var n = trw(t.name.replace(/\s*\(.*\)$/, '')); head.push(n + ' — ' + trw('résultat')); head.push(n + ' — ' + trw('points') + ' ' + G); head.push(n + ' — ' + trw('points') + ' ' + A); });
      var lines = [head.map(q).join(';')];
      bRows.forEach(function (e) {
        var row = [String(e.date).slice(0, 10), e.age, num(e.weight, 1), e.score, trw(e.level), e.scoreA != null ? e.scoreA : e.score, trw(e.levelA || e.level)];
        qualities.forEach(function (x) { var g = (e.qualities || {})[x.key], a = (e.qualitiesA || e.qualities || {})[x.key]; row.push(g ? num(g.pct * 100, 1) : ''); row.push(a ? num(a.pct * 100, 1) : ''); });
        tests.forEach(function (t) { var g = (e.tests || {})[t.slug], a = (e.testsA || e.tests || {})[t.slug]; row.push(g ? fmtVal(t, g) : ''); row.push(g ? num(g.points, 1) : ''); row.push(a ? num(a.points, 1) : ''); });
        lines.push(row.map(q).join(';'));
      });
      try {
        var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'decaform-resultats-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      } catch (err) { /* navigateur sans Blob : on ignore */ }
    }

    // ── Épreuve par épreuve, année après année ──
    function cleanName(t) { return t.name.replace(/\s*\(.*\)$/, ''); }
    function passages(slug) {
      return hist.filter(function (e) { return e.tests && e.tests[slug]; });
    }
    var withData = tests.filter(function (t) { return passages(t.slug).length > 0; });
    var ytSlug = (ytSel && withData.filter(function (t) { return t.slug === ytSel; })[0])
      ? ytSel
      : (withData.slice().sort(function (a, b) { return passages(b.slug).length - passages(a.slug).length; })[0] || {}).slug;
    var ytTest = tests.filter(function (t) { return t.slug === ytSlug; })[0] || null;
    var ytRows = [];
    if (ytTest) {
      var prev = null;
      passages(ytSlug).forEach(function (e) {   // chronologique
        var r = e.tests[ytSlug];
        ytRows.push({ e: e, r: r, year: dOf(e.date).getFullYear(), points: r.points, max: r.max != null ? r.max : ytTest.pts_max,
          delta: prev ? r.points - prev.points : null });
        prev = r;
      });
      if (ySort === 'recent') ytRows.reverse();
      else if (ySort === 'best') ytRows.sort(function (a, b) { return b.points - a.points; });
    }
    var ytChrono = ytRows.slice().sort(function (a, b) { return dOf(a.e.date) - dOf(b.e.date); });
    var years = [];
    hist.forEach(function (e) { var y = dOf(e.date).getFullYear(); if (years.indexOf(y) === -1) years.push(y); });
    years.sort(function (a, b) { return b - a; });
    // Matrice épreuves × années : meilleur résultat de l'année.
    function bestOfYear(slug, y) {
      var best = null;
      hist.forEach(function (e) { if (dOf(e.date).getFullYear() === y && e.tests[slug] && (!best || e.tests[slug].points > best.points)) best = e.tests[slug]; });
      return best;
    }

    var ea = hist.filter(function (e) { return e.id === cmpA; })[0] || latest;
    var eb = hist.filter(function (e) { return e.id === cmpB; })[0] || hist[0];

    var Lcell = function (lv) { return <span className="cad-hlvl" style={{ color: levelColor(cat, lv), background: levelColor(cat, lv) + '22' }}>{lv}</span>; };

    return (
      <div className="cad-run">
        <HistStyle />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="cad-act-eye">Mon historique Decaform</div>
            <h1 className="cad-act-t" style={{ fontSize: 30 }}>{hist.length} test{hist.length > 1 ? 's' : ''} · progression</h1>
          </div>
          <button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button>
        </div>
        <p className="cad-p" style={{ marginTop: 6 }}>Depuis {frDate(hist[0].date)}. Compare tes résultats dans le temps — et garde en tête que les conditions comptent.</p>

        {/* Grand tableau de tous les résultats */}
        <section className="cad-card cad-bt" aria-labelledby="cad-bt-h">
          <h3 className="cad-h3" id="cad-bt-h">Tous tes résultats</h3>
          <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Un test par ligne. Clique sur le titre d’une colonne pour trier (une seconde fois pour inverser), ou choisis un tri ci-dessous. La meilleure valeur de chaque colonne est soulignée. Fais défiler vers la droite pour voir toutes les qualités et toutes les épreuves.</p>
          <div className="cad-bt-ctl">
            <div className="cad-hsort" style={{ margin: 0 }}>
              <label htmlFor="cad-bt-sel">Trier par</label>
              <select id="cad-bt-sel" className="cad-hsel" value={presetVal} onChange={function (e) { onPreset(e.target.value); }}>
                {presetVal === 'custom' ? <option value="custom">Tri par colonne (personnalisé)</option> : null}
                <optgroup label="Chronologique">
                  <option value="date|asc">Du plus ancien au plus récent (âge croissant)</option>
                  <option value="date|desc">Du plus récent au plus ancien</option>
                </optgroup>
                <optgroup label="Du meilleur au moins bon">
                  <option value="score|desc">Score total général</option>
                  <option value="scoreA|desc">Score total ajusté à l’âge</option>
                </optgroup>
                <optgroup label="Du meilleur au moins bon — par épreuve">
                  {tests.map(function (t) { return <option key={t.slug} value={'t:' + t.slug + '|desc'}>{t.name.replace(/\s*\(.*\)$/, '')}</option>; })}
                </optgroup>
                <optgroup label="Du meilleur au moins bon — par qualité">
                  {qualities.map(function (q) { return <option key={q.key} value={'q:' + q.key + '|desc'}>{q.label}</option>; })}
                </optgroup>
              </select>
            </div>
            <div className="cad-bt-seg" role="group" aria-label="Barème des qualités et des épreuves">
              <button type="button" aria-pressed={bmode === 'general'} onClick={function () { setBmode('general'); }}>Général</button>
              <button type="button" aria-pressed={bmode === 'age'} onClick={function () { setBmode('age'); }}>Ajusté à l’âge</button>
            </div>
            <button type="button" className="cad-bt-csv" onClick={exportCsv}>Exporter en CSV</button>
            <div className="cad-bt-seg" role="group" aria-label="Affichage des épreuves">
              <button type="button" aria-pressed={bview === 'points'} onClick={function () { setBview('points'); }}>Points</button>
              <button type="button" aria-pressed={bview === 'value'} onClick={function () { setBview('value'); }}>Résultat brut</button>
            </div>
          </div>
          <div className="cad-bt-wrap" tabIndex={0} role="region" aria-label="Tableau de tous les résultats, défilement horizontal">
            <table className="cad-bt-table">
              <thead>
                <tr className="cad-bt-grp">
                  <th className="cad-bt-sticky" rowSpan={2}><button type="button" onClick={function () { toggleSort('date'); }}>{trw('Date')}<i aria-hidden="true">{bt.key === 'date' ? (bt.dir === 'asc' ? '▲' : '▼') : '↕'}</i></button></th>
                  <th colSpan={4}>Test</th>
                  <th colSpan={qualities.length}>Qualités (% du repère)</th>
                  <th colSpan={tests.length}>Épreuves</th>
                  <th rowSpan={2}></th>
                </tr>
                <tr>
                  <Th k="age">Âge</Th>
                  <Th k="weight">Poids</Th>
                  <Th k="score" cls="is-score">{trw('Général') + ' /' + cat.totalPoints}</Th>
                  <Th k="scoreA" cls="is-score">{trw('Ajusté à l’âge') + ' /' + cat.totalPoints}</Th>
                  {qualities.map(function (q) { return <Th key={q.key} k={'q:' + q.key}>{q.label}</Th>; })}
                  {tests.map(function (t) { return <Th key={t.slug} k={'t:' + t.slug} title={t.name + (t.legacy ? ' — ' + trw('ancienne version du barème') : '')}>{t.name.replace(/\s*\(.*\)$/, '')}{t.legacy ? ' ⌛' : ''}</Th>; })}
                </tr>
              </thead>
              <tbody>
                {bRows.map(function (e) {
                  var qm = modeMap(e, 'qualities') || {}, tm = modeMap(e, 'tests') || {};
                  return (
                    <tr key={e.id} onClick={function () { props.onOpen && props.onOpen(e.id); }}>
                      <td className="cad-bt-sticky"><b>{frDate(e.date)}</b>{flagVs(e, latest) ? <Badge warn>⚠</Badge> : null}{e.durationDays && e.maxDays && e.durationDays > e.maxDays ? <span className="cad-hbadge is-warn" title={trw('Test étalé sur plus de {max} jours : résultats moins comparables.').replace('{max}', e.maxDays)}>{trw('⏱ {n} j').replace('{n}', e.durationDays)}</span> : null}{e.stationsPassees ? <span className="cad-hbadge is-warn" title={trw('Stations du Conditioning passées (forfait) : {n}').replace('{n}', e.stationsPassees)}>{trw('⚑ {n} station(s) passée(s)').replace('{n}', e.stationsPassees)}</span> : null}</td>
                      <td className="num">{e.age}</td>
                      <td className="num">{frNum(e.weight)} kg</td>
                      <td className={'num' + (e.score === bestOf('score') ? ' is-best' : '')}><span className="cad-hscore" style={{ color: colorOf(e) }}>{e.score}</span> {Lcell(e.level)}</td>
                      <td className={'num' + ((e.scoreA != null ? e.scoreA : e.score) === bestOf('scoreA') ? ' is-best' : '')}><span className="cad-hscore" style={{ color: colorOfA(e) }}>{e.scoreA != null ? e.scoreA : e.score}</span> {Lcell(e.levelA || e.level)}</td>
                      {qualities.map(function (q) {
                        var o = qm[q.key];
                        return <td key={q.key} className={'num' + (o && o.pct === bestOf('q:' + q.key) ? ' is-best' : '')} style={o ? { color: levelColor(cat, o.level) } : null}>{o ? frNum(o.pct * 100) + ' %' : '—'}</td>;
                      })}
                      {tests.map(function (t) {
                        var r = tm[t.slug];
                        if (!r) return <td key={t.slug} className="num cad-bt-na">—</td>;
                        var best = r.points === bestOf('t:' + t.slug);
                        var mx = r.max != null ? r.max : t.pts_max;
                        var pts = frNum(r.points, 1) + ' / ' + mx;
                        var val = fmtVal(t, r);
                        return (
                          <td key={t.slug} className={'num cad-bt-cell' + (best ? ' is-best' : '')}>
                            <span className="cad-bt-main" style={{ color: bview === 'points' ? levelColor(cat, r.level) : null }}>{bview === 'points' ? pts : val}</span>
                            <small>{bview === 'points' ? val : pts}</small>
                          </td>
                        );
                      })}
                      <td className="cad-bt-act" onClick={function (ev) { ev.stopPropagation(); }}>
                        <button type="button" className="cad-bt-del" aria-label={trw('Supprimer ce test') + ' — ' + frDate(e.date)} title={trw('Supprimer ce test')} onClick={function () { setDelTarget(e); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6m4-6v6"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        {delTarget && window.CadDeleteDialog ? (
          <window.CadDeleteDialog summary={delSummary(delTarget)}
            onCancel={function () { setDelTarget(null); }}
            onConfirm={function () { return props.onDelete ? props.onDelete(delTarget.id).then(function (res) { if (res && res.ok) setDelTarget(null); return res; }) : Promise.resolve({ ok: false }); }}/>
        ) : null}

        {/* ⓪ Explorateur : courbe interactive (mesure, période, objectif, projection, poids, événements) */}
        {window.CadExplorer ? <window.CadExplorer catalog={cat} history={hist} appUrl={props.apiBase || ''} onOpen={props.onOpen}/> : null}

        {/* ① Courbe du score global */}
        <section className="cad-card">
          <h3 className="cad-h3">Score global dans le temps</h3>
          <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Survole un point pour voir le détail. ⚠ = conditions assez différentes du dernier test.</p>
          {window.CadTrendLine ? <window.CadTrendLine points={tpoints} points2={hasA ? tpoints2 : null} max={cat.totalPoints} levels={cat.levels} palette={cat.palette} /> : null}
        </section>

        {/* ②bis Épreuve par épreuve, année après année */}
        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Épreuve par épreuve, année après année</h3>
          <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Choisis une épreuve : tu vois comment elle a évolué d’un passage à l’autre, et l’écart avec la fois d’avant.</p>
          {ytTest ? (
            <div>
              <div className="cad-hsort" style={{ marginTop: 6 }}>
                <label htmlFor="cad-hyr-sel">Épreuve</label>
                <select id="cad-hyr-sel" className="cad-hsel" value={ytSlug} onChange={function (e) { setYtSel(e.target.value); }}>
                  {withData.map(function (t) { return <option key={t.slug} value={t.slug}>{cleanName(t)} · {passages(t.slug).length}×</option>; })}
                </select>
                <label htmlFor="cad-hyr-sort" style={{ marginLeft: 12 }}>Trier</label>
                <select id="cad-hyr-sort" className="cad-hsel" value={ySort} onChange={function (e) { setYSort(e.target.value); }}>
                  <option value="recent">Plus récent</option>
                  <option value="old">Plus ancien</option>
                  <option value="best">Meilleur résultat</option>
                </select>
              </div>
              {ytChrono.length > 1 ? (function () {
                var W = 420, H = 130, pad = 22, bw = Math.min(48, (W - pad * 2) / ytChrono.length - 12);
                var step = (W - pad * 2) / ytChrono.length;
                return (
                  <svg className="cad-hyr-bars" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={cleanName(ytTest) + ' — ' + window.CadTr('points par passage')}>
                    <line x1={pad} x2={W - pad} y1={H - 22} y2={H - 22} stroke="var(--border-mid)" strokeWidth="1"/>
                    {ytChrono.map(function (row, i) {
                      var h = Math.max(2, (row.points / row.max) * (H - 56));
                      var x = pad + step * i + (step - bw) / 2;
                      return (
                        <g key={row.e.id}>
                          <rect x={x} y={H - 22 - h} width={bw} height={h} rx="5" fill={levelColor(cat, row.r.level)} opacity=".9"/>
                          <text className="v" x={x + bw / 2} y={H - 26 - h} textAnchor="middle">{frNum(row.points)}</text>
                          <text x={x + bw / 2} y={H - 8} textAnchor="middle">{shortDate(row.e.date)}</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })() : null}
              <div className="cad-htable-wrap">
                <table className="cad-htable">
                  <thead><tr><th>Année</th><th>Date</th><th>Résultat</th><th>Points</th><th>Niveau</th><th>Écart avec le passage précédent</th><th>Conditions</th></tr></thead>
                  <tbody>
                    {ytRows.map(function (row) {
                      return (
                        <tr key={row.e.id} onClick={function () { props.onOpen && props.onOpen(row.e.id); }}>
                          <td className="num" style={{ fontWeight: 800 }}>{row.year}</td>
                          <td>{frDate(row.e.date)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{fmtVal(ytTest, row.r)}</td>
                          <td className="num">{frNum(row.points)} / {row.max}</td>
                          <td>{Lcell(row.r.level)}</td>
                          <td className={row.delta == null ? '' : deltaCls(row.delta)}>{row.delta == null ? '—' : deltaStr(Math.round(row.delta * 10) / 10) + ' pts'}</td>
                          <td>{ytTest.venue === 'indoor' ? 'Intérieur' : condLabel(row.e)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <p className="cad-p">Aucun résultat enregistré pour l’instant.</p>}

          {withData.length > 1 && years.length > 0 ? (
            <div style={{ marginTop: 18 }}>
              <div className="cad-ec-h">Toutes les épreuves, année par année</div>
              <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Meilleur résultat de chaque année. Clique sur une ligne pour la détailler au-dessus.</p>
              <div className="cad-htable-wrap">
                <table className="cad-htable cad-hmx">
                  <thead><tr><th>Épreuve</th>{years.map(function (y) { return <th key={y}>{y}</th>; })}</tr></thead>
                  <tbody>
                    {withData.map(function (t) {
                      return (
                        <tr key={t.slug} className={t.slug === ytSlug ? 'is-on' : ''} onClick={function () { setYtSel(t.slug); }}>
                          <td style={{ fontWeight: 700 }}>{cleanName(t)}</td>
                          {years.map(function (y) {
                            var b = bestOfYear(t.slug, y);
                            return <td key={y} className="num">{b ? <span>{fmtVal(t, b)}<small>{frNum(b.points)} / {b.max != null ? b.max : t.pts_max}</small></span> : '—'}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        {/* ③ Progression par qualité */}
        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Progression par qualité</h3>
          <p className="cad-p" style={{ marginTop: 0, fontSize: 12.5 }}>Trait plein = général · trait pointillé (indigo) = ajusté à l’âge.</p>
          <div className="cad-hq">
            {qualities.map(function (q) {
              var serie = function (key) { return hist.map(function (e) { var o = (e[key] && e[key][q.key]); return (o ? o.pct : 0) * 100; }); };
              var sG = serie('qualities'), sA = serie('qualitiesA');
              var dG = sG[sG.length - 1] - sG[0], dA = sA[sA.length - 1] - sA[0];
              var lvG = latest.qualities[q.key] ? latest.qualities[q.key].level : 'Sédentaire';
              var lvA = (latest.qualitiesA && latest.qualitiesA[q.key]) ? latest.qualitiesA[q.key].level : lvG;
              var colG = levelColor(cat, lvG), colA = levelColor(cat, lvA);
              return (
                <div key={q.key} className="cad-hq-card">
                  <div className="cad-hq-top"><b>{q.label}</b><span className={'cad-hq-d ' + deltaCls(dG)}>{deltaStr(Math.round(dG))}<em style={{ fontStyle: 'normal', color: colA, fontSize: 11, marginLeft: 6 }}>{deltaStr(Math.round(dA))}</em></span></div>
                  {window.CadSparkline ? <window.CadSparkline values={sG} color={colG} aria={window.CadTr(q.label) + ' ' + window.CadTr('général')} /> : null}
                  <div className="cad-hq-foot"><span style={{ color: colG, fontWeight: 700 }}>gén. {frNum(sG[sG.length - 1])} %</span><span style={{ color: colA, fontWeight: 700 }}>âge {frNum(sA[sA.length - 1])} %</span></div>
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
              <b style={{ color: colorOf(ea) }}>{ea.score}</b> <b style={{ color: colorOfA(ea), fontSize: 16 }}>/ {ea.scoreA != null ? ea.scoreA : ea.score}</b>
              <em>gén. {ea.level} · âge {ea.levelA || ea.level} · {frNum(ea.weight)} kg · {condLabel(ea)}</em>
            </div>
            <div className="cad-hcmp-vs">vs</div>
            <div className="cad-hcmp-side">
              <select className="cad-hsel" style={{ marginBottom: 8, width: '100%' }} value={cmpB} onChange={function (e) { setCmpB(e.target.value); }}>
                {byRecent.map(function (e) { return <option key={e.id} value={e.id}>{frDate(e.date)}</option>; })}
              </select>
              <b style={{ color: colorOf(eb) }}>{eb.score}</b> <b style={{ color: colorOfA(eb), fontSize: 16 }}>/ {eb.scoreA != null ? eb.scoreA : eb.score}</b>
              <em>gén. {eb.level} · âge {eb.levelA || eb.level} · {frNum(eb.weight)} kg · {condLabel(eb)}</em>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            <span className="cad-p" style={{ margin: 0 }}>Écart total</span>
            <b className={'cad-hq-d ' + deltaCls(ea.score - eb.score)} style={{ fontSize: 22 }}>{deltaStr(ea.score - eb.score)} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>gén.</span></b>
            <b className={'cad-hq-d ' + deltaCls((ea.scoreA || ea.score) - (eb.scoreA || eb.score))} style={{ fontSize: 22 }}>{deltaStr((ea.scoreA || ea.score) - (eb.scoreA || eb.score))} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>âge</span></b>
            {flagVs(ea, eb) ? <Badge warn>⚠ conditions différentes</Badge> : null}
          </div>
          <div className="cad-hcmp-q is-head"><span>Qualité</span><b>Général</b><b>Âge</b></div>
          {qualities.map(function (q) {
            var va = ea.qualities[q.key] ? ea.qualities[q.key].pct * 100 : 0;
            var vb = eb.qualities[q.key] ? eb.qualities[q.key].pct * 100 : 0;
            var aa = (ea.qualitiesA && ea.qualitiesA[q.key]) ? ea.qualitiesA[q.key].pct * 100 : va;
            var ab = (eb.qualitiesA && eb.qualitiesA[q.key]) ? eb.qualitiesA[q.key].pct * 100 : vb;
            return <div key={q.key} className="cad-hcmp-q"><span>{q.label}</span><b className={deltaCls(va - vb)}>{deltaStr(Math.round(va - vb))}</b><b className={deltaCls(aa - ab)}>{deltaStr(Math.round(aa - ab))}</b></div>;
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

  // ── Confirmation de suppression d'un test entier (réutilisée par l'accueil et le tableau de bord) ──
  function CadDeleteDialog(props) {
    var ts = React.useState(''); var typed = ts[0], setTyped = ts[1];
    var bs = React.useState(false); var busy = bs[0], setBusy = bs[1];
    var es = React.useState(''); var err = es[0], setErr = es[1];
    var boxRef = React.useRef(null), inRef = React.useRef(null);
    var word = trw('SUPPRIMER');
    var ok = typed.trim().toLowerCase() === word.toLowerCase();
    React.useEffect(function () {
      var prev = document.activeElement;
      var prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
      if (inRef.current) inRef.current.focus();
      function onKey(e) {
        if (e.key === 'Escape' && !busy) { e.preventDefault(); props.onCancel(); return; }
        if (e.key !== 'Tab' || !boxRef.current) return;
        var f = boxRef.current.querySelectorAll('button:not([disabled]), input, [href]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOv; if (prev && prev.focus) { try { prev.focus(); } catch (e) {} } };
    }, [busy]);
    function go() {
      if (!ok || busy) return;
      setBusy(true); setErr('');
      Promise.resolve(props.onConfirm()).then(function (res) {
        if (res && res.ok === false) { setBusy(false); setErr(res.erreur || trw('Suppression impossible.')); }
      }).catch(function () { setBusy(false); setErr(trw('Erreur réseau.')); });
    }
    var node = (
      <div className="cad-del-ov" onMouseDown={function (e) { if (e.target === e.currentTarget && !busy) props.onCancel(); }}>
        <style>{`
          .cad-del-ov { position: fixed; inset: 0; z-index: 1000; background: rgba(8, 12, 20, .62); display: grid; place-items: center; padding: 16px; }
          .cad-del { width: min(460px, 100%); background: var(--bg-card); color: var(--text); border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,.4); display: grid; gap: 12px; }
          .cad-del h2 { margin: 0; font-family: var(--font-display); font-size: 20px; }
          .cad-del p { margin: 0; font-family: var(--font-body); font-size: 13.5px; line-height: 1.55; color: var(--text-mid); }
          .cad-del .cad-del-sum { color: var(--text); font-weight: 600; background: var(--bg-card-2); border-radius: 10px; padding: 9px 12px; }
          .cad-del label { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text-mid); display: grid; gap: 6px; }
          .cad-del input { font-family: var(--font-mono); font-size: 14px; padding: 10px 12px; border: 1px solid var(--border-mid); border-radius: 10px; background: var(--bg); color: var(--text); }
          .cad-del-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; }
          .cad-del-go { border: 0; border-radius: 999px; padding: 10px 18px; font-family: var(--font-body); font-weight: 700; font-size: 13.5px; background: #dc2626; color: #fff; cursor: pointer; }
          .cad-del-go[disabled] { opacity: .4; cursor: not-allowed; }
          .cad-del-err { color: #ef4444; font-family: var(--font-body); font-size: 13px; }
        `}</style>
        <div className="cad-del" role="alertdialog" aria-modal="true" aria-labelledby="cad-del-t" aria-describedby="cad-del-d" ref={boxRef}>
          <h2 id="cad-del-t">{trw('Supprimer ce test ?')}</h2>
          {props.summary ? <p className="cad-del-sum">{props.summary}</p> : null}
          <p id="cad-del-d">{trw('Cette action est définitive : le test, tous ses résultats et ses scores seront effacés, et il disparaîtra de ton historique, de tes courbes et de tes records.')}</p>
          <label>
            {trw('Pour confirmer, tape {word} :').replace('{word}', word)}
            <input ref={inRef} value={typed} onChange={function (e) { setTyped(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } }} autoComplete="off" autoCapitalize="characters" spellCheck="false" aria-label={trw('Mot de confirmation')}/>
          </label>
          {err ? <div className="cad-del-err" role="alert">{err}</div> : null}
          <div className="cad-del-actions">
            <button type="button" className="thw-btn-ghost" onClick={props.onCancel} disabled={busy}>{trw('Annuler')}</button>
            <button type="button" className="cad-del-go" onClick={go} disabled={!ok || busy}>{busy ? trw('Suppression…') : trw('Supprimer définitivement')}</button>
          </div>
        </div>
      </div>
    );
    return ReactDOM.createPortal ? ReactDOM.createPortal(node, document.body) : node;
  }
  window.CadDeleteDialog = CadDeleteDialog;

  window.CadHistory = CadHistory;
})();
