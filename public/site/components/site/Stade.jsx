/* ════════════════════════════════════════════════════════════════
   THW — pièces maîtresses du site vitrine (couche « stade »).
     <RaceGlobe/>   globe orientable : la carte des grands rendez-vous,
                    arcs lumineux depuis Paris (THW) vers chaque course
     <Ticker/>      bandeau défilant (disciplines, outils)
     <Coverline/>   chiffres qui montent + jauge qui se remplit
     <Seal/>        sceau doré qui « frappe » (validé, record, palier)
     <CoachLive/>   l'athlète demande, le coach répond chiffres à l'appui
     <Shelf/>       bibliothèque des piliers : on tire un livre, il s'ouvre
   Dessin 100 % maison (canvas / SVG), aucune librairie.
   Textes : FR source ; tr() lit le dictionnaire i18n pour ce qui est
   construit hors du DOM (texte qui s'écrit, infobulle du globe).
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
      <text fontFamily="var(--font-mono)" fontSize="8.2" letterSpacing="2.2" fill="currentColor">
        <textPath href={'#' + id}>{ring + ring}</textPath>
      </text>
      {props.center
        ? <text x="50" y="56" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600" fontSize={props.centerSize || 17} fill="currentColor">{props.center}</text>
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

/* ═════════════════ GLOBE — la carte des courses ═════════════════ */
var GLOBE_LAND = [
  // Amérique du Nord
  [[70,-160],[71,-150],[70,-140],[69,-130],[70,-120],[73,-100],[72,-90],[69,-80],[63,-78],[60,-65],[55,-60],[50,-56],[47,-53],[45,-62],[44,-66],[41,-70],[39,-74],[35,-76],[32,-81],[30,-81],[27,-80],[25,-80.5],[29,-83],[30,-88],[29,-95],[26,-97],[22,-97.5],[19,-96],[18,-94],[21,-87],[18,-88],[15,-88],[15,-84],[11,-84],[9,-79],[8,-77],[7,-80],[9,-85],[13,-88],[16,-95],[19,-105],[23,-110],[28,-112],[31,-115],[34,-119],[38,-123],[42,-124],[48,-125],[54,-131],[58,-137],[60,-146],[59,-152],[57,-158],[55,-163],[60,-165],[65,-168],[68,-166]],
  [[63,-65],[67,-62],[70,-68],[73,-78],[72,-85],[68,-75],[64,-73]],
  [[70,-110],[73,-120],[77,-115],[80,-90],[76,-80],[72,-75],[70,-85]],
  // Groenland, Islande
  [[60,-44],[64,-40],[70,-22],[76,-18],[82,-30],[83,-40],[81,-60],[78,-70],[76,-68],[73,-56],[69,-51],[64,-51.5],[61,-48]],
  [[63.4,-19],[64,-22.7],[65.5,-24],[66.5,-16],[65,-13.5],[64.2,-15]],
  // Amérique du Sud
  [[12,-72],[11,-64],[8,-60],[5,-52],[1,-50],[-2,-44],[-5,-36],[-8,-35],[-13,-38.5],[-23,-42],[-25,-48],[-30,-50],[-34,-53],[-38,-57],[-41,-63],[-46,-67],[-52,-69],[-55,-68],[-54,-72],[-50,-75],[-45,-74],[-37,-73.5],[-30,-71.5],[-18,-70.3],[-14,-76],[-6,-81],[-2,-80.5],[1,-79],[4,-77.5],[8,-77],[11,-75]],
  // Europe
  [[36,-9.5],[37,-6],[36.5,-2],[38,0],[41,2],[43,3],[43.3,5.5],[44,8.5],[44,10],[42,12],[40.5,15],[38,16],[40,18.5],[41.5,16],[44,12.5],[45.5,12.3],[45.7,13.7],[43,16.5],[41.7,19.5],[40,20],[38.5,21],[37,22.5],[38.5,24],[40.8,23],[40.9,26],[41.2,28.9],[42.5,28],[43.5,28.6],[45,29.7],[46.5,30.7],[45.5,33.5],[47,36],[47,39],[45,37],[43,40],[41.5,41.6],[45,48],[50,50],[55,55],[60,60],[68,60],[69,55],[68,44],[66,40],[65,36],[66,34],[64,30],[70,28],[71,25],[70,20],[67,14],[63,9],[59,5.5],[58,7],[59,10],[56.5,11],[55.5,10],[57.5,8],[55,8.3],[53.5,7],[53,5],[51,2.5],[50,1.5],[49.5,-1],[48.5,-4.7],[47.5,-2.5],[46,-1.2],[43.5,-1.5],[43.5,-8],[42,-9],[39,-9.5]],
  [[50,-5.7],[50.8,1.2],[52.9,1.7],[55.8,-1.6],[57.6,-1.8],[58.6,-3],[58.4,-5],[56.5,-6.2],[55,-5],[54.3,-3.4],[53.3,-4.5],[51.6,-5.1]],
  [[51.5,-9.8],[52.2,-6.4],[54,-6],[55.3,-7.2],[54.2,-10],[53,-10.2]],
  // Afrique, Madagascar, Arabie
  [[35.8,-5.9],[37,10],[33,11],[32.5,15],[31,20],[32.8,22],[31.5,25],[31.3,32],[29.5,32.5],[22,36.8],[18,38.5],[15,40],[12,43.5],[11.8,51.2],[5,48],[2,45.5],[-4,39.6],[-10,40],[-15,40.6],[-20,35],[-25,35],[-30,31],[-34,26],[-34.5,20],[-34,18.4],[-29,16.5],[-22,14.5],[-17,11.7],[-12,13.8],[-6,12.3],[-1,9],[4,9.5],[4.5,7],[6.4,3.4],[5,-4],[4.4,-7.5],[7,-12],[10,-14.5],[14.7,-17.4],[21,-17],[27,-13.2],[31,-9.8]],
  [[-12,49.3],[-16,50.4],[-25.5,47],[-24,43.6],[-16,44.4]],
  [[31.3,32],[33,35],[36.5,36],[37,42],[33,46],[30,48],[29,50],[26,56],[25,56.4],[22.5,59.8],[17,54],[12.7,44],[15,42.8],[20,40],[27,35],[29.5,34.5]],
  // Asie
  [[41.5,41.6],[37,44],[38,48.8],[37,54],[33,61],[25,62],[25,66.5],[23,68.5],[20.5,73],[15,74],[8,77],[13,80.2],[16,82],[20,86.5],[22,89],[21.5,92],[16,94.5],[16,97.5],[10,98.5],[7,100],[1.3,103.8],[5,103.4],[10,105],[10.5,107],[16,108.3],[21,107],[22,110],[23,116.5],[27,120],[31,121.9],[35,119.3],[37.5,122.5],[39,118],[40.8,121.5],[39.5,124],[38,125],[35,126.5],[35.3,129.3],[38,128.7],[42.5,130.7],[43,132],[47,138.5],[54,141],[59,143],[59,150],[62,164],[66,180],[70,180],[72,140],[73,113],[77,105],[76,90],[73,80],[72,70],[68,60],[60,60],[55,55],[50,50],[45,48]],
  [[31,130.5],[33.5,130],[35.5,133],[35.6,135.5],[37,137],[38.5,139.5],[40.5,140],[41.5,140.5],[43.5,141.3],[45.5,141.9],[43,145.5],[42,143],[40.5,141.5],[38,141],[35,140],[34,137],[33.5,135.2],[32.7,132]],
  [[5.5,95.3],[-5.8,105.8],[-3,104],[2,99]],
  [[7,117],[1,119],[-4,116],[-3,110.5],[1.5,109]],
  [[-1,131],[-8,141],[-10.5,150.5],[-5.5,147],[-3,141]],
  // Océanie
  [[-11,142.5],[-17,141.5],[-12.5,136.5],[-12,131],[-15,129],[-14,125.5],[-20,119],[-22,114],[-26,113.5],[-31.5,115.7],[-35,117],[-34,123.5],[-31.5,131],[-35,135],[-35,138.5],[-38,140.5],[-39,146.5],[-37.5,150],[-33,151.5],[-28,153.5],[-24,152],[-19,146.5],[-15,145.3]],
  [[-34.5,172.7],[-37.5,176],[-41.3,175.2],[-39.5,174],[-36.5,174.3]],
  [[-41,173],[-43.6,172.6],[-46.6,169],[-44,168],[-40.5,172.5]]
];
// Grands rendez-vous (faits publics : lieu, discipline, mois habituel).
var GLOBE_RACES = [
  { n: 'Marathon de Paris', city: 'Paris', lat: 48.86, lon: 2.35, k: 'run', m: 3 },
  { n: 'UTMB Mont-Blanc', city: 'Chamonix', lat: 45.92, lon: 6.87, k: 'trail', m: 7 },
  { n: 'IRONMAN France', city: 'Nice', lat: 43.70, lon: 7.27, k: 'tri', m: 5 },
  { n: 'Challenge Roth', city: 'Roth', lat: 49.25, lon: 11.09, k: 'tri', m: 6 },
  { n: 'Paris-Roubaix Challenge', city: 'Roubaix', lat: 50.69, lon: 3.17, k: 'bike', m: 3 },
  { n: 'Berlin-Marathon', city: 'Berlin', lat: 52.52, lon: 13.40, k: 'run', m: 8 },
  { n: 'London Marathon', city: 'Londres', lat: 51.50, lon: -0.12, k: 'run', m: 3 },
  { n: 'Boston Marathon', city: 'Boston', lat: 42.36, lon: -71.06, k: 'run', m: 3 },
  { n: 'New York City Marathon', city: 'New York', lat: 40.71, lon: -74.0, k: 'run', m: 10 },
  { n: 'Chicago Marathon', city: 'Chicago', lat: 41.88, lon: -87.63, k: 'run', m: 9 },
  { n: 'IRONMAN World Championship', city: 'Kona', lat: 19.64, lon: -155.99, k: 'tri', m: 9 },
  { n: 'Maratón de Valencia', city: 'Valence', lat: 39.47, lon: -0.38, k: 'run', m: 11 },
  { n: 'Tokyo Marathon', city: 'Tokyo', lat: 35.68, lon: 139.69, k: 'run', m: 2 }
];
var GLOBE_HUB = { lat: 48.86, lon: 2.35 };
var GLOBE_COL = { run: '#f97316', trail: '#84cc16', tri: '#7b8cff', bike: '#00c8e0' };
var GLOBE_TXT = {
  fr: { run: 'Course', trail: 'Trail', tri: 'Triathlon', bike: 'Cyclisme', months: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'], city: {}, hub: 'THW — Paris', hint: 'Fais tourner le globe · survole une course' },
  en: { run: 'Running', trail: 'Trail', tri: 'Triathlon', bike: 'Cycling', months: ['January','February','March','April','May','June','July','August','September','October','November','December'], city: { 'Londres': 'London', 'Valence': 'Valencia' }, hub: 'THW — Paris', hint: 'Spin the globe · hover a race' },
  es: { run: 'Carrera', trail: 'Trail', tri: 'Triatlón', bike: 'Ciclismo', months: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'], city: { 'Londres': 'Londres', 'New York': 'Nueva York', 'Valence': 'Valencia', 'Tokyo': 'Tokio' }, hub: 'THW — París', hint: 'Gira el globo · pasa sobre una carrera' }
};

var GLOBE_DOTS = null;
function globeDots() {
  if (GLOBE_DOTS) return GLOBE_DOTS;
  var polys = GLOBE_LAND.map(function (p) { return p.map(function (q) { return [q[1], q[0]]; }); });
  var inPoly = function (x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  };
  var out = [];
  for (var lat = -56; lat <= 82; lat += 2.1) {
    var step = 2.1 / Math.max(0.25, Math.cos(lat * Math.PI / 180));
    for (var lon = -180; lon < 180; lon += step) {
      for (var k = 0; k < polys.length; k++) { if (inPoly(lon, lat, polys[k])) { out.push([lat, lon]); break; } }
    }
  }
  GLOBE_DOTS = out;
  return out;
}

function RaceGlobe() {
  var boxRef = React.useRef(null), cvRef = React.useRef(null), tipRef = React.useRef(null);
  var lang = useLang();
  var langRef = React.useRef(lang);
  langRef.current = lang;

  React.useEffect(function () {
    var box = boxRef.current, cv = cvRef.current, tip = tipRef.current;
    if (!box || !cv) return undefined;
    var ctx = cv.getContext('2d');
    var D2R = Math.PI / 180;
    var dots = globeDots();
    var view = { lat: 30, lon: -22 };
    var drag = null, hover = null, visible = true, raf = 0, W = 0, R = 0, dpr = 1;
    var t0 = performance.now();

    function size() {
      var w = box.clientWidth;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = w; R = w * 0.42;
      cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr);
      cv.style.width = w + 'px'; cv.style.height = w + 'px';
    }
    function vec(lat, lon) { var a = lat * D2R, b = lon * D2R; return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]; }
    // Projection orthographique d'un vecteur 3D (rayon libre) dans la vue.
    function proj(v) {
      var l0 = view.lon * D2R, p0 = view.lat * D2R;
      var x1 = v[0] * Math.cos(-l0) - v[1] * Math.sin(-l0), y1 = v[0] * Math.sin(-l0) + v[1] * Math.cos(-l0), z1 = v[2];
      // rotation autour de l'axe y pour amener la latitude au centre
      var x2 = x1 * Math.cos(p0) + z1 * Math.sin(p0), z2 = -x1 * Math.sin(p0) + z1 * Math.cos(p0);
      // écran : x2 = profondeur, y1 = horizontal, z2 = vertical
      return { x: W / 2 + y1 * R, y: W / 2 - z2 * R, z: x2, r2: y1 * y1 + z2 * z2 };
    }
    function slerp(a, b, t) {
      var d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      if (d < 1e-6) return a.slice();
      var s = Math.sin(d), k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s;
      return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    }
    var hubV = vec(GLOBE_HUB.lat, GLOBE_HUB.lon);
    var arcs = GLOBE_RACES.filter(function (r) { return Math.abs(r.lat - GLOBE_HUB.lat) + Math.abs(r.lon - GLOBE_HUB.lon) > 0.5; }).map(function (r, i) {
      var to = vec(r.lat, r.lon);
      var d = Math.acos(Math.max(-1, Math.min(1, hubV[0] * to[0] + hubV[1] * to[1] + hubV[2] * to[2])));
      var lift = 0.04 + 0.22 * (d / Math.PI);
      var pts = [];
      for (var s = 0; s <= 48; s++) {
        var t = s / 48, v = slerp(hubV, to, t), h = 1 + lift * Math.sin(Math.PI * t);
        pts.push([v[0] * h, v[1] * h, v[2] * h]);
      }
      return { race: r, pts: pts, ph: i / 12, col: GLOBE_COL[r.k] };
    });
    function seen(p) { return p.z > 0 || p.r2 > 1.0; }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      var T = (now - t0) / 1000;
      if (!drag && !hover && !ST_RM) view.lon += 0.045;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, W);
      var c = W / 2;
      // halo + sphère
      var g = ctx.createRadialGradient(c, c, R * 0.6, c, c, R * 1.25);
      g.addColorStop(0, 'rgba(0,200,224,0.10)'); g.addColorStop(1, 'rgba(0,200,224,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R * 1.25, 0, Math.PI * 2); ctx.fill();
      var s = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
      s.addColorStop(0, '#1a2f4d'); s.addColorStop(1, '#0a1626');
      ctx.fillStyle = s; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,200,224,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      // méridiens / parallèles discrets
      ctx.strokeStyle = 'rgba(158,177,200,0.07)'; ctx.lineWidth = 0.8;
      for (var la = -60; la <= 60; la += 30) { ctx.beginPath(); var st = false; for (var lo = -180; lo <= 180; lo += 4) { var p = proj(vec(la, lo)); if (p.z > 0) { st ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); st = true; } else st = false; } ctx.stroke(); }
      for (var lo2 = -180; lo2 < 180; lo2 += 30) { ctx.beginPath(); var st2 = false; for (var la2 = -88; la2 <= 88; la2 += 4) { var p2 = proj(vec(la2, lo2)); if (p2.z > 0) { st2 ? ctx.lineTo(p2.x, p2.y) : ctx.moveTo(p2.x, p2.y); st2 = true; } else st2 = false; } ctx.stroke(); }
      // terres en points
      for (var i = 0; i < dots.length; i++) {
        var q = proj(vec(dots[i][0], dots[i][1]));
        if (q.z <= 0) continue;
        ctx.fillStyle = 'rgba(158,190,220,' + (0.18 + q.z * 0.5).toFixed(3) + ')';
        ctx.fillRect(q.x - 0.9, q.y - 0.9, 1.8, 1.8);
      }
      // arcs + éclats qui voyagent
      arcs.forEach(function (a) {
        var P = a.pts.map(proj);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(0,200,224,0.28)';
        ctx.beginPath(); var on = false;
        P.forEach(function (p) { if (seen(p)) { on ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); on = true; } else on = false; });
        ctx.stroke();
        if (ST_RM) return;
        var u = ((T * 0.22 + a.ph) % 1), idx = Math.floor(u * (P.length - 1)), p3 = P[idx];
        if (p3 && seen(p3)) {
          var gl = ctx.createRadialGradient(p3.x, p3.y, 0, p3.x, p3.y, 8);
          gl.addColorStop(0, 'rgba(224,183,102,0.95)'); gl.addColorStop(1, 'rgba(224,183,102,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p3.x, p3.y, 8, 0, Math.PI * 2); ctx.fill();
        }
      });
      // repères des courses
      var pulse = ST_RM ? 0.5 : (Math.sin(T * 2.4) + 1) / 2;
      GLOBE_RACES.forEach(function (r) {
        var p = proj(vec(r.lat, r.lon)); r._p = p;
        if (p.z <= 0.02) return;
        ctx.globalAlpha = Math.min(1, p.z * 2.2);
        ctx.strokeStyle = GLOBE_COL[r.k]; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5 + pulse * 5, 0, Math.PI * 2); ctx.globalAlpha *= (1 - pulse) * 0.8; ctx.stroke();
        ctx.globalAlpha = Math.min(1, p.z * 2.2);
        ctx.fillStyle = GLOBE_COL[r.k]; ctx.beginPath(); ctx.arc(p.x, p.y, hover === r ? 5 : 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      // pôle THW (Paris)
      var h = proj(hubV);
      if (h.z > 0) {
        ctx.fillStyle = '#e0b766'; ctx.beginPath(); ctx.arc(h.x, h.y, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(224,183,102,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, Math.PI * 2); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

    function showTip(r) {
      if (!tip) return;
      if (!r) { tip.style.opacity = '0'; return; }
      var L = GLOBE_TXT[langRef.current] || GLOBE_TXT.fr;
      var city = L.city[r.city] || r.city;
      tip.innerHTML = '<b></b><span></span>';
      tip.firstChild.textContent = r.n;
      tip.lastChild.textContent = city + ' · ' + L[r.k] + ' · ' + L.months[r.m];
      tip.style.left = r._p.x + 'px'; tip.style.top = r._p.y + 'px'; tip.style.opacity = '1';
    }
    function pick(x, y) {
      var best = null, bd = 16 * 16;
      GLOBE_RACES.forEach(function (r) { var p = r._p; if (!p || p.z <= 0.05) return; var d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; best = r; } });
      return best;
    }
    function rel(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    function down(e) { drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
    function move(e) {
      if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        view.lon = drag.lon - dx * 0.35;
        view.lat = Math.max(-35, Math.min(65, drag.lat + dy * 0.3));
        kick();
        return;
      }
      var p = rel(e), r = pick(p.x, p.y);
      if (r !== hover) { hover = r; showTip(r); cv.style.cursor = r ? 'pointer' : 'grab'; }
    }
    function up(e) {
      var wasTap = drag && !drag.moved;
      drag = null;
      if (wasTap) { var p = rel(e), r = pick(p.x, p.y); hover = r; showTip(r); }
    }
    function leave() { if (!drag) { hover = null; showTip(null); } }

    size();
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', leave);
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { size(); kick(); }) : null;
    if (ro) ro.observe(box);
    var vis = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting && !document.hidden; kick(); }) : null;
    if (vis) vis.observe(box);
    var onVis = function () { visible = !document.hidden; kick(); };
    document.addEventListener('visibilitychange', onVis);
    kick();
    return function () {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (vis) vis.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  var L = GLOBE_TXT[lang] || GLOBE_TXT.fr;
  return (
    <div className="st-globe" ref={boxRef}>
      <canvas ref={cvRef} aria-label="Globe des grands rendez-vous d'endurance" role="img"/>
      <div className="st-gtip" ref={tipRef} data-no-i18n="1"/>
      <div className="st-glegend" data-no-i18n="1">
        <span><i style={{ background: '#e0b766' }}/>{L.hub}</span>
        {['run', 'trail', 'tri', 'bike'].map(function (k) { return <span key={k}><i style={{ background: GLOBE_COL[k] }}/>{L[k]}</span>; })}
      </div>
      <div className="st-ghint" data-no-i18n="1">{L.hint}</div>
    </div>
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

Object.assign(window, { RaceGlobe: RaceGlobe, Ticker: Ticker, Coverline: Coverline, Seal: Seal, CoachLive: CoachLive, Shelf: Shelf, Book: Book, stTr: tr });
