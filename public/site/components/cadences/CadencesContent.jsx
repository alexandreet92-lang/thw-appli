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

  function levelColor(palette, level) { return (palette && palette[level]) || '#9ca3af'; }
  function levelFor(pct, levels) { var lab = levels[0].label; for (var i = 0; i < levels.length; i++) if (pct >= levels[i].min_pct) lab = levels[i].label; return lab; }
  function fmtDur(v) { var m = Math.floor(v / 60); var s = Math.round(v - m * 60); return m + ':' + String(s).padStart(2, '0'); }
  function fmtThreshold(t, v) {
    if (t.kind === 'ratio' && t.unit === 'kg') return v + '× pdc';
    if (t.kind === 'ratio' && t.unit === 'W') return v + ' W/kg';
    if (t.unit === 's') return fmtDur(v);
    if (t.unit === 'm') return v + ' m';
    if (t.unit === 'tours') return v + ' tours';
    return String(v);
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

  // ── Aperçu animé (exemple illustratif) ──────────────────────────────
  function preview(catalog) {
    var ex = { vitesse: 0.62, force: 0.85, puissance: 0.70, explosivite: 0.58, endurance: 0.90, vo2max: 0.78, coordination: 0.66 };
    var items = catalog.qualities.map(function (q) {
      var pct = ex[q.key] != null ? ex[q.key] : 0.6;
      var lvl = levelFor(pct, catalog.levels);
      return { key: q.key, label: q.label, pct: pct, level: lvl, color: levelColor(catalog.palette, lvl) };
    });
    var total = 742, glvl = levelFor(total / catalog.totalPoints, catalog.levels);
    return (
      <section className="cad-section">
        <SectionTitle kicker="Ce que tu obtiens" sub="À la fin, un score global sur 1000 et une lecture claire de chaque qualité — en barème général ou ajusté à ton âge.">Tes résultats, visuels</SectionTitle>
        <div className="cad-card" style={{ position: 'relative' }}>
          <span className="cad-badge-ex">Exemple illustratif</span>
          <div className="cad-preview-grid">
            <CadScoreDonut total={total} totalMax={catalog.totalPoints} level={glvl} color={levelColor(catalog.palette, glvl)} size={190}/>
            <CadRadar items={items} color="#00c8e0" size={300}/>
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <CadQualityRings items={items}/>
          </div>
        </div>
      </section>
    );
  }

  // ── Les 7 qualités ──────────────────────────────────────────────────
  function qualities(catalog) {
    return (
      <section className="cad-section">
        <SectionTitle kicker="Ce qu'on mesure" sub="Chaque épreuve nourrit une à cinq de ces qualités. La souplesse n'est pas évaluée par CADENCES.">Les 7 qualités</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'var(--space-3)' }}>
          {catalog.qualities.map(function (q) {
            return (
              <div key={q.key} className="cad-card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{q.label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)', marginTop: 6 }}>{QUALITY_DEFS[q.key]}</div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ── Protocole complet 12 jours ──────────────────────────────────────
  function protocol(catalog) {
    var byDay = function (d) { return catalog.tests.filter(function (t) { return t.day === d; }).sort(function (a, b) { return a.order_in_day - b.order_in_day; }); };
    return (
      <section className="cad-section">
        <SectionTitle kicker="Le déroulé" sub="Un protocole fixe sur 12 jours, à refaire à l'identique chaque année. L'ordre et les jours de repos font partie du test : le but est la comparabilité, pas la perf isolée.">Le protocole, jour par jour</SectionTitle>
        <div className="cad-card" style={{ background: 'var(--bg-card-2)', marginBottom: 'var(--space-4)' }}>
          <strong style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text)' }}>Échauffement général.</strong>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6 }}> {catalog.echauffement}</span>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {catalog.days.map(function (d) {
            return (
              <div key={d.day}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--brand)', fontWeight: 500 }}>JOUR {d.day}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{d.label}</span>
                </div>
                {d.rest ? (
                  <div className="cad-card" style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)' }}>Repos — fait partie du protocole. Aucune épreuve.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {byDay(d.day).map(function (t) {
                      var p = catalog.protocols[t.slug];
                      return (
                        <div key={t.slug} className="cad-card" style={{ padding: 'var(--space-4)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{t.name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>{t.group} · {t.pts_max} pts</div>
                          </div>
                          {p ? (
                            <div style={{ display: 'grid', gap: 6, marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-mid)' }}>
                              <div><strong style={{ color: 'var(--text)' }}>Objectif.</strong> {p.objectif}</div>
                              <div><strong style={{ color: 'var(--text)' }}>Matériel.</strong> {p.materiel.join(', ')}.</div>
                              <ol style={{ margin: '2px 0', paddingLeft: 18, display: 'grid', gap: 2 }}>{p.etapes.map(function (s, i) { return <li key={i}>{s}</li>; })}</ol>
                              {p.securite ? <div><strong style={{ color: 'var(--text)' }}>Sécurité.</strong> {p.securite}</div> : null}
                              <div><strong style={{ color: 'var(--text)' }}>À saisir.</strong> {p.saisie}{p.flag ? ' (protocole en cours de relecture)' : ''}</div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

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
        <p className="cad-p" style={{ marginTop: 'var(--space-4)', fontSize: 12, color: 'var(--text-dim)' }}>
          À préciser (données en cours) : charge des thrusters Hyrox, géométries exactes Square/Slalom, règle de score du Move. Affichés dès qu'ils sont fixés — jamais estimés au hasard.
        </p>
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

  window.CadContent = {
    preview: preview, qualities: qualities, protocol: protocol,
    bareme: bareme, scoreExplain: scoreExplain, warnings: warnings,
  };
})();
