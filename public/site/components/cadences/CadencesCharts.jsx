/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — graphiques SVG bruts (aucune lib de chart).
   Donut (G1), 7 anneaux (G3), radar 7 axes (G4), barres (G5).
   Animés à l'entrée (coupés si prefers-reduced-motion). Pistes lisibles
   en clair ET sombre. Publie CadScoreDonut, CadQualityRings, CadRadar,
   CadTestBar.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var TRACK = 'rgba(128,140,160,0.25)';   // piste neutre, visible clair + sombre
  var GRID = 'rgba(128,140,160,0.30)';
  var BRAND = '#00c8e0';

  function reduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  // Hook : passe de false à true au montage (déclenche la transition CSS).
  function useEnter() {
    var s = React.useState(reduced());
    React.useEffect(function () {
      if (s[0]) return;
      var id = requestAnimationFrame(function () { requestAnimationFrame(function () { s[1](true); }); });
      return function () { cancelAnimationFrame(id); };
    }, []);
    return s[0];
  }

  /* G1 — donut du score global (total / max). Au-delà du max : anneau plein. */
  function CadScoreDonut(props) {
    var on = useEnter();
    var size = props.size || 200;
    var total = props.total || 0;
    var max = props.totalMax || 1000;
    var color = props.color || BRAND;
    var r = size / 2 - 14;
    var c = 2 * Math.PI * r;
    var frac = Math.max(0, Math.min(1, total / max));
    var over = Math.max(0, Math.round(total - max));
    var cx = size / 2;
    var shown = on ? frac : 0;
    return (
      <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img"
               aria-label={'Score ' + Math.round(total) + ' sur ' + max + ', niveau ' + props.level}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={TRACK} strokeWidth={13}/>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={13} strokeLinecap="round"
                    strokeDasharray={(c * shown) + ' ' + c} transform={'rotate(-90 ' + cx + ' ' + cx + ')'}
                    style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)', filter: 'drop-shadow(0 0 6px ' + color + '55)' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.04em', fontSize: size * 0.25, lineHeight: 1, color: 'var(--text)' }}>{Math.round(total)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>/ {max}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 7, color: color }}>{props.level}</div>
            </div>
          </div>
        </div>
        {over > 0 ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500, color: color }}>+{over} au-delà du Max</span> : null}
      </div>
    );
  }

  /* G3 — 7 mini-anneaux, un par qualité (plein = Exceptionnel, pct/1.2). */
  function CadQualityRings(props) {
    var items = props.items || [];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 16 }}>
        {items.map(function (q, i) { return React.createElement(Ring, { key: q.key, q: q, delay: i * 60 }); })}
      </div>
    );
  }
  function Ring(props) {
    var on = useEnter();
    var q = props.q;
    var size = 76, r = size / 2 - 6, c = 2 * Math.PI * r, cx = size / 2;
    var frac = Math.max(0, Math.min(1, (q.pct || 0) / 1.2));
    var shown = on ? frac : 0;
    return (
      <div style={{ display: 'grid', placeItems: 'center', gap: 4, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img"
               aria-label={q.label + ' : ' + Math.round((q.pct || 0) * 100) + ' %, ' + q.level}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={TRACK} strokeWidth={6}/>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={q.color} strokeWidth={6} strokeLinecap="round"
                    strokeDasharray={(c * shown) + ' ' + c} transform={'rotate(-90 ' + cx + ' ' + cx + ')'}
                    style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1) ' + (props.delay || 0) + 'ms' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>{Math.round((q.pct || 0) * 100)}%</span>
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{q.label}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--text-dim)' }}>{q.level}</span>
      </div>
    );
  }

  /* G4 — radar 7 axes. Rayon = pct/1.2 (Exceptionnel = plein). Repères 60 % / 100 %. */
  function CadRadar(props) {
    var on = useEnter();
    var items = props.items || [];
    var n = items.length || 7;
    var size = props.size || 300;
    var cx = size / 2, cy = size / 2;
    var R = size / 2 - 34;
    var color = props.color || BRAND;
    function pt(i, rad) {
      var a = -Math.PI / 2 + i * (2 * Math.PI / n);
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    }
    function polyAt(frac) {
      return items.map(function (_, i) { var p = pt(i, R * frac); return p[0] + ',' + p[1]; }).join(' ');
    }
    var valPoly = items.map(function (q, i) {
      var f = on ? Math.max(0, Math.min(1, (q.pct || 0) / 1.2)) : 0;
      var p = pt(i, R * f); return p[0] + ',' + p[1];
    }).join(' ');
    return (
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img" aria-label="Radar des 7 qualités">
          {/* grille : anneaux de fond + repères 60 % et 100 % */}
          {[0.3, 0.6, 0.833, 1].map(function (f, i) {
            return <polygon key={i} points={polyAt(f)} fill="none" stroke={GRID} strokeWidth={f === 0.6 || f === 0.833 ? 1.1 : 0.6}
                            strokeDasharray={f === 0.6 ? '3 3' : 'none'}/>;
          })}
          {/* axes */}
          {items.map(function (_, i) { var p = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke={GRID} strokeWidth={0.6}/>; })}
          {/* valeur */}
          <polygon points={valPoly} fill={color + '33'} stroke={color} strokeWidth={2} strokeLinejoin="round"
                   style={{ transition: 'all .9s cubic-bezier(.22,1,.36,1)' }}/>
          {items.map(function (q, i) {
            var f = on ? Math.max(0, Math.min(1, (q.pct || 0) / 1.2)) : 0;
            var p = pt(i, R * f);
            return <circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill={q.color || color} style={{ transition: 'all .9s cubic-bezier(.22,1,.36,1)' }}/>;
          })}
          {/* libellés */}
          {items.map(function (q, i) {
            var p = pt(i, R + 16);
            var anchor = Math.abs(p[0] - cx) < 6 ? 'middle' : (p[0] > cx ? 'start' : 'end');
            return <text key={i} x={p[0]} y={p[1] + 3} textAnchor={anchor}
                         style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 600, fill: 'var(--text-mid)' }}>{q.label}</text>;
          })}
        </svg>
      </div>
    );
  }

  /* G5 — barre points/% d'une épreuve, repères 60 % (Réf) et 100 % (Max). */
  function CadTestBar(props) {
    var on = useEnter();
    var target = Math.max(0, Math.min(100, (props.pct || 0) * 100));
    var w = on ? target : 0;
    return (
      <svg width="100%" height={12} viewBox="0 0 100 12" preserveAspectRatio="none" role="img"
           aria-label={Math.round((props.pct || 0) * 100) + ' %'}>
        <rect x={0} y={3} width={100} height={6} rx={3} fill={TRACK}/>
        <rect x={0} y={3} width={w} height={6} rx={3} fill={props.color}
              style={{ transition: 'width .7s cubic-bezier(.22,1,.36,1)' }}/>
        <line x1={60} y1={1} x2={60} y2={11} stroke={GRID} strokeWidth={0.7}/>
        <line x1={99.4} y1={1} x2={99.4} y2={11} stroke={GRID} strokeWidth={0.7}/>
      </svg>
    );
  }

  Object.assign(window, { CadScoreDonut: CadScoreDonut, CadQualityRings: CadQualityRings, CadRadar: CadRadar, CadTestBar: CadTestBar });
})();
