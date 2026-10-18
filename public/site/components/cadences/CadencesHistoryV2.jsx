/* ════════════════════════════════════════════════════════════════
   Decaform (site) — page « Mon historique » : bandeau d'entrée animé et grand
   tableau de TOUS les tests (un test par colonne, qualités et épreuves en lignes).
   Thème « nuit de stade » : .cad-night redéfinit les variables sombres, quel que
   soit le thème du site. SVG/HTML bruts, aucune librairie.
   Publie window.CadHistoryHero, window.CadHistoryMatrix, window.CadReveal.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var DAY = 86400000;
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  function dOf(iso) { return Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z'); }
  function fmtDate(ms, o) { try { return new Date(ms).toLocaleDateString(window.CadLocale ? window.CadLocale() : 'fr-FR', o || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function num(v, d) { var p = Math.pow(10, d || 0); return (Math.round(v * p) / p + '').replace('.', ','); }
  function signed(n) { var r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function lvColor(cat, lv) { return (cat && cat.palette && cat.palette[lv]) || '#9ca3af'; }
  function cleanName(t) { return t.name.replace(/\s*\(.*\)$/, ''); }

  // Apparition au défilement : ajoute .in quand l'élément entre dans l'écran.
  function useIn() {
    var ref = React.useRef(null); var s = React.useState(reduced()); var on = s[0], setOn = s[1];
    React.useEffect(function () {
      var el = ref.current; if (!el || on) return undefined;
      if (typeof IntersectionObserver === 'undefined') { setOn(true); return undefined; }
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { setOn(true); io.disconnect(); } }); }, { threshold: 0.08 });
      io.observe(el); return function () { io.disconnect(); };
    }, [on]);
    return [ref, on];
  }
  function CadReveal(props) {
    var r = useIn();
    return <div ref={r[0]} className={'cad-rv' + (r[1] ? ' in' : '')} style={props.style}>{props.children}</div>;
  }
  function CountUp(props) {
    var target = props.value || 0, dec = props.dec || 0;
    var s = React.useState(reduced() ? target : 0); var v = s[0], setV = s[1];
    React.useEffect(function () {
      if (reduced()) { setV(target); return undefined; }
      var start = null, raf;
      function step(ts) { if (start == null) start = ts; var k = Math.min(1, (ts - start) / 1200); setV(target * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); }
      raf = requestAnimationFrame(step); return function () { cancelAnimationFrame(raf); };
    }, [target]);
    return <span>{num(v, dec)}</span>;
  }

  // Variables sombres (copie de :root) + styles de la page.
  function Style() {
    return (
      <style>{`
        .cad-night-band { --bg:#08121f; --bg-alt:#0c1829; --bg-card:rgba(238,243,248,.05); --bg-card-2:rgba(238,243,248,.03); --bg-hover:rgba(238,243,248,.08);
          --border:rgba(158,177,200,.18); --border-mid:rgba(158,177,200,.3); --text:#eef3f8; --text-mid:#b4c3d6; --text-dim:#8397af; --input-bg:rgba(255,255,255,.06);
          --brand:#00c8e0; --brand-deep:#0099b8; --gold-ink:#e0b766; --shadow:0 4px 24px rgba(0,0,0,.35); --shadow-card:0 2px 14px rgba(0,0,0,.3);
          position: relative; color: var(--text); background: radial-gradient(1100px 520px at 12% -8%, rgba(0,200,224,.16), transparent 60%), radial-gradient(900px 480px at 92% 0%, rgba(91,111,255,.18), transparent 60%), #08121f; margin-top: -1px; }
        .cad-night-band::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .5; background-image: radial-gradient(rgba(158,177,200,.10) 1px, transparent 1px); background-size: 26px 26px; -webkit-mask-image: linear-gradient(#000, transparent 60%); mask-image: linear-gradient(#000, transparent 60%); }
        .cad-night-band .cad-wrap { position: relative; max-width: 1320px; padding-top: 34px; }
        .cad-night-band .cad-card { background: linear-gradient(160deg, rgba(238,243,248,.065), rgba(238,243,248,.03)); border: 1px solid var(--border); box-shadow: var(--shadow-card); }
        .cad-night-band select, .cad-night-band input { color-scheme: dark; }
        .cad-rv { opacity: 0; transform: translateY(22px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1); }
        .cad-rv.in { opacity: 1; transform: none; }
        @keyframes cadHvRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes cadHvGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(224,183,102,.0); } 50% { box-shadow: 0 0 22px 2px rgba(224,183,102,.28); } }
        @keyframes cadHvFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes cadHvShine { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        @keyframes cadHvDraw { to { stroke-dashoffset: 0; } }
        @keyframes cadHvPulse { 0% { r: 7; opacity: .7; } 100% { r: 20; opacity: 0; } }

        /* ── Bandeau d'entrée ── */
        .cad-hv-hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 36px; align-items: center; padding: 6px 0 8px; }
        @media (max-width: 920px) { .cad-hv-hero { grid-template-columns: minmax(0, 1fr); } }
        .cad-hv-eye { font-family: var(--font-mono); font-size: 11.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); display: inline-flex; align-items: center; gap: 10px; animation: cadHvRise .7s both; }
        .cad-hv-eye::before { content: ''; width: 26px; height: 1px; background: var(--gold-ink); }
        .cad-hv-h1 { font-family: var(--font-display); font-weight: 600; font-size: clamp(38px, 5.4vw, 66px); line-height: 1.02; letter-spacing: -.022em; margin: 12px 0 14px; color: var(--text); animation: cadHvRise .8s .08s both; }
        .cad-hv-h1 em { font-style: normal; background: linear-gradient(110deg, #00c8e0 10%, #7b8cff 55%, #e0b766 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: cadHvShine 7s linear infinite; }
        .cad-hv-lead { font-family: var(--font-body); font-size: 16.5px; line-height: 1.6; color: var(--text-mid); max-width: 52ch; margin: 0 0 22px; animation: cadHvRise .8s .16s both; }
        .cad-hv-cta { display: flex; flex-wrap: wrap; gap: 10px; animation: cadHvRise .8s .24s both; }
        .cad-hv-btn { font-family: var(--font-body); font-weight: 700; font-size: 14px; border-radius: 12px; padding: 12px 20px; cursor: pointer; border: 1px solid var(--border-mid); background: rgba(238,243,248,.06); color: var(--text); transition: transform .2s, box-shadow .2s, background .2s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
        .cad-hv-btn:hover { transform: translateY(-2px); background: rgba(238,243,248,.11); }
        .cad-hv-btn.is-main { background: linear-gradient(120deg, #00c8e0, #5b6fff); color: #04121f; border-color: transparent; box-shadow: 0 8px 26px rgba(0,200,224,.28); }
        .cad-hv-btn.is-main:hover { box-shadow: 0 12px 34px rgba(0,200,224,.42); }
        .cad-hv-card { border-radius: 22px; padding: 22px 24px; background: linear-gradient(160deg, rgba(19,35,58,.92), rgba(12,24,41,.92)); border: 1px solid rgba(224,183,102,.35); box-shadow: 0 18px 50px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06); animation: cadHvRise .9s .2s both, cadHvFloat 7s 1.2s ease-in-out infinite; }
        .cad-hv-now { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
        .cad-hv-now b { font-family: var(--font-display); font-weight: 600; font-size: 72px; line-height: 1; letter-spacing: -.03em; color: var(--text); font-variant-numeric: tabular-nums; }
        .cad-hv-now small { font-size: 15px; color: var(--text-dim); }
        .cad-hv-lvl { display: inline-block; font-family: var(--font-body); font-weight: 800; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; border: 1px solid currentColor; }
        .cad-hv-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
        .cad-hv-stat { border-radius: 12px; padding: 10px 12px; background: rgba(238,243,248,.045); border: 1px solid var(--border); }
        .cad-hv-stat small { display: block; font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); }
        .cad-hv-stat b { display: block; font-family: var(--font-display); font-size: 20px; color: var(--text); margin-top: 2px; font-variant-numeric: tabular-nums; }
        .cad-hv-up { color: #34d399 !important; } .cad-hv-dn { color: #f87171 !important; }
        .cad-hv-spark { width: 100%; height: 90px; display: block; margin-top: 12px; overflow: visible; }
        .cad-hv-spark .ln { stroke-dasharray: 1; stroke-dashoffset: 1; animation: cadHvDraw 1.6s .5s cubic-bezier(.2,.8,.2,1) forwards; }
        .cad-hv-spark .pulse { animation: cadHvPulse 2.4s 2s ease-out infinite; }

        /* ── Grand tableau ── */
        .cad-hm-top { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: end; justify-content: space-between; margin-bottom: 14px; }
        .cad-hm-top h2 { font-family: var(--font-display); font-weight: 600; font-size: clamp(24px, 3vw, 34px); margin: 4px 0 0; color: var(--text); letter-spacing: -.015em; }
        .cad-hm-ctl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .cad-hm-pill { border: 1px solid var(--border-mid); background: rgba(238,243,248,.05); color: var(--text-mid); border-radius: 999px; font-family: var(--font-body); font-size: 13px; font-weight: 600; padding: 8px 15px; cursor: pointer; transition: all .2s; }
        .cad-hm-pill:hover { color: var(--text); border-color: var(--brand); }
        .cad-hm-pill[aria-pressed="true"] { background: rgba(0,200,224,.14); border-color: var(--brand); color: var(--text); }
        .cad-hm-seg { display: inline-flex; border: 1px solid var(--border-mid); border-radius: 999px; overflow: hidden; }
        .cad-hm-seg button { border: 0; background: transparent; color: var(--text-mid); font-family: var(--font-body); font-size: 13px; font-weight: 700; padding: 8px 15px; cursor: pointer; }
        .cad-hm-seg button[aria-pressed="true"] { background: #e0b766; color: #241800; }
        .cad-hm-wrap { position: relative; border-radius: 20px; border: 1px solid var(--border); background: linear-gradient(170deg, rgba(19,35,58,.9), rgba(10,20,35,.9)); box-shadow: 0 18px 50px rgba(0,0,0,.35); overflow: hidden; }
        .cad-hm-scroll { overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; }
        .cad-hm-scroll::-webkit-scrollbar { display: none; }
        .cad-hm-nav { position: absolute; top: 50%; z-index: 4; width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--border-mid); background: rgba(8,18,31,.92); color: var(--text); font-size: 18px; cursor: pointer; transform: translateY(-50%); box-shadow: 0 6px 20px rgba(0,0,0,.5); transition: opacity .25s, transform .2s; }
        .cad-hm-nav:hover { transform: translateY(-50%) scale(1.08); }
        .cad-hm-nav[disabled] { opacity: 0; pointer-events: none; }
        .cad-hm-nav.l { left: 160px; } .cad-hm-nav.r { right: 12px; }
        .cad-hm-t { border-collapse: separate; border-spacing: 0; width: 100%; font-family: var(--font-body); font-size: 17px; color: var(--text); }
        .cad-hm-t th, .cad-hm-t td { padding: 15px 14px; text-align: center; border-bottom: 1px solid var(--border); white-space: nowrap; min-width: 150px; }
        .cad-hm-t th:first-child, .cad-hm-t td:first-child { position: sticky; left: 0; z-index: 3; text-align: left; min-width: 190px; background: #0f1d31; font-weight: 700; box-shadow: 8px 0 14px -8px rgba(0,0,0,.6); }
        .cad-hm-t thead th { font-family: var(--font-body); font-weight: 700; vertical-align: bottom; padding-top: 18px; background: #0f1d31; }
        .cad-hm-t thead th:first-child { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); }
        .cad-hm-d { display: block; font-family: var(--font-display); font-size: 17px; color: var(--text); }
        .cad-hm-a { display: block; font-size: 14px; font-weight: 600; color: var(--text-mid); margin-top: 4px; }
        .cad-hm-c { display: block; font-size: 12px; font-weight: 500; color: var(--text-dim); margin-top: 3px; }
        .cad-hm-open { margin-top: 8px; display: inline-flex; gap: 6px; }
        .cad-hm-open button { border: 1px solid var(--border-mid); background: rgba(238,243,248,.05); color: var(--text-mid); border-radius: 8px; font-size: 12px; font-weight: 700; padding: 4px 9px; cursor: pointer; font-family: var(--font-body); }
        .cad-hm-open button:hover { color: var(--text); border-color: var(--brand); }
        .cad-hm-t .is-last { background: rgba(224,183,102,.08); }
        .cad-hm-t thead .is-last { background: linear-gradient(180deg, rgba(224,183,102,.22), rgba(224,183,102,.06)); animation: cadHvGlow 3.2s 1.4s ease-in-out infinite; }
        .cad-hm-t tbody tr { animation: cadHvRise .55s both; transition: background .2s; }
        .cad-hm-t tbody tr:hover td:not(:first-child) { background: rgba(0,200,224,.07); }
        .cad-hm-t tbody tr:hover td:first-child { color: var(--brand); }
        .cad-hm-grp td { background: #0b1830 !important; color: var(--gold-ink); font-family: var(--font-mono); font-size: 11.5px !important; letter-spacing: .14em; text-transform: uppercase; text-align: left !important; padding: 10px 14px !important; font-weight: 700; }
        .cad-hm-cell { display: inline-block; min-width: 92px; padding: 8px 12px; border-radius: 12px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.2; transition: transform .2s; }
        .cad-hm-t td:hover .cad-hm-cell { transform: scale(1.07); }
        .cad-hm-cell i { display: block; font-style: normal; font-size: 12px; font-weight: 600; margin-top: 3px; }
        .cad-hm-raw { font-weight: 700; font-variant-numeric: tabular-nums; }
        .cad-hm-raw i { display: block; font-style: normal; font-size: 12px; font-weight: 600; margin-top: 3px; color: var(--text-dim); }
        .cad-hm-rec { display: inline-block; margin-left: 6px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #e0b766; border: 1px solid rgba(224,183,102,.55); background: rgba(224,183,102,.12); border-radius: 999px; padding: 1px 7px; vertical-align: middle; }
        .cad-hm-lab { cursor: pointer; }
        .cad-hm-lab small { display: block; font-family: var(--font-body); font-weight: 500; font-size: 11px; color: var(--text-dim); margin-top: 2px; }
        .cad-hm-foot { font-family: var(--font-body); font-size: 12.5px; color: var(--text-dim); margin: 10px 4px 0; }
        @media (max-width: 760px) { .cad-hm-t { font-size: 15px; } .cad-hm-t th:first-child, .cad-hm-t td:first-child { min-width: 130px; } .cad-hm-nav.l { left: 110px; } }
        @media (prefers-reduced-motion: reduce) { .cad-hv-eye, .cad-hv-h1, .cad-hv-lead, .cad-hv-cta, .cad-hv-card, .cad-hm-t tbody tr { animation: none !important; } .cad-hv-h1 em { animation: none; } .cad-hv-spark .ln { animation: none; stroke-dashoffset: 0; } .cad-rv { opacity: 1; transform: none; transition: none; } .cad-hm-t thead .is-last { animation: none; } }
        @media print { .cad-night-band { background: #fff !important; } }
      `}</style>
    );
  }

  // Statistiques de l'historique (mode = 'general' | 'age').
  function stats(cat, hist, mode) {
    var age = mode === 'age';
    var sc = function (e) { return age && e.scoreA != null ? e.scoreA : e.score; };
    var qs = function (e) { return (age && e.qualitiesA) ? e.qualitiesA : e.qualities; };
    var first = hist[0], last = hist[hist.length - 1];
    var best = null;
    (cat.qualities || []).forEach(function (q) { var x = qs(last) && qs(last)[q.key]; if (x && (!best || x.pct > best.pct)) best = { label: q.label, pct: x.pct }; });
    var nextTs = dOf(last.date) + 182 * DAY;
    return { n: hist.length, first: first, last: last, now: sc(last), start: sc(first), delta: sc(last) - sc(first), best: best, nextTs: nextTs, daysTo: Math.round((nextTs - Date.now()) / DAY), level: age && last.levelA ? last.levelA : last.level, sc: sc };
  }

  // ── Bandeau d'entrée ───────────────────────────────────────────────────────
  function CadHistoryHero(props) {
    var cat = props.catalog || {}, hist = props.history || [];
    var s = stats(cat, hist, 'general');
    var W = 420, H = 90, P = 14;
    var vals = hist.map(function (e) { return e.score; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var span = Math.max(mx - mn, 40);
    var ts = hist.map(function (e) { return dOf(e.date); });
    var t0 = ts[0], t1 = Math.max(ts[ts.length - 1], t0 + 30 * DAY);
    function X(t) { return P + (W - 2 * P) * (t - t0) / (t1 - t0); }
    function Y(v) { return H - P - (H - 2 * P) * (v - (mn - span * 0.15)) / (span * 1.3); }
    var pts = hist.map(function (e, i) { return X(ts[i]) + ',' + Y(e.score); }).join(' ');
    var lastX = X(ts[ts.length - 1]), lastY = Y(vals[vals.length - 1]);
    var col = lvColor(cat, s.level);
    var months = Math.max(1, Math.round((ts[ts.length - 1] - ts[0]) / (30.4 * DAY)));
    return (
      <section className="cad-hv-hero" aria-label={tr('Mon historique')}>
        <div>
          <div className="cad-hv-eye">{tr('Mon historique')}{props.onBack ? <button type="button" className="cad-link" style={{ marginLeft: 14, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }} onClick={props.onBack}>← {tr('Accueil')}</button> : null}</div>
          <h1 className="cad-hv-h1">{tr('Tous tes tests,')} <em>{tr('au même endroit.')}</em></h1>
          <p className="cad-hv-lead">{s.n} {s.n > 1 ? tr('tests') : tr('test')} {tr('depuis le')} {fmtDate(ts[0])}. {tr('Chacun reste ici pour toujours : compare tes qualités, tes épreuves, ton poids et ton âge, année après année.')}</p>
          <div className="cad-hv-cta">
            {props.onStart ? <button type="button" className="cad-hv-btn is-main" onClick={props.onStart}>＋ {tr('Démarrer un nouveau test')}</button> : null}
            <a className="cad-hv-btn" href="#cad-tableau">{tr('Voir tous mes tests')} ↓</a>
            <a className="cad-hv-btn" href="#cad-courbe">{tr('Courbes')} ↓</a>
            {props.onExport ? <button type="button" className="cad-hv-btn" onClick={props.onExport}>⤓ {tr('Exporter')}</button> : null}
          </div>
        </div>
        <div className="cad-hv-card">
          <div className="cad-hm-ctl" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)' }}>{tr('Score actuel')} · {fmtDate(ts[ts.length - 1], { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="cad-hv-lvl" style={{ color: col }}>{tr(s.level)}</span>
          </div>
          <div className="cad-hv-now"><b><CountUp value={s.now}/></b><small>/ {cat.totalPoints || 1000}</small>{s.n > 1 ? <span className={s.delta >= 0 ? 'cad-hv-up' : 'cad-hv-dn'} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{s.delta >= 0 ? '▲' : '▼'} {signed(s.delta)}</span> : null}</div>
          <svg className="cad-hv-spark" viewBox={'0 0 ' + W + ' ' + H} aria-hidden="true">
            <defs><linearGradient id="cadhvg" x1="0" x2="1"><stop offset="0%" stopColor="#00c8e0"/><stop offset="100%" stopColor="#e0b766"/></linearGradient></defs>
            {hist.length > 1 ? <polyline className="ln" pathLength="1" points={pts} fill="none" stroke="url(#cadhvg)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/> : null}
            {hist.map(function (e, i) { return <circle key={e.id} cx={X(ts[i])} cy={Y(e.score)} r="4.2" fill="#0b1626" stroke="#e0b766" strokeWidth="2.4"/>; })}
            <circle className="pulse" cx={lastX} cy={lastY} r="7" fill="none" stroke="#e0b766" strokeWidth="2"/>
          </svg>
          <div className="cad-hv-stats">
            <div className="cad-hv-stat"><small>{tr('Tests passés')}</small><b><CountUp value={s.n}/></b></div>
            <div className="cad-hv-stat"><small>{tr('Meilleure qualité')}</small><b style={{ fontSize: 16 }}>{s.best ? tr(s.best.label) : '—'}</b></div>
            <div className="cad-hv-stat"><small>{tr('Prochain test')}</small><b style={{ fontSize: 16 }}>{fmtDate(s.nextTs, { month: 'short', year: 'numeric' })}</b></div>
          </div>
        </div>
      </section>
    );
  }

  // ── Grand tableau : un test par colonne ────────────────────────────────────
  function CadHistoryMatrix(props) {
    var cat = props.catalog || {}, hist = (props.history || []).slice().sort(function (a, b) { return dOf(a.date) - dOf(b.date); });
    var qualities = cat.qualities || [];
    var legacy = (props.legacyTests || []).map(function (t) { return Object.assign({}, t, { legacy: true }); });
    var tests = (cat.tests || []).concat(legacy);
    var mS = React.useState('general'); var mode = mS[0], setMode = mS[1];
    var fS = React.useState('all'); var filter = fS[0], setFilter = fS[1];
    var vS = React.useState('raw'); var view = vS[0], setView = vS[1];
    var navS = React.useState({ l: false, r: false }); var nav = navS[0], setNav = navS[1];
    var scRef = React.useRef(null);
    var age = mode === 'age';
    var F = window.CadencesFormat;

    function mp(e, kind) { return age ? (e[kind + 'A'] || e[kind]) : e[kind]; }
    function qv(e, key) { var x = (mp(e, 'qualities') || {})[key]; return x && isFinite(x.pct) ? x.pct * 100 : null; }
    function tv(e, slug) { return (mp(e, 'tests') || {})[slug] || null; }
    function fmtVal(t, r) {
      var v = r.value != null ? r.value : r.valueUsed;
      if (v == null) return '—';
      if (t.kind === 'ratio' && F && F.formatRatio) return F.formatRatio(t, v);
      return F && F.formatValue ? F.formatValue(t, v) : String(v);
    }
    // Meilleur nombre de points par épreuve, pour le badge « record ».
    var bestPts = {}, passes = {};
    tests.forEach(function (t) { hist.forEach(function (e) { var r = tv(e, t.slug); if (r) { passes[t.slug] = (passes[t.slug] || 0) + 1; if (bestPts[t.slug] == null || r.points > bestPts[t.slug]) bestPts[t.slug] = r.points; } }); });

    function sync() {
      var el = scRef.current; if (!el) return;
      setNav({ l: el.scrollLeft > 8, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 8 });
    }
    React.useEffect(function () {
      var el = scRef.current; if (!el) return undefined;
      el.scrollLeft = el.scrollWidth;                 // arrive sur le test le plus récent
      sync();
      var onR = function () { sync(); };
      window.addEventListener('resize', onR);
      return function () { window.removeEventListener('resize', onR); };
    }, [hist.length, mode, filter]);
    function go(dir) { var el = scRef.current; if (el) el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.6), behavior: 'smooth' }); }
    function pick(metric) { try { window.dispatchEvent(new CustomEvent('cad-pick-metric', { detail: { metric: metric } })); } catch (e) {} }

    var showQ = filter === 'all' || filter === 'q';
    var showT = filter === 'all' || filter === 't' || filter === 'rec';
    var rows = []; var ri = 0;
    function delay() { return { animationDelay: (Math.min(ri++, 30) * 45 + 150) + 'ms' }; }
    var last = hist.length - 1;

    // Groupes d'épreuves, dans l'ordre du catalogue.
    var groups = []; var gIdx = {};
    tests.forEach(function (t) {
      if (!passes[t.slug]) return;
      if (filter === 'rec') { var any = hist.some(function (e) { var r = tv(e, t.slug); return r && passes[t.slug] > 1 && r.points === bestPts[t.slug]; }); if (!any) return; }
      var g = t.group || (t.legacy ? 'Anciennes versions' : 'Épreuves');
      if (gIdx[g] == null) { gIdx[g] = groups.length; groups.push({ name: g, items: [] }); }
      groups[gIdx[g]].items.push(t);
    });

    function cellStyle(color) { return { background: color + '24', color: color, border: '1px solid ' + color + '55' }; }

    var head = (
      <thead><tr>
        <th>{tr('Mesure')}</th>
        {hist.map(function (e, i) {
          var cond = e.tempC != null ? Math.round(e.tempC) + ' °C' + (e.weatherLabel ? ' · ' + e.weatherLabel : '') : '';
          return (
            <th key={e.id} className={i === last ? 'is-last' : ''}>
              <span className="cad-hm-d">{fmtDate(dOf(e.date), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="cad-hm-a">{e.age} {tr('ans')} · {num(e.weight, 1)} kg</span>
              {cond ? <span className="cad-hm-c">{cond}</span> : null}
              {e.durationDays && e.maxDays && e.durationDays > e.maxDays ? <span className="cad-hm-c" style={{ color: '#fbbf24' }}>⚠ {e.durationDays} {tr('jours')}</span> : null}
              <span className="cad-hm-open">
                {props.onOpen ? <button type="button" onClick={function () { props.onOpen(e.id); }}>{tr('Analyse')} →</button> : null}
                {props.onDelete ? <button type="button" aria-label={tr('Supprimer ce test')} title={tr('Supprimer ce test')} onClick={function () { props.onDelete(e); }}>🗑</button> : null}
              </span>
            </th>
          );
        })}
      </tr></thead>
    );

    // Ligne « Score global »
    rows.push(
      <tr key="glob" style={delay()}>
        <td className="cad-hm-lab" onClick={function () { pick('global'); }}>{tr('Score global')}<small>{tr('sur')} {cat.totalPoints || 1000}</small></td>
        {hist.map(function (e, i) {
          var sc = age && e.scoreA != null ? e.scoreA : e.score, lv = age && e.levelA ? e.levelA : e.level, c = lvColor(cat, lv);
          var prev = i > 0 ? (age && hist[i - 1].scoreA != null ? hist[i - 1].scoreA : hist[i - 1].score) : null;
          return <td key={e.id} className={i === last ? 'is-last' : ''}><span className="cad-hm-cell" style={cellStyle(c)}>{sc}<i>{tr(lv)}{prev != null ? ' · ' + (sc - prev >= 0 ? '▲ ' : '▼ ') + Math.abs(sc - prev) : ''}</i></span></td>;
        })}
      </tr>
    );

    if (showQ) {
      rows.push(<tr key="gq" className="cad-hm-grp" style={delay()}><td colSpan={hist.length + 1}>{tr('Qualités')} · {tr('sur 100')}</td></tr>);
      qualities.forEach(function (q) {
        rows.push(
          <tr key={'q' + q.key} style={delay()}>
            <td className="cad-hm-lab" onClick={function () { pick('q:' + q.key); }}>{tr(q.label)}</td>
            {hist.map(function (e, i) {
              var v = qv(e, q.key), x = (mp(e, 'qualities') || {})[q.key];
              if (v == null) return <td key={e.id} className={i === last ? 'is-last' : ''}>—</td>;
              var pv = i > 0 ? qv(hist[i - 1], q.key) : null, c = lvColor(cat, x.level);
              return <td key={e.id} className={i === last ? 'is-last' : ''}><span className="cad-hm-cell" style={cellStyle(c)}>{Math.round(v)}<i>{pv != null ? (v - pv >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(v - pv)) : '—'}</i></span></td>;
            })}
          </tr>
        );
      });
    }

    if (showT) {
      groups.forEach(function (g) {
        rows.push(<tr key={'g' + g.name} className="cad-hm-grp" style={delay()}><td colSpan={hist.length + 1}>{tr(g.name)}</td></tr>);
        g.items.forEach(function (t) {
          rows.push(
            <tr key={'t' + t.slug} style={delay()}>
              <td className="cad-hm-lab" onClick={function () { pick('t:' + t.slug); }}>{tr(cleanName(t))}{t.legacy ? <small>{tr('ancienne version')}</small> : null}</td>
              {hist.map(function (e, i) {
                var r = tv(e, t.slug);
                if (!r) return <td key={e.id} className={i === last ? 'is-last' : ''}>—</td>;
                var isRec = passes[t.slug] > 1 && r.points === bestPts[t.slug];
                var pr = null; for (var k = i - 1; k >= 0; k--) { var q = tv(hist[k], t.slug); if (q) { pr = q; break; } }
                var d = pr ? r.points - pr.points : null;
                return (
                  <td key={e.id} className={i === last ? 'is-last' : ''}>
                    {view === 'raw'
                      ? <span className="cad-hm-raw">{fmtVal(t, r)}{isRec ? <span className="cad-hm-rec">{tr('record')}</span> : null}<i>{Math.round(r.points * 10) / 10} / {r.max != null ? r.max : t.pts_max} pts{d != null ? ' · ' + (d >= 0 ? '▲' : '▼') : ''}</i></span>
                      : <span className="cad-hm-cell" style={cellStyle(lvColor(cat, r.level))}>{num(r.points, 1)}<i>/ {r.max != null ? r.max : t.pts_max}{isRec ? ' · ' + tr('record') : ''}</i></span>}
                  </td>
                );
              })}
            </tr>
          );
        });
      });
    }

    return (
      <section id="cad-tableau" aria-labelledby="cad-hm-h">
        <div className="cad-hm-top">
          <div>
            <div className="cad-hv-eye" style={{ animation: 'none' }}>{tr('Tableau comparatif')}</div>
            <h2 id="cad-hm-h">{tr('Tout ton historique, test après test')}</h2>
          </div>
          <div className="cad-hm-ctl">
            <div className="cad-hm-seg" role="group" aria-label={tr('Notation')}>
              <button type="button" aria-pressed={!age} onClick={function () { setMode('general'); }}>{tr('Général')}</button>
              <button type="button" aria-pressed={age} onClick={function () { setMode('age'); }}>{tr('Ajusté à l’âge')}</button>
            </div>
            <div className="cad-hm-seg" role="group" aria-label={tr('Affichage des épreuves')}>
              <button type="button" aria-pressed={view === 'raw'} onClick={function () { setView('raw'); }}>{tr('Résultat brut')}</button>
              <button type="button" aria-pressed={view === 'pts'} onClick={function () { setView('pts'); }}>{tr('Points')}</button>
            </div>
          </div>
        </div>
        <div className="cad-hm-ctl" style={{ marginBottom: 12 }}>
          {[['all', 'Tout'], ['q', 'Qualités'], ['t', 'Épreuves'], ['rec', 'Records seulement']].map(function (o) {
            return <button key={o[0]} type="button" className="cad-hm-pill" aria-pressed={filter === o[0]} onClick={function () { setFilter(o[0]); }}>{tr(o[1])}</button>;
          })}
          {props.onExport ? <button type="button" className="cad-hm-pill" onClick={props.onExport}>⤓ {tr('Exporter en CSV')}</button> : null}
        </div>
        <div className="cad-hm-wrap">
          <button type="button" className="cad-hm-nav l" aria-label={tr('Tests précédents')} disabled={!nav.l} onClick={function () { go(-1); }}>‹</button>
          <button type="button" className="cad-hm-nav r" aria-label={tr('Tests suivants')} disabled={!nav.r} onClick={function () { go(1); }}>›</button>
          <div className="cad-hm-scroll" ref={scRef} onScroll={sync}>
            <table className="cad-hm-t">{head}<tbody>{rows}</tbody></table>
          </div>
        </div>
        <p className="cad-hm-foot">{tr('Vert / ▲ = progression, rouge / ▼ = recul. Clique sur une mesure pour tracer sa courbe, sur « Analyse » pour ouvrir le bilan d’un test.')}</p>
      </section>
    );
  }

  window.CadHistoryStyle = Style;
  window.CadHistoryHero = CadHistoryHero;
  window.CadHistoryMatrix = CadHistoryMatrix;
  window.CadReveal = CadReveal;
})();
