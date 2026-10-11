/* ════════════════════════════════════════════════════════════════
   THW — pièces maîtresses du site vitrine (couche « stade »).
     <AppLive/>     l'app en direct : 8 cartes du tableau de bord, vivantes, en 3D
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

/* ═════════════════ L'APP EN DIRECT — le tableau de bord, vivant ═════════════════
   Huit cartes reprises du vrai tableau de bord de l'app (même structure :
   icône · titre · méta, gros chiffre, puce, petit visuel ; mêmes couleurs :
   CTL cyan / ATL orange, zones Z1→Z5, sports, violet du Coach IA).
   Données d'exemple, cohérentes entre elles (fraîcheur +6 = CTL 62 − ATL 56,
   5 h 20 = somme des barres de la semaine, etc.). La scène est posée en 3D et
   s'incline avec la souris ; la séance du jour se joue, le coach écrit. */
var LV = {
  ctl: '#06B6D4', atl: '#F97316', ia: '#a855f7', run: '#22c55e',
  zone: { Z1: '#94a3b8', Z2: '#22c55e', Z3: '#eab308', Z4: '#f97316', Z5: '#ef4444' }
};
// Séance du jour : 1 h 10 = 70 min (échauffement, 3 × 10 min au seuil, retour au calme).
var LV_SEGS = [[12, 'Z1'], [8, 'Z2'], [10, 'Z4'], [3, 'Z1'], [10, 'Z4'], [3, 'Z1'], [10, 'Z4'], [4, 'Z2'], [10, 'Z1']];
var LV_ZH = { Z1: 0.24, Z2: 0.43, Z3: 0.6, Z4: 0.8, Z5: 0.97 };
// Profil d'intensité : une courbe continue (paliers raccordés en douceur), repère 420 × 84.
var LP = { W: 420, H: 84, X0: 24, top: 6, base: 78, tw: 12 };
function lpLevel(z) { return LP.base - LV_ZH[z] * (LP.base - LP.top); }
function lpY(x) {
  var span = LP.W - LP.X0 - 2, m = (x - LP.X0) / span * 70, acc = 0, ends = [];
  LV_SEGS.forEach(function (sg) { acc += sg[0]; ends.push(acc); });
  var k = 0; while (k < ends.length - 1 && m >= ends[k]) k++;
  var y = lpLevel(LV_SEGS[k][1]), half = LP.tw / 2 / span * 70;
  // Raccord arrondi entre deux paliers (smoothstep sur tw px autour de la frontière).
  for (var j = 0; j < ends.length - 1; j++) {
    if (Math.abs(m - ends[j]) < half) {
      var u = (m - (ends[j] - half)) / (2 * half); u = u * u * (3 - 2 * u);
      y = lpLevel(LV_SEGS[j][1]) + (lpLevel(LV_SEGS[j + 1][1]) - lpLevel(LV_SEGS[j][1])) * u;
    }
  }
  // Départ et arrivée posés sur la ligne de base.
  var e0 = Math.min(1, (x - LP.X0) / 10), e1 = Math.min(1, (LP.W - 2 - x) / 10);
  var e = Math.max(0, Math.min(e0, e1)); e = e * e * (3 - 2 * e);
  return LP.base + (y - LP.base) * e;
}
function lpPath() {
  var d = '';
  for (var x = LP.X0; x <= LP.W - 2 + 0.01; x += 2) d += (d ? ' L' : 'M') + x.toFixed(1) + ' ' + lpY(x).toFixed(2);
  return d;
}
var LV_ZREAD = { Z1: ['Récupération', 128, "5'50"], Z2: ['Endurance', 143, "5'12"], Z4: ['Seuil', 171, "4'05"] };
var LV_SLEEP = [430, 452, 418, 447, 441, 440, 462];      // dernière nuit 7 h 42, moyenne précédente 7 h 18 → ▲ 24 min
var LV_WEEK = [55, 0, 70, 45, 90, 60, 0];                // 320 min = 5 h 20
var LV_COACH = [
  { m: 'Ta VFC baisse depuis 3 jours : je décale le fractionné à jeudi et j’allège demain.', s: ['VFC −12 %', 'Sommeil −40 min', 'ATL 56'] },
  { m: 'Belle semaine : 4 séances sur 6. On garde le seuil d’aujourd’hui, ta fraîcheur est remontée à +6.', s: ['Fraîcheur +6', 'Volume 5 h 20', 'CTL 62'] },
  { m: 'Marathon dans 42 jours : on entre dans le bloc spécifique, sortie longue de 28 km dimanche.', s: ['J-42', 'Bloc spécifique', "Allure 4'37/km"] }
];
function lvPmc() {
  // 28 jours : la condition monte doucement vers 62, la fatigue ondule autour et finit à 56.
  var c = [], a = [];
  for (var i = 0; i < 28; i++) {
    var t = i / 27;
    c.push(51 + 11 * Math.pow(t, 0.85));
    a.push(52 + 6 * t + Math.sin(i * 0.78 + 0.6) * 4.2 * (1 - t * 0.4));
  }
  c[27] = 62; a[27] = 56;
  return { c: c, a: a };
}
function lvLine(vals, w, h, min, max) {
  return vals.map(function (v, i) { return (i ? 'L' : 'M') + (i / (vals.length - 1) * (w - 4) + 2).toFixed(1) + ' ' + (h - 4 - (v - min) / (max - min) * (h - 8)).toFixed(1); }).join(' ');
}
var LV_ABBR = { fr: ['J-', 'S'], en: ['D-', 'W'], es: ['D-', 'S'] };
function lvAbbr(i) { return (LV_ABBR[stLang()] || LV_ABBR.fr)[i]; }
function lvLocale() { var l = stLang(); return l === 'en' ? 'en-GB' : l === 'es' ? 'es-ES' : 'fr-FR'; }
function lvToday() {
  try { var s = new Date().toLocaleDateString(lvLocale(), { weekday: 'short', day: 'numeric', month: 'short' }); return s.charAt(0).toUpperCase() + s.slice(1); } catch (e) { return ''; }
}
function lvIsoWeek() {
  var d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
}
function lvCount(el, to, fmt, delay) {
  if (!el) return;
  if (ST_RM) { el.textContent = fmt(to); return; }
  el.textContent = fmt(0);
  setTimeout(function () {
    var t0 = performance.now();
    (function f(now) { var p = Math.min(1, (now - t0) / 1100); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  }, delay || 0);
}
var lvHM = function (m) { m = Math.round(m); var h = Math.floor(m / 60), r = m % 60; return h ? h + ' h ' + String(r).padStart(2, '0') : r + ' min'; };

var LV_ICON = {
  today: <g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>,
  forme: <g><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></g>,
  load: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  sleep: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>,
  week: <g><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>,
  race: <g><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></g>,
  route: <g><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></g>,
  coach: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>
};
function LvCard(props) {
  return (
    <div className={'st-lc' + (props.cls ? ' ' + props.cls : '')} style={{ '--i': props.i, '--z': (props.z || 0) + 'px', gridArea: props.area }}>
      <div className="st-lc-h">
        <svg className="st-lc-ico" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={props.ic ? { color: props.ic } : null}>{LV_ICON[props.icon]}</svg>
        <b>{props.title}</b>
        {props.meta ? <em>{props.meta}</em> : null}
        <svg className="st-lc-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </div>
      {props.children}
    </div>
  );
}
function LvBars(props) {
  var vals = props.vals, max = Math.max.apply(null, vals) || 1, w = props.w, h = props.h, bw = (w - (vals.length - 1) * 4) / vals.length;
  return (
    <svg className="st-lc-bars" width={w} height={h} viewBox={'0 0 ' + w + ' ' + h} aria-hidden="true">
      {vals.map(function (v, i) {
        var bh = Math.max(3, v / max * (h - 2));
        return <rect key={i} x={i * (bw + 4)} y={h - bh} width={bw} height={bh} rx="2.5" style={{ fill: i === props.hi ? props.c : 'rgba(158,177,200,0.32)', '--j': i }}/>;
      })}
    </svg>
  );
}

function AppLive() {
  var lang = useLang();
  var rootRef = React.useRef(null), sceneRef = React.useRef(null);
  var os = React.useState(ST_RM), on = os[0], setOn = os[1];
  var cs = React.useState(0), ci = cs[0], setCi = cs[1];
  var ss = React.useState(ST_RM ? 3 : 0), srcN = ss[0], setSrcN = ss[1];
  var ts = React.useState(ST_RM), tick = ts[0], setTick = ts[1];
  var R = React.useRef({});
  var visRef = React.useRef(true);
  var pmc = React.useMemo(lvPmc, []);

  // Entrée quand la scène devient visible ; pause hors écran / onglet caché.
  React.useEffect(function () {
    var el = rootRef.current; if (!el) return undefined;
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      visRef.current = en[0].isIntersecting && !document.hidden;
      if (en[0].isIntersecting) setOn(true);
    }, { threshold: 0.15 }) : null;
    if (io) io.observe(el); else setOn(true);
    var onVis = function () { visRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return function () { if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Compteurs (une fois, à l'entrée).
  React.useEffect(function () {
    if (!on) return;
    var r = R.current;
    lvCount(r.tsb, 6, function (v) { return '+' + Math.round(v); }, 350);
    lvCount(r.ctl, 62, function (v) { return String(Math.round(v)); }, 460);
    lvCount(r.sleep, 462, lvHM, 560);
    lvCount(r.week, 320, lvHM, 660);
    lvCount(r.race, 42, function (v) { return lvAbbr(0) + Math.round(v); }, 760);
    lvCount(r.km, 12.4, function (v) { return v.toFixed(1).replace('.', stLang() === 'en' ? '.' : ',') + ' km'; }, 860);
  }, [on]);

  // La séance du jour se joue : tête de lecture + FC qui vit + tâche cochée en chemin.
  React.useEffect(function () {
    if (!on) return undefined;
    var r = R.current, raf = 0, t0 = performance.now(), last = -1, lastBpm = 0, PASS = 11000, elapsed = 0, prev = t0;
    var total = 70;
    function at(p) { var m = p * total, acc = 0; for (var k = 0; k < LV_SEGS.length; k++) { acc += LV_SEGS[k][0]; if (m < acc) return k; } return LV_SEGS.length - 1; }
    function paint(p, now) {
      var x = LP.X0 + p * (LP.W - LP.X0 - 2), y = lpY(x);
      if (r.clip) r.clip.setAttribute('width', x.toFixed(1));
      if (r.head) r.head.setAttribute('transform', 'translate(' + x.toFixed(1) + ',0)');
      if (r.headDot) { r.headDot.setAttribute('cy', y.toFixed(1)); r.headHalo.setAttribute('cy', y.toFixed(1)); r.headLine.setAttribute('y1', (y + 5).toFixed(1)); }
      var k = at(p), z = LV_SEGS[k][1], info = LV_ZREAD[z] || LV_ZREAD.Z1;
      if (k !== last && r.zone) {
        last = k;
        r.zone.textContent = z + ' · ' + tr(info[0]);
        r.zdot.style.background = LV.zone[z];
        r.pace.textContent = info[2];
        if (r.headDot) { r.headDot.style.fill = LV.zone[z]; r.headHalo.style.fill = LV.zone[z]; }
      }
      if (r.bpm && now - lastBpm > 520) { lastBpm = now; r.bpm.textContent = String(info[1] + Math.round(Math.sin(now / 700) * 2 + (Math.random() - 0.5) * 2)); }
      if (r.clock) { var s = Math.floor(p * total * 60); r.clock.textContent = Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    }
    if (ST_RM) { paint(0.4, performance.now()); return undefined; }
    var wasTick = false;
    function frame(now) {
      var dt = now - prev; prev = now;
      if (visRef.current) elapsed += Math.min(dt, 60);
      var p = ((elapsed - 1600) % PASS) / PASS;
      if (elapsed < 1600) p = 0;
      paint(Math.max(0, p), now);
      var want = p > 0.42;
      if (want !== wasTick) { wasTick = want; setTick(want); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); };
  }, [on]);

  // Le coach écrit, puis cite ses sources ; trois messages en rotation.
  React.useEffect(function () {
    if (!on) return undefined;
    var r = R.current, timers = [], k = ci;
    function later(fn, ms) { var id = setTimeout(function () { if (!visRef.current) { later(fn, 400); return; } fn(); }, ms); timers.push(id); }
    var msg = tr(LV_COACH[k].m);
    if (ST_RM) { if (r.coach) r.coach.textContent = msg; setSrcN(3); return undefined; }
    setSrcN(0);
    if (r.coach) r.coach.textContent = '';
    if (r.bubble) r.bubble.classList.remove('out');
    var n = 0;
    function type() {
      n = Math.min(msg.length, n + (Math.random() < 0.3 ? 2 : 1));
      if (r.coach) r.coach.textContent = msg.slice(0, n);
      if (n < msg.length) later(type, 22 + Math.random() * 26);
      else { later(function () { setSrcN(1); }, 260); later(function () { setSrcN(2); }, 520); later(function () { setSrcN(3); }, 780);
             later(function () { if (r.bubble) r.bubble.classList.add('out'); }, 5200);
             later(function () { setCi((k + 1) % LV_COACH.length); }, 5700); }
    }
    later(type, k === 0 ? 1500 : 300);
    return function () { timers.forEach(clearTimeout); };
  }, [on, ci, lang]);

  // La scène s'incline avec la souris (sur tout le bandeau du haut).
  React.useEffect(function () {
    if (ST_RM) return undefined;
    var fine = false; try { fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
    var sc = sceneRef.current, host = rootRef.current && rootRef.current.closest('.st-hero');
    if (!fine || !sc || !host) return undefined;
    function mv(e) {
      var b = host.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      sc.style.setProperty('--ry', (-11 + x * 9).toFixed(2) + 'deg');
      sc.style.setProperty('--rx', (7 - y * 7).toFixed(2) + 'deg');
    }
    function lv() { sc.style.removeProperty('--ry'); sc.style.removeProperty('--rx'); }
    host.addEventListener('pointermove', mv); host.addEventListener('pointerleave', lv);
    return function () { host.removeEventListener('pointermove', mv); host.removeEventListener('pointerleave', lv); };
  }, []);

  var ref = function (k) { return function (el) { R.current[k] = el; }; };
  var lpD = React.useMemo(lpPath, []);
  var lpArea = lpD + ' L' + (LP.W - 2) + ' ' + LP.base + ' L' + LP.X0 + ' ' + LP.base + ' Z';
  var vmin = 44, vmax = 66;
  var coach = LV_COACH[ci];
  return (
    <div className={'st-live' + (on ? ' on' : '')} ref={rootRef}>
      <div className="st-live-stage">
        <div className="st-live-scene" ref={sceneRef}>
          {/* 1 — Aujourd'hui */}
          <LvCard i={0} z={46} area="td" cls="st-lc-hero" icon="today" title="Aujourd'hui" meta={<span data-no-i18n="1">{lvToday()}</span>}>
            <div className="st-lc-sport"><i style={{ background: LV.run }}></i><span>Running</span></div>
            <div className="st-lc-title">Seuil — 3 × 10 min</div>
            <div className="st-lc-sub"><span data-no-i18n="1">1 h 10</span> · <span>Intense</span></div>
            <svg className="st-lc-prof" viewBox={'0 0 ' + LP.W + ' ' + LP.H} aria-hidden="true">
              <defs>
                <linearGradient id="lpStroke" gradientUnits="userSpaceOnUse" x1="0" y1={LP.top} x2="0" y2={LP.base}>
                  <stop offset="0" stopColor="#ef4444"/><stop offset="0.2" stopColor="#f97316"/><stop offset="0.45" stopColor="#eab308"/>
                  <stop offset="0.66" stopColor="#22c55e"/><stop offset="0.86" stopColor="#94a3b8"/><stop offset="1" stopColor="#94a3b8"/>
                </linearGradient>
                <linearGradient id="lpFill" gradientUnits="userSpaceOnUse" x1="0" y1={LP.top} x2="0" y2={LP.base}>
                  <stop offset="0" stopColor="#f97316" stopOpacity="0.5"/><stop offset="0.45" stopColor="#eab308" stopOpacity="0.26"/>
                  <stop offset="0.75" stopColor="#22c55e" stopOpacity="0.12"/><stop offset="1" stopColor="#94a3b8" stopOpacity="0.02"/>
                </linearGradient>
                <clipPath id="lvClip"><rect ref={ref('clip')} x="0" y="0" width="0" height={LP.H}/></clipPath>
              </defs>
              {['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map(function (z) {
                var y = lpLevel(z);
                return (
                  <g key={z}>
                    <line x1={LP.X0} y1={y} x2={LP.W} y2={y} stroke="rgba(158,177,200,0.16)" strokeWidth="1" strokeDasharray="2 4"/>
                    <text x="0" y={y + 3} fontFamily="IBM Plex Mono, monospace" fontSize="8.5" fill={LV.zone[z]} fillOpacity="0.85">{z}</text>
                  </g>
                );
              })}
              <line x1={LP.X0} y1={LP.base} x2={LP.W} y2={LP.base} stroke="rgba(158,177,200,0.3)" strokeWidth="1"/>
              <path className="st-lc-fade" d={lpArea} fill="rgba(158,177,200,0.07)"/>
              <path className="st-lc-draw" pathLength="1" d={lpD} fill="none" stroke="rgba(238,243,248,0.26)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
              <g clipPath="url(#lvClip)">
                <path d={lpArea} fill="url(#lpFill)"/>
                <path d={lpD} fill="none" stroke="url(#lpStroke)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(249,115,22,.45))' }}/>
              </g>
              <g ref={ref('head')}>
                <line ref={ref('headLine')} x1="0" y1={LP.base} x2="0" y2={LP.base} stroke="rgba(238,243,248,0.55)" strokeWidth="1" strokeDasharray="2 2"/>
                <circle ref={ref('headHalo')} cx="0" cy={LP.base} r="9" style={{ fill: LV.zone.Z1, opacity: 0.25 }}/>
                <circle ref={ref('headDot')} cx="0" cy={LP.base} r="4.2" style={{ fill: LV.zone.Z1, stroke: '#eef3f8', strokeWidth: 1.6 }}/>
              </g>
            </svg>
            <div className="st-lc-read" data-no-i18n="1">
              <span className="st-lc-zone"><i ref={ref('zdot')}></i><span ref={ref('zone')}>Z1</span></span>
              <span><b ref={ref('bpm')}>128</b> bpm</span>
              <span><b ref={ref('pace')}>5'50</b> /km</span>
              <span className="st-lc-clock" ref={ref('clock')}>0:00:00</span>
            </div>
            <div className="st-lc-tasks">
              <div className="st-lc-tt">Tâches du jour</div>
              <div className={'st-lc-task' + (tick ? ' done' : '')}><i aria-hidden="true"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg></i><span>Mobilité hanches — 10 min</span></div>
              <div className="st-lc-task"><i aria-hidden="true"></i><span>Dîner riche en glucides</span></div>
            </div>
          </LvCard>

          {/* 2 — Forme du jour */}
          <LvCard i={1} z={24} area="fo" icon="forme" title="Forme du jour">
            <div className="st-lc-m">
              <div>
                <div className="st-lc-l">Fraîcheur (TSB)</div>
                <div className="st-lc-v" data-no-i18n="1" ref={ref('tsb')}>+6</div>
                <span className="st-lc-chip" style={{ color: LV.ctl, background: 'rgba(6,182,212,.14)' }}>Frais</span>
              </div>
              <svg width="78" height="50" viewBox="0 0 86 56" aria-hidden="true">
                <path d="M 8 50 A 35 35 0 0 1 78 50" fill="none" stroke="rgba(158,177,200,.18)" strokeWidth="8" strokeLinecap="round"/>
                <path className="st-lc-gauge" d="M 8 50 A 35 35 0 0 1 78 50" pathLength="1" fill="none" stroke={LV.ctl} strokeWidth="8" strokeLinecap="round" style={{ '--to': 1 - 0.708 }}/>
              </svg>
            </div>
          </LvCard>

          {/* 3 — Charge */}
          <LvCard i={2} z={30} area="ch" icon="load" title="Charge" meta="4 sem.">
            <div className="st-lc-m">
              <div>
                <div className="st-lc-l">Condition (CTL)</div>
                <div className="st-lc-v" data-no-i18n="1" ref={ref('ctl')}>62</div>
                <span className="st-lc-chip" style={{ color: LV.ctl, background: 'rgba(6,182,212,.14)' }} data-no-i18n="1">▲ 4</span>
              </div>
              <svg width="88" height="46" viewBox="0 0 110 56" aria-hidden="true">
                <path className="st-lc-draw" pathLength="1" d={lvLine(pmc.a, 110, 56, vmin, vmax)} fill="none" stroke={LV.atl} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
                <path className="st-lc-draw d2" pathLength="1" d={lvLine(pmc.c, 110, 56, vmin, vmax)} fill="none" stroke={LV.ctl} strokeWidth="2.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="st-lc-foot"><span>Fatigue (ATL)</span> <b data-no-i18n="1">56</b></div>
          </LvCard>

          {/* 4 — Coach IA */}
          <LvCard i={3} z={58} area="co" cls="st-lc-ia" icon="coach" ic={LV.ia} title="Coach IA" meta="maintenant">
            <div className="st-lc-bubble" ref={ref('bubble')}>
              <span data-no-i18n="1" ref={ref('coach')}></span><span className="st-caret" aria-hidden="true"></span>
            </div>
            <div className="st-lc-src" data-no-i18n="1">
              <span className="st-lc-srcl">{tr('Sources')}</span>
              {coach.s.map(function (s, j) { return <span key={ci + '-' + j} className={'st-lc-pill' + (j < srcN ? ' in' : '')}>{tr(s)}</span>; })}
            </div>
          </LvCard>

          {/* 5 — Sommeil */}
          <LvCard i={4} z={18} area="sl" cls="mh" icon="sleep" title="Sommeil" meta="7 nuits">
            <div className="st-lc-l">Dernière nuit</div>
            <div className="st-lc-v" data-no-i18n="1" ref={ref('sleep')}>7 h 42</div>
            <div className="st-lc-row">
              <span className="st-lc-chip" style={{ color: '#a5b4fc', background: 'rgba(129,140,248,.16)' }} data-no-i18n="1">▲ 24 min</span>
              <LvBars vals={LV_SLEEP} hi={6} c="#818cf8" w={74} h={34}/>
            </div>
          </LvCard>

          {/* 6 — Cette semaine */}
          <LvCard i={5} z={10} area="wk" cls="mh nar" icon="week" title="Cette semaine" meta={<span data-no-i18n="1">{lvAbbr(1) + lvIsoWeek()}</span>}>
            <div className="st-lc-l">Volume réalisé</div>
            <div className="st-lc-v sm"><span data-no-i18n="1" ref={ref('week')}>5 h 20</span><small data-no-i18n="1"> / 8 h 30</small></div>
            <div className="st-lc-row">
              <span className="st-lc-mut"><span data-no-i18n="1">4 / 6 </span><span>séances</span></span>
              <LvBars vals={LV_WEEK} hi={4} c={LV.ctl} w={70} h={30}/>
            </div>
          </LvCard>

          {/* 7 — Prochaine compétition */}
          <LvCard i={6} z={14} area="rc" cls="mh nar" icon="race" title="Prochaine compétition">
            <div className="st-lc-m">
              <div>
                <div className="st-lc-l">Marathon de Paris</div>
                <div className="st-lc-v sm" data-no-i18n="1" ref={ref('race')}>J-42</div>
                <span className="st-lc-mut">Objectif 3 h 15</span>
              </div>
              <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
                <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(158,177,200,.18)" strokeWidth="5"/>
                <circle className="st-lc-gauge" cx="23" cy="23" r="18" pathLength="1" fill="none" stroke="#e0b766" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 23 23)" style={{ '--to': 0.5 }}/>
              </svg>
            </div>
          </LvCard>

          {/* 8 — Dernière activité */}
          <LvCard i={7} z={26} area="ac" cls="mh nar" icon="route" title="Dernière activité" meta="Hier">
            <div className="st-lc-m">
              <div>
                <div className="st-lc-sport sm"><i style={{ background: LV.run }}></i><span>Sortie longue</span></div>
                <div className="st-lc-v sm" data-no-i18n="1" ref={ref('km')}>12,4 km</div>
                <span className="st-lc-mut" data-no-i18n="1">1 h 00 · 4'52/km</span>
              </div>
              <svg width="62" height="56" viewBox="0 0 62 56" aria-hidden="true">
                <path className="st-lc-draw" pathLength="1" d="M8 46 C 4 34, 14 30, 12 22 S 18 6, 30 8 S 46 4, 52 14 S 58 30, 48 36 S 34 40, 30 48 S 16 52, 8 46" fill="none" stroke={LV.run} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="46" r="3.2" fill="#eef3f8"/>
              </svg>
            </div>
          </LvCard>
        </div>
      </div>
      <div className="st-live-note">Exemple illustratif — voilà ce que tu vois en ouvrant l’app.</div>
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

Object.assign(window, { AppLive: AppLive, Scoreboard: Scoreboard, PlanWriter: PlanWriter, SeasonCurve: SeasonCurve, FinishButton: FinishButton, Ticker: Ticker, Coverline: Coverline, Seal: Seal, CoachLive: CoachLive, Shelf: Shelf, Book: Book, stTr: tr });
