/* ════════════════════════════════════════════════════════════════
   Decaform — « La piste et le gazon » : les épreuves en extérieur à leur
   place sur un stade vu du ciel. Sur la piste : 30 m, 100 m, 400 m,
   3200 m. Sur le gazon : 6 × 200 m aller-retour, sauts sans élan,
   agilités (Square, Move, Slalom) et parcours mixte s'il fait partie du
   barème. Nom, jour et points viennent du catalogue (rien en dur).
   Schéma, pas à l'échelle. Publie window.CadFieldMap.
   ════════════════════════════════════════════════════════════════ */
(function () {
  function lang() { try { return (window.THWLang && window.THWLang.getLang && window.THWLang.getLang()) || 'fr'; } catch (e) { return 'fr'; } }
  function tr(fr) {
    var l = lang();
    if (l === 'fr') return fr;
    var d = window.THW_I18N_DICT && window.THW_I18N_DICT[l];
    return (d && d[fr]) || fr;
  }
  var RM = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  // Géométrie du stade (repère 960 × 600).
  var G = { cx: 480, cy: 300, L: 400, r0: 132, w: 16, lanes: 6 };
  function laneD(r) {
    var x1 = G.cx - G.L / 2, x2 = G.cx + G.L / 2, yb = G.cy + r, yt = G.cy - r;
    return 'M' + x1 + ',' + yb + ' L' + x2 + ',' + yb + ' A' + r + ',' + r + ' 0 0 0 ' + x2 + ',' + yt +
      ' L' + x1 + ',' + yt + ' A' + r + ',' + r + ' 0 0 0 ' + x1 + ',' + yb + ' Z';
  }
  function laneR(i) { return G.r0 + G.w * (i + 0.5); }
  var X1 = G.cx - G.L / 2, X2 = G.cx + G.L / 2;
  var PISTE = '#00c8e0', GAZON = '#a3e635', GOLD = '#e0b766';

  // Placement de chaque épreuve. move : 'loop' | 'dash' | 'pingpong'.
  var SPOTS = {
    run_3200m: { zone: 'piste', short: '3200 m', d: laneD(laneR(0)), move: 'loop', speed: 230, laps: 8, lbl: [X1 + 30, G.cy - laneR(0) + 4] },
    run_400m: { zone: 'piste', short: '400 m', d: laneD(laneR(2)), move: 'loop', speed: 260, lbl: [X1 + 110, G.cy - laneR(2) + 4] },
    sprint_100m: { zone: 'piste', short: '100 m', d: 'M' + X1 + ',' + (G.cy + laneR(4)) + ' L' + X2 + ',' + (G.cy + laneR(4)), move: 'dash', run: 1500, rest: 1400, lbl: [X1 - 6, G.cy + laneR(4) + 4], anchor: 'end' },
    sprint_30m: { zone: 'piste', short: '30 m', d: 'M' + X1 + ',' + (G.cy + laneR(5)) + ' L' + (X1 + G.L * 0.3) + ',' + (G.cy + laneR(5)), move: 'dash', run: 700, rest: 1700, lbl: [X1 - 6, G.cy + laneR(5) + 4], anchor: 'end' },
    repeat_200m_x6: { zone: 'gazon', short: '6 × 200 m', d: 'M300,206 L640,206', move: 'pingpong', run: 2600, lbl: [300, 194] },
    standing_long_jump: { zone: 'gazon', short: 'Saut sans élan', d: 'M196,262 Q226,226 262,262', move: 'pingpong', run: 900, lbl: [176, 246] },
    standing_triple_jump: { zone: 'gazon', short: 'Triple saut', d: 'M196,344 Q212,326 228,344 Q244,326 260,344 Q278,322 298,344', move: 'pingpong', run: 1300, lbl: [176, 376] },
    agility_square: { zone: 'gazon', short: 'Square', d: 'M342,300 L342,338 L378,338 L378,300 L342,300 L420,300 L420,262 L456,262 L456,300 L420,300', move: 'pingpong', run: 3200, lbl: [338, 364] },
    agility_move: { zone: 'gazon', short: 'Move', d: 'M520,262 L600,262', move: 'pingpong', run: 1200, lbl: [520, 250] },
    agility_slalom: { zone: 'gazon', short: 'Slalom', d: 'M500,328 L518,372 L536,328 L554,372 L572,328 L590,372 L608,328 L626,372 L644,328 L662,372 L680,328', move: 'pingpong', run: 3000, lbl: [500, 394] },
    mixed_course: { zone: 'gazon', short: 'Parcours mixte', d: 'M690,270 L730,270 Q760,270 760,300 Q760,330 730,330 L690,330', move: 'pingpong', run: 2600, lbl: [688, 254] }
  };
  var ORDER = ['sprint_30m', 'sprint_100m', 'run_400m', 'run_3200m', 'repeat_200m_x6', 'standing_long_jump', 'standing_triple_jump', 'agility_square', 'agility_move', 'agility_slalom', 'mixed_course'];

  // Décor propre à chaque épreuve du gazon (plots, planche d'appel, haies).
  function Decor(props) {
    var k = props.k, c = props.c;
    var cone = function (x, y, i) { return <circle key={i} cx={x} cy={y} r="3.6" fill={GOLD} stroke="#0b1626" strokeWidth="1"/>; };
    if (k === 'repeat_200m_x6') return <g><line x1="300" y1="196" x2="300" y2="216" stroke={c} strokeWidth="2"/>{cone(646, 206, 0)}</g>;
    if (k === 'standing_long_jump') return <g><line x1="196" y1="252" x2="196" y2="272" stroke={c} strokeWidth="2.4"/>{[0, 1, 2, 3, 4].map(function (i) { return <line key={i} x1={210 + i * 14} y1="268" x2={210 + i * 14} y2="274" stroke="rgba(238,243,248,.35)" strokeWidth="1"/>; })}</g>;
    if (k === 'standing_triple_jump') return <g><line x1="196" y1="334" x2="196" y2="354" stroke={c} strokeWidth="2.4"/>{[228, 260, 298].map(function (x, i) { return <circle key={i} cx={x} cy="344" r="2.6" fill="rgba(238,243,248,.5)"/>; })}</g>;
    if (k === 'agility_square') return <g>{[[342, 300], [342, 338], [378, 338], [378, 300], [420, 262], [456, 262], [456, 300], [420, 300]].map(function (p, i) { return cone(p[0], p[1], i); })}</g>;
    if (k === 'agility_move') return <g>{[520, 547, 573, 600].map(function (x, i) { return cone(x, 262, i); })}</g>;
    if (k === 'agility_slalom') return <g>{[500, 518, 536, 554, 572, 590, 608, 626, 644, 662, 680].map(function (x, i) { return cone(x, i % 2 ? 372 : 328, i); })}</g>;
    if (k === 'mixed_course') return <g>{[[706, 330], [722, 330]].map(function (p, i) { return <path key={i} d={'M' + (p[0] - 6) + ',' + (p[1] + 6) + ' L' + (p[0] - 6) + ',' + (p[1] - 6) + ' L' + (p[0] + 6) + ',' + (p[1] - 6) + ' L' + (p[0] + 6) + ',' + (p[1] + 6)} fill="none" stroke={GOLD} strokeWidth="2"/>; })}</g>;
    return null;
  }

  function CadFieldMap(props) {
    var cat = props.catalog || {};
    var tests = cat.tests || [];
    var days = cat.days || [];
    var items = ORDER.map(function (slug) {
      var t = tests.filter(function (x) { return x.slug === slug; })[0];
      return t ? Object.assign({ t: t }, SPOTS[slug], { slug: slug }) : null;
    }).filter(Boolean);
    var ls = React.useState(lang()); var setL = ls[1];
    React.useEffect(function () {
      if (!window.THWLang || !window.THWLang.onChange) return undefined;
      return window.THWLang.onChange(function (l) { setL(l); });
    }, []);
    var hs = React.useState(items.length ? items[0].slug : null), hot = hs[0], setHot = hs[1];
    var paused = React.useRef(false);
    var boxRef = React.useRef(null), pathRefs = React.useRef({}), dotRefs = React.useRef({}), lapRef = React.useRef(null);

    // Coureurs et déplacements (rAF, en pause hors écran / onglet caché).
    React.useEffect(function () {
      var visible = true, raf = 0, t0 = performance.now();
      function place(slug, pos) {
        var p = pathRefs.current[slug], d = dotRefs.current[slug];
        if (!p || !d) return;
        var pt = p.getPointAtLength(pos);
        d.setAttribute('cx', pt.x.toFixed(1)); d.setAttribute('cy', pt.y.toFixed(1));
      }
      function frame(now) {
        raf = 0;
        if (!visible) return;
        var ms = RM ? 1800 : now - t0;
        items.forEach(function (it) {
          var p = pathRefs.current[it.slug]; if (!p) return;
          var len = p.getTotalLength(), pos;
          if (it.move === 'loop') {
            var dist = ms / 1000 * it.speed;
            pos = dist % len;
            if (it.laps) {
              var txt = (Math.floor(dist / len) % it.laps + 1) + ' / ' + it.laps;
              if (lapRef.current && lapRef.current.textContent !== txt) lapRef.current.textContent = txt;
            }
          } else if (it.move === 'dash') {
            var per = it.run + it.rest, u = (ms % per) / it.run;
            pos = u >= 1 ? len : len * (1 - Math.pow(1 - u, 2.2));
          } else {
            var v = (ms % (it.run * 2)) / it.run;
            pos = len * (v <= 1 ? v : 2 - v);
          }
          place(it.slug, pos);
        });
        if (!RM) raf = requestAnimationFrame(frame);
      }
      function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting && !document.hidden; kick(); }) : null;
      if (io && boxRef.current) io.observe(boxRef.current);
      var onVis = function () { visible = !document.hidden; kick(); };
      document.addEventListener('visibilitychange', onVis);
      kick();
      return function () { cancelAnimationFrame(raf); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
    }, [items.length]);

    // Visite guidée : une épreuve après l'autre, tant qu'on ne survole pas.
    React.useEffect(function () {
      if (RM || items.length < 2) return undefined;
      var id = setInterval(function () {
        if (paused.current || document.hidden) return;
        setHot(function (h) { var i = items.map(function (x) { return x.slug; }).indexOf(h); return items[(i + 1) % items.length].slug; });
      }, 3600);
      return function () { clearInterval(id); };
    }, [items.length]);

    if (items.length < 2) return null;
    var cur = items.filter(function (x) { return x.slug === hot; })[0] || items[0];
    var curDay = days.filter(function (d) { return d.day === cur.t.day; })[0];
    var proto = (cat.protocols && cat.protocols[cur.slug]) || {};
    var curCol = cur.zone === 'piste' ? PISTE : GAZON;
    var totalPts = items.reduce(function (s, x) { return s + (x.t.pts_max || 0); }, 0);
    function pick(slug) { paused.current = true; setHot(slug); }
    function listOf(zone) {
      return items.filter(function (x) { return x.zone === zone; }).map(function (x) {
        return (
          <button key={x.slug} type="button" className={x.slug === hot ? 'on' : ''} style={{ '--c': zone === 'piste' ? PISTE : GAZON }}
                  onClick={function () { pick(x.slug); }} onMouseEnter={function () { pick(x.slug); }} aria-pressed={x.slug === hot}>
            <span>{x.short}</span><em data-no-i18n="1">{tr('J')}{x.t.day} · {x.t.pts_max} {tr('pts')}</em>
          </button>
        );
      });
    }

    return (
      <section className="cad-field st-night" data-spot="1" ref={boxRef} onMouseLeave={function () { paused.current = false; }}>
        <div className="cad-field-head">
          <div>
            <div className="cad-field-eye">Dehors</div>
            <h3>La piste et le gazon</h3>
            <p>Les épreuves en extérieur, à leur place : les courses sur la piste, les sauts, l’agilité et les allers-retours sur le gazon — jamais sur le bitume. Survole ou touche une épreuve pour voir son jour et ses points.</p>
          </div>
          <div className="cad-field-tot">
            <div><b data-no-i18n="1">{items.length}</b><span>épreuves dehors</span></div>
            <div><b data-no-i18n="1">{totalPts}</b><span>points en jeu</span></div>
          </div>
        </div>
        <div className="cad-field-grid">
          <div>
            <div className={'cad-field-map has-hot'}>
              <svg viewBox="40 60 880 480" role="img" aria-label={tr('Stade vu du ciel : épreuves sur la piste et sur le gazon')}>
                <defs>
                  <linearGradient id="cfTartan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1f3a64"/><stop offset="1" stopColor="#16294a"/></linearGradient>
                  <radialGradient id="cfGrass" cx="50%" cy="50%" r="65%"><stop offset="0" stopColor="#15402f"/><stop offset="1" stopColor="#0d2a22"/></radialGradient>
                  <pattern id="cfMow" width="48" height="10" patternUnits="userSpaceOnUse"><rect width="24" height="10" fill="rgba(255,255,255,0.03)"/></pattern>
                  <filter id="cfGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>
                </defs>
                <path d={laneD(G.r0 + G.w * G.lanes + 14)} fill="#0d1b2e"/>
                <path d={laneD(G.r0 + G.w * G.lanes) + ' ' + laneD(G.r0)} fill="url(#cfTartan)" fillRule="evenodd"/>
                <path d={laneD(G.r0)} fill="url(#cfGrass)"/>
                <path d={laneD(G.r0)} fill="url(#cfMow)"/>
                {Array.from({ length: G.lanes + 1 }).map(function (_, k) {
                  return <path key={'ln' + k} d={laneD(G.r0 + G.w * k)} fill="none" stroke="rgba(238,243,248,0.3)" strokeWidth={k === 0 || k === G.lanes ? 1.8 : 1}/>;
                })}
                {/* départ (gauche) et arrivée dorée (droite) de la ligne droite */}
                <rect x={X1 - 2} y={G.cy + G.r0} width="4" height={G.w * G.lanes} fill="rgba(238,243,248,0.55)"/>
                <rect x={X2 - 3} y={G.cy + G.r0} width="6" height={G.w * G.lanes} fill={GOLD}/>
                {items.map(function (it) {
                  var on = it.slug === hot, col = on ? GOLD : (it.zone === 'piste' ? PISTE : GAZON);
                  return (
                    <g key={it.slug} className={'cad-fi' + (on ? ' on' : '')}
                       onMouseEnter={function () { pick(it.slug); }} onClick={function () { pick(it.slug); }}>
                      <path d={it.d} fill="none" stroke="transparent" strokeWidth="18" style={{ pointerEvents: 'stroke' }}/>
                      <path ref={function (el) { pathRefs.current[it.slug] = el; }} d={it.d} fill="none" stroke={col}
                            strokeOpacity={on ? 0.95 : 0.55} strokeWidth={on ? 3 : 1.8} strokeDasharray={it.zone === 'gazon' ? '5 5' : null} strokeLinecap="round"/>
                      <Decor k={it.slug} c={col}/>
                      <circle ref={function (el) { dotRefs.current[it.slug] = el; }} r={on ? 7 : 5} fill={col} filter={on ? 'url(#cfGlow)' : null}/>
                      <text className="cad-field-lbl" x={it.lbl[0]} y={it.lbl[1]} textAnchor={it.anchor || 'start'} fill={on ? GOLD : 'rgba(238,243,248,0.78)'}>{tr(it.short)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="cad-field-note">Schéma du stade, pas à l’échelle</div>
          </div>
          <div>
            <div className="cad-field-card" style={{ '--c': curCol }} aria-live="polite">
              <span className="mono" key={'m' + cur.slug}>{cur.zone === 'piste' ? 'Sur la piste' : 'Sur le gazon'} · <span data-no-i18n="1">{tr('Jour')} {cur.t.day}</span>{curDay && curDay.label ? <span> — {curDay.label}</span> : null}</span>
              <b key={cur.slug}>{cur.t.name}</b>
              {proto.objectif ? <p key={'o' + cur.slug}>{proto.objectif}</p> : null}
              <div className="cad-field-pts">
                <strong data-no-i18n="1">{cur.t.pts_max}</strong><span>points sur {cat.totalPoints || 1000}</span>
                {cur.slug === 'run_3200m' ? <span>· <span>tour</span> <span ref={lapRef} data-no-i18n="1">1 / 8</span></span> : null}
              </div>
            </div>
            <div className="cad-field-lists">
              <div><h4>Sur la piste</h4>{listOf('piste')}</div>
              <div><h4>Sur le gazon</h4>{listOf('gazon')}</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  window.CadFieldMap = CadFieldMap;
})();
