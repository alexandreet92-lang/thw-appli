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
  // Hook : détecte quand l'élément entre à l'écran (IntersectionObserver), ré-armé
  // en sortie pour pouvoir rejouer. prefers-reduced-motion ou absence d'API →
  // considéré visible d'emblée (état final montré, pas d'animation différée).
  // Renvoie [ref, inView] — poser la ref sur l'élément racine.
  function useInView(opts) {
    var ref = React.useRef(null);
    var skip = reduced() || typeof IntersectionObserver === 'undefined';
    var st = React.useState(skip);
    var inView = st[0], setInView = st[1];
    React.useEffect(function () {
      if (skip) return;
      var el = ref.current; if (!el) return;
      var io = new IntersectionObserver(function (entries) { setInView(entries[0].isIntersecting); },
        { threshold: (opts && opts.threshold) || 0.35 });
      io.observe(el);
      return function () { io.disconnect(); };
    }, []);
    return [ref, inView];
  }
  // Hook : passe à true quand l'élément entre à l'écran (déclenche la transition
  // CSS de remplissage), repasse à false en sortie (rejoue). Renvoie [ref, on].
  function useEnter() { return useInView(); }

  /* G1 — donut du score global (total / max). Au-delà du max : anneau plein. */
  function CadScoreDonut(props) {
    var en = useEnter(); var enRef = en[0], on = en[1];
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
      <div ref={enRef} style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
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

  /* G3 — 7 mini-anneaux, un par qualité (plein = Extraterrestre, pct/1.1). */
  function CadQualityRings(props) {
    var items = props.items || [];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 16 }}>
        {items.map(function (q, i) { return React.createElement(Ring, { key: q.key, q: q, delay: i * 60 }); })}
      </div>
    );
  }
  function Ring(props) {
    var en = useEnter(); var enRef = en[0], on = en[1];
    var q = props.q;
    var size = 76, r = size / 2 - 6, c = 2 * Math.PI * r, cx = size / 2;
    var frac = Math.max(0, Math.min(1, (q.pct || 0) / 1.1));
    var shown = on ? frac : 0;
    return (
      <div ref={enRef} style={{ display: 'grid', placeItems: 'center', gap: 4, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img"
               aria-label={q.label + ' : ' + Math.round((q.pct || 0) * 100) + ' %, ' + q.level}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={TRACK} strokeWidth={6}/>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={q.color} strokeWidth={6} strokeLinecap="round"
                    strokeDasharray={(c * shown) + ' ' + c} transform={'rotate(-90 ' + cx + ' ' + cx + ')'}
                    style={{ transition: 'stroke-dasharray .7s cubic-bezier(.22,1,.36,1) ' + (props.delay || 0) + 'ms' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>{q.pending ? '—' : Math.round((q.pct || 0) * 100) + '%'}</span>
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{q.label}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--text-dim)' }}>{q.level}</span>
      </div>
    );
  }

  /* G4 — radar 7 axes. Rayon = pct/1.1 (Extraterrestre = plein). Repères 60 % / 100 %. */
  function CadRadar(props) {
    var en = useEnter(); var enRef = en[0], on = en[1];
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
      var f = on ? Math.max(0, Math.min(1, (q.pct || 0) / 1.1)) : 0;
      var p = pt(i, R * f); return p[0] + ',' + p[1];
    }).join(' ');
    return (
      <div ref={enRef} style={{ display: 'grid', placeItems: 'center' }}>
        <svg width={size} height={size} viewBox={(-PAD) + ' ' + (-PAD) + ' ' + (size + 2 * PAD) + ' ' + (size + 2 * PAD)} role="img" aria-label="Radar des 7 qualités">
          {/* grille : anneaux de fond + repères Réf (60 %) et Max (100 %), échelle /1.1 */}
          {[0.3, 0.6 / 1.1, 1 / 1.1, 1].map(function (f, i) {
            return <polygon key={i} points={polyAt(f)} fill="none" stroke={GRID} strokeWidth={i === 1 || i === 2 ? 1.1 : 0.6}
                            strokeDasharray={i === 1 ? '3 3' : 'none'}/>;
          })}
          {/* axes */}
          {items.map(function (_, i) { var p = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke={GRID} strokeWidth={0.6}/>; })}
          {/* valeur */}
          <polygon points={valPoly} fill={color + '33'} stroke={color} strokeWidth={2} strokeLinejoin="round"
                   style={{ transition: 'all .9s cubic-bezier(.22,1,.36,1)' }}/>
          {items.map(function (q, i) {
            var f = on ? Math.max(0, Math.min(1, (q.pct || 0) / 1.1)) : 0;
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
    var en = useEnter(); var enRef = en[0], on = en[1];
    var target = Math.max(0, Math.min(100, (props.pct || 0) * 100));
    var w = on ? target : 0;
    return (
      <svg ref={enRef} width="100%" height={12} viewBox="0 0 100 12" preserveAspectRatio="none" role="img"
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
    var en = useEnter(); var enRef = en[0], on = en[1];
    var data = props.data || [];
    var maxv = Math.max.apply(null, data.map(function (d) { return d.pts; }).concat([1]));
    return (
      <div ref={enRef} style={{ display: 'grid', gap: 10 }}>
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

    // Le balayage se déclenche quand le graphe entre à l'écran (et au clic « Rejouer »
    // via replayNonce). Hors sweep / reduced-motion : état final (poster statique).
    var iv = useInView(); var chartRef = iv[0], inView = iv[1];
    var caState = React.useState(focusX);
    var ca = caState[0], setCa = caState[1];
    var hs = React.useState(null); var hoverAge = hs[0], setHoverAge = hs[1];
    var hovering = props.hover && hoverAge != null;
    function onHoverMove(e) {
      if (!props.hover) return;
      var el = chartRef.current; if (!el) return;
      var r = el.getBoundingClientRect(); if (!r.width) return;
      var svgX = (e.clientX - r.left) / r.width * W;
      var age = x0 + (svgX - PADL) / (W - PADR - PADL) * (x1 - x0);
      setHoverAge(Math.max(x0, Math.min(x1, age)));
    }
    React.useEffect(function () {
      if (!sweep || !inView) { setCa(focusX); return; }
      var raf, start = null, dur = 10400;
      setCa(x0);
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
    }, [inView, props.replayNonce]);

    function partialPx(points) {
      var out = [];
      for (var i = 0; i < points.length; i++) { if (points[i][0] <= ca) out.push(points[i]); }
      if (!out.length) out.push([x0, valueAt(points, x0)]);
      if (ca < points[points.length - 1][0]) out.push([ca, valueAt(points, ca)]);
      return out.map(function (p) { return [sx(p[0]), sy(p[1])]; });
    }
    function fullPx(points) { return points.map(function (p) { return [sx(p[0]), sy(p[1])]; }); }
    function densePx(points) { var o = []; for (var x = x0; x <= x1 + 0.001; x += 1) o.push([sx(x), sy(valueAt(points, x))]); return o; }

    var readAge = hovering ? hoverAge : ca;
    var cursorOn = sweep || hovering;
    var tipX = sx(readAge);
    var leftSide = cursorOn && tipX > (W - PADR - 10);
    var badgeX = leftSide ? tipX - 10 : tipX + 10;

    // Positions verticales des badges (anti-collision).
    var bl = series.map(function (s) { return { key: s.key, y: sy(valueAt(s.points, readAge)) }; });
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
      <svg ref={chartRef} width="100%" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={props.aria || 'Graphique'}
           onMouseMove={onHoverMove} onMouseLeave={function () { if (props.hover) setHoverAge(null); }}
           style={{ display: 'block', cursor: props.hover ? 'crosshair' : 'default' }}>
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
        {props.xUnit !== '' ? <text x={W - PADR + 4} y={H - PADB + 15} textAnchor="start" style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: 'var(--text-dim)', fontStyle: 'italic' }}>{props.xUnit || 'ans'}</text> : null}

        {area ? <path d={area} fill={(props.areaBetween.color || BRAND) + '22'} stroke="none" /> : null}
        {cursorOn ? <line x1={tipX} y1={PADT} x2={tipX} y2={H - PADB} stroke={BRAND} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} /> : null}
        {sweep ? series.map(function (s) {
          return <path key={'g' + s.key} d={smoothPath(fullPx(s.points))} fill="none" stroke={s.color} strokeWidth={1.4} opacity={0.14} />;
        }) : null}
        {series.map(function (s) {
          var drawIt = props.draw && !sweep && !s.dash;
          return <path key={'l' + s.key} d={smoothPath(partialPx(s.points))} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round"
                       pathLength={drawIt ? 1 : undefined} strokeDasharray={drawIt ? '1' : (s.dash || 'none')} strokeDashoffset={drawIt ? (inView ? 0 : 1) : undefined}
                       style={drawIt ? { transition: 'stroke-dashoffset 2.2s cubic-bezier(.45,0,.2,1)' } : undefined} />;
        })}
        {(props.markers || []).map(function (m, i) {
          return (
            <g key={'m' + i} style={props.draw ? { opacity: inView ? 1 : 0, transition: 'opacity .5s ease ' + (1400 + i * 150) + 'ms' } : undefined}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={3.6} fill="var(--bg-card)" stroke={m.color || BRAND} strokeWidth={2} />
              {m.label ? <text x={sx(m.x)} y={sy(m.y) + (m.below ? 15 : -9)} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 9.5, fontWeight: 600, fill: 'var(--text-mid)' }}>{m.label}</text> : null}
            </g>
          );
        })}
        {series.map(function (s) {
          var v = valueAt(s.points, readAge); var ty = sy(v), by = badgeY[s.key];
          return (
            <g key={'b' + s.key} style={props.draw && !hovering ? { opacity: inView ? 1 : 0, transition: 'opacity .5s ease 1.9s' } : undefined}>
              <line x1={tipX} y1={ty} x2={badgeX} y2={by} stroke={s.color} strokeWidth={0.8} opacity={0.5} />
              <circle cx={tipX} cy={ty} r={3} fill={s.color} />
              <circle cx={badgeX} cy={by} r={3} fill={s.color} />
              <text x={leftSide ? badgeX - 7 : badgeX + 7} y={by + 3.5} textAnchor={leftSide ? 'end' : 'start'}
                    style={{ fontFamily: s.endLabel ? 'var(--font-body)' : 'var(--font-mono)', fontSize: s.endLabel ? 10.5 : 11.5, fontWeight: 700, fill: s.color }}>{s.endLabel || Math.round(v)}</text>
            </g>
          );
        })}
        {cursorOn ? (
          <text x={(PADL + (W - PADR)) / 2} y={H - PADB - 8} textAnchor="middle">
            <tspan style={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-dim)' }}>{(props.cursorLabel || 'Âge') + ' '}</tspan>
            <tspan style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, fill: 'var(--text)' }}>{Math.round(readAge)}</tspan>
          </text>
        ) : null}
      </svg>
    );
  }

  /* ── Démonstration : petites primitives animées à l'entrée (SVG / HTML brut). ── */
  var NEUTRAL = '#94a3b8';
  function frNum(v, dec) {
    try { return v.toLocaleString('fr-FR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
    catch (e) { return String(Math.round(v)); }
  }

  /* Nombre qui compte de 0 à la valeur quand il entre à l'écran. */
  function CadCountUp(props) {
    var iv = useInView({ threshold: 0.5 }); var ref = iv[0], on = iv[1];
    var target = props.value || 0;
    var st = React.useState(reduced() ? target : 0); var v = st[0], setV = st[1];
    React.useEffect(function () {
      if (reduced()) { setV(target); return; }
      if (!on) { setV(0); return; }
      var raf, start = null, dur = props.dur || 1400;
      function step(ts) {
        if (start == null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        setV(target * lEaseOut(p));
        if (p < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
      return function () { cancelAnimationFrame(raf); };
    }, [on, target]);
    return <span ref={ref}>{(props.prefix || '') + frNum(v, props.decimals) + (props.suffix || '')}</span>;
  }

  /* Dumbbell : avant (gris) → après (couleur), le point glisse à l'apparition. */
  function CadDumbbell(props) {
    var iv = useInView(); var ref = iv[0], on = iv[1];
    var rows = props.rows || [];
    var d0 = props.domain[0], d1 = props.domain[1];
    var W = 420, LX = 96, RX = 352, ROW = 50, TOP = 28;
    var H = TOP + rows.length * ROW;
    var color = props.color || BRAND;
    function sx(v) { return LX + (v - d0) / (d1 - d0) * (RX - LX); }
    var ease = 'cubic-bezier(.22,1,.36,1)';
    return (
      <svg ref={ref} width="100%" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={props.aria || 'Comparaison avant / après'} style={{ display: 'block', maxWidth: props.maxWidth || 460 }}>
        <text x={LX} y={12} style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fill: 'var(--text-dim)' }}>
          <tspan fill={NEUTRAL}>●</tspan> {props.aLabel}   <tspan fill={color}>●</tspan> {props.bLabel}
        </text>
        {rows.map(function (r, i) {
          var y = TOP + i * ROW + 22;
          var xa = sx(r.a), xb = sx(r.b);
          var pct = Math.round((r.b - r.a) / r.a * 100);
          return (
            <g key={i}>
              <title>{r.label + ' : ' + r.a + ' → ' + r.b + ' ' + (props.unit || '') + ' (' + pct + ' %)'}</title>
              <text x={0} y={y + 4} style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, fill: 'var(--text)' }}>{r.label}</text>
              <line x1={LX} y1={y} x2={RX} y2={y} stroke={TRACK} strokeWidth={1} strokeDasharray="2 4" />
              <line x1={xa} y1={y} x2={xb} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" pathLength={1}
                    strokeDasharray="1" strokeDashoffset={on ? 0 : 1} style={{ transition: 'stroke-dashoffset 1.1s ' + ease + ' ' + (i * 180 + 200) + 'ms' }} />
              <circle cx={xa} cy={y} r={6} fill="var(--bg-card)" stroke={NEUTRAL} strokeWidth={2.5} />
              <text x={xa} y={y - 12} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fill: 'var(--text-dim)' }}>{frNum(r.a)}</text>
              <g style={{ transform: 'translateX(' + (on ? xb - xa : 0) + 'px)', transition: 'transform 1.1s ' + ease + ' ' + (i * 180 + 200) + 'ms' }}>
                <circle cx={xa} cy={y} r={7} fill={color} style={{ filter: 'drop-shadow(0 0 5px ' + color + '66)' }} />
                <text x={xa} y={y - 12} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, fill: color, opacity: on ? 1 : 0, transition: 'opacity .4s ease ' + (i * 180 + 1100) + 'ms' }}>{frNum(r.b)}</text>
              </g>
              <text x={W} y={y + 5} textAnchor="end" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, fill: 'var(--text)', opacity: on ? 1 : 0, transition: 'opacity .5s ease ' + (i * 180 + 1100) + 'ms' }}>{(pct > 0 ? '+' : '−') + Math.abs(pct) + ' %'}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  /* Waffle 10×10 : les carrés se remplissent un à un. Bascule entre plusieurs jeux. */
  function CadWaffle(props) {
    var iv = useInView(); var ref = iv[0], on = iv[1];
    var opts = props.options || [];
    var ks = React.useState(0); var k = ks[0], setK = ks[1];
    var cur = opts[k] || { value: 0 };
    var color = props.color || BRAND;
    var cells = [];
    for (var i = 0; i < 100; i++) {
      var filled = on && i < cur.value;
      cells.push(<i key={i} style={{ background: filled ? color : TRACK, transition: 'background-color .25s ease ' + (on ? i * 9 : 0) + 'ms', boxShadow: filled ? '0 0 6px ' + color + '44' : 'none' }}></i>);
    }
    return (
      <div ref={ref} className="cad-waffle-wrap">
        <div className="cad-waffle" role="img" aria-label={cur.label + ' : ' + cur.value + ' sur 100'}>{cells}</div>
        <div className="cad-waffle-side">
          <div className="cad-waffle-n"><CadCountUp key={k} value={cur.value} suffix=" %" dur={1100} /></div>
          <div className="cad-waffle-l">{props.caption}</div>
          {opts.length > 1 ? (
            <div className="cad-fchips" style={{ marginTop: 12 }}>
              {opts.map(function (o, j) {
                return <button key={o.label} type="button" className="cad-fchip" aria-pressed={j === k} onClick={function () { setK(j); }}>{o.label}</button>;
              })}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  /* Barres horizontales triées, filtrables par groupe (réordonnancement animé),
     ligne de référence, surlignage, rang au survol. */
  function CadHBars(props) {
    var iv = useInView({ threshold: 0.2 }); var ref = iv[0], on = iv[1];
    var data = props.data || [];
    var groups = props.groups || null;
    var fs = React.useState(groups ? groups[0] : null); var f = fs[0], setF = fs[1];
    var hs = React.useState(null); var hov = hs[0], setHov = hs[1];
    var max = props.max || Math.max.apply(null, data.map(function (d) { return d.value; }));
    var ROWH = props.rowHeight || 34;
    var color = props.color || BRAND;
    var visible = data.filter(function (d) { return !groups || f === groups[0] || (d.groups || [d.group]).indexOf(f) >= 0; })
      .slice().sort(function (a, b) { return b.value - a.value; });
    var pos = {}; visible.forEach(function (d, i) { pos[d.key] = i; });
    var ease = 'cubic-bezier(.22,1,.36,1)';
    var refPct = props.refLine ? props.refLine.value / max * 100 : null;
    return (
      <div ref={ref}>
        {groups ? (
          <div className="cad-fchips" style={{ marginBottom: 14 }}>
            {groups.map(function (g) {
              return <button key={g} type="button" className="cad-fchip" aria-pressed={g === f} onClick={function () { setF(g); }}>{g}</button>;
            })}
          </div>
        ) : null}
        <div className="cad-hbars" style={{ height: visible.length * ROWH + (props.refLine ? 22 : 0), transition: 'height .5s ' + ease }}>
          {props.refLine ? (
            <div className="cad-hbar-row cad-hbar-refrow" style={{ top: 0, bottom: 0, height: 'auto' }}>
              <span></span>
              <div style={{ position: 'relative', height: '100%' }}>
                <div className="cad-hbar-ref" style={{ left: refPct + '%', opacity: on ? 1 : 0 }}><span>{props.refLine.label}</span></div>
              </div>
              <span></span>
            </div>
          ) : null}
          {data.map(function (d) {
            var vis = pos[d.key] != null;
            var idx = vis ? pos[d.key] : visible.length;
            var w = on && vis ? Math.max(1.5, d.value / max * 100) : 0;
            var c = d.hl ? color : (d.muted ? NEUTRAL : (props.barColor || 'var(--text-mid)'));
            return (
              <div key={d.key} className={'cad-hbar-row' + (d.hl ? ' is-hl' : '') + (d.region ? ' is-region' : '')}
                   onMouseEnter={function () { setHov(d.key); }} onMouseLeave={function () { setHov(null); }}
                   style={{ top: idx * ROWH + (props.refLine ? 22 : 0), height: ROWH, opacity: vis ? 1 : 0, pointerEvents: vis ? 'auto' : 'none', transition: 'top .6s ' + ease + ', opacity .35s ease' }}>
                <span className="cad-hbar-lab" title={d.label}>{d.label}{d.tag ? <em>{d.tag}</em> : null}</span>
                <div className="cad-hbar-track">
                  <div className="cad-hbar-fill" style={{ width: w + '%', background: c, opacity: d.region ? 0.55 : 1, transition: 'width 1s ' + ease + ' ' + (idx * 45) + 'ms' }}></div>
                </div>
                <span className="cad-hbar-val">{hov === d.key && vis ? '#' + (idx + 1) + ' · ' : ''}{d.display || (frNum(d.value, d.value % 1 ? 1 : 0) + (props.unit || ''))}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* Colonnes verticales animées (catégories), une colonne surlignée possible. */
  function CadColumns(props) {
    var iv = useInView(); var ref = iv[0], on = iv[1];
    var data = props.data || [];
    var max = props.max || Math.max.apply(null, data.map(function (d) { return d.value; }));
    var color = props.color || BRAND;
    var ease = 'cubic-bezier(.22,1,.36,1)';
    return (
      <div ref={ref} className="cad-cols" style={{ height: props.height || 190 }} role="img" aria-label={props.aria || 'Colonnes'}>
        {data.map(function (d, i) {
          var h = on ? Math.max(2, d.value / max * 100) : 0;
          var c = d.hl ? color : (d.color || NEUTRAL);
          return (
            <div key={i} className="cad-col">
              <div className="cad-col-area">
                <div className="cad-col-bar" style={{ height: h + '%', background: c, boxShadow: d.hl ? '0 0 14px ' + color + '55' : 'none', transition: 'height 1s ' + ease + ' ' + (i * 110) + 'ms' }}>
                  <span className="cad-col-val" style={{ color: d.hl ? color : 'var(--text)', opacity: on ? 1 : 0, transition: 'opacity .4s ease ' + (i * 110 + 700) + 'ms' }}>{d.display != null ? d.display : d.value}</span>
                </div>
              </div>
              <span className="cad-col-lab">{d.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  /* Jauge demi-cercle 0→max avec zones colorées et aiguille pilotée par un curseur. */
  function CadGauge(props) {
    var iv = useInView(); var ref = iv[0], on = iv[1];
    var zones = props.zones || [];
    var max = props.max || 10;
    var vs = React.useState(props.initial != null ? props.initial : max / 2); var val = vs[0], setVal = vs[1];
    var cx = 150, cy = 150, R = 118;
    function pt(v, r) { var a = Math.PI * (1 - v / max); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
    function arc(a, b) {
      var p = pt(a, R), q = pt(b, R);
      return 'M' + p[0] + ',' + p[1] + ' A' + R + ',' + R + ' 0 0 1 ' + q[0] + ',' + q[1];
    }
    var shown = on ? val : 0;
    var zone = zones.filter(function (z) { return val >= z.from && val <= z.to; })[0] || zones[zones.length - 1];
    var angle = -90 + 180 * shown / max;
    var ticks = []; for (var t = 0; t <= max; t++) ticks.push(t);
    return (
      <div ref={ref} className="cad-gauge">
        <svg width="100%" viewBox="0 0 300 172" role="img" aria-label={(props.aria || 'Jauge') + ' : ' + val} style={{ display: 'block', maxWidth: 360, margin: '0 auto' }}>
          {zones.map(function (z, i) {
            var a = i === 0 ? z.from : (zones[i - 1].to + z.from) / 2;
            var b = i === zones.length - 1 ? z.to : (z.to + zones[i + 1].from) / 2;
            var active = zone === z;
            return <path key={i} d={arc(a, b)} fill="none" stroke={z.color} strokeWidth={active ? 20 : 14} opacity={active ? 1 : 0.35} style={{ transition: 'all .3s ease' }} />;
          })}
          {ticks.map(function (t) {
            var p = pt(t, R - 22);
            return <text key={t} x={p[0]} y={p[1] + 3} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--text-dim)' }}>{t}</text>;
          })}
          <g style={{ transform: 'rotate(' + angle + 'deg)', transformOrigin: cx + 'px ' + cy + 'px', transition: 'transform .9s cubic-bezier(.34,1.4,.64,1)' }}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - R + 34} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
          </g>
          <circle cx={cx} cy={cy} r={8} fill="var(--text)" />
          <circle cx={cx} cy={cy} r={3} fill="var(--bg-card)" />
        </svg>
        <input type="range" min={0} max={max} step={props.step || 0.5} value={val} aria-label={props.inputLabel || 'Score'}
               onChange={function (e) { setVal(parseFloat(e.target.value)); }} className="cad-range" style={{ accentColor: zone ? zone.color : BRAND }} />
        <div className="cad-gauge-out">
          <b style={{ color: zone ? zone.color : 'var(--text)' }}>{frNum(val, val % 1 ? 1 : 0)} / {max}</b>
          <span>{zone ? zone.text : ''}</span>
        </div>
      </div>
    );
  }

  /* G6 — courbe du score global dans le temps. Fond en bandes de paliers,
     points colorés par palier, survol = date/score/palier + sous-titre.
     Un point marqué `flag` (conditions très différentes) reçoit un anneau orange. */
  function CadTrendLine(props) {
    var en = useInView(); var enRef = en[0], on = en[1];
    var pts = props.points || [];
    var max = props.max || 1000;
    var levels = props.levels || [];
    var palette = props.palette || {};
    var hv = React.useState(-1); var hi = hv[0], setHi = hv[1];
    if (!pts.length) return null;
    var maxScore = Math.max.apply(null, pts.map(function (p) { return p.score; }));
    var yTop = Math.min(1100, Math.max(600, Math.ceil((maxScore + 60) / 200) * 200));
    var W = 680, H = 280, PL = 46, PR = 16, PT = 18, PB = 36;
    var iw = W - PL - PR, ih = H - PT - PB;
    function x(i) { return PL + (pts.length === 1 ? iw / 2 : iw * i / (pts.length - 1)); }
    function y(v) { return PT + ih * (1 - Math.min(v, yTop) / yTop); }
    var bands = [];
    for (var i = 0; i < levels.length; i++) {
      var from = levels[i].min_pct * max;
      if (from >= yTop) break;
      var to = (i + 1 < levels.length ? levels[i + 1].min_pct * max : yTop);
      bands.push({ from: from, to: Math.min(to, yTop), label: levels[i].label, color: palette[levels[i].label] || '#9ca3af' });
    }
    var ticks = []; for (var t = 0; t <= yTop; t += 200) ticks.push(t);
    var line = pts.map(function (p, idx) { return x(idx) + ',' + y(p.score); }).join(' ');
    return (
      <div ref={enRef} style={{ position: 'relative' }}>
        <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Score global dans le temps" style={{ display: 'block', overflow: 'visible' }}>
          {bands.map(function (b, idx) {
            return <rect key={idx} x={PL} y={y(b.to)} width={iw} height={Math.max(0, y(b.from) - y(b.to))} fill={b.color} opacity={0.10} />;
          })}
          {bands.map(function (b, idx) {
            var yc = (y(b.from) + y(b.to)) / 2;
            if (y(b.from) - y(b.to) < 14) return null;
            return <text key={idx} x={W - PR} y={yc + 3} textAnchor="end" style={{ fontFamily: 'var(--font-body)', fontSize: 9.5, fontWeight: 600, fill: b.color, opacity: 0.85 }}>{b.label}</text>;
          })}
          {ticks.map(function (tk) {
            return <g key={tk}>
              <line x1={PL} y1={y(tk)} x2={PL + iw} y2={y(tk)} stroke={GRID} strokeWidth={0.5} opacity={0.5} />
              <text x={PL - 8} y={y(tk) + 3} textAnchor="end" style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--text-dim)' }}>{tk}</text>
            </g>;
          })}
          <polyline points={line} fill="none" stroke="var(--text-mid)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                    style={{ opacity: on ? 1 : 0, transition: 'opacity .7s ease' }} />
          {pts.map(function (p, idx) {
            return <text key={'d' + idx} x={x(idx)} y={H - 12} textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: hi === idx ? 'var(--text)' : 'var(--text-dim)', fontWeight: hi === idx ? 700 : 500 }}>{p.label}</text>;
          })}
          {pts.map(function (p, idx) {
            return <g key={'p' + idx} style={{ opacity: on ? 1 : 0, transition: 'opacity .5s ease ' + (idx * 90) + 'ms' }}>
              {p.flag ? <circle cx={x(idx)} cy={y(p.score)} r={9} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 2" /> : null}
              <circle cx={x(idx)} cy={y(p.score)} r={hi === idx ? 6 : 5} fill={p.color || BRAND} stroke="var(--bg-card)" strokeWidth={1.5} />
            </g>;
          })}
          {pts.map(function (p, idx) {
            return <rect key={'h' + idx} x={x(idx) - iw / (2 * Math.max(1, pts.length))} y={PT} width={iw / Math.max(1, pts.length)} height={ih} fill="transparent"
                         onMouseEnter={function () { setHi(idx); }} onMouseLeave={function () { setHi(-1); }} />;
          })}
          {hi >= 0 ? (function () {
            var p = pts[hi]; var bx = Math.max(PL, Math.min(x(hi) - 70, W - PR - 148)); var by = Math.max(0, y(p.score) - 68);
            return <g>
              <rect x={bx} y={by} width={148} height={56} rx={8} fill="var(--bg-card)" stroke="var(--border-mid)" strokeWidth={1} style={{ filter: 'drop-shadow(0 6px 16px rgba(8,20,40,.18))' }} />
              <text x={bx + 12} y={by + 19} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, fill: 'var(--text)' }}>{p.score}<tspan style={{ fontSize: 10, fill: 'var(--text-dim)' }}> / {max}</tspan></text>
              <text x={bx + 12} y={by + 34} style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, fill: p.color || BRAND }}>{p.level}</text>
              <text x={bx + 12} y={by + 48} style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--text-mid)' }}>{p.sub || ''}</text>
            </g>;
          })() : null}
        </svg>
      </div>
    );
  }

  /* Mini-courbe (sparkline) — progression d'une série, dernier point marqué. */
  function CadSparkline(props) {
    var vals = (props.values || []).slice();
    if (vals.length === 1) vals = [vals[0], vals[0]];
    if (!vals.length) return null;
    var w = props.w || 132, h = props.h || 34, pad = 4;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), rng = (mx - mn) || 1;
    function X(i) { return pad + (w - 2 * pad) * i / (vals.length - 1); }
    function Y(v) { return pad + (h - 2 * pad) * (1 - (v - mn) / rng); }
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var col = props.color || BRAND;
    return (
      <svg width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} role="img" aria-label={props.aria || 'progression'} style={{ display: 'block' }}>
        <path d={d} fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={X(vals.length - 1)} cy={Y(vals[vals.length - 1])} r={2.8} fill={col} />
      </svg>
    );
  }

  Object.assign(window, { CadScoreDonut: CadScoreDonut, CadQualityRings: CadQualityRings, CadRadar: CadRadar, CadTestBar: CadTestBar, CadPointsByFamily: CadPointsByFamily, CadLineChart: CadLineChart,
    CadUseInView: useInView, CadCountUp: CadCountUp, CadDumbbell: CadDumbbell, CadWaffle: CadWaffle, CadHBars: CadHBars, CadColumns: CadColumns, CadGauge: CadGauge,
    CadTrendLine: CadTrendLine, CadSparkline: CadSparkline });
})();
