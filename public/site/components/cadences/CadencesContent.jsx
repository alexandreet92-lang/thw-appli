/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — CONTENU RICHE (statique, aucune API).
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
  };

  // Glossaire complet des qualités physiques (définitions d'Alex).
  // principal = parmi les principales ; tested = évaluée par CADENCES (11).
  var QUALITY_GLOSSARY = [
    { t: 'Force maximale', d: 'Tension maximale développée par un muscle contre une résistance.', principal: true, tested: true },
    { t: 'Vitesse maximale', d: 'Accomplir un mouvement ou un déplacement dans le temps le plus court possible.', principal: true, tested: true },
    { t: 'Endurance fondamentale', d: 'Maintenir un effort d\'intensité faible à modérée sur une longue durée.', principal: true, tested: true },
    { t: 'Coordination', d: 'Synchroniser système nerveux et muscles pour un mouvement fluide.', principal: true, tested: true },
    { t: 'Souplesse', d: 'Réaliser des mouvements avec la plus grande amplitude articulaire possible.', principal: true, tested: false },
    { t: 'Puissance', d: 'Exprimer une force maximale le plus vite possible (force × vitesse).', tested: true },
    { t: 'Explosivité', d: 'Déclencher la plus grande force possible en un minimum de temps, à partir de l\'arrêt.', tested: true },
    { t: 'Résistance', d: 'Soutenir un effort d\'intensité très élevée malgré la fatigue et l\'acide lactique.', tested: true },
    { t: 'Endurance musculaire', d: 'Répéter ou maintenir des efforts musculaires sous-maximaux dans la durée.', tested: true },
    { t: 'Vitesse-endurance', d: 'Maintenir une vitesse proche du maximum le plus longtemps possible.', tested: true },
    { t: 'Agilité', d: 'Changer rapidement, efficacement et de façon contrôlée de direction ou de trajectoire.', tested: true },
    { t: 'VO₂max', d: 'Cylindrée aérobie : volume maximal d\'oxygène consommé à l\'effort.', tested: true },
    { t: 'Endurance de force', d: 'Répéter ou maintenir un niveau de force élevé dans le temps.', tested: false },
    { t: 'Équilibre', d: 'Maintenir la stabilité du corps, à l\'arrêt comme en mouvement.', tested: false },
    { t: 'Précision', d: 'Contrôler exactement la trajectoire d\'un geste ou d\'un projectile.', tested: false },
    { t: 'Temps de réaction', d: 'Délai entre la perception d\'un signal et le début du mouvement.', tested: false },
    { t: 'Dissociation segmentaire', d: 'Bouger une partie du corps indépendamment des autres.', tested: false },
    { t: 'Rythme', d: 'Percevoir et reproduire une cadence précise dans l\'effort.', tested: false },
  ];

  function levelColor(palette, level) { return (palette && palette[level]) || '#9ca3af'; }
  function levelFor(pct, levels) { var lab = levels[0].label; for (var i = 0; i < levels.length; i++) if (pct >= levels[i].min_pct) lab = levels[i].label; return lab; }
  function round1(v) { return Math.round(v * 100) / 100; }
  function fmtDur(v) { var m = Math.floor(v / 60); var s = Math.round(v - m * 60); return m + ':' + String(s).padStart(2, '0'); }
  function fmtThreshold(t, v) {
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
    function sexRows(sex, label) {
      var cols = baremeCols(t, sex);
      var main = <tr key={sex}><td className="cad-b-rl">{label}</td>{cols.map(function (v, i) { return <td key={i}>{fmtThreshold(t, v)}</td>; })}</tr>;
      var subs = paceRows(t, cols).map(function (r, j) {
        return <tr key={sex + 's' + j} className="cad-b-sub"><td className="cad-b-rl">↳ {r.sub}</td>{r.cells.map(function (c, i) { return <td key={i}>{c}</td>; })}</tr>;
      });
      return [main].concat(subs);
    }
    return (
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="cad-table cad-bareme">
          <thead><tr><th style={{ textAlign: 'left' }}></th>{BAR_P.map(function (p) { return <th key={p}>{p === 60 ? 'Réf' : p === 100 ? 'Max' : p + '%'}</th>; })}</tr></thead>
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
    'Vélo': 'Vélo', 'AMRAP': 'Hybride', 'Hyrox': 'Hybride',
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
    var ex = { vitesse: 0.62, force: 0.85, puissance: 0.70, explosivite: 0.58, endurance: 0.90, vo2max: 0.78, coordination: 0.66 };
    var items = catalog.qualities.map(function (q) { var pct = ex[q.key] != null ? ex[q.key] : 0.6; var lvl = levelFor(pct, catalog.levels); return { key: q.key, label: q.label, pct: pct, level: lvl, color: levelColor(catalog.palette, lvl) }; });
    var total = 742, glvl = levelFor(total / catalog.totalPoints, catalog.levels);
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="cad-stats">
          <Stat n={catalog.totalTests} l="épreuves" />
          <Stat n="12" l="jours" />
          <Stat n={catalog.totalPoints} l="points de réf." />
          <Stat n="7" l="qualités" />
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

  // ── Les qualités physiques (glossaire + ce que le test mesure) ──────
  function qualities(catalog) {
    var nTested = QUALITY_GLOSSARY.filter(function (q) { return q.tested; }).length;
    var sorted = QUALITY_GLOSSARY.slice().sort(function (a, b) {
      return ((b.principal ? 2 : 0) + (b.tested ? 1 : 0)) - ((a.principal ? 2 : 0) + (a.tested ? 1 : 0));
    });
    return (
      <section className="cad-section">
        <SectionTitle kicker="Ce qu'on mesure"
          sub={"Les qualités physiques, définies. Cinq sont considérées comme principales ; " + nTested + " sont évaluées par CADENCES. Pour le score, elles sont regroupées en 7 familles (le radar)."}>Les qualités physiques</SectionTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mid)' }}>
          <span>★ principale</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: 'var(--brand)' }}></i> mesurée dans le test
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(228px, 1fr))', gap: 'var(--space-3)' }}>
          {sorted.map(function (q, i) {
            return (
              <div key={i} className="cad-card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{q.principal ? '★ ' : ''}{q.t}</div>
                  {q.tested ? <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--brand-gradient)', borderRadius: 999, padding: '2px 8px' }}>Test</span> : null}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)', marginTop: 6 }}>{q.d}</div>
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
  function EpreuveCard(props) {
    var t = props.t, p = props.p;
    var regles = reglesFor(t, p);
    var donnees = [];
    if (p) {
      donnees.push(<li key="s"><strong style={{ color: 'var(--text)' }}>À saisir :</strong> {p.saisie}</li>);
      if (p.allure) donnees.push(<li key="a"><strong style={{ color: 'var(--text)' }}>Allure cible :</strong> {p.allure}</li>);
      if (p.box) donnees.push(<li key="b"><strong style={{ color: 'var(--text)' }}>Box :</strong> {p.box}</li>);
    }
    return (
      <div className="cad-card" style={{ padding: 'var(--space-4)' }}>
        <div className="cad-ec-top">
          <div className="cad-ec-name">{t.name}</div>
          <div className="cad-ec-pts"><b>{t.pts_max}</b><span>pts</span></div>
        </div>
        {p ? (
          <div className="cad-ec-body">
            <ECSection title="Objectif"><p className="cad-ec-p">{p.objectif}</p></ECSection>
            <ECSection title="Matériel requis"><p className="cad-ec-p">{p.materiel.join(' · ')}</p></ECSection>
            <ECSection title="Déroulé"><ol className="cad-ec-ol">{p.etapes.map(function (s, i) { return <li key={i}>{s}</li>; })}</ol></ECSection>
            {regles.length ? <ECSection title="Règles"><ul className="cad-ec-ul">{regles.map(function (s, i) { return <li key={i}>{s}</li>; })}</ul></ECSection> : null}
            {p.securite ? <ECSection title="Conseils"><p className="cad-ec-p">{p.securite}</p></ECSection> : null}
            <ECSection title="Données à retenir"><ul className="cad-ec-ul">{donnees}</ul></ECSection>
          </div>
        ) : null}
        {p && p.diagram ? <CadDiagram name={p.diagram} /> : null}
        <ECSection title="Barème"><BaremeMini test={t} /></ECSection>
      </div>
    );
  }
  function EchauffementBlock(props) {
    var catalog = props.catalog, seen = {}, list = [];
    Object.keys(catalog.protocols || {}).forEach(function (k) {
      var w = catalog.protocols[k].warmup;
      if (w && w.titre && !seen[w.titre]) { seen[w.titre] = 1; list.push(w); }
    });
    return (
      <div className="cad-card" style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>
        <h3 className="cad-h3" style={{ marginBottom: 6 }}>Échauffement — à faire au début, selon la séance</h3>
        <p className="cad-p" style={{ margin: '0 0 10px' }}>Règles communes : {catalog.echauffement}</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {list.map(function (w, i) {
            return <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55 }}><strong style={{ color: 'var(--text)' }}>{w.titre}.</strong> <span style={{ color: 'var(--text-mid)' }}> {w.texte}</span></div>;
          })}
        </div>
      </div>
    );
  }
  function ProtocolSection(props) {
    var catalog = props.catalog;
    var firstDay = catalog.days.filter(function (d) { return !d.rest; })[0];
    var ds = React.useState(firstDay ? firstDay.day : 1);
    var day = ds[0], setDay = ds[1];
    var byDay = function (dd) { return catalog.tests.filter(function (t) { return t.day === dd; }).sort(function (a, b) { return a.order_in_day - b.order_in_day; }); };
    var cur = catalog.days.filter(function (d) { return d.day === day; })[0] || catalog.days[0];
    return (
      <section className="cad-section">
        <SectionTitle kicker="Le déroulé" sub="Un protocole fixe sur 12 jours, à refaire à l'identique chaque année. Choisis un jour pour voir ses épreuves, leur schéma et leur barème.">Le protocole, jour par jour</SectionTitle>
        <EchauffementBlock catalog={catalog} />
        <div className="cad-dayrow">
          {catalog.days.map(function (d) {
            return (
              <button key={d.day} type="button" disabled={d.rest}
                className={'cad-day' + (d.day === day ? ' on' : '') + (d.rest ? ' rest' : '')}
                onClick={function () { if (!d.rest) setDay(d.day); }}>
                <span className="cad-day-n">J{d.day}</span>
                <span className="cad-day-l">{d.rest ? 'Repos' : d.label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--brand)', fontWeight: 500 }}>JOUR {cur.day}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{cur.label}</span>
        </div>
        {cur.rest ? (
          <div className="cad-card" style={{ color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13 }}>Repos — fait partie du protocole.</div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {byDay(cur.day).map(function (t) { return <EpreuveCard key={t.slug} t={t} p={catalog.protocols[t.slug]} />; })}
          </div>
        )}
      </section>
    );
  }
  function protocol(catalog) { return <ProtocolSection catalog={catalog} />; }

  // ── Barèmes & charges ───────────────────────────────────────────────
  function bareme(catalog) {
    var equip = catalog.tests.filter(function (t) { return t.equipment; });
    return (
      <section className="cad-section">
        <SectionTitle kicker="Les repères" sub="Deux repères par épreuve : Référence (noté 60 %) et Maximum (noté 100 %). La force et le vélo sont en ratio au poids de corps (pdc) ; les courses et la nage en temps.">Barèmes & charges</SectionTitle>

        <div style={{ overflowX: 'auto' }}>
          <table className="cad-table">
            <thead>
              <tr><th style={{ textAlign: 'left' }}>Épreuve</th><th>Réf · H</th><th>Max · H</th><th>Réf · F</th><th>Max · F</th></tr>
            </thead>
            <tbody>
              {catalog.tests.map(function (t) {
                return (
                  <tr key={t.slug}>
                    <td style={{ textAlign: 'left' }}><span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</span> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>· {t.pts_max} pts</span></td>
                    <td>{fmtThreshold(t, t.male.ref)}</td>
                    <td>{fmtThreshold(t, t.male.max)}</td>
                    <td>{fmtThreshold(t, t.female.ref)}</td>
                    <td>{fmtThreshold(t, t.female.max)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="cad-two" style={{ marginTop: 'var(--space-5)' }}>
          <div>
            <h3 className="cad-h3">Les niveaux</h3>
            <table className="cad-table cad-table-sm">
              <tbody>
                {levelRanges(catalog.levels).map(function (l) {
                  return (
                    <tr key={l.label}>
                      <td style={{ textAlign: 'left', width: 28 }}><span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 3, background: levelColor(catalog.palette, l.label) }}/></td>
                      <td style={{ textAlign: 'left', fontWeight: 600, color: 'var(--text)' }}>{l.label}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{l.range}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="cad-h3">Équipement (corrections)</h3>
            <p className="cad-p">Base : chaussures normales, sans ceinture. Sinon, le résultat est ramené à cette base (estimations) :</p>
            <ul className="cad-ul">
              {equip.map(function (t) {
                var sign = t.equipment.rule.indexOf('1-') !== -1 ? '−' : '+';
                return <li key={t.slug}>{t.name} — {t.equipment.applies_when} : {sign}{Math.round(t.equipment.pct * 100)} %</li>;
              })}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <h3 className="cad-h3">Barème ajusté à l’âge (coefficients)</h3>
          <p className="cad-p">Coefficient par tranche d'âge et par qualité (1,00 = pleine valeur). « Plus = mieux » → seuils × coefficient ; chronos → assouplis plus faiblement. Estimations, calibrées pour des pratiquants réguliers.</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="cad-table cad-table-sm">
              <thead><tr><th style={{ textAlign: 'left' }}>Tranche</th>{catalog.qualities.map(function (q) { return <th key={q.key}>{q.label.slice(0, 4)}</th>; })}</tr></thead>
              <tbody>
                {catalog.age.bands.map(function (b) {
                  var pf = catalog.age.pf[b];
                  return <tr key={b}><td style={{ textAlign: 'left', fontFamily: 'var(--font-mono)' }}>{b}</td>{catalog.qualities.map(function (q) { return <td key={q.key} style={{ fontFamily: 'var(--font-mono)' }}>{pf[q.key].toFixed(2)}</td>; })}</tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-5)' }}>
          <h3 className="cad-h3">Charges Hyrox — thrusters</h3>
          <p className="cad-p">Charge des thrusters selon le poids de corps. Burpees box jump : box 60 cm (H) / 40 cm (F), 12 répétitions par tour.</p>
          <div className="cad-two">
            {['M', 'F'].map(function (sex) {
              var rows = (catalog.hyroxThrusterKg && catalog.hyroxThrusterKg[sex]) || [];
              return (
                <div key={sex}>
                  <div className="t-label" style={{ color: 'var(--text-mid)', marginBottom: 6 }}>{sex === 'M' ? 'Hommes' : 'Femmes'}</div>
                  <table className="cad-table cad-table-sm">
                    <tbody>
                      {rows.map(function (b, i) {
                        var label = b.hi == null ? ('≥ ' + b.lo + ' kg') : (b.lo === 0 ? ('< ' + b.hi + ' kg') : (b.lo + '–' + b.hi + ' kg'));
                        return <tr key={i}><td style={{ textAlign: 'left' }}>{label}</td><td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{b.kg} kg</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Calcul du score (pédagogie) ─────────────────────────────────────
  function scoreExplain(catalog) {
    return (
      <section className="cad-section">
        <SectionTitle kicker="Comprendre" sub="Pas de boîte noire : voici exactement comment ton score est calculé.">Comment est calculé ton score</SectionTitle>
        <div className="cad-two">
          <div className="cad-card">
            <h3 className="cad-h3">Le principe</h3>
            <p className="cad-p">Chaque épreuve a deux repères : <strong>Référence</strong> (60 %) et <strong>Maximum</strong> (100 %). Entre les deux, les points montent de façon <strong>linéaire</strong>. Au-dessus du Max, ça continue <strong>sans plafond</strong> ; en dessous de la Référence, ça descend jusqu'à 0.</p>
            <p className="cad-p">Le score global est la <strong>somme des points</strong> de toutes les épreuves. Le total de référence est fixé à <strong>{catalog.totalPoints} points</strong> — on peut donc dépasser {catalog.totalPoints}.</p>
          </div>
          <div className="cad-card">
            <h3 className="cad-h3">Exemple</h3>
            <p className="cad-p">Sur une épreuve où Réf = 100 et Max = 140 : un résultat de 120 tombe pile au milieu → 80 %. Un résultat de 140 → 100 %. Un résultat de 160 (au-delà du Max) → 150 %, et les points continuent.</p>
            <p className="cad-p">Un <strong>niveau nommé</strong> (Faible → Exceptionnel) est posé sur ce pourcentage, juste pour la lecture : il ne change jamais le calcul.</p>
          </div>
          <div className="cad-card">
            <h3 className="cad-h3">Général ou ajusté à l'âge</h3>
            <p className="cad-p">Le barème <strong>général</strong> est calé sur 21–35 ans. Le barème <strong>ajusté à l'âge</strong> assouplit les repères selon ta tranche — et beaucoup moins sur les efforts très courts. Tu bascules entre les deux sur ta page de résultats.</p>
          </div>
          <div className="cad-card">
            <h3 className="cad-h3">Pourquoi retester</h3>
            <p className="cad-p">Le même enchaînement, chaque année, rend tes scores <strong>comparables</strong> dans le temps. La fatigue accumulée fait partie du test : récupérer vite est une qualité, pas un biais.</p>
          </div>
        </div>
      </section>
    );
  }

  // ── Avertissements & limites ────────────────────────────────────────
  function warnings(catalog) {
    return (
      <section className="cad-section">
        <div className="cad-card cad-warn">
          <h3 className="cad-h3" style={{ marginTop: 0 }}>Avertissements & limites</h3>
          <ul className="cad-ul">
            <li>CADENCES demande des efforts intenses : un <strong>avis médical</strong> est conseillé avant de tester.</li>
            <li>Ce n'est <strong>pas un diagnostic</strong> médical ni une prescription.</li>
            <li>C'est un test de <strong>condition générale</strong> conçu pour des <strong>pratiquants réguliers ayant déjà un certain niveau</strong> — pas pour des débutants.</li>
            <li>Les barèmes par âge sont des <strong>estimations</strong> (littérature masters), calibrées pour des pratiquants réguliers, pas pour la population générale.</li>
          </ul>
          <p className="cad-p" style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Version du barème : {catalog.version}.</p>
        </div>
      </section>
    );
  }

  // ── Transparence (niveaux de confiance, hypothèses) ─────────────────
  function transparence() {
    var conf = [
      { l: 'Solide / moyenne', c: '#22c55e', tests: 'Sauts, sprints, force, vélo 20′, natation 50 m, 400 m', why: 'Repères publiés ou seuils fixés par Alex.' },
      { l: 'Faible', c: '#f59e0b', tests: '6×200 m, natation 200 m, dead hang, Hyrox, 3200 m', why: 'Estimation par décomposition, jamais mesurée sur le terrain.' },
      { l: 'Aucune donnée', c: '#ef4444', tests: 'Square, Move, Slalom', why: 'Modèle théorique pur — à calibrer en priorité (échantillon ≥ 30).' },
    ];
    return (
      <section className="cad-section">
        <SectionTitle kicker="Jouer franc-jeu" sub="D'où viennent les repères, et ce qu'il reste à valider. On préfère le dire que faire semblant.">Fiabilité & hypothèses</SectionTitle>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {conf.map(function (r, i) {
            return (
              <div key={i} className="cad-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid ' + r.c }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.l}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', marginTop: 4 }}>{r.tests}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>{r.why}</div>
              </div>
            );
          })}
        </div>
        <div className="cad-card" style={{ marginTop: 'var(--space-3)' }}>
          <h3 className="cad-h3">Hypothèses de conversion (à ajuster avec de vraies données)</h3>
          <ul className="cad-ul">
            <li>Femmes — force : ~65 % des valeurs hommes ; sauts : ~80 % ; course : ~15–20 % plus lentes.</li>
            <li>Force en 3RM : dérivée de l'ancien barème 1RM × 0,91.</li>
            <li>Vélo : FTP estimée = 95 % de la puissance moyenne sur 20 min.</li>
            <li>Coefficients d'âge : estimations (littérature masters), à valider sur le terrain — surtout 18–20 et 71–80 ans.</li>
          </ul>
        </div>
        <div className="cad-card" style={{ marginTop: 'var(--space-3)' }}>
          <h3 className="cad-h3">Courbes de vieillissement (page d'accueil)</h3>
          <p className="cad-p" style={{ margin: 0 }}>Les graphiques « Comment ton corps vieillit », « sédentaire vs entraîné » et « trajectoire A/B » sont <strong>illustratifs</strong> (moyennes de population), pas des mesures individuelles. Repères issus de la littérature : déclin du VO₂max ~2× plus lent chez les athlètes masters que chez les sédentaires ; perte musculaire de 3 à 8 %/décennie après 30 ans ; testostérone ~−1 %/an après 30 ; pic de densité osseuse vers 30 ans ; pratiquants réguliers à vie (57-80 ans) conservant masse musculaire, immunité et cholestérol d'un jeune (≈ +9 ans d'âge biologique).</p>
        </div>
      </section>
    );
  }

  window.CadContent = {
    overview: overview, qualities: qualities, protocol: protocol,
    bareme: bareme, scoreExplain: scoreExplain, transparence: transparence, warnings: warnings,
  };
})();
