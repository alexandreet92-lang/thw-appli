/* ════════════════════════════════════════════════════════════════
   Decaform (site) — « Explorateur » de l'historique : une courbe interactive
   (score global, une qualité ou une épreuve), une période au choix, un objectif,
   une projection, le poids, des événements personnels, le profil comparé de deux
   tests, une lecture automatique et un export. SVG brut, aucune librairie.
   Les objectifs et événements passent par /api/cadences/marks (tolérant : si la
   fonction n'est pas encore activée côté serveur, ils sont simplement masqués).
   Publie window.CadExplorer (composant) et window.cadExplorerMath (calculs purs).
   ════════════════════════════════════════════════════════════════ */
(function () {
  var DAY = 86400000;
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  function dOf(iso) { return Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z'); }
  function fmtDate(ms, opts) {
    try { return new Date(ms).toLocaleDateString(window.CadLocale ? window.CadLocale() : 'fr-FR', opts || { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function fmtMonth(ms) { return fmtDate(ms, { month: 'long', year: 'numeric' }); }
  function num(v, d) { var p = Math.pow(10, d || 0); return (Math.round(v * p) / p + '').replace('.', ','); }
  function signed(n) { var r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  // ── Calculs purs (testables) ───────────────────────────────────────────────
  // Régression linéaire (moindres carrés) sur des points {t: ms, v}. Renvoie null si < 3 points
  // ou si tous les points sont à la même date. slope = unités par jour.
  function regress(pts) {
    var p = pts.filter(function (q) { return isFinite(q.t) && isFinite(q.v); });
    if (p.length < 3) return null;
    var n = p.length, st = 0, sv = 0;
    p.forEach(function (q) { st += q.t; sv += q.v; });
    var mt = st / n, mv = sv / n, num_ = 0, den = 0;
    p.forEach(function (q) { num_ += (q.t - mt) * (q.v - mv); den += (q.t - mt) * (q.t - mt); });
    if (den === 0) return null;
    var slope = num_ / den * DAY;               // unités par jour
    return { slope: slope, at: function (t) { return mv + slope * ((t - mt) / DAY); } };
  }
  // Date (ms) à laquelle la tendance atteint `target`, ou null (pente nulle/négative, déjà atteint, > 15 ans).
  function etaTo(reg, last, target) {
    if (!reg || reg.slope <= 0 || last.v >= target) return null;
    var t = last.t + ((target - reg.at(last.t)) / reg.slope) * DAY;
    if (!(t > last.t) || t - last.t > 15 * 365 * DAY) return null;
    return t;
  }
  // Valeur d'une mesure pour un test d'historique, ou null.
  function metricValue(cat, e, metric, ageMode) {
    if (!e) return null;
    if (metric === 'global') return ageMode ? e.scoreA : e.score;
    var q = ageMode ? e.qualitiesA : e.qualities, t = ageMode ? e.testsA : e.tests;
    if (metric.indexOf('q:') === 0) { var x = q && q[metric.slice(2)]; return x && isFinite(x.pct) ? x.pct * 100 : null; }
    if (metric.indexOf('t:') === 0) { var y = t && t[metric.slice(2)]; return y && isFinite(y.points) ? y.points : null; }
    return null;
  }
  window.cadExplorerMath = { regress: regress, etaTo: etaTo, metricValue: metricValue };

  // ── Styles ─────────────────────────────────────────────────────────────────
  function Style() {
    return (
      <style>{`
        .cad-ex { margin-top: 18px; }
        .cad-ex-kpis { display: grid; gap: 12px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 14px; }
        @media (max-width: 860px) { .cad-ex-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cad-ex-kpi { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; }
        .cad-ex-kpi small { display: block; font-family: var(--font-body); font-size: 12px; color: var(--text-dim); }
        .cad-ex-kpi b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 26px; line-height: 1.15; margin: 4px 0 2px; color: var(--text); font-variant-numeric: tabular-nums; }
        .cad-ex-kpi span { font-family: var(--font-body); font-size: 12.5px; color: var(--text-mid); }
        .cad-ex-up { color: #16a34a !important; } .cad-ex-dn { color: #dc2626 !important; }
        .cad-ex-bar { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .cad-ex-grp { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .cad-ex-lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim); margin-right: 4px; }
        .cad-ex-pill { border: 1px solid var(--border-mid); background: var(--bg-card-2); color: var(--text-mid); border-radius: 999px; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 6px 13px; cursor: pointer; }
        .cad-ex-pill[aria-pressed="true"] { background: var(--brand); border-color: var(--brand); color: #fff; }
        .cad-ex-pill:disabled { opacity: .45; cursor: not-allowed; }
        .cad-ex-sel { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text); background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: 999px; padding: 6px 12px; cursor: pointer; }
        .cad-ex-seg { display: inline-flex; border: 1px solid var(--border-mid); border-radius: 999px; overflow: hidden; background: var(--bg-card-2); }
        .cad-ex-seg button { border: 0; background: transparent; color: var(--text-mid); font-family: var(--font-body); font-size: 12.5px; font-weight: 600; padding: 7px 12px; cursor: pointer; }
        .cad-ex-seg button[aria-pressed="true"] { background: var(--brand); color: #fff; }
        .cad-ex-chart { width: 100%; overflow: visible; display: block; }
        .cad-ex-line { stroke-dasharray: 1; stroke-dashoffset: 1; }
        .cad-ex-line.is-on { stroke-dashoffset: 0; transition: stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1); }
        .cad-ex-pt { cursor: pointer; transition: r .15s; }
        .cad-ex-detail { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; padding: 12px 14px; border-radius: 12px; background: var(--bg-card-2); border: 1px solid var(--border); font-family: var(--font-body); font-size: 13.5px; color: var(--text-mid); }
        .cad-ex-detail b { color: var(--text); font-family: var(--font-display); font-size: 18px; }
        .cad-ex-note { font-family: var(--font-body); font-size: 12.5px; color: var(--text-dim); margin: 8px 0 0; }
        .cad-ex-read { display: grid; gap: 0; }
        .cad-ex-read > div { display: flex; gap: 12px; padding: 11px 0; border-top: 1px solid var(--border); font-family: var(--font-body); font-size: 14px; color: var(--text-mid); line-height: 1.55; }
        .cad-ex-read > div:first-child { border-top: 0; }
        .cad-ex-read b { color: var(--text); }
        .cad-ex-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-mid); }
        .cad-ex-in { font-family: var(--font-body); font-size: 13px; color: var(--text); background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: 10px; padding: 7px 10px; min-width: 0; }
        .cad-ex-chip { display: inline-flex; gap: 6px; align-items: center; font-family: var(--font-body); font-size: 12px; color: var(--text-mid); border: 1px solid var(--border-mid); border-radius: 999px; padding: 3px 4px 3px 10px; background: var(--bg-card-2); }
        .cad-ex-chip button { border: 0; background: transparent; color: var(--text-dim); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 6px; }
        .cad-ex-g2 { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 16px; }
        @media (max-width: 860px) { .cad-ex-g2 { grid-template-columns: minmax(0, 1fr); } }
        @media (prefers-reduced-motion: reduce) { .cad-ex-line.is-on { transition: none; } }
        @media print { .cad-ex-bar, .cad-ex-form, .cad-ex-pill, .cad-ex-seg { display: none !important; } }
      `}</style>
    );
  }

  // Compteur animé (0 → valeur) ; saute l'animation si mouvement réduit.
  function CountUp(props) {
    var target = props.value, dec = props.dec || 0;
    var s = React.useState(reduced() ? target : 0); var v = s[0], setV = s[1];
    React.useEffect(function () {
      if (reduced()) { setV(target); return undefined; }
      var start = null, raf;
      function step(ts) {
        if (start == null) start = ts;
        var k = Math.min(1, (ts - start) / 900);
        setV(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
      return function () { cancelAnimationFrame(raf); };
    }, [target]);
    return <span>{num(v, dec)}</span>;
  }

  // ── Composant principal ────────────────────────────────────────────────────
  function CadExplorer(props) {
    var cat = props.catalog || {}, appUrl = props.appUrl || '';
    var hist = (props.history || []).slice().sort(function (a, b) { return dOf(a.date) - dOf(b.date); });
    var qualities = cat.qualities || [];
    var testsCat = cat.tests || [];

    var mS = React.useState('global'); var metric = mS[0], setMetric = mS[1];
    var pS = React.useState('all'); var period = pS[0], setPeriod = pS[1];
    var modeS = React.useState('general'); var mode = modeS[0], setMode = modeS[1];
    var tgS = React.useState({ goal: true, proj: true, weight: true, events: true }); var tg = tgS[0], setTg = tgS[1];
    var selS = React.useState(null); var sel = selS[0], setSel = selS[1];
    var mkS = React.useState({ available: false, marks: [] }); var marks = mkS[0], setMarks = mkS[1];
    var onS = React.useState(false); var drawn = onS[0], setDrawn = onS[1];
    var gS = React.useState(''); var goalIn = gS[0], setGoalIn = gS[1];
    var evS = React.useState({ date: '', label: '' }); var evIn = evS[0], setEvIn = evS[1];
    var erS = React.useState(''); var err = erS[0], setErr = erS[1];
    var cA = React.useState(hist.length > 1 ? hist[0].id : (hist[0] && hist[0].id)); var cmpA = cA[0], setCmpA = cA[1];
    var cB = React.useState(hist.length ? hist[hist.length - 1].id : null); var cmpB = cB[0], setCmpB = cB[1];
    var ageMode = mode === 'age';

    // Marques (objectifs / événements) : chargées une fois ; tolérant à l'absence de l'API.
    React.useEffect(function () {
      var dead = false;
      fetch((appUrl || '') + '/api/cadences/marks', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (!dead && j && j.available) setMarks({ available: true, marks: j.marks || [] }); })
        .catch(function () {});
      return function () { dead = true; };
    }, []);
    function callMarks(method, body, qs) {
      return fetch((appUrl || '') + '/api/cadences/marks' + (qs || ''), {
        method: method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); });
    }
    function addGoal() {
      var t = Number(String(goalIn).replace(',', '.'));
      if (!isFinite(t)) { setErr(tr('Saisis un nombre.')); return; }
      setErr('');
      callMarks('POST', { kind: 'goal', metric: metric, target: t, label: tr('Objectif') }).then(function (res) {
        if (res.ok && res.j.mark) { setMarks(function (m) { return { available: true, marks: m.marks.filter(function (x) { return !(x.kind === 'goal' && x.metric === metric); }).concat([res.j.mark]) }; }); setGoalIn(''); }
        else setErr(tr((res.j && res.j.erreur) || 'Enregistrement impossible.'));
      });
    }
    function addEvent() {
      if (!evIn.date || !evIn.label.trim()) { setErr(tr('Indique une date et un libellé.')); return; }
      setErr('');
      callMarks('POST', { kind: 'event', on_date: evIn.date, label: evIn.label.trim() }).then(function (res) {
        if (res.ok && res.j.mark) { setMarks(function (m) { return { available: true, marks: m.marks.concat([res.j.mark]) }; }); setEvIn({ date: '', label: '' }); }
        else setErr(tr((res.j && res.j.erreur) || 'Enregistrement impossible.'));
      });
    }
    function delMark(id) {
      callMarks('DELETE', null, '?id=' + encodeURIComponent(id)).then(function (res) {
        if (res.ok) setMarks(function (m) { return { available: true, marks: m.marks.filter(function (x) { return x.id !== id; }) }; });
      });
    }

    // Mesure choisie : libellé, échelle, unité.
    var info = (function () {
      if (metric === 'global') return { label: tr('Score global'), max: cat.totalPoints || 1000, unit: '/ ' + (cat.totalPoints || 1000), dec: 0 };
      if (metric.indexOf('q:') === 0) { var q = qualities.filter(function (x) { return x.key === metric.slice(2); })[0]; return { label: tr(q ? q.label : metric), max: 100, unit: '/ 100', dec: 0 }; }
      var t = testsCat.filter(function (x) { return x.slug === metric.slice(2); })[0];
      return { label: tr(t ? t.name.replace(/\s*\(.*\)$/, '') : metric), max: t ? t.pts_max : 100, unit: '/ ' + (t ? t.pts_max : 100) + ' pts', dec: 0, test: t };
    })();

    // Période : 1/5/10/20/30 ans ou tout (depuis le premier test).
    var cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 365.25 * DAY;
    var all = hist.map(function (e) { return { e: e, t: dOf(e.date), v: metricValue(cat, e, metric, ageMode) }; }).filter(function (p) { return p.v != null; });
    var pts = all.filter(function (p) { return p.t >= cutoff; });
    var hasData = pts.length > 0;
    var reg = regress(all.slice(-5));                              // tendance sur les 5 derniers tests
    var showProj = tg.proj && !!reg && pts.length > 0;
    var goal = marks.marks.filter(function (x) { return x.kind === 'goal' && x.metric === metric; })[0] || null;
    var events = marks.marks.filter(function (x) { return x.kind === 'event'; });

    // Redessin animé à chaque changement de mesure / période.
    React.useEffect(function () {
      setDrawn(false);
      var id = setTimeout(function () { setDrawn(true); }, 60);
      return function () { clearTimeout(id); };
    }, [metric, period, mode]);

    // Géométrie du graphique.
    var W = 900, H = 340, PL = 50, PR = 28, PT = 26, PB = 58;
    var iw = W - PL - PR, ih = H - PT - PB;
    var tMin = hasData ? pts[0].t : Date.now(), tLast = hasData ? pts[pts.length - 1].t : Date.now();
    var horizon = showProj ? Math.max(tLast + 365 * DAY, goal && reg ? (etaTo(reg, { t: tLast, v: pts[pts.length - 1].v }, goal.target) || 0) : 0) : tLast;
    var tMax = Math.max(horizon, tMin + 30 * DAY);
    var projEnd = showProj ? reg.at(tMax) : null;
    var vs = pts.map(function (p) { return p.v; });
    if (goal && tg.goal) vs.push(goal.target);
    if (showProj) vs.push(projEnd);
    var vMin = vs.length ? Math.min.apply(null, vs) : 0, vMax = vs.length ? Math.max.apply(null, vs) : info.max;
    var span = Math.max(vMax - vMin, info.max * 0.1);
    var rawStep = span * 1.5 / 4, mag = Math.pow(10, Math.floor(Math.log(rawStep) / Math.LN10));
    var nstep = [1, 2, 5, 10].map(function (m) { return m * mag; }).filter(function (c) { return c >= rawStep; })[0] || 10 * mag;
    var yLo = Math.max(0, Math.floor((vMin - span * 0.2) / nstep) * nstep), yHi = Math.min(Math.ceil(info.max * 1.1), Math.ceil((vMax + span * 0.2) / nstep) * nstep);
    if (yHi <= yLo) yHi = yLo + nstep;
    var tPad = (tMax - tMin) * 0.05 + 6 * DAY; tMin = tMin - tPad;
    function X(t) { return PL + (tMax === tMin ? iw / 2 : iw * (t - tMin) / (tMax - tMin)); }
    function Y(v) { return PT + ih * (1 - (Math.max(yLo, Math.min(yHi, v)) - yLo) / (yHi - yLo)); }
    var ticks = []; for (var tv = yLo; tv <= yHi + 1e-9; tv += nstep) ticks.push(tv);
    var line = pts.map(function (p) { return X(p.t) + ',' + Y(p.v); }).join(' ');
    // Poids : courbe secondaire normalisée sur la hauteur disponible.
    var wts = pts.filter(function (p) { return isFinite(p.e.weight); });
    var wMin = wts.length ? Math.min.apply(null, wts.map(function (p) { return p.e.weight; })) : 0, wMax = wts.length ? Math.max.apply(null, wts.map(function (p) { return p.e.weight; })) : 1;
    var wSpan = Math.max(wMax - wMin, 4);
    function WY(w) { return PT + ih * 0.95 - (ih * 0.3) * ((w - wMin) / wSpan); }
    var etaGoal = goal && reg && pts.length ? etaTo(reg, { t: tLast, v: pts[pts.length - 1].v }, goal.target) : null;

    var cur = sel && pts.filter(function (p) { return p.e.id === sel; })[0] || (pts.length ? pts[pts.length - 1] : null);
    var prevOfCur = cur ? (function () { var i = all.indexOf(all.filter(function (p) { return p.e.id === cur.e.id; })[0]); return i > 0 ? all[i - 1] : null; })() : null;

    // ── KPIs ──
    var first = hist[0], last = hist[hist.length - 1];
    var gFirst = first ? metricValue(cat, first, 'global', ageMode) : null, gLast = last ? metricValue(cat, last, 'global', ageMode) : null;
    var qd = qualities.map(function (q) {
      var a = metricValue(cat, first, 'q:' + q.key, ageMode), b = metricValue(cat, last, 'q:' + q.key, ageMode);
      return { q: q, now: b, d: a != null && b != null ? b - a : null };
    }).filter(function (x) { return x.now != null; });
    var bestQ = qd.slice().sort(function (a, b) { return b.now - a.now; })[0];
    var bigUp = hist.length > 1 ? qd.filter(function (x) { return x.d != null; }).sort(function (a, b) { return b.d - a.d; })[0] : null;
    var nextTs = last ? dOf(last.date) + 182 * DAY : null;
    var daysTo = nextTs ? Math.round((nextTs - Date.now()) / DAY) : null;
    var spanMonths = first && last ? Math.max(1, Math.round((dOf(last.date) - dOf(first.date)) / (30.4 * DAY))) : 0;

    // ── Lecture automatique ──
    var reads = [];
    if (bigUp && bigUp.d > 0.5) {
      var lowQ = qd.slice().sort(function (a, b) { return a.now - b.now; })[0];
      reads.push({ i: '▲', c: 'cad-ex-up', h: tr(bigUp.q.label) + ' ' + signed(bigUp.d) + ' pts', p: lowQ && lowQ.q.key === bigUp.q.key ? tr('C’est ta qualité qui progresse le plus vite, mais elle reste la plus basse.') : tr('C’est ta qualité qui progresse le plus vite depuis ton premier test.') });
    }
    if (hist.length > 1 && isFinite(first.weight) && isFinite(last.weight) && Math.abs(last.weight - first.weight) >= 2) {
      var dw = last.weight - first.weight;
      reads.push({ i: '●', c: '', h: tr('Poids') + ' ' + (dw > 0 ? '+' : '−') + num(Math.abs(dw), 1) + ' kg', p: tr('Ton poids a changé depuis ton premier test : regarde si tes gains viennent de tes performances ou de ce changement (surtout en force et en endurance).') });
    }
    var regG = regress(hist.map(function (e) { return { t: dOf(e.date), v: metricValue(cat, e, 'global', ageMode) }; }).filter(function (p) { return p.v != null; }).slice(-5));
    if (regG) {
      var per6 = regG.slope * 182;
      var lvls = cat.levels || [];
      var curPct = gLast / (cat.totalPoints || 1000), nxt = null;
      for (var li = 0; li < lvls.length; li++) if (lvls[li].min_pct > curPct) { nxt = lvls[li]; break; }
      var eta = nxt ? etaTo(regG, { t: dOf(last.date), v: gLast }, nxt.min_pct * (cat.totalPoints || 1000)) : null;
      reads.push({ i: per6 >= 0 ? '▲' : '▼', c: per6 >= 0 ? 'cad-ex-up' : 'cad-ex-dn', h: tr('Rythme') + ' : ' + signed(per6) + ' pts / ' + tr('6 mois'),
        p: eta ? tr('Au rythme actuel, le niveau {n} serait atteint vers {d}.').replace('{n}', tr(nxt.label)).replace('{d}', fmtMonth(eta)) + ' ' + tr('C’est une estimation, pas une promesse.') : tr('Estimation d’après tes derniers tests.') });
    }
    if (hist.length >= 4) {
      var seasonOf = function (ms) { var m = new Date(ms).getUTCMonth(); return m <= 1 || m === 11 ? 'hiver' : m <= 4 ? 'printemps' : m <= 7 ? 'été' : 'automne'; };
      var top2 = hist.slice().sort(function (a, b) { return (metricValue(cat, b, 'global', ageMode) || 0) - (metricValue(cat, a, 'global', ageMode) || 0); }).slice(0, 2);
      if (seasonOf(dOf(top2[0].date)) === seasonOf(dOf(top2[1].date))) reads.push({ i: '◆', c: '', h: tr('Meilleure saison') + ' : ' + tr(seasonOf(dOf(top2[0].date))), p: tr('Tes deux meilleurs tests ont eu lieu à cette période : c’est peut-être le meilleur moment pour te tester.') });
    }

    // ── Export CSV (toutes les mesures, tous les tests) ──
    function exportCsv() {
      var head = [tr('Date'), tr('Âge'), tr('Poids (kg)'), tr('Score global')].concat(qualities.map(function (q) { return tr(q.label) + ' (/100)'; }));
      testsCat.forEach(function (t) { head.push(tr(t.name.replace(/\s*\(.*\)$/, '')) + ' (pts)'); });
      var rows = hist.map(function (e) {
        var r = [String(e.date).slice(0, 10), e.age, e.weight, metricValue(cat, e, 'global', ageMode)];
        qualities.forEach(function (q) { var v = metricValue(cat, e, 'q:' + q.key, ageMode); r.push(v == null ? '' : Math.round(v)); });
        testsCat.forEach(function (t) { var v = metricValue(cat, e, 't:' + t.slug, ageMode); r.push(v == null ? '' : Math.round(v * 10) / 10); });
        return r;
      });
      var csv = [head].concat(rows).map(function (r) { return r.map(function (c) { var s = String(c == null ? '' : c).replace(/"/g, '""'); return /[;"\n]/.test(s) ? '"' + s + '"' : s; }).join(';'); }).join('\n');
      var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'decaform-historique.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    // ── Radar : comparer deux tests ──
    var eA = hist.filter(function (e) { return e.id === cmpA; })[0], eB = hist.filter(function (e) { return e.id === cmpB; })[0];
    function qItems(e) {
      return qualities.map(function (q) {
        var v = metricValue(cat, e, 'q:' + q.key, ageMode);
        return { key: q.key, label: q.label, pct: v == null ? 0 : v / 100, level: '', color: 'var(--brand)' };
      });
    }
    var dateOpt = function (e) { return <option key={e.id} value={e.id}>{fmtDate(dOf(e.date))} · {Math.round(metricValue(cat, e, 'global', ageMode) || 0)}</option>; };

    if (!hist.length) return null;
    var canMarks = marks.available;
    var shownEvents = tg.events ? events.filter(function (x) { var t = dOf(x.on_date); return t >= tMin - 30 * DAY && t <= tMax; }) : [];
    var gradId = 'cadexg';
    return (
      <section className="cad-card cad-ex" aria-label={tr('Courbe interactive')}>
        <Style/>
        <div className="cad-act-eye">{tr('Courbe interactive')}</div>
        <h3 className="cad-h3" style={{ fontSize: 20 }}>{tr('Choisis ce que tu veux suivre')}</h3>

        <div className="cad-ex-kpis">
          <div className="cad-ex-kpi"><small>{tr('Score actuel')}</small><b><CountUp value={gLast || 0}/></b><span className={gLast - gFirst >= 0 ? 'cad-ex-up' : 'cad-ex-dn'}>{hist.length > 1 ? signed(gLast - gFirst) + ' ' + tr('depuis le 1er test') : tr('Premier test')}</span></div>
          <div className="cad-ex-kpi"><small>{tr('Meilleure qualité')}</small><b style={{ fontSize: 20 }}>{bestQ ? tr(bestQ.q.label) : '—'}</b><span>{bestQ ? num(bestQ.now) + ' / 100' : ''}</span></div>
          <div className="cad-ex-kpi"><small>{tr('Plus grosse progression')}</small><b style={{ fontSize: 20 }}>{bigUp && bigUp.d > 0.5 ? tr(bigUp.q.label) + ' ' + signed(bigUp.d) : '—'}</b><span>{hist.length > 1 ? tr('sur') + ' ' + spanMonths + ' ' + tr('mois') : tr('Il faut un 2e test')}</span></div>
          <div className="cad-ex-kpi"><small>{tr('Prochain test conseillé')}</small><b style={{ fontSize: 20 }}>{nextTs ? fmtMonth(nextTs) : '—'}</b><span>{daysTo == null ? '' : daysTo > 0 ? tr('dans') + ' ' + daysTo + ' ' + tr('jours') : tr('c’est le moment de te tester')}</span></div>
        </div>

        <div className="cad-ex-bar" style={{ marginTop: 18 }}>
          <div className="cad-ex-grp">
            <span className="cad-ex-lbl">{tr('Mesure')}</span>
            <button type="button" className="cad-ex-pill" aria-pressed={metric === 'global'} onClick={function () { setMetric('global'); setSel(null); }}>★ {tr('Score global')}</button>
            <select className="cad-ex-sel" aria-label={tr('Une qualité')} value={metric.indexOf('q:') === 0 ? metric : ''} onChange={function (e) { if (e.target.value) { setMetric(e.target.value); setSel(null); } }}>
              <option value="">{tr('Une qualité…')}</option>
              {qualities.map(function (q) { return <option key={q.key} value={'q:' + q.key}>{tr(q.label)}</option>; })}
            </select>
            <select className="cad-ex-sel" aria-label={tr('Une épreuve')} value={metric.indexOf('t:') === 0 ? metric : ''} onChange={function (e) { if (e.target.value) { setMetric(e.target.value); setSel(null); } }}>
              <option value="">{tr('Une épreuve…')}</option>
              {testsCat.map(function (t) { return <option key={t.slug} value={'t:' + t.slug}>{tr(t.name.replace(/\s*\(.*\)$/, ''))}</option>; })}
            </select>
          </div>
          <div className="cad-ex-grp">
            <span className="cad-ex-lbl">{tr('Période')}</span>
            <div className="cad-ex-seg" role="group" aria-label={tr('Période')}>
              {[['1', '1 ' + tr('an')], ['5', '5 ' + tr('ans')], ['10', '10 ' + tr('ans')], ['20', '20 ' + tr('ans')], ['30', '30 ' + tr('ans')], ['all', tr('Tout')]].map(function (o) {
                return <button key={o[0]} type="button" aria-pressed={period === o[0]} onClick={function () { setPeriod(o[0]); setSel(null); }}>{o[1]}</button>;
              })}
            </div>
          </div>
        </div>
        <div className="cad-ex-bar">
          <div className="cad-ex-grp">
            <div className="cad-ex-seg" role="group" aria-label={tr('Notation')}>
              <button type="button" aria-pressed={mode === 'general'} onClick={function () { setMode('general'); }}>{tr('Général')}</button>
              <button type="button" aria-pressed={mode === 'age'} onClick={function () { setMode('age'); }}>{tr('Ajusté à l’âge')}</button>
            </div>
          </div>
          <div className="cad-ex-grp">
            <button type="button" className="cad-ex-pill" aria-pressed={tg.goal} onClick={function () { setTg(Object.assign({}, tg, { goal: !tg.goal })); }}>{tr('Objectif')}</button>
            <button type="button" className="cad-ex-pill" aria-pressed={tg.proj} onClick={function () { setTg(Object.assign({}, tg, { proj: !tg.proj })); }}>{tr('Projection')}</button>
            <button type="button" className="cad-ex-pill" aria-pressed={tg.weight} onClick={function () { setTg(Object.assign({}, tg, { weight: !tg.weight })); }}>{tr('Poids')}</button>
            {canMarks ? <button type="button" className="cad-ex-pill" aria-pressed={tg.events} onClick={function () { setTg(Object.assign({}, tg, { events: !tg.events })); }}>{tr('Mes événements')}</button> : null}
            <button type="button" className="cad-ex-pill" onClick={exportCsv}>⤓ {tr('Exporter')}</button>
          </div>
        </div>

        {!hasData ? (
          <p className="cad-p">{tr('Aucun test sur cette période pour cette mesure.')}</p>
        ) : (
          <svg className="cad-ex-chart" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={info.label}>
            <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity=".28"/><stop offset="100%" stopColor="var(--brand)" stopOpacity="0"/></linearGradient></defs>
            {ticks.map(function (v, i) {
              return <g key={i}><line x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} stroke="var(--border)" strokeDasharray="3 5"/><text x={PL - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-dim)">{Math.round(v)}</text></g>;
            })}
            {goal && tg.goal ? <g><line x1={PL} x2={W - PR} y1={Y(goal.target)} y2={Y(goal.target)} stroke="#16a34a" strokeWidth="1.6" strokeDasharray="8 5"/><text x={PL + 6} y={Y(goal.target) - 6} fontSize="12" fontWeight="700" fill="#16a34a" stroke="var(--bg-card)" strokeWidth="5" paintOrder="stroke">{tr('Objectif')} : {num(goal.target, info.dec)}{etaGoal ? ' · ' + tr('estimé') + ' ' + fmtMonth(etaGoal) : ''}</text></g> : null}
            {shownEvents.map(function (ev) {
              var x = X(dOf(ev.on_date));
              return <g key={ev.id}><line x1={x} x2={x} y1={PT} y2={PT + ih} stroke="#d97706" strokeDasharray="2 4"/><rect x={x - 3} y={PT - 18} width={Math.max(60, ev.label.length * 6.4 + 14)} height="18" rx="6" fill="rgba(245,158,11,.16)" stroke="#d97706"/><text x={x + 4} y={PT - 5} fontSize="11" fill="#b45309">{ev.label}</text></g>;
            })}
            {tg.weight && wts.length > 1 ? (
              <g><polyline points={wts.map(function (p) { return X(p.t) + ',' + WY(p.e.weight); }).join(' ')} fill="none" stroke="var(--text-dim)" strokeWidth="1.6" strokeDasharray="2 4"/>
                {wts.map(function (p) { return <text key={p.e.id} x={X(p.t)} y={WY(p.e.weight) + 15} textAnchor="middle" fontSize="10.5" fill="var(--text-dim)" stroke="var(--bg-card)" strokeWidth="4" paintOrder="stroke">{num(p.e.weight, 1)} kg</text>; })}</g>
            ) : null}
            {pts.length > 1 ? <polygon points={X(pts[0].t) + ',' + (PT + ih) + ' ' + line + ' ' + X(pts[pts.length - 1].t) + ',' + (PT + ih)} fill={'url(#' + gradId + ')'} opacity={drawn ? 1 : 0} style={{ transition: 'opacity .9s ease .3s' }}/> : null}
            {pts.length > 1 ? <polyline className={'cad-ex-line' + (drawn || reduced() ? ' is-on' : '')} pathLength="1" points={line} fill="none" stroke="var(--brand)" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round"/> : null}
            {showProj ? <g>
              <line x1={X(tLast)} y1={Y(pts[pts.length - 1].v)} x2={X(tMax)} y2={Y(projEnd)} stroke="var(--brand)" strokeWidth="2.4" strokeDasharray="3 7" strokeLinecap="round"/>
              <text x={X(tMax) - 4} y={Y(projEnd) + (reg.slope >= 0 ? 20 : -10)} textAnchor="end" fontSize="12" fill="var(--brand)" fontWeight="700" stroke="var(--bg-card)" strokeWidth="5" paintOrder="stroke">{tr('projection')} : {num(projEnd, info.dec)} · {fmtMonth(tMax)}</text></g> : null}
            {pts.map(function (p) {
              var on = cur && cur.e.id === p.e.id;
              return (
                <g key={p.e.id} onClick={function () { setSel(p.e.id); }} style={{ cursor: 'pointer' }}>
                  <circle className="cad-ex-pt" cx={X(p.t)} cy={Y(p.v)} r={on ? 9 : 6.5} fill="var(--bg-card)" stroke="var(--brand)" strokeWidth="3" tabIndex="0" role="button" aria-label={fmtDate(p.t) + ' : ' + num(p.v, info.dec)}
                    onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(p.e.id); } }}/>
                  <text x={X(p.t)} y={Y(p.v) - 15} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--text)">{num(p.v, info.dec)}</text>
                  <text x={X(p.t)} y={H - 26} textAnchor="middle" fontSize="11" fill="var(--text-dim)">{fmtDate(p.t, { month: 'short', year: 'numeric' })}</text>
                  <text x={X(p.t)} y={H - 11} textAnchor="middle" fontSize="10.5" fill="var(--text-dim)">{p.e.age} {tr('ans')} · {num(p.e.weight, 1)} kg</text>
                </g>
              );
            })}
          </svg>
        )}

        {cur ? (
          <div className="cad-ex-detail">
            <span>{info.label} · {fmtDate(cur.t)}</span>
            <b>{num(cur.v, info.dec)} <small style={{ fontSize: 12, fontWeight: 500 }}>{info.unit}</small></b>
            {prevOfCur ? <span className={cur.v - prevOfCur.v >= 0 ? 'cad-ex-up' : 'cad-ex-dn'}>{signed(cur.v - prevOfCur.v)} {tr('vs le test précédent')}</span> : <span>{tr('Premier test')}</span>}
            {info.test && cur.e.tests && cur.e.tests[info.test.slug] && cur.e.tests[info.test.slug].value != null && window.CadencesFormat ? <span>{tr('Valeur')} : <strong>{window.CadencesFormat.formatThreshold(info.test, cur.e.tests[info.test.slug].value, cur.e.weight)}</strong></span> : null}
            <span>{cur.e.age} {tr('ans')} · {num(cur.e.weight, 1)} kg</span>
            {props.onOpen ? <button type="button" className="cad-link" onClick={function () { props.onOpen(cur.e.id); }}>{tr('Ouvrir l’analyse de ce test')} →</button> : null}
          </div>
        ) : null}
        {tg.proj && !reg && hasData ? <p className="cad-ex-note">{tr('Projection : il faut au moins 3 tests pour estimer une tendance.')}</p> : null}

        {canMarks ? (
          <div className="cad-ex-form">
            <span className="cad-ex-lbl">{tr('Objectif sur cette mesure')}</span>
            <input className="cad-ex-in" style={{ width: 90 }} inputMode="decimal" value={goalIn} placeholder={tr('ex. 70')} onChange={function (e) { setGoalIn(e.target.value); }} aria-label={tr('Valeur cible')}/>
            <button type="button" className="cad-ex-pill" onClick={addGoal}>{tr('Fixer l’objectif')}</button>
            {goal ? <span className="cad-ex-chip">{tr('Objectif')} {num(goal.target, info.dec)}<button type="button" aria-label={tr('Supprimer')} onClick={function () { delMark(goal.id); }}>×</button></span> : null}
            <span className="cad-ex-lbl" style={{ marginLeft: 12 }}>{tr('Événement')}</span>
            <input className="cad-ex-in" type="date" value={evIn.date} onChange={function (e) { setEvIn({ date: e.target.value, label: evIn.label }); }} aria-label={tr('Date')}/>
            <input className="cad-ex-in" style={{ width: 190 }} maxLength="80" value={evIn.label} placeholder={tr('ex. Début prépa force')} onChange={function (e) { setEvIn({ date: evIn.date, label: e.target.value }); }} aria-label={tr('Libellé')}/>
            <button type="button" className="cad-ex-pill" onClick={addEvent}>{tr('Ajouter')}</button>
            {events.map(function (ev) { return <span key={ev.id} className="cad-ex-chip">{fmtDate(dOf(ev.on_date), { day: 'numeric', month: 'short', year: 'numeric' })} · {ev.label}<button type="button" aria-label={tr('Supprimer')} onClick={function () { delMark(ev.id); }}>×</button></span>; })}
            {err ? <span className="cad-ex-dn" style={{ fontSize: 12.5 }}>{err}</span> : null}
          </div>
        ) : null}

        <div className="cad-ex-g2">
          <div className="cad-card" style={{ margin: 0 }}>
            <div className="cad-act-eye">{tr('Comparer deux tests')}</div>
            <div className="cad-ex-grp" style={{ margin: '8px 0' }}>
              <select className="cad-ex-sel" aria-label={tr('Test A')} value={cmpA || ''} onChange={function (e) { setCmpA(e.target.value); }}>{hist.map(dateOpt)}</select>
              <span style={{ color: 'var(--text-dim)' }}>vs</span>
              <select className="cad-ex-sel" aria-label={tr('Test B')} value={cmpB || ''} onChange={function (e) { setCmpB(e.target.value); }}>{hist.map(dateOpt)}</select>
            </div>
            {window.CadRadar && eA && eB ? <div style={{ display: 'grid', placeItems: 'center' }}><window.CadRadar items={qItems(eA)} items2={qItems(eB)} color="#9ca3af" color2="#00a3b8" legend1={eA ? fmtDate(dOf(eA.date)) : ''} legend2={eB ? fmtDate(dOf(eB.date)) : ''} size={300}/></div> : null}
          </div>
          <div className="cad-card" style={{ margin: 0 }}>
            <div className="cad-act-eye">{tr('Ce que dit ton historique')}</div>
            {reads.length ? <div className="cad-ex-read" style={{ marginTop: 6 }}>{reads.map(function (r, i) { return <div key={i}><span className={r.c} style={{ flex: 'none' }}>{r.i}</span><span><b>{r.h}</b> — {r.p}</span></div>; })}</div> : <p className="cad-p" style={{ marginTop: 8 }}>{tr('Fais un deuxième test pour voir apparaître une lecture de ta progression.')}</p>}
          </div>
        </div>
        <p className="cad-ex-note">{tr('Clique sur un point pour voir son détail. Les tendances sont des estimations d’après tes derniers tests, pas des promesses.')}</p>
      </section>
    );
  }

  window.CadExplorer = CadExplorer;
})();
