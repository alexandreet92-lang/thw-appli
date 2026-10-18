/* ════════════════════════════════════════════════════════════════
   Decaform — « Analyse approfondie » (exclusif test Decaform, 24 épreuves).
   Lecture par règles (aucune IA) : verdict de profil, où se perdent les points,
   leviers chiffrés, cohérence entre épreuves, simulations, évolution par qualité,
   plan sur 12 semaines. Publie window.CadDeepAnalysis et window.cadDeepCompute.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var DAY = 86400000;
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  function pc(p) { return Math.round((p || 0) * 100); }
  function signed(n) { var r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function nm(t) { return t.name.replace(/\s*\(.*\)$/, ''); }
  function lc(s) { return String(s || '').toLowerCase(); }
  var GROUPS = [
    { key: 'aero', label: 'moteur aérobie', qs: ['endurance', 'vo2max', 'endurance_musculaire'] },
    { key: 'force', label: 'base de force', qs: ['force', 'puissance'] },
    { key: 'vite', label: 'vitesse et explosivité', qs: ['vitesse', 'explosivite'] },
    { key: 'coord', label: 'coordination', qs: ['coordination'] }
  ];
  var CONSEQ = {
    'aero|force': 'Tu tiens la distance, mais tu manques de force maximale pour exprimer cette endurance en vitesse et en puissance.',
    'aero|vite': 'Tu as du fond, mais peu de vivacité : les efforts courts et les accélérations te coûtent plus que les efforts longs.',
    'force|aero': 'Tu es costaud, mais ton moteur aérobie plafonne : les efforts qui durent et se répètent te limitent.',
    'force|vite': 'Tu développes de la force, mais elle ne se transforme pas encore en vitesse : il manque la conversion force vers vitesse.',
    'vite|aero': 'Tu es vif sur le court, mais tu t’épuises vite : le fond de base est ton principal frein.',
    'vite|force': 'Tu es rapide, mais ta base de force est étroite : c’est elle qui plafonnera ta vitesse et te protégera des blessures.',
    'coord|aero': 'Ton geste est précis, mais ton moteur aérobie ne suit pas.',
    'coord|force': 'Ton geste est précis, mais tu manques de force pour l’exploiter.',
    'coord|vite': 'Ton geste est précis, mais tu manques de vivacité.',
    'aero|coord': 'Ton moteur est bon, mais les épreuves techniques te font perdre des points : le gain est rapide à aller chercher.',
    'force|coord': 'Ta force est solide, mais ta précision de geste te coûte des points : le gain est rapide.',
    'vite|coord': 'Ta vitesse est bonne, mais la technique te coûte des points : le gain est rapide.'
  };

  function cadDeepCompute(cat, sG, sA, camp, prev, results) {
    var F = window.CadencesFormat || {};
    var max = cat.totalPoints || 1000, levels = cat.levels || [];
    var qs = (cat.qualities || []).map(function (q) {
      var s = (sG.byQuality && sG.byQuality[q.key]) || {};
      return { key: q.key, label: q.label, pct: s.pct || 0, level: s.level || '', points: s.points || 0, ptsMax: s.ptsMax || 0 };
    }).filter(function (q) { return q.ptsMax > 0; });
    if (!qs.length) return null;
    var tests = (cat.tests || []).filter(function (t) { return sG.byTest && sG.byTest[t.slug]; });
    var raw = {}; (results || []).forEach(function (r) { raw[r.test_slug] = r.raw_value; });
    var qOf = function (k) { return qs.filter(function (q) { return q.key === k; })[0] || null; };
    var byPct = qs.slice().sort(function (a, b) { return b.pct - a.pct; });
    var weakest = byPct[byPct.length - 1], strongest = byPct[0];
    var sortedPct = byPct.map(function (q) { return q.pct; });
    var median = sortedPct[Math.floor(sortedPct.length / 2)];

    // Groupes
    var gs = GROUPS.map(function (g) {
      var m = g.qs.map(qOf).filter(Boolean);
      if (!m.length) return null;
      return { key: g.key, label: g.label, pct: m.reduce(function (a, q) { return a + q.pct; }, 0) / m.length, members: m };
    }).filter(Boolean).sort(function (a, b) { return b.pct - a.pct; });
    var gTop = gs[0], gLow = gs[gs.length - 1];
    var gSpread = gTop && gLow ? gTop.pct - gLow.pct : 0;
    var verdict = gSpread < 0.12
      ? 'Ton profil est complet : toutes tes qualités sont proches (écart de ' + Math.round(gSpread * 100) + ' points entre la plus haute et la plus basse). Pour progresser, il faudra monter tout le profil ensemble, ce qui demande du volume global plutôt qu’un correctif ciblé.'
      : 'Ton point d’appui est ton ' + gTop.label + ' (' + pc(gTop.pct) + ' % du repère) ; ton point limitant est ta ' + (gLow.key === 'force' ? 'base de force' : gLow.label) + ' (' + pc(gLow.pct) + ' %). ' + (CONSEQ[gTop.key + '|' + gLow.key] || 'Cet écart freine ton score global : c’est là que se trouve ta marge de progression.');

    // Où se perdent les points
    var lost = qs.map(function (q) { return { q: q, lost: Math.max(0, q.ptsMax - q.points) }; });
    var totalLost = lost.reduce(function (a, x) { return a + x.lost; }, 0) || 1;
    lost.sort(function (a, b) { return b.lost - a.lost; });
    lost.forEach(function (x) { x.share = x.lost / totalLost; });
    var top2share = (lost[0] ? lost[0].share : 0) + (lost[1] ? lost[1].share : 0);

    // Leviers : épreuves où il reste le plus de points
    var levers = tests.map(function (t) {
      var s = sG.byTest[t.slug]; var l = t.pts_max - s.points;
      var gap = null;
      try {
        var lower = t.direction === 'lower_is_better';
        var toRef = s.pct < 0.6, target = toRef ? s.refAdj : s.maxAdj;
        var g = lower ? s.valueUsed - target : target - s.valueUsed;
        if (g > 0 && isFinite(g)) {
          var txt;
          if (t.kind === 'ratio') txt = t.unit === 'W' ? (Math.round(g * 100) / 100 + '').replace('.', ',') + ' W/kg' : (F.formatValue ? F.formatValue(t, g * camp.body_weight_kg) : String(g));
          else if (t.unit === 's') txt = g < 60 ? (Math.round(g * 10) / 10 + '').replace('.', ',') + ' s' : Math.floor(g / 60) + ' min ' + Math.round(g - Math.floor(g / 60) * 60) + ' s';
          else txt = F.formatValue ? F.formatValue(t, g) : String(g);
          gap = { toRef: toRef, text: txt };
        }
      } catch (e) { gap = null; }
      return { t: t, s: s, lost: l, gap: gap, now: raw[t.slug] != null && F.formatThreshold ? F.formatThreshold(t, raw[t.slug], camp.body_weight_kg) : '' };
    }).filter(function (x) { return x.lost > 0.5; }).sort(function (a, b) { return b.lost - a.lost; }).slice(0, 5);

    // Cohérence au sein d'une qualité
    var coh = [];
    qs.forEach(function (q) {
      var ds = tests.filter(function (t) { return t.weights && t.weights[q.key] >= 0.25; }).map(function (t) { return { t: t, pct: sG.byTest[t.slug].pct }; });
      if (ds.length < 2) return;
      ds.sort(function (a, b) { return b.pct - a.pct; });
      var hi = ds[0], lo = ds[ds.length - 1], d = hi.pct - lo.pct;
      if (d >= 0.3) coh.push({ q: q, hi: hi, lo: lo, d: d });
    });
    coh.sort(function (a, b) { return b.d - a.d; });

    // Régularité du profil
    var ps = tests.map(function (t) { return sG.byTest[t.slug].pct; });
    var mean = ps.reduce(function (a, b) { return a + b; }, 0) / (ps.length || 1);
    var sd = Math.sqrt(ps.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (ps.length || 1)) * 100;

    // Équilibre force / endurance
    var fo = qOf('force'), en = qOf('endurance');
    var balance = fo && en ? { ratio: Math.min(fo.pct, en.pct) / Math.max(fo.pct, en.pct || 1e-9), gap: Math.abs(fo.pct - en.pct) * 100, hi: fo.pct >= en.pct ? fo : en, lo: fo.pct >= en.pct ? en : fo } : null;

    // Niveau suivant + simulation
    var pctTot = sG.total / max, nextIdx = -1;
    for (var i = 0; i < levels.length; i++) if (levels[i].min_pct > pctTot) { nextIdx = i; break; }
    var next = nextIdx >= 0 ? { label: levels[nextIdx].label, gap: Math.max(1, Math.ceil(levels[nextIdx].min_pct * max - sG.total)) } : null;
    function levelAt(total) { var l = levels[0] && levels[0].label; levels.forEach(function (x) { if (total / max >= x.min_pct) l = x.label; }); return l; }
    var sim = null;
    if (weakest && median > weakest.pct) {
      var gain = (median - weakest.pct) * weakest.ptsMax;
      sim = { q: weakest, from: pc(weakest.pct), to: pc(median), gain: gain, total: Math.round(sG.total + gain), level: levelAt(sG.total + gain) };
    }
    var reach = null;
    if (next && weakest) {
      var need = weakest.pct + next.gap / weakest.ptsMax;
      reach = need <= 1 ? { q: weakest, from: pc(weakest.pct), to: pc(need) } : { q: weakest, multi: true };
    }

    // Évolution par qualité
    var evo = null;
    if (prev && prev.score && prev.score.byQuality) {
      evo = qs.map(function (q) {
        var p = prev.score.byQuality[q.key]; return p && typeof p.pct === 'number' ? { q: q, d: (q.pct - p.pct) * 100 } : null;
      }).filter(Boolean).sort(function (a, b) { return b.d - a.d; });
      if (!evo.length) evo = null;
    }
    var pace = null;
    if (prev && prev.score && prev.date) {
      var months = Math.max(1, Math.round((Date.parse(camp.completed_on || camp.started_on) - Date.parse(prev.date)) / (30.4 * DAY)));
      var delta = sG.total - prev.score.total;
      var eta = delta > 0 && next ? Date.now() + (next.gap / (delta / months)) * 30.4 * DAY : null;
      pace = { months: months, delta: delta, eta: eta && eta - Date.now() < 15 * 365 * DAY ? eta : null };
    }

    // Vigilance
    var warn = [];
    if (balance && balance.gap >= 25 && balance.hi.key === 'endurance') warn.push('Ton endurance dépasse nettement ta force : la charge de course s’accumule sur des tissus peu préparés. Une base de force réduit le risque de blessure de surcharge, avant d’augmenter le volume.');
    if (balance && balance.gap >= 25 && balance.hi.key === 'force') warn.push('Ta force dépasse nettement ton endurance : n’augmente pas le volume d’un coup, mais progressivement, pour laisser tendons et articulations s’adapter.');
    if (sd >= 20) warn.push('Ton profil est irrégulier d’une épreuve à l’autre : une épreuve très faible peut venir d’une technique ou d’un matériel inhabituels autant que d’une vraie lacune. Vérifie-la avant de bâtir ton plan dessus.');

    // Plan sur 12 semaines
    var ACT = (window.CAD_INTERPRET_TEXTS && window.CAD_INTERPRET_TEXTS.ACT) || {};
    var w = byPct.slice().reverse();
    var phases = [
      { t: 'Semaines 1 à 4 · Fondations', q: w[0], note: 'Charge modérée, technique propre, régularité avant intensité.' },
      { t: 'Semaines 5 à 8 · Développement', q: w[1] || w[0], note: 'Tu montes la charge sur la qualité 1 en la gardant, et tu ajoutes la qualité 2.' },
      { t: 'Semaines 9 à 12 · Consolidation', q: w[2] || w[0], note: 'Tu allèges le volume la dernière semaine pour être frais au retest.' }
    ].map(function (p) { return { t: p.t, note: p.note, label: p.q.label, act: ACT[p.q.key] || null }; });
    var keepQ = strongest && ACT[strongest.key] ? strongest : null;
    var done = Date.parse(camp.completed_on || camp.started_on);
    var retest = isFinite(done) ? done + 182 * DAY : null;

    return {
      qs: qs, byPct: byPct, gs: gs, verdict: verdict, lost: lost, top2share: top2share, levers: levers, coh: coh, sd: sd, balance: balance,
      next: next, sim: sim, reach: reach, evo: evo, pace: pace, warn: warn, phases: phases, keepQ: keepQ, retest: retest,
      ageDiff: sA ? Math.round(sA.total) - Math.round(sG.total) : 0, ageLevel: sA ? sA.globalLevel : sG.globalLevel, level: sG.globalLevel, total: Math.round(sG.total), max: max
    };
  }

  function Style() {
    return (
      <style>{`
        .cad-dp { border: 1px solid var(--border-mid); border-radius: var(--radius-md); padding: 22px; background: var(--bg-card); display: grid; gap: 26px; }
        .cad-dp h2 { font-family: var(--font-display); font-weight: 700; font-size: 26px; margin: 4px 0 0; color: var(--text); letter-spacing: -.01em; }
        .cad-dp h3 { font-family: var(--font-display); font-weight: 700; font-size: 18px; margin: 0 0 10px; color: var(--text); }
        .cad-dp p { font-family: var(--font-body); font-size: 14.5px; line-height: 1.65; color: var(--text-mid); margin: 0; }
        .cad-dp-kick { font-family: var(--font-mono); font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-dim); }
        .cad-dp-verdict { font-family: var(--font-display); font-size: 19px; line-height: 1.5; color: var(--text); border-left: 3px solid var(--text-dim); padding-left: 16px; margin: 0; max-width: 78ch; }
        .cad-dp-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 900px) { .cad-dp-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cad-dp-kpi { border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; background: var(--bg-card-2); }
        .cad-dp-kpi small { display: block; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim); }
        .cad-dp-kpi b { display: block; font-family: var(--font-display); font-size: 26px; color: var(--text); margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
        .cad-dp-kpi span { font-family: var(--font-body); font-size: 12.5px; line-height: 1.45; color: var(--text-mid); }
        .cad-dp-row { display: grid; grid-template-columns: 150px minmax(0, 1fr) 96px; gap: 12px; align-items: center; padding: 7px 0; font-family: var(--font-body); font-size: 14px; color: var(--text); }
        .cad-dp-track { height: 10px; border-radius: 6px; background: var(--bg-card-2); border: 1px solid var(--border); overflow: hidden; }
        .cad-dp-fill { height: 100%; background: var(--text-mid); width: 0; transition: width 1s cubic-bezier(.2,.8,.2,1); }
        .cad-dp-fill.is-top { background: var(--text); }
        .cad-dp-num { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-mid); font-size: 13px; }
        .cad-dp-tbl { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: 14px; }
        .cad-dp-tbl th { text-align: left; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--border-mid); }
        .cad-dp-tbl td { padding: 11px 10px; border-bottom: 1px solid var(--border); color: var(--text-mid); vertical-align: top; }
        .cad-dp-tbl td:first-child { color: var(--text); font-weight: 700; }
        .cad-dp-tbl td.n { text-align: right; font-variant-numeric: tabular-nums; color: var(--text); font-weight: 700; white-space: nowrap; }
        .cad-dp-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 800px) { .cad-dp-two { grid-template-columns: minmax(0, 1fr); } }
        .cad-dp-box { border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: var(--bg-card-2); display: grid; gap: 8px; }
        .cad-dp-box b { font-family: var(--font-display); color: var(--text); font-size: 15px; }
        .cad-dp-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 900px) { .cad-dp-three { grid-template-columns: minmax(0, 1fr); } }
        .cad-dp-ph { border: 1px solid var(--border-mid); border-radius: 12px; padding: 16px; display: grid; gap: 8px; align-content: start; }
        .cad-dp-ph small { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
        .cad-dp-ev { display: grid; grid-template-columns: 150px minmax(0, 1fr) 60px; gap: 12px; align-items: center; padding: 6px 0; font-size: 14px; color: var(--text); font-family: var(--font-body); }
        .cad-dp-ev .bar { height: 8px; border-radius: 5px; background: var(--bg-card-2); position: relative; border: 1px solid var(--border); }
        .cad-dp-ev .bar i { position: absolute; top: -1px; bottom: -1px; border-radius: 5px; background: var(--text-mid); }
        .cad-dp-ev .bar::after { content: ''; position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1px; background: var(--text-dim); }
        .cad-dp-warn { border: 1px solid var(--border-mid); border-radius: 12px; padding: 14px 16px; background: var(--bg-card-2); }
        @media (max-width: 640px) { .cad-dp-row, .cad-dp-ev { grid-template-columns: 110px minmax(0, 1fr) 70px; } }
        @media (prefers-reduced-motion: reduce) { .cad-dp-fill { transition: none; } }
        @media print { .cad-dp { break-inside: auto; } .cad-dp-box, .cad-dp-ph, .cad-dp-kpi { break-inside: avoid; } }
      `}</style>
    );
  }

  function Bars(props) {
    var s = React.useState(false); var on = s[0], setOn = s[1];
    React.useEffect(function () { var id = setTimeout(function () { setOn(true); }, 150); return function () { clearTimeout(id); }; }, []);
    return props.children(on);
  }

  function CadDeepAnalysis(props) {
    var d = React.useMemo(function () { return cadDeepCompute(props.catalog, props.scoreG, props.scoreA, props.campaign, props.prev, props.results); }, [props.catalog, props.scoreG, props.scoreA, props.campaign, props.prev, props.results]);
    if (!d) return null;
    var maxLost = d.lost[0] ? d.lost[0].lost : 1;
    function dateTxt(ms) { try { return new Date(ms).toLocaleDateString(window.CadLocale ? window.CadLocale() : 'fr-FR', { month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
    var reg = d.sd < 12 ? 'Régulier' : d.sd < 20 ? 'Modérément irrégulier' : 'Irrégulier';
    var regTxt = d.sd < 12 ? 'Tes épreuves donnent des résultats proches les unes des autres.' : d.sd < 20 ? 'Quelques épreuves sont nettement au-dessus ou en dessous de ta moyenne.' : 'Tes résultats varient beaucoup d’une épreuve à l’autre.';
    return (
      <section className="cad-dp" aria-labelledby="cad-dp-h">
        <Style/>
        <div>
          <div className="cad-dp-kick">{tr('Exclusif Decaform')}</div>
          <h2 id="cad-dp-h">{tr('Analyse approfondie')}</h2>
          <p style={{ marginTop: 6 }}>{tr('Decaform croise tes 24 épreuves entre elles pour repérer ce qu’un test isolé ne montre pas : où tu perds tes points, pourquoi, et quoi faire en premier.')}</p>
        </div>

        <div>
          <h3>{tr('Ton profil en une lecture')}</h3>
          <p className="cad-dp-verdict">{d.verdict}</p>
        </div>

        <div className="cad-dp-kpis">
          {d.balance ? (
            <div className="cad-dp-kpi"><small>{tr('Équilibre force / endurance')}</small><b>{(Math.round(d.balance.ratio * 100) / 100 + '').replace('.', ',')}</b><span>{d.balance.gap < 10 ? 'Équilibré : les deux qualités sont proches.' : 'Ta ' + lc(tr(d.balance.hi.label)) + ' dépasse ta ' + lc(tr(d.balance.lo.label)) + ' de ' + Math.round(d.balance.gap) + ' points.'}</span></div>
          ) : null}
          <div className="cad-dp-kpi"><small>{tr('Régularité du profil')}</small><b>{tr(reg)}</b><span>{regTxt}</span></div>
          <div className="cad-dp-kpi"><small>{tr('Points perdus concentrés')}</small><b>{Math.round(d.top2share * 100)} %</b><span>{'Dans ' + tr(d.lost[0].q.label) + (d.lost[1] ? ' et ' + tr(d.lost[1].q.label) : '') + '.'}</span></div>
          <div className="cad-dp-kpi"><small>{tr('Général / ajusté à l’âge')}</small><b>{d.ageDiff === 0 ? '±0' : (d.ageDiff > 0 ? '+' : '−') + Math.abs(d.ageDiff)}</b><span>{d.ageDiff > 0 ? 'Ta notation à l’âge est plus favorable : ton âge est pris en compte dans le barème.' : d.ageDiff < 0 ? 'Ta notation à l’âge est plus sévère que la notation générale.' : 'Les deux notations donnent le même score.'}</span></div>
        </div>

        <div>
          <h3>{tr('Où tu perds tes points')}</h3>
          <p style={{ marginBottom: 8 }}>{tr('Points manquants par qualité par rapport au maximum. La plus longue barre est ton plus gros gisement de progression.')}</p>
          <Bars>{function (on) {
            return (
              <div>
                {d.lost.map(function (x, i) {
                  return (
                    <div key={x.q.key} className="cad-dp-row">
                      <span>{tr(x.q.label)}</span>
                      <div className="cad-dp-track"><div className={'cad-dp-fill' + (i < 2 ? ' is-top' : '')} style={{ width: on ? Math.round(x.lost / maxLost * 100) + '%' : 0 }}/></div>
                      <span className="cad-dp-num">{Math.round(x.lost)} pts · {Math.round(x.share * 100)} %</span>
                    </div>
                  );
                })}
              </div>
            );
          }}</Bars>
        </div>

        {d.levers.length ? (
          <div>
            <h3>{tr('Les épreuves à attaquer en premier')}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="cad-dp-tbl">
                <thead><tr><th>{tr('Épreuve')}</th><th>{tr('Ton résultat')}</th><th>{tr('Ce qu’il manque')}</th><th style={{ textAlign: 'right' }}>{tr('Points à gagner')}</th></tr></thead>
                <tbody>
                  {d.levers.map(function (l) {
                    return (
                      <tr key={l.t.slug}>
                        <td>{tr(nm(l.t))}</td>
                        <td>{l.now || '—'}</td>
                        <td>{l.gap ? l.gap.text + (l.gap.toRef ? ' pour atteindre le repère de référence' : ' pour le maximum') : '—'}</td>
                        <td className="n">+{Math.round(l.lost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="cad-dp-two">
          {d.sim ? (
            <div className="cad-dp-box">
              <b>{tr('Simulation')}</b>
              <p>{'Si tu relevais ta ' + lc(tr(d.sim.q.label)) + ' de ' + d.sim.from + ' % à ' + d.sim.to + ' % (le niveau médian de tes qualités), ton score passerait d’environ ' + d.total + ' à ' + d.sim.total + ' sur ' + d.max + (d.sim.level && d.sim.level !== d.level ? ', soit le niveau ' + d.sim.level + '.' : '.') + ' Estimation : elle suppose que le reste ne bouge pas.'}</p>
            </div>
          ) : null}
          {d.next ? (
            <div className="cad-dp-box">
              <b>{'Atteindre le niveau ' + d.next.label}</b>
              <p>{'Il te manque ' + d.next.gap + ' points. ' + (d.reach && !d.reach.multi ? 'Cela revient à monter ta ' + lc(tr(d.reach.q.label)) + ' de ' + d.reach.from + ' % à ' + d.reach.to + ' % à elle seule.' : 'Une seule qualité ne suffira pas : il faudra progresser sur au moins deux d’entre elles.')}</p>
              {d.pace ? <p>{'Rythme depuis ton test précédent : ' + signed(d.pace.delta) + ' points en ' + d.pace.months + ' mois.' + (d.pace.eta ? ' À ce rythme, niveau ' + d.next.label + ' vers ' + dateTxt(d.pace.eta) + ' (estimation, pas une promesse).' : '')}</p> : null}
            </div>
          ) : null}
        </div>

        {d.coh.length ? (
          <div>
            <h3>{tr('Cohérence entre épreuves d’une même qualité')}</h3>
            <p style={{ marginBottom: 8 }}>{tr('Un écart important entre deux épreuves qui mesurent la même qualité indique souvent un problème de technique, de spécificité ou de matériel plutôt qu’un manque de capacité.')}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {d.coh.slice(0, 4).map(function (c) {
                return <p key={c.q.key}><strong style={{ color: 'var(--text)' }}>{tr(c.q.label)}</strong>{' : ' + tr(nm(c.hi.t)) + ' à ' + pc(c.hi.pct) + ' % des points contre ' + tr(nm(c.lo.t)) + ' à ' + pc(c.lo.pct) + ' %, soit ' + Math.round(c.d * 100) + ' points d’écart.'}</p>;
              })}
            </div>
          </div>
        ) : null}

        {d.evo ? (
          <div>
            <h3>{tr('Évolution depuis ton test précédent')}</h3>
            {d.evo.map(function (e) {
              var w = Math.min(50, Math.abs(e.d) * 2.5);
              return (
                <div key={e.q.key} className="cad-dp-ev">
                  <span>{tr(e.q.label)}</span>
                  <div className="bar"><i style={e.d >= 0 ? { left: '50%', width: w + '%' } : { right: '50%', width: w + '%' }}/></div>
                  <span className="cad-dp-num">{signed(e.d)}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div>
          <h3>{tr('Plan sur 12 semaines')}</h3>
          <div className="cad-dp-three">
            {d.phases.map(function (p, i) {
              return (
                <div key={i} className="cad-dp-ph">
                  <small>{tr(p.t)}</small>
                  <b style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', fontSize: 16 }}>{tr(p.label)}{p.act ? ' : ' + tr(p.act[0]) : ''}</b>
                  {p.act ? <p>{tr(p.act[1])}</p> : null}
                  <p style={{ fontSize: 13 }}>{tr(p.note)}</p>
                </div>
              );
            })}
          </div>
          {d.keepQ ? <p style={{ marginTop: 12 }}>{'À entretenir pendant ce temps : ' + lc(tr(d.keepQ.label)) + ' (ton point fort), avec une séance d’entretien par semaine.'}</p> : null}
          {d.retest ? <p style={{ marginTop: 8 }}>{'Retest conseillé : ' + dateTxt(d.retest) + ', dans les mêmes conditions (même période, même matériel, même forme).'}</p> : null}
        </div>

        {d.warn.length ? (
          <div className="cad-dp-warn">
            <b style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{tr('Points de vigilance')}</b>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>{d.warn.map(function (w, i) { return <p key={i}>{w}</p>; })}</div>
          </div>
        ) : null}

        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{tr('Lecture générale par règles : elle ne remplace ni un coach ni un avis médical.')}</p>
      </section>
    );
  }

  window.cadDeepCompute = cadDeepCompute;
  window.CadDeepAnalysis = CadDeepAnalysis;
})();
