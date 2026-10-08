/* ════════════════════════════════════════════════════════════════
   CADENCES — le test physique SUR LE SITE (public/site).
   Présentation → démarrer → saisie J1→J12 + score en direct → clôture →
   résultats. Compte du site (THWAccount), appels /api/cadences/* en
   same-origin (cookies). Design du site (Syne/DM Sans/DM Mono, cyan).
   Publie window.CadencesPage.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var F = function () { return window.CadencesFormat; };
  // Origine de l'API. Le site (the-hybridway.com) sert les fichiers statiques mais
  // pas l'/api ; l'app (APP_URL) a l'API + l'auth. On sonde le catalogue en
  // same-origin, sinon on bascule sur APP_URL (cross-origin, pour le contenu public).
  var API_BASE = '';
  var APP_URL = (typeof window !== 'undefined' && window.APP_URL) || 'https://thw-appli.vercel.app';

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(API_BASE + path, opts);
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
        .cad-wrap { max-width: min(1460px, 94vw); margin: 0 auto; padding: 104px 24px 80px; color: var(--text); }
        @media (max-width: 640px) { .cad-wrap { max-width: 100%; padding: 92px 16px 64px; } }
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
        .cad-link { justify-self: start; background: none; border: none; padding: 0; cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--brand); }
        .cad-proto { display: grid; gap: 6px; font-family: var(--font-body); font-size: 12.5px; line-height: 1.55; color: var(--text-mid); border-left: 2px solid var(--brand); padding-left: 12px; }
        .cad-proto strong { color: var(--text); }
        .cad-err { font-family: var(--font-body); font-size: 13px; color: var(--text); background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3); border-radius: var(--radius-sm); padding: 10px 12px; }
        .cad-feature { background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        /* Contenu riche / navigation par onglets */
        .cad-section { }
        .cad-hero { max-width: 820px; }
        .cad-noscroll { scrollbar-width: none; -ms-overflow-style: none; }
        .cad-noscroll::-webkit-scrollbar { display: none; height: 0; width: 0; }
        .cad-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin-top: 22px; position: sticky; top: 56px; z-index: 5; background: var(--bg); -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
        .cad-tabs::-webkit-scrollbar, .cad-dayrow::-webkit-scrollbar, .cad-chiprow::-webkit-scrollbar, .cad-tl-row::-webkit-scrollbar { display: none; height: 0; width: 0; }
        .cad-dayrow, .cad-chiprow, .cad-tl-row { scrollbar-width: none; -ms-overflow-style: none; }
        .cad-tab { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; flex: 0 0 auto; font-family: var(--font-body); font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: var(--radius-pill); cursor: pointer; color: var(--text-mid); background: var(--bg-card); border: 1px solid var(--border-mid); transition: all .15s; }
        .cad-tab:hover { color: var(--text); border-color: var(--brand); }
        .cad-tab.on { color: #fff; background: var(--brand-gradient); border-color: transparent; box-shadow: 0 3px 14px rgba(0,200,224,.3); }
        .cad-tab-ico { display: inline-flex; opacity: .9; }
        .cad-panel { margin-top: 24px; display: grid; gap: 44px; }
        .cad-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cad-stat { background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 16px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .cad-stat-n { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.04em; font-size: 30px; color: var(--text); line-height: 1; }
        .cad-stat-l { font-family: var(--font-body); font-size: 11.5px; color: var(--text-mid); margin-top: 6px; }
        .cad-dayrow { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 10px; -webkit-overflow-scrolling: touch; }
        .cad-day { flex: 0 0 auto; display: grid; gap: 2px; place-items: center; min-width: 86px; padding: 9px 10px; border-radius: var(--radius-md); cursor: pointer; background: var(--bg-card); border: 1px solid var(--border-mid); color: var(--text); transition: all .15s; }
        .cad-day:hover:not(.rest) { border-color: var(--brand); }
        .cad-day.on { background: var(--brand-gradient); border-color: transparent; color: #fff; box-shadow: 0 3px 12px rgba(0,200,224,.28); }
        .cad-day.rest { opacity: .5; cursor: default; }
        .cad-day-n { font-family: var(--font-mono); font-size: 11px; opacity: .85; }
        .cad-day-l { font-family: var(--font-display); font-weight: 600; font-size: 12px; white-space: nowrap; }
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
        /* Fiche épreuve structurée */
        .cad-ec-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
        .cad-ec-name { font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--text); }
        .cad-ec-pts { flex: 0 0 auto; text-align: center; background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 7px 15px; }
        .cad-ec-pts b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 26px; line-height: 1; color: var(--brand); }
        .cad-ec-pts span { font-family: var(--font-body); font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
        .cad-ec-body { display: grid; gap: 13px; margin-top: 14px; }
        .cad-ec-h { font-family: var(--font-body); font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--brand); margin-bottom: 4px; }
        .cad-ec-p { font-family: var(--font-body); font-size: 13.5px; line-height: 1.55; color: var(--text-mid); margin: 0; }
        .cad-ec-ol, .cad-ec-ul { margin: 0; padding-left: 18px; font-family: var(--font-body); font-size: 13.5px; line-height: 1.55; color: var(--text-mid); display: grid; gap: 4px; }
        /* Barème lisible */
        .cad-bareme th, .cad-bareme td { font-size: 13px; padding: 9px 12px; }
        .cad-bareme .cad-b-rl { text-align: left; font-weight: 600; color: var(--text); }
        .cad-bareme tr.cad-b-sub td { font-size: 11.5px; color: var(--text-dim); padding-top: 2px; padding-bottom: 8px; border-bottom: none; }
        .cad-bareme tr.cad-b-sub .cad-b-rl { color: var(--text-dim); font-weight: 500; }
        /* Manifeste d'ouverture (intro déroulante) */
        .cad-manifesto { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: stretch; gap: 40px; margin-top: 10px; }
        .cad-act { max-width: none; width: 100%; }
        .cad-act-eye { font-family: var(--font-body); font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--brand); }
        .cad-act-t { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; font-size: 26px; line-height: 1.15; color: var(--text); margin: 8px 0 0; }
        .cad-act-lead { font-family: var(--font-display); font-weight: 500; font-size: 18px; line-height: 1.5; color: var(--text-mid); margin: 12px 0 0; max-width: 760px; }
        .cad-act-lead strong { color: var(--text); }
        .cad-act-p { font-family: var(--font-body); font-size: 14.5px; line-height: 1.65; color: var(--text-mid); margin: 12px 0 0; max-width: 920px; }
        .cad-act-p strong { color: var(--text); }
        .cad-act--split { display: grid; grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr); gap: 40px; align-items: center; }
        .cad-act-col { min-width: 0; }
        .cad-act-media { min-width: 0; }
        .cad-act--split .cad-act-lead, .cad-act--split .cad-act-p { max-width: none; }
        @media (max-width: 880px) { .cad-act--split { grid-template-columns: 1fr; gap: 18px; } }
        .cad-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; }
        .cad-legend span { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-body); font-size: 11.5px; color: var(--text-mid); }
        .cad-legend i { width: 9px; height: 9px; border-radius: 999px; display: inline-block; flex: 0 0 auto; }
        .cad-callrow { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
        .cad-callout-big { flex: 1; min-width: 190px; background: var(--bg-card-2); border: 1px solid var(--border-mid); border-left: 3px solid var(--brand); border-radius: var(--radius-md); padding: 14px 16px; }
        .cad-callout-big b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 24px; color: var(--text); letter-spacing: -0.02em; }
        .cad-callout-big span { font-family: var(--font-body); font-size: 12px; line-height: 1.45; color: var(--text-mid); }
        .cad-statrow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 18px 0; }
        .cad-stat-big { background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 18px 20px; }
        .cad-stat-big b { display: block; font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; font-size: 34px; color: var(--text); line-height: 1; }
        .cad-stat-big > span { display: block; margin-top: 8px; font-family: var(--font-body); font-size: 12.5px; line-height: 1.45; color: var(--text-mid); }
        @media (max-width: 720px) { .cad-statrow { grid-template-columns: 1fr; } }
        .cad-note-src { margin-top: 12px; font-family: var(--font-body); font-size: 11px; color: var(--text-dim); line-height: 1.55; }
        .cad-tl { display: grid; gap: 16px; margin-top: 16px; }
        .cad-tl-h { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; font-size: 14px; color: var(--text); }
        .cad-tl-dot { width: 10px; height: 10px; border-radius: 999px; flex: 0 0 auto; }
        .cad-tl-row { display: flex; gap: 6px; padding: 8px 0; }
        .cad-tl-node { flex: 1 1 0; min-width: 0; display: grid; gap: 3px; padding-right: 6px; position: relative; }
        .cad-tl-node::before { content: ''; position: absolute; left: 5px; right: 0; top: 5px; height: 2px; background: var(--border-mid); }
        .cad-tl-node:last-child::before { right: auto; width: 11px; }
        .cad-tl-node i { width: 11px; height: 11px; border-radius: 999px; border: 2px solid var(--bg); position: relative; z-index: 1; }
        .cad-tl-age { font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); margin-top: 5px; }
        .cad-tl-lab { font-family: var(--font-body); font-size: 11.5px; line-height: 1.35; color: var(--text-mid); }
        @media (max-width: 640px) {
          .cad-tl-row { flex-direction: column; gap: 0; }
          .cad-tl-node { flex: none; padding: 7px 0 7px 20px; }
          .cad-tl-node::before { left: 4px; right: auto; top: 11px; bottom: -11px; width: 2px; height: auto; }
          .cad-tl-node:last-child::before { bottom: auto; height: 12px; width: 2px; }
          .cad-tl-node i { position: absolute; left: 0; top: 9px; }
          .cad-tl-age { margin-top: 0; }
        }
        .cad-reveal { margin-top: 14px; }
        /* ── Démonstration v3 : figures, graphiques, piliers, sources ── */
        .cad-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 18px; }
        .cad-grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 18px; }
        @media (max-width: 980px) { .cad-grid3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 760px) { .cad-grid2, .cad-grid3 { grid-template-columns: minmax(0, 1fr); } }
        .cad-fig { min-width: 0; display: flex; flex-direction: column; }
        .cad-fig-k { font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--brand); margin-bottom: 4px; }
        .cad-fig-t { font-family: var(--font-display); font-weight: 700; font-size: 16px; line-height: 1.3; color: var(--text); margin: 0 0 14px; }
        .cad-fig-c { font-family: var(--font-body); font-size: 12.5px; line-height: 1.55; color: var(--text-mid); margin-top: 12px; }
        .cad-fig-c strong { color: var(--text); }
        .cad-statrow--4 { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 980px) { .cad-statrow--4 { grid-template-columns: repeat(2, 1fr); } }
        .cad-stat-big b { font-variant-numeric: tabular-nums; }
        .cad-stat-big { position: relative; overflow: hidden; }
        .cad-stat-big::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--brand-gradient); }
        .cad-fchips { display: flex; flex-wrap: wrap; gap: 6px; }
        .cad-fchip { padding: 6px 12px; font-family: var(--font-body); font-size: 12px; font-weight: 600; color: var(--text-mid); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: 999px; cursor: pointer; transition: all .15s; }
        .cad-fchip[aria-pressed="true"] { color: #fff; background: var(--brand-gradient); border-color: transparent; }
        .cad-waffle-wrap { display: flex; gap: 22px; align-items: center; flex-wrap: wrap; }
        .cad-waffle { display: grid; grid-template-columns: repeat(10, 15px); gap: 4px; flex: 0 0 auto; }
        .cad-waffle i { width: 15px; height: 15px; border-radius: 4px; display: block; }
        .cad-waffle-side { flex: 1; min-width: 150px; }
        .cad-waffle-n { font-family: var(--font-display); font-weight: 800; font-size: 44px; letter-spacing: -0.03em; line-height: 1; color: var(--text); font-variant-numeric: tabular-nums; }
        .cad-waffle-l { font-family: var(--font-body); font-size: 12.5px; line-height: 1.45; color: var(--text-mid); margin-top: 6px; }
        .cad-hbars { position: relative; }
        .cad-hbar-row { position: absolute; left: 0; right: 0; display: grid; grid-template-columns: 210px minmax(0, 1fr) 92px; align-items: center; gap: 12px; }
        .cad-hbar-lab { font-family: var(--font-body); font-size: 13px; color: var(--text-mid); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cad-hbar-lab em { font-style: normal; font-family: var(--font-mono); font-size: 9.5px; color: var(--text-dim); margin-left: 6px; padding: 1px 5px; border: 1px solid var(--border-mid); border-radius: 4px; }
        .cad-hbar-row.is-hl .cad-hbar-lab { color: var(--brand); font-weight: 700; }
        .cad-hbar-row.is-region .cad-hbar-lab { font-style: italic; }
        .cad-hbar-row:hover .cad-hbar-lab { color: var(--text); }
        .cad-hbar-track { height: 12px; border-radius: 999px; background: rgba(128,140,160,0.14); overflow: hidden; }
        .cad-hbar-fill { height: 100%; border-radius: 999px; }
        .cad-hbar-val { font-family: var(--font-mono); font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; }
        .cad-hbar-ref { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1.5px dashed var(--brand); transition: opacity .6s ease .8s; }
        .cad-hbar-ref span { position: absolute; top: -2px; left: 6px; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; color: var(--brand); white-space: nowrap; }
        @media (max-width: 640px) { .cad-hbar-row { grid-template-columns: 104px minmax(0, 1fr) 64px; gap: 8px; } .cad-hbar-lab { font-size: 11.5px; } .cad-hbar-lab em { display: none; } }
        .cad-cols { display: flex; align-items: stretch; gap: 10px; }
        .cad-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .cad-col-area { flex: 1; display: flex; align-items: flex-end; border-bottom: 1px solid var(--border-mid); padding-top: 22px; }
        .cad-col-bar { width: 100%; max-width: 64px; margin: 0 auto; border-radius: 8px 8px 2px 2px; position: relative; }
        .cad-col-val { position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, -4px); font-family: var(--font-display); font-weight: 800; font-size: 14px; white-space: nowrap; }
        .cad-col-lab { font-family: var(--font-body); font-size: 11.5px; line-height: 1.3; color: var(--text-mid); text-align: center; }
        .cad-range { width: 100%; max-width: 360px; display: block; margin: 6px auto 0; }
        .cad-gauge-out { text-align: center; margin-top: 10px; }
        .cad-gauge-out b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 24px; }
        .cad-gauge-out span { display: block; font-family: var(--font-body); font-size: 12.5px; line-height: 1.45; color: var(--text-mid); margin-top: 4px; }
        .cad-facts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
        @media (max-width: 980px) { .cad-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cad-fact { background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 14px; }
        .cad-fact b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 20px; color: var(--text); letter-spacing: -0.02em; }
        .cad-fact i { display: block; font-style: normal; font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--brand); margin-bottom: 6px; }
        .cad-fact span { display: block; font-family: var(--font-body); font-size: 12px; line-height: 1.45; color: var(--text-mid); margin-top: 6px; }
        .cad-pillars { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 20px; }
        @media (max-width: 1080px) { .cad-pillars { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .cad-pillars { grid-template-columns: minmax(0, 1fr); } }
        .cad-pillar { background: var(--bg-card); border: 1px solid var(--border-mid); border-top: 4px solid var(--pc, var(--brand)); border-radius: var(--radius-lg); padding: 18px; display: flex; flex-direction: column; gap: 10px; opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1); }
        .cad-pillar.is-on { opacity: 1; transform: none; }
        .cad-pillar h4 { margin: 0; font-family: var(--font-display); font-weight: 800; font-size: 18px; color: var(--text); }
        .cad-pillar .why { font-family: var(--font-body); font-size: 12.5px; color: var(--pc, var(--brand)); font-weight: 700; }
        .cad-pillar p, .cad-pillar li { font-family: var(--font-body); font-size: 13px; line-height: 1.55; color: var(--text-mid); margin: 0; }
        .cad-pillar ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
        .cad-pillar .dose { display: grid; gap: 6px; margin-top: auto; }
        .cad-pillar .dose div { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; background: var(--bg-card-2); border-radius: var(--radius-md); padding: 8px 10px; }
        .cad-pillar .dose small { display: block; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
        .cad-pillar .dose span { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text); line-height: 1.35; text-align: right; }
        html.reduce-motion .cad-pillar, .cad-pillar.no-anim { opacity: 1; transform: none; transition: none; }
        .cad-plan-tot { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin: 14px 0 10px; }
        .cad-plan-tot b { font-family: var(--font-display); font-weight: 800; font-size: 40px; letter-spacing: -0.03em; color: var(--text); line-height: 1; font-variant-numeric: tabular-nums; }
        .cad-plan-tot span { font-family: var(--font-body); font-size: 13px; color: var(--text-mid); }
        .cad-stack { display: flex; height: 18px; border-radius: 999px; overflow: hidden; background: rgba(128,140,160,0.14); }
        .cad-stack i { display: block; height: 100%; transition: width .9s cubic-bezier(.22,1,.36,1); }
        .cad-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
        .cad-wday { background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 10px 8px; min-height: 112px; display: flex; flex-direction: column; gap: 6px; }
        .cad-wday > small { font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
        .cad-sess { border-radius: 8px; padding: 6px 7px; color: #fff; font-family: var(--font-body); font-size: 11.5px; font-weight: 600; line-height: 1.25; animation: cadPop .45s cubic-bezier(.22,1,.36,1) both; }
        .cad-sess small { display: block; font-weight: 500; opacity: .9; font-size: 10.5px; }
        .cad-rest { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); font-style: italic; }
        .cad-sess.is-opt { border: 2px dashed var(--sc); color: var(--text); }
        .cad-sess .cad-sess-d { font-weight: 500; opacity: .85; margin-top: 3px; line-height: 1.3; }
        .cad-stack-opt { background: repeating-linear-gradient(135deg, var(--sc) 0 5px, transparent 5px 10px) !important; opacity: .7; }
        @keyframes cadPop { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
        @media (max-width: 760px) { .cad-week { grid-template-columns: repeat(2, minmax(0, 1fr)); } .cad-wday { min-height: 0; } }
        @media (prefers-reduced-motion: reduce) { .cad-pillar { opacity: 1; transform: none; transition: none; } .cad-sess { animation: none; } }
        .cad-support { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
        @media (max-width: 760px) { .cad-support { grid-template-columns: minmax(0, 1fr); } }
        .cad-support > div { background: var(--bg-card-2); border: 1px dashed var(--border-mid); border-radius: var(--radius-lg); padding: 16px 18px; }
        .cad-support h4 { margin: 0 0 6px; font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--text); }
        .cad-support p { font-family: var(--font-body); font-size: 13px; line-height: 1.55; color: var(--text-mid); margin: 6px 0 0; }
        .cad-support p strong { color: var(--text); }
        .cad-tier { display: flex; align-items: center; gap: 10px; margin-top: 26px; font-family: var(--font-body); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); }
        .cad-tier::after { content: ''; flex: 1; height: 1px; background: var(--border-mid); }
        .cad-quote { margin: 18px 0 0; padding: 14px 18px; border-left: 3px solid var(--brand); background: var(--bg-card-2); border-radius: 0 var(--radius-md) var(--radius-md) 0; font-family: var(--font-display); font-weight: 600; font-size: 16px; line-height: 1.5; color: var(--text); max-width: 920px; }
        .cad-src { margin-top: 18px; border-top: 1px solid var(--border-mid); padding-top: 12px; }
        .cad-src summary { cursor: pointer; font-family: var(--font-body); font-size: 12px; font-weight: 700; color: var(--text-mid); list-style: none; }
        .cad-src summary::-webkit-details-marker { display: none; }
        .cad-src ol { margin: 10px 0 0; padding-left: 20px; display: grid; gap: 5px; }
        .cad-src li { font-family: var(--font-body); font-size: 12px; line-height: 1.5; color: var(--text-dim); }
        .cad-src a { color: var(--brand); text-decoration: none; word-break: break-word; }
        .cad-src a:hover { text-decoration: underline; }
        .cad-ti { margin-top: 40px; padding: 0; }
        .cad-manifesto > .cad-act { padding: 24px 0; }
        .cad-ti-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 22px; }
        @media (max-width: 1080px) { .cad-ti-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 680px) { .cad-ti-grid { grid-template-columns: minmax(0, 1fr); } }
        .cad-ti-card { position: relative; background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 20px; min-width: 0; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .cad-ti-card.is-wide { grid-column: span 2; }
        @media (max-width: 680px) { .cad-ti-card.is-wide { grid-column: auto; } }
        .cad-ti-n { position: absolute; top: 16px; right: 18px; font-family: var(--font-display); font-weight: 800; font-size: 28px; line-height: 1; color: var(--brand); opacity: .22; }
        .cad-ti-h { margin: 0 0 10px; font-family: var(--font-display); font-weight: 700; font-size: 17px; color: var(--text); }
        .cad-ti-card p, .cad-ti-score p { font-family: var(--font-body); font-size: 13.5px; line-height: 1.6; color: var(--text-mid); margin: 0 0 8px; }
        .cad-ti-card p strong, .cad-ti-score p strong { color: var(--text); }
        .cad-ti-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
        .cad-ti-tags span { font-family: var(--font-body); font-size: 12px; font-weight: 600; color: var(--text); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: 999px; padding: 4px 10px; }
        .cad-ti-tags.is-q span { color: var(--brand); border-color: rgba(0,200,224,.35); background: rgba(0,200,224,.08); }
        .cad-ti-days { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
        @media (max-width: 520px) { .cad-ti-days { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .cad-ti-day { border-radius: var(--radius-md); padding: 8px 6px; background: rgba(0,200,224,.08); border: 1px solid rgba(0,200,224,.3); display: grid; gap: 3px; text-align: center; min-width: 0; }
        .cad-ti-day b { font-family: var(--font-display); font-weight: 800; font-size: 14px; color: var(--brand); }
        .cad-ti-day span { font-family: var(--font-body); font-size: 10.5px; line-height: 1.25; color: var(--text-mid); hyphens: auto; }
        .cad-ti-day.is-rest { background: var(--bg-card-2); border-color: var(--border-mid); }
        .cad-ti-day.is-rest b { color: var(--text-dim); }
        .cad-ti-big { font-family: var(--font-display); font-weight: 800; font-size: 30px; letter-spacing: -0.02em; color: var(--text); margin: 2px 0 6px; }
        .cad-ti-gear { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
        .cad-ti-gear small { font-family: var(--font-body); font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--brand); }
        .cad-ti-gear ul { margin: 4px 0 0; padding-left: 16px; }
        .cad-ti-gear li { font-family: var(--font-body); font-size: 12.5px; line-height: 1.45; color: var(--text-mid); }
        .cad-ti-months { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 5px; margin: 4px 0 12px; }
        @media (max-width: 640px) { .cad-ti-months { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
        .cad-ti-months span { text-align: center; font-family: var(--font-body); font-size: 11.5px; font-weight: 600; padding: 9px 2px; border-radius: 8px; background: var(--bg-card-2); color: var(--text-dim); border: 1px solid var(--border-mid); }
        .cad-ti-months span.is-best { background: var(--brand-gradient); color: #fff; border-color: transparent; box-shadow: 0 3px 12px rgba(0,200,224,.28); }
        .cad-ti-score { position: relative; margin-top: 16px; background: var(--bg-card); border: 1px solid var(--border-mid); border-left: 4px solid var(--brand); border-radius: var(--radius-lg); padding: 22px 24px; }
        .cad-ti-score-t { font-family: var(--font-display); font-weight: 800; font-size: 24px; letter-spacing: -0.02em; color: var(--text); margin: 0 0 10px; }
        .cad-ti-score p { max-width: 920px; }
        .cad-ti-punch { font-family: var(--font-display) !important; font-weight: 700; font-size: 17px !important; color: var(--text) !important; }
        .cad-lvl-bar { position: relative; display: flex; height: 46px; border-radius: 12px; overflow: visible; margin-top: 34px; }
        .cad-lvl-seg { border: none; padding: 0; cursor: pointer; height: 100%; display: flex; align-items: center; justify-content: center; transform-origin: bottom; transition: transform .6s cubic-bezier(.22,1,.36,1), filter .15s, box-shadow .15s; min-width: 0; }
        .cad-lvl-seg:first-child { border-radius: 12px 0 0 12px; justify-content: flex-end; padding-right: 14px; }
        .cad-lvl-seg:last-of-type { border-radius: 0 12px 12px 0; }
        .cad-lvl-seg span { font-family: var(--font-body); font-size: 11.5px; font-weight: 700; color: rgba(10,20,30,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px; }
        .cad-lvl-seg.is-on, .cad-lvl-seg:hover { filter: brightness(1.08); box-shadow: 0 0 0 2px var(--text) inset; }
        .cad-lvl-world { position: absolute; top: -30px; bottom: -6px; width: 0; border-left: 2px dashed var(--text); transition: opacity .5s ease .7s; pointer-events: none; }
        .cad-lvl-world span { position: absolute; top: 0; left: 6px; white-space: nowrap; font-family: var(--font-body); font-size: 11px; font-weight: 700; color: var(--text); }
        .cad-lvl-ticks { position: relative; height: 18px; margin-top: 6px; }
        .cad-lvl-ticks span { position: absolute; transform: translateX(-50%); font-family: var(--font-mono); font-size: 10.5px; color: var(--text-dim); }
        .cad-lvl-ticks span:first-child { transform: none; }
        .cad-lvl-focus { margin-top: 10px; min-height: 40px; font-family: var(--font-body); font-size: 13px; line-height: 1.5; color: var(--text-mid); }
        .cad-lvl-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; margin-top: 12px; }
        .cad-lvl-item { border: 1px solid var(--border-mid); border-left: 4px solid var(--lc); border-radius: var(--radius-md); padding: 10px 12px; background: var(--bg-card-2); }
        .cad-lvl-item div { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .cad-lvl-item b { font-family: var(--font-display); font-weight: 800; font-size: 15px; color: var(--text); }
        .cad-lvl-item em { font-style: normal; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); white-space: nowrap; }
        .cad-lvl-item p { margin: 4px 0 0 !important; font-size: 12.5px !important; }
        @media (max-width: 640px) { .cad-lvl-seg span { display: none; } .cad-lvl-ticks span:nth-child(6) { display: none; } .cad-lvl-world span { font-size: 10px; } .cad-ti-score { padding: 18px 16px; } }
        .cad-q-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
        .cad-q-tile { background: var(--bg-card); border: 1px solid var(--border-mid); border-top: 4px solid var(--qc); border-radius: var(--radius-lg); padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
        .cad-q-tile-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .cad-q-tile-h b { font-family: var(--font-display); font-weight: 800; font-size: 18px; color: var(--text); }
        .cad-q-tile-h span { font-family: var(--font-display); font-weight: 800; font-size: 18px; color: var(--qc); white-space: nowrap; }
        .cad-q-tile p { margin: 0; font-family: var(--font-body); font-size: 13px; line-height: 1.5; color: var(--text-mid); }
        .cad-q-bar { height: 8px; border-radius: 999px; background: rgba(128,140,160,0.16); overflow: hidden; }
        .cad-q-bar i { display: block; height: 100%; border-radius: 999px; background: var(--qc); transition: width .9s cubic-bezier(.22,1,.36,1); }
        .cad-q-share { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); }
        .cad-q-top { display: flex; flex-wrap: wrap; gap: 5px; margin-top: auto; }
        .cad-q-top span { font-family: var(--font-body); font-size: 11px; font-weight: 600; color: var(--text); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: 999px; padding: 3px 8px; }
        .cad-qm-wrap { overflow-x: auto; margin-top: 10px; scrollbar-width: none; }
        .cad-qm-wrap::-webkit-scrollbar { display: none; }
        .cad-qm { display: grid; gap: 3px; min-width: 520px; }
        .cad-qm-hd { font-family: var(--font-body); font-size: 11px; font-weight: 700; text-align: center; padding: 4px 2px; color: var(--text-mid); }
        .cad-qm-name { font-family: var(--font-body); font-size: 12px; color: var(--text-mid); padding: 5px 8px; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cad-qm-name em { font-style: normal; font-family: var(--font-mono); font-size: 10px; color: var(--text-dim); margin-right: 6px; }
        .cad-qm-name.is-on { background: var(--bg-card-2); color: var(--text); font-weight: 600; }
        .cad-qm-cell { border-radius: 6px; font-family: var(--font-mono); font-size: 11px; display: grid; place-items: center; min-height: 26px; transition: transform .12s; }
        .cad-qm-cell.is-on { outline: 1.5px solid var(--text); outline-offset: -1.5px; }
        .cad-gl-main { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 10px; }
        .cad-gl-card { background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 14px 16px; }
        .cad-gl-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .cad-gl-h b { font-family: var(--font-display); font-weight: 700; font-size: 15.5px; color: var(--text); }
        .cad-gl-card p { margin: 6px 0 0; font-family: var(--font-body); font-size: 13px; line-height: 1.5; color: var(--text-mid); }
        .cad-gl-tag { flex: 0 0 auto; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: var(--text-dim); border: 1px solid var(--border-mid); white-space: nowrap; }
        .cad-gl-tag.is-in { color: var(--brand); border-color: rgba(0,200,224,.4); background: rgba(0,200,224,.08); }
        .cad-gl-tag.is-work { color: #b45309; border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.1); }
        html.dark .cad-gl-tag.is-work { color: #fcd34d; }
        .cad-gl-dot.is-work { background: #f59e0b; }
        .cad-gl-list { display: grid; margin-top: 8px; border: 1px solid var(--border-mid); border-radius: var(--radius-lg); overflow: hidden; background: var(--bg-card); }
        .cad-gl-row { display: grid; grid-template-columns: 10px 190px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); }
        .cad-gl-row:last-child { border-bottom: none; }
        .cad-gl-row b { font-family: var(--font-display); font-weight: 700; font-size: 13.5px; color: var(--text); }
        .cad-gl-d { font-family: var(--font-body); font-size: 12.5px; line-height: 1.45; color: var(--text-mid); }
        .cad-gl-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--border-mid); }
        .cad-gl-dot.is-in { background: var(--brand); }
        @media (max-width: 680px) { .cad-gl-row { grid-template-columns: 10px minmax(0, 1fr) auto; } .cad-gl-d { grid-column: 2 / -1; } }
        .cad-pdays { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; margin-bottom: var(--space-4); }
        @media (max-width: 900px) { .cad-pdays { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
        .cad-pday { display: grid; gap: 3px; text-align: center; padding: 9px 4px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-mid); cursor: pointer; color: var(--text); transition: all .15s; min-width: 0; }
        .cad-pday b { font-family: var(--font-display); font-weight: 800; font-size: 14px; color: var(--brand); }
        .cad-pday span { font-family: var(--font-body); font-size: 10.5px; line-height: 1.25; color: var(--text-mid); overflow: hidden; text-overflow: ellipsis; }
        .cad-pday:hover:not(.rest) { border-color: var(--brand); }
        .cad-pday.on { background: var(--brand-gradient); border-color: transparent; box-shadow: 0 3px 12px rgba(0,200,224,.28); }
        .cad-pday.on b, .cad-pday.on span { color: #fff; }
        .cad-pday.rest { background: var(--bg-card-2); cursor: default; opacity: .6; }
        .cad-pday.rest b { color: var(--text-dim); }
        .cad-dayhead { display: grid; grid-template-columns: minmax(220px, .7fr) minmax(0, 1.3fr); gap: 22px; background: var(--bg-card); border: 1px solid var(--border-mid); border-left: 4px solid var(--brand); border-radius: var(--radius-lg); padding: 18px 20px; margin-bottom: var(--space-4); }
        @media (max-width: 820px) { .cad-dayhead { grid-template-columns: 1fr; } }
        .cad-dayhead-t > span { font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--brand); }
        .cad-dayhead-t h3 { margin: 4px 0 8px; font-family: var(--font-display); font-weight: 800; font-size: 24px; color: var(--text); }
        .cad-dayhead-g { display: grid; gap: 12px; }
        .cad-ep-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .cad-ep-meta span { font-family: var(--font-body); font-size: 11.5px; font-weight: 600; color: var(--text-mid); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: 999px; padding: 3px 9px; }
        .cad-ep-meta span.is-hl { color: var(--brand); border-color: rgba(0,200,224,.4); background: rgba(0,200,224,.08); }
        .cad-ep { padding: 20px 22px; }
        .cad-ep-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 26px; margin-top: 14px; align-items: start; }
        @media (max-width: 900px) { .cad-ep-grid { grid-template-columns: 1fr; } }
        .cad-ep-side { display: grid; gap: 14px; min-width: 0; }
        .cad-ep .cad-ec-body { margin-top: 0; }
        .cad-steps { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 8px; }
        .cad-steps li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; align-items: start; }
        .cad-steps i { font-style: normal; width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; background: rgba(0,200,224,.12); color: var(--brand); font-family: var(--font-display); font-weight: 800; font-size: 12px; }
        .cad-steps span { font-family: var(--font-body); font-size: 13.5px; line-height: 1.55; color: var(--text-mid); }
        .cad-pnav { display: flex; justify-content: space-between; gap: 10px; margin-top: var(--space-4); flex-wrap: wrap; }
        .cad-bday { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
        .cad-bday b { font-family: var(--font-display); font-weight: 800; font-size: 15px; color: var(--brand); }
        .cad-bday span { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text); }
        .cad-brow { display: grid; grid-template-columns: minmax(170px, 230px) minmax(0, 1fr); gap: 18px; align-items: center; padding: 14px 0; border-top: 1px solid var(--border); }
        @media (max-width: 680px) { .cad-brow { grid-template-columns: 1fr; gap: 6px; } }
        .cad-brow-n b { display: block; font-family: var(--font-display); font-weight: 700; font-size: 14px; color: var(--text); }
        .cad-brow-n span { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); }
        .cad-brow-sub { margin-top: 10px; font-family: var(--font-body); font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .06em; }
        .cad-sc { position: relative; height: 46px; margin: 0 26px 0 6px; }
        .cad-sc-bar { position: absolute; left: 0; right: 0; top: 30px; height: 6px; border-radius: 999px; background: rgba(128,140,160,0.16); }
        .cad-sc-bar i { position: absolute; top: 0; bottom: 0; background: linear-gradient(90deg, #f87171, #fbbf24); opacity: .55; border-radius: 999px 0 0 999px; }
        .cad-sc-bar i.is-mid { background: linear-gradient(90deg, #a3e635, #4ade80); border-radius: 0; opacity: .8; }
        .cad-sc-bar i.is-top { background: linear-gradient(90deg, #2dd4bf, #38bdf8); border-radius: 0 999px 999px 0; opacity: .8; }
        .cad-sc-m { position: absolute; top: 0; transform: translateX(-50%); text-align: center; white-space: nowrap; }
        .cad-sc-m.is-first { transform: none; text-align: left; }
        .cad-sc-m em { display: block; font-style: normal; font-family: var(--font-body); font-size: 10px; color: var(--text-dim); }
        .cad-sc-m b { display: block; font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--text-mid); }
        .cad-sc-m.is-key b { color: var(--text); font-size: 12.5px; }
        .cad-sc-m.is-key em { color: var(--brand); font-weight: 700; }
        .cad-sc-m::after { content: ''; position: absolute; left: 50%; top: 28px; width: 2px; height: 10px; background: var(--text-dim); transform: translateX(-50%); border-radius: 2px; }
        .cad-sc-m.is-first::after { left: 0; transform: none; }
        .cad-sc-m.is-key::after { background: var(--text); }
        .cad-agein { display: grid; gap: 4px; width: 140px; }
        .cad-agein span { font-family: var(--font-body); font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .06em; }
        .cad-heat-wrap { overflow-x: auto; margin-top: 12px; scrollbar-width: none; }
        .cad-heat-wrap::-webkit-scrollbar { display: none; }
        .cad-heat { display: grid; gap: 3px; min-width: 460px; }
        .cad-heat-hd { font-family: var(--font-body); font-size: 11px; font-weight: 700; color: var(--text-mid); text-align: center; padding: 4px 2px; }
        .cad-heat-b { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mid); padding: 5px 6px; border-radius: 6px; }
        .cad-heat-c { font-family: var(--font-mono); font-size: 11px; border-radius: 6px; display: grid; place-items: center; min-height: 26px; }
        .cad-heat-b.is-on { background: var(--brand-gradient); color: #fff; font-weight: 700; }
        .cad-heat-c.is-on { outline: 2px solid var(--brand); outline-offset: -2px; font-weight: 700; }
        .cad-steps5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 980px) { .cad-steps5 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .cad-steps5 { grid-template-columns: 1fr; } }
        .cad-step5 { position: relative; background: var(--bg-card); border: 1px solid var(--border-mid); border-radius: var(--radius-lg); padding: 16px; display: grid; gap: 6px; align-content: start; }
        .cad-step5 i { font-style: normal; width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; background: var(--brand-gradient); color: #fff; font-family: var(--font-display); font-weight: 800; font-size: 13px; }
        .cad-step5 b { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text); }
        .cad-step5 span { font-family: var(--font-body); font-size: 12.5px; line-height: 1.5; color: var(--text-mid); }
        .cad-sim-ctl { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; }
        .cad-sim-ctl .cad-select { flex: 1; min-width: 180px; }
        .cad-sim-line { position: relative; height: 70px; margin: 0 8px; }
        .cad-sim-track { position: absolute; left: 0; right: 0; top: 46px; height: 8px; border-radius: 999px; background: linear-gradient(90deg, #f87171, #fbbf24 30%, #a3e635 46%, #4ade80 77%, #38bdf8); opacity: .75; }
        .cad-sim-k { position: absolute; top: 0; transform: translateX(-50%); text-align: center; white-space: nowrap; }
        .cad-sim-k em { display: block; font-style: normal; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; color: var(--brand); }
        .cad-sim-k b { display: block; font-family: var(--font-mono); font-size: 12px; color: var(--text); }
        .cad-sim-k::after { content: ''; position: absolute; left: 50%; top: 38px; width: 2px; height: 24px; background: var(--text); transform: translateX(-50%); }
        .cad-sim-dot { position: absolute; top: 40px; width: 20px; height: 20px; border-radius: 999px; transform: translateX(-50%); border: 3px solid var(--bg-card); box-shadow: 0 2px 8px rgba(0,0,0,.25); transition: left .08s linear; }
        .cad-sim-out { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
        @media (max-width: 520px) { .cad-sim-out { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cad-sim-out div, .cad-crit div { background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 10px 12px; }
        .cad-sim-out em, .cad-crit em { display: block; font-style: normal; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
        .cad-sim-out b, .cad-crit b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 19px; color: var(--text); margin-top: 2px; }
        .cad-sim-out b small { font-size: 12px; font-weight: 600; color: var(--text-dim); }
        .cad-sim-out b.is-lvl { font-size: 15px; overflow-wrap: anywhere; line-height: 1.25; margin-top: 5px; }
        .cad-crit { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
        @media (max-width: 520px) { .cad-crit { grid-template-columns: 1fr; } }
        .cad-crit span { display: block; font-family: var(--font-body); font-size: 12px; color: var(--text-mid); margin-top: 2px; }
        .cad-crit div.is-tot { border-color: rgba(0,200,224,.45); background: rgba(0,200,224,.08); }
        .cad-crit div.is-tot b { color: var(--brand); }
        .cad-warns { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .cad-warn-i { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; background: var(--bg-card); border: 1px solid rgba(245,158,11,.35); border-radius: var(--radius-lg); padding: 14px 16px; }
        .cad-warn-i > i { font-style: normal; width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; background: rgba(245,158,11,.15); color: #f59e0b; font-family: var(--font-display); font-weight: 800; font-size: 17px; }
        .cad-warn-i b { display: block; font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text); }
        .cad-warn-i span { display: block; font-family: var(--font-body); font-size: 13px; line-height: 1.5; color: var(--text-mid); margin-top: 3px; }
        .cad-run { display: grid; gap: 0; grid-template-columns: minmax(0, 1fr); }
        .cad-run section { max-width: none; margin-left: 0; margin-right: 0; }
        .cad-wiz-steps { display: flex; gap: 8px; margin: 18px 0 16px; flex-wrap: wrap; }
        .cad-wiz-step { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 7px; border-radius: 999px; background: var(--bg-card); border: 1px solid var(--border-mid); font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--text-dim); }
        .cad-wiz-step i { font-style: normal; width: 26px; height: 26px; border-radius: 999px; display: grid; place-items: center; background: var(--bg-card-2); font-family: var(--font-display); font-weight: 800; font-size: 12px; color: var(--text-mid); }
        .cad-wiz-step.on { color: var(--text); border-color: var(--brand); }
        .cad-wiz-step.on i { background: var(--brand-gradient); color: #fff; }
        .cad-wiz-step.done i { background: rgba(0,200,224,.15); color: var(--brand); }
        .cad-wiz { padding: 24px; }
        .cad-wiz-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: 14px; }
        @media (max-width: 520px) { .cad-wiz-2 { grid-template-columns: 1fr 1fr; } }
        .cad-wiz-gear { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }
        .cad-check { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border-radius: var(--radius-md); border: 1px solid var(--border); cursor: pointer; margin-top: 6px; background: var(--bg-card); transition: all .15s; }
        .cad-check input { margin-top: 3px; accent-color: #00c8e0; }
        .cad-check span { font-family: var(--font-body); font-size: 13px; line-height: 1.45; color: var(--text-mid); }
        .cad-check.on { border-color: rgba(0,200,224,.45); background: rgba(0,200,224,.06); }
        .cad-check.on span { color: var(--text); }
        .cad-check.is-big { padding: 12px 14px; border-width: 1.5px; }
        .cad-wiz-date { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 14px; align-items: end; }
        @media (max-width: 620px) { .cad-wiz-date { grid-template-columns: 1fr; } }
        .cad-wiz-tip { font-family: var(--font-body); font-size: 12.5px; line-height: 1.5; color: var(--text-mid); background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3); border-radius: var(--radius-md); padding: 10px 12px; }
        .cad-wiz-tip.ok { background: rgba(34,197,94,.08); border-color: rgba(34,197,94,.3); }
        .cad-cal { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 760px) { .cad-cal { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 420px) { .cad-cal { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cad-cal-d { display: grid; gap: 2px; text-align: left; padding: 10px 11px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-mid); color: var(--text); min-width: 0; font: inherit; }
        .cad-cal-d b { font-family: var(--font-display); font-weight: 800; font-size: 15px; color: var(--brand); }
        .cad-cal-d em { font-style: normal; font-family: var(--font-body); font-size: 11px; color: var(--text-dim); text-transform: capitalize; }
        .cad-cal-d span { font-family: var(--font-body); font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.3; }
        .cad-cal-d small { font-family: var(--font-body); font-size: 10.5px; font-weight: 700; margin-top: 4px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .05em; }
        .cad-cal-d.rest { background: var(--bg-card-2); opacity: .6; }
        .cad-cal-d.rest b { color: var(--text-dim); }
        .cad-cal.is-run .cad-cal-d { cursor: pointer; transition: all .15s; }
        .cad-cal.is-run .cad-cal-d:hover:not(:disabled) { border-color: var(--brand); transform: translateY(-1px); }
        .cad-cal-d.is-rest { cursor: default !important; background: var(--bg-card-2); opacity: .6; }
        .cad-cal-d.is-done { border-color: rgba(34,197,94,.45); background: rgba(34,197,94,.07); }
        .cad-cal-d.is-done small { color: #22c55e; }
        .cad-cal-d.is-part small { color: var(--brand); }
        .cad-cal-d.is-late small { color: #f59e0b; }
        .cad-cal-d.is-now { border: 2px solid var(--brand); box-shadow: 0 4px 16px rgba(0,200,224,.22); }
        .cad-cal-d.is-today small { color: var(--brand); }
        .cad-wiz-nav { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
        .cad-sess-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
        .cad-sess-prog { text-align: right; }
        .cad-sess-prog b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 26px; color: var(--text); line-height: 1; }
        .cad-sess-prog span { font-family: var(--font-body); font-size: 12px; color: var(--text-dim); }
        @media (max-width: 560px) { .cad-sess-prog { text-align: left; display: flex; align-items: baseline; gap: 8px; } .cad-sess-prog b { display: inline; } }
        .cad-sess-steps { display: flex; gap: 6px; margin: 16px 0; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .cad-sess-steps::-webkit-scrollbar { display: none; }
        .cad-sess-step { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px 6px 6px; border-radius: 999px; border: 1px solid var(--border-mid); background: var(--bg-card); cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text-mid); max-width: 220px; }
        .cad-sess-step span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cad-sess-step i { font-style: normal; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; background: var(--bg-card-2); font-family: var(--font-display); font-weight: 800; font-size: 11px; }
        .cad-sess-step.on { border-color: var(--brand); color: var(--text); }
        .cad-sess-step.on i { background: var(--brand-gradient); color: #fff; }
        .cad-sess-step.ok i { background: rgba(34,197,94,.18); color: #22c55e; }
        .cad-sess-step.skip i { background: var(--bg-card-2); color: var(--text-dim); }
        .cad-sess-end { text-align: center; display: grid; justify-items: center; gap: 6px; padding: 32px 20px; }
        .cad-sess-end-ico { width: 56px; height: 56px; border-radius: 999px; display: grid; place-items: center; background: rgba(34,197,94,.15); color: #22c55e; font-size: 26px; font-weight: 800; }
        .cad-step-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 330px); gap: 16px; align-items: start; }
        @media (max-width: 900px) { .cad-step-grid { grid-template-columns: 1fr; } }
        .cad-step-card { padding: 22px; }
        .cad-step-side { display: grid; gap: 14px; position: sticky; top: 90px; }
        @media (max-width: 900px) { .cad-step-side { position: static; } }
        .cad-step-note { margin-top: 12px; font-family: var(--font-body); font-size: 12.5px; color: var(--text); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-sm); padding: 8px 11px; }
        .cad-tries { display: grid; gap: 10px; margin-top: 6px; }
        .cad-cond { border-top: 1px dashed var(--border-mid); margin-top: 14px; padding-top: 4px; }
        .cad-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .cad-chip { font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--text-mid); background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: 999px; padding: 6px 12px; cursor: pointer; }
        .cad-chip.on { color: var(--brand); border-color: var(--brand); background: rgba(0,200,224,.08); }
        .cad-bar2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cad-bar2 > div { background: var(--bg-card-2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; }
        .cad-bar2 span { display: block; font-family: var(--font-body); font-size: 10.5px; color: var(--text-dim); }
        .cad-bar2 b { font-family: var(--font-display); font-weight: 800; font-size: 17px; color: var(--text); }
        .cad-split { display: flex; height: 12px; border-radius: 999px; overflow: hidden; gap: 2px; }
        .cad-split i { display: block; }
        .cad-split-lg { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 6px; }
        .cad-split-lg span { font-family: var(--font-body); font-size: 11px; color: var(--text-mid); display: inline-flex; align-items: center; gap: 5px; }
        .cad-split-lg em { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
        .cad-prev2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cad-prev2-t { font-family: var(--font-body); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); margin-bottom: 2px; }
        .cad-try { display: grid; gap: 4px; min-width: 0; }
        .cad-try > span { font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
        .cad-try .cad-input { font-family: var(--font-mono); font-size: 17px; padding: 12px 12px; }
        .cad-preview-n { font-family: var(--font-display); font-weight: 800; font-size: 40px; letter-spacing: -0.03em; line-height: 1; margin-top: 6px; }
        .cad-preview-n small { font-size: 15px; color: var(--text-dim); font-weight: 700; }
        .cad-preview-l { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--text); }
        .cad-preview-l span { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
        .cad-timer { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 12px; align-items: center; }
        .cad-timer em { display: block; font-style: normal; font-family: var(--font-body); font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
        .cad-timer b { display: block; font-family: var(--font-mono); font-size: 26px; font-weight: 600; color: var(--text); }
        .cad-timer.is-done b { color: #22c55e; }
        .cad-timer-btns { grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .cad-dash { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap: 24px; align-items: center; margin-top: 16px; }
        @media (max-width: 760px) { .cad-dash { grid-template-columns: 1fr; justify-items: center; } .cad-dash > div { width: 100%; } }
        .cad-dash-kpis { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .cad-dash-kpis > div:not(.cad-dash-mode) { background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 8px 14px; min-width: 86px; }
        .cad-dash-kpis b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 22px; color: var(--text); line-height: 1.1; }
        .cad-dash-kpis span { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); }
        .cad-dash-mode { margin-left: auto; }
        .cad-dash-score { display: grid; justify-items: center; gap: 8px; }
        .cad-dash-note { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); text-align: center; max-width: 180px; line-height: 1.4; }
        .cad-dash-bar { height: 8px; border-radius: 999px; background: rgba(128,140,160,0.16); overflow: hidden; }
        .cad-dash-bar i { display: block; height: 100%; border-radius: 999px; background: var(--brand-gradient); transition: width .8s cubic-bezier(.22,1,.36,1); }
        .cad-res-hero { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 26px; align-items: center; margin-top: 16px; border-top: 4px solid var(--brand); }
        @media (max-width: 720px) { .cad-res-hero { grid-template-columns: minmax(0, 1fr); justify-items: center; } .cad-res-hero > div { width: 100%; } }
        .cad-res-donuts { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .cad-res-donut { display: grid; justify-items: center; gap: 2px; }
        .cad-res-dlab { font-family: var(--font-body); font-size: 12px; font-weight: 700; color: var(--text-mid); }
        .cad-res-dlab em { font-style: normal; font-family: var(--font-display); font-weight: 800; }
        .cad-res-lvl { font-family: var(--font-display); font-weight: 800; font-size: 34px; letter-spacing: -0.02em; line-height: 1.1; margin: 2px 0 6px; }
        .cad-res-lvl2 { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; margin: 2px 0 8px; }
        .cad-res-lvl2 span { font-family: var(--font-display); font-weight: 800; font-size: 26px; letter-spacing: -0.02em; line-height: 1; }
        .cad-res-lvl2 small { font-family: var(--font-body); font-size: 11px; color: var(--text-dim); margin-right: 6px; }
        .cad-res-row2 { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px 18px; align-items: baseline; padding: 9px 0; border-top: 1px solid var(--border); }
        .cad-res-row2.is-head { border-top: none; padding: 2px 0; }
        .cad-res-row2.is-head span { font-family: var(--font-body); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); text-align: right; }
        .cad-res-cell { text-align: right; white-space: nowrap; min-width: 86px; }
        .cad-res-cell b { font-family: var(--font-display); font-weight: 800; font-size: 17px; }
        .cad-res-cell span { font-family: var(--font-body); font-size: 11px; color: var(--text-dim); margin-left: 4px; }
        .cad-up { color: #22c55e; } .cad-dn { color: #ef4444; } .cad-eq { color: var(--text-dim); }
        @media (max-width: 520px) { .cad-res-row2 { gap: 6px 10px; } .cad-res-cell { min-width: 64px; } .cad-res-cell b { font-size: 15px; } .cad-res-n b { font-size: 12.5px; } }
        .cad-res-delta { display: inline-flex; align-items: baseline; gap: 8px; background: var(--bg-card-2); border: 1px solid var(--border-mid); border-radius: 999px; padding: 6px 14px; margin-bottom: 4px; }
        .cad-res-delta b { font-family: var(--font-display); font-weight: 800; font-size: 16px; color: var(--brand); }
        .cad-res-delta span { font-family: var(--font-body); font-size: 12px; color: var(--text-mid); }
        .cad-res-row { display: grid; grid-template-columns: minmax(130px, 1fr) minmax(80px, 1.2fr) auto; gap: 12px; align-items: center; padding: 9px 0; border-top: 1px solid var(--border); }
        @media (max-width: 560px) { .cad-res-row { grid-template-columns: minmax(0, 1fr) auto; row-gap: 6px; } .cad-res-row .cad-dash-bar { grid-column: 1 / -1; grid-row: 2; } }
        .cad-res-n b { display: block; font-family: var(--font-display); font-weight: 700; font-size: 13.5px; color: var(--text); }
        .cad-res-n span { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); }
        .cad-res-p { text-align: right; white-space: nowrap; }
        .cad-res-p b { font-family: var(--font-display); font-weight: 800; font-size: 17px; }
        .cad-res-p span { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); margin-left: 4px; }
        .cad-next { margin-top: 18px; border-left: 4px solid var(--brand); }
        .cad-lvl-world.is-you { border-left-style: solid; border-left-width: 3px; }
        .cad-lvl-world.is-you span { background: var(--text); color: var(--bg); padding: 1px 6px; border-radius: 6px; }
        .cad-src .note { font-family: var(--font-body); font-size: 11.5px; color: var(--text-dim); margin: 8px 0 0; line-height: 1.5; }
        .cad-scrollcue { font-family: var(--font-body); font-size: 12px; color: var(--text-dim); display: inline-flex; align-items: center; gap: 6px; }
        @media (max-width: 640px) { .cad-preview-grid, .cad-two { grid-template-columns: 1fr !important; } .cad-preview-grid { justify-items: center; } .cad-stats { grid-template-columns: repeat(2, 1fr); } .cad-act-t { font-size: 22px; } .cad-act-lead { font-size: 16px; } .cad-manifesto { gap: 44px; } }
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
    var hs = React.useState(null); var history = hs[0], setHistory = hs[1];
    var md = React.useState('general'); var mode = md[0], setMode = md[1];
    var er = React.useState(null); var error = er[0], setError = er[1];
    var coS = React.useState(false); var crossOrigin = coS[0], setCrossOrigin = coS[1];
    var appTestUrl = APP_URL + '/site/cadences.html';

    // Catalogue (public) — sonde same-origin, sinon cross-origin vers l'app.
    // Délai de garde + bouton Réessayer (plus de « Loading » infini).
    function fetchCatalog(base) {
      var p = fetch(base + '/api/cadences/catalog').then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); });
      return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 10000); })]);
    }
    function loadCatalog() {
      setError(null);
      fetchCatalog('')
        .then(function (j) { API_BASE = ''; setCrossOrigin(false); setCatalog(j); })
        .catch(function () {
          fetchCatalog(APP_URL)
            .then(function (j) { API_BASE = APP_URL; setCrossOrigin(true); setCatalog(j); })
            .catch(function () { setError('Le serveur n’a pas répondu. Vérifie ta connexion, puis réessaie.'); });
        });
    }
    React.useEffect(loadCatalog, []);

    // Campagnes de l'utilisateur — uniquement en same-origin (l'auth a besoin des
    // cookies). En cross-origin (site) : on reste sur la présentation, le test part
    // sur l'app.
    React.useEffect(function () {
      if (!catalog) return;                   // attend que l'origine de l'API soit connue
      if (crossOrigin) { setView('intro'); return; }
      if (account === undefined) return;
      if (!loggedIn) { setView('intro'); return; }
      api('/api/cadences/campaign').then(function (r) { return r.ok ? r.json() : { campagnes: [] }; })
        .then(function (j) {
          var list = (j && j.campagnes) || [];
          setCampaigns(list);
          var cur = list.filter(function (c) { return c.status === 'in_progress'; })[0];
          if (cur) { loadReport(cur.id, 'test'); }
          else { setView(function (v) { return v === 'loading' ? 'intro' : v; }); }
        }).catch(function () { setView(function (v) { return v === 'loading' ? 'intro' : v; }); });
    }, [account, catalog, crossOrigin]);

    function loadReport(id, nextView) {
      return api('/api/cadences/report?campaignId=' + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) { setReport(j); if (nextView) setView(nextView); } return j; });
    }
    function reload() { return report && report.campaign ? loadReport(report.campaign.id) : Promise.resolve(); }

    // Historique : liste des tests avec leurs scores (instantanés) et conditions.
    function loadHistory(nextView) {
      return api('/api/cadences/history')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { var list = (j && j.tests) || []; setHistory(list); if (nextView) setView(nextView); return list; });
    }

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
      body = <CadResults catalog={catalog} report={report} campaigns={campaigns} mode={mode} setMode={setMode} onBack={function () { setView('intro'); }}/>;
    } else if (view === 'history') {
      body = <CadHistory catalog={catalog} history={history || []} mode={mode}
                         onBack={function () { setView('intro'); }}
                         onStart={function () { setView('start'); }}
                         onOpen={function (id) { loadReport(id, 'results'); }}/>;
    } else {
      body = <CadIntro catalog={catalog} loggedIn={loggedIn} campaigns={campaigns}
                       crossOrigin={crossOrigin} appUrl={appTestUrl}
                       onStart={function () { setView('start'); }}
                       onResume={function (id) { loadReport(id, 'test'); }}
                       onHistory={function () { loadHistory('history'); }}
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
  var CAD_TABS = [
    { k: 'apercu', label: 'Vue d’ensemble', icon: 'chart' },
    { k: 'qualites', label: 'Qualités', icon: 'target' },
    { k: 'protocole', label: 'Protocole', icon: 'plan' },
    { k: 'baremes', label: 'Barèmes & charges', icon: 'card' },
    { k: 'score', label: 'Le score', icon: 'bolt' },
    { k: 'avertissements', label: 'Avertissements', icon: 'shield' },
  ];
  function CadIntro(props) {
    var cat = props.catalog;
    var enCours = (props.campaigns || []).filter(function (c) { return c.status === 'in_progress'; })[0];
    var terminees = (props.campaigns || []).filter(function (c) { return c.status === 'completed'; });
    var tb = React.useState('apercu'); var tab = tb[0], setTab = tb[1];

    function makeCta() {
      return props.crossOrigin
        ? <a className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }} href={props.appUrl}>Démarrer le test →</a>
        : enCours
          ? <button type="button" className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }} onClick={function () { props.onResume(enCours.id); }}>Reprendre le test →</button>
          : props.loggedIn
            ? <button type="button" className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }} onClick={props.onStart}>Démarrer le test</button>
            : <a className="thw-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }} href={'compte.html?next=' + encodeURIComponent('cadences.html')}>Se connecter pour passer le test</a>;
    }

    function panel() {
      if (tab === 'qualites') return window.CadContent.qualities(cat);
      if (tab === 'protocole') return window.CadContent.protocol(cat);
      if (tab === 'baremes') return window.CadContent.bareme(cat);
      if (tab === 'score') return window.CadContent.scoreExplain(cat);
      if (tab === 'avertissements') return window.CadContent.warnings(cat);
      return window.CadContent.overview(cat);
    }

    return (
      <div>
        <div className="cad-hero">
          <div className="t-label" style={{ color: 'var(--brand)' }}>Test de condition générale</div>
          <h1 className="t-display" style={{ margin: '10px 0 0' }}>CADENCES</h1>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18, lineHeight: 1.4, margin: '14px 0 0', color: 'var(--text)', maxWidth: 640 }}>
            Mesurez vraiment où vous en êtes, physiquement — et suivez vos progrès chaque année.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, margin: '12px 0 0', color: 'var(--text-mid)', maxWidth: 640 }}>
            {cat.totalTests} épreuves · 12 jours · score sur {cat.totalPoints} · 7 qualités · barème général ou ajusté à l'âge · 18 à 80 ans.
          </p>
          <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {makeCta()}
            {props.crossOrigin ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)' }}>Le test se lance sur l'app.</span> : null}
          </div>
        </div>

        <div className="cad-scrollcue" style={{ marginTop: 28 }}>↓ Pourquoi ce test, et en quoi il consiste</div>

        {window.CadManifesto ? <window.CadManifesto catalog={cat} makeCta={makeCta} /> : null}

        <nav className="cad-tabs" aria-label="Sections">
          {CAD_TABS.map(function (t) {
            return (
              <button key={t.k} type="button" className={'cad-tab' + (tab === t.k ? ' on' : '')} onClick={function () { setTab(t.k); }}>
                <span className="cad-tab-ico"><ThemeIcon name={t.icon} size={17} /></span>
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="cad-panel">{panel()}</div>

        {!props.crossOrigin && terminees.length ? (
          <div style={{ marginTop: 'var(--space-8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
              <div className="t-h2">Mes passages</div>
              {terminees.length > 1 && props.onHistory ? <button type="button" className="cad-link" onClick={props.onHistory}>Voir l’historique complet →</button> : null}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {terminees.map(function (c) {
                return (
                  <button key={c.id} type="button" onClick={function () { props.onOpenResults(c.id); }}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, textAlign: 'left',
                                   background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-md)', padding: '12px 14px', cursor: 'pointer', color: 'var(--text)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{frDate(c.completed_on || c.started_on)}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)' }}>{c.scale_sex === 'M' ? 'H' : 'F'} · {c.age_at_start} ans · {Math.round(c.body_weight_kg)} kg →</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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

  // ════════════════ DÉMARRAGE (assistant en 3 étapes) ════════════════
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dateAt(iso, plusDays) { var d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + plusDays); return d; }
  function isoOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtDay(d) { try { return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return isoOf(d); } }
  function startKey(id) { return 'cad-start-' + id; }
  function getStart(camp) { try { var v = window.localStorage.getItem(startKey(camp.id)); if (v) return v; } catch (e) {} return String(camp.started_on || todayISO()).slice(0, 10); }
  function setStart(id, iso) { try { window.localStorage.setItem(startKey(id), iso); } catch (e) {} }
  var GEAR_LIST = [
    { k: 'Salle', items: ['Barre olympique + disques', 'Rack + banc', 'Barre de traction + lest', 'Box (60 / 40 cm)', 'Rameur'] },
    { k: 'Piste & gazon', items: ['Piste de 400 m', 'Gazon plat', 'Plots', 'Mètre ruban', 'Chrono (idéalement cellules)'] },
    { k: 'Piscine', items: ['Bassin de 25 ou 50 m'] },
    { k: 'Vélo', items: ['Vélo ou home-trainer avec capteur de puissance'] },
  ];

  function CadStart(props) {
    var cat = props.catalog;
    var st = React.useState(1); var step = st[0], setStep = st[1];
    var sx = React.useState(null); var sex = sx[0], setSex = sx[1];
    var ag = React.useState(''); var age = ag[0], setAge = ag[1];
    var pd = React.useState(''); var poids = pd[0], setPoids = pd[1];
    var dt = React.useState(todayISO()); var start = dt[0], setStartD = dt[1];
    var gk = React.useState({}); var gear = gk[0], setGear = gk[1];
    var wk = React.useState(false); var warned = wk[0], setWarned = wk[1];
    var cs = React.useState(false); var consent = cs[0], setConsent = cs[1];
    var bz = React.useState(false); var busy = bz[0], setBusy = bz[1];
    var er = React.useState(null); var err = er[0], setErr = er[1];
    var month = new Date(start + 'T12:00:00').getMonth();
    var goodMonth = month === 3 || month === 4 || month === 8 || month === 9;

    function next() {
      setErr(null);
      if (step === 1) {
        if (!sex) return setErr('Choisis le barème (homme / femme).');
        var a = Number(age), p = Number(poids);
        if (!isFinite(a) || a < 18 || a > 80) return setErr('Âge requis : réservé aux 18 à 80 ans.');
        if (!isFinite(p) || p < 30 || p > 250) return setErr('Poids de corps requis (30 à 250 kg).');
      }
      if (step === 2 && !start) return setErr('Choisis une date de début.');
      setStep(step + 1);
    }
    function go() {
      setErr(null);
      if (!warned) return setErr('Coche la case « J’ai lu les avertissements » pour démarrer.');
      setBusy(true);
      api('/api/cadences/campaign', { method: 'POST', body: JSON.stringify({ sex: sex, scaleSex: sex, age: Number(age), bodyWeightKg: Number(poids), shareForCalibration: consent }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) { setErr((res.j && res.j.erreur) || 'Impossible de démarrer.'); setBusy(false); return; }
          setStart(res.j.id, start);
          props.onCreated(res.j.id);
        }).catch(function () { setErr('Erreur réseau.'); setBusy(false); });
    }
    var STEPS = ['Profil', 'Préparation', 'Engagement'];
    return (
      <div className="cad-run">
        <button type="button" className="cad-link" onClick={props.onCancel}>← Retour</button>
        <div className="cad-act-eye" style={{ marginTop: 14 }}>Nouveau test</div>
        <h1 className="cad-act-t" style={{ fontSize: 30 }}>Démarrer CADENCES</h1>
        <div className="cad-wiz-steps">
          {STEPS.map(function (s, i) {
            var n = i + 1;
            return <div key={s} className={'cad-wiz-step' + (n === step ? ' on' : '') + (n < step ? ' done' : '')}><i>{n < step ? '✓' : n}</i><span>{s}</span></div>;
          })}
        </div>

        <div className="cad-card cad-wiz">
          {step === 1 ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <h3 className="cad-h3">Ton profil</h3>
                <p className="cad-p" style={{ margin: 0 }}>Ton sexe, ton âge et ton poids servent au barème (le poids pour les épreuves en ratio). Ils restent privés.</p>
              </div>
              <div>
                <div className="cad-ec-h">Barème</div>
                <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
                  <button type="button" className="cad-pill" aria-pressed={sex === 'M'} onClick={function () { setSex('M'); }}>Homme</button>
                  <button type="button" className="cad-pill" aria-pressed={sex === 'F'} onClick={function () { setSex('F'); }}>Femme</button>
                </div>
              </div>
              <div className="cad-wiz-2">
                <label><div className="cad-ec-h">Âge</div><input className="cad-input" inputMode="numeric" value={age} placeholder="ex. 32" onChange={function (e) { setAge(e.target.value); }} aria-label="Âge"/></label>
                <label><div className="cad-ec-h">Poids de corps (kg)</div><input className="cad-input" inputMode="decimal" value={poids} placeholder="ex. 78" onChange={function (e) { setPoids(e.target.value); }} aria-label="Poids de corps"/></label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <h3 className="cad-h3">Préparer tes 12 jours</h3>
                <p className="cad-p" style={{ margin: 0 }}>Vérifie ton matériel, puis choisis la date du jour 1 : le calendrier se cale dessus.</p>
              </div>
              <div className="cad-wiz-gear">
                {GEAR_LIST.map(function (g) {
                  return (
                    <div key={g.k}>
                      <div className="cad-ec-h">{g.k}</div>
                      {g.items.map(function (it) {
                        var on = !!gear[it];
                        return (
                          <label key={it} className={'cad-check' + (on ? ' on' : '')}>
                            <input type="checkbox" checked={on} onChange={function () { var n = Object.assign({}, gear); n[it] = !on; setGear(n); }}/>
                            <span>{it}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="cad-wiz-date">
                <label><div className="cad-ec-h">Date du jour 1</div><input type="date" className="cad-input" value={start} onChange={function (e) { setStartD(e.target.value); }} aria-label="Date du jour 1"/></label>
                <div className={'cad-wiz-tip' + (goodMonth ? ' ok' : '')}>
                  {goodMonth ? 'Bonne période : ni trop chaud, ni trop froid en général.' : 'Conseil : avril, mai, septembre ou octobre sont les meilleurs mois (selon là où tu habites).'} Garde la même période chaque année pour comparer.
                </div>
              </div>
              <div className="cad-cal">
                {cat.days.map(function (d) {
                  var dd = dateAt(start, d.day - 1);
                  return <div key={d.day} className={'cad-cal-d' + (d.rest ? ' rest' : '')}><b>J{d.day}</b><em>{fmtDay(dd)}</em><span>{d.rest ? 'Repos' : d.label}</span></div>;
                })}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <h3 className="cad-h3">Avant de te lancer</h3>
                <p className="cad-p" style={{ margin: 0 }}>Barème {sex === 'M' ? 'homme' : 'femme'} · {age} ans · {poids} kg · jour 1 le {fmtDay(dateAt(start, 0))}</p>
              </div>
              <div className="cad-warns" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {[['Avis médical conseillé', 'Efforts intenses et maximaux : consulte avant de tester.'], ['Pas un diagnostic', 'Un test de condition physique, pas un examen médical.'], ['Arrête si ça ne va pas', 'Douleur, malaise, vertige : on stoppe. La technique d’abord.']].map(function (w) {
                  return <div key={w[0]} className="cad-warn-i"><i>!</i><div><b>{w[0]}</b><span>{w[1]}</span></div></div>;
                })}
              </div>
              <label className={'cad-check is-big' + (warned ? ' on' : '')}>
                <input type="checkbox" checked={warned} onChange={function (e) { setWarned(e.target.checked); }}/>
                <span><strong>J’ai lu les avertissements</strong> et je teste sous ma responsabilité.</span>
              </label>
              <label className={'cad-check' + (consent ? ' on' : '')}>
                <input type="checkbox" checked={consent} onChange={function (e) { setConsent(e.target.checked); }}/>
                <span>J’accepte que mes résultats anonymisés servent à affiner les barèmes (optionnel, révocable).</span>
              </label>
            </div>
          ) : null}

          {err ? <div className="cad-err" role="alert" style={{ marginTop: 14 }}>{err}</div> : null}
          <div className="cad-wiz-nav">
            {step > 1 ? <button type="button" className="thw-btn-ghost" onClick={function () { setErr(null); setStep(step - 1); }}>← Précédent</button> : <span></span>}
            {step < 3
              ? <button type="button" className="thw-btn-primary" onClick={next}>Continuer →</button>
              : <button type="button" className="thw-btn-primary" style={{ opacity: busy ? .6 : 1 }} disabled={busy} onClick={go}>{busy ? 'Démarrage…' : 'Démarrer le test'}</button>}
          </div>
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
  // partial : en cours de test, une qualité sans aucune épreuve saisie est « à venir » (pas 0 %).
  function qualityItemsFrom(catalog, score, partial) {
    return catalog.qualities.map(function (q) {
      var s = (score && score.byQuality && score.byQuality[q.key]) || {};
      var tested = !partial || catalog.tests.some(function (t) { return t.weights && t.weights[q.key] > 0 && score && score.byTest && score.byTest[t.slug]; });
      if (!tested) return { key: q.key, label: q.label, pct: 0, level: 'À venir', color: 'var(--text-dim)', pending: true };
      var level = s.level || 'Sédentaire';
      return { key: q.key, label: q.label, pct: s.pct || 0, level: level, color: levelColor(catalog.palette, level) };
    });
  }

  // ════════════════ TABLEAU DE BORD / SAISIE ════════════════
  function partCountOf(t) { return t.partCount || 1; }
  function critPts(t, agg) { var c = (t.criteria || []).filter(function (x) { return x.aggregate === agg; })[0]; return c ? c.pts_max : 0; }
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
  // Lieu effectif d'une épreuve : extérieur imposé, choix pour le vélo, sinon intérieur.
  function effVenue(t, d) { return t.venue === 'outdoor' ? 'outdoor' : t.venue === 'toggle' ? ((d && d.venue) || 'indoor') : 'indoor'; }
  function needsCond(t, d) { return effVenue(t, d) === 'outdoor'; }
  // Météo (le temps) proposée pour les épreuves en extérieur.
  var WEATHER = ['☀️ sec', '⛅ nuageux', '🌧️ pluie', '🌬️ vent', '🔥 chaleur', '❄️ froid'];
  function emptyDraft(t) {
    return {
      parts: new Array(partCountOf(t)).fill(''), partialReps: '',
      equipment: t.equipmentField === 'chaussures' ? 'normales' : t.equipmentField === 'ceinture' ? 'sans' : null,
      timing: t.hasTiming ? 'manuel' : null, pool: t.hasPool ? 25 : null, variant: t.hasVariant ? 'box' : null,
      venue: t.venue === 'toggle' ? 'indoor' : null, tempC: '', weather: '',
    };
  }
  // Valeur enregistrée → texte du champ (temps ≥ 1 min en m:ss, 2 décimales max).
  function partText(t, v) {
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    n = Math.round(n * 100) / 100;
    if (t.unit === 's' && n >= 60) { var m = Math.floor(n / 60), sec = Math.round((n - m * 60) * 100) / 100; return m + ':' + (sec < 10 ? '0' : '') + sec; }
    return String(n);
  }
  function draftFromResult(t, r) {
    var base = emptyDraft(t);
    var parts = (r.raw_parts && r.raw_parts.length) ? r.raw_parts.map(function (v) { return partText(t, v); }) : (r.raw_value != null ? [partText(t, r.raw_value)] : base.parts);
    return {
      parts: t.isAmrap ? [parts[0] || ''] : pad(parts, partCountOf(t)),
      partialReps: t.isAmrap ? (parts[1] != null ? String(parts[1]) : '') : '',
      equipment: r.equipment || base.equipment, timing: r.timing_method || base.timing,
      pool: r.pool_length_m || base.pool, variant: r.variant || base.variant,
      venue: r.venue || base.venue, tempC: r.temperature_c != null ? String(r.temperature_c) : '', weather: r.weather || '',
    };
  }

  // ── Aperçu des points en direct (même formule que src/lib/cadences/engine.ts) ──
  function previewScore(cat, t, d, camp, mode) {
    var value = aggDraft(t, d);
    if (value == null || !(value > 0)) return null;
    var base = camp.scale_sex === 'M' ? t.male : t.female;
    var ref = base.ref, max = base.max;
    if (mode === 'age') {
      var pf = (cat.age && cat.age.pf && cat.age.pf[camp.age_band]) || null;
      if (pf) {
        var f = 0; QK.forEach(function (q) { f += ((t.weights && t.weights[q]) || 0) * (pf[q] == null ? 1 : pf[q]); });
        if (t.direction === 'higher_is_better') { ref *= f; max *= f; }
        else { var dv = Math.pow(f, t.ageTimeExponent == null ? 1 : t.ageTimeExponent); ref /= dv; max /= dv; }
      }
    }
    function norm(v) {
      var x = v, eq = t.equipment;
      if (eq && d.equipment === eq.applies_when) x = eq.rule === 'result_x_(1-pct)' ? x * (1 - eq.pct) : x * (1 + eq.pct);
      if (t.kind === 'ratio') x = x / camp.body_weight_kg;
      return x;
    }
    var an = cat.anchors || { ref_pct: 0.6, max_pct: 1 };
    function pctOf(v, r, m) { return Math.max(0, an.ref_pct + (an.max_pct - an.ref_pct) * (v - r) / (m - r)); }
    var points;
    if (t.criteria && t.criteria.length) {
      var n = partCountOf(t);
      var parts = (d.parts || []).map(function (p) { return parsePart(t, p); }).filter(function (v) { return v != null; });
      if (!parts.length) parts = [value];
      points = 0;
      t.criteria.forEach(function (c) {
        if (c.aggregate === 'sum') {
          var sum = 0; parts.forEach(function (p) { sum += norm(p); });
          var v = parts.length < n ? sum / parts.length * n : sum;
          points += pctOf(v, ref * n, max * n) * c.pts_max;
        } else points += pctOf(norm(value), ref, max) * c.pts_max;
      });
    } else points = pctOf(norm(value), ref, max) * t.pts_max;
    var pct = points / t.pts_max;
    var lvl = cat.levels[0].label; cat.levels.forEach(function (l) { if (pct >= l.min_pct) lvl = l.label; });
    return { points: points, pct: pct, level: lvl };
  }

  // Barème personnalisé (sexe + âge + poids) : seuils Référence / Maximum
  // exprimés dans l'unité de l'épreuve (valeur absolue, poids de corps inclus
  // pour les épreuves en ratio). Même ajustement d'âge que l'aperçu des points.
  function personalBareme(cat, t, camp, mode) {
    var base = camp.scale_sex === 'M' ? t.male : t.female;
    var ref = base.ref, max = base.max;
    if (mode === 'age') {
      var pf = (cat.age && cat.age.pf && cat.age.pf[camp.age_band]) || null;
      if (pf) {
        var f = 0; QK.forEach(function (q) { f += ((t.weights && t.weights[q]) || 0) * (pf[q] == null ? 1 : pf[q]); });
        if (t.direction === 'higher_is_better') { ref *= f; max *= f; }
        else { var dv = Math.pow(f, t.ageTimeExponent == null ? 1 : t.ageTimeExponent); ref /= dv; max /= dv; }
      }
    }
    if (t.kind === 'ratio') { ref *= camp.body_weight_kg; max *= camp.body_weight_kg; }
    return { ref: ref, max: max };
  }

  // Récupération conseillée entre essais (secondes).
  function recupSec(t) {
    if (t.group === 'Agilité') return 90;
    if (t.group === 'Sprints' || t.group === 'Force max' || t.group === 'Haltérophilie') return 180;
    return 0;
  }
  function RecupTimer(props) {
    var total = props.sec;
    var ls = React.useState(total); var left = ls[0], setLeft = ls[1];
    var rs = React.useState(false); var running = rs[0], setRunning = rs[1];
    React.useEffect(function () {
      if (!running) return;
      var id = setInterval(function () { setLeft(function (l) { if (l <= 1) { setRunning(false); return 0; } return l - 1; }); }, 1000);
      return function () { clearInterval(id); };
    }, [running]);
    var R = 22, C = 2 * Math.PI * R, frac = left / total;
    return (
      <div className={'cad-timer' + (left === 0 ? ' is-done' : '')}>
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(128,140,160,0.2)" strokeWidth="5"/>
          <circle cx="28" cy="28" r={R} fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" strokeDasharray={(C * frac) + ' ' + C} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dasharray .9s linear' }}/>
        </svg>
        <div>
          <em>Récupération</em>
          <b>{Math.floor(left / 60)}:{pad2(left % 60)}</b>
        </div>
        <div className="cad-timer-btns">
          <button type="button" className="thw-btn-ghost" onClick={function () { if (left === 0) setLeft(total); setRunning(!running); }}>{running ? 'Pause' : left === 0 ? 'Relancer' : 'Démarrer'}</button>
          <button type="button" className="cad-link" onClick={function () { setRunning(false); setLeft(total); }}>Remettre à {Math.floor(total / 60)}:{pad2(total % 60)}</button>
        </div>
      </div>
    );
  }

  // ════════════════ MON TEST : tableau de bord + séance du jour ════════════════
  function CadTest(props) {
    var cat = props.catalog, rep = props.report;
    var camp = rep.campaign;
    var results = rep.results || [];
    var resultBySlug = {}; results.forEach(function (r) { resultBySlug[r.test_slug] = r; });
    var empty = { total: 0, globalLevel: cat.levels[0].label, byQuality: {}, byTest: {} };
    var score = (rep.scores && rep.scores.general) || empty;      // général (primaire)
    var scoreA = (rep.scores && rep.scores.age) || empty;          // ajusté à l'âge
    var start = getStart(camp);

    var ds = React.useState(function () {
      var m = {};
      cat.tests.forEach(function (t) { var r = resultBySlug[t.slug]; m[t.slug] = r ? draftFromResult(t, r) : emptyDraft(t); });
      return m;
    });
    var drafts = ds[0], setDrafts = ds[1];
    var er = React.useState(null); var err = er[0], setErr = er[1];
    var bz = React.useState(false); var closing = bz[0], setClosing = bz[1];
    var od = React.useState(null); var openDay = od[0], setOpenDay = od[1];
    var sp = React.useState(0); var stepIdx = sp[0], setStepIdx = sp[1];
    var rc = React.useState(false); var recap = rc[0], setRecap = rc[1];

    function setDraft(slug, patch) { setDrafts(function (d) { var n = Object.assign({}, d); n[slug] = Object.assign({}, d[slug], patch); return n; }); }
    function put(payload) {
      return api('/api/cadences/result', { method: 'PUT', body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) { return r.json().then(function (j) { setErr((j && j.erreur) || 'Enregistrement impossible.'); return false; }); } return true; })
        .catch(function () { setErr('Erreur réseau.'); return false; });
    }
    function validate(t, after) {
      setErr(null);
      var d = drafts[t.slug];
      var value = aggDraft(t, d);
      if (value == null || value <= 0) { setErr(t.name + ' : saisis une valeur valide.'); return; }
      if (t.aggregate === 'sum' && d.parts.some(function (p) { return !String(p || '').trim(); })) { setErr(t.name + ' : renseigne les ' + partCountOf(t) + ' passages.'); return; }
      if (t.criteria && d.parts.some(function (p) { return parsePart(t, p) == null; })) {
        setErr(t.name + ' : renseigne les ' + partCountOf(t) + ' essais' + (t.unit === 'm' ? ' (0 pour un saut raté).' : '.')); return;
      }
      var venue = effVenue(t, d);
      var temp = String(d.tempC == null ? '' : d.tempC).replace(',', '.').trim();
      var tempN = temp === '' ? null : Number(temp);
      if (venue === 'outdoor' && (tempN == null || !isFinite(tempN) || tempN < -30 || tempN > 55)) {
        setErr(t.name + ' : renseigne la température (°C) — épreuve en extérieur.'); return;
      }
      var rawParts = t.isAmrap ? [Number(d.parts[0]), Number(d.partialReps || 0)]
        : (partCountOf(t) > 1 ? d.parts.map(function (p) { return parsePart(t, p); }).filter(function (v) { return v != null; }) : null);
      put({ campaignId: camp.id, slug: t.slug, value: value, rawParts: rawParts, status: 'validated', equipment: d.equipment, variant: d.variant, timingMethod: d.timing, poolLength: d.pool,
            venue: venue, temperatureC: venue === 'outdoor' ? tempN : null, weather: venue === 'outdoor' ? d.weather : null })
        .then(function (ok) { if (ok) { props.reload(); if (after) after(); } });
    }
    function skip(t, reason, after) {
      setErr(null);
      put({ campaignId: camp.id, slug: t.slug, status: 'skipped', skipReason: reason }).then(function (ok) { if (ok) { props.reload(); if (after) after(); } });
    }
    function clear(t) {
      setErr(null);
      api('/api/cadences/result', { method: 'DELETE', body: JSON.stringify({ campaignId: camp.id, slug: t.slug }) })
        .then(function (r) { if (r.ok) { setDraft(t.slug, emptyDraft(t)); props.reload(); } else setErr('Impossible d’effacer.'); });
    }
    function close() {
      setClosing(true); setErr(null);
      api('/api/cadences/campaign/close', { method: 'POST', body: JSON.stringify({ campaignId: camp.id }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) { if (!res.ok) { setErr((res.j && res.j.erreur) || 'Clôture impossible.'); setClosing(false); return; } props.onClosed(); })
        .catch(function () { setErr('Erreur réseau.'); setClosing(false); });
    }

    var testsByDay = function (day) { return cat.tests.filter(function (t) { return t.day === day; }).sort(function (a, b) { return a.order_in_day - b.order_in_day; }); };
    var statusOf = function (slug) { var r = resultBySlug[slug]; return r ? r.status : null; };
    var validated = results.filter(function (r) { return r.status === 'validated'; }).length;
    var skippedN = results.filter(function (r) { return r.status === 'skipped'; }).length;
    var missing = cat.totalTests - validated - skippedN;
    var gColor = levelColor(cat.palette, score.globalLevel);
    var today = todayISO();

    // ── Séance du jour (mode focus) ──
    if (openDay != null) {
      var day = cat.days.filter(function (d) { return d.day === openDay; })[0];
      var tests = testsByDay(openDay);
      var warm = null; tests.forEach(function (t) { var p = cat.protocols[t.slug]; if (!warm && p && p.warmup) warm = p.warmup; });
      var steps = ['Échauffement'].concat(tests.map(function (t) { return t.name.replace(/\s*\(.*\)$/, ''); }));
      var cur = stepIdx > 0 ? tests[stepIdx - 1] : null;
      var goStep = function (i) { setErr(null); setStepIdx(Math.max(0, Math.min(steps.length, i))); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); } };
      var finished = stepIdx >= steps.length;
      return (
        <div className="cad-run">
          <button type="button" className="cad-link" onClick={function () { setOpenDay(null); setStepIdx(0); setErr(null); }}>← Mon test</button>
          <div className="cad-sess-head">
            <div>
              <div className="cad-act-eye">Jour {day.day} · {fmtDay(dateAt(start, day.day - 1))}</div>
              <h1 className="cad-act-t" style={{ fontSize: 28 }}>{day.label}</h1>
            </div>
            <div className="cad-sess-prog"><b>{tests.filter(function (t) { return statusOf(t.slug); }).length}/{tests.length}</b><span>épreuves saisies</span></div>
          </div>
          <div className="cad-sess-steps">
            {steps.map(function (s, i) {
              var t = i > 0 ? tests[i - 1] : null;
              var stt = t ? statusOf(t.slug) : null;
              return (
                <button key={i} type="button" className={'cad-sess-step' + (i === stepIdx ? ' on' : '') + (stt === 'validated' ? ' ok' : stt === 'skipped' ? ' skip' : '')} onClick={function () { goStep(i); }}>
                  <i>{stt === 'validated' ? '✓' : stt === 'skipped' ? '–' : i === 0 ? '◎' : i}</i><span>{s}</span>
                </button>
              );
            })}
          </div>

          {err ? <div className="cad-err" role="alert" style={{ marginBottom: 12 }}>{err}</div> : null}

          {stepIdx === 0 ? (
            <WarmupStep warm={warm} common={cat.echauffement} onNext={function () { goStep(1); }} />
          ) : finished ? (
            <div className="cad-card cad-sess-end">
              <div className="cad-sess-end-ico">✓</div>
              <h3 className="cad-h3" style={{ fontSize: 20 }}>Séance du jour {day.day} terminée</h3>
              <p className="cad-p">{tests.filter(function (t) { return statusOf(t.slug) === 'validated'; }).length} épreuve(s) validée(s) sur {tests.length}. Récupère bien : la suite du protocole compte aussi.</p>
              <button type="button" className="thw-btn-primary" onClick={function () { setOpenDay(null); setStepIdx(0); }}>Retour au calendrier</button>
            </div>
          ) : (
            <TestStep key={cur.slug} t={cur} idx={stepIdx} n={tests.length} cat={cat} camp={camp} mode={props.mode}
                      draft={drafts[cur.slug]} setDraft={function (p) { setDraft(cur.slug, p); }}
                      result={resultBySlug[cur.slug]} score={(score.byTest && score.byTest[cur.slug]) || null} scoreA={(scoreA.byTest && scoreA.byTest[cur.slug]) || null}
                      onValidate={function () { validate(cur, function () { goStep(stepIdx + 1); }); }}
                      onSkip={function (reason) { skip(cur, reason, function () { goStep(stepIdx + 1); }); }}
                      onClear={function () { clear(cur); }}
                      onPrev={function () { goStep(stepIdx - 1); }} onNext={function () { goStep(stepIdx + 1); }} />
          )}
        </div>
      );
    }

    // ── Tableau de bord ──
    var curDay = null;
    cat.days.forEach(function (d) { if (isoOf(dateAt(start, d.day - 1)) === today) curDay = d.day; });
    return (
      <div className="cad-run">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="cad-act-eye">Mon test CADENCES</div>
            <h1 className="cad-act-t" style={{ fontSize: 30 }}>{curDay ? 'Jour ' + curDay + ' aujourd’hui' : 'Ton calendrier'}</h1>
          </div>
          <button type="button" className="cad-link" onClick={props.onHome}>← Présentation</button>
        </div>
        <p className="cad-p" style={{ marginTop: 6 }}>Barème {camp.scale_sex === 'M' ? 'homme' : 'femme'} · {camp.age_at_start} ans · {Math.round(camp.body_weight_kg)} kg · jour 1 le {fmtDay(dateAt(start, 0))}</p>

        <section className="cad-card cad-dash">
          <div className="cad-res-donuts cad-dash-score">
            <div className="cad-res-donut">
              <CadScoreDonut total={score.total} totalMax={cat.totalPoints} level={missing ? 'Provisoire' : score.globalLevel} color={missing ? 'var(--brand)' : gColor} size={150}/>
              <div className="cad-res-dlab">Général</div>
            </div>
            <div className="cad-res-donut">
              <CadScoreDonut total={scoreA.total} totalMax={cat.totalPoints} level={missing ? 'Provisoire' : scoreA.globalLevel} color={missing ? 'var(--brand-alt)' : levelColor(cat.palette, scoreA.globalLevel)} size={150}/>
              <div className="cad-res-dlab">Ajusté à l’âge</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            <div className="cad-dash-kpis">
              <div><b>{validated}</b><span>validées</span></div>
              <div><b>{skippedN}</b><span>passées</span></div>
              <div><b>{missing}</b><span>restantes</span></div>
            </div>
            {missing ? <div className="cad-dash-note" style={{ textAlign: 'left', maxWidth: 'none' }}>Points acquis à ce stade. Le palier tombe à la clôture.</div> : null}
            <div className="cad-dash-bar"><i style={{ width: (validated + skippedN) / cat.totalTests * 100 + '%' }}></i></div>
            <div className="cad-ec-h">Qualités · général</div>
            <CadQualityRings items={qualityItemsFrom(cat, score, true)}/>
            <div className="cad-ec-h">Qualités · ajusté à l’âge</div>
            <CadQualityRings items={qualityItemsFrom(cat, scoreA, true)}/>
          </div>
        </section>

        <h2 className="cad-h3" style={{ fontSize: 18, margin: '26px 0 12px' }}>Les 12 jours</h2>
        <div className="cad-cal is-run">
          {cat.days.map(function (d) {
            var dd = dateAt(start, d.day - 1), iso = isoOf(dd);
            var ts = testsByDay(d.day);
            var done = ts.filter(function (t) { return statusOf(t.slug); }).length;
            var state = d.rest ? 'rest' : done === ts.length ? 'done' : done > 0 ? 'part' : iso === today ? 'today' : iso < today ? 'late' : 'next';
            var label = d.rest ? 'Repos' : state === 'done' ? 'Fait ✓' : state === 'part' ? done + '/' + ts.length : state === 'today' ? 'Aujourd’hui' : state === 'late' ? 'À rattraper' : 'À venir';
            return (
              <button key={d.day} type="button" disabled={d.rest} className={'cad-cal-d is-' + state + (iso === today ? ' is-now' : '')} onClick={function () { if (!d.rest) { setOpenDay(d.day); setStepIdx(0); } }}>
                <b>J{d.day}</b><em>{fmtDay(dd)}</em><span>{d.label}</span><small>{label}</small>
              </button>
            );
          })}
        </div>

        <section className="cad-card" style={{ marginTop: 20 }}>
          {recap ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <h3 className="cad-h3">Clôturer le test ?</h3>
              <p className="cad-p" style={{ margin: 0 }}>{validated} épreuve(s) validée(s), {skippedN} passée(s){missing ? ', ' + missing + ' non saisie(s) — elles ne compteront pas' : ''}. Score actuel : <strong>{Math.round(score.total)} / {cat.totalPoints}</strong> ({score.globalLevel}). Après la clôture, les saisies sont figées et ton score devient définitif.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="thw-btn-primary" style={{ opacity: closing ? .6 : 1 }} disabled={closing} onClick={close}>{closing ? 'Clôture…' : 'Oui, clôturer'}</button>
                <button type="button" className="thw-btn-ghost" onClick={function () { setRecap(false); }}>Pas encore</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 className="cad-h3" style={{ marginBottom: 4 }}>{missing ? 'Encore ' + missing + ' épreuve' + (missing > 1 ? 's' : '') + ' à saisir' : 'Tout est saisi'}</h3>
                <p className="cad-p" style={{ margin: 0 }}>{missing ? 'Tu pourras clôturer quand chaque épreuve est validée ou passée.' : 'Tu peux clôturer pour figer ton score.'}</p>
              </div>
              {missing === 0
                ? <button type="button" className="thw-btn-primary" onClick={function () { setRecap(true); }}>Clôturer mon test</button>
                : validated > 0 ? <button type="button" className="cad-link" onClick={function () { setRecap(true); }}>Clôturer quand même</button> : null}
            </div>
          )}
          {err ? <div className="cad-err" role="alert" style={{ marginTop: 10 }}>{err}</div> : null}
        </section>
      </div>
    );
  }

  function WarmupStep(props) {
    var items = String((props.warm && props.warm.texte) || props.common || '').split(/\.\s+/).map(function (s) { return s.replace(/\.$/, '').trim(); }).filter(Boolean);
    var cs = React.useState({}); var done = cs[0], setDone = cs[1];
    var all = items.length && items.every(function (_, i) { return done[i]; });
    return (
      <div className="cad-card cad-step-card">
        <div className="cad-ec-h">Étape 0 · Échauffement</div>
        <h3 className="cad-h3" style={{ fontSize: 20 }}>{props.warm ? props.warm.titre : 'Échauffement'}</h3>
        <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
          {items.map(function (it, i) {
            var on = !!done[i];
            return (
              <label key={i} className={'cad-check' + (on ? ' on' : '')}>
                <input type="checkbox" checked={on} onChange={function () { var n = Object.assign({}, done); n[i] = !on; setDone(n); }}/>
                <span>{it}.</span>
              </label>
            );
          })}
        </div>
        <p className="cad-p" style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '12px 0 0' }}>Règles communes : {props.common}</p>
        <div className="cad-wiz-nav">
          <span></span>
          <button type="button" className="thw-btn-primary" onClick={props.onNext}>{all ? 'C’est parti →' : 'Passer à la 1re épreuve →'}</button>
        </div>
      </div>
    );
  }

  function TestStep(props) {
    var t = props.t, d = props.draft || emptyDraft(props.t), r = props.result, sc = props.score, cat = props.cat, camp = props.camp;
    var proto = cat.protocols[t.slug];
    var sp = React.useState(false); var showProto = sp[0], setShowProto = sp[1];
    var sk = React.useState(false); var skipping = sk[0], setSkipping = sk[1];
    var sr = React.useState(''); var skipReason = sr[0], setSkipReason = sr[1];
    var n = partCountOf(t);
    var validated = r && r.status === 'validated';
    var skipped = r && r.status === 'skipped';
    var agg = aggDraft(t, d);
    var derived = agg != null ? F().derivedData(t, agg, camp.body_weight_kg) : [];
    var prev = previewScore(cat, t, d, camp, 'general');
    var prevA = previewScore(cat, t, d, camp, 'age');
    var pColor = prev ? levelColor(cat.palette, prev.level) : 'var(--text-dim)';
    var pColorA = prevA ? levelColor(cat.palette, prevA.level) : 'var(--text-dim)';
    var rec = recupSec(t);
    var hyroxKg = null;
    if (t.slug === 'hyrox_circuit' && cat.hyroxThrusterKg) {
      var hr = cat.hyroxThrusterKg[camp.scale_sex] || [];
      for (var hi = 0; hi < hr.length; hi++) { var hb = hr[hi]; if (camp.body_weight_kg >= hb.lo && (hb.hi == null || camp.body_weight_kg < hb.hi)) { hyroxKg = hb.kg; break; } }
    }
    return (
      <div className="cad-step-grid">
        <div className="cad-card cad-step-card">
          <div className="cad-ec-top">
            <div>
              <div className="cad-ec-h">Épreuve {props.idx}/{props.n}</div>
              <div className="cad-ec-name" style={{ fontSize: 20 }}>{t.name}</div>
              <div className="cad-ep-meta">
                <span>{n > 1 ? n + (t.aggregate === 'sum' ? ' passages' : ' essais') : '1 essai'}</span>
                {t.criteria ? <span className="is-hl">meilleur {critPts(t, 'best')} + total {critPts(t, 'sum')} pts</span> : null}
                {validated ? <span className="is-hl">validée</span> : skipped ? <span>passée</span> : null}
              </div>
            </div>
            <div className="cad-ec-pts"><b>{t.pts_max}</b><span>pts</span></div>
          </div>

          {hyroxKg != null ? <div className="cad-step-note"><strong>Thrusters : {hyroxKg} kg</strong> · box {camp.scale_sex === 'F' ? '40' : '60'} cm · 12 burpees box jump</div> : null}

          {proto ? (
            <div>
              <ol className="cad-steps" style={{ marginTop: 12 }}>{proto.etapes.map(function (s, i) { return <li key={i}><i>{i + 1}</i><span>{s}</span></li>; })}</ol>
              {proto.diagram ? (
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="cad-link" onClick={function () { setShowProto(!showProto); }}>{showProto ? 'Masquer le schéma' : 'Voir le schéma animé'}</button>
                  {showProto ? <CadDiagram name={proto.diagram} /> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="cad-ec-h" style={{ marginTop: 16 }}>Tes résultats{proto && proto.saisie ? ' — ' + proto.saisie : ''}</div>
          <div className="cad-tries" style={{ gridTemplateColumns: n > 1 ? 'repeat(' + Math.min(n, 3) + ', minmax(0, 1fr))' : 'minmax(0, 260px)' }}>
            {new Array(n).fill(0).map(function (_, i) {
              return (
                <label key={i} className="cad-try">
                  <span>{n > 1 ? (t.aggregate === 'sum' ? 'Passage ' : 'Essai ') + (i + 1) : t.unit === 's' ? 'Temps' : t.unit === 'kg' ? 'Charge (kg)' : t.unit === 'W' ? 'Puissance moyenne (W)' : t.unit === 'tours' ? 'Tours complets' : 'Résultat'}</span>
                  <input className="cad-input" inputMode={t.unit === 's' ? 'text' : 'decimal'} placeholder={placeholderFor(t)}
                         value={d.parts[i] || ''} aria-label={t.name + ' valeur ' + (i + 1)}
                         onChange={function (e) { var parts = d.parts.slice(); parts[i] = e.target.value; props.setDraft({ parts: parts }); }}/>
                </label>
              );
            })}
          </div>
          {t.isAmrap ? (
            <label className="cad-try" style={{ maxWidth: 260, marginTop: 8 }}>
              <span>Répétitions du tour en cours (optionnel)</span>
              <input className="cad-input" inputMode="numeric" placeholder="ex. 12" value={d.partialReps} onChange={function (e) { props.setDraft({ partialReps: e.target.value }); }} aria-label="Répétitions partielles"/>
            </label>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {t.equipmentField === 'chaussures' ? <Sel label="Chaussures" value={d.equipment || 'normales'} onChange={function (v) { props.setDraft({ equipment: v }); }} options={[['normales', 'Normales'], ['pointes', 'Pointes']]}/> : null}
            {t.equipmentField === 'ceinture' ? <Sel label="Ceinture" value={d.equipment || 'sans'} onChange={function (v) { props.setDraft({ equipment: v }); }} options={[['sans', 'Sans'], ['ceinture', 'Avec ceinture']]}/> : null}
            {t.hasTiming ? <Sel label="Chrono" value={d.timing || 'manuel'} onChange={function (v) { props.setDraft({ timing: v }); }} options={[['manuel', 'Manuel'], ['cellules', 'Cellules'], ['montre', 'Montre']]}/> : null}
            {t.hasPool ? <Sel label="Bassin" value={String(d.pool || 25)} onChange={function (v) { props.setDraft({ pool: Number(v) }); }} options={[['25', '25 m'], ['50', '50 m']]}/> : null}
            {t.hasVariant ? <Sel label="Burpee" value={d.variant || 'box'} onChange={function (v) { props.setDraft({ variant: v }); }} options={[['box', 'Box jump'], ['plate', 'To plate']]}/> : null}
          </div>

          {(t.venue === 'outdoor' || t.venue === 'toggle') ? (
            <div className="cad-cond">
              <div className="cad-ec-h" style={{ marginTop: 14 }}>Conditions{t.venue === 'outdoor' ? ' · épreuve en extérieur' : ''}</div>
              {t.venue === 'toggle' ? (
                <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
                  <button type="button" className="cad-pill" aria-pressed={effVenue(t, d) === 'indoor'} onClick={function () { props.setDraft({ venue: 'indoor' }); }}>Intérieur (home-trainer)</button>
                  <button type="button" className="cad-pill" aria-pressed={effVenue(t, d) === 'outdoor'} onClick={function () { props.setDraft({ venue: 'outdoor' }); }}>Extérieur</button>
                </div>
              ) : null}
              {effVenue(t, d) === 'outdoor' ? (
                <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                  <label className="cad-try" style={{ maxWidth: 220 }}>
                    <span>Température (°C) · obligatoire</span>
                    <input className="cad-input" inputMode="decimal" placeholder="ex. 15" value={d.tempC} onChange={function (e) { props.setDraft({ tempC: e.target.value }); }} aria-label="Température en °C"/>
                  </label>
                  <div>
                    <div className="cad-ec-h" style={{ marginBottom: 6 }}>Le temps (optionnel)</div>
                    <div className="cad-chips">
                      {WEATHER.map(function (w) { return <button key={w} type="button" className={'cad-chip' + (d.weather === w ? ' on' : '')} onClick={function () { props.setDraft({ weather: d.weather === w ? '' : w }); }}>{w}</button>; })}
                    </div>
                  </div>
                  <p className="cad-p" style={{ fontSize: 11.5, margin: 0 }}>Garde une trace des conditions : un score plus bas par forte chaleur ou grand froid n’est pas forcément une régression.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {derived.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontFamily: 'var(--font-body)', fontSize: 12, marginTop: 10 }}>
              {derived.map(function (dd, i) { return <span key={i} style={{ color: 'var(--text-mid)' }}>{dd.label} : <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{dd.value}</strong></span>; })}
            </div>
          ) : null}

          {skipping ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
              <input className="cad-input" placeholder="Pourquoi non passée ? (blessure, matériel…)" value={skipReason} onChange={function (e) { setSkipReason(e.target.value); }} aria-label="Motif"/>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="thw-btn-ghost" onClick={function () { props.onSkip(skipReason); setSkipping(false); }}>Confirmer « non passée »</button>
                <button type="button" className="thw-btn-ghost" onClick={function () { setSkipping(false); }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div className="cad-wiz-nav">
              <button type="button" className="thw-btn-ghost" onClick={props.onPrev}>← Précédent</button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {validated || skipped ? <button type="button" className="cad-link" onClick={props.onClear}>Effacer</button> : <button type="button" className="cad-link" onClick={function () { setSkipping(true); }}>Passer cette épreuve</button>}
                {validated || skipped ? <button type="button" className="thw-btn-ghost" onClick={props.onNext}>Suivante →</button> : null}
                <button type="button" className="thw-btn-primary" onClick={props.onValidate}>{validated ? 'Mettre à jour' : 'Valider et continuer →'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="cad-step-side">
          <div className="cad-card cad-preview">
            <div className="cad-ec-h">Aperçu des points</div>
            {prev ? (
              <div>
                <div className="cad-prev2">
                  <div>
                    <div className="cad-prev2-t">Général</div>
                    <div className="cad-preview-n" style={{ color: pColor }}>{(Math.round(prev.points * 10) / 10).toFixed(1).replace('.', ',')}<small> / {t.pts_max}</small></div>
                    <div className="cad-preview-l"><span style={{ background: pColor }}></span>{prev.level} · {Math.round(prev.pct * 100)} %</div>
                  </div>
                  <div>
                    <div className="cad-prev2-t">Ajusté à l’âge</div>
                    <div className="cad-preview-n" style={{ color: pColorA, fontSize: 32 }}>{(Math.round(prevA.points * 10) / 10).toFixed(1).replace('.', ',')}<small> / {t.pts_max}</small></div>
                    <div className="cad-preview-l"><span style={{ background: pColorA }}></span>{prevA.level} · {Math.round(prevA.pct * 100)} %</div>
                  </div>
                </div>
                <p className="cad-p" style={{ fontSize: 12, margin: '10px 0 0' }}>Calcul indicatif. Le score officiel est recalculé à la validation.</p>
              </div>
            ) : (
              <p className="cad-p" style={{ margin: 0 }}>Saisis ton résultat : les points et le palier s’affichent ici en direct, dans les deux notations.</p>
            )}
            {validated && sc ? <p className="cad-p" style={{ margin: '10px 0 0', fontSize: 12.5 }}>Enregistré : <strong>{(Math.round(sc.points * 10) / 10).toString().replace('.', ',')} pts</strong> (général){props.scoreA ? <span> · <strong>{(Math.round(props.scoreA.points * 10) / 10).toString().replace('.', ',')} pts</strong> (âge)</span> : null}</p> : null}
          </div>

          {(function () {
            var pbG = personalBareme(cat, t, camp, 'general');
            var pbA = personalBareme(cat, t, camp, 'age');
            var best = critPts(t, 'best'), sum = critPts(t, 'sum');
            return (
              <div className="cad-card">
                <div className="cad-ec-h">Ton barème</div>
                <p className="cad-p" style={{ fontSize: 11.5, margin: '2px 0 10px' }}>{camp.scale_sex === 'M' ? 'Homme' : 'Femme'} · {camp.age_at_start} ans · {Math.round(camp.body_weight_kg)} kg{t.kind === 'ratio' ? ' · au poids de corps' : ''}.</p>
                <div className="cad-bar2">
                  <div><span>Réf · général</span><b>{F().formatValue(t, pbG.ref)}</b></div>
                  <div><span>Max · général</span><b style={{ color: 'var(--brand)' }}>{F().formatValue(t, pbG.max)}</b></div>
                  <div><span>Réf · à l’âge</span><b>{F().formatValue(t, pbA.ref)}</b></div>
                  <div><span>Max · à l’âge</span><b style={{ color: 'var(--brand-alt)' }}>{F().formatValue(t, pbA.max)}</b></div>
                </div>
                {t.criteria && (best || sum) ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="cad-ec-h" style={{ marginBottom: 6 }}>Répartition des {t.pts_max} points</div>
                    <div className="cad-split">
                      <i style={{ flex: best, background: 'var(--brand)' }}></i>
                      <i style={{ flex: sum, background: 'var(--brand-alt)' }}></i>
                    </div>
                    <div className="cad-split-lg">
                      <span><em style={{ background: 'var(--brand)' }}></em>Meilleur essai · {best} pts</span>
                      <span><em style={{ background: 'var(--brand-alt)' }}></em>Total des {partCountOf(t)} · {sum} pts</span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {rec ? <div className="cad-card"><RecupTimer key={t.slug} sec={rec} /><p className="cad-p" style={{ fontSize: 12, margin: '8px 0 0' }}>Entre chaque essai. {rec >= 180 ? 'Récupération complète : ne raccourcis pas.' : ''}</p></div> : null}
        </div>
      </div>
    );
  }

  function placeholderFor(t) {
    switch (t.unit) { case 's': return 'm:ss ou s'; case 'm': return 'mètres'; case 'kg': return 'kg'; case 'W': return 'watts'; case 'tours': return 'nombre de tours'; default: return ''; }
  }

  // ════════════════ RÉSULTATS ════════════════
  function CadResults(props) {
    var cat = props.catalog, rep = props.report, camp = rep.campaign;
    var score = (rep.scores && rep.scores[props.mode]) || null;
    var rawBySlug = {}; (rep.results || []).forEach(function (r) { rawBySlug[r.test_slug] = r.raw_value; });
    var pv = React.useState(null); var prevRep = pv[0], setPrevRep = pv[1];
    var prevCamp = (props.campaigns || []).filter(function (c) { return c.status === 'completed' && c.id !== camp.id && String(c.completed_on || c.started_on) < String(camp.completed_on || camp.started_on || '9999'); })
      .sort(function (a, b) { return String(b.completed_on || b.started_on).localeCompare(String(a.completed_on || a.started_on)); })[0];
    React.useEffect(function () {
      if (!prevCamp) return;
      api('/api/cadences/report?campaignId=' + encodeURIComponent(prevCamp.id)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) setPrevRep(j); }).catch(function () {});
    }, [prevCamp && prevCamp.id]);

    if (!score) {
      return <div><h1 className="t-h1">Résultats CADENCES</h1><p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-mid)' }}>Aucun score figé pour cette campagne.</p><button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button></div>;
    }
    // Double notation : on affiche toujours les deux (général + ajusté à l'âge).
    var sG = (rep.scores && rep.scores.general) || score;
    var sA = (rep.scores && rep.scores.age) || score;
    var colG = levelColor(cat.palette, sG.globalLevel), colA = levelColor(cat.palette, sA.globalLevel);
    var prevG = prevRep && prevRep.scores ? prevRep.scores.general : null;
    var prevA = prevRep && prevRep.scores ? prevRep.scores.age : null;
    var gColor = colG;
    var descG = (window.CadLevelDesc || {})[sG.globalLevel] || '';
    var LS = window.CadLevelScale;
    var tests = cat.tests.filter(function (t) { return sG.byTest && sG.byTest[t.slug]; });
    var sorted = tests.slice().sort(function (a, b) { return sG.byTest[b.slug].pct - sG.byTest[a.slug].pct; });
    var doneOn = camp.completed_on || camp.started_on;
    var next1 = dateAt(String(doneOn).slice(0, 10), 365), next6 = dateAt(String(doneOn).slice(0, 10), 182);
    function delta(v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(Math.round(v)); }
    function deltaCls2(v) { return v > 0 ? 'cad-up' : v < 0 ? 'cad-dn' : 'cad-eq'; }
    // Résumé des conditions extérieures du test (si renseignées).
    var outdoorRes = (rep.results || []).filter(function (r) { return r.venue === 'outdoor' && r.temperature_c != null; });
    var condSummary = null;
    if (outdoorRes.length) {
      var temps = outdoorRes.map(function (r) { return Number(r.temperature_c); });
      var tmin = Math.min.apply(null, temps), tmax = Math.max.apply(null, temps);
      var ws = []; outdoorRes.forEach(function (r) { if (r.weather && ws.indexOf(r.weather) === -1) ws.push(r.weather); });
      condSummary = { range: tmin === tmax ? (tmin + ' °C') : (tmin + '–' + tmax + ' °C'), weathers: ws };
    }

    function RowHead() {
      return <div className="cad-res-row2 is-head"><span></span><span>Général</span><span>Ajusté à l’âge</span></div>;
    }
    function Row(t) {
      var g = sG.byTest[t.slug] || {}, a = sA.byTest[t.slug] || {};
      var cg = levelColor(cat.palette, g.level), ca = levelColor(cat.palette, a.level); var raw = rawBySlug[t.slug];
      return (
        <div key={t.slug} className="cad-res-row2">
          <div className="cad-res-n"><b>{t.name.replace(/\s*\(.*\)$/, '')}</b><span>{raw != null ? F().formatValue(t, raw) : ''}</span></div>
          <div className="cad-res-cell"><b style={{ color: cg }}>{Math.round(g.points)}</b><span>/ {t.pts_max} · {g.level}</span></div>
          <div className="cad-res-cell"><b style={{ color: ca }}>{Math.round(a.points)}</b><span>/ {t.pts_max} · {a.level}</span></div>
        </div>
      );
    }
    return (
      <div className="cad-run">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="cad-act-eye">Tes résultats</div>
            <h1 className="cad-act-t" style={{ fontSize: 30 }}>CADENCES · {frDate(doneOn)}</h1>
          </div>
          <button type="button" className="cad-link" onClick={props.onBack}>← Accueil</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <span className="cad-p" style={{ margin: 0 }}>Deux notations : <strong>Général</strong> (référence 21–35 ans) <strong>et Ajusté à l’âge</strong> (tranche {camp.age_band}). {camp.scale_sex === 'M' ? 'Homme' : 'Femme'} · {camp.age_at_start} ans · {Math.round(camp.body_weight_kg)} kg.</span>
        </div>

        <section className="cad-card cad-res-hero" style={{ borderTopColor: gColor }}>
          <div className="cad-res-donuts">
            <div className="cad-res-donut">
              <CadScoreDonut total={sG.total} totalMax={cat.totalPoints} level={sG.globalLevel} color={colG} size={158}/>
              <div className="cad-res-dlab">Général{prevG ? <em className={deltaCls2(sG.total - prevG.total)}> {delta(sG.total - prevG.total)}</em> : null}</div>
            </div>
            <div className="cad-res-donut">
              <CadScoreDonut total={sA.total} totalMax={cat.totalPoints} level={sA.globalLevel} color={colA} size={158}/>
              <div className="cad-res-dlab">Ajusté à l’âge{prevA ? <em className={deltaCls2(sA.total - prevA.total)}> {delta(sA.total - prevA.total)}</em> : null}</div>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="cad-ec-h">Ton niveau</div>
            <div className="cad-res-lvl2">
              <span style={{ color: colG }}>{sG.globalLevel}</span>
              <small>général</small>
              <span style={{ color: colA }}>{sA.globalLevel}</span>
              <small>à l’âge</small>
            </div>
            <p className="cad-p" style={{ fontSize: 14 }}>{descG}</p>
            {prevG ? <div className="cad-res-delta"><b>{delta(sG.total - prevG.total)} pts</b><span>en général vs ton test du {frDate(prevCamp.completed_on || prevCamp.started_on)} ({Math.round(prevG.total)})</span></div> : null}
            {LS ? <LS cat={cat} you={sG.total} compact /> : null}
          </div>
        </section>

        {condSummary ? (
          <section className="cad-card" style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="cad-ec-h" style={{ margin: 0 }}>Conditions extérieures</div>
            <span className="cad-p" style={{ margin: 0 }}>🌡️ {condSummary.range}{condSummary.weathers.length ? ' · ' + condSummary.weathers.join(', ') : ''}</span>
          </section>
        ) : null}

        <div className="cad-grid2">
          <div className="cad-card">
            <h3 className="cad-h3">Tes points forts</h3>
            <RowHead/>
            {sorted.slice(0, 3).map(Row)}
          </div>
          <div className="cad-card">
            <h3 className="cad-h3">À travailler en priorité</h3>
            <RowHead/>
            {sorted.slice(-3).reverse().map(Row)}
          </div>
        </div>

        <div className="cad-grid2">
          <section className="cad-card" style={{ display: 'grid', placeItems: 'center' }}>
            <h3 className="cad-h3" style={{ justifySelf: 'start' }}>Profil des 7 qualités</h3>
            <CadRadar items={qualityItemsFrom(cat, sG)} items2={qualityItemsFrom(cat, sA)} color={colG} color2={colA} size={300}/>
          </section>
          <section className="cad-card">
            <h3 className="cad-h3">Par qualité</h3>
            <div className="cad-ec-h" style={{ marginBottom: 6 }}>Général</div>
            <CadQualityRings items={qualityItemsFrom(cat, sG)}/>
            <div className="cad-ec-h" style={{ margin: '14px 0 6px' }}>Ajusté à l’âge</div>
            <CadQualityRings items={qualityItemsFrom(cat, sA)}/>
          </section>
        </div>

        <section className="cad-card" style={{ marginTop: 18 }}>
          <h3 className="cad-h3">Détail par jour</h3>
          <RowHead/>
          {cat.days.filter(function (d) { return !d.rest; }).map(function (d) {
            var ts = tests.filter(function (t) { return t.day === d.day; }).sort(function (a, b) { return a.order_in_day - b.order_in_day; });
            if (!ts.length) return null;
            return (
              <div key={d.day} style={{ marginTop: 12 }}>
                <div className="cad-bday"><b>J{d.day}</b><span>{d.label}</span></div>
                {ts.map(Row)}
              </div>
            );
          })}
        </section>

        <section className="cad-card cad-next">
          <div>
            <div className="cad-ec-h">Ton prochain test</div>
            <h3 className="cad-h3" style={{ fontSize: 19 }}>Le {frDate(isoOf(next1))}</h3>
            <p className="cad-p" style={{ margin: 0 }}>Même période, même protocole : c’est ce qui rend la comparaison juste. Envie d’un suivi plus serré ? Refais-le dans 6 mois, le {frDate(isoOf(next6))}.</p>
          </div>
        </section>

        <section className="cad-card" style={{ marginTop: 18, borderLeft: '4px solid #f59e0b' }}>
          <h3 className="cad-h3">Lire ce score avec prudence</h3>
          <p className="cad-p" style={{ marginBottom: 0 }}>Un score plus bas qu’une fois précédente ne veut pas forcément dire que tu as régressé. Pour comparer juste : <strong>même période de l’année, en bonne forme, ni blessé ni malade, et une température proche</strong>. Retrouve tous tes tests et leurs conditions dans <strong>Mon historique</strong>.</p>
        </section>
      </div>
    );
  }

  window.CadencesPage = CadencesPage;
  window.__cadHelpers = { api: api, levelColor: levelColor, frDate: frDate };
})();
