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
    var PAD = 52;                 // marge pour les libellés (hors du cercle)
    var cx = size / 2, cy = size / 2;
    var R = size / 2 - 10;
    var color = props.color || BRAND;
    var SHORT = { 'Puissance': 'Puiss.', 'Explosivité': 'Explo.', 'Endurance': 'Endur.', 'VO2max': 'VO₂max', 'Coordination': 'Coord.' };
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
        <svg width={size} height={size} viewBox={(-PAD) + ' ' + (-PAD) + ' ' + (size + 2 * PAD) + ' ' + (size + 2 * PAD)} role="img" aria-label="Radar des 7 qualités">
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
                         style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 600, fill: 'var(--text-mid)' }}>{SHORT[q.label] || q.label}</text>;
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

  /* Répartition des points par famille — barres horizontales animées. */
  function CadPointsByFamily(props) {
    var on = useEnter();
    var data = props.data || [];
    var maxv = Math.max.apply(null, data.map(function (d) { return d.pts; }).concat([1]));
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {data.map(function (d, i) {
          var w = on ? Math.max(3, (d.pts / maxv) * 100) : 0;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 46px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-mid)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
              <svg width="100%" height={14} viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label={d.label + ' : ' + d.pts + ' points'}>
                <rect x={0} y={3} width={100} height={8} rx={4} fill={TRACK} />
                <rect x={0} y={3} width={w} height={8} rx={4} fill={d.color || BRAND} style={{ transition: 'width .8s cubic-bezier(.22,1,.36,1) ' + (i * 50) + 'ms' }} />
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>{d.pts}</span>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Primitive « courbes dans le temps » (multi-séries, SVG brut, aucune lib). ──
     Sert : vieillissement des systèmes (curseur d'âge qui balaye + valeurs vivantes),
     sédentaire vs entraîné (aire « années gagnées »), trajectoire A/B (jalons).
     Respecte prefers-reduced-motion (pas de balayage). */
  function lEaseOut(t) { return 1 - Math.pow(1 - t, 3); }
  function lEaseInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function valueAt(points, x) {
    var n = points.length;
    if (!n) return 0;
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[n - 1][0]) return points[n - 1][1];
    for (var i = 0; i < n - 1; i++) {
      if (x >= points[i][0] && x <= points[i + 1][0]) {
        var t = (x - points[i][0]) / (points[i + 1][0] - points[i][0]);
        return points[i][1] + t * (points[i + 1][1] - points[i][1]);
      }
    }
    return points[n - 1][1];
  }
  function smoothPath(px) {
    if (px.length < 2) return px.length ? 'M' + px[0][0] + ',' + px[0][1] : '';
    var d = 'M' + px[0][0] + ',' + px[0][1];
    for (var i = 0; i < px.length - 1; i++) {
      var p0 = px[i - 1] || px[i], p1 = px[i], p2 = px[i + 1], p3 = px[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  function CadLineChart(props) {
    var series = props.series || [];
    var x0 = (props.xDomain && props.xDomain[0]) != null ? props.xDomain[0] : 0;
    var x1 = (props.xDomain && props.xDomain[1]) != null ? props.xDomain[1] : 80;
    var y0 = (props.yDomain && props.yDomain[0]) != null ? props.yDomain[0] : 0;
    var y1 = (props.yDomain && props.yDomain[1]) != null ? props.yDomain[1] : 100;
    var W = 560, H = props.height || 300;
    var PADL = 30, PADR = props.sweep ? 68 : 92, PADT = 18, PADB = 34;
    var xTicks = props.xTicks || [0, 10, 20, 30, 40, 50, 60, 70, 80];
    var yTicks = props.yTicks || [0, 20, 40, 60, 80, 100];
    var sweep = !!props.sweep && !reduced();
    var focusX = props.focusX != null ? props.focusX : x1;

    function sx(x) { return PADL + (x - x0) / (x1 - x0) * (W - PADR - PADL); }
    function sy(y) { return (H - PADB) - (y - y0) / (y1 - y0) * (H - PADB - PADT); }

    var caState = React.useState(sweep ? x0 : focusX);
    var ca = caState[0], setCa = caState[1];
    React.useEffect(function () {
      if (!sweep) { setCa(focusX); return; }
      var raf, start = null, dur = 2600;
      function step(ts) {
        if (start == null) start = ts;
        var p = Math.min(1, (ts - start) / dur), age;
        if (p < 0.72) age = x0 + (x1 - x0) * lEaseOut(p / 0.72);
        else age = x1 + (focusX - x1) * lEaseInOut((p - 0.72) / 0.28);
        setCa(age);
        if (p < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
      return function () { cancelAnimationFrame(raf); };
    }, []);

    function partialPx(points) {
      var out = [];
      for (var i = 0; i < points.length; i++) { if (points[i][0] <= ca) out.push(points[i]); }
      if (!out.length) out.push([x0, valueAt(points, x0)]);
      if (ca < points[points.length - 1][0]) out.push([ca, valueAt(points, ca)]);
      return out.map(function (p) { return [sx(p[0]), sy(p[1])]; });
    }
    function fullPx(points) { return points.map(function (p) { return [sx(p[0]), sy(p[1])]; }); }
    function densePx(points) { var o = []; for (var x = x0; x <= x1 + 0.001; x += 1) o.push([sx(x), sy(valueAt(points, x))]); return o; }

    var tipX = sx(ca);
    var leftSide = sweep && tipX > (W - PADR - 10);
    var badgeX = leftSide ? tipX - 10 : tipX + 10;

    // Positions verticales des badges (anti-collision).
    var bl = series.map(function (s) { return { key: s.key, y: sy(valueAt(s.points, ca)) }; });
    bl.sort(function (a, b) { return a.y - b.y; });
    var GAP = 17;
    for (var ii = 1; ii < bl.length; ii++) { if (bl[ii].y - bl[ii - 1].y < GAP) bl[ii].y = bl[ii - 1].y + GAP; }
    var over = bl.length ? bl[bl.length - 1].y - (H - PADB) : 0;
    if (over > 0) { for (var jj = 0; jj < bl.length; jj++) bl[jj].y -= over; }
    var under = bl.length ? bl[0].y - PADT : 0;
    if (under < 0) { for (var kk = 0; kk < bl.length; kk++) bl[kk].y -= under; }
    var badgeY = {}; bl.forEach(function (b) { badgeY[b.key] = b.y; });

    var area = null;
    if (props.areaBetween) {
      var sa = series.filter(function (s) { return s.key === props.areaBetween.a; })[0];
      var sb = series.filter(function (s) { return s.key === props.areaBetween.b; })[0];
      if (sa && sb) {
        var up = densePx(sa.points), dn = densePx(sb.points).slice().reverse();
        area = 'M ' + up.map(function (p) { return p[0] + ',' + p[1]; }).join(' L ') + ' L ' + dn.map(function (p) { return p[0] + ',' + p[1]; }).join(' L ') + ' Z';
      }
    }

    return (
      <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={props.aria || 'Graphique'} style={{ display: 'block' }}>
        {yTicks.map(function (t, i) {
          return (
            <g key={'y' + i}>
              <line x1={PADL} y1={sy(t)} x2={W - PADR} y2={sy(t)} stroke={GRID} strokeWidth={t === y0 ? 1 : 0.5} strokeDasharray={t === y0 ? 'none' : '2 4'} />
              <text x={PADL - 6} y={sy(t) + 3} textAnchor="end" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}>{t}</text>
            </g>
          );
        })}
        {xTicks.map(function (t, i) {
          return <text key={'x' + i} x={sx(t)} y={H - PADB + 15} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-dim)' }}>{t}</text>;
        })}
        <text x={W - PADR + 4} y={H - PADB + 15} textAnchor="start" style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: 'var(--text-dim)', fontStyle: 'italic' }}>ans</text>

        {area ? <path d={area} fill={(props.areaBetween.color || BRAND) + '22'} stroke="none" /> : null}
        {sweep ? <line x1={tipX} y1={PADT} x2={tipX} y2={H - PADB} stroke={BRAND} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} /> : null}
        {sweep ? series.map(function (s) {
          return <path key={'g' + s.key} d={smoothPath(fullPx(s.points))} fill="none" stroke={s.color} strokeWidth={1.4} opacity={0.14} />;
        }) : null}
        {series.map(function (s) {
          return <path key={'l' + s.key} d={smoothPath(partialPx(s.points))} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash || 'none'} />;
        })}
        {(props.markers || []).map(function (m, i) {
          return (
            <g key={'m' + i}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={3.6} fill="var(--bg-card)" stroke={m.color || BRAND} strokeWidth={2} />
              {m.label ? <text x={sx(m.x)} y={sy(m.y) + (m.below ? 15 : -9)} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 9.5, fontWeight: 600, fill: 'var(--text-mid)' }}>{m.label}</text> : null}
            </g>
          );
        })}
        {series.map(function (s) {
          var v = valueAt(s.points, ca); var ty = sy(v), by = badgeY[s.key];
          return (
            <g key={'b' + s.key}>
              <line x1={tipX} y1={ty} x2={badgeX} y2={by} stroke={s.color} strokeWidth={0.8} opacity={0.5} />
              <circle cx={tipX} cy={ty} r={3} fill={s.color} />
              <circle cx={badgeX} cy={by} r={3} fill={s.color} />
              <text x={leftSide ? badgeX - 7 : badgeX + 7} y={by + 3.5} textAnchor={leftSide ? 'end' : 'start'}
                    style={{ fontFamily: s.endLabel ? 'var(--font-body)' : 'var(--font-mono)', fontSize: s.endLabel ? 10.5 : 11.5, fontWeight: 700, fill: s.color }}>{s.endLabel || Math.round(v)}</text>
            </g>
          );
        })}
        {sweep ? (
          <text x={(PADL + (W - PADR)) / 2} y={H - PADB - 8} textAnchor="middle">
            <tspan style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-dim)' }}>Âge </tspan>
            <tspan style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, fill: 'var(--text)' }}>{Math.round(ca)}</tspan>
          </text>
        ) : null}
      </svg>
    );
  }

  Object.assign(window, { CadScoreDonut: CadScoreDonut, CadQualityRings: CadQualityRings, CadRadar: CadRadar, CadTestBar: CadTestBar, CadPointsByFamily: CadPointsByFamily, CadLineChart: CadLineChart });
})();
