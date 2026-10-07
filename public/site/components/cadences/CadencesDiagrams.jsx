/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — schémas des mouvements avec SIMULATION animée.
   Chaque parcours/saut est un tracé continu ordonné : un point (l'athlète)
   le parcourt au clic sur « ▶ Lancer la simulation », avec l'indication de
   la phase en cours (Avant, Pas chassés, Sprint 30 m…). Lisible clair/sombre.
   Publie window.CadDiagram : <CadDiagram name="square|move|slalom|longjump|triplejump"/>.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var AVANT = '#00c8e0';     // course avant
  var ARRIERE = '#5b6fff';   // course arrière
  var CHASSE = '#f59e0b';    // pas chassés
  var SPRINT = '#22c55e';    // sprint
  var JUMP = '#00c8e0';      // saut
  var CONNECT = '#94a3b8';   // liaison / replacement

  function reduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  function dist(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1]; return Math.sqrt(dx * dx + dy * dy); }

  // ── Le moteur de simulation : point animé sur un tracé continu ──
  function CadCourseSim(props) {
    var W = props.w, H = props.h, path = props.path, labels = props.labels, colors = props.colors;
    var segLens = [], total = 0;
    for (var i = 0; i < path.length - 1; i++) { var d = dist(path[i], path[i + 1]); segLens.push(d); total += d; }

    var ps = React.useState(reduced() ? 1 : 0); var prog = ps[0], setProg = ps[1];
    var rs = React.useState('idle'); var run = rs[0], setRun = rs[1];  // idle | playing | done
    var raf = React.useRef(0);

    function play() {
      cancelAnimationFrame(raf.current);
      var dur = Math.max(2600, Math.min(9000, total / 150 * 1000));
      var start = null;
      if (reduced()) { setProg(1); setRun('done'); return; }
      setRun('playing'); setProg(0);
      function step(ts) {
        if (start == null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        setProg(p);
        if (p < 1) raf.current = requestAnimationFrame(step); else setRun('done');
      }
      raf.current = requestAnimationFrame(step);
    }
    React.useEffect(function () { return function () { cancelAnimationFrame(raf.current); }; }, []);

    // position + segment courant à la progression `prog`
    function at(p) {
      var target = p * total, acc = 0;
      for (var k = 0; k < segLens.length; k++) {
        if (acc + segLens[k] >= target || k === segLens.length - 1) {
          var lt = segLens[k] ? (target - acc) / segLens[k] : 1; lt = Math.max(0, Math.min(1, lt));
          return { k: k, x: path[k][0] + (path[k + 1][0] - path[k][0]) * lt, y: path[k][1] + (path[k + 1][1] - path[k][1]) * lt };
        }
        acc += segLens[k];
      }
      return { k: segLens.length - 1, x: path[path.length - 1][0], y: path[path.length - 1][1] };
    }
    var cur = at(prog);
    var curSeg = run === 'idle' ? -1 : cur.k;

    return (
      <div style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 10, maxWidth: props.maxWidth || 460 }}>
        {/* bannière d'indication */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 24 }}>
            {curSeg >= 0 ? (
              <React.Fragment>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: colors[curSeg], flex: '0 0 auto' }}></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>Étape {curSeg + 1}/{labels.length}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{labels[curSeg]}</span>
              </React.Fragment>
            ) : (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)' }}>Appuie sur « Lancer » pour voir le parcours.</span>
            )}
          </div>
          <button type="button" onClick={play}
                  style={{ flex: '0 0 auto', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--brand-gradient)', border: 'none', borderRadius: 999, padding: '7px 15px', cursor: 'pointer', boxShadow: '0 3px 12px rgba(0,200,224,.3)' }}>
            {run === 'playing' ? 'Relancer' : run === 'done' ? '↻ Rejouer' : '▶ Lancer la simulation'}
          </button>
        </div>

        <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={props.aria || 'Schéma animé du parcours'} style={{ display: 'block' }}>
          {props.extras}
          {/* tracé complet, faible */}
          {path.slice(0, -1).map(function (p, j) {
            return <line key={'f' + j} x1={p[0]} y1={p[1]} x2={path[j + 1][0]} y2={path[j + 1][1]} stroke={colors[j]} strokeWidth={3} strokeLinecap="round" opacity={0.18} />;
          })}
          {/* trace parcourue, vive */}
          {path.slice(0, -1).map(function (p, j) {
            if (run === 'idle' || j > cur.k) return null;
            var ex = (j < cur.k) ? path[j + 1][0] : cur.x, ey = (j < cur.k) ? path[j + 1][1] : cur.y;
            return <line key={'t' + j} x1={p[0]} y1={p[1]} x2={ex} y2={ey} stroke={colors[j]} strokeWidth={3.4} strokeLinecap="round" />;
          })}
          {/* le point (athlète) */}
          {run !== 'idle' ? (
            <g>
              <circle cx={cur.x} cy={cur.y} r={9} fill={colors[cur.k]} opacity={0.25} />
              <circle cx={cur.x} cy={cur.y} r={5.5} fill={colors[cur.k]} stroke="#fff" strokeWidth={2} />
            </g>
          ) : null}
        </svg>
        {props.legend ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-mid)' }}>
            {props.legend.map(function (it, i) {
              return <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 3, borderRadius: 2, background: it.c }}></span>{it.l}</span>;
            })}
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{props.caption}</div>
          <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-hover)', border: '1px solid var(--border-mid)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>Photo/vidéo à venir</span>
        </div>
      </div>
    );
  }

  function plot(x, y, label) {
    return (
      <g key={'p' + x + '_' + y}>
        <circle cx={x} cy={y} r={4.5} fill="var(--text)" />
        {label ? <text x={x} y={y - 10} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, fill: 'var(--text-mid)' }}>{label}</text> : null}
      </g>
    );
  }
  function flag(x, y, t) { return <text key={'fl' + x + '_' + y} x={x} y={y} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, fill: 'var(--text)' }}>{t}</text>; }
  function dim(x, y, t) { return <text key={'dm' + x + '_' + y} x={x} y={y} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, fill: 'var(--text-dim)' }}>{t}</text>; }
  function footR(cx, cy) { return <g key={'fr' + cx}><ellipse cx={cx - 4} cy={cy} rx={3} ry={5} fill="var(--text)" opacity="0.7" /><ellipse cx={cx + 4} cy={cy} rx={3} ry={5} fill="var(--text)" opacity="0.7" /></g>; }
  function footOne(cx, cy) { return <ellipse key={'fo' + cx} cx={cx} cy={cy} rx={3} ry={5} fill="var(--text)" opacity="0.7" />; }

  // ── SQUARE 4×4 (carrés décalés, un seul couleur) ──
  function squareData() {
    var L1 = 40, R1 = 120, T1 = 50, B1 = 130;    // carré 1 · haut-gauche
    var L2 = 170, R2 = 250, T2 = 170, B2 = 250;  // carré 2 · bas-droite
    var path = [
      [80, 152], [L1, B1], [L1, T1], [R1, T1], [R1, B1], [L1, B1],
      [L2, T2], [R2, T2], [R2, B2], [L2, B2], [L2, T2], [285, 112],
    ];
    var labels = ['Départ → carré 1', 'Avant', 'Pas chassés', 'Arrière', 'Pas chassés',
      '10 m → carré 2', 'Pas chassés', 'Arrière', 'Pas chassés', 'Avant', '→ Arrivée'];
    var colors = labels.map(function () { return AVANT; });
    var extras = (
      <g>
        <rect x={L1} y={T1} width={80} height={80} fill="none" stroke="var(--border-mid)" strokeWidth={1} rx={3} />
        <rect x={L2} y={T2} width={80} height={80} fill="none" stroke="var(--border-mid)" strokeWidth={1} rx={3} />
        {[[L1, T1], [R1, T1], [L1, B1], [R1, B1], [L2, T2], [R2, T2], [L2, B2], [R2, B2]].map(function (p, i) { return <circle key={i} cx={p[0]} cy={p[1]} r={3.6} fill="var(--text)" />; })}
        {flag(80, 44, 'Carré 1')}{flag(210, 164, 'Carré 2 · sens inverse')}
        {flag(80, 172, 'Départ')}{flag(285, 100, 'Arrivée')}
        {dim(80, 146, '4 m')}{dim(128, 152, '10 m')}
      </g>
    );
    return { w: 320, h: 285, maxWidth: 380, path: path, labels: labels, colors: colors, extras: extras, legend: null,
      aria: 'Simulation du Square 4×4',
      caption: "Deux carrés de 4 m décalés, séparés de 10 m. Par carré : avant → pas chassés → arrière → pas chassés. Carré 1 dans un sens, carré 2 en sens inverse. Plots contournés de l'extérieur vers l'intérieur." };
  }

  // ── MOVE avant-arrière (plots sur une même ligne, un seul couleur) ──
  function moveData() {
    var x0 = 40, perM = 9, y = 70;
    var c5 = x0 + 5 * perM, c10 = x0 + 10 * perM, c15 = x0 + 15 * perM, se = x0 + 30 * perM;
    var path = [[x0, y], [c5, y], [x0, y], [c10, y], [x0, y], [c15, y], [x0, y], [se, y]];
    var labels = ['Avant 5 m', 'Retour arrière', 'Avant 10 m', 'Retour arrière', 'Avant 15 m', 'Retour arrière', 'Sprint 30 m'];
    var colors = labels.map(function () { return AVANT; });
    var extras = (
      <g>
        <line x1={x0} y1={46} x2={x0} y2={94} stroke="var(--border-mid)" strokeWidth={1.5} strokeDasharray="3 3" />
        {flag(x0, 40, 'Départ')}
        {plot(c5, y, '5 m')}{plot(c10, y, '10 m')}{plot(c15, y, '15 m')}
        {dim(se - 40, 90, 'Sprint 30 m')}
      </g>
    );
    return { w: 360, h: 110, maxWidth: 460, path: path, labels: labels, colors: colors, extras: extras, legend: null,
      aria: 'Simulation du Move avant-arrière',
      caption: "Tous les plots sur une même ligne. 5 m avant, contourner, retour arrière ; idem 10 m puis 15 m. Après le retour du 15 m, sprint de 30 m. 3 passages, 1 min 30 de récup : meilleur temps + total des 3." };
  }

  // ── SLALOM 10.18 ──
  function slalomData() {
    var n = 11, x0 = 24, x1 = 410, yTop = 44, yBot = 132, pts = [];
    for (var i = 0; i < n; i++) { pts.push([x0 + (x1 - x0) * i / (n - 1), (i % 2 === 0) ? yBot : yTop]); }
    var labels = [], colors = [];
    for (var j = 0; j < n - 1; j++) { labels.push('Diagonale ' + (j + 1) + '/10'); colors.push(AVANT); }
    var extras = (
      <g>
        {pts.map(function (p, i) { return plot(p[0], p[1]); })}
        {flag(pts[0][0], yBot + 20, 'Départ')}{flag(pts[n - 1][0], yTop - 10, 'Arrivée')}
      </g>
    );
    return { w: 440, h: 170, maxWidth: 520, path: pts, labels: labels, colors: colors, extras: extras, legend: null,
      aria: 'Simulation du Slalom', caption: "10 diagonales de 18,03 m (~180 m), 9 changements de direction. Plots contournés de l'extérieur vers l'intérieur. 3 passages, 1 min 30 de récup : meilleur temps + total des 3." };
  }

  function sampleQuad(p0, c, p1, steps) {
    var out = [];
    for (var i = 0; i <= steps; i++) { var t = i / steps, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); }
    return out;
  }

  // ── STANDING LONG JUMP ──
  function longJumpData() {
    var ground = 150, xs = 80, xe = 300, apex = 48;
    var pts = sampleQuad([xs, ground], [(xs + xe) / 2, apex], [xe, ground], 12);
    var labels = [], colors = [];
    for (var i = 0; i < pts.length - 1; i++) { var t = i / (pts.length - 1); labels.push(t < 0.18 ? 'Impulsion' : (t > 0.8 ? 'Réception' : 'Saut')); colors.push(JUMP); }
    var extras = (
      <g>
        <line x1={24} y1={ground} x2={376} y2={ground} stroke="var(--border-mid)" strokeWidth={1.5} />
        <line x1={xs} y1={ground} x2={xs} y2={ground - 68} stroke="var(--text-dim)" strokeWidth={1.5} strokeDasharray="3 3" />
        {flag(xs, ground - 76, 'Ligne')}
        {footR(xs, ground + 8)}{footR(xe, ground + 8)}
        <line x1={xs} y1={ground + 22} x2={xe} y2={ground + 22} stroke="var(--text-dim)" strokeWidth={1} />
        <line x1={xs} y1={ground + 18} x2={xs} y2={ground + 26} stroke="var(--text-dim)" strokeWidth={1} />
        <line x1={xe} y1={ground + 18} x2={xe} y2={ground + 26} stroke="var(--text-dim)" strokeWidth={1} />
        <text x={(xs + xe) / 2} y={ground + 35} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fill: 'var(--text-dim)' }}>distance (talon le plus proche)</text>
      </g>
    );
    return { w: 400, h: 190, maxWidth: 440, path: pts, labels: labels, colors: colors, extras: extras, legend: null,
      aria: 'Simulation du saut en longueur', caption: "Pieds joints derrière la ligne, sans élan. Flexion-extension, saut vers l'avant, réception sur les deux pieds. Mesure au talon le plus proche. 3 essais : meilleur saut + total des 3." };
  }

  // ── STANDING TRIPLE JUMP ──
  function tripleJumpData() {
    var ground = 150, apex = ground - 50, cps = [44, 160, 275, 396], path = [], labels = [], colors = [];
    for (var a = 0; a < 3; a++) {
      var arc = sampleQuad([cps[a], ground], [(cps[a] + cps[a + 1]) / 2, apex], [cps[a + 1], ground], 6);
      for (var i = (a === 0 ? 0 : 1); i < arc.length; i++) { path.push(arc[i]); }
    }
    for (var s = 0; s < path.length - 1; s++) { var seg = path[s][0]; labels.push(seg < cps[1] ? 'Bond 1' : seg < cps[2] ? 'Bond 2' : 'Bond 3'); colors.push(JUMP); }
    var extras = (
      <g>
        <line x1={24} y1={ground} x2={416} y2={ground} stroke="var(--border-mid)" strokeWidth={1.5} />
        {footR(cps[0], ground + 8)}{footOne(cps[1], ground + 8)}{footOne(cps[2], ground + 8)}{footR(cps[3], ground + 8)}
        {flag(cps[0], ground + 24, 'pieds joints')}{flag(cps[1], ground + 24, '1 pied')}{flag(cps[2], ground + 24, '1 pied')}{flag(cps[3], ground + 24, '2 pieds')}
      </g>
    );
    return { w: 440, h: 190, maxWidth: 480, path: path, labels: labels, colors: colors, extras: extras, legend: null,
      aria: 'Simulation du triple saut', caption: "Départ pieds joints. 3 bonds enchaînés sans arrêt : 1er et 3e appel sur un pied, réception finale sur les deux pieds. 3 essais : meilleur saut + total des 3." };
  }

  function CadDiagram(props) {
    var data = null;
    if (props.name === 'square') data = squareData();
    else if (props.name === 'move') data = moveData();
    else if (props.name === 'slalom') data = slalomData();
    else if (props.name === 'longjump') data = longJumpData();
    else if (props.name === 'triplejump') data = tripleJumpData();
    if (!data) return null;
    return <CadCourseSim {...data} />;
  }
  window.CadDiagram = CadDiagram;
})();
