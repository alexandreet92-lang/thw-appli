/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — schémas des mouvements & parcours (SVG brut).
   Parcours à plots : Square 4×4, Move avant-arrière, Slalom 10.18.
   Sauts : Standing Long Jump, Standing Triple Jump.
   Étapes numérotées ①②③, légende, distances cotées, lisibles clair/sombre.
   Emplacement prévu pour une photo/vidéo à venir. Publie window.CadDiagram :
   <CadDiagram name="square|move|slalom|longjump|triplejump"/>.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var AVANT = '#00c8e0';     // course avant
  var ARRIERE = '#5b6fff';   // course arrière
  var CHASSE = '#f59e0b';    // pas chassés
  var SPRINT = '#22c55e';    // sprint final
  var JUMP = '#00c8e0';      // trajectoire de saut
  var GUIDE = 'var(--border-mid)';

  function arrow(id, color) {
    return (
      <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill={color} />
      </marker>
    );
  }
  // Pastille d'étape numérotée.
  function Step(x, y, n, color) {
    return (
      <g key={'s' + n + x + y}>
        <circle cx={x} cy={y} r={9} fill={color || AVANT} />
        <text x={x} y={y + 3.4} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, fill: '#fff' }}>{n}</text>
      </g>
    );
  }
  function Plot(x, y, label) {
    return (
      <g key={'p' + x + y}>
        <circle cx={x} cy={y} r={5} fill="var(--text)" />
        <circle cx={x} cy={y} r={9} fill="none" stroke="var(--text)" strokeOpacity="0.25" strokeWidth="1" />
        {label ? <text x={x} y={y - 13} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-dim)' }}>{label}</text> : null}
      </g>
    );
  }
  function Flag(x, y, text) {
    return <text key={'f' + x + y} x={x} y={y} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 600, fill: 'var(--text-mid)' }}>{text}</text>;
  }
  function Legend(items) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-mid)' }}>
        {items.map(function (it, i) {
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke={it.c} strokeWidth="2.6" strokeDasharray={it.d || 'none'} /></svg>
              {it.l}
            </span>
          );
        })}
      </div>
    );
  }
  function Wrap(children, legend, caption) {
    return (
      <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 10 }}>
        {children}
        {legend ? Legend(legend) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{caption}</div>
          <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-hover)', border: '1px solid var(--border-mid)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>Photo/vidéo à venir</span>
        </div>
      </div>
    );
  }
  function footR(cx, cy) { return <g key={'fr' + cx + cy}><ellipse cx={cx - 4} cy={cy} rx={3} ry={5} fill="var(--text)" opacity="0.7" /><ellipse cx={cx + 4} cy={cy} rx={3} ry={5} fill="var(--text)" opacity="0.7" /></g>; }
  function footOne(cx, cy) { return <ellipse key={'fo' + cx + cy} cx={cx} cy={cy} rx={3} ry={5} fill="var(--text)" opacity="0.7" />; }

  // ── SQUARE 4×4 : 2 carrés 4×4 m, 10 m de départ-à-départ, carré 2 en sens inverse ──
  function Square() {
    // 30 px/m ; carré de 4 m = 120 px. Axe vertical commun à x=150.
    var cx = 150, s = 120, half = s / 2;
    // carré 1 (bas) : départ coin bas-gauche ; carré 2 (haut) : sens inverse.
    function box(oyTop, reverse, n0) {
      var L = cx - half, R = cx + half, T = oyTop, B = oyTop + s;
      // sens direct : avant (gauche, bas→haut), chassé (haut, g→d), arrière (droite, haut→bas), chassé (bas, d→g)
      // sens inverse : avant (droite, bas→haut), chassé (haut, d→g), arrière (gauche, haut→bas), chassé (bas, g→d)
      var av = reverse
        ? { x1: R, y1: B, x2: R, y2: T } : { x1: L, y1: B, x2: L, y2: T };
      var ch1 = reverse
        ? { x1: R, y1: T, x2: L, y2: T } : { x1: L, y1: T, x2: R, y2: T };
      var ar = reverse
        ? { x1: L, y1: T, x2: L, y2: B } : { x1: R, y1: T, x2: R, y2: B };
      var ch2 = reverse
        ? { x1: L, y1: B, x2: R, y2: B } : { x1: R, y1: B, x2: L, y2: B };
      function seg(d, color, dash, mk) { return <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={color} strokeWidth="2.6" strokeDasharray={dash || 'none'} markerEnd={'url(#' + mk + ')'} />; }
      return (
        <g>
          <rect x={L} y={T} width={s} height={s} fill="none" stroke={GUIDE} strokeWidth="1" rx="3" />
          {seg(av, AVANT, null, 'sqA')}
          {seg(ch1, CHASSE, '3 3', 'sqC')}
          {seg(ar, ARRIERE, '5 3', 'sqR')}
          {seg(ch2, CHASSE, '3 3', 'sqC')}
          {Step((av.x1 + av.x2) / 2 + (reverse ? 14 : -14), (av.y1 + av.y2) / 2, n0, AVANT)}
          {Step((ch1.x1 + ch1.x2) / 2, T - 13, n0 + 1, CHASSE)}
          {Step((ar.x1 + ar.x2) / 2 + (reverse ? -14 : 14), (ar.y1 + ar.y2) / 2, n0 + 2, ARRIERE)}
          {Step((ch2.x1 + ch2.x2) / 2, B + 13, n0 + 3, CHASSE)}
        </g>
      );
    }
    return Wrap(
      <svg width="100%" viewBox="0 0 300 470" role="img" aria-label="Schéma du Square 4×4 : deux carrés de 4 m séparés de 10 m">
        <defs>{arrow('sqA', AVANT)}{arrow('sqR', ARRIERE)}{arrow('sqC', CHASSE)}{arrow('sqG', 'var(--text-dim)')}</defs>
        {/* Départ */}
        {Flag(cx, 455, 'Départ')}
        <line x1={cx} y1={448} x2={cx} y2={422} stroke={GUIDE} strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#sqG)" />
        {/* Carré 1 (bas) — sens direct */}
        {box(300, false, 1)}
        {Flag(cx, 362, 'Carré 1 · 4×4 m')}
        {/* 10 m entre les deux départs de carré */}
        <line x1={cx} y1={298} x2={cx} y2={230} stroke={GUIDE} strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#sqG)" />
        <text x={cx + 8} y={267} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-dim)' }}>10 m</text>
        {/* Carré 2 (haut) — sens inverse */}
        {box(108, true, 5)}
        {Flag(cx, 100, 'Carré 2 · sens inverse')}
        {/* 10 m du départ du carré 2 à l'arrivée */}
        <line x1={cx} y1={106} x2={cx} y2={40} stroke={GUIDE} strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#sqG)" />
        <text x={cx + 8} y={76} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-dim)' }}>10 m</text>
        {Flag(cx, 30, 'Arrivée')}
      </svg>,
      [{ c: AVANT, l: '① avant' }, { c: CHASSE, l: '② ④ pas chassés', d: '3 3' }, { c: ARRIERE, l: '③ arrière', d: '5 3' }],
      "Par carré : avant → pas chassés → arrière → pas chassés (un côté chacun). Carré 1 dans un sens, carré 2 en sens inverse. 10 m entre les départs de carré, puis 10 m jusqu'à l'arrivée. Plots contournés de l'extérieur vers l'intérieur."
    );
  }

  // ── MOVE avant-arrière : navettes 5/10/15 m (avant + retour arrière) puis sprint 30 m ──
  function Move() {
    var x0 = 40, perM = 9;                  // 9 px/m
    var lanes = [{ y: 40, m: 5, n: 1 }, { y: 82, m: 10, n: 3 }, { y: 124, m: 15, n: 5 }];
    return Wrap(
      <svg width="100%" viewBox="0 0 440 210" role="img" aria-label="Schéma du Move : navettes 5, 10, 15 m puis sprint 30 m">
        <defs>{arrow('mvA', AVANT)}{arrow('mvR', ARRIERE)}{arrow('mvS', SPRINT)}</defs>
        {/* ligne de départ commune */}
        <line x1={x0} y1={22} x2={x0} y2={186} stroke={GUIDE} strokeWidth="1.5" strokeDasharray="3 3" />
        {Flag(x0, 16, 'Départ')}
        {lanes.map(function (ln) {
          var xe = x0 + ln.m * perM;
          return (
            <g key={ln.m}>
              <line x1={x0 + 3} y1={ln.y - 5} x2={xe - 3} y2={ln.y - 5} stroke={AVANT} strokeWidth="2.6" markerEnd="url(#mvA)" />
              <line x1={xe - 3} y1={ln.y + 5} x2={x0 + 3} y2={ln.y + 5} stroke={ARRIERE} strokeWidth="2.6" strokeDasharray="5 3" markerEnd="url(#mvR)" />
              {Plot(xe, ln.y, ln.m + ' m')}
              {Step(x0 - 2, ln.y - 5, ln.n, AVANT)}
              {Step(x0 - 2, ln.y + 5, ln.n + 1, ARRIERE)}
            </g>
          );
        })}
        {/* sprint 30 m */}
        <line x1={x0 + 3} y1={172} x2={x0 + 30 * perM} y2={172} stroke={SPRINT} strokeWidth="3" markerEnd="url(#mvS)" />
        {Step(x0 - 2, 172, 7, SPRINT)}
        <text x={x0 + 150} y={166} style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-mid)' }}>Sprint 30 m</text>
      </svg>,
      [{ c: AVANT, l: 'avant' }, { c: ARRIERE, l: 'retour arrière', d: '5 3' }, { c: SPRINT, l: 'sprint' }],
      "Depuis le départ : 5 m en avant, contourner le plot, retour en course arrière ; idem à 10 m puis 15 m. Après le retour du 15 m, sprint de 30 m droit devant. 1 min de récup, ×3, le meilleur compte."
    );
  }

  // ── SLALOM 10.18 : 10 diagonales de 18,03 m ──
  function Slalom() {
    var n = 11, x0 = 24, x1 = 410, yTop = 44, yBot = 132;
    var pts = [];
    for (var i = 0; i < n; i++) { pts.push([x0 + (x1 - x0) * i / (n - 1), (i % 2 === 0) ? yBot : yTop]); }
    var poly = pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    return Wrap(
      <svg width="100%" viewBox="0 0 440 170" role="img" aria-label="Schéma du Slalom : 10 diagonales de 18 m">
        <defs>{arrow('slA', AVANT)}</defs>
        <polyline points={poly} fill="none" stroke={AVANT} strokeWidth="2.6" strokeLinejoin="round" markerEnd="url(#slA)" />
        {pts.map(function (p, i) { return <g key={i}>{Plot(p[0], p[1])}{i < n - 1 ? Step((p[0] + pts[i + 1][0]) / 2, (p[1] + pts[i + 1][1]) / 2, i + 1, AVANT) : null}</g>; })}
        {Flag(x0, yBot + 22, 'Départ')}
        {Flag(pts[n - 1][0], yTop - 12, 'Arrivée')}
      </svg>,
      null,
      "10 diagonales de 18,03 m (~180 m), 9 changements de direction. Plots contournés de l'extérieur vers l'intérieur. 2 essais, le meilleur compte."
    );
  }

  // ── STANDING LONG JUMP : saut en longueur sans élan (vue de profil) ──
  function LongJump() {
    var ground = 150, xs = 80, xe = 300, apex = 56;
    return Wrap(
      <svg width="100%" viewBox="0 0 400 190" role="img" aria-label="Schéma du saut en longueur sans élan">
        <defs>{arrow('ljA', JUMP)}</defs>
        <line x1={24} y1={ground} x2={376} y2={ground} stroke={GUIDE} strokeWidth="1.5" />
        {/* ligne de départ */}
        <line x1={xs} y1={ground} x2={xs} y2={ground - 70} stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="3 3" />
        {Flag(xs, ground - 78, 'Ligne')}
        {/* trajectoire */}
        <path d={'M' + xs + ',' + ground + ' Q' + ((xs + xe) / 2) + ',' + apex + ' ' + xe + ',' + ground} fill="none" stroke={JUMP} strokeWidth="2.6" strokeDasharray="6 4" markerEnd="url(#ljA)" />
        {footR(xs, ground + 8)}
        {footR(xe, ground + 8)}
        {/* mesure */}
        <line x1={xs} y1={ground + 22} x2={xe} y2={ground + 22} stroke="var(--text-dim)" strokeWidth="1" />
        <line x1={xs} y1={ground + 18} x2={xs} y2={ground + 26} stroke="var(--text-dim)" strokeWidth="1" />
        <line x1={xe} y1={ground + 18} x2={xe} y2={ground + 26} stroke="var(--text-dim)" strokeWidth="1" />
        <text x={(xs + xe) / 2} y={ground + 35} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fill: 'var(--text-dim)' }}>distance (talon le plus proche)</text>
        {Step(xs, ground - 70, 1, JUMP)}
        {Step((xs + xe) / 2, apex - 4, 2, JUMP)}
        {Step(xe, ground - 70, 3, JUMP)}
      </svg>,
      null,
      "① Pieds joints derrière la ligne, sans élan. ② Flexion-extension, saut vers l'avant. ③ Réception stabilisée sur les deux pieds. Mesure du bord de la ligne au talon le plus proche. 3 essais, le meilleur compte."
    );
  }

  // ── STANDING TRIPLE JUMP : 3 bonds enchaînés (vue de profil) ──
  function TripleJump() {
    var ground = 150, xs = 44;
    var cps = [xs, 160, 275, 396];   // contacts au sol : départ, bond1, bond2, réception
    function arc(a, b, n) {
      var mid = (a + b) / 2, apex = ground - 54;
      return (
        <g key={n}>
          <path d={'M' + a + ',' + ground + ' Q' + mid + ',' + apex + ' ' + b + ',' + ground} fill="none" stroke={JUMP} strokeWidth="2.6" strokeDasharray="6 4" markerEnd="url(#tjA)" />
          {Step(mid, apex - 2, n, JUMP)}
        </g>
      );
    }
    return Wrap(
      <svg width="100%" viewBox="0 0 440 190" role="img" aria-label="Schéma du triple saut sans élan">
        <defs>{arrow('tjA', JUMP)}</defs>
        <line x1={24} y1={ground} x2={416} y2={ground} stroke={GUIDE} strokeWidth="1.5" />
        {arc(cps[0], cps[1], 1)}
        {arc(cps[1], cps[2], 2)}
        {arc(cps[2], cps[3], 3)}
        {footR(cps[0], ground + 8)}
        {footOne(cps[1], ground + 8)}
        {footOne(cps[2], ground + 8)}
        {footR(cps[3], ground + 8)}
        {Flag(cps[0], ground + 24, 'pieds joints')}
        {Flag(cps[1], ground + 24, '1 pied')}
        {Flag(cps[2], ground + 24, '1 pied')}
        {Flag(cps[3], ground + 24, '2 pieds')}
      </svg>,
      null,
      "Départ pieds joints, sans élan. 3 bonds enchaînés sans arrêt : 1er et 3e appel sur un pied, réception finale sur les deux pieds. Mesure jusqu'au talon le plus proche. 3 essais, le meilleur compte."
    );
  }

  function CadDiagram(props) {
    if (props.name === 'square') return <Square />;
    if (props.name === 'move') return <Move />;
    if (props.name === 'slalom') return <Slalom />;
    if (props.name === 'longjump') return <LongJump />;
    if (props.name === 'triplejump') return <TripleJump />;
    return null;
  }
  window.CadDiagram = CadDiagram;
})();
