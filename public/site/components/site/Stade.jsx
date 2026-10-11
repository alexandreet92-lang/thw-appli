/* ════════════════════════════════════════════════════════════════
   THW — pièces maîtresses du site vitrine (couche « stade »).
     <RaceTrack/>   piste d'athlé : 8 couloirs = 8 sports, survol = ce que fait l'app
     <Scoreboard/>  panneau de stade : chiffres en palettes qui basculent
     <PlanWriter/>  la semaine s'écrit séance par séance + zones cardiaques
     <SeasonCurve/> la saison se trace au défilement, médaille au Jour J
     <FinishButton/> bouton avec ruban d'arrivée qui casse au survol
     <Ticker/>      bandeau défilant (disciplines, outils)
     <Coverline/>   chiffres qui montent + jauge qui se remplit
     <Seal/>        sceau doré qui « frappe » (validé, record, palier)
     <CoachLive/>   l'athlète demande, le coach répond chiffres à l'appui
     <Shelf/>       bibliothèque des piliers : on tire un livre, il s'ouvre
   Dessin 100 % maison (canvas / SVG), aucune librairie.
   Textes : FR source ; tr() lit le dictionnaire i18n pour ce qui est
   construit hors du DOM (texte qui s'écrit, attributs SVG).
   ════════════════════════════════════════════════════════════════ */

function stLang() { try { return (window.THWLang && window.THWLang.getLang && window.THWLang.getLang()) || 'fr'; } catch (e) { return 'fr'; } }
function tr(fr) {
  var l = stLang();
  if (l === 'fr') return fr;
  var d = window.THW_I18N_DICT && window.THW_I18N_DICT[l];
  return (d && d[fr]) || fr;
}
function useLang() {
  var st = React.useState(stLang());
  React.useEffect(function () {
    if (!window.THWLang || !window.THWLang.onChange) return undefined;
    return window.THWLang.onChange(function (l) { st[1](l); });
  }, []);
  return st[0];
}
var ST_RM = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

/* ─── Sceau doré ──────────────────────────────────────────────── */
function Seal(props) {
  var size = props.size || 64;
  var id = React.useMemo(function () { return 'sl' + Math.random().toString(36).slice(2, 8); }, []);
  var ring = (props.ring || 'THW · VALIDÉ · ').toUpperCase();
  return (
    <svg className={'st-seal' + (props.stamp === false ? '' : ' st-stamp')} width={size} height={size} viewBox="0 0 100 100"
         style={{ '--d': (props.delay || 0) + 'ms' }} aria-hidden="true" data-no-i18n="1">
      <defs><path id={id} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 3"/>
      <text fontFamily="IBM Plex Mono, monospace" fontSize="8.2" letterSpacing="2.2" fill="currentColor">
        <textPath href={'#' + id}>{ring + ring}</textPath>
      </text>
      {props.center
        ? <text x="50" y="56" textAnchor="middle" fontFamily="Literata, Georgia, serif" fontWeight="600" fontSize={props.centerSize || 17} fill="currentColor">{props.center}</text>
        : <path d="M38 51 l8 8 l16 -18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  );
}

/* ─── Ticker ──────────────────────────────────────────────────── */
function Ticker(props) {
  var items = props.items || [];
  var row = items.map(function (t, i) { return <span key={i}>{t}</span>; });
  return (
    <div className="st-ticker" aria-hidden="true">
      <div className="st-track">{row}{items.map(function (t, i) { return <span key={'b' + i}>{t}</span>; })}</div>
    </div>
  );
}

/* ─── Bande de chiffres ───────────────────────────────────────── */
function Coverline(props) {
  return (
    <div className="st-coverline">
      {props.items.map(function (it, i) {
        return (
          <div key={i} style={{ '--i': i }}>
            <b><span data-count={it.v} data-no-i18n="1">{it.v}</span>{it.unit ? <small>{it.unit}</small> : null}</b>
            <span className="lbl">{it.label}</span>
            <span className="sub">{it.sub}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════ PISTE D'ATHLÉ — 8 couloirs, 8 sports ═════════════════ */
var TRACK_SPORTS = [
  { k: 'run', n: 'Course à pied', c: '#f97316', d: 'Allures, zones cardiaques et plans du 5 km au marathon.' },
  { k: 'trail', n: 'Trail', c: '#a3e635', d: 'Dénivelé, sorties longues et préparation des ultras.' },
  { k: 'bike', n: 'Vélo', c: '#00c8e0', d: 'Puissance, FTP et zones de watts, synchronisés avec tes capteurs.' },
  { k: 'tri', n: 'Triathlon', c: '#7b8cff', d: "Trois sports dans un seul plan, du Sprint à l'Ironman 70.3." },
  { k: 'hyrox', n: 'Hyrox', c: '#f472b6', d: 'Course et stations enchaînées dans un plan hybride.' },
  { k: 'swim', n: 'Natation', c: '#60a5fa', d: 'Allure au 100 m et séances techniques.' },
  { k: 'gym', n: 'Musculation', c: '#22c55e', d: "Force, puissance et explosivité, intégrées à l'endurance." },
  { k: 'row', n: 'Aviron', c: '#2dd4bf', d: 'Séances sur ergomètre et suivi de la charge.' }
];
var TK = { cx: 480, cy: 320, L: 320, r0: 118, w: 22 };
function laneD(r) {
  var x1 = TK.cx - TK.L / 2, x2 = TK.cx + TK.L / 2, yb = TK.cy + r, yt = TK.cy - r;
  return 'M' + x1 + ',' + yb + ' L' + x2 + ',' + yb + ' A' + r + ',' + r + ' 0 0 0 ' + x2 + ',' + yt +
    ' L' + x1 + ',' + yt + ' A' + r + ',' + r + ' 0 0 0 ' + x1 + ',' + yb + ' Z';
}
function laneR(i) { return TK.r0 + TK.w * (i + 0.5); }
function lanePer(i) { var r = laneR(i); return 2 * TK.L + 2 * Math.PI * r; }

function RaceTrack() {
  useLang();
  var hs = React.useState(0), hot = hs[0], setHot = hs[1];
  var pausedRef = React.useRef(false);
  var boxRef = React.useRef(null);
  var runRefs = React.useRef([]), trailRefs = React.useRef([]), pathRefs = React.useRef([]);
  var lapRef = React.useRef(null);

  // Les coureurs tournent (rAF), en pause hors écran / onglet caché.
  React.useEffect(function () {
    var visible = true, raf = 0, t0 = performance.now(), laps = 0;
    var speed = [128, 119, 141, 124, 133, 114, 122, 137];
    var off = [0, 180, 60, 420, 300, 520, 240, 120];
    function frame(now) {
      raf = 0;
      if (!visible) return;
      var t = ST_RM ? 3 : (now - t0) / 1000;
      for (var i = 0; i < 8; i++) {
        var path = pathRefs.current[i], run = runRefs.current[i], tr2 = trailRefs.current[i];
        if (!path || !run) continue;
        var per = lanePer(i), pos = (off[i] + t * speed[i]) % per;
        var pt = path.getPointAtLength(pos);
        run.setAttribute('cx', pt.x.toFixed(1)); run.setAttribute('cy', pt.y.toFixed(1));
        if (tr2) { var tl = 150; tr2.setAttribute('stroke-dasharray', tl + ' ' + (per - tl)); tr2.setAttribute('stroke-dashoffset', ((tl - pos) % per).toFixed(1)); }
      }
      var l = Math.floor((off[0] + t * speed[0]) / lanePer(0)) + 1;
      if (l !== laps && lapRef.current) { laps = l; lapRef.current.textContent = String(l).padStart(2, '0'); }
      if (!ST_RM) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting && !document.hidden; kick(); }) : null;
    if (io && boxRef.current) io.observe(boxRef.current);
    var onVis = function () { visible = !document.hidden; kick(); };
    document.addEventListener('visibilitychange', onVis);
    kick();
    return function () { cancelAnimationFrame(raf); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Visite guidée : un couloir après l'autre, sauf si on survole.
  React.useEffect(function () {
    if (ST_RM) return undefined;
    var t = setInterval(function () { if (!pausedRef.current && !document.hidden) setHot(function (h) { return (h + 1) % 8; }); }, 3400);
    return function () { clearInterval(t); };
  }, []);

  var outer = TK.r0 + TK.w * 8;
  var sp = TRACK_SPORTS[hot];
  var finishX = TK.cx + TK.L / 2 - 46;
  return (
    <div className="st-trackbox" ref={boxRef}
         onMouseLeave={function () { pausedRef.current = false; }}>
      <div className="st-track-3d">
        <svg viewBox="0 0 960 640" role="img" aria-label="Piste d'athlétisme : un couloir par sport">
          <defs>
            <linearGradient id="stTartan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1f3a64"/><stop offset="1" stopColor="#16294a"/>
            </linearGradient>
            <radialGradient id="stInfield" cx="50%" cy="50%" r="65%">
              <stop offset="0" stopColor="#123236"/><stop offset="1" stopColor="#0b1d24"/>
            </radialGradient>
            <pattern id="stMow" width="44" height="10" patternUnits="userSpaceOnUse">
              <rect width="22" height="10" fill="rgba(255,255,255,0.025)"/>
            </pattern>
            <filter id="stGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
          </defs>
          <path d={laneD(outer + 16)} fill="#0d1b2e"/>
          <path d={laneD(outer) + ' ' + laneD(TK.r0)} fill="url(#stTartan)" fillRule="evenodd"/>
          <path d={laneD(TK.r0)} fill="url(#stInfield)"/>
          <path d={laneD(TK.r0)} fill="url(#stMow)"/>
          <path d={laneD(TK.r0 - 46)} fill="none" stroke="rgba(238,243,248,0.08)" strokeWidth="1.2"/>
          <circle cx={TK.cx} cy={TK.cy} r="34" fill="none" stroke="rgba(238,243,248,0.08)" strokeWidth="1.2"/>
          <line x1={TK.cx} y1={TK.cy - TK.r0 + 46} x2={TK.cx} y2={TK.cy + TK.r0 - 46} stroke="rgba(238,243,248,0.08)" strokeWidth="1.2"/>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (k) {
            return <path key={'b' + k} d={laneD(TK.r0 + TK.w * k)} fill="none" stroke="rgba(238,243,248,0.32)" strokeWidth={k === 0 || k === 8 ? 2 : 1.1}/>;
          })}
          {/* couloir en surbrillance */}
          <path d={laneD(laneR(hot))} fill="none" stroke={sp.c} strokeOpacity="0.16" strokeWidth={TK.w - 2} style={{ transition: 'stroke .4s' }}/>
          {/* ligne d'arrivée + numéros */}
          <rect x={finishX - 3} y={TK.cy + TK.r0} width="6" height={TK.w * 8} fill="#e0b766"/>
          {TRACK_SPORTS.map(function (s, i) {
            return <text key={'n' + i} x={finishX - 22} y={TK.cy + laneR(i) + 5} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fontWeight="600" fill="rgba(238,243,248,0.55)">{i + 1}</text>;
          })}
          {/* trajectoires (cachées) + traînées + coureurs */}
          {TRACK_SPORTS.map(function (s, i) {
            return <path key={'p' + i} ref={function (el) { pathRefs.current[i] = el; }} d={laneD(laneR(i))} fill="none" stroke="none"/>;
          })}
          {TRACK_SPORTS.map(function (s, i) {
            return <path key={'t' + i} ref={function (el) { trailRefs.current[i] = el; }} d={laneD(laneR(i))} fill="none" stroke={s.c}
                         strokeOpacity={i === hot ? 0.9 : 0.42} strokeWidth={i === hot ? 5 : 3} strokeLinecap="round"/>;
          })}
          {TRACK_SPORTS.map(function (s, i) {
            return <circle key={'g' + i} ref={function (el) { runRefs.current[i] = el; }} r={i === hot ? 9 : 6} fill={s.c} filter={i === hot ? 'url(#stGlow)' : undefined}/>;
          })}
          {/* zones de survol, une par couloir */}
          {TRACK_SPORTS.map(function (s, i) {
            return <path key={'h' + i} d={laneD(laneR(i))} fill="none" stroke="transparent" strokeWidth={TK.w} style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                         onMouseEnter={function () { pausedRef.current = true; setHot(i); }} onClick={function () { pausedRef.current = true; setHot(i); }}/>;
          })}
        </svg>
      </div>
      <div className="st-lane-card" style={{ '--c': sp.c }} aria-live="polite">
        <span className="mono"><span>Couloir</span> {hot + 1} · <span data-no-i18n="1">T</span><span ref={lapRef} data-no-i18n="1">01</span></span>
        <b key={sp.k}>{sp.n}</b>
        <span className="st-lane-d" key={'d' + sp.k}>{sp.d}</span>
      </div>
      <div className="st-lane-picks" role="tablist" aria-label="Choisir un sport">
        {TRACK_SPORTS.map(function (s, i) {
          return <button key={s.k} type="button" role="tab" aria-selected={i === hot} title={s.n} style={{ '--c': s.c }}
                         className={i === hot ? 'on' : ''} onClick={function () { pausedRef.current = true; setHot(i); }}
                         onMouseEnter={function () { pausedRef.current = true; setHot(i); }}><span data-no-i18n="1">{i + 1}</span></button>;
        })}
      </div>
    </div>
  );
}

/* ═════════════════ PANNEAU DE STADE — palettes qui basculent ═════════════════ */
function Scoreboard(props) {
  var items = props.items;
  var ref = React.useRef(null);
  var init = items.map(function (it) { return String(it.v).split('').map(function (c) { return { ch: ST_RM ? c : '0', n: 0 }; }); });
  var st = React.useState(init), cells = st[0], setCells = st[1];
  React.useEffect(function () {
    if (ST_RM) return undefined;
    var timer = null, started = false;
    function start() {
      if (started) return; started = true;
      var t0 = performance.now();
      var stops = items.map(function (it, a) { return String(it.v).split('').map(function (c, b) { return 700 + a * 260 + b * 160; }); });
      timer = setInterval(function () {
        var el = performance.now() - t0, done = true;
        setCells(function (prev) {
          return prev.map(function (row, a) {
            return row.map(function (cell, b) {
              var fin = String(items[a].v)[b];
              if (el >= stops[a][b]) { if (cell.ch !== fin) return { ch: fin, n: cell.n + 1 }; return cell; }
              done = false;
              return { ch: String(Math.floor(Math.random() * 10)), n: cell.n + 1 };
            });
          });
        });
        if (el > stops[stops.length - 1][stops[stops.length - 1].length - 1] + 120) clearInterval(timer);
      }, 70);
    }
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { if (en[0].isIntersecting) { start(); io.disconnect(); } }, { threshold: 0.4 }) : null;
    if (io && ref.current) io.observe(ref.current); else start();
    return function () { clearInterval(timer); if (io) io.disconnect(); };
  }, []);
  return (
    <div className="st-board" ref={ref}>
      {items.map(function (it, a) {
        return (
          <div className="st-board-cell" key={a}>
            <div className="st-flaps" data-no-i18n="1" aria-label={String(it.v)}>
              {cells[a].map(function (cell, b) {
                return <span className="st-flap" key={b}><span className="st-flap-ch" key={cell.n}>{cell.ch}</span></span>;
              })}
            </div>
            <span className="lbl">{it.label}</span>
            <span className="sub">{it.sub}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════ LE PLAN QUI S'ÉCRIT + zones cardiaques ═════════════════ */
var PLAN_WEEK = [
  { d: 'Lun', k: 'gym', t: 'Force — haut du corps', m: '50 min', z: 'Force' },
  { d: 'Mar', k: 'run', t: '6 × 800 m au seuil', m: '55 min', z: 'Z4' },
  { d: 'Mer', k: 'bike', t: 'Endurance', m: '1 h 15', z: 'Z2' },
  { d: 'Jeu', k: 'rest', t: 'Mobilité', m: '20 min', z: 'Récup' },
  { d: 'Ven', k: 'swim', t: 'Technique', m: '40 min', z: 'Z1' },
  { d: 'Sam', k: 'hyrox', t: 'Stations + course', m: '1 h', z: 'Z3' },
  { d: 'Dim', k: 'run', t: 'Sortie longue', m: '1 h 40', z: 'Z2' }
];
var PLAN_COL = { gym: '#22c55e', run: '#f97316', bike: '#00c8e0', rest: '#94a3b8', swim: '#60a5fa', hyrox: '#f472b6' };
var ZONES = [
  { z: 'Z1', n: 'Récupération', v: 18, c: '#94a3b8' },
  { z: 'Z2', n: 'Endurance', v: 58, c: '#22c55e' },
  { z: 'Z3', n: 'Tempo', v: 8, c: '#eab308' },
  { z: 'Z4', n: 'Seuil', v: 11, c: '#f97316' },
  { z: 'Z5', n: 'VO₂max', v: 5, c: '#ef4444' }
];
function PlanWriter() {
  useLang();
  var ref = React.useRef(null);
  var ns = React.useState(ST_RM ? 7 : 0), shown = ns[0], setShown = ns[1];
  var zs = React.useState(ST_RM ? ZONES.map(function (z) { return z.v; }) : [20, 20, 20, 20, 20]), zv = zs[0], setZv = zs[1];
  var gs = React.useState(0), run = gs[0], setRun = gs[1];
  var done = shown >= 7;
  // Lancement à l'entrée dans l'écran (et au clic sur « Rejouer »).
  React.useEffect(function () {
    if (ST_RM) return undefined;
    var started = false, timers = [];
    function play() {
      if (started) return; started = true;
      setShown(0);
      for (var i = 1; i <= 7; i++) (function (i) { timers.push(setTimeout(function () { setShown(i); }, 380 + i * 420)); })(i);
      var eq = setInterval(function () { setZv(ZONES.map(function () { return 12 + Math.random() * 70; })); }, 140);
      timers.push(setTimeout(function () { clearInterval(eq); setZv(ZONES.map(function (z) { return z.v; })); }, 380 + 8 * 420));
      timers.push({ clear: function () { clearInterval(eq); } });
    }
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { if (en[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.35 }) : null;
    if (run > 0) play(); else if (io && ref.current) io.observe(ref.current); else play();
    return function () { timers.forEach(function (t) { if (t && t.clear) t.clear(); else clearTimeout(t); }); if (io) io.disconnect(); };
  }, [run]);
  var maxZ = Math.max.apply(null, zv);
  return (
    <div className="st-plan" ref={ref}>
      <div className="st-plan-side">
        <div className="eyebrow">Plan d'entraînement</div>
        <h2 className="st-h2">Ton plan s'écrit en moins de 60 secondes.</h2>
        <p className="st-lede">Tu donnes ton objectif, tes disponibilités et ton matériel. L'IA construit ta semaine séance par séance — et la réajuste quand ta forme change.</p>
        <div className="st-zones" aria-label="Répartition du temps par zone cardiaque">
          {ZONES.map(function (z, i) {
            return (
              <div className="st-zone" key={z.z}>
                <div className="st-zone-bar"><i style={{ height: (zv[i] / Math.max(60, maxZ)) * 100 + '%', background: z.c }}/></div>
                <span className="mono" data-no-i18n="1">{z.z}</span>
                <span className="st-zone-n">{z.n}</span>
                {done && <span className="st-zone-v" data-no-i18n="1">{z.v + ' %'}</span>}
              </div>
            );
          })}
        </div>
        <p className="st-zone-cap" style={{ opacity: done ? 1 : 0 }}>76 % du temps en zones basses : l'intensité reste concentrée là où elle compte.</p>
      </div>
      <div className="st-plan-card tilt" data-tilt="3">
        <div className="st-dc-top">
          <span className="st-chip">Semaine type · hybride</span>
          <button type="button" className="st-replay" onClick={function () { setRun(function (r) { return r + 1; }); }} aria-label="Rejouer">↻</button>
        </div>
        <div className="st-week">
          {PLAN_WEEK.map(function (s, i) {
            return (
              <div className="st-day" key={i}>
                <span className="mono st-day-d">{s.d}</span>
                <div className={'st-sess' + (i < shown ? ' in' : '')} style={{ '--c': PLAN_COL[s.k] }}>
                  <b>{s.t}</b>
                  <span>{s.m}</span>
                  <span className="st-chip">{s.z}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="st-plan-foot">
          <span className="mono">{done ? <span>Semaine prête · 7 séances · 6 h 40</span> : <span><span>L'IA écrit ta semaine</span><span className="st-caret"/></span>}</span>
          {done && <Seal key={'p' + run} size={58} ring={tr('PLAN VALIDÉ · ')}/>}
        </div>
        <span className="st-plan-note">Exemple illustratif</span>
      </div>
    </div>
  );
}

/* ═════════════════ LA SAISON — jusqu'au Jour J ═════════════════ */
function seasonData() {
  var ctl = [], atl = [], c = 38;
  for (var w = 1; w <= 24; w++) {
    var taper = w >= 22, rec = !taper && w % 4 === 0;
    c += taper ? -1.6 : (rec ? 0.4 : 2.1);
    var a = taper ? c - 10 - (w - 22) * 6 : (rec ? c - 5 : c + 9 + (w % 3) * 2.5);
    ctl.push(c); atl.push(a);
  }
  return { ctl: ctl, atl: atl, tsb: ctl.map(function (v, i) { return v - atl[i]; }) };
}
function smoothPath(pts) {
  var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d;
}
var SEASON_BLOCKS = [
  { n: 'Base', from: 1, to: 8, c: 'rgba(34,197,94,0.07)' },
  { n: 'Développement', from: 9, to: 15, c: 'rgba(0,200,224,0.07)' },
  { n: 'Spécifique', from: 16, to: 21, c: 'rgba(123,140,255,0.08)' },
  { n: 'Affûtage', from: 22, to: 24, c: 'rgba(224,183,102,0.12)' }
];
function SeasonCurve() {
  useLang();
  var ref = React.useRef(null);
  var paths = React.useRef([]);
  var ms = React.useState(ST_RM), medal = ms[0], setMedal = ms[1];
  var W = 1000, H = 380, X0 = 40, X1 = 930, Y0 = 30, Y1 = 250, T0 = 290, T1 = 350;
  var dat = React.useMemo(seasonData, []);
  var x = function (w) { return X0 + (w - 0.5) / 24 * (X1 - X0); };
  var y = function (v) { return Y1 - (v - 20) / 80 * (Y1 - Y0); };
  var ty = function (v) { return (T0 + T1) / 2 - v / 30 * ((T1 - T0) / 2); };
  var ctlD = smoothPath(dat.ctl.map(function (v, i) { return [x(i + 1), y(v)]; }));
  var atlD = smoothPath(dat.atl.map(function (v, i) { return [x(i + 1), y(v)]; }));
  var tsbD = smoothPath(dat.tsb.map(function (v, i) { return [x(i + 1), ty(v)]; }));
  // Tracé piloté par le défilement.
  React.useEffect(function () {
    var lens = paths.current.map(function (p) { return p ? p.getTotalLength() : 0; });
    paths.current.forEach(function (p, i) { if (p) { p.style.strokeDasharray = lens[i]; p.style.strokeDashoffset = ST_RM ? 0 : lens[i]; } });
    if (ST_RM) return undefined;
    var raf = 0;
    function upd() {
      raf = 0;
      var el = ref.current; if (!el) return;
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      // 0 quand le haut du bloc entre en bas de l'écran, 1 quand le graphique est bien visible.
      var p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / Math.max(1, r.height * 0.72)));
      paths.current.forEach(function (pt, i) { if (pt) pt.style.strokeDashoffset = (lens[i] * (1 - p)).toFixed(1); });
      setMedal(p > 0.93);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(upd); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    upd();
    return function () { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  var jx = x(24) + 20;
  return (
    <div className="st-season" ref={ref}>
      <div className="st-season-head">
        <div className="eyebrow">La méthode</div>
        <h2 className="st-h2">Une saison construite jusqu'au Jour J.</h2>
        <p className="st-lede">Base, développement, spécifique, puis affûtage : ta forme monte, la fatigue est absorbée, et tout converge vers ta course.</p>
      </div>
      <div className="st-season-chart">
        <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Courbe de forme d'une saison jusqu'au jour de la course">
          {SEASON_BLOCKS.map(function (b) {
            var bx = X0 + (b.from - 1) / 24 * (X1 - X0), bw = (b.to - b.from + 1) / 24 * (X1 - X0);
            return (
              <g key={b.n}>
                <rect x={bx} y={Y0 - 14} width={bw} height={T1 - Y0 + 22} fill={b.c} rx="6"/>
                <text x={bx + 10} y={Y0 + 4} fontFamily="IBM Plex Mono, monospace" fontSize="11.5" letterSpacing="1.2" style={{ fill: 'var(--text-dim)' }}>{b.n}</text>
              </g>
            );
          })}
          <line x1={X0} y1={(T0 + T1) / 2} x2={X1} y2={(T0 + T1) / 2} strokeDasharray="3 4" style={{ stroke: 'var(--border-mid)' }}/>
          <path ref={function (el) { paths.current[0] = el; }} d={atlD} fill="none" stroke="#f97316" strokeWidth="2.2" strokeOpacity="0.85"/>
          <path ref={function (el) { paths.current[1] = el; }} d={ctlD} fill="none" strokeWidth="3.4" style={{ stroke: 'var(--brand)' }}/>
          <path ref={function (el) { paths.current[2] = el; }} d={tsbD} fill="none" stroke="#7b8cff" strokeWidth="2"/>
          {[1, 4, 8, 12, 16, 20, 24].map(function (w) {
            return <text key={w} x={x(w)} y={H - 6} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" style={{ fill: 'var(--text-dim)' }}>{'S' + w}</text>;
          })}
          <line x1={jx} y1={Y0 - 14} x2={jx} y2={T1 + 8} stroke="#e0b766" strokeWidth="2" strokeDasharray="4 4" style={{ opacity: medal ? 1 : 0, transition: 'opacity .5s' }}/>
          <g transform={'translate(' + jx + ',' + (Y0 + 64) + ')'}><g className={'st-medal' + (medal ? ' drop' : '')}>
            <path d="M-14,-58 L-4,-18 L4,-18 L14,-58 L6,-58 L0,-34 L-6,-58 Z" style={{ fill: 'var(--brand)' }}/>
            <circle r="24" fill="#c9973f"/>
            <circle r="18" fill="none" stroke="#f3dca3" strokeWidth="1.5"/>
            <path d="M0,-9 L2.6,-2.8 L9.3,-2.8 L3.9,1.2 L5.9,7.6 L0,3.8 L-5.9,7.6 L-3.9,1.2 L-9.3,-2.8 L-2.6,-2.8 Z" fill="#f3dca3"/>
          </g></g>
        </svg>
        <div className="st-season-legend">
          <span><i style={{ background: 'var(--brand)' }}/>Forme (CTL)</span>
          <span><i style={{ background: '#f97316' }}/>Fatigue (ATL)</span>
          <span><i style={{ background: '#7b8cff' }}/>Fraîcheur (TSB)</span>
          <span className="st-jj" style={{ opacity: medal ? 1 : 0.35 }}><i style={{ background: '#e0b766' }}/>Jour J</span>
          <span className="st-plan-note">Exemple illustratif</span>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ RUBAN D'ARRIVÉE — bouton final ═════════════════ */
function FinishButton(props) {
  return (
    <span className="st-finish">
      <span className="st-post l" aria-hidden="true"/>
      <a className={'btn btn-cyan btn-lg mag ' + (props.className || '')} href={props.href}>{props.children}</a>
      <span className="st-tape l" aria-hidden="true" data-no-i18n="1"><i>{tr('ARRIVÉE')}</i></span>
      <span className="st-tape r" aria-hidden="true" data-no-i18n="1"><i>{tr('ARRIVÉE')}</i></span>
      <span className="st-post r" aria-hidden="true"/>
    </span>
  );
}

/* ═════════════════ COACH IA — en direct ═════════════════ */
var COACH_LIVE = [
  { tag: 'Récupération', q: 'Je me sens lourd depuis trois jours. Je garde ma séance au seuil de ce soir ?',
    claims: [
      ['Ta fatigue récente dépasse ta forme de fond : on décale le seuil à jeudi.', 'TSB −14'],
      ['Ta variabilité cardiaque est sous ta moyenne de la semaine.', 'VFC −11 %'],
      ['Ce soir : 40 minutes en zone 2, puis 10 minutes de mobilité.', 'Zone 2']
    ] },
  { tag: 'Nutrition', q: 'Combien de glucides avant ma sortie longue de dimanche ?',
    claims: [
      ['La veille : environ 6 à 7 g de glucides par kilo de poids.', '72 kg'],
      ['Pendant : 60 g par heure, dès la 45e minute.', '2 h 30 prévues'],
      ['Tu as bien toléré ce rythme lors de ta dernière sortie longue.', 'Historique']
    ] },
  { tag: 'Planification', q: 'Prépare-moi la semaine avant mon Hyrox.',
    claims: [
      ['Volume réduit d\'environ 40 %, intensité gardée sur deux séances clés.', 'Affûtage'],
      ['Mardi : 4 × (1 km + une station) à ton allure de course.', 'Allure cible'],
      ['Vendredi repos complet, samedi réveil musculaire de 20 minutes.', 'J-1']
    ] },
  { tag: 'Prédiction', q: 'Quel chrono vais-je faire sur mon marathon ?',
    insufficient: 'Pas assez de sorties longues enregistrées pour une prédiction fiable : je n\'invente pas de chrono. Ajoute deux sorties de plus de 25 km ou connecte Strava.' }
];

function CoachLive() {
  var lang = useLang();
  var st = React.useState(0), idx = st[0], setIdx = st[1];
  var ty = React.useState(''), typed = ty[0], setTyped = ty[1];
  var dn = React.useState(ST_RM), done = dn[0], setDone = dn[1];
  var pausedRef = React.useRef(false);
  var cardRef = React.useRef(null);
  var ex = COACH_LIVE[idx];

  // La question s'écrit (dans la langue courante), puis la réponse tombe.
  React.useEffect(function () {
    var full = tr(ex.q);
    if (ST_RM) { setTyped(full); setDone(true); return undefined; }
    setTyped(''); setDone(false);
    var n = 0;
    var t = setInterval(function () {
      n += 2;
      setTyped(full.slice(0, n));
      if (n >= full.length) { clearInterval(t); setTimeout(function () { setDone(true); }, 180); }
    }, 22);
    return function () { clearInterval(t); };
  }, [idx, lang]);

  React.useEffect(function () {
    if (ST_RM) return undefined;
    var t = setInterval(function () {
      if (!pausedRef.current && !document.hidden) setIdx(function (i) { return (i + 1) % COACH_LIVE.length; });
    }, 9500);
    return function () { clearInterval(t); };
  }, []);

  return (
    <div className="st-demo">
      <div className="st-demo-side">
        <div className="eyebrow">Coach IA · en direct</div>
        <h2 className="st-h2">Tu demandes. Ton coach répond, chiffres à l'appui.</h2>
        <p className="st-lede">Chaque conseil s'appuie sur tes vraies données — charge, sommeil, variabilité cardiaque. Et quand elles manquent, il le dit au lieu d'inventer.</p>
        <div className="st-qlist" role="tablist" aria-label="Exemples de questions">
          {COACH_LIVE.map(function (e, j) {
            return (
              <button key={j} type="button" role="tab" aria-selected={j === idx} className={'st-q' + (j === idx ? ' on' : '')}
                      onClick={function () { setIdx(j); }}>
                <span className="n">{'0' + (j + 1)}</span><span>{e.q}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="st-demo-card tilt" data-tilt="4" ref={cardRef}
           onMouseEnter={function () { pausedRef.current = true; }} onMouseLeave={function () { pausedRef.current = false; }}>
        <div className="st-dc-top">
          <span className="st-chip">{ex.tag}</span>
          <span className={'st-pill ' + (ex.insufficient ? 'warn' : 'ok')}>{ex.insufficient ? 'Données insuffisantes' : 'Réponse étayée'}</span>
        </div>
        <div className="st-dc-q">
          <span className="st-dc-who">Toi</span>
          <span data-no-i18n="1">{typed}{!done ? <span className="st-caret"/> : null}</span>
        </div>
        <div className="st-dc-a">
          <span className="st-dc-who coach">Coach</span>
          {done && (
            <ul className="st-claims" key={idx + '-' + lang}>
              {ex.insufficient
                ? <li style={{ '--i': 0 }}><span>{ex.insufficient}</span><span className="st-chip warn">Aucun chrono inventé</span></li>
                : ex.claims.map(function (c, j) {
                    return <li key={j} style={{ '--i': j }}><span>{c[0]}</span><span className="st-chip">{c[1]}</span></li>;
                  })}
            </ul>
          )}
        </div>
        <div className="st-dc-foot">
          <span>Exemple illustratif</span>
          {done && !ex.insufficient && <Seal key={'s' + idx} size={58} ring={tr('VALIDÉ PAR TES DONNÉES · ')} delay={ex.claims.length * 140 + 120}/>}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ BIBLIOTHÈQUE — on tire un livre ═════════════════ */
function Book(props) {
  var t = props.theme;
  var st = React.useState(ST_RM), open = st[0], setOpen = st[1];
  var closeRef = React.useRef(null);
  React.useEffect(function () {
    var prev = document.activeElement;
    if (closeRef.current) closeRef.current.focus();
    var tm = ST_RM ? null : setTimeout(function () { setOpen(true); }, 320);
    var onKey = function (e) { if (e.key === 'Escape') props.onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return function () { clearTimeout(tm); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; if (prev && prev.focus) prev.focus(); };
  }, []);
  var num = String(t.num).padStart(2, '0');
  return (
    <div className="st-bkwrap" role="dialog" aria-modal="true" aria-labelledby="st-bk-title" onClick={function (e) { if (e.target === e.currentTarget) props.onClose(); }}>
      <div className={'st-book' + (open ? ' open' : '')} style={{ '--c': t.accent }}>
        <button ref={closeRef} type="button" className="st-bk-x" onClick={props.onClose}>Fermer ✕</button>
        <div className="st-page left">
          <div className="st-bk-eye" data-no-i18n="1">{tr('Pilier') + ' ' + num}</div>
          <h2 id="st-bk-title">{t.title}</h2>
          <p className="st-bk-tag">{t.tagline}</p>
          <div className="st-bk-orn" aria-hidden="true">✦ ✦ ✦</div>
          <p className="st-bk-intro">{t.intro}</p>
          <span className="st-bk-pn" aria-hidden="true">— {t.num * 2 + 11} —</span>
        </div>
        <div className="st-page right">
          <ul className="st-bk-ben">
            {(t.benefits || []).map(function (b, i) { return <li key={i}><span className="st-bk-chk" aria-hidden="true">✓</span><span>{b}</span></li>; })}
          </ul>
          {t.audience && <div className="st-bk-aud"><b>Pour qui ?</b> <span>{t.audience}</span></div>}
          <div className="st-bk-cta">
            <Seal size={54} stamp={false} center={num} centerSize={24} ring="THE HYBRID WAY · "/>
            <a className="btn btn-cyan mag" href={'theme.html#' + t.slug}>Explorer ce pilier →</a>
          </div>
          <span className="st-bk-pn" aria-hidden="true">— {t.num * 2 + 12} —</span>
        </div>
        <div className="st-cover" aria-hidden="true">
          <div className="front"><span className="mono">{num}</span><b>{t.title}</b><span className="star">✦</span></div>
          <div className="back"/>
        </div>
      </div>
    </div>
  );
}

function Shelf(props) {
  var themes = props.themes || [];
  var hv = React.useState(themes[0] ? themes[0].slug : null), hot = hv[0], setHot = hv[1];
  var op = React.useState(null), openT = op[0], setOpenT = op[1];
  var cur = themes.filter(function (t) { return t.slug === hot; })[0] || themes[0];
  return (
    <div className="st-shelf-zone">
      <div className="st-shelf" role="list">
        {themes.map(function (t, i) {
          var h = 214 + ((t.num * 37) % 5) * 12;
          return (
            <div className="st-slot" key={t.slug} role="listitem">
              <button type="button" className={'st-spine' + (t.comingSoon ? ' soon' : '')}
                      style={{ '--c': t.accent, height: h, '--i': i }}
                      onMouseEnter={function () { setHot(t.slug); }} onFocus={function () { setHot(t.slug); }}
                      onClick={function () { setOpenT(t); }} aria-label={t.title}>
                <span className="no" data-no-i18n="1">{String(t.num).padStart(2, '0')}</span>
                <span className="band"/>
                <span className="ttl">{t.title}</span>
                <span className="band b2"/>
                <span className="ico"><ThemeIcon name={t.icon} size={18}/></span>
              </button>
            </div>
          );
        })}
      </div>
      {cur && (
        <div className="st-shelf-cap" aria-live="polite">
          <span className="mono" data-no-i18n="1">{'N° ' + String(cur.num).padStart(2, '0')}</span>
          <b>{cur.title}</b>
          <span>{cur.tagline}</span>
        </div>
      )}
      {openT && <Book theme={openT} onClose={function () { setOpenT(null); }}/>}
    </div>
  );
}

Object.assign(window, { RaceTrack: RaceTrack, Scoreboard: Scoreboard, PlanWriter: PlanWriter, SeasonCurve: SeasonCurve, FinishButton: FinishButton, Ticker: Ticker, Coverline: Coverline, Seal: Seal, CoachLive: CoachLive, Shelf: Shelf, Book: Book, stTr: tr });
