/* ════════════════════════════════════════════════════════════════
   Decaform (site) — CONTENU RICHE (statique, aucune API).
   Sections : aperçu animé, 7 qualités, protocole 12 jours complet,
   barèmes & charges, calcul du score, avertissements. Tiré de la spéc
   et de la config (source de vérité — rien d'inventé). Publie window.CadContent.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var QUALITY_DEFS = {
    vitesse: 'Se déplacer vite sur une distance courte à moyenne.',
    force: 'Charge maximale déplaçable sur un mouvement donné.',
    puissance: 'Produire beaucoup de force rapidement (force × vitesse).',
    explosivite: 'Déclencher un effort maximal en une fraction de seconde.',
    endurance: 'Tenir un effort soutenu dans la durée.',
    vo2max: 'Cylindrée aérobie : consommer de l’oxygène à haute intensité.',
    coordination: 'Enchaîner des mouvements précis et efficaces, surtout sous fatigue.',
    endurance_musculaire: 'Répéter des efforts musculaires sous charge, longtemps, sans que la technique ne s’effondre.',
    souplesse: 'Amplitude articulaire : atteindre, se baisser, s’habiller sans gêne (marqueur d’autonomie).',
  };

  // Glossaire complet des qualités physiques (définitions d'Alex).
  // principal = parmi les principales. state : 'mesuree' = notée par une épreuve ;
  // 'sollicitee' = travaillée par le protocole mais pas notée directement ;
  // 'hors' = ni notée ni travaillée. how = où elle est sollicitée.
  var QUALITY_GLOSSARY = [
    { t: 'Force maximale', d: 'Tension maximale développée par un muscle contre une résistance.', principal: true, state: 'mesuree' },
    { t: 'Vitesse maximale', d: 'Accomplir un mouvement ou un déplacement dans le temps le plus court possible.', principal: true, state: 'mesuree' },
    { t: 'Endurance fondamentale', d: 'Maintenir un effort d\'intensité faible à modérée sur une longue durée.', principal: true, state: 'mesuree' },
    { t: 'Coordination', d: 'Synchroniser système nerveux et muscles pour un mouvement fluide.', principal: true, state: 'mesuree' },
    { t: 'Souplesse', d: 'Réaliser des mouvements avec la plus grande amplitude articulaire possible.', principal: true, state: 'hors' },
    { t: 'Puissance', d: 'Exprimer une force maximale le plus vite possible (force × vitesse).', state: 'mesuree' },
    { t: 'Explosivité', d: 'Déclencher la plus grande force possible en un minimum de temps, à partir de l\'arrêt.', state: 'mesuree' },
    { t: 'Résistance', d: 'Soutenir un effort d\'intensité très élevée malgré la fatigue et l\'acide lactique.', state: 'mesuree' },
    { t: 'Endurance musculaire', d: 'Répéter ou maintenir des efforts musculaires sous-maximaux dans la durée.', state: 'mesuree', how: 'Mesurée par le circuit Conditioning et le dead hang (répétitions et maintien sous charge dans la durée).' },
    { t: 'Vitesse-endurance', d: 'Maintenir une vitesse proche du maximum le plus longtemps possible.', state: 'mesuree' },
    { t: 'Agilité', d: 'Changer rapidement, efficacement et de façon contrôlée de direction ou de trajectoire.', state: 'mesuree' },
    { t: 'VO₂max', d: 'Cylindrée aérobie : volume maximal d\'oxygène consommé à l\'effort.', state: 'mesuree' },
    { t: 'Endurance de force', d: 'Répéter ou maintenir un niveau de force élevé dans le temps.', state: 'sollicitee', how: 'Travaillée par le circuit Conditioning.' },
    { t: 'Temps de réaction', d: 'Délai entre la perception d\'un signal et le début du mouvement.', state: 'sollicitee', how: 'Travaillé par les départs de sprint et les parcours de coupelles.' },
    { t: 'Rythme', d: 'Percevoir et reproduire une cadence précise dans l\'effort.', state: 'sollicitee', how: 'Travaillé par le slalom et la cadence des pas chassés.' },
    { t: 'Équilibre', d: 'Maintenir la stabilité du corps, à l\'arrêt comme en mouvement.', state: 'sollicitee', how: 'Travaillé par les réceptions de sauts et les appuis d\'agilité.' },
    { t: 'Dissociation segmentaire', d: 'Bouger une partie du corps indépendamment des autres.', state: 'sollicitee', how: 'Travaillée par les pas chassés (Square, Move).' },
    { t: 'Précision', d: 'Contrôler exactement la trajectoire d\'un geste ou d\'un projectile.', state: 'hors' },
  ];
  // Libellé + classe du badge selon l'état d'une qualité.
  var QSTATE = { mesuree: { label: 'mesurée', cls: ' is-in' }, sollicitee: { label: 'sollicitée', cls: ' is-work' }, hors: { label: 'hors test', cls: '' } };
  // Les états « mesurée / sollicitée » du glossaire décrivent Decaform ; les autres batteries n'affichent que les définitions.
  // « 8-8 » → « 8 ans » ; « 85-100 » → « 85 ans et + » ; sinon « 21–25 ans ».
  function bandLabel(b) {
    var m = String(b).split('-');
    if (m.length === 2 && m[0] === m[1]) return m[0] + ' ans';
    if (m.length === 2 && Number(m[1]) >= 100) return m[0] + ' ans et +';
    return m.join('–') + ' ans';
  }
  // Barème « général » : calé sur 21–35 ans pour les adultes ; pour les jeunes et les seniors, c'est le barème sans correction d'âge.
  function generalLabel(c) {
    var b = (c.age && c.age.bands && c.age.bands[0]) || '';
    var lo = Number(String(b).split('-')[0]);
    return lo >= 18 && lo < 65 ? 'Général (21–35 ans)' : 'Général (sans correction)';
  }
  function isDeca(c) { return !c || !c.testKey || c.testKey === 'decaform'; }
  function qstate(q) { return QSTATE[q.state] || QSTATE.hors; }

  function levelColor(palette, level) { return (palette && palette[level]) || '#9ca3af'; }
  function levelFor(pct, levels) { var lab = levels[0].label; for (var i = 0; i < levels.length; i++) if (pct >= levels[i].min_pct) lab = levels[i].label; return lab; }
  function round1(v) { return Math.round(v * 100) / 100; }
  function fmtDur(v) { var m = Math.floor(v / 60); var s = Math.round(v - m * 60); return m + ':' + String(s).padStart(2, '0'); }
  function fmtThreshold(t, v) {
    if (!(v > 0)) return '—';
    if (t.kind === 'ratio' && t.unit === 'kg') return round1(v) + '× pdc';
    if (t.kind === 'ratio' && t.unit === 'W') return round1(v) + ' W/kg';
    if (t.unit === 's') return v >= 60 ? fmtDur(v) : round1(v) + ' s';
    if (t.unit === 'm') return round1(v) + ' m';
    if (t.unit === 'tours') return round1(v) + ' tours';
    return String(round1(v));
  }
  // Barème intégral 0→120 % depuis Réf (60 %) et Max (100 %) : linéaire (comme le doc).
  var BAR_P = [0, 20, 40, 60, 80, 100, 120];
  function baremeCols(test, sex) {
    var b = sex === 'M' ? test.male : test.female;
    return BAR_P.map(function (p) { return b.ref + (b.max - b.ref) * (p - 60) / 40; });
  }
  // Distance (m) par épreuve → allures dérivées (course, natation, slalom).
  var DIST = { sprint_30m: 30, sprint_100m: 100, run_400m: 400, run_3200m: 3200, repeat_200m_x6: 1200, swim_50m: 50, swim_200m: 200, agility_slalom: 180.3 };
  var RUN_SLUGS = ['sprint_30m', 'sprint_100m', 'run_400m', 'run_3200m', 'repeat_200m_x6'];
  function paceRows(t, cols) {
    var d = DIST[t.slug]; if (!d) return [];
    if (RUN_SLUGS.indexOf(t.slug) >= 0) {
      return [
        { sub: 'min/km', cells: cols.map(function (v) { return fmtDur(v / d * 1000); }) },
        { sub: 'km/h', cells: cols.map(function (v) { return String(round1(d / v * 3.6)); }) },
      ];
    }
    if (t.slug === 'swim_50m' || t.slug === 'swim_200m') {
      return [{ sub: '/100 m', cells: cols.map(function (v) { return fmtDur(v / d * 100); }) }];
    }
    if (t.slug === 'agility_slalom') {
      return [{ sub: 'km/h moy.', cells: cols.map(function (v) { return String(round1(d / v * 3.6)); }) }];
    }
    return [];
  }
  function BaremeMini(props) {
    var t = props.test;
    var crit = t.criteria || null;
    var nTry = t.partCount || 3;
    var P = props.compact ? [0, 60, 100, 120] : BAR_P;
    var pick = function (cols) { return props.compact ? [cols[0], cols[3], cols[5], cols[6]] : cols; };
    function critPts(agg) { var c = (crit || []).filter(function (x) { return x.aggregate === agg; })[0]; return c ? c.pts_max : 0; }
    function sexRows(sex, label) {
      var cols = pick(baremeCols(t, sex));
      var main = <tr key={sex}><td className="cad-b-rl">{crit ? label + ' · meilleur' : label}</td>{cols.map(function (v, i) { return <td key={i}>{fmtThreshold(t, v)}</td>; })}</tr>;
      var subs = paceRows(t, cols).map(function (r, j) {
        return <tr key={sex + 's' + j} className="cad-b-sub"><td className="cad-b-rl">↳ {r.sub}</td>{r.cells.map(function (c, i) { return <td key={i}>{c}</td>; })}</tr>;
      });
      // Total des essais : même barème × nombre d'essais.
      var tot = crit ? [<tr key={sex + 't'} className="cad-b-sub"><td className="cad-b-rl">↳ total des {nTry}</td>{cols.map(function (v, i) { return <td key={i}>{fmtThreshold(t, v * nTry)}</td>; })}</tr>] : [];
      return [main].concat(subs, tot);
    }
    return (
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        {crit ? <p className="cad-ec-p" style={{ margin: '0 0 8px' }}>Deux critères : <strong>meilleur essai</strong> ({critPts('best')} pts) + <strong>total des {nTry} essais</strong> ({critPts('sum')} pts), noté sur le même barème × {nTry}.</p> : null}
        <table className="cad-table cad-bareme">
          <thead><tr><th style={{ textAlign: 'left' }}></th>{P.map(function (p) { return <th key={p}>{p === 60 ? 'Réf' : p === 100 ? 'Max' : p + '%'}</th>; })}</tr></thead>
          <tbody>{sexRows('M', 'H').concat(sexRows('F', 'F'))}</tbody>
        </table>
      </div>
    );
  }
  function levelRanges(levels) {
    return levels.map(function (l, i) {
      var lo = Math.round(l.min_pct * 100);
      var next = levels[i + 1];
      var txt = next ? (lo + '–' + (Math.round(next.min_pct * 100) - 1) + ' %') : ('≥ ' + lo + ' %');
      if (i === 0 && levels[1]) txt = '< ' + Math.round(levels[1].min_pct * 100) + ' %';
      return { label: l.label, range: txt };
    });
  }

  function SectionTitle(props) {
    return (
      <div style={{ marginBottom: 'var(--space-4)' }}>
        {props.kicker ? <div className="t-label" style={{ color: 'var(--brand)', marginBottom: 6 }}>{props.kicker}</div> : null}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(22px,3.4vw,28px)', margin: 0, color: 'var(--text)' }}>{props.children}</h2>
        {props.sub ? <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', margin: '8px 0 0', maxWidth: 640, lineHeight: 1.6 }}>{props.sub}</p> : null}
      </div>
    );
  }

  // ── Vue d'ensemble ──────────────────────────────────────────────────
  var FAMILY = {
    'Sauts': 'Sauts', 'Sprints': 'Vitesse', 'Agilité': 'Agilité',
    '6.200': 'Course', '400 m': 'Course', '3200 m': 'Course',
    'Natation': 'Natation', 'Force max': 'Force', 'Haltérophilie': 'Haltérophilie',
    'Vélo': 'Vélo', 'AMRAP': 'Hybride', 'Hyrox': 'Hybride', 'Conditioning': 'Hybride',
  };
  var FAM_COLOR = { 'Sauts': '#38bdf8', 'Vitesse': '#00c8e0', 'Agilité': '#5b6fff', 'Course': '#2dd4bf', 'Natation': '#22c55e', 'Force': '#f59e0b', 'Haltérophilie': '#fb923c', 'Vélo': '#a3e635', 'Hybride': '#f472b6' };
  function familyData(catalog) {
    var m = {};
    catalog.tests.forEach(function (t) { var f = FAMILY[t.group] || t.group; m[f] = (m[f] || 0) + t.pts_max; });
    return Object.keys(m).map(function (k) { return { label: k, pts: m[k], color: FAM_COLOR[k] || '#00c8e0' }; })
      .sort(function (a, b) { return b.pts - a.pts; });
  }
  function Stat(props) {
    return (
      <div className="cad-stat">
        <div className="cad-stat-n">{props.n}</div>
        <div className="cad-stat-l">{props.l}</div>
      </div>
    );
  }
  function overview(catalog) {
    var ex = { vitesse: 0.62, force: 0.85, puissance: 0.70, explosivite: 0.58, endurance: 0.90, endurance_musculaire: 0.64, vo2max: 0.78, coordination: 0.66 };
    var items = catalog.qualities.map(function (q) { var pct = ex[q.key] != null ? ex[q.key] : 0.6; var lvl = levelFor(pct, catalog.levels); return { key: q.key, label: q.label, pct: pct, level: lvl, color: levelColor(catalog.palette, lvl) }; });
    var total = 742, glvl = levelFor(total / catalog.totalPoints, catalog.levels);
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="cad-stats">
          <Stat n={catalog.totalTests} l="épreuves" />
          <Stat n={catalog.days.length} l="jours" />
          <Stat n={catalog.totalPoints} l="points de réf." />
          <Stat n={catalog.qualities.length} l="qualités" />
        </div>
        <div className="cad-card" style={{ position: 'relative' }}>
          <span className="cad-badge-ex">Exemple</span>
          <SectionTitle sub="À la fin : un score global sur 1000 et une lecture claire de chaque qualité, en barème général ou ajusté à l'âge.">Tes résultats, en un coup d'œil</SectionTitle>
          <div className="cad-preview-grid" style={{ marginTop: 'var(--space-3)' }}>
            <CadScoreDonut total={total} totalMax={catalog.totalPoints} level={glvl} color={levelColor(catalog.palette, glvl)} size={200} />
            <CadRadar items={items} color="#00c8e0" size={310} />
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}><CadQualityRings items={items} /></div>
        </div>
        <div className="cad-card">
          <h3 className="cad-h3">Répartition des {catalog.totalPoints} points par famille</h3>
          <p className="cad-p">Le poids de chaque famille d'épreuves dans le score global.</p>
          <CadPointsByFamily data={familyData(catalog)} />
        </div>
      </div>
    );
  }

  // ── Les qualités physiques ───────────────────────────────────────────
  // Couleur fonctionnelle par qualité du score (repère visuel, constante).
  var QCOL = { vitesse: '#00c8e0', force: '#f59e0b', puissance: '#fb923c', explosivite: '#e11d48', endurance: '#22c55e', endurance_musculaire: '#84cc16', vo2max: '#2563eb', coordination: '#14b8a6', souplesse: '#a855f7' };
  function qLabel(q) { return q.label === 'VO2max' ? 'VO₂max' : q.label; }
  function hexA(hex, a) {
    var h = hex.replace('#', ''); var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  // Poids de chaque qualité dans les points (Σ pts × pondération) + épreuves clés.
  function qualityWeights(catalog) {
    return catalog.qualities.map(function (q) {
      var pts = 0, top = [];
      catalog.tests.forEach(function (t) {
        var w = (t.weights && t.weights[q.key]) || 0;
        pts += t.pts_max * w;
        if (w >= 0.3) top.push({ name: t.name.replace(/\s*\(.*\)$/, ''), w: w });
      });
      top.sort(function (a, b) { return b.w - a.w; });
      return { key: q.key, label: qLabel(q), pts: pts, top: top, color: QCOL[q.key] || '#00c8e0' };
    });
  }
  function QualityTiles(props) {
    var data = qualityWeights(props.catalog);
    var max = Math.max.apply(null, data.map(function (d) { return d.pts; }));
    var hook = window.CadUseInView; var iv = hook ? hook({ threshold: 0.2 }) : [null, true];
    return (
      <div ref={iv[0]} className="cad-q-tiles">
        {data.map(function (d, i) {
          return (
            <div key={d.key} className="cad-q-tile" style={{ '--qc': d.color }}>
              <div className="cad-q-tile-h"><b>{d.label}</b><span>{Math.round(d.pts)} pts</span></div>
              <p>{QUALITY_DEFS[d.key]}</p>
              <div className="cad-q-bar"><i style={{ width: (iv[1] ? d.pts / max * 100 : 0) + '%', transitionDelay: (i * 80) + 'ms' }}></i></div>
              <div className="cad-q-share">{Math.round(d.pts / props.catalog.totalPoints * 100)} % du score</div>
              <div className="cad-q-top">{d.top.slice(0, 5).map(function (t) { return <span key={t.name}>{t.name}</span>; })}</div>
            </div>
          );
        })}
      </div>
    );
  }
  function QualityMatrix(props) {
    var cat = props.catalog;
    var hs = React.useState(null); var hov = hs[0], setHov = hs[1];
    var tests = cat.tests.slice().sort(function (a, b) { return a.day - b.day || a.order_in_day - b.order_in_day; });
    return (
      <div className="cad-qm-wrap">
        <div className="cad-qm" style={{ gridTemplateColumns: 'minmax(150px, 1.6fr) repeat(' + cat.qualities.length + ', minmax(44px, 1fr))' }}>
          <div className="cad-qm-hd"></div>
          {cat.qualities.map(function (q) { return <div key={q.key} className="cad-qm-hd" style={{ color: QCOL[q.key] }}>{qLabel(q)}</div>; })}
          {tests.map(function (t) {
            var on = hov === t.slug;
            return (
              <React.Fragment key={t.slug}>
                <div className={'cad-qm-name' + (on ? ' is-on' : '')} onMouseEnter={function () { setHov(t.slug); }} onMouseLeave={function () { setHov(null); }}>
                  <em>J{t.day}</em>{t.name.replace(/\s*\(.*\)$/, '')}
                </div>
                {cat.qualities.map(function (q) {
                  var w = (t.weights && t.weights[q.key]) || 0;
                  return (
                    <div key={q.key} className={'cad-qm-cell' + (on ? ' is-on' : '')} onMouseEnter={function () { setHov(t.slug); }} onMouseLeave={function () { setHov(null); }}
                         style={{ background: w ? hexA(QCOL[q.key], 0.12 + w * 0.78) : 'transparent', color: w >= 0.45 ? '#fff' : 'var(--text-mid)' }}
                         title={window.CadTr(t.name) + ' · ' + window.CadTr(qLabel(q)) + ' : ' + Math.round(w * 100) + ' %'}>
                      {w ? Math.round(w * 100) : ''}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
  function qualities(catalog) {
    var principales = QUALITY_GLOSSARY.filter(function (q) { return q.principal; });
    var autres = QUALITY_GLOSSARY.filter(function (q) { return !q.principal; });
    return (
      <section className="cad-section">
        <SectionTitle kicker="Ce qu'on mesure" sub={'Le score lit ' + catalog.qualities.length + ' qualités. Chacune pèse un certain nombre de points, et chaque épreuve en mesure plusieurs à la fois.'}>Les qualités physiques</SectionTitle>
        <QualityTiles catalog={catalog} />

        <div className="cad-card" style={{ marginTop: 'var(--space-5)' }}>
          <h3 className="cad-h3">Quelle épreuve mesure quoi</h3>
          <p className="cad-p">Part de chaque épreuve attribuée à chaque qualité (en %). Plus la case est foncée, plus l’épreuve compte pour cette qualité.</p>
          <QualityMatrix catalog={catalog} />
        </div>

        <h3 className="cad-h3" style={{ marginTop: 'var(--space-6)' }}>Les 5 qualités principales</h3>
        <div className="cad-gl-main">
          {principales.map(function (q) {
            var st = qstate(q);
            return (
              <div key={q.t} className="cad-gl-card">
                <div className="cad-gl-h"><b>{q.t}</b>{isDeca(catalog) ? <span className={'cad-gl-tag' + st.cls}>{st.label}</span> : null}</div>
                <p>{q.d}{isDeca(catalog) && q.how ? ' ' + q.how : ''}</p>
              </div>
            );
          })}
        </div>
        <h3 className="cad-h3" style={{ marginTop: 'var(--space-5)' }}>Les autres qualités</h3>
        <div className="cad-gl-list">
          {autres.map(function (q) {
            var st = qstate(q);
            return (
              <div key={q.t} className="cad-gl-row">
                <span className={'cad-gl-dot' + (isDeca(catalog) ? st.cls : '')}></span>
                <b>{q.t}</b>
                <span className="cad-gl-d">{q.d}{isDeca(catalog) && q.how ? ' ' + q.how : ''}</span>
                {isDeca(catalog) ? <span className={'cad-gl-tag' + st.cls}>{st.label}</span> : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ── Protocole complet 12 jours ──────────────────────────────────────
  function ECSection(props) {
    return (
      <div className="cad-ec-sec">
        <div className="cad-ec-h">{props.title}</div>
        {props.children}
      </div>
    );
  }
  // Règles communes selon le type d'épreuve.
  function reglesFor(t, p) {
    var r = [];
    if (p && (p.diagram === 'square' || p.diagram === 'move' || p.diagram === 'slalom')) {
      r.push('Sur gazon, jamais sur bitume.');
      r.push('Plots contournés de l\'extérieur vers l\'intérieur.');
    }
    if (t.group === 'Force max' || t.group === 'Haltérophilie') r.push('Technique avant la charge : on arrête si l\'exécution se dégrade.');
    return r;
  }
  function recupFor(t) {
    if (t.group === 'Agilité') return '1′30 de récup';
    if (t.group === 'Sprints') return 'récup complète';
    return null;
  }
  function EpreuveCard(props) {
    var t = props.t, p = props.p;
    var regles = reglesFor(t, p);
    var n = t.partCount || 1;
    var recup = recupFor(t);
    return (
      <div className="cad-card cad-ep">
        <div className="cad-ec-top">
          <div>
            <div className="cad-ec-name">{t.name}</div>
            <div className="cad-ep-meta">
              {n > 1 ? <span>{n} {t.aggregate === 'sum' ? 'passages' : 'essais'}</span> : <span>1 essai</span>}
              {recup ? <span>{recup}</span> : null}
              {t.criteria ? <span className="is-hl">meilleur + total</span> : null}
            </div>
          </div>
          <div className="cad-ec-pts"><b>{t.pts_max}</b><span>{t.criteria ? t.criteria.map(function (c) { return c.pts_max; }).join(' + ') + ' pts' : 'pts'}</span></div>
        </div>
        <div className="cad-ep-grid">
          <div className="cad-ec-body">
            {p ? <ECSection title="Objectif"><p className="cad-ec-p">{p.objectif}</p></ECSection> : null}
            {p ? <ECSection title="Déroulé"><ol className="cad-steps">{p.etapes.map(function (s, i) { return <li key={i}><i>{i + 1}</i><span>{s}</span></li>; })}</ol></ECSection> : null}
            {regles.length ? <ECSection title="Règles"><ul className="cad-ec-ul">{regles.map(function (s, i) { return <li key={i}>{s}</li>; })}</ul></ECSection> : null}
            {p && p.securite ? <ECSection title="Conseils"><p className="cad-ec-p">{p.securite}</p></ECSection> : null}
            {p ? (
              <ECSection title="À saisir">
                <p className="cad-ec-p">{p.saisie}</p>
                {p.allure ? <p className="cad-ec-p" style={{ marginTop: 4 }}><strong>Allure cible :</strong> {p.allure}</p> : null}
                {p.box ? <p className="cad-ec-p" style={{ marginTop: 4 }}><strong>Box :</strong> {p.box}</p> : null}
              </ECSection>
            ) : null}
          </div>
          <div className="cad-ep-side">
            {p && p.diagram ? <CadDiagram name={p.diagram} /> : null}
            <ECSection title="Barème"><BaremeMini test={t} compact /></ECSection>
          </div>
        </div>
      </div>
    );
  }
  function ProtocolSection(props) {
    var catalog = props.catalog;
    var playable = catalog.days.filter(function (d) { return !d.rest; });
    var ds = React.useState(playable[0] ? playable[0].day : 1);
    var day = ds[0], setDay = ds[1];
    var byDay = function (dd) { return catalog.tests.filter(function (t) { return t.day === dd; }).sort(function (a, b) { return a.order_in_day - b.order_in_day; }); };
    var cur = catalog.days.filter(function (d) { return d.day === day; })[0] || catalog.days[0];
    var tests = byDay(cur.day);
    var gear = [], warm = [], seenG = {}, seenW = {};
    tests.forEach(function (t) {
      var p = catalog.protocols[t.slug]; if (!p) return;
      (p.materiel || []).forEach(function (m) { if (!seenG[m]) { seenG[m] = 1; gear.push(m); } });
      if (p.warmup && p.warmup.titre && !seenW[p.warmup.titre]) { seenW[p.warmup.titre] = 1; warm.push(p.warmup); }
    });
    var idx = playable.map(function (d) { return d.day; }).indexOf(cur.day);
    var prev = idx > 0 ? playable[idx - 1] : null, next = idx < playable.length - 1 ? playable[idx + 1] : null;
    function go(d) { setDay(d.day); var el = document.getElementById('cad-proto-top'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    return (
      <section className="cad-section" id="cad-proto-top">
        <SectionTitle kicker="Le déroulé" sub={'Un protocole fixe sur ' + catalog.days.length + ' jours, à refaire à l’identique chaque année. Choisis un jour : son échauffement, son matériel, puis chaque épreuve avec son schéma et son barème.'}>Le protocole, jour par jour</SectionTitle>
        <div className="cad-pdays">
          {catalog.days.map(function (d) {
            return (
              <button key={d.day} type="button" disabled={d.rest} className={'cad-pday' + (d.day === day ? ' on' : '') + (d.rest ? ' rest' : '')}
                      onClick={function () { if (!d.rest) setDay(d.day); }}>
                <b>J{d.day}</b><span>{d.rest ? 'Repos' : d.label}</span>
              </button>
            );
          })}
        </div>
        <div className="cad-dayhead">
          <div className="cad-dayhead-t">
            <span>Jour {cur.day}</span>
            <h3>{cur.label}</h3>
            <div className="cad-ep-meta"><span>{tests.length} épreuve{tests.length > 1 ? 's' : ''}</span><span>{(catalog.presentation && !isDeca(catalog) ? catalog.presentation.perDay : '1 h – 1 h 30')} avec l’échauffement</span><span>{tests.reduce(function (a, t) { return a + t.pts_max; }, 0)} pts en jeu</span></div>
          </div>
          <div className="cad-dayhead-g">
            <div>
              <div className="cad-ec-h">Matériel du jour</div>
              <div className="cad-ti-tags">{gear.map(function (g) { return <span key={g}>{g}</span>; })}</div>
            </div>
            {warm.map(function (w) {
              return (
                <div key={w.titre}>
                  <div className="cad-ec-h">Échauffement · {w.titre}</div>
                  <p className="cad-ec-p">{w.texte}</p>
                </div>
              );
            })}
            {isDeca(catalog) ? <p className="cad-ec-p" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Règles communes : {catalog.echauffement}</p> : null}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {tests.map(function (t) { return <EpreuveCard key={t.slug} t={t} p={catalog.protocols[t.slug]} />; })}
        </div>
        <div className="cad-pnav">
          {prev ? <button type="button" className="thw-btn-ghost" onClick={function () { go(prev); }}>← J{prev.day} · {prev.label}</button> : <span></span>}
          {next ? <button type="button" className="thw-btn-ghost" onClick={function () { go(next); }}>J{next.day} · {next.label} →</button> : <span></span>}
        </div>
      </section>
    );
  }
  function protocol(catalog) { return <ProtocolSection catalog={catalog} />; }

  // ── Barèmes & charges ───────────────────────────────────────────────
  function ScaleRow(props) {
    var t = props.t, sex = props.sex, mult = props.mult || 1;
    var b = sex === 'M' ? t.male : t.female;
    var at = function (p) { return (b.ref + (b.max - b.ref) * (p - 60) / 40) * mult; };
    var marks = [{ p: 0, l: '0 %' }, { p: 60, l: 'Réf' }, { p: 100, l: 'Max' }, { p: 120, l: '120 %' }];
    return (
      <div className="cad-sc">
        <div className="cad-sc-bar"><i style={{ left: 0, width: '50%' }}></i><i className="is-mid" style={{ left: '50%', width: '33.3%' }}></i><i className="is-top" style={{ left: '83.3%', width: '16.7%' }}></i></div>
        {marks.map(function (m) {
          return <div key={m.p} className={'cad-sc-m' + (m.p === 60 || m.p === 100 ? ' is-key' : '') + (m.p === 0 ? ' is-first' : '')} style={{ left: (m.p / 120 * 100) + '%' }}><em>{m.l}</em><b>{fmtThreshold(t, at(m.p))}</b></div>;
        })}
      </div>
    );
  }
  function BaremeSection(props) {
    var catalog = props.catalog;
    var ss = React.useState('M'); var sex = ss[0], setSex = ss[1];
    var as = React.useState(''); var age = as[0], setAge = as[1];
    var a = Number(age);
    var band = isFinite(a) && a >= 18 && a <= 80 ? catalog.age.bands.filter(function (bd) { var p = bd.split('-'); return a >= Number(p[0]) && a <= Number(p[1]); })[0] : null;
    var equip = catalog.tests.filter(function (t) { return t.equipment; });
    var days = catalog.days.filter(function (d) { return !d.rest; });
    var LS = window.CadLevelScale;
    return (
      <section className="cad-section">
        <SectionTitle kicker="Les repères" sub="Deux repères par épreuve : Référence (noté 60 %) et Maximum (noté 100 %). Entre les deux, les points montent de façon linéaire ; au-delà du Max, ça continue.">Barèmes & charges</SectionTitle>
        <div className="cad-seg" style={{ marginBottom: 'var(--space-4)' }}>
          <button type="button" aria-pressed={sex === 'M'} onClick={function () { setSex('M'); }}>Hommes</button>
          <button type="button" aria-pressed={sex === 'F'} onClick={function () { setSex('F'); }}>Femmes</button>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {days.map(function (d) {
            var tests = catalog.tests.filter(function (t) { return t.day === d.day; }).sort(function (x, y) { return x.order_in_day - y.order_in_day; });
            return (
              <div key={d.day} className="cad-card">
                <div className="cad-bday"><b>J{d.day}</b><span>{d.label}</span></div>
                {tests.map(function (t) {
                  return (
                    <div key={t.slug} className="cad-brow">
                      <div className="cad-brow-n"><b>{t.name.replace(/\s*\(.*\)$/, '')}</b><span>{t.pts_max} pts{t.criteria ? ' · ' + t.criteria.map(function (c) { return c.pts_max; }).join(' + ') : ''}{t.kind === 'ratio' ? ' · ratio pdc' : ''}</span></div>
                      <div>
                        <ScaleRow t={t} sex={sex} />
                        {t.criteria ? <div className="cad-brow-sub">Total des {t.partCount || 3} essais<ScaleRow t={t} sex={sex} mult={t.partCount || 3} /></div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="cad-card" style={{ marginTop: 'var(--space-5)' }}>
          <h3 className="cad-h3">Les niveaux</h3>
          <p className="cad-p">Le même découpage s’applique au score total (sur {catalog.totalPoints}) et à chaque qualité (en %).</p>
          {LS ? <LS cat={catalog} /> : null}
        </div>

        <div className="cad-card" style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 className="cad-h3">Barème ajusté à l’âge</h3>
              <p className="cad-p" style={{ margin: 0, maxWidth: 640 }}>Coefficient par tranche d’âge et par qualité (1,00 = pleine valeur). « Plus = mieux » : seuils × coefficient. Chronos : assouplis plus faiblement.</p>
            </div>
            <label className="cad-agein"><span>Ton âge</span><input className="cad-input" inputMode="numeric" placeholder="ex. 42" value={age} onChange={function (e) { setAge(e.target.value); }} aria-label="Ton âge" /></label>
          </div>
          <div className="cad-heat-wrap">
            <div className="cad-heat" style={{ gridTemplateColumns: '64px repeat(' + catalog.qualities.length + ', minmax(40px, 1fr))' }}>
              <div className="cad-heat-hd"></div>
              {catalog.qualities.map(function (q) { return <div key={q.key} className="cad-heat-hd">{qLabel(q)}</div>; })}
              {catalog.age.bands.map(function (bd) {
                var pf = catalog.age.pf[bd]; var on = bd === band;
                return (
                  <React.Fragment key={bd}>
                    <div className={'cad-heat-b' + (on ? ' is-on' : '')}>{bandLabel(bd).replace(' ans', '')}</div>
                    {catalog.qualities.map(function (q) {
                      var v = pf[q.key];
                      return <div key={q.key} className={'cad-heat-c' + (on ? ' is-on' : '')} style={{ background: hexA('#00c8e0', 0.08 + (1 - v) * 1.1), color: v < 0.7 ? '#fff' : 'var(--text-mid)' }}>{v.toFixed(2)}</div>;
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div className="cad-two" style={{ marginTop: 'var(--space-4)' }}>
          {catalog.rm5Factor && catalog.tests.some(function (t) { return t.rmChoice; }) ? <div className="cad-card">
            <h3 className="cad-h3">3RM ou 5RM, à ton choix</h3>
            <p className="cad-p">Les épreuves de force (squat, développé couché, soulevé de terre, développé militaire, traction lestée, front squat) sont notées en <strong>3RM</strong>. Si tu n’as pas l’habitude des charges lourdes, tu peux saisir un <strong>5RM</strong> : charge un peu plus légère, mêmes règles de technique.</p>
            <p className="cad-p" style={{ margin: 0 }}>Le 5RM est converti en <strong>équivalent 3RM</strong> (× {String(catalog.rm5Factor).replace('.', ',')}, car un 5RM pèse environ 94 % d’un 3RM) avant le calcul des points : les scores restent comparables, et ton barème s’affiche dans le choix que tu as fait.</p>
          </div> : null}
          {equip.length ? <div className="cad-card">
            <h3 className="cad-h3">Corrections d’équipement</h3>
            <p className="cad-p">Base : chaussures normales, sans ceinture. Sinon, le résultat est ramené à cette base :</p>
            <div className="cad-ti-tags">
              {equip.map(function (t) {
                var sign = t.equipment.rule.indexOf('1-') !== -1 ? '−' : '+';
                return <span key={t.slug}>{t.name.replace(/\s*\(.*\)$/, '')} · {t.equipment.applies_when} {sign}{Math.round(t.equipment.pct * 100)} %</span>;
              })}
            </div>
          </div> : null}
          {catalog.conditioningLoads && catalog.tests.some(function (t) { return t.slug === 'conditioning'; }) ? <div className="cad-card">
            <h3 className="cad-h3">Charges du circuit Conditioning</h3>
            <p className="cad-p">Soulevé de terre à la barre (sans ceinture) ; fentes et thrusters avec des haltères, charge indiquée par main. Choisis la ligne de ton poids de corps, puis la correction selon ton âge ci-dessous.</p>
            <div className="cad-two">
              {['M', 'F'].map(function (sx) {
                var T = catalog.conditioningLoads;
                var dl = T.deadlift[sx], lg = T.lunge[sx], th = T.thruster;
                // Tranches communes aux trois mouvements (union des bornes), affichées de la plus légère à la plus lourde.
                var cuts = []; [dl, lg, th].forEach(function (arr) { arr.forEach(function (b) { if (b.max != null && cuts.indexOf(b.max) === -1) cuts.push(b.max); }); });
                cuts.sort(function (x, y) { return x - y; });
                var rows = cuts.concat([null]).map(function (mx, i) {
                  var probe = mx == null ? (cuts[cuts.length - 1] + 1) : mx;
                  var pick = function (arr) { for (var k = 0; k < arr.length; k++) { if (arr[k].max == null || probe <= arr[k].max) return arr[k].kg; } return arr[arr.length - 1].kg; };
                  var lo = i === 0 ? null : cuts[i - 1];
                  var label = mx == null ? ('> ' + lo + ' kg') : (lo == null ? ('≤ ' + mx + ' kg') : (lo + '–' + mx + ' kg'));
                  return { label: label, dl: pick(dl), lg: pick(lg), th: pick(th) };
                });
                return (
                  <div key={sx}>
                    <div className="cad-ec-h">{sx === 'M' ? 'Hommes' : 'Femmes'}</div>
                    <table className="cad-table cad-table-sm">
                      <thead><tr><th style={{ textAlign: 'left' }}>Poids de corps</th><th style={{ textAlign: 'right' }}>Soulevé de terre</th><th style={{ textAlign: 'right' }}>Fentes</th><th style={{ textAlign: 'right' }}>Thrusters</th></tr></thead>
                      <tbody>
                        {rows.map(function (r, i) {
                          return <tr key={i}><td style={{ textAlign: 'left' }}>{r.label}</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{String(r.dl).replace('.', ',')} kg</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{String(r.lg).replace('.', ',')} kg</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{String(r.th).replace('.', ',')} kg</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div className="cad-ec-h" style={{ marginTop: 14 }}>Correction selon l’âge</div>
            <p className="cad-p" style={{ margin: '4px 0 8px' }}>Les charges ci-dessus sont multipliées par le facteur de force de ta tranche d’âge, puis arrondies à 2,5 kg (barre 20 kg minimum, haltère 5 kg minimum).</p>
            <table className="cad-table cad-table-sm"><tbody>
              <tr>{(catalog.age.bands || []).map(function (b) { return <th key={b} style={{ textAlign: 'center' }}>{b}</th>; })}</tr>
              <tr>{(catalog.age.bands || []).map(function (b) { var f = catalog.age.pf[b] && catalog.age.pf[b].force; return <td key={b} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>× {String(f).replace('.', ',')}</td>; })}</tr>
            </tbody></table>
          </div> : null}
          {catalog.tests.some(function (t) { return t.slug === 'hyrox_circuit'; }) ? <div className="cad-card">
            <h3 className="cad-h3">Charges Hyrox — thrusters</h3>
            <p className="cad-p">Selon le poids de corps. Burpees box jump : box 60 cm (H) / 40 cm (F), 12 par tour.</p>
            <div className="cad-two">
              {['M', 'F'].map(function (sx) {
                var rows = (catalog.hyroxThrusterKg && catalog.hyroxThrusterKg[sx]) || [];
                return (
                  <div key={sx}>
                    <div className="cad-ec-h">{sx === 'M' ? 'Hommes' : 'Femmes'}</div>
                    <table className="cad-table cad-table-sm"><tbody>
                      {rows.map(function (b, i) {
                        var label = b.hi == null ? ('≥ ' + b.lo + ' kg') : (b.lo === 0 ? ('< ' + b.hi + ' kg') : (b.lo + '–' + b.hi + ' kg'));
                        return <tr key={i}><td style={{ textAlign: 'left' }}>{label}</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{b.kg} kg</td></tr>;
                      })}
                    </tbody></table>
                  </div>
                );
              })}
            </div>
          </div> : null}
        </div>
      </section>
    );
  }
  function bareme(catalog) { return <BaremeSection catalog={catalog} />; }

  // ── Calcul du score (pédagogie interactive) ─────────────────────────
  function fr1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function fr2(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }
  function pctFor(catalog, v, ref, max) {
    var a = catalog.anchors || { ref_pct: 0.6, max_pct: 1 };
    return Math.max(0, a.ref_pct + (a.max_pct - a.ref_pct) * (v - ref) / (max - ref));
  }
  function ScoreSim(props) {
    var cat = props.catalog;
    var simple = cat.tests.filter(function (t) { return t.kind === 'abs'; });
    var ts = React.useState('run_400m'); var slug = ts[0], setSlug = ts[1];
    var ss = React.useState('M'); var sex = ss[0], setSex = ss[1];
    var bs = React.useState('general'); var band = bs[0], setBand = bs[1];
    var bands = (cat.age && cat.age.bands) || [];
    var t = cat.tests.filter(function (x) { return x.slug === slug; })[0] || simple[0];
    var base = sex === 'M' ? t.male : t.female;
    // Barème ajusté à la catégorie d'âge : mêmes formules que le vrai test (coefficient par
    // qualité pondéré par les poids de l'épreuve ; exposant propre aux épreuves chronométrées).
    function ageAdjusted(bb) {
      var pf = band !== 'general' && cat.age && cat.age.pf ? cat.age.pf[band] : null;
      if (!pf) return bb;
      var f = 0; (cat.qualities || []).forEach(function (q) { f += ((t.weights && t.weights[q.key]) || 0) * (pf[q.key] == null ? 1 : pf[q.key]); });
      if (!(f > 0)) return bb;
      if (t.direction === 'higher_is_better') return { ref: bb.ref * f, max: bb.max * f };
      var dv = Math.pow(f, t.ageTimeExponent == null ? 1 : t.ageTimeExponent);
      return { ref: bb.ref / dv, max: bb.max / dv };
    }
    var b = ageAdjusted(base);
    var lo = b.ref + (b.max - b.ref) * (0 - 60) / 40, hi = b.ref + (b.max - b.ref) * (130 - 60) / 40;
    var vs = React.useState(null); var val = vs[0], setVal = vs[1];
    var v = val == null ? (b.ref + b.max) / 2 : val;
    var pct = pctFor(cat, v, b.ref, b.max);
    var pts = pct * t.pts_max;
    var lvl = levelFor(pct, cat.levels), col = levelColor(cat.palette, lvl);
    // Le même résultat au barème général, pour voir l'écart que fait la catégorie.
    var pctG = pctFor(cat, v, base.ref, base.max), lvlG = levelFor(pctG, cat.levels);
    var pos = function (x) { return Math.max(0, Math.min(100, (x - lo) / (hi - lo) * 100)); };
    var step = Math.abs(hi - lo) / 200;
    return (
      <div className="cad-card cad-sim">
        <h3 className="cad-h3">Simulateur</h3>
        <div className="cad-sim-ctl">
          <select className="cad-select" value={t.slug} onChange={function (e) { setSlug(e.target.value); setVal(null); }} aria-label="Épreuve">
            {simple.map(function (x) { return <option key={x.slug} value={x.slug}>{x.name.replace(/\s*\(.*\)$/, '')}</option>; })}
          </select>
          {bands.length ? (
            <select className="cad-select" value={band} onChange={function (e) { setBand(e.target.value); setVal(null); }} aria-label="Catégorie d’âge">
              <option value="general">{generalLabel(cat)}</option>
              {bands.map(function (x) { return <option key={x} value={x}>{bandLabel(x)}</option>; })}
            </select>
          ) : null}
          <div className="cad-seg">
            <button type="button" aria-pressed={sex === 'M'} onClick={function () { setSex('M'); setVal(null); }}>H</button>
            <button type="button" aria-pressed={sex === 'F'} onClick={function () { setSex('F'); setVal(null); }}>F</button>
          </div>
        </div>
        <div className="cad-sim-line">
          <div className="cad-sim-track"></div>
          <div className="cad-sim-k" style={{ left: pos(b.ref) + '%' }}><em>Réf · 60 %</em><b>{fmtThreshold(t, b.ref)}</b></div>
          <div className="cad-sim-k" style={{ left: pos(b.max) + '%' }}><em>Max · 100 %</em><b>{fmtThreshold(t, b.max)}</b></div>
          <div className="cad-sim-dot" style={{ left: pos(v) + '%', background: col }}></div>
        </div>
        <input type="range" className="cad-range" style={{ maxWidth: 'none', accentColor: col }} min={Math.min(lo, hi)} max={Math.max(lo, hi)} step={step}
               value={t.direction === 'lower_is_better' ? (lo + hi - v) : v}
               onChange={function (e) { var x = parseFloat(e.target.value); setVal(t.direction === 'lower_is_better' ? (lo + hi - x) : x); }} aria-label="Résultat simulé" />
        <div className="cad-sim-out">
          <div><em>Ton résultat</em><b>{fmtThreshold(t, v)}</b></div>
          <div><em>Pourcentage</em><b>{Math.round(pct * 100)} %</b></div>
          <div><em>Points</em><b>{fr1(pts)} <small>/ {t.pts_max}</small></b></div>
          <div><em>{band === 'general' ? 'Niveau' : 'Niveau · ' + bandLabel(band)}</em><b className="is-lvl" style={{ color: col }}>{lvl}</b></div>
        </div>
        {band !== 'general' ? (
          <p className="cad-p" style={{ margin: '10px 0 0', fontSize: 12.5 }}>
            Avec le barème <strong>ajusté à ta catégorie</strong>, ce résultat vaut <strong>{Math.round(pct * 100)} %</strong>. Au barème général, il vaudrait {Math.round(pctG * 100)} % ({lvlG}).
          </p>
        ) : null}
        <p className="cad-p" style={{ margin: '10px 0 0', fontSize: 12.5 }}>{t.direction === 'lower_is_better' ? 'Épreuve chronométrée : plus le temps est court, plus le % monte.' : 'Plus le résultat est grand, plus le % monte.'} Au-delà du Max, il n’y a pas de plafond.</p>
      </div>
    );
  }
  function scoreExplain(catalog) {
    var lj = catalog.tests.filter(function (t) { return t.slug === 'standing_long_jump'; })[0];
    var ex = null;
    if (lj && lj.criteria) {
      var parts = [3.2, 3.0, 2.55], best = 3.2, sum = 8.75, n = 3;
      var pb = pctFor(catalog, best, lj.male.ref, lj.male.max), ps = pctFor(catalog, sum, lj.male.ref * n, lj.male.max * n);
      var cb = lj.criteria[0].pts_max, cs = lj.criteria[1].pts_max;
      ex = { parts: parts, pb: pb, ps: ps, cb: cb, cs: cs, best: best, sum: sum, ref: lj.male.ref, max: lj.male.max, n: n };
    }
    var STEPS = [
      { n: '1', t: 'Ton résultat', d: 'Temps, distance, charge (ramenée à ton poids de corps) ou watts.' },
      { n: '2', t: 'Un pourcentage', d: 'Référence = 60 %, Maximum = 100 %. Linéaire entre les deux, sans plafond au-dessus, jusqu’à 0 en dessous.' },
      { n: '3', t: 'Des points', d: '% × points de l’épreuve. Exemple : ' + ((catalog.tests.filter(function (t) { return t.slug === 'run_400m'; })[0]) ? '400 m' : (catalog.tests[0] ? catalog.tests[0].name.replace(/\s*\(.*\)$/, '') : 'une épreuve')) + ' à 100 % → ' + ((catalog.tests.filter(function (t) { return t.slug === 'run_400m'; })[0] || catalog.tests[0] || { pts_max: 80 }).pts_max) + ' pts.' },
      { n: '4', t: 'Un total sur ' + catalog.totalPoints, d: 'La somme des ' + (catalog.totalTests || 25) + ' épreuves. On peut dépasser ' + catalog.totalPoints + '.' },
      { n: '5', t: 'Un niveau', d: 'Sédentaire → Extraterrestre, posé sur le total et sur chaque qualité.' },
    ];
    return (
      <section className="cad-section">
        <SectionTitle kicker="Comprendre" sub="Pas de boîte noire : voici exactement comment ton score est calculé — et tu peux le tester toi-même.">Comment est calculé ton score</SectionTitle>
        <div className="cad-steps5">
          {STEPS.map(function (s) { return <div key={s.n} className="cad-step5"><i>{s.n}</i><b>{s.t}</b><span>{s.d}</span></div>; })}
        </div>
        <div className="cad-two" style={{ marginTop: 'var(--space-4)', alignItems: 'start' }}>
          <ScoreSim catalog={catalog} />
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {ex ? (
              <div className="cad-card">
                <h3 className="cad-h3">Meilleur essai + total des essais</h3>
                <p className="cad-p">Pour les sauts et l’agilité, la régularité compte. Exemple, saut en longueur (homme) : 3 sauts à <strong>{ex.parts.map(fr2).join(' m, ')} m</strong>.</p>
                <div className="cad-crit">
                  <div><em>Meilleur saut</em><b>{fr2(ex.best)} m</b><span>{Math.round(ex.pb * 100)} % × {ex.cb} pts = <strong>{fr1(ex.pb * ex.cb)}</strong></span></div>
                  <div><em>Total des 3</em><b>{fr2(ex.sum)} m</b><span>{Math.round(ex.ps * 100)} % × {ex.cs} pts = <strong>{fr1(ex.ps * ex.cs)}</strong></span></div>
                  <div className="is-tot"><em>Épreuve</em><b>{fr1(ex.pb * ex.cb + ex.ps * ex.cs)} pts</b><span>sur {ex.cb + ex.cs}</span></div>
                </div>
                <p className="cad-p" style={{ margin: '8px 0 0', fontSize: 12.5 }}>Le total est noté sur le même barème × 3 (Réf {fr2(ex.ref * ex.n)} m, Max {fr2(ex.max * ex.n)} m). Un saut raté compte 0 m.</p>
              </div>
            ) : null}
            <div className="cad-card">
              <h3 className="cad-h3">Général ou ajusté à l’âge</h3>
              <p className="cad-p">Le barème <strong>général</strong> {isDeca(catalog) || (catalog.age.bands[0] && Number(catalog.age.bands[0].split('-')[0]) >= 18 && Number(catalog.age.bands[0].split('-')[0]) < 65) ? 'est calé sur 21–35 ans.' : 'n’applique aucune correction d’âge.'} Le barème <strong>ajusté à l’âge</strong> assouplit les repères selon ta tranche (voir les coefficients dans « Barèmes ») — beaucoup moins sur les efforts très courts. Tu bascules entre les deux sur tes résultats.</p>
            </div>
            <div className="cad-card">
              <h3 className="cad-h3">Pourquoi retester</h3>
              <p className="cad-p" style={{ margin: 0 }}>Le même enchaînement, chaque année — idéalement à la même période (<strong>avril, mai, septembre ou octobre</strong>) — rend tes scores <strong>comparables</strong>. La fatigue accumulée sur les {catalog.days.length} jours fait partie du test : récupérer vite est une qualité.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Avertissements & limites ────────────────────────────────────────
  function warnings(catalog) {
    var deca = isDeca(catalog);
    var safety = catalog.presentation && catalog.presentation.safety;
    var W = [
      { t: 'Avis médical conseillé', d: safety || 'Decaform demande des efforts intenses et maximaux. Consulte un médecin avant de tester, surtout après 40 ans ou en cas d’antécédent.' },
      { t: 'Pas un diagnostic', d: 'C’est un test de condition physique, pas un examen médical ni une prescription.' },
      deca
        ? { t: 'Pour des pratiquants réguliers', d: 'Conçu pour des personnes qui s’entraînent déjà, avec un certain niveau — pas pour débuter.' }
        : { t: 'Pour qui', d: (catalog.presentation && catalog.presentation.forWho) || 'Ce test est adapté à une tranche d’âge précise : vérifie que c’est la tienne.' },
      { t: 'Barèmes estimés', d: deca ? 'Les coefficients par âge sont des estimations (littérature masters), calibrées pour des pratiquants réguliers, à affiner avec de vraies données.' : 'Les barèmes s’appuient sur des tests de terrain publiés, adaptés à cette tranche d’âge ; certains repères sont des estimations, à affiner avec de vraies données.' },
      catalog.maxDays ? { t: window.CadTr('Finis le test en {max} jours maximum').replace('{max}', catalog.maxDays), d: window.CadTr('Le plan idéal compte 12 jours, avec des jours de repos, mais tu peux t’organiser comme tu veux. Au-delà de {max} jours, ta forme peut changer et les résultats deviennent moins comparables : ils restent enregistrés, avec une mention.').replace('{max}', catalog.maxDays) } : null,
      { t: 'Arrête si ça ne va pas', d: 'Douleur, malaise, vertige : on stoppe l’épreuve. La technique passe toujours avant la charge ou le chrono.' },
    ].filter(Boolean);
    return (
      <section className="cad-section">
        <SectionTitle kicker="À lire avant de tester">Avertissements & limites</SectionTitle>
        <div className="cad-warns">
          {W.map(function (w, i) {
            return <div key={i} className="cad-warn-i"><i>!</i><div><b>{w.t}</b><span>{w.d}</span></div></div>;
          })}
        </div>
        <p className="cad-p" style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>Version du barème : {catalog.version}.</p>
      </section>
    );
  }

  window.CadContent = {
    overview: overview, qualities: qualities, protocol: protocol,
    bareme: bareme, scoreExplain: scoreExplain, warnings: warnings,
  };
})();
