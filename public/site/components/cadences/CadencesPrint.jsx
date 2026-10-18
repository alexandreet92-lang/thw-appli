/* ════════════════════════════════════════════════════════════════
   Decaform — bilan imprimable (2 pages A4, noir et blanc, sans bulles).
   Invisible à l'écran ; à l'impression il remplace le reste de la page de résultats.
   Publie window.CadPrintReport. Aucune librairie : tableaux, barres CSS, SVG brut.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var DAY = 86400000;
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  function pc(p) { return Math.round((p || 0) * 100); }
  function signed(n) { var r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function nm(t) { return t.name.replace(/\s*\(.*\)$/, ''); }
  function clean(s) { return window.CadClean ? window.CadClean(s) : String(s || ''); }
  function fdate(x, o) { try { return new Date(x).toLocaleDateString(window.CadLocale ? window.CadLocale() : 'fr-FR', o || { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }

  function Style() {
    return (
      <style>{`
        .cad-printdoc { display: none; }
        @media print {
          @page { size: A4; margin: 0; }
          .cad-run > *:not(.cad-printdoc) { display: none !important; }
          .cad-night-band { background: #fff !important; }
          .cad-printdoc { display: block !important; }
          .cad-wrap { padding: 0 !important; max-width: none !important; }
          html, body { background: #fff !important; }
        }
        .cad-pd { font-family: Inter, Arial, sans-serif; color: #111; font-size: 11.5px; line-height: 1.45; }
        .cad-pd * { box-sizing: border-box; }
        .cad-pd .pg { width: 210mm; height: 296mm; padding: 13mm 14mm 10mm; background: #fff; display: flex; flex-direction: column; page-break-after: always; break-after: page; overflow: hidden; }
        .cad-pd .pg:last-child { page-break-after: auto; break-after: auto; }
        .cad-pd .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 10px; }
        .cad-pd .logo { font: 700 22px Georgia, serif; } .cad-pd .logo i { color: #555; font-style: normal; }
        .cad-pd .logo span { font: 600 11px Inter, Arial, sans-serif; letter-spacing: .14em; color: #555; margin-left: 4px; }
        .cad-pd .meta { text-align: right; font-size: 10.5px; color: #444; }
        .cad-pd h1 { font: 600 26px Georgia, serif; margin: 16px 0 2px; color: #111; letter-spacing: 0; }
        .cad-pd .sub { color: #444; font-size: 11px; }
        .cad-pd h2 { font: 700 10px ui-monospace, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; border-bottom: 1px solid #111; padding-bottom: 4px; margin: 18px 0 8px; color: #111; }
        .cad-pd .hero { display: grid; grid-template-columns: 150px 1fr 1fr; gap: 20px; align-items: center; margin-top: 12px; padding: 12px 0; border-bottom: 1px solid #bbb; }
        .cad-pd .big { font: 600 54px/1 Georgia, serif; } .cad-pd .big small { font: 500 14px Inter, Arial, sans-serif; color: #555; }
        .cad-pd .lvl { display: inline-block; border: 1.5px solid #111; padding: 2px 10px; font-weight: 700; letter-spacing: .06em; font-size: 11px; margin-top: 6px; text-transform: uppercase; }
        .cad-pd .scale { display: flex; height: 10px; border: 1px solid #111; margin-top: 8px; } .cad-pd .scale i { flex: 1; border-right: 1px solid #111; } .cad-pd .scale i:last-child { border: 0; }
        .cad-pd .scale i.on { background: #111; } .cad-pd .scale i.cur { background: repeating-linear-gradient(45deg, #111 0 2px, #fff 2px 4px); }
        .cad-pd .scl { display: flex; font-size: 8px; color: #444; margin-top: 2px; } .cad-pd .scl span { flex: 1; }
        .cad-pd table { border-collapse: collapse; width: 100%; }
        .cad-pd th { font: 700 8.5px ui-monospace, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; text-align: left; border-bottom: 1.5px solid #111; padding: 4px 6px 4px 0; color: #333; }
        .cad-pd td { padding: 5px 6px 5px 0; border-bottom: .5px solid #ccc; vertical-align: middle; }
        .cad-pd td.n, .cad-pd th.n { text-align: right; font-variant-numeric: tabular-nums; }
        .cad-pd .bar { position: relative; height: 9px; border: 1px solid #111; width: 100%; } .cad-pd .bar i { position: absolute; left: 0; top: 0; bottom: 0; background: #111; }
        .cad-pd .bar b { position: absolute; top: -3px; bottom: -3px; width: 1.5px; background: #111; }
        .cad-pd .bar.l i { background: repeating-linear-gradient(135deg, #777 0 2px, #fff 2px 4px); }
        .cad-pd .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; } .cad-pd .box { border: 1px solid #111; padding: 9px 11px; }
        .cad-pd .box h3 { margin: 0 0 5px; font: 700 11px Inter, Arial, sans-serif; letter-spacing: .04em; text-transform: uppercase; color: #111; } .cad-pd .box p { margin: 0 0 4px; color: #111; }
        .cad-pd .ok::before { content: "▲ "; font-size: 9px; } .cad-pd .ko::before { content: "▼ "; font-size: 9px; }
        .cad-pd .num { display: inline-block; width: 15px; height: 15px; border: 1.2px solid #111; border-radius: 50%; text-align: center; font: 700 9px/13px Inter, Arial, sans-serif; margin-right: 6px; }
        .cad-pd .foot { margin-top: auto; border-top: 1px solid #111; padding-top: 7px; font-size: 8.5px; color: #444; display: flex; justify-content: space-between; gap: 20px; }
        .cad-pd .hl { background: #eee; } .cad-pd .tag { font: 700 8px ui-monospace, Menlo, monospace; border: 1px solid #111; padding: 0 4px; margin-left: 4px; }
        .cad-pd .grp td { background: #eee; font: 700 8.5px ui-monospace, Menlo, monospace; letter-spacing: .1em; padding: 3px 6px; text-transform: uppercase; }
        .cad-pd p { margin: 0 0 4px; }
        @media screen { .cad-pd { display: none; } }
      `}</style>
    );
  }

  function CadPrintReport(props) {
    var acc = window.THWAccount && window.THWAccount.useAccount ? window.THWAccount.useAccount() : null;
    var cat = props.catalog, sG = props.scoreG, sA = props.scoreA, camp = props.campaign, results = props.results || [], prev = props.prev || null;
    var F = window.CadencesFormat || {};
    var max = cat.totalPoints || 1000, levels = cat.levels || [];
    var tests = (cat.tests || []).filter(function (t) { return sG.byTest && sG.byTest[t.slug]; });
    var raw = {}; (results || []).forEach(function (r) { raw[r.test_slug] = r.raw_value; });
    var qs = (cat.qualities || []).map(function (q) {
      var s = (sG.byQuality && sG.byQuality[q.key]) || {};
      var pq = prev && prev.score && prev.score.byQuality && prev.score.byQuality[q.key];
      return { key: q.key, label: q.label, pct: s.pct || 0, level: s.level || '', ptsMax: s.ptsMax || 0, d: pq && typeof pq.pct === 'number' ? ((s.pct || 0) - pq.pct) * 100 : null };
    }).filter(function (q) { return q.ptsMax > 0; }).sort(function (a, b) { return b.pct - a.pct; });
    var low = qs[qs.length - 1];
    var deep = window.cadDeepCompute && tests.length >= 20 ? window.cadDeepCompute(cat, sG, sA, camp, prev, results) : null;
    var interp = window.cadInterpret ? window.cadInterpret(cat, sG, sA, camp, prev) : null;
    var ACT = (window.CAD_INTERPRET_TEXTS && window.CAD_INTERPRET_TEXTS.ACT) || {};

    var name = acc && acc.firstName ? acc.firstName : '';
    var done = camp.completed_on || camp.started_on, started = camp.started_on || done;
    var total = Math.round(sG.total), pctTot = sG.total / max;
    var curIdx = 0; levels.forEach(function (l, i) { if (pctTot >= l.min_pct) curIdx = i; });
    var scaleLv = levels.filter(function (l) { return l.min_pct < 1.1; });
    var next = interp && interp.next;

    var outd = results.filter(function (r) { return r.venue === 'outdoor' && r.temperature_c != null; });
    var cond = '';
    if (outd.length) {
      var temps = outd.map(function (r) { return Number(r.temperature_c); }), tmin = Math.round(Math.min.apply(null, temps)), tmax = Math.round(Math.max.apply(null, temps));
      var ws = []; outd.forEach(function (r) { var w = clean(r.weather); if (w && ws.indexOf(w) === -1) ws.push(w); });
      cond = ' · ' + tr('conditions') + ' : ' + tr('extérieur') + ', ' + (tmin === tmax ? tmin : tmin + '–' + tmax) + ' °C' + (ws.length ? ', ' + ws.map(function (w) { return tr(w); }).join(', ') : '');
    }
    var rdates = results.map(function (r) { return r.performed_on || r.date; }).filter(Boolean).sort();
    var span = rdates.length ? Math.round((Date.parse(rdates[rdates.length - 1]) - Date.parse(rdates[0])) / DAY) + 1 : null;

    // Synthèse
    var synth = deep ? deep.verdict : (qs.length ? tr('Ta qualité la plus haute est') + ' ' + tr(qs[0].label).toLowerCase() + ' (' + pc(qs[0].pct) + ' %) ; ' + tr('la plus basse est') + ' ' + tr(low.label).toLowerCase() + ' (' + pc(low.pct) + ' %).' : '');

    // Forts / faibles
    function driverTxt(q, strong) {
      var l = interp && interp.drivers ? interp.drivers({ key: q.key }, strong) : [];
      var d = l[0]; if (!d) return '';
      var v = raw[d.t.slug] != null && F.formatThreshold ? F.formatThreshold(d.t, raw[d.t.slug], camp.body_weight_kg) : '';
      return ' — ' + tr(nm(d.t)) + (v ? ' : ' + v : '') + '.';
    }
    var strongs = qs.slice(0, 3), weaks = qs.slice(-3).reverse().filter(function (q) { return strongs.indexOf(q) === -1; });

    // 8 épreuves : 4 meilleures + 4 à travailler
    var byT = tests.map(function (t) { return { t: t, s: sG.byTest[t.slug], p: prev && prev.score && prev.score.byTest ? prev.score.byTest[t.slug] : null }; }).sort(function (a, b) { return b.s.pct - a.s.pct; });
    var shown = byT.slice(0, 4).concat(byT.slice(-4)).filter(function (x, i, a) { return a.indexOf(x) === i; });
    var rest = tests.length - shown.length;

    // Plan
    var plan = [];
    (interp && interp.plan || []).forEach(function (q, i) { if (ACT[q.key]) plan.push({ n: String(i + 1), t: ACT[q.key][0], d: ACT[q.key][1] }); });
    if (interp && interp.keep && ACT[interp.keep.key]) plan.push({ n: String(plan.length + 1), t: tr('Garder') + ' ' + tr(interp.keep.label).toLowerCase(), d: tr('Une séance d’entretien par semaine suffit à conserver ce niveau.') });
    var retest = Date.parse(done) + 182 * DAY;
    plan.push({ n: '◆', t: tr('Retest conseillé') + ' : ' + fdate(retest, { month: 'long', year: 'numeric' }), d: tr('6 mois après ce bilan, mêmes conditions.') });

    // Historique du score
    var hist = (props.history || []).map(function (e) { return { d: Date.parse(String(e.date).slice(0, 10) + 'T12:00:00Z'), v: e.score }; });
    if (!hist.length && prev && prev.score) hist = [{ d: Date.parse(prev.date), v: prev.score.total }, { d: Date.parse(done), v: sG.total }];
    hist.sort(function (a, b) { return a.d - b.d; });
    var W = 694, H = 100, PL = 30, PR = 20;
    var hv = hist.map(function (h) { return h.v; }).concat([0.6 * max]);
    var mn = Math.min.apply(null, hv), mx = Math.max.apply(null, hv), sp = Math.max(mx - mn, 60);
    var t0 = hist.length ? hist[0].d : 0, t1 = hist.length ? Math.max(hist[hist.length - 1].d, t0 + 30 * DAY) : 1;
    function X(t) { return PL + (W - PL - PR - 40) * (t - t0) / (t1 - t0) + 20; }
    function Y(v) { return 74 - 52 * (v - mn) / sp; }

    function Bar(p) { return <div className={'bar' + (p.pct < 0.7 ? ' l' : '')}><i style={{ width: Math.min(100, pc(p.pct)) + '%' }}/><b style={{ left: '60%' }}/></div>; }
    function Head(p) {
      return (
        <div className="top">
          <div className="logo">THW<i>.</i> <span>DECAFORM</span></div>
          <div className="meta">{p.right}</div>
        </div>
      );
    }
    var foot = function (n) { return <div className="foot"><span>THW Coaching · the-hybridway.com</span><span>{n === 1 ? tr('Bilan informatif : ni examen médical ni prescription.') : tr('Les estimations ne sont pas des promesses. Conditions différentes : comparaison à nuancer.')}</span><span>{tr('Page')} {n} / 2</span></div>; };

    return (
      <div className="cad-printdoc">
        <Style/>
        <div className="cad-pd">
          <div className="pg">
            <Head right={<span>{tr('Bilan de condition physique')}<br/>{tr('Réalisé du')} {fdate(started, { day: 'numeric', month: 'long' })} {tr('au')} {fdate(done)} · {tr('Édité le')} {fdate(Date.now())}</span>}/>
            <h1>{tr('Bilan Decaform')}{name ? ' — ' + name : ''}</h1>
            <div className="sub">{camp.scale_sex === 'M' ? tr('Homme') : tr('Femme')} · {camp.age_at_start} {tr('ans')} · {Math.round(camp.body_weight_kg)} kg · {tr('barème')} {camp.version || ''}{span ? ' · ' + tr('test sur') + ' ' + span + ' ' + tr('jours') : ''}{cond}</div>

            <div className="hero">
              <div><div className="big">{total}<small> / {max}</small></div><div className="lvl">{tr(sG.globalLevel)}</div></div>
              <div>
                <div style={{ fontWeight: 700 }}>{tr('Échelle des niveaux')}</div>
                <div className="scale">{scaleLv.map(function (l, i) { return <i key={l.label} className={i < curIdx ? 'on' : i === curIdx ? 'cur' : ''}/>; })}</div>
                <div className="scl">{scaleLv.map(function (l) { return <span key={l.label}>{tr(l.label).slice(0, 4)}.</span>; })}</div>
                {next ? <div style={{ marginTop: 6, color: '#333' }}>{tr('Il manque')} <b>{next.gap} {tr('points')}</b> {tr('pour le niveau')} {tr(next.label)} ({next.threshold}).</div> : null}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{tr('Évolution')}</div>
                {prev && prev.score ? <div>{sG.total - prev.score.total >= 0 ? '▲' : '▼'} <b>{signed(sG.total - prev.score.total)} pts</b> {tr('vs')} {fdate(prev.date, { day: 'numeric', month: 'long', year: 'numeric' })} ({Math.round(prev.score.total)})</div> : <div style={{ color: '#333' }}>{tr('Premier test')}</div>}
                <div style={{ color: '#333' }}>{tr('Ajusté à l’âge')} : <b>{Math.round(sA.total)}</b> ({tr(sA.globalLevel)})</div>
              </div>
            </div>

            <h2>{tr('Synthèse')}</h2>
            <p style={{ margin: 0 }}>{synth}{low ? <span> <b>{tr('Priorité')} : {tr(low.label).toLowerCase()}.</b></span> : null}</p>

            <h2>{tr('Profil')} — {qs.length} {tr('qualités')} (/100)</h2>
            <table>
              <thead><tr><th style={{ width: 105 }}>{tr('Qualité')}</th><th>{tr('Score')}</th><th className="n" style={{ width: 34 }}>{tr('Pts')}</th><th style={{ width: 70 }}>{tr('Niveau')}</th><th className="n" style={{ width: 42 }}>{tr('Évol.')}</th></tr></thead>
              <tbody>
                {qs.map(function (q) {
                  return (
                    <tr key={q.key} className={q === low ? 'hl' : ''}>
                      <td><b>{tr(q.label)}</b>{q === low ? <span className="tag">{tr('PRIORITÉ')}</span> : null}</td>
                      <td><Bar pct={q.pct}/></td>
                      <td className="n"><b>{pc(q.pct)}</b></td>
                      <td>{tr(q.level)}</td>
                      <td className="n">{q.d == null ? '—' : (q.d >= 0 ? '▲ ' : '▼ ') + signed(q.d).replace('+', '+')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 8.5, color: '#555', marginTop: 4 }}>{tr('Trait vertical = repère « Référence » (60). Barre pleine = point fort (70 et plus) · hachurée = à travailler.')}</div>

            <h2>{tr('Points forts et points faibles')}</h2>
            <div className="two">
              <div className="box"><h3>{tr('Points forts')}</h3>{strongs.map(function (q) { return <p key={q.key} className="ok"><b>{tr(q.label)} {pc(q.pct)}</b>{driverTxt(q, true)}</p>; })}</div>
              <div className="box"><h3>{tr('Points faibles')}</h3>{weaks.map(function (q) { return <p key={q.key} className="ko"><b>{tr(q.label)} {pc(q.pct)}</b>{driverTxt(q, false)}</p>; })}</div>
            </div>
            {foot(1)}
          </div>

          <div className="pg">
            <Head right={<span>{tr('Bilan Decaform')}{name ? ' — ' + name : ''} · {fdate(done, { day: 'numeric', month: 'short', year: 'numeric' })} · {total} / {max}</span>}/>
            <h2 style={{ marginTop: 14 }}>{tr('Détail des épreuves')} ({shown.length} {tr('sur')} {tests.length})</h2>
            <table>
              <thead><tr><th>{tr('Épreuve')}</th><th className="n">{tr('Résultat')}</th><th className="n">{tr('Points')}</th><th style={{ width: 110 }}>/ max</th><th className="n">{tr('Précédent')}</th></tr></thead>
              <tbody>
                {shown.map(function (x, i) {
                  var v = raw[x.t.slug] != null && F.formatThreshold ? F.formatThreshold(x.t, raw[x.t.slug], camp.body_weight_kg) : '—';
                  return (
                    <React.Fragment key={x.t.slug}>
                      {i === 0 ? <tr className="grp"><td colSpan="5">{tr('Tes meilleures épreuves')}</td></tr> : null}
                      {i === Math.min(4, shown.length) ? <tr className="grp"><td colSpan="5">{tr('Épreuves à travailler')}</td></tr> : null}
                      <tr>
                        <td>{tr(nm(x.t))}</td><td className="n">{v}</td><td className="n"><b>{Math.round(x.s.points)}</b></td>
                        <td><Bar pct={x.s.pct}/></td>
                        <td className="n">{x.p ? Math.round(x.p.points) + ' pts' : '—'}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                {rest > 0 ? <tr><td colSpan="5" style={{ color: '#555' }}>… + {rest} {tr('autres épreuves')}</td></tr> : null}
              </tbody>
            </table>

            <h2>{tr('Plan d’amélioration')}</h2>
            <div className="two">
              {[plan.filter(function (_, i) { return i % 2 === 0; }), plan.filter(function (_, i) { return i % 2 === 1; })].map(function (col, ci) {
                return <div key={ci}>{col.map(function (p) { return <p key={p.n + p.t}><span className="num">{p.n}</span><b>{tr(p.t)}</b><br/><span style={{ marginLeft: 21, color: '#333' }}>{tr(p.d)}</span></p>; })}</div>;
              })}
            </div>

            {deep ? (
              <div>
                <h2>{tr('Analyse approfondie')}</h2>
                <table>
                  <thead><tr><th>{tr('Indicateur')}</th><th className="n" style={{ width: 70 }}>{tr('Valeur')}</th><th>{tr('Lecture')}</th></tr></thead>
                  <tbody>
                    {deep.balance ? <tr><td>{tr('Équilibre force / endurance')}</td><td className="n"><b>{(Math.round(deep.balance.ratio * 100) / 100 + '').replace('.', ',')}</b></td><td>{deep.balance.gap < 10 ? tr('Équilibré.') : tr('Déséquilibré') + ' : ' + tr(deep.balance.hi.label).toLowerCase() + ' ' + tr('dépasse') + ' ' + tr(deep.balance.lo.label).toLowerCase() + ' (' + Math.round(deep.balance.gap) + ' pts).'}</td></tr> : null}
                    <tr><td>{tr('Points perdus concentrés')}</td><td className="n"><b>{Math.round(deep.top2share * 100)} %</b></td><td>{tr('Dans')} {tr(deep.lost[0].q.label).toLowerCase()}{deep.lost[1] ? ' ' + tr('et') + ' ' + tr(deep.lost[1].q.label).toLowerCase() : ''}.</td></tr>
                    <tr><td>{tr('Régularité du profil')}</td><td className="n"><b>{Math.round(deep.sd)}</b></td><td>{deep.sd < 12 ? tr('Régulier.') : deep.sd < 20 ? tr('Modérément irrégulier.') : tr('Irrégulier : vérifie les épreuves très faibles.')}</td></tr>
                    {deep.sim ? <tr><td>{tr('Simulation')}</td><td className="n"><b>{deep.sim.total}</b></td><td>{tr(deep.sim.q.label)} {deep.sim.from} % {tr('vers')} {deep.sim.to} % (estimation).</td></tr> : null}
                    {deep.pace ? <tr><td>{tr('Rythme depuis le test précédent')}</td><td className="n"><b>{signed(deep.pace.delta)} pts</b></td><td>{deep.pace.eta && deep.next ? tr('Niveau') + ' ' + tr(deep.next.label) + ' ' + tr('estimé vers') + ' ' + fdate(deep.pace.eta, { month: 'long', year: 'numeric' }) + ' (' + tr('estimation') + ').' : tr('Estimation indisponible.')}</td></tr> : null}
                  </tbody>
                </table>
              </div>
            ) : null}

            {hist.length > 1 ? (
              <div>
                <h2>{tr('Historique du score')}</h2>
                <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block' }}>
                  <line x1={PL} x2={W - PR} y1="82" y2="82" stroke="#111"/>
                  <line x1={PL} x2={W - PR} y1={Y(0.6 * max)} y2={Y(0.6 * max)} stroke="#999" strokeDasharray="4 3"/>
                  <text x={PL + 4} y={Y(0.6 * max) - 4} fontSize="8" fill="#444">{tr('Référence')} {Math.round(0.6 * max)}</text>
                  <polyline fill="none" stroke="#111" strokeWidth="2" points={hist.map(function (h) { return X(h.d) + ',' + Y(h.v); }).join(' ')}/>
                  <g fontSize="9" textAnchor="middle">
                    {hist.map(function (h, i) {
                      var last = i === hist.length - 1;
                      return (
                        <g key={i}>
                          <circle cx={X(h.d)} cy={Y(h.v)} r={last ? 4.5 : 3.5} fill={last ? '#111' : '#fff'} stroke="#111" strokeWidth="1.8"/>
                          <text x={X(h.d)} y={Y(h.v) - 8} fontWeight={last ? 700 : 400}>{Math.round(h.v)}</text>
                          <text x={X(h.d)} y="96">{fdate(h.d, { month: 'short', year: 'numeric' })}</text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            ) : null}
            {foot(2)}
          </div>
        </div>
      </div>
    );
  }

  window.CadPrintReport = CadPrintReport;
})();
