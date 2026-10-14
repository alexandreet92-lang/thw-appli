/* ════════════════════════════════════════════════════════════════
   Decaform (site) — « Ton résultat, expliqué » : l'interprétation du score final.
   100 % calculée à partir des données du test (aucune IA, aucun appel réseau) :
   synthèse, profil et équilibre, points forts et points faibles chiffrés, où gagner
   des points, preuve en chiffres. Tous les textes sont des gabarits (TPL) traduits
   par le dictionnaire (clé = gabarit français avec ses {variables}).
   Publie window.CadInterpretation (composant) et window.cadInterpret (calcul pur).
   ════════════════════════════════════════════════════════════════ */
(function () {
  // ── Gabarits (français = source de la traduction) ───────────────────────────
  var TPL = {
    kicker: 'Ce que ça veut dire',
    title: 'Ton résultat, expliqué',
    summary: 'Ton score est de {total} sur {max}, soit {pct} % du total possible : niveau {level}.',
    nextLevel: 'Il te manque {gap} points pour atteindre le niveau {next} ({threshold} points).',
    topLevel: 'Tu es au niveau le plus élevé de l’échelle.',
    ageDiff: 'Ajusté à ton âge ({band}), ton score est de {total} (niveau {level}), soit {diff} points d’écart avec le barème général.',
    evolution: 'Depuis ton test du {date}, ton score général a évolué de {delta} points.',
    evolutionQ: 'Plus forte progression : {up} · Plus fort recul : {down}.',
    evolutionOnlyUp: 'Plus forte progression : {up}.',
    evolutionCaution: 'Un recul n’est pas forcément une régression : compare à conditions similaires (même période, même forme, température proche).',
    profile: 'Ton profil',
    balance: 'Ton profil est {tone} : ta qualité la plus haute est {top} ({topPct} % du repère, niveau {topLevel}) et la plus basse {low} ({lowPct} %), soit {spread} points d’écart.',
    toneBalanced: 'équilibré',
    toneContrasted: 'contrasté',
    toneVeryContrasted: 'très contrasté',
    barsHint: 'Le trait fin marque le repère de référence (60 %), le trait plein le maximum (100 %).',
    badgeStrong: 'Point fort',
    badgeWeak: 'À travailler',
    strongTitle: 'Tes points forts',
    weakTitle: 'Tes points faibles',
    qualityLine: '{pct} % du repère de référence · niveau {level}',
    drivenBy: 'Portée par : {list}',
    heldBy: 'Tirée vers le bas par : {list}',
    driver: '{name} ({points} / {max} pts)',
    noStrong: 'Aucune qualité n’atteint encore le repère de référence : c’est normal sur un premier test, et c’est ce qui rend la progression mesurable.',
    gainTitle: 'Où gagner des points le plus facilement',
    gainLine: '{points} / {max} pts',
    gapRef: 'il te manque {gap} pour atteindre la référence',
    gapMax: 'référence dépassée : il te manque {gap} pour atteindre le maximum',
    stationsTitle: 'Ton circuit, station par station',
    stationsIntro: 'Temps total : {total}. Chaque station est comparée à sa part habituelle du temps chez un athlète de niveau Référence : un écart positif signale une station où tu perds plus de temps que prévu.',
    stationsSlow: 'Station qui te ralentit le plus : {name} ({share} % de ton temps, contre {exp} % attendu).',
    stationsFast: 'Station où tu es le plus à l’aise : {name} ({share} % de ton temps, contre {exp} % attendu).',
    proofTitle: 'La preuve en chiffres',
    proofTotal: 'Total = somme des points de {n} épreuves = {total} sur {max}.',
    proofHead: 'Qualité · points · part du possible · niveau',
    proofRow: '{points} / {max} pts',
    tips: 'Ces pistes sont générales : elles ne remplacent pas un plan d’entraînement personnalisé.',
  };
  // Ce que veut dire une qualité forte / faible.
  var MEAN = {
    vitesse: ['Tu te déplaces vite sur les distances courtes : un vrai atout pour les sprints et les changements de rythme.', 'Les efforts courts et rapides sont ton point faible : travaille les départs, les accélérations et la vitesse maximale.'],
    force: ['Tu développes beaucoup de force par rapport à ton poids de corps.', 'Ta force maximale est en retrait : des séries lourdes et courtes (3 à 5 répétitions) sur les grands mouvements la feront progresser.'],
    puissance: ['Tu produis beaucoup de force rapidement : sauts, sprints et mouvements explosifs te réussissent.', 'Tu manques de puissance (force × vitesse) : sauts, sprints courts et mouvements explosifs avec une charge légère.'],
    explosivite: ['Tu déclenches un effort maximal très vite, à partir de l’arrêt.', 'Le démarrage explosif est à travailler : sauts, bonds et départs arrêtés.'],
    endurance: ['Ton endurance de fond est solide : tu tiens l’effort longtemps.', 'Ton endurance de fond limite tes scores sur les épreuves longues : du volume facile et régulier la fera monter.'],
    endurance_musculaire: ['Tu répètes des efforts musculaires longtemps sans que la technique ne s’effondre.', 'Tu faiblis quand les efforts musculaires se répètent : circuits, séries longues et travail sous fatigue.'],
    vo2max: ['Ton moteur aérobie est puissant : tu soutiens des intensités élevées et tu récupères vite.', 'Ton moteur aérobie est ton point faible : des intervalles autour de ta vitesse ou de ta puissance maximale aérobie le feront progresser.'],
    coordination: ['Tes gestes sont précis et efficaces, même sous fatigue.', 'La coordination et la précision du geste sont à travailler : parcours, appuis et gestes techniques.'],
    souplesse: ['Ta souplesse t’aide à garder ton autonomie dans les gestes du quotidien.', 'Ta souplesse limite certains gestes du quotidien : étirements doux et mobilité régulière.'],
  };
  window.CAD_INTERPRET_TEXTS = { TPL: TPL, MEAN: MEAN };  // lu par le script de traduction

  // ── Traduction : gabarit → langue du site, puis {variables} ─────────────────
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  function T(key, vars) {
    var s = tr(TPL[key] || key);
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }
  function useLang() {
    var st = React.useState(0);
    React.useEffect(function () {
      if (!window.THWLang || !window.THWLang.onChange) return undefined;
      return window.THWLang.onChange(function () { st[1](function (n) { return n + 1; }); });
    }, []);
  }
  function pc(p) { return Math.round((p || 0) * 100); }
  function signed(n) { var r = Math.round(n); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }

  // ── Calcul pur ─────────────────────────────────────────────────────────────
  // Écart de temps lisible : « 4,2 s » sous la minute, sinon « 3 min 50 s ».
  function gapTime(sec) {
    if (sec < 60) return (Math.round(sec * 10) / 10 + '').replace('.', ',') + ' s';
    var m = Math.floor(sec / 60), r = Math.round(sec - m * 60);
    if (r === 60) { m += 1; r = 0; }
    return m + ' min' + (r ? ' ' + r + ' s' : '');
  }
  // gapText : ce qu'il manque, dans l'unité de l'épreuve (temps, mètres, kg, W/kg…).
  function gapText(F, t, s, bodyKg) {
    var lower = t.direction === 'lower_is_better';
    var toRef = s.pct < 0.6;
    var target = toRef ? s.refAdj : s.maxAdj;
    var gap = lower ? s.valueUsed - target : target - s.valueUsed;
    if (!(gap > 0)) return null;
    var txt;
    if (t.kind === 'ratio') txt = t.unit === 'W' ? (Math.round(gap * 100) / 100 + '').replace('.', ',') + ' W/kg' : F.formatValue(t, gap * bodyKg);
    else if (t.unit === 's') txt = gapTime(gap);
    else txt = F.formatValue(t, gap);
    return { toRef: toRef, text: txt };
  }

  // Épreuve en stations (Hyrox continu) : part de chaque station dans le temps total, comparée à la part attendue.
  function stationData(cat, results) {
    var t = (cat.tests || []).filter(function (x) { return x.partLabels && x.partShare; })[0];
    if (!t) return null;
    var r = (results || []).filter(function (x) { return x.test_slug === t.slug && x.status === 'validated'; })[0];
    var parts = r && r.raw_parts;
    if (!Array.isArray(parts) || parts.length !== t.partLabels.length) return null;
    var vals = parts.map(Number);
    if (vals.some(function (v) { return !isFinite(v) || v <= 0; })) return null;
    var tot = vals.reduce(function (a, b) { return a + b; }, 0);
    var rows = t.partLabels.map(function (lab, i) {
      var share = vals[i] / tot, exp = t.partShare[i];
      return { label: lab, sec: vals[i], share: share, exp: exp, diff: (share - exp) * 100, ratio: share / exp };
    });
    var sorted = rows.slice().sort(function (a, b) { return b.ratio - a.ratio; });
    return { t: t, rows: rows, tot: tot, slow: sorted[0], fast: sorted[sorted.length - 1] };
  }

  function interpret(cat, sG, sA, camp, prev) {
    var F = window.CadencesFormat;
    var max = cat.totalPoints || 1000;
    var levels = cat.levels || [];
    var tot = Math.round(sG.total);
    var pctTot = sG.total / max;
    var nextIdx = -1;
    for (var i = 0; i < levels.length; i++) if (levels[i].min_pct > pctTot) { nextIdx = i; break; }
    var next = nextIdx >= 0 ? { label: levels[nextIdx].label, threshold: Math.round(levels[nextIdx].min_pct * max), gap: Math.max(1, Math.ceil(levels[nextIdx].min_pct * max - sG.total)) } : null;

    var qs = (cat.qualities || []).map(function (q) {
      var s = (sG.byQuality && sG.byQuality[q.key]) || {};
      return { key: q.key, label: q.label, pct: s.pct || 0, level: s.level || '', points: s.points || 0, ptsMax: s.ptsMax || 0 };
    }).filter(function (q) { return q.ptsMax > 0; });
    var byPct = qs.slice().sort(function (a, b) { return b.pct - a.pct; });
    var top = byPct[0], low = byPct[byPct.length - 1];
    var spread = top && low ? top.pct - low.pct : 0;
    var tone = spread < 0.15 ? 'toneBalanced' : spread < 0.35 ? 'toneContrasted' : 'toneVeryContrasted';

    var tests = (cat.tests || []).filter(function (t) { return sG.byTest && sG.byTest[t.slug]; });
    function drivers(q, strong) {
      var list = tests.filter(function (t) { return (t.weights && t.weights[q.key]) >= 0.25; })
        .map(function (t) { var s = sG.byTest[t.slug]; return { t: t, s: s }; });
      list.sort(function (a, b) { return strong ? b.s.pct - a.s.pct : a.s.pct - b.s.pct; });
      return list.slice(0, 3);
    }
    // Forts : les 3 plus hautes au-dessus de 50 % du repère. Faibles : les 3 plus basses
    // qui ne sont pas déjà des forts (toujours au moins 2 pistes de progression).
    var strong = byPct.filter(function (q) { return q.pct >= 0.5; }).slice(0, 3);
    var weakPool = byPct.slice().reverse().filter(function (q) { return strong.indexOf(q) === -1 || byPct.length <= 3; });
    var weak = weakPool.slice(0, Math.min(3, Math.max(2, weakPool.length)));
    weak = weak.filter(function (q, i, a) { return a.indexOf(q) === i; });

    var gains = tests.map(function (t) {
      var s = sG.byTest[t.slug]; var lost = t.pts_max - s.points;
      return { t: t, s: s, lost: lost, gap: s.pct < 1 ? gapText(F, t, s, camp.body_weight_kg) : null };
    }).filter(function (g) { return g.lost > 0.5 && g.gap; })
      .sort(function (a, b) { return b.lost - a.lost; }).slice(0, 3);

    // Évolution depuis le test précédent
    var evo = null;
    if (prev && prev.score) {
      var ups = [], downs = [];
      qs.forEach(function (q) {
        var pq = prev.score.byQuality && prev.score.byQuality[q.key];
        if (pq && typeof pq.pct === 'number') { var d = (q.pct - pq.pct) * 100; if (d > 0.5) ups.push({ q: q, d: d }); else if (d < -0.5) downs.push({ q: q, d: d }); }
      });
      ups.sort(function (a, b) { return b.d - a.d; }); downs.sort(function (a, b) { return a.d - b.d; });
      evo = { date: prev.date, delta: sG.total - prev.score.total, up: ups[0] || null, down: downs[0] || null };
    }
    var ageDiff = sA ? Math.round(sA.total) - tot : 0;
    return { max: max, total: tot, pct: pc(pctTot), level: sG.globalLevel, next: next, qs: qs, byPct: byPct, top: top, low: low, spread: spread, tone: tone,
      strong: strong, weak: weak, drivers: drivers, gains: gains, evo: evo, ageDiff: ageDiff, ageTotal: sA ? Math.round(sA.total) : tot, ageLevel: sA ? sA.globalLevel : sG.globalLevel,
      nTests: tests.length };
  }

  // ── Affichage ──────────────────────────────────────────────────────────────
  function Style() {
    return (
      <style>{`
        .cad-int { margin-top: 12px; display: grid; gap: 18px; }
        .cad-int h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(22px,3vw,28px); letter-spacing: -0.02em; margin: 2px 0 0; color: var(--text); }
        .cad-int h3 { font-family: var(--font-display); font-weight: 700; font-size: 17px; margin: 0 0 8px; color: var(--text); }
        .cad-int p { margin: 0; font-family: var(--font-body); font-size: 14px; line-height: 1.65; color: var(--text-mid); }
        .cad-int p strong, .cad-int li strong { color: var(--text); }
        .cad-int-lead { font-size: 16px !important; color: var(--text) !important; }
        .cad-int-bars { display: grid; gap: 9px; margin-top: 12px; }
        .cad-int-bar { display: grid; grid-template-columns: minmax(120px, 190px) 1fr 54px; gap: 10px; align-items: center; font-family: var(--font-body); font-size: 13px; color: var(--text-mid); }
        .cad-int-bar b { color: var(--text); font-weight: 600; }
        .cad-int-track { position: relative; height: 10px; border-radius: 6px; background: rgba(128,140,160,.22); }
        .cad-int-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; transition: width .9s cubic-bezier(.2,.8,.2,1); }
        .cad-int-ref, .cad-int-max { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--text-dim); opacity: .7; }
        .cad-int-max { width: 3px; opacity: 1; background: var(--text); }
        .cad-int-badge { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .cad-int-badge.is-strong { background: rgba(34,197,94,.16); color: #15803d; }
        html.dark .cad-int-badge.is-strong { color: #4ade80; }
        .cad-int-badge.is-weak { background: rgba(245,158,11,.18); color: #b45309; }
        html.dark .cad-int-badge.is-weak { color: #fbbf24; }
        .cad-int-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (max-width: 760px) { .cad-int-grid { grid-template-columns: minmax(0, 1fr); } .cad-int-bar { grid-template-columns: 1fr 54px; } .cad-int-bar .cad-int-track { grid-column: 1 / -1; order: 3; } }
        .cad-int-q { border: 1px solid var(--border-mid); border-left-width: 4px; border-radius: var(--radius-md); padding: 12px 14px; display: grid; gap: 6px; background: var(--bg-card); }
        .cad-int-q h4 { margin: 0; font-family: var(--font-display); font-size: 15px; color: var(--text); }
        .cad-int-q small { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-dim); }
        .cad-int-gain { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: baseline; padding: 9px 0; border-top: 1px solid var(--border); font-family: var(--font-body); font-size: 13.5px; color: var(--text-mid); }
        .cad-int-gain:first-of-type { border-top: none; }
        .cad-int-gain b { color: var(--text); }
        .cad-int-gain span:last-child { font-family: var(--font-mono); font-size: 12.5px; color: var(--text); }
        .cad-int-gain em { grid-column: 1 / -1; font-style: normal; font-size: 12.5px; }
        .cad-int-proof { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: 13px; }
        .cad-int-proof th { text-align: left; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); font-weight: 600; padding: 4px 8px 6px 0; }
        .cad-int-proof td { padding: 6px 8px 6px 0; border-top: 1px solid var(--border); color: var(--text-mid); font-variant-numeric: tabular-nums; }
        .cad-int-proof td:first-child { color: var(--text); font-weight: 600; }
        @media (prefers-reduced-motion: reduce) { .cad-int-fill { transition: none; } }
      `}</style>
    );
  }

  function Bars(props) {
    var cat = props.cat, r = props.r, color = props.color;
    var okS = React.useState(false); var on = okS[0], setOn = okS[1];
    React.useEffect(function () { var id = setTimeout(function () { setOn(true); }, 120); return function () { clearTimeout(id); }; }, []);
    var SCALE = 1.2;   // la barre pleine = 120 % du repère
    return (
      <div className="cad-int-bars" role="list">
        {r.byPct.map(function (q) {
          var isStrong = r.strong.indexOf(q) !== -1, isWeak = r.weak.indexOf(q) !== -1 && !isStrong;
          var c = color(q.level);
          return (
            <div key={q.key} className="cad-int-bar" role="listitem">
              <span><b>{tr(q.label)}</b>{isStrong ? <span className="cad-int-badge is-strong">{T('badgeStrong')}</span> : isWeak ? <span className="cad-int-badge is-weak">{T('badgeWeak')}</span> : null}</span>
              <span className="cad-int-track" aria-hidden="true">
                <i className="cad-int-fill" style={{ width: on ? Math.min(100, q.pct / SCALE * 100) + '%' : '0%', background: c }}></i>
                <i className="cad-int-ref" style={{ left: (0.6 / SCALE * 100) + '%' }}></i>
                <i className="cad-int-max" style={{ left: (1 / SCALE * 100) + '%' }}></i>
              </span>
              <b style={{ textAlign: 'right', color: c }}>{pc(q.pct)} %</b>
            </div>
          );
        })}
      </div>
    );
  }

  function QualityCard(props) {
    var q = props.q, strong = props.strong, r = props.r, color = props.color, F = window.CadencesFormat;
    var ds = r.drivers(q, strong);
    var list = ds.map(function (d) { return T('driver', { name: tr(d.t.name.replace(/\s*\(.*\)$/, '')), points: Math.round(d.s.points), max: d.t.pts_max }); }).join(' · ');
    var mean = MEAN[q.key] ? MEAN[q.key][strong ? 0 : 1] : '';
    return (
      <div className="cad-int-q" style={{ borderLeftColor: color(q.level) }}>
        <h4>{tr(q.label)}</h4>
        <small>{T('qualityLine', { pct: pc(q.pct), level: tr(q.level) })}</small>
        {mean ? <p>{tr(mean)}</p> : null}
        {list ? <p><strong>{T(strong ? 'drivenBy' : 'heldBy', { list: list })}</strong></p> : null}
      </div>
    );
  }

  function CadInterpretation(props) {
    useLang();
    var cat = props.catalog, sG = props.scoreG, sA = props.scoreA, camp = props.campaign;
    var color = props.levelColor || function () { return 'var(--brand)'; };
    var F = window.CadencesFormat;
    if (!cat || !sG || !F) return null;
    var r = interpret(cat, sG, sA, camp, props.prev);
    var st = stationData(cat, props.results);
    var desc = (window.CadLevelDesc || {})[sG.globalLevel] || '';
    var fr = props.frDate || function (d) { return d; };
    return (
      <section className="cad-card cad-int">
        <Style/>
        <div>
          <div className="cad-ec-h">{T('kicker')}</div>
          <h2>{T('title')}</h2>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <p className="cad-int-lead"><strong>{T('summary', { total: r.total, max: r.max, pct: r.pct, level: tr(r.level) })}</strong></p>
          {desc ? <p>{desc}</p> : null}
          <p>{r.next ? T('nextLevel', { gap: r.next.gap, next: tr(r.next.label), threshold: r.next.threshold }) : T('topLevel')}</p>
          {sA && r.ageDiff !== 0 ? <p>{T('ageDiff', { band: camp.age_band, total: r.ageTotal, level: tr(r.ageLevel), diff: signed(r.ageDiff) })}</p> : null}
          {r.evo ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <p>{T('evolution', { date: fr(r.evo.date), delta: signed(r.evo.delta) })}</p>
              {r.evo.up || r.evo.down ? (
                <p>{r.evo.up && r.evo.down
                  ? T('evolutionQ', { up: tr(r.evo.up.q.label) + ' ' + signed(r.evo.up.d) + ' %', down: tr(r.evo.down.q.label) + ' ' + signed(r.evo.down.d) + ' %' })
                  : r.evo.up ? T('evolutionOnlyUp', { up: tr(r.evo.up.q.label) + ' ' + signed(r.evo.up.d) + ' %' }) : null}</p>
              ) : null}
              {r.evo.delta < 0 ? <p>{T('evolutionCaution')}</p> : null}
            </div>
          ) : null}
        </div>

        <div>
          <h3>{T('profile')}</h3>
          {r.top && r.low ? <p>{T('balance', { tone: T(r.tone), top: tr(r.top.label), topPct: pc(r.top.pct), topLevel: tr(r.top.level), low: tr(r.low.label), lowPct: pc(r.low.pct), spread: pc(r.spread) })}</p> : null}
          <Bars cat={cat} r={r} color={color}/>
          <p style={{ fontSize: '12px', marginTop: 8, color: 'var(--text-dim)' }}>{T('barsHint')}</p>
        </div>

        <div className="cad-int-grid">
          <div>
            <h3>{T('strongTitle')}</h3>
            {r.strong.length ? <div style={{ display: 'grid', gap: 10 }}>{r.strong.map(function (q) { return <QualityCard key={q.key} q={q} strong={true} r={r} color={color}/>; })}</div> : <p>{T('noStrong')}</p>}
          </div>
          <div>
            <h3>{T('weakTitle')}</h3>
            <div style={{ display: 'grid', gap: 10 }}>{r.weak.map(function (q) { return <QualityCard key={q.key} q={q} strong={false} r={r} color={color}/>; })}</div>
          </div>
        </div>

        {r.gains.length ? (
          <div>
            <h3>{T('gainTitle')}</h3>
            <div>
              {r.gains.map(function (g) {
                return (
                  <div key={g.t.slug} className="cad-int-gain">
                    <b>{tr(g.t.name.replace(/\s*\(.*\)$/, ''))}</b>
                    <span>{T('gainLine', { points: Math.round(g.s.points), max: g.t.pts_max })}</span>
                    <em>{T(g.gap.toRef ? 'gapRef' : 'gapMax', { gap: g.gap.text })}</em>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {st ? (
          <div>
            <h3>{T('stationsTitle')}</h3>
            <p style={{ marginBottom: 8 }}>{T('stationsIntro', { total: F.formatDuration(st.tot, false) })}</p>
            <p><strong>{T('stationsSlow', { name: tr(st.slow.label), share: pc(st.slow.share), exp: pc(st.slow.exp) })}</strong></p>
            {st.fast.label !== st.slow.label ? <p style={{ marginTop: 4 }}>{T('stationsFast', { name: tr(st.fast.label), share: pc(st.fast.share), exp: pc(st.fast.exp) })}</p> : null}
            <table className="cad-int-proof" style={{ marginTop: 10 }}>
              <thead><tr><th>{tr('Station')}</th><th>{tr('Temps')}</th><th>{tr('Part du total')}</th><th>{tr('Attendu')}</th><th>{tr('Écart')}</th></tr></thead>
              <tbody>
                {st.rows.map(function (row) {
                  return (
                    <tr key={row.label}>
                      <td>{tr(row.label)}</td>
                      <td>{F.formatDuration(row.sec, false)}</td>
                      <td>{pc(row.share)} %</td>
                      <td>{pc(row.exp)} %</td>
                      <td style={{ color: row.diff > 1 ? '#d97706' : row.diff < -1 ? '#16a34a' : 'var(--text-mid)' }}>{signed(row.diff)} {tr('pts')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div>
          <h3>{T('proofTitle')}</h3>
          <p style={{ marginBottom: 8 }}>{T('proofTotal', { n: r.nTests, total: r.total, max: r.max })}</p>
          <table className="cad-int-proof">
            <thead><tr><th>{tr('Qualité')}</th><th>{tr('Points')}</th><th>%</th><th>{tr('Niveau')}</th></tr></thead>
            <tbody>
              {r.byPct.map(function (q) {
                return (
                  <tr key={q.key}>
                    <td>{tr(q.label)}</td>
                    <td>{T('proofRow', { points: Math.round(q.points), max: Math.round(q.ptsMax) })}</td>
                    <td style={{ color: color(q.level) }}>{pc(q.pct)} %</td>
                    <td>{tr(q.level)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{T('tips')}</p>
      </section>
    );
  }

  window.CadInterpretation = CadInterpretation;
  window.cadInterpret = interpret;
})();
