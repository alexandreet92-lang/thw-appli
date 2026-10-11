/* ════════════════════════════════════════════════════════════════
   THW — pièces maîtresses du site vitrine (couche « stade »).
     <HybridAthlete/> une silhouette qui passe d'un sport à l'autre (chronophotographie)
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

/* ═════════════════ L'ATHLÈTE HYBRIDE — une silhouette, sept sports ═════════════════
   Une seule silhouette passe d'un sport à l'autre. Pendant la transformation,
   ses positions intermédiaires restent imprimées un instant (chronophotographie
   à la Marey) ; un cadran de chrono doré mesure le temps passé dans chaque sport.
   Chaque sport a son décor (vélo, ligne d'eau, barre, rameur, traîneau, pente). */
var ATH_SPORTS = [
  { k: 'run', n: 'Course à pied', c: '#f97316', d: 'Allures, zones cardiaques et plans du 5 km au marathon.' },
  { k: 'trail', n: 'Trail', c: '#a3e635', d: 'Dénivelé, sorties longues et préparation des ultras.' },
  { k: 'bike', n: 'Vélo', c: '#00c8e0', d: 'Puissance, FTP et zones de watts, synchronisés avec tes capteurs.' },
  { k: 'swim', n: 'Natation', c: '#60a5fa', d: 'Allure au 100 m et séances techniques.' },
  { k: 'row', n: 'Aviron', c: '#2dd4bf', d: 'Séances sur ergomètre et suivi de la charge.' },
  { k: 'hyrox', n: 'Hyrox', c: '#f472b6', d: 'Course et stations enchaînées dans un plan hybride.' },
  { k: 'gym', n: 'Musculation', c: '#22c55e', d: "Force, puissance et explosivité, intégrées à l'endurance." }
];
// Articulations : tête [x,y,r] + 13 points. Repère 560 × 500, l'athlète regarde à droite.
var ATH_J = ['neck', 'lS', 'rS', 'lE', 'rE', 'lW', 'rW', 'lH', 'rH', 'lK', 'rK', 'lA', 'rA'];
var ATH_POSES = {
  run: { head: [300, 86, 23], neck: [292, 113], lS: [282, 128], rS: [292, 131], lE: [314, 176], rE: [250, 170], lW: [350, 150], rW: [262, 218],
         lH: [268, 238], rH: [275, 241], lK: [236, 322], rK: [318, 330], lA: [194, 384], rA: [330, 428] },
  trail: { head: [326, 112, 23], neck: [313, 136], lS: [300, 150], rS: [310, 152], lE: [278, 202], rE: [326, 202], lW: [258, 244], rW: [330, 262],
           lH: [262, 250], rH: [268, 253], lK: [240, 340], rK: [324, 300], lA: [204, 424], rA: [330, 388] },
  bike: { head: [356, 176, 22], neck: [338, 190], lS: [318, 200], rS: [326, 204], lE: [330, 252], rE: [338, 254], lW: [372, 248], rW: [380, 250],
          lH: [228, 248], rH: [234, 250], lK: [282, 296], rK: [286, 318], lA: [224, 356], rA: [276, 404] },
  swim: { head: [402, 262, 22], neck: [378, 268], lS: [356, 270], rS: [362, 274], lE: [338, 224], rE: [410, 284], lW: [384, 240], rW: [458, 286],
          lH: [250, 282], rH: [254, 284], lK: [170, 288], rK: [176, 296], lA: [96, 282], rA: [104, 306] },
  row: { head: [302, 244, 22], neck: [284, 266], lS: [270, 284], rS: [276, 286], lE: [324, 304], rE: [330, 306], lW: [376, 322], rW: [382, 324],
         lH: [214, 388], rH: [220, 390], lK: [296, 312], rK: [302, 316], lA: [392, 396], rA: [398, 400] },
  hyrox: { head: [330, 168, 22], neck: [312, 184], lS: [292, 196], rS: [298, 198], lE: [334, 214], rE: [340, 218], lW: [372, 226], rW: [378, 230],
           lH: [208, 268], rH: [214, 270], lK: [158, 346], rK: [282, 336], lA: [110, 428], rA: [272, 432] },
  gym: { head: [280, 96, 24], neck: [280, 126], lS: [244, 142], rS: [316, 142], lE: [220, 98], rE: [340, 98], lW: [214, 50], rW: [346, 50],
         lH: [258, 250], rH: [302, 250], lK: [248, 340], rK: [312, 340], lA: [244, 432], rA: [316, 432] }
};
var ATH_LIMBS = [['neck', 'lS', 7], ['neck', 'rS', 7], ['lS', 'lE', 7], ['lE', 'lW', 6], ['lH', 'lK', 9], ['lK', 'lA', 8],
                 ['lS', 'lH', 11], ['rS', 'rH', 11], ['lH', 'rH', 9], ['rS', 'rE', 7], ['rE', 'rW', 6], ['rH', 'rK', 9], ['rK', 'rA', 8]];
var ATH_FAR = { lS: 1, lE: 1, lW: 1, lH: 1, lK: 1, lA: 1 };
var ATH_GOLD = '#e0b766';

function athLerp(a, b, t) { return a + (b - a) * t; }
function athEase(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function athMix(p1, p2, t) {
  var o = { head: [athLerp(p1.head[0], p2.head[0], t), athLerp(p1.head[1], p2.head[1], t), athLerp(p1.head[2], p2.head[2], t)] };
  ATH_J.forEach(function (k) { o[k] = [athLerp(p1[k][0], p2[k][0], t), athLerp(p1[k][1], p2[k][1], t)]; });
  return o;
}
function athRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function athCol(c1, c2, t, a) {
  var x = athRgb(c1), y = athRgb(c2);
  return 'rgba(' + Math.round(athLerp(x[0], y[0], t)) + ',' + Math.round(athLerp(x[1], y[1], t)) + ',' + Math.round(athLerp(x[2], y[2], t)) + ',' + a + ')';
}

// Décor propre à chaque sport (traits fins, encre de nuit + or). t = secondes, pour ce qui tourne.
function athProps(ctx, k, a, t) {
  if (a <= 0.01) return;
  var ink = 'rgba(238,243,248,' + (0.42 * a) + ')', soft = 'rgba(238,243,248,' + (0.16 * a) + ')', gold = 'rgba(224,183,102,' + (0.9 * a) + ')';
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  function line(pts, col, w) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
  function circ(x, y, r, col, w, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); } }
  if (k === 'run') {
    line([70, 434, 490, 434], ink, 1.6); line([70, 462, 490, 462], soft, 1);
    for (var i = 0; i < 9; i++) line([90 + i * 48 - ((t * 120) % 48), 448, 104 + i * 48 - ((t * 120) % 48), 448], soft, 1.4);
  } else if (k === 'trail') {
    line([70, 458, 490, 353], ink, 1.6); line([70, 476, 490, 371], soft, 1);
    line([420, 371, 420, 330, 446, 338, 420, 346], gold, 1.6);
    for (var j = 0; j < 6; j++) { var x = 110 + j * 64; line([x, 458 - 0.25 * (x - 70) + 10, x + 14, 458 - 0.25 * (x + 14 - 70) + 10], soft, 1.2); }
  } else if (k === 'bike') {
    line([60, 456, 500, 456], soft, 1.2);
    [[140, 392], [372, 392]].forEach(function (w) {
      circ(w[0], w[1], 62, ink, 2.2); circ(w[0], w[1], 54, soft, 1);
      for (var s = 0; s < 3; s++) { var an = t * 3 + s * Math.PI / 3; line([w[0] - Math.cos(an) * 54, w[1] - Math.sin(an) * 54, w[0] + Math.cos(an) * 54, w[1] + Math.sin(an) * 54], soft, 1); }
      circ(w[0], w[1], 4, null, 0, gold);
    });
    line([140, 392, 250, 380, 222, 262, 140, 392], ink, 2.4);
    line([222, 262, 342, 270, 250, 380], ink, 2.4);
    line([342, 270, 372, 392], ink, 2.4);
    line([208, 256, 242, 254], gold, 3); line([342, 270, 388, 262], ink, 2);
    circ(250, 380, 14, ink, 1.6);
  } else if (k === 'swim') {
    ctx.beginPath();
    for (var x2 = 50; x2 <= 510; x2 += 6) { var y2 = 262 + Math.sin(x2 / 26 + t * 2.2) * 3.2; if (x2 === 50) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
    ctx.strokeStyle = 'rgba(96,165,250,' + (0.55 * a) + ')'; ctx.lineWidth = 1.8; ctx.stroke();
    var wg = ctx.createLinearGradient(0, 264, 0, 420); wg.addColorStop(0, 'rgba(96,165,250,' + (0.09 * a) + ')'); wg.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(280, 300, 230, 120, 0, 0, Math.PI); ctx.fill();
    for (var b = 0; b < 15; b++) circ(66 + b * 31, 404, 4.5, null, 0, b % 2 ? 'rgba(238,243,248,' + (0.3 * a) + ')' : gold);
    for (var q = 0; q < 5; q++) { var by = 300 - ((t * 30 + q * 23) % 46); circ(84 + q * 9, by, 2 + (q % 2), 'rgba(238,243,248,' + (0.25 * a) + ')', 1); }
  } else if (k === 'row') {
    line([110, 414, 470, 414], ink, 2.2); line([128, 414, 128, 440], soft, 1.4); line([450, 414, 450, 440], soft, 1.4);
    ctx.fillStyle = gold; ctx.fillRect(196, 398, 42, 8);
    line([392, 412, 410, 376], ink, 2.2);
    circ(484, 330, 34, ink, 2.2); circ(484, 330, 26, soft, 1);
    for (var f = 0; f < 4; f++) { var fa = t * 4 + f * Math.PI / 2; line([484, 330, 484 + Math.cos(fa) * 24, 330 + Math.sin(fa) * 24], soft, 1); }
    line([380, 323, 452, 328], 'rgba(238,243,248,' + (0.3 * a) + ')', 1.2);
    line([470, 298, 452, 250], ink, 1.6); ctx.strokeStyle = gold; ctx.lineWidth = 1.4; ctx.strokeRect(434, 230, 34, 22);
  } else if (k === 'hyrox') {
    line([60, 440, 510, 440], ink, 1.6);
    for (var h = 0; h < 8; h++) line([70 + h * 58 - ((t * 40) % 58), 452, 90 + h * 58 - ((t * 40) % 58), 452], soft, 1.4);
    line([378, 228, 394, 388], ink, 2.4); line([386, 232, 402, 388], ink, 2.4);
    ctx.beginPath(); ctx.moveTo(372, 390); ctx.lineTo(486, 390); ctx.lineTo(500, 430); ctx.lineTo(366, 430); ctx.closePath();
    ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = 'rgba(224,183,102,' + (0.16 * a) + ')'; ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 1.6; ctx.strokeRect(404, 352, 60, 38); line([404, 371, 464, 371], gold, 1.2);
    line([360, 436, 504, 436, 514, 426], ink, 2);
  } else if (k === 'gym') {
    ctx.fillStyle = 'rgba(224,183,102,' + (0.12 * a) + ')'; ctx.fillRect(150, 434, 260, 10);
    line([150, 434, 410, 434], ink, 1.6); line([60, 444, 500, 444], soft, 1);
    line([118, 50, 442, 50], ink, 3);
    [[134, 80], [154, 58], [408, 80], [388, 58]].forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? 'rgba(238,243,248,' + (0.22 * a) + ')' : gold;
      ctx.fillRect(p[0] - 8, 50 - p[1] / 2, 16, p[1]);
    });
    line([168, 40, 168, 60], ink, 3); line([374, 40, 374, 60], ink, 3);
  }
  ctx.restore();
}

function athFigure(ctx, P, col, alpha, glow) {
  ctx.save();
  ctx.lineCap = 'round';
  // Membres du côté éloigné, un ton plus sombre : la silhouette gagne du relief.
  ATH_LIMBS.forEach(function (L) {
    var p1 = P[L[0]], p2 = P[L[1]];
    var far = ATH_FAR[L[0]] && ATH_FAR[L[1]];
    if (glow) {
      ctx.globalAlpha = alpha * 0.18; ctx.strokeStyle = col; ctx.lineWidth = L[2] + 9;
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }
    ctx.globalAlpha = alpha * (far ? 0.55 : 1); ctx.strokeStyle = col; ctx.lineWidth = glow ? L[2] : 2;
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  });
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(P.head[0], P.head[1], glow ? P.head[2] : P.head[2] * 0.8, 0, Math.PI * 2);
  if (glow) {
    var g = ctx.createRadialGradient(P.head[0] - 7, P.head[1] - 7, 2, P.head[0], P.head[1], P.head[2]);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.45, col); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
  } else { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); }
  if (glow) {
    // Articulations dorées.
    ATH_J.forEach(function (k) {
      if (k === 'neck') return;
      ctx.globalAlpha = alpha * (ATH_FAR[k] ? 0.6 : 1);
      ctx.beginPath(); ctx.arc(P[k][0], P[k][1], 3.6, 0, Math.PI * 2); ctx.fillStyle = ATH_GOLD; ctx.fill();
      ctx.beginPath(); ctx.arc(P[k][0], P[k][1], 6.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(224,183,102,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    });
  }
  ctx.restore();
}

function HybridAthlete() {
  useLang();
  var N = ATH_SPORTS.length;
  var cs = React.useState(0), cur = cs[0], setCur = cs[1];
  var canRef = React.useRef(null), boxRef = React.useRef(null);
  var ctl = React.useRef({ go: null });

  React.useEffect(function () {
    var cv = canRef.current;
    if (!cv) return undefined;
    var ctx = cv.getContext('2d');
    var W = 560, H = 500, CX = 280, CY = 258, R = 226;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    var HOLD = 2800, MORPH = 1150;
    var si = 0, ni = 1, phase = 'hold', pt = 0, hold = HOLD, last = 0, raf = 0, visible = true, shown = 0, sec = 0;
    var ghosts = [], sparks = [], ghostT = 0, picked = false;

    function pose(i) { return ATH_POSES[ATH_SPORTS[i].k]; }
    function burst(P, c) {
      var cx = (P.lS[0] + P.rH[0]) / 2, cy = (P.lS[1] + P.rH[1]) / 2;
      for (var i = 0; i < 26; i++) {
        var an = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 3.4;
        sparks.push({ x: cx + (Math.random() - 0.5) * 60, y: cy + (Math.random() - 0.5) * 120, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 1, r: 0.8 + Math.random() * 2.2, c: Math.random() > 0.45 ? ATH_GOLD : c });
      }
    }
    function dial(prog, a) {
      ctx.save();
      for (var i = 0; i < 60; i++) {
        var an = -Math.PI / 2 + i * Math.PI / 30, big = i % 5 === 0;
        var r1 = R - (big ? 13 : 7);
        ctx.beginPath(); ctx.moveTo(CX + Math.cos(an) * r1, CY + Math.sin(an) * r1); ctx.lineTo(CX + Math.cos(an) * R, CY + Math.sin(an) * R);
        ctx.strokeStyle = 'rgba(238,243,248,' + (big ? 0.3 : 0.12) + ')'; ctx.lineWidth = big ? 1.6 : 1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(CX, CY, R + 9, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(238,243,248,0.07)'; ctx.lineWidth = 1; ctx.stroke();
      if (prog > 0 && a > 0) {
        var end = -Math.PI / 2 + prog * Math.PI * 2;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(CX, CY, R + 9, -Math.PI / 2, end); ctx.strokeStyle = ATH_GOLD; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(CX + Math.cos(end) * (R + 9), CY + Math.sin(end) * (R + 9), 4.2, 0, Math.PI * 2); ctx.fillStyle = ATH_GOLD; ctx.fill();
        ctx.shadowColor = ATH_GOLD; ctx.shadowBlur = 14; ctx.fill();
      }
      ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var m = phase === 'morph' ? athEase(Math.min(1, pt / MORPH)) : 0;
      var c1 = ATH_SPORTS[si].c, c2 = ATH_SPORTS[ni].c;
      var col = phase === 'morph' ? athCol(c1, c2, m, 1) : c1;
      // Halo de couleur du sport.
      var g = ctx.createRadialGradient(CX, CY, 10, CX, CY, R);
      g.addColorStop(0, phase === 'morph' ? athCol(c1, c2, m, 0.16) : athCol(c1, c1, 0, 0.16)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      dial(phase === 'hold' ? Math.min(1, pt / hold) : 1, phase === 'hold' ? 1 : 1 - m);
      athProps(ctx, ATH_SPORTS[si].k, phase === 'morph' ? 1 - Math.min(1, m * 1.6) : 1, sec);
      if (phase === 'morph') athProps(ctx, ATH_SPORTS[ni].k, Math.max(0, m * 1.6 - 0.6), sec);
      ghosts.forEach(function (gh) { athFigure(ctx, gh.P, gh.c, gh.life * 0.34, false); });
      var P = phase === 'morph' ? athMix(pose(si), pose(ni), m) : pose(si);
      if (phase === 'hold' && !ST_RM) {
        // Respiration : l'athlète n'est jamais figé.
        var bob = Math.sin(sec * 2.6) * 2.2;
        P = athMix(P, P, 0); P.head[1] += bob;
        ATH_J.forEach(function (k) { P[k] = [P[k][0], P[k][1] + (k.charAt(1) === 'A' ? 0 : bob * (k === 'lK' || k === 'rK' ? 0.4 : 0.8))]; });
      }
      athFigure(ctx, P, col, 1, true);
      sparks.forEach(function (p) {
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life) * 0.9; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.3, p.r * p.life), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      return P;
    }
    function frame(ts) {
      raf = 0;
      if (!visible) { last = 0; return; }
      var dt = last ? Math.min(50, ts - last) : 16; last = ts; pt += dt; sec += dt / 1000;
      if (phase === 'hold' && pt >= hold) { phase = 'morph'; pt = 0; burst(pose(si), ATH_SPORTS[si].c); }
      else if (phase === 'morph' && pt >= MORPH) { phase = 'hold'; pt = 0; si = ni; ni = (ni + 1) % N; hold = picked ? HOLD * 2.2 : HOLD; picked = false; }
      var want = phase === 'morph' && pt / MORPH > 0.5 ? ni : si;
      if (want !== shown) { shown = want; setCur(want); }
      ghosts.forEach(function (gh) { gh.life -= dt / 1100; }); ghosts = ghosts.filter(function (gh) { return gh.life > 0; });
      sparks.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life -= 0.022; });
      sparks = sparks.filter(function (p) { return p.life > 0; });
      var P = draw();
      ghostT += dt;
      if (phase === 'morph' && ghostT > 85) { ghostT = 0; ghosts.push({ P: athMix(P, P, 0), c: athCol(ATH_SPORTS[si].c, ATH_SPORTS[ni].c, athEase(Math.min(1, pt / MORPH)), 1), life: 1 }); }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible && !ST_RM) raf = requestAnimationFrame(frame); }
    // Choix d'un sport (pastilles) : la silhouette s'y transforme, puis reste plus longtemps.
    ctl.current.go = function (i) {
      if (ST_RM) { si = i; ni = (i + 1) % N; phase = 'hold'; pt = 0; shown = i; setCur(i); draw(); return; }
      if (phase === 'hold' && i === si) { pt = 0; hold = HOLD * 2.2; return; }
      if (phase === 'morph') { si = shown; }
      if (i === si) { phase = 'hold'; pt = 0; hold = HOLD * 2.2; return; }
      ni = i; phase = 'morph'; pt = 0; picked = true; burst(pose(si), ATH_SPORTS[si].c);
      kick();
    };
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting && !document.hidden; kick(); }) : null;
    if (io && boxRef.current) io.observe(boxRef.current);
    var onVis = function () { visible = !document.hidden; kick(); };
    document.addEventListener('visibilitychange', onVis);
    draw(); kick();
    return function () { cancelAnimationFrame(raf); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  var sp = ATH_SPORTS[cur];
  return (
    <div className="st-ath" ref={boxRef} style={{ '--c': sp.c }}>
      <div className="st-ath-stage">
        <canvas ref={canRef} className="st-ath-canvas" role="img" aria-label="Silhouette d'athlète qui passe d'un sport à l'autre"/>
        <div className="st-ath-cap" aria-live="polite">
          <span className="mono" data-no-i18n="1">{String(cur + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</span>
          <b key={sp.k}>{sp.n}</b>
          <span className="st-ath-d" key={'d' + sp.k}>{sp.d}</span>
        </div>
      </div>
      <div className="st-ath-picks" role="tablist" aria-label="Choisir un sport">
        {ATH_SPORTS.map(function (s, i) {
          return (
            <button key={s.k} type="button" role="tab" aria-selected={i === cur} className={i === cur ? 'on' : ''} style={{ '--c': s.c }}
                    onClick={function () { if (ctl.current.go) ctl.current.go(i); }}>
              <i aria-hidden="true"></i>{s.n}
            </button>
          );
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

Object.assign(window, { HybridAthlete: HybridAthlete, Scoreboard: Scoreboard, PlanWriter: PlanWriter, SeasonCurve: SeasonCurve, FinishButton: FinishButton, Ticker: Ticker, Coverline: Coverline, Seal: Seal, CoachLive: CoachLive, Shelf: Shelf, Book: Book, stTr: tr });
