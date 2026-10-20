/* ════════════════════════════════════════════════════════════════
   Mon historique — hub : grand graphique chronologique de TOUS les tests réalisés
   (Decaform, test de forme, tests personnalisés), puis sélecteur de test trié.
   Un clic ouvre la page dédiée du test (#decaform, #perso:<id>, test de forme).
   SVG brut, aucune librairie. Thème : suit le thème du site (clair / sombre).
   Publie window.CadHistoryHome (routeur hub ⇄ détail).
   ════════════════════════════════════════════════════════════════ */
(function () {
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  function dOf(iso) { return Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z'); }
  function fmtDate(ms, o) { try { return new Date(ms).toLocaleDateString(window.CadLocale ? window.CadLocale() : 'fr-FR', o || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function num(v) { return (Math.round(v * 10) / 10 + '').replace('.', ','); }
  var COLORS = ['#d97706', '#7c3aed', '#059669', '#db2777', '#2563eb', '#0d9488'];
  var PRODUCT_NAMES = { decaform: 'Decaform', forme: 'Test de forme' };
  function productName(k) { return PRODUCT_NAMES[k] || String(k).replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }

  // ── Construction des séries : une série par test (produit ou test perso) ──
  function buildSeries(cat, history, forme, custom) {
    var S = [];
    var groups = {};
    (history || []).concat(forme || []).forEach(function (e) { var k = e.test_key || 'decaform'; (groups[k] = groups[k] || []).push(e); });
    var ci = 0;
    Object.keys(groups).forEach(function (k) {
      var list = groups[k].slice().sort(function (a, b) { return dOf(a.date) - dOf(b.date); });
      var isDeca = k === 'decaform', isForme = k === 'forme';
      var color = isDeca ? 'var(--brand)' : isForme ? COLORS[0] : COLORS[(++ci) % COLORS.length];
      var pts = list.map(function (e) {
        var max = e.scoreMax || (isDeca ? (cat && cat.totalPoints) || 1000 : 100);
        var lvl = (isDeca && cat && cat.palette && cat.palette[e.level]) || null;
        return { id: e.id, ms: dOf(e.date), y: Math.max(0, Math.min(100, e.score / max * 100)), score: Math.round(e.score), max: max, level: e.level || '', lvlColor: lvl, cond: e.weight ? num(e.weight) + ' kg' : '' };
      });
      S.push({ key: k, kind: isDeca ? 'decaform' : isForme ? 'forme' : 'product', name: productName(k), tag: isForme ? 'Forme' : 'Batterie', color: color, pts: pts,
        href: isDeca ? '#decaform' : isForme ? 'test-de-forme.html' : 'cadences.html?test=' + encodeURIComponent(k), scored: true });
    });
    var math = window.cadCustomMath;
    ((custom && custom.tests) || []).forEach(function (t) {
      var runs = ((custom.runs || []).filter(function (r) { return r.test_id === t.id; })).sort(function (a, b) { return String(a.performed_on).localeCompare(String(b.performed_on)); });
      var scored = t.scoring !== 'values';
      var pts = [];
      runs.forEach(function (r) {
        var g = scored && math ? math.globalScore(t, r) : null;
        if (g != null && isFinite(g)) pts.push({ id: r.id, ms: dOf(r.performed_on), y: Math.max(0, Math.min(100, g)), score: Math.round(g), max: 100, level: '', lvlColor: null, cond: r.conditions || '' });
      });
      S.push({ key: 'perso:' + t.id, kind: 'perso', name: t.name, tag: t.sport || 'Perso', color: COLORS[(++ci) % COLORS.length], pts: pts, runs: runs.length, scored: scored,
        lastMs: runs.length ? dOf(runs[runs.length - 1].performed_on) : 0, href: '#perso:' + t.id });
    });
    S.forEach(function (s) { s.n = s.kind === 'perso' ? s.runs : s.pts.length; if (s.kind !== 'perso') s.lastMs = s.pts.length ? s.pts[s.pts.length - 1].ms : 0; });
    return S;
  }

  function useWidth(ref) {
    var s = React.useState(900); var w = s[0], setW = s[1];
    React.useEffect(function () {
      var el = ref.current; if (!el) return undefined;
      function m() { var r = el.getBoundingClientRect(); if (r.width) setW(Math.round(r.width)); }
      m();
      var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(m) : null;
      if (ro) ro.observe(el); else window.addEventListener('resize', m);
      return function () { if (ro) ro.disconnect(); else window.removeEventListener('resize', m); };
    }, []);
    return w;
  }

  // ── Grand graphique chronologique ──
  function HubChart(props) {
    var wrap = React.useRef(null);
    var W = useWidth(wrap);
    var as = React.useState(null); var active = as[0], setActive = as[1];
    var narrow = W < 560;
    var H = narrow ? 320 : 460;
    var pad = { l: narrow ? 36 : 48, r: narrow ? 14 : 24, t: 20, b: 40 };
    var vis = props.series.filter(function (s) { return props.hidden.indexOf(s.key) === -1 && s.pts.length; });
    var all = []; vis.forEach(function (s) { s.pts.forEach(function (p) { all.push(p.ms); }); });
    if (props.since) all = all.filter(function (m) { return m >= props.since; });
    var DAY = 86400000;
    var xmin = all.length ? Math.min.apply(null, all) : Date.now() - 30 * DAY, xmax = all.length ? Math.max.apply(null, all) : Date.now();
    if (props.since) xmin = Math.max(props.since, xmin - 3 * DAY);
    var span = Math.max(xmax - xmin, 30 * DAY); var padMs = span * 0.04;
    var x0 = xmin - padMs, x1 = Math.max(xmax, xmin + 30 * DAY) + padMs;
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    function X(ms) { return pad.l + (ms - x0) / (x1 - x0) * iw; }
    function Y(v) { return pad.t + (1 - v / 100) * ih; }
    var nT = narrow ? 3 : 7, ticks = [];
    for (var i = 0; i <= nT; i++) ticks.push(x0 + (x1 - x0) * i / nT);
    var longSpan = (x1 - x0) > 700 * DAY;
    var tf = longSpan ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' };
    var ap = active && active.s && active.p ? active : null;
    var tip = null;
    if (ap) {
      var tx = X(ap.p.ms), ty = Y(ap.p.y), tw = Math.min(250, W - 16);
      var left = Math.max(8, Math.min(W - tw - 8, tx - tw / 2));
      var below = ty < 190;
      tip = (
        <div className="hub-tip" role="status" style={{ left: left, width: tw, top: below ? ty + 16 : 'auto', bottom: below ? 'auto' : H - ty + 16 }}>
          <div className="hub-tip-h"><i style={{ background: ap.s.color }}/>{ap.s.name}</div>
          <div className="hub-tip-v"><b>{ap.p.score}</b><small>/ {ap.p.max}</small>{ap.p.level ? <span><i style={{ background: ap.p.lvlColor || 'var(--text-dim)' }}/>{ap.p.level}</span> : null}</div>
          <div className="hub-tip-d">{fmtDate(ap.p.ms)}{ap.p.cond ? ' · ' + ap.p.cond : ''}</div>
          <a className="hub-tip-a" href={ap.s.href}>{tr('Ouvrir ce test')} →</a>
        </div>
      );
    }
    return (
      <div className="hub-chart" ref={wrap} onMouseLeave={function () { setActive(null); }}>
        <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={tr('Tous tes tests dans l’ordre chronologique')} onClick={function (e) { if (e.target.tagName === 'svg') setActive(null); }}>
          {[0, 25, 50, 75, 100].map(function (v) {
            return (<g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? '' : '3 5'}/>
              <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end" className="hub-ax">{v}</text>
            </g>);
          })}
          {ticks.map(function (t, i) {
            return <text key={i} x={X(t)} y={H - 14} textAnchor={i === 0 ? 'start' : i === nT ? 'end' : 'middle'} className="hub-ax">{fmtDate(t, tf)}</text>;
          })}
          {vis.map(function (s) {
            var pts = s.pts.filter(function (p) { return !props.since || p.ms >= props.since; });
            var dim = props.focus && props.focus !== s.key;
            return (
              <g key={s.key} opacity={dim ? 0.18 : 1} style={{ transition: 'opacity .2s' }}>
                {pts.length > 1 ? <polyline fill="none" stroke={s.color} strokeWidth={props.focus === s.key ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" points={pts.map(function (p) { return X(p.ms) + ',' + Y(p.y); }).join(' ')}/> : null}
                {pts.map(function (p) {
                  var on = ap && ap.p === p;
                  return (
                    <g key={p.id} className="hub-dot" tabIndex={0} role="button" aria-label={s.name + ', ' + fmtDate(p.ms) + ', ' + p.score + ' / ' + p.max}
                       onMouseEnter={function () { setActive({ s: s, p: p }); }} onFocus={function () { setActive({ s: s, p: p }); }}
                       onClick={function (e) { e.stopPropagation(); setActive(on ? null : { s: s, p: p }); }}
                       onKeyDown={function (e) { if (e.key === 'Enter' && props.onOpen) props.onOpen(s); }}>
                      <circle cx={X(p.ms)} cy={Y(p.y)} r={narrow ? 20 : 16} fill="transparent"/>
                      <circle cx={X(p.ms)} cy={Y(p.y)} r={on ? 9 : 6.5} fill={s.color} stroke="var(--bg)" strokeWidth="2.5"/>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        {!vis.length ? <div className="hub-empty-chart">{tr('Aucun résultat à afficher pour ces filtres.')}</div> : null}
        {tip}
      </div>
    );
  }

  function Spark(p) {
    var v = p.values; if (v.length < 2) return <svg width="96" height="30" aria-hidden="true"><circle cx="92" cy="15" r="3.5" fill={p.color}/></svg>;
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), sp = Math.max(mx - mn, 1e-9);
    var pts = v.map(function (x, i) { return (4 + 86 * i / (v.length - 1)) + ',' + (26 - 22 * (x - mn) / sp); });
    var l = pts[pts.length - 1].split(',');
    return <svg width="96" height="30" viewBox="0 0 96 30" aria-hidden="true"><polyline fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" points={pts.join(' ')}/><circle cx={l[0]} cy={l[1]} r="3.5" fill={p.color}/></svg>;
  }

  // ── Hub ──
  function Hub(props) {
    var series = props.series;
    var hS = React.useState([]); var hidden = hS[0], setHidden = hS[1];
    var fS = React.useState(null); var focus = fS[0], setFocus = fS[1];
    var rS = React.useState('all'); var range = rS[0], setRange = rS[1];
    var sS = React.useState('recent'); var sort = sS[0], setSort = sS[1];
    var kS = React.useState('all'); var kind = kS[0], setKind = kS[1];
    var since = range === 'all' ? null : Date.now() - (range === 'y' ? 365 : 90) * 86400000;
    function toggle(k) { setHidden(function (h) { return h.indexOf(k) === -1 ? h.concat([k]) : h.filter(function (x) { return x !== k; }); }); }
    var total = 0; series.forEach(function (s) { total += s.n; });
    var plotted = series.filter(function (s) { return s.pts.length; });
    var list = series.filter(function (s) { return kind === 'all' || (kind === 'perso' ? s.kind === 'perso' : s.kind !== 'perso'); }).slice();
    list.sort(function (a, b) {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'count') return b.n - a.n;
      if (sort === 'best') return (b.pts.length ? Math.max.apply(null, b.pts.map(function (p) { return p.y; })) : -1) - (a.pts.length ? Math.max.apply(null, a.pts.map(function (p) { return p.y; })) : -1);
      return b.lastMs - a.lastMs;
    });
    var hasPerso = series.some(function (s) { return s.kind === 'perso'; });
    return (
      <div className="hub">
        <header className="hub-head">
          <div>
            <div className="hub-eye">{tr('Mon historique')}</div>
            <h1 className="hub-h1">{total ? tr('Tous tes tests, dans l’ordre') : tr('Pas encore de test')}</h1>
            <p className="hub-lead">{total ? window.CadT('{n} résultats sur {m} tests. Survole ou touche un point pour le détail, puis choisis un test en dessous.', { n: total, m: series.length }) : tr('Réalise ton premier test : il s’affichera ici, avec la courbe de ta progression.')}</p>
          </div>
          <div className="hub-cta">
            <a className="hub-btn is-main" href="cadences.html">{tr('Démarrer un test')}</a>
            <a className="hub-btn" href="#perso:new">{tr('Créer un test perso')}</a>
          </div>
        </header>

        {total ? (
          <section className="hub-card" aria-label={tr('Graphique chronologique')}>
            <div className="hub-bar">
              <div className="hub-legend" role="group" aria-label={tr('Afficher / masquer un test')}>
                {plotted.map(function (s) {
                  var off = hidden.indexOf(s.key) !== -1;
                  return (
                    <button key={s.key} type="button" className="hub-chip" aria-pressed={!off}
                            onClick={function () { toggle(s.key); }} onMouseEnter={function () { setFocus(s.key); }} onMouseLeave={function () { setFocus(null); }}>
                      <i style={{ background: s.color }}/>{s.name}
                    </button>
                  );
                })}
              </div>
              <div className="hub-seg" role="group" aria-label={tr('Période')}>
                {[['all', 'Tout'], ['y', '12 mois'], ['q', '3 mois']].map(function (o) {
                  return <button key={o[0]} type="button" aria-pressed={range === o[0]} onClick={function () { setRange(o[0]); }}>{tr(o[1])}</button>;
                })}
              </div>
            </div>
            <HubChart series={series} hidden={hidden} focus={focus} since={since} onOpen={props.onOpen}/>
            <p className="hub-foot">{tr('Échelle commune : 100 = score maximum de chaque test. Les tests personnalisés « valeurs seulement » n’ont pas de note : ils sont listés sans courbe.')}</p>
          </section>
        ) : null}

        <section className="hub-pick" aria-label={tr('Choisir un test')}>
          <div className="hub-pick-top">
            <h2>{tr('Choisis le test qui t’intéresse')}</h2>
            <div className="hub-ctl">
              <div className="hub-seg" role="group" aria-label={tr('Type')}>
                {[['all', 'Tous'], ['bat', 'Batteries'], ['perso', 'Perso']].map(function (o) {
                  return <button key={o[0]} type="button" aria-pressed={kind === o[0]} onClick={function () { setKind(o[0]); }}>{tr(o[1])}</button>;
                })}
              </div>
              <label className="hub-sort"><span>{tr('Trier')}</span>
                <select value={sort} onChange={function (e) { setSort(e.target.value); }}>
                  <option value="recent">{tr('Dernier passage')}</option>
                  <option value="count">{tr('Nombre de passages')}</option>
                  <option value="best">{tr('Meilleur niveau')}</option>
                  <option value="name">{tr('Nom (A–Z)')}</option>
                </select>
              </label>
            </div>
          </div>
          <div className="hub-grid">
            {list.map(function (s) {
              var last = s.pts[s.pts.length - 1], prev = s.pts[s.pts.length - 2];
              var d = last && prev ? last.score - prev.score : null;
              return (
                <a key={s.key} className="hub-tile" href={s.href} onMouseEnter={function () { setFocus(s.key); }} onMouseLeave={function () { setFocus(null); }}
                   onClick={function (e) { if (s.href.charAt(0) === '#') { e.preventDefault(); props.onOpen(s); } }}>
                  <span className="hub-tag"><i style={{ background: s.color }}/>{tr(s.tag)}</span>
                  <b className="hub-tn">{s.name}</b>
                  <small>{s.n} {s.n > 1 ? tr('passages') : tr('passage')}{s.lastMs ? ' · ' + tr('dernier') + ' ' + fmtDate(s.lastMs) : ''}</small>
                  <div className="hub-tv">
                    {last ? <div><strong>{last.score}</strong><small> / {last.max}</small>{d != null ? <em className={d >= 0 ? 'up' : 'dn'}>{d >= 0 ? '+' : '−'}{Math.abs(d)}</em> : null}</div>
                      : <div><small>{s.scored ? tr('Aucun passage') : tr('Valeurs seulement')}</small></div>}
                    {s.pts.length ? <Spark values={s.pts.map(function (p) { return p.y; })} color={s.color}/> : null}
                  </div>
                  <span className="hub-go">{tr('Ouvrir')} →</span>
                </a>
              );
            })}
            <a className="hub-tile is-new" href="#perso:new" onClick={function (e) { e.preventDefault(); props.onOpen({ key: 'perso:new', href: '#perso:new' }); }}>
              <b className="hub-tn">{tr('Nouveau test perso')}</b><small>{tr('Natation, course, haltérophilie… à partir d’un modèle ou de zéro')}</small>
            </a>
          </div>
          {!hasPerso ? <p className="hub-foot">{tr('Les tests personnalisés ne sont jamais publiés, ni comparés aux autres athlètes, ni mélangés au score Decaform.')}</p> : null}
        </section>
      </div>
    );
  }

  function HubStyle() {
    return (
      <style>{`
        .hub { padding-bottom: 20px; }
        .hub-head { display: flex; flex-wrap: wrap; gap: 14px 24px; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; }
        .hub-eye { font-family: var(--font-mono); font-size: 11.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); display: inline-flex; align-items: center; gap: 10px; }
        .hub-eye::before { content: ''; width: 26px; height: 1px; background: var(--gold-ink); }
        .hub-h1 { font-family: var(--font-display); font-weight: 600; font-size: clamp(30px, 4.2vw, 48px); line-height: 1.06; letter-spacing: -.02em; margin: 8px 0 6px; color: var(--text); }
        .hub-lead { font-family: var(--font-body); font-size: 14.5px; color: var(--text-mid); margin: 0; max-width: 62ch; }
        .hub-cta { display: flex; flex-wrap: wrap; gap: 10px; }
        .hub-btn { font-family: var(--font-body); font-weight: 700; font-size: 14px; border-radius: 12px; padding: 12px 20px; cursor: pointer; border: 1px solid var(--border-mid); background: var(--hv-t2); color: var(--text); text-decoration: none; display: inline-flex; align-items: center; transition: transform .2s, filter .2s; }
        .hub-btn:hover { transform: translateY(-2px); }
        .hub-btn.is-main { background: var(--brand-gradient); color: #fff; border-color: transparent; } .hub-btn.is-main:hover { filter: brightness(1.08); }
        .hub-card { border: 1px solid var(--border); border-radius: 20px; background: var(--hv-card); box-shadow: var(--hv-shadow); padding: 18px 20px 14px; }
        .hub-bar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .hub-legend { display: flex; flex-wrap: wrap; gap: 8px; }
        .hub-chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border-mid); background: var(--hv-t1); color: var(--text); border-radius: 999px; font-family: var(--font-body); font-weight: 600; font-size: 13px; padding: 7px 14px; cursor: pointer; min-height: 36px; }
        .hub-chip i, .hub-tag i, .hub-tip-h i, .hub-tip-v i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .hub-chip[aria-pressed="false"] { opacity: .45; text-decoration: line-through; }
        .hub-seg { display: inline-flex; border: 1px solid var(--border-mid); border-radius: 999px; overflow: hidden; }
        .hub-seg button { border: 0; background: transparent; color: var(--text-mid); font-family: var(--font-body); font-size: 13px; font-weight: 700; padding: 8px 15px; cursor: pointer; min-height: 36px; }
        .hub-seg button[aria-pressed="true"] { background: var(--hv-t3); color: var(--hv-on); }
        .hub-chart { position: relative; width: 100%; }
        .hub-chart svg { display: block; overflow: visible; }
        .hub-ax { font-family: var(--font-body); font-size: 12px; fill: var(--text-dim); }
        .hub-dot { cursor: pointer; outline: none; } .hub-dot:focus-visible circle:last-child { stroke: var(--text); }
        .hub-tip { position: absolute; z-index: 5; background: var(--bg); color: var(--text); border: 1px solid var(--border-mid); border-radius: 14px; box-shadow: 0 14px 36px rgba(0,0,0,.25); padding: 12px 14px; font-family: var(--font-body); }
        html.dark .hub-tip { background: #0f1d31; }
        .hub-tip-h { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; }
        .hub-tip-v { display: flex; align-items: baseline; gap: 6px; margin: 4px 0 2px; } .hub-tip-v b { font-family: var(--font-display); font-size: 28px; line-height: 1; } .hub-tip-v small { color: var(--text-dim); font-size: 13px; } .hub-tip-v span { display: inline-flex; align-items: center; gap: 6px; color: var(--text); margin-left: auto; font-weight: 800; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
        .hub-tip-d { font-size: 12.5px; color: var(--text-mid); }
        .hub-tip-a { display: inline-block; margin-top: 8px; font-weight: 700; font-size: 13px; color: var(--brand); text-decoration: none; padding: 6px 0; }
        .hub-empty-chart { position: absolute; inset: 0; display: grid; place-items: center; color: var(--text-mid); font-family: var(--font-body); font-size: 14px; }
        .hub-foot { font-family: var(--font-body); font-size: 12.5px; color: var(--text-dim); margin: 10px 2px 0; line-height: 1.5; }
        .hub-pick { margin-top: 30px; padding: 0 !important; }
        .hub-card, .hub-head { padding-left: inherit; }
        .hub-pick-top { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: end; justify-content: space-between; margin-bottom: 14px; }
        .hub-pick h2 { font-family: var(--font-display); font-weight: 600; font-size: clamp(22px, 2.6vw, 30px); margin: 0; letter-spacing: -.015em; color: var(--text); }
        .hub-ctl { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .hub-sort { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-body); font-size: 13px; color: var(--text-mid); }
        .hub-sort select { background: var(--hv-t1); color: var(--text); border: 1px solid var(--border-mid); border-radius: 10px; padding: 8px 10px; font-family: var(--font-body); font-size: 13.5px; min-height: 36px; }
        .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .hub-tile { display: grid; gap: 4px; align-content: start; border: 1px solid var(--border); border-radius: 18px; padding: 16px 18px; background: var(--hv-card); box-shadow: var(--hv-shadow); color: var(--text); text-decoration: none; transition: transform .2s, border-color .2s; }
        .hub-tile:hover, .hub-tile:focus-visible { transform: translateY(-3px); border-color: var(--brand); outline: none; }
        .hub-tag { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-weight: 700; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-mid); }
        .hub-tn { font-family: var(--font-display); font-size: 20px; margin-top: 2px; }
        .hub-tile small { font-family: var(--font-body); font-size: 12.5px; color: var(--text-dim); }
        .hub-tv { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-top: 8px; }
        .hub-tv strong { font-family: var(--font-display); font-size: 32px; line-height: 1; font-variant-numeric: tabular-nums; }
        .hub-tv em { font-style: normal; font-weight: 800; font-size: 13px; margin-left: 8px; } .hub-tv em.up { color: #059669; } .hub-tv em.dn { color: #dc2626; }
        .hub-go { margin-top: 8px; font-family: var(--font-body); font-weight: 700; font-size: 13px; color: var(--brand); }
        .hub-tile.is-new { border-style: dashed; place-items: center; text-align: center; align-content: center; min-height: 150px; box-shadow: none; background: transparent; }
        .hub-back { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-weight: 700; font-size: 14px; color: var(--text); text-decoration: none; padding: 8px 0; margin-bottom: 6px; min-height: 40px; }
        .hub-back:hover { color: var(--brand); }
        @media (max-width: 640px) {
          .hub-head { margin-bottom: 16px; } .hub-cta { width: 100%; } .hub-cta .hub-btn { flex: 1 1 auto; justify-content: center; }
          .hub-card { padding: 14px 12px 12px; border-radius: 16px; }
          .hub-bar { gap: 8px; } .hub-seg { width: 100%; } .hub-seg button { flex: 1; padding: 8px 6px; }
          .hub-ctl { width: 100%; } .hub-sort { width: 100%; } .hub-sort select { flex: 1; }
          .hub-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
    );
  }

  // ── Routeur : hub ⇄ page dédiée du test (hash) ──
  function CadHistoryHome(props) {
    if (window.CadUseLang) window.CadUseLang();
    var hS = React.useState(function () { return window.location.hash || ''; }); var hash = hS[0], setHash = hS[1];
    React.useEffect(function () {
      function on() { setHash(window.location.hash || ''); try { window.scrollTo(0, 0); } catch (e) {} }
      window.addEventListener('hashchange', on); return function () { window.removeEventListener('hashchange', on); };
    }, []);
    var cS = React.useState(null); var custom = cS[0], setCustom = cS[1];
    React.useEffect(function () {
      var alive = true;
      fetch((props.apiBase || '') + '/api/cadences/custom', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (alive) setCustom(j && j.available ? { tests: j.tests || [], runs: j.runs || [] } : { tests: [], runs: [] }); })
        .catch(function () { if (alive) setCustom({ tests: [], runs: [] }); });
      return function () { alive = false; };
    }, [props.apiBase]);
    function go(h) { if (window.location.hash === h) { setHash(h); return; } window.location.hash = h; }
    function open(s) { var h = s.href && s.href.charAt(0) === '#' ? s.href : null; if (h) go(h); else if (s.href) window.location.href = s.href; }
    var back = <a className="hub-back" href="#" onClick={function (e) { e.preventDefault(); go(''); if (!window.location.hash) setHash(''); }}>← {tr('Tous mes tests')}</a>;
    var body;
    if (hash === '#decaform') {
      body = (<div><HubStyle/>{back}
        <window.CadHistory catalog={props.catalog} history={props.history} legacyTests={props.legacyTests} mode={props.mode} apiBase={props.apiBase}
          onBack={function () { go(''); }} onStart={props.onStart} onDelete={props.onDelete} onOpen={props.onOpen}/></div>);
    } else if (/^#perso:/.test(hash) && window.CadCustom) {
      var id = hash.slice(7);
      var exists = id === 'new' || (custom && custom.tests.some(function (t) { return t.id === id; }));
      body = (<div><HubStyle/>{back}
        {custom === null ? <p className="hub-lead">{tr('Chargement…')}</p>
          : <window.CadCustom key={id} appUrl={props.apiBase || ''} standalone={true} initialView={id === 'new' ? { v: 'build' } : exists ? { v: 'detail', id: id } : null} onExit={function () { go(''); }}/>}</div>);
    } else {
      var series = buildSeries(props.catalog, props.history, props.forme, custom || { tests: [], runs: [] });
      body = (<div><HubStyle/><Hub series={series} onOpen={open}/></div>);
    }
    return body;
  }
  window.CadHistoryHome = CadHistoryHome;
})();
