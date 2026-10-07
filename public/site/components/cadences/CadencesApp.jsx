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
        .cad-link { background: none; border: none; padding: 0; cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; color: var(--brand); }
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
          else { setView('intro'); }
        }).catch(function () { setView('intro'); });
    }, [account, catalog, crossOrigin]);

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
                       crossOrigin={crossOrigin} appUrl={appTestUrl}
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

        {window.CadTestIntro ? <window.CadTestIntro catalog={cat} /> : null}
        <div className="cad-scrollcue" style={{ marginTop: 28 }}>↓ Et d'abord, pourquoi ce test</div>

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
            <div className="t-h2" style={{ marginBottom: 10 }}>Mes passages</div>
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
    var score = (rep.scores && rep.scores[props.mode]) || { total: 0, globalLevel: 'Sédentaire', byQuality: {}, byTest: {} };
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
      // Épreuves à critères (meilleur + total des essais) : tous les essais comptent.
      if (t.criteria && d.parts.some(function (p) { return parsePart(t, p) == null; })) {
        setErr(t.name + ' : renseigne les ' + partCountOf(t) + ' essais' + (t.unit === 'm' ? ' (0 pour un saut raté).' : '.')); return;
      }
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
                {d.rest ? null : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: done === tests.length ? levelColor(cat.palette, 'Élite') : 'var(--text-mid)' }}>{done}/{tests.length}</span>}
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

          {t.criteria ? (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-mid)' }}>
              Notation : <strong style={{ color: 'var(--text)' }}>meilleur essai</strong> ({critPts(t, 'best')} pts) + <strong style={{ color: 'var(--text)' }}>total des {n} essais</strong> ({critPts(t, 'sum')} pts) — la régularité compte.
            </div>
          ) : null}

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
