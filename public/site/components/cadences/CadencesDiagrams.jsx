/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — schémas des parcours à plots (SVG brut).
   Square 4×4, Slalom 10.18, Move (plots 5/10/15 m + sprint 30 m).
   Lisibles clair/sombre (tokens + couleurs fonctionnelles). Publie
   window.CadDiagram : <CadDiagram name="square|slalom|move"/>.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var AVANT = '#00c8e0';     // course avant
  var ARRIERE = '#5b6fff';   // course arrière
  var CHASSE = '#f59e0b';    // pas chassés
  var SPRINT = '#22c55e';    // sprint final

  function defs(id, color) {
    return (
      <marker id={id} markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill={color} />
      </marker>
    );
  }
  function Legend(items) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-mid)' }}>
        {items.map(function (it, i) {
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke={it.c} strokeWidth="2.4" strokeDasharray={it.d || 'none'} /></svg>
              {it.l}
            </span>
          );
        })}
      </div>
    );
  }
  function plot(x, y, label) {
    return (
      <g>
        <circle cx={x} cy={y} r={4.5} fill="var(--text)" />
        {label ? <text x={x} y={y - 9} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-dim)' }}>{label}</text> : null}
      </g>
    );
  }
  function wrap(children) {
    return <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-md)', padding: 14, marginTop: 10 }}>{children}</div>;
  }

  // ── MOVE : 3 allers-retours (5/10/15 m) + sprint 30 m ──
  function Move() {
    var x0 = 34, perM = 9;                 // 9 px / m pour les navettes
    var lanes = [{ y: 34, m: 5 }, { y: 64, m: 10 }, { y: 94, m: 15 }];
    return wrap(
      <div>
        <svg width="100%" viewBox="0 0 420 165" role="img" aria-label="Schéma du Move : navettes 5, 10, 15 m puis sprint 30 m">
          <defs>{defs('mA', AVANT)}{defs('mR', ARRIERE)}{defs('mS', SPRINT)}</defs>
          {/* ligne de départ */}
          <line x1={x0} y1={18} x2={x0} y2={140} stroke="var(--border-mid)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={x0} y={13} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--text-mid)' }}>Départ</text>
          {lanes.map(function (ln, i) {
            var xe = x0 + ln.m * perM;
            return (
              <g key={i}>
                <line x1={x0 + 2} y1={ln.y - 4} x2={xe - 2} y2={ln.y - 4} stroke={AVANT} strokeWidth="2.2" markerEnd="url(#mA)" />
                <line x1={xe - 2} y1={ln.y + 4} x2={x0 + 2} y2={ln.y + 4} stroke={ARRIERE} strokeWidth="2.2" strokeDasharray="4 3" markerEnd="url(#mR)" />
                {plot(xe, ln.y, ln.m + ' m')}
              </g>
            );
          })}
          {/* sprint 30 m */}
          <line x1={x0 + 2} y1={128} x2={x0 + 30 * perM + 40} y2={128} stroke={SPRINT} strokeWidth="2.6" markerEnd="url(#mS)" />
          <text x={x0 + 150} y={123} style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fill: 'var(--text-mid)' }}>Sprint 30 m</text>
        </svg>
        {Legend([{ c: AVANT, l: 'avant' }, { c: ARRIERE, l: 'arrière', d: '4 3' }, { c: SPRINT, l: 'sprint' }])}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>Aller avant → contourner le plot → retour arrière, pour 5 m, 10 m, 15 m ; puis sprint 30 m. 1 min de récup, ×3, le meilleur compte.</div>
      </div>
    );
  }

  // ── SQUARE 4×4 : 2 carrés séparés de 10 m ──
  function Square() {
    function box(cx, cy, s, reverse) {
      var h = s / 2;
      var a = reverse ? ARRIERE : AVANT;
      var r = reverse ? AVANT : ARRIERE;
      return (
        <g>
          <rect x={cx - h} y={cy - h} width={s} height={s} fill="none" stroke="var(--border-mid)" strokeWidth="1.2" rx="3" />
          {/* bas = avant */}
          <line x1={cx - h + 3} y1={cy + h} x2={cx + h - 3} y2={cy + h} stroke={a} strokeWidth="2.2" markerEnd="url(#sq1)" />
          {/* droite = chassé */}
          <line x1={cx + h} y1={cy + h - 3} x2={cx + h} y2={cy - h + 3} stroke={CHASSE} strokeWidth="2.2" strokeDasharray="2 3" markerEnd="url(#sq3)" />
          {/* haut = arrière */}
          <line x1={cx + h - 3} y1={cy - h} x2={cx - h + 3} y2={cy - h} stroke={r} strokeWidth="2.2" strokeDasharray="4 3" markerEnd="url(#sq2)" />
          {/* gauche = chassé */}
          <line x1={cx - h} y1={cy - h + 3} x2={cx - h} y2={cy + h - 3} stroke={CHASSE} strokeWidth="2.2" strokeDasharray="2 3" markerEnd="url(#sq3)" />
        </g>
      );
    }
    return wrap(
      <div>
        <svg width="100%" viewBox="0 0 300 300" role="img" aria-label="Schéma du Square 4x4 : deux carrés séparés de 10 m">
          <defs>{defs('sq1', AVANT)}{defs('sq2', ARRIERE)}{defs('sq3', CHASSE)}</defs>
          {/* carré 1 (bas) */}
          {box(90, 240, 70, false)}
          <text x={150} y={243} style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-mid)' }}>Carré 1 · 4×4 m</text>
          {/* connecteur 10 m */}
          <line x1={90} y1={205} x2={90} y2={135} stroke="var(--border-mid)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={96} y={173} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-dim)' }}>10 m</text>
          {/* carré 2 (haut, sens inverse) */}
          {box(90, 100, 70, true)}
          <text x={150} y={103} style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-mid)' }}>Carré 2 · sens inverse</text>
          {/* segment final 10 m vers l'arrivée */}
          <line x1={90} y1={65} x2={90} y2={28} stroke="var(--border-mid)" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#sq1)" />
          <text x={96} y={46} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-dim)' }}>10 m</text>
          <text x={90} y={20} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--text-mid)' }}>Arrivée</text>
        </svg>
        {Legend([{ c: AVANT, l: 'avant' }, { c: ARRIERE, l: 'arrière', d: '4 3' }, { c: CHASSE, l: 'pas chassés', d: '2 3' }])}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>Par carré : avant · pas chassés · arrière · pas chassés (un côté chacun). Carré 1 dans un sens, carré 2 en sens inverse. Plots contournés de l'extérieur vers l'intérieur.</div>
      </div>
    );
  }

  // ── SLALOM 10.18 : 10 diagonales ──
  function Slalom() {
    var n = 11, x0 = 20, x1 = 400, yTop = 36, yBot = 120;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var x = x0 + (x1 - x0) * i / (n - 1);
      var y = (i % 2 === 0) ? yBot : yTop;
      pts.push([x, y]);
    }
    var poly = pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    return wrap(
      <div>
        <svg width="100%" viewBox="0 0 420 150" role="img" aria-label="Schéma du Slalom : 10 diagonales de 18 m">
          <defs>{defs('slA', AVANT)}</defs>
          <polyline points={poly} fill="none" stroke={AVANT} strokeWidth="2.2" strokeLinejoin="round" markerEnd="url(#slA)" />
          {pts.map(function (p, i) { return <g key={i}>{plot(p[0], p[1])}</g>; })}
          <text x={x0} y={yBot + 18} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--text-mid)' }}>Départ</text>
          <text x={pts[n - 1][0]} y={yTop - 10} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--text-mid)' }}>Arrivée</text>
        </svg>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>10 diagonales de 18,03 m (~180 m), 9 changements de direction. Plots contournés de l'extérieur vers l'intérieur.</div>
      </div>
    );
  }

  function CadDiagram(props) {
    if (props.name === 'square') return <Square />;
    if (props.name === 'slalom') return <Slalom />;
    if (props.name === 'move') return <Move />;
    return null;
  }
  window.CadDiagram = CadDiagram;
})();
