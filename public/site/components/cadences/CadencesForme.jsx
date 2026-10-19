/* ════════════════════════════════════════════════════════════════
   Test de forme — navette de Léger + circuit au poids du corps, le même jour.
   Une batterie Decaform (test_key = 'forme', 100 points : 50 + 50).
   Parcours : profil → Léger (bips fiables, cardio facultatif) → récupération ≥ 20 min
   → circuit (assisté ou autonome, cardio facultatif) → résultat → enregistrement.
   SVG brut uniquement. Publie window.CadFormePage.
   Les barèmes (ref / max) sont PROVISOIRES : ils vivent dans forme.config.json côté serveur.
   ════════════════════════════════════════════════════════════════ */
(function () {
  var APP_URL = (typeof window !== 'undefined' && window.APP_URL) || 'https://thw-appli.vercel.app';
  var API = '';
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); });
  }

  /* ── Constantes du protocole ── */
  var LAPS = [7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16, 16];
  var V0 = 8.5, DV = 0.5, LANE_M = 20, COUNTDOWN = 3, REST_SEC = 20 * 60;
  var EX = [
    { n: 'Burpees', r: 8, u: '', sub: 'Poitrine au sol, saut en fin de répétition.' },
    { n: 'Pompes', r: 12, u: '', sub: 'Poitrine à 5 cm du sol, corps gainé.' },
    { n: 'Fentes alternées', r: 16, u: '', sub: 'Sur place, 8 par jambe, genou arrière près du sol.' },
    { n: 'Squats', r: 20, u: '', sub: 'Cuisses au moins parallèles au sol.' },
    { n: 'Marche de l’ours', r: 24, u: ' m', sub: 'Genoux à 5 cm du sol, 24 m au total.' }
  ];
  var ROUNDS = 3;
  var NEXT_FILE = 'test-de-forme.html';
  // Barème provisoire (miroir du JSON serveur) : sert à l'estimation avant enregistrement.
  var SCALE = { M: { nav: [10, 18], cir: [540, 345] }, F: { nav: [8, 16], cir: [600, 405] } };
  var LEVELS = [['Sédentaire', 0], ['Amateur', 0.2], ['Confirmé', 0.4], ['Référence', 0.6], ['Élite', 0.8], ['Phénomène', 1.0], ['Extraterrestre', 1.1]];
  var DRAFT_KEY = 'thw-forme-draft';

  /* ── Utilitaires ── */
  var speedOf = function (i) { return V0 + DV * i; };
  var fr = function (n, d) { return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var mmss = function (t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); };
  var todayISO = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var frDate = function (iso) { try { return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privé */ } }
  function levelOf(total, max) { var p = total / max, l = LEVELS[0][0]; for (var i = 0; i < LEVELS.length; i++) if (p >= LEVELS[i][1]) l = LEVELS[i][0]; return l; }
  function pts(value, ref, max, ptsMax) { var pct = Math.max(0, 0.6 + 0.4 * (value - ref) / (max - ref)); return pct * ptsMax; }
  function legerSpeed(value) { // vitesse atteinte (palier + moitié de navettes)
    var lvl = Math.min(LAPS.length - 1, Math.floor(value)), done = value - Math.floor(value);
    if (value >= LAPS.length) return speedOf(LAPS.length - 1);
    return done >= 0.5 ? speedOf(lvl) : speedOf(Math.max(0, lvl - 1));
  }

  /* ── Statistiques cardio sur une fenêtre de temps ── */
  function segStats(samples, from, to) {
    var mn = null, mx = null, sum = 0, n = 0;
    for (var i = 0; i < samples.length; i++) {
      var t = samples[i][0], b = samples[i][1];
      if (t < from || t > to) continue;
      if (mn === null || b < mn) mn = b;
      if (mx === null || b > mx) mx = b;
      sum += b; n++;
    }
    return n ? { min: mn, max: mx, avg: Math.round(sum / n) } : { min: null, max: null, avg: null };
  }
  function buildTrace(samples, segs) {
    if (!samples || samples.length < 5) return null;
    var all = segStats(samples, 0, 1e9), out = [];
    (segs || []).forEach(function (s) { var st = segStats(samples, s.from, s.to); out.push({ label: s.label, from: Math.round(s.from * 10) / 10, to: Math.round(s.to * 10) / 10, min: st.min, max: st.max, avg: st.avg }); });
    var step = samples.length > 3900 ? Math.ceil(samples.length / 3900) : 1, kept = [];
    for (var i = 0; i < samples.length; i += step) kept.push(samples[i]);
    return { samples: kept, summary: { min: all.min, max: all.max, avg: all.avg, segments: out } };
  }

  /* ════════════ Capteur cardio Bluetooth (Chrome / Edge) ════════════ */
  function createHr() {
    var s = { status: 'off', bpm: null, name: '', rec: false, t0: 0, samples: [], subs: [], err: '', dev: null, retries: 0 };
    function emit() { s.subs.forEach(function (f) { try { f(); } catch (e) { /* abonné démonté */ } }); }
    function onVal(ev) {
      var dv = ev.target.value, flags = dv.getUint8(0);
      var bpm = (flags & 1) ? dv.getUint16(1, true) : dv.getUint8(1);
      if (!bpm || bpm < 30 || bpm > 240) return;
      s.bpm = bpm;
      if (s.rec) s.samples.push([(performance.now() - s.t0) / 1000, bpm]);
      emit();
    }
    function attach() {
      return s.dev.gatt.connect()
        .then(function (srv) { return srv.getPrimaryService('heart_rate'); })
        .then(function (svc) { return svc.getCharacteristic('heart_rate_measurement'); })
        .then(function (ch) { return ch.startNotifications().then(function () { ch.addEventListener('characteristicvaluechanged', onVal); s.status = 'on'; s.err = ''; s.retries = 0; emit(); }); });
    }
    function lost() {
      s.bpm = null;
      if (s.status === 'off') return;
      s.status = 'lost'; emit();
      if (s.retries < 6) { s.retries++; setTimeout(function () { if (s.status === 'lost') attach().catch(function () { lost(); }); }, 1500); }
    }
    return {
      s: s,
      supported: function () { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); },
      sub: function (f) { s.subs.push(f); return function () { s.subs = s.subs.filter(function (x) { return x !== f; }); }; },
      connect: function () {
        if (!navigator.bluetooth) { s.err = 'unsupported'; emit(); return Promise.resolve(); }
        s.status = 'pairing'; s.err = ''; emit();
        return navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }], optionalServices: ['battery_service'] })
          .then(function (d) {
            s.dev = d; s.name = d.name || 'Capteur cardio';
            d.addEventListener('gattserverdisconnected', lost);
            return attach();
          })
          .catch(function (e) {
            s.status = 'off';
            s.err = (e && e.name === 'NotFoundError') ? 'cancel' : 'fail';
            emit();
          });
      },
      disconnect: function () { s.status = 'off'; s.bpm = null; try { if (s.dev && s.dev.gatt.connected) s.dev.gatt.disconnect(); } catch (e) { /* déjà coupé */ } emit(); },
      begin: function () { s.samples = []; s.t0 = performance.now(); s.rec = true; },
      end: function () { s.rec = false; return s.samples.slice(); },
      elapsed: function () { return (performance.now() - s.t0) / 1000; }
    };
  }

  /* ════════════ Graphique cardio (SVG brut) ════════════ */
  function HrChart(props) {
    var samples = props.samples || [], segs = props.segments || [], accent = props.color || '#00c8e0';
    if (samples.length < 2) return null;
    var W = 800, H = 240, L = 44, R = 14, T = 16, B = 34;
    var tmax = samples[samples.length - 1][0], tmin = 0;
    var mn = 999, mx = 0, iMin = 0, iMax = 0;
    samples.forEach(function (p, i) { if (p[1] < mn) { mn = p[1]; iMin = i; } if (p[1] > mx) { mx = p[1]; iMax = i; } });
    var lo = Math.floor((mn - 6) / 10) * 10, hi = Math.ceil((mx + 6) / 10) * 10;
    var X = function (t) { return L + (t - tmin) / Math.max(1, tmax - tmin) * (W - L - R); };
    var Y = function (b) { return T + (1 - (b - lo) / (hi - lo)) * (H - T - B); };
    var d = samples.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
    var grid = []; for (var g = lo; g <= hi; g += 10) grid.push(g);
    var xt = []; var stepT = tmax > 900 ? 300 : tmax > 360 ? 120 : 60; for (var q = 0; q <= tmax; q += stepT) xt.push(q);
    var uid = 'hrg' + Math.round(Math.random() * 1e6);
    return (
      <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={'Courbe de fréquence cardiaque, minimum ' + mn + ', maximum ' + mx + ' battements par minute'}>
        <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".28"/><stop offset="1" stopColor={accent} stopOpacity="0"/></linearGradient></defs>
        {segs.map(function (s, i) {
          var x1 = X(Math.max(tmin, s.from)), x2 = X(Math.min(tmax, s.to));
          if (x2 <= x1) return null;
          return (
            <g key={i}>
              <rect x={x1} y={T} width={x2 - x1} height={H - T - B} fill={i % 2 ? 'rgba(127,150,175,.10)' : 'rgba(127,150,175,.03)'}/>
              {(x2 - x1) > 16 ? <text x={(x1 + x2) / 2} y={H - B + 13} textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontFamily="IBM Plex Mono">{s.short || ''}</text> : null}
            </g>
          );
        })}
        {grid.map(function (v) { return (<g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="rgba(127,150,175,.22)" strokeWidth="1"/><text x={L - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-dim)" fontFamily="IBM Plex Mono">{v}</text></g>); })}
        {xt.map(function (t) { return <text key={t} x={X(t)} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontFamily="IBM Plex Mono">{mmss(t)}</text>; })}
        <path d={d + ' L' + X(tmax).toFixed(1) + ' ' + (H - B) + ' L' + X(tmin).toFixed(1) + ' ' + (H - B) + ' Z'} fill={'url(#' + uid + ')'}/>
        <path d={d} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={X(samples[iMax][0])} cy={Y(mx)} r="4.5" fill="#ef4444"/>
        <text x={Math.min(W - R - 30, Math.max(L + 30, X(samples[iMax][0])))} y={Math.max(T + 10, Y(mx) - 9)} textAnchor="middle" fontSize="11" fontWeight="600" fill="#ef4444" fontFamily="IBM Plex Mono">{'max ' + mx}</text>
        <circle cx={X(samples[iMin][0])} cy={Y(mn)} r="4.5" fill="#22c55e"/>
        <text x={Math.min(W - R - 30, Math.max(L + 30, X(samples[iMin][0])))} y={Math.min(H - B - 6, Y(mn) + 17)} textAnchor="middle" fontSize="11" fontWeight="600" fill="#22c55e" fontFamily="IBM Plex Mono">{'min ' + mn}</text>
      </svg>
    );
  }

  function HrSummary(props) {
    var tr = props.trace; if (!tr) return null;
    var sm = tr.summary || {}, segs = sm.segments || [];
    return (
      <div className="tf-hr-res">
        <div className="tf-kpis">
          <div><small>FC minimale</small><b className="num">{sm.min != null ? sm.min : '--'}<em>bpm</em></b></div>
          <div><small>FC moyenne</small><b className="num">{sm.avg != null ? sm.avg : '--'}<em>bpm</em></b></div>
          <div><small>FC maximale</small><b className="num">{sm.max != null ? sm.max : '--'}<em>bpm</em></b></div>
        </div>
        <HrChart samples={tr.samples} segments={segs.map(function (s, i) { return { from: s.from, to: s.to, short: props.shortOf ? props.shortOf(s, i) : String(i + 1) }; })} color={props.color}/>
        {segs.length ? (
          <div className="tf-tw">
            <table className="tf-tab">
              <thead><tr><th>{props.segTitle || 'Étape'}</th><th>Moyenne</th><th>Minimum</th><th>Maximum</th></tr></thead>
              <tbody>{segs.map(function (s, i) { return (<tr key={i}><td>{s.label}</td><td className="num">{s.avg != null ? s.avg : '--'}</td><td className="num">{s.min != null ? s.min : '--'}</td><td className="num">{s.max != null ? s.max : '--'}</td></tr>); })}</tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  /* ════════════ Bloc de connexion cardio (facultatif) ════════════ */
  function HrPanel(props) {
    var hr = props.hr, st = React.useState(0), tick = st[1];
    React.useEffect(function () { return hr.sub(function () { tick(function (n) { return n + 1; }); }); }, [hr]);
    var s = hr.s, ok = hr.supported();
    return (
      <div className={'tf-hr' + (props.dark ? ' dark' : '')}>
        <div className="tf-hr-top">
          <div>
            <div className="tf-hr-t">Fréquence cardiaque <span className="tf-opt">facultatif</span></div>
            <div className="tf-hr-s">{s.status === 'on' ? (s.name + ' connecté') : s.status === 'pairing' ? 'Recherche du capteur…' : s.status === 'lost' ? 'Signal perdu, reconnexion…' : 'Pour ceux qui ont une sangle ou une montre cardio Bluetooth.'}</div>
          </div>
          {s.status === 'on' ? <div className="tf-hr-bpm num" aria-live="polite">{s.bpm || '--'}<em>bpm</em></div> : null}
          {ok ? (s.status === 'on' || s.status === 'lost'
            ? <button type="button" className="tf-btn small" onClick={function () { hr.disconnect(); }} disabled={props.locked}>Déconnecter</button>
            : <button type="button" className="tf-btn small" onClick={function () { hr.connect(); }} disabled={s.status === 'pairing' || props.locked}>Connecter un capteur</button>) : null}
        </div>
        <div className={'tf-hr-note' + (ok ? '' : ' warn')}>
          {ok
            ? 'Le site ne peut lire ta fréquence cardiaque que dans Google Chrome (ou Edge) sur ordinateur ou Android. Ni Safari, ni iPhone. Ta montre doit diffuser sa fréquence en Bluetooth : une Apple Watch ne le fait pas.'
            : 'Ton navigateur ne permet pas de lire la fréquence cardiaque. Ouvre cette page dans Google Chrome (ordinateur ou Android) pour connecter un capteur. Le test fonctionne très bien sans.'}
        </div>
        {s.err === 'fail' ? <div className="tf-hr-note warn">Connexion impossible. Vérifie que le capteur est allumé, proche, et non connecté à une autre application.</div> : null}
      </div>
    );
  }

  /* ════════════ Audio : bips pré-programmés ════════════ */
  function makeAudio(volume) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      var ctx = new Ctx(), master = ctx.createGain(), comp = ctx.createDynamicsCompressor();
      master.gain.value = volume;
      master.connect(comp); comp.connect(ctx.destination);
      return { ctx: ctx, master: master };
    } catch (e) { return null; }
  }
  function tone(a, at, f, d, peak) {
    var o = a.ctx.createOscillator(), g = a.ctx.createGain();
    o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.006);
    g.gain.setValueAtTime(peak, Math.max(at + 0.007, at + d - 0.025));
    g.gain.linearRampToValueAtTime(0.0001, at + d);
    o.connect(g); g.connect(a.master); o.start(at); o.stop(at + d + 0.03);
  }
  function killAudio(a) {
    if (!a) return;
    try { a.master.gain.cancelScheduledValues(0); a.master.gain.value = 0; } catch (e) { /* déjà coupé */ }
    try { a.ctx.close(); } catch (e) { /* déjà fermé */ }
  }
  function useWakeLock() {
    var ref = React.useRef(null);
    function on() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { ref.current = l; }).catch(function () {}); } catch (e) { /* non supporté */ } }
    function off() { try { if (ref.current) ref.current.release(); } catch (e) { /* ok */ } ref.current = null; }
    React.useEffect(function () { return off; }, []);
    return { on: on, off: off };
  }

  /* ════════════ Étape 1 : profil ════════════ */
  function Profile(props) {
    var p = props.profile, st = React.useState(p), f = st[0], setF = st[1];
    var er = React.useState(''), err = er[0], setErr = er[1];
    // Le préremplissage (compte, dernier passage) arrive après le premier rendu : on ne complète que les champs encore vides.
    React.useEffect(function () {
      setF(function (cur) { var o = Object.assign({}, cur); ['first', 'last', 'age', 'weight', 'sex'].forEach(function (k) { if (!o[k] && p[k]) o[k] = p[k]; }); return o; });
    }, [p.first, p.last, p.age, p.weight, p.sex]);
    function set(k, v) { setF(Object.assign({}, f, (function () { var o = {}; o[k] = v; return o; })())); }
    function submit(e) {
      e.preventDefault();
      var a = Number(f.age), w = Number(String(f.weight).replace(',', '.'));
      if (!f.first.trim()) return setErr('Indique ton prénom.');
      if (!f.sex) return setErr('Choisis le barème (homme ou femme).');
      if (!isFinite(a) || a < 18 || a > 80) return setErr('Âge requis : 18 à 80 ans. Pour les moins de 18 ans, des tests adaptés existent sur la page des tests.');
      if (!isFinite(w) || w < 30 || w > 250) return setErr('Poids requis (30 à 250 kg).');
      if (!f.date) return setErr('Choisis la date du test.');
      setErr(''); props.onValid({ first: f.first.trim(), last: f.last.trim(), date: f.date, age: Math.round(a), weight: Math.round(w * 10) / 10, sex: f.sex });
    }
    return (
      <form className="tf-card tf-narrow" onSubmit={submit} noValidate>
        <div className="tf-eye">Avant de commencer</div>
        <h2 className="tf-h2">Vérifie tes informations</h2>
        <p className="tf-p">Elles servent au barème et s’affichent avec ton résultat. Modifie ce qui est inexact, puis valide.</p>
        <div className="tf-grid2">
          <label className="tf-f"><span>Prénom</span><input value={f.first} onChange={function (e) { set('first', e.target.value); }} autoComplete="given-name" maxLength={40}/></label>
          <label className="tf-f"><span>Nom</span><input value={f.last} onChange={function (e) { set('last', e.target.value); }} autoComplete="family-name" maxLength={60}/></label>
          <label className="tf-f"><span>Date du test</span><input type="date" value={f.date} max={todayISO()} onChange={function (e) { set('date', e.target.value); }}/></label>
          <label className="tf-f"><span>Âge (ans)</span><input inputMode="numeric" value={f.age} onChange={function (e) { set('age', e.target.value.replace(/[^0-9]/g, '')); }} maxLength={2} placeholder="Ex. 34"/></label>
          <label className="tf-f"><span>Poids (kg)</span><input inputMode="decimal" value={f.weight} onChange={function (e) { set('weight', e.target.value.replace(/[^0-9.,]/g, '')); }} maxLength={5} placeholder="Ex. 72"/></label>
          <div className="tf-f"><span>Barème</span>
            <div className="tf-seg" role="group" aria-label="Barème">
              {[['M', 'Homme'], ['F', 'Femme']].map(function (o) { return <button type="button" key={o[0]} aria-pressed={f.sex === o[0]} onClick={function () { set('sex', o[0]); }}>{o[1]}</button>; })}
            </div>
          </div>
        </div>
        {err ? <div className="tf-err" role="alert">{err}</div> : null}
        <div className="tf-actions">
          <button type="submit" className="tf-btn primary">Valider et passer au test de Léger</button>
        </div>
        <ul className="tf-rules">
          <li>Prévois un échauffement de 8 minutes (footing léger, mobilité, 3 accélérations).</li>
          <li>Le circuit se fait au moins 20 minutes après la navette, le même jour.</li>
          <li>Ce test ne remplace pas un avis médical. Arrête-toi au moindre malaise.</li>
        </ul>
      </form>
    );
  }

  /* ════════════ Étape 2 : navette de Léger ════════════ */
  function Leger(props) {
    var hr = props.hr, wl = useWakeLock();
    var vs = React.useState(1), vol = vs[0], setVol = vs[1];
    var ph = React.useState('idle'), phase = ph[0], setPhase = ph[1]; // idle | run | done
    var vw = React.useState({ cd: 0, lvl: 0, lap: 0, idx: 0, frac: 0 }), view = vw[0], setView = vw[1];
    var au = React.useState(''), audioMsg = au[0], setAudioMsg = au[1];
    var fl = React.useState(false), flash = fl[0], setFlash = fl[1];
    var R = React.useRef({ audio: null, ev: [], t0: 0, raf: 0, running: false, last: -1, cur: null, acStart: 0, perfStart: 0 });
    var volRef = React.useRef(vol); volRef.current = vol;

    function clock() { var r = R.current; return r.audio ? r.audio.ctx.currentTime - r.t0 : (performance.now() / 1000 - r.t0); }
    function buildEvents() {
      var ev = [], t = 0;
      for (var i = 0; i < LAPS.length; i++) {
        var dur = LANE_M / (speedOf(i) / 3.6);
        for (var k = 1; k <= LAPS[i]; k++) { t += dur; ev.push({ t: t, start: t - dur, lvl: i, lap: k, last: k === LAPS[i], dur: dur }); }
      }
      return ev;
    }
    React.useEffect(function () {
      function vis() { var r = R.current; if (document.visibilityState === 'visible' && r.running) { if (r.audio && r.audio.ctx.state === 'suspended') r.audio.ctx.resume(); wl.on(); } }
      document.addEventListener('visibilitychange', vis);
      return function () { document.removeEventListener('visibilitychange', vis); var r = R.current; r.running = false; cancelAnimationFrame(r.raf); killAudio(r.audio); wl.off(); };
    }, []);
    React.useEffect(function () { var a = R.current.audio; if (a) { try { a.master.gain.value = vol; } catch (e) { /* ok */ } } }, [vol]);

    function testSound() {
      var a = makeAudio(volRef.current); if (!a) { setAudioMsg('Ton navigateur ne peut pas produire de son.'); return; }
      a.ctx.resume().then(function () {
        var n = a.ctx.currentTime + 0.05; tone(a, n, 880, 0.25, 0.6); tone(a, n + 0.5, 1250, 0.12, 0.6); tone(a, n + 0.68, 1250, 0.12, 0.6); tone(a, n + 0.86, 1250, 0.25, 0.6);
        setAudioMsg(a.ctx.state === 'running' ? 'Tu dois entendre un bip, puis trois bips rapides. Sinon, monte le volume du téléphone et vérifie le mode silencieux.' : 'Son bloqué par le navigateur : touche l’écran puis réessaie.');
        setTimeout(function () { killAudio(a); }, 1800);
      });
    }
    function start() {
      var r = R.current; killAudio(r.audio);
      r.audio = makeAudio(volRef.current); r.ev = buildEvents(); r.last = -1; r.cur = null;
      var begin = function () {
        var now = r.audio ? r.audio.ctx.currentTime : performance.now() / 1000;
        r.t0 = now + COUNTDOWN + 0.15;
        if (r.audio) {
          var a = r.audio;
          for (var c = 0; c < COUNTDOWN; c++) tone(a, r.t0 - COUNTDOWN + c, 660, 0.18, 0.6);
          tone(a, r.t0, 1250, 0.55, 0.7);
          r.ev.forEach(function (e) {
            var at = r.t0 + e.t;
            if (e.last) { tone(a, at, 1250, 0.12, 0.7); tone(a, at + 0.18, 1250, 0.12, 0.7); tone(a, at + 0.36, 1250, 0.25, 0.7); } else tone(a, at, 880, 0.25, 0.65);
          });
          setAudioMsg(a.ctx.state === 'running' ? '' : 'Le son est bloqué : touche l’écran. Le test reste suivi à l’écran.');
        } else setAudioMsg('Pas de son disponible sur ce navigateur : suis les indications à l’écran.');
        hr.begin(); r.hrOffset = COUNTDOWN + 0.15;
        r.running = true; wl.on(); setPhase('run'); props.onStart && props.onStart();
        var loop = function () {
          if (!r.running) return;
          var c = clock();
          if (c < 0) setView({ cd: Math.max(1, Math.ceil(-c - 0.15)), lvl: 0, lap: 0, idx: 0, frac: 0 });
          else {
            var idx = 0; while (idx < r.ev.length && r.ev[idx].t < c) idx++;
            if (idx >= r.ev.length) { finish(true); return; }
            var e = r.ev[idx];
            if (idx !== r.last) { r.last = idx; if (idx > 0) { setFlash(true); setTimeout(function () { setFlash(false); }, 160); try { if (navigator.vibrate) navigator.vibrate(e.lap === 1 ? [90, 70, 90] : 70); } catch (x) { /* ok */ } } }
            r.cur = e;
            setView({ cd: 0, lvl: e.lvl, lap: e.lap, idx: idx, frac: Math.min(1, Math.max(0, (c - e.start) / e.dur)) });
          }
          r.raf = requestAnimationFrame(loop);
        };
        r.raf = requestAnimationFrame(loop);
      };
      if (r.audio) r.audio.ctx.resume().then(begin, begin); else begin();
    }
    function finish(complete) {
      var r = R.current; if (!r.running) return;
      r.running = false; cancelAnimationFrame(r.raf); killAudio(r.audio); r.audio = null; wl.off();
      var samples = hr.end(), e = r.cur, c = clock();
      var lvl, done;
      if (complete) { lvl = LAPS.length; done = 0; }
      else if (!e) { lvl = 0; done = 0; }
      else { lvl = e.lvl; done = e.lap - 1; }
      var value = complete ? LAPS.length : lvl + done / LAPS[lvl];
      // segments cardio par palier (temps cardio = temps de test + décompte)
      var segs = [], off = r.hrOffset || 0, maxLvl = complete ? LAPS.length - 1 : lvl;
      for (var i = 0; i <= maxLvl; i++) {
        var first = null, lastE = null;
        r.ev.forEach(function (x) { if (x.lvl === i) { if (!first) first = x; lastE = x; } });
        if (!first) continue;
        var from = off + first.start, to = Math.min(off + lastE.t, off + Math.max(c, first.start));
        if (to <= from) continue;
        segs.push({ label: 'Palier ' + (i + 1) + ' · ' + fr(speedOf(i), 1) + ' km/h', short: String(i + 1), from: from, to: to });
      }
      var trace = buildTrace(samples, segs);
      if (trace) trace.summary.segments.forEach(function (s, i) { s.short = segs[i].short; });
      setPhase('done');
      props.onDone({ value: Math.max(0.1, Math.round(value * 100) / 100), palier: complete ? LAPS.length : lvl + 1, laps: complete ? LAPS[LAPS.length - 1] : done, lapsIn: LAPS[Math.min(lvl, LAPS.length - 1)], vma: legerSpeed(value), trace: trace, duration: Math.max(0, c) });
    }

    var run = phase === 'run';
    var lvl = view.lvl, sp = speedOf(lvl), lapsIn = LAPS[lvl];
    var fwd = view.idx % 2 === 0, x = 40 + 720 * (fwd ? view.frac : 1 - view.frac);
    return (
      <div className="tf-stack">
        <div className={'tf-track' + (flash ? ' flash' : '')}>
          <div className="tf-track-top">
            <div className="tf-eye light">Test de Léger</div>
            <div className="tf-lvl">{run ? (view.cd ? 'Préparation' : 'Palier ' + (lvl + 1) + ' sur ' + LAPS.length) : 'Navette de 20 m'}</div>
          </div>
          <div className="tf-stats">
            <div className="tf-stat"><small>Vitesse</small><b className="num">{fr(run && !view.cd ? sp : V0, 1)}<em>km/h</em></b></div>
            <div className="tf-stat"><small>Palier</small><b className="num">{run && !view.cd ? lvl + 1 : 1}</b></div>
            <div className="tf-stat"><small>Navette</small><b className="num">{run && !view.cd ? Math.max(0, view.lap - 1) : 0}<em>/ {run && !view.cd ? lapsIn : LAPS[0]}</em></b></div>
            <div className="tf-stat"><small>Distance</small><b className="num">{run && !view.cd ? view.idx * LANE_M + Math.round(view.frac * LANE_M) : 0}<em>m</em></b></div>
          </div>
          <div className="tf-lane">
            <svg viewBox="0 0 800 110" role="img" aria-label="Piste de 20 mètres entre deux plots" preserveAspectRatio="xMidYMid meet">
              <rect x="40" y="60" width="720" height="16" rx="8" fill="rgba(238,243,248,.07)"/>
              <line x1="40" y1="68" x2="760" y2="68" stroke="rgba(238,243,248,.22)" strokeWidth="2" strokeDasharray="3 9"/>
              <g fill="#f97316"><path d="M26 82 L40 46 L54 82 Z"/><path d="M746 82 L760 46 L774 82 Z"/></g>
              <text x="40" y="104" textAnchor="middle" fontSize="12" fill="#9db1c8" fontFamily="IBM Plex Mono">0 m</text>
              <text x="760" y="104" textAnchor="middle" fontSize="12" fill="#9db1c8" fontFamily="IBM Plex Mono">20 m</text>
              <circle cx={x} cy="52" r="20" fill="none" stroke="#00c8e0" strokeOpacity=".35" strokeWidth="2"/>
              <circle cx={x} cy="52" r="12" fill="#00c8e0"/>
            </svg>
            {run && view.cd ? <div className="tf-big" aria-live="assertive">{view.cd}</div> : null}
          </div>
          <div className="tf-pbar" aria-hidden="true"><i style={{ width: (run && !view.cd ? view.frac * 100 : 0) + '%' }}/></div>
          <div className="tf-ctrl">
            {!run ? <button type="button" className="tf-btn primary lg" onClick={start}>{phase === 'done' ? 'Refaire la navette' : 'Démarrer le test'}</button>
              : <button type="button" className="tf-btn stop lg" onClick={function () { finish(false); }}>Je m’arrête</button>}
            <label className="tf-vol"><span>Volume</span><input type="range" min="0.2" max="1" step="0.05" value={vol} onChange={function (e) { setVol(Number(e.target.value)); }} aria-label="Volume des bips"/></label>
            <button type="button" className="tf-btn ghost" onClick={testSound} disabled={run}>Tester le son</button>
          </div>
          {audioMsg ? <div className="tf-audio-msg" role="status">{audioMsg}</div> : null}
        </div>
        <div className="tf-ptable" aria-label="Paliers">
          {LAPS.map(function (n, i) { return <div key={i} className={run && !view.cd ? (i === lvl ? 'cur' : i < lvl ? 'done' : '') : ''}><b>{i + 1}</b>{fr(speedOf(i), 1)}</div>; })}
        </div>
        <HrPanel hr={hr} locked={run}/>
        <div className="tf-help">
          <p><b>Principe</b>Pose deux plots à 20 m. À chaque bip, tu dois être au plot opposé. La cadence accélère de 0,5 km/h à chaque palier. Un triple bip annonce un nouveau palier.</p>
          <p><b>Fin du test</b>Appuie sur « Je m’arrête » quand tu n’arrives plus au plot avant le bip, ou quand tu ne peux plus continuer. Ton palier est enregistré.</p>
          <p><b>Matériel</b>Pose le téléphone près d’un plot, écran allumé (il reste allumé tout seul), son activé. Sur iPhone, coupe le mode silencieux. Appuie sur « Tester le son » avant de partir.</p>
        </div>
      </div>
    );
  }

  /* ════════════ Étape 3 : récupération ════════════ */
  function Rest(props) {
    var st = React.useState(Date.now()), tk = st[1];
    React.useEffect(function () { var i = setInterval(function () { tk(Date.now()); }, 500); return function () { clearInterval(i); }; }, []);
    var left = Math.max(0, Math.ceil((props.endAt - Date.now()) / 1000)), ready = left === 0;
    var pct = Math.min(100, (1 - left / REST_SEC) * 100);
    var L = props.leger;
    return (
      <div className="tf-card tf-narrow tf-center">
        <div className="tf-eye">Récupération</div>
        <h2 className="tf-h2">{ready ? 'Tu peux passer au circuit' : 'Récupère avant le circuit'}</h2>
        <div className="tf-timer num" aria-live="off">{mmss(left)}</div>
        <div className="tf-slot"><i style={{ width: pct + '%' }}/></div>
        <p className="tf-p">Navette terminée : palier {L.palier}, vitesse atteinte {fr(L.vma, 1)} km/h. Marche doucement, bois de l’eau, mange léger. Vingt minutes minimum entre les deux tests.</p>
        <div className="tf-actions center">
          <button type="button" className="tf-btn primary lg" disabled={!ready} onClick={props.onNext}>Passer au circuit</button>
        </div>
        {!ready ? <button type="button" className="tf-link" onClick={function () { if (window.confirm('Moins de 20 minutes de récupération rendent le circuit moins comparable. Continuer quand même ?')) props.onNext(); }}>Passer la récupération</button> : null}
      </div>
    );
  }

  /* ════════════ Étape 4 : circuit chronométré ════════════ */
  function Circuit(props) {
    var hr = props.hr, wl = useWakeLock();
    var md = React.useState(null), mode = md[0], setMode = md[1]; // null | 'assist' | 'solo'
    var ph = React.useState('idle'), phase = ph[0], setPhase = ph[1]; // idle | cd | run | done
    var cd = React.useState(0), cdN = cd[0], setCdN = cd[1];
    var ms = React.useState([]), marks = ms[0], setMarks = ms[1];
    var el = React.useState(0), elapsed = el[0], setElapsed = el[1];
    var R = React.useRef({ t0: 0, timer: null, audio: null, marks: [], mode: null, hrOff: 0 });
    var total = EX.length * ROUNDS, idx = marks.length;
    React.useEffect(function () { return function () { clearInterval(R.current.timer); killAudio(R.current.audio); wl.off(); }; }, []);
    function beep(f, d, n) { var r = R.current; if (!r.audio) r.audio = makeAudio(1); var a = r.audio; if (!a) return; a.ctx.resume().then(function () { var t = a.ctx.currentTime + 0.02; for (var i = 0; i < (n || 1); i++) tone(a, t + i * 0.2, f, d, 0.7); }); }
    function begin() {
      var r = R.current; r.marks = []; r.mode = mode; setMarks([]); setElapsed(0);
      if (!r.audio) r.audio = makeAudio(1);
      var a = r.audio, go = function () { setPhase('cd'); setCdN(COUNTDOWN); var n = COUNTDOWN; r.cdTimer = setInterval(function () { n--; if (n > 0) { setCdN(n); } else { clearInterval(r.cdTimer); run(); } }, 1000);
        if (a) { var t = a.ctx.currentTime + 0.05; for (var i = 0; i < COUNTDOWN; i++) tone(a, t + i, 660, 0.18, 0.7); tone(a, t + COUNTDOWN, 1250, 0.5, 0.75); } };
      if (a) a.ctx.resume().then(go, go); else go();
    }
    function run() {
      var r = R.current; r.t0 = performance.now(); hr.begin(); wl.on(); setPhase('run'); props.onStart && props.onStart();
      clearInterval(r.timer); r.timer = setInterval(function () { setElapsed((performance.now() - r.t0) / 1000); }, 100);
    }
    function validate() {
      var r = R.current; if (r.mode !== 'assist' || r.marks.length >= total) return;
      r.marks.push((performance.now() - r.t0) / 1000); setMarks(r.marks.slice());
      if (r.marks.length >= total) finish(true); else beep(1000, 0.18, 1);
    }
    function finish(assisted) {
      var r = R.current; clearInterval(r.timer); wl.off();
      var t = (performance.now() - r.t0) / 1000, samples = hr.end();
      var segs = [], parts = null;
      if (r.mode === 'assist' && r.marks.length === total) {
        t = r.marks[total - 1]; parts = [];
        for (var i = 0; i < total; i++) { var from = i ? r.marks[i - 1] : 0, to = r.marks[i]; parts.push(Math.round((to - from) * 10) / 10); segs.push({ label: 'Tour ' + (Math.floor(i / EX.length) + 1) + ' · ' + EX[i % EX.length].n, short: String(i + 1), from: from, to: to }); }
      }
      var trace = buildTrace(samples, segs);
      if (trace) trace.summary.segments.forEach(function (s, i) { s.short = segs[i].short; });
      setElapsed(t); setPhase('done'); beep(1250, 0.4, 2);
      props.onDone({ seconds: Math.round(t * 10) / 10, mode: r.mode, parts: parts, trace: trace });
    }
    function abort() { var r = R.current; clearInterval(r.timer); clearInterval(r.cdTimer); wl.off(); hr.end(); setPhase('idle'); setMarks([]); setElapsed(0); r.marks = []; }
    React.useEffect(function () {
      function key(e) { if (e.code === 'Space' && phase === 'run' && R.current.mode === 'assist' && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); validate(); } }
      document.addEventListener('keydown', key); return function () { document.removeEventListener('keydown', key); };
    }, [phase]);

    var cur = EX[idx % EX.length], round = Math.min(ROUNDS, Math.floor(idx / EX.length) + 1);
    if (!mode) {
      return (
        <div className="tf-card tf-narrow">
          <div className="tf-eye">Circuit chronométré</div>
          <h2 className="tf-h2">Quelqu’un peut-il appuyer pour toi ?</h2>
          <p className="tf-p">À la fin de chaque exercice, il faut appuyer sur « Exercice terminé » pour passer à la suite. Une autre personne doit le faire pendant que tu enchaînes.</p>
          <div className="tf-choice">
            <button type="button" onClick={function () { setMode('assist'); }}><b>Oui, une personne est avec moi</b><span>Elle appuie sur « Exercice terminé ». Tu obtiens le temps de chaque exercice, et la fréquence cardiaque exercice par exercice.</span></button>
            <button type="button" onClick={function () { setMode('solo'); }}><b>Non, je fais le test seul</b><span>Mode autonome : un simple chronomètre que tu arrêtes à la fin du dernier exercice. Pas de temps par exercice.</span></button>
          </div>
        </div>
      );
    }
    return (
      <div className="tf-cgrid">
        <div className="tf-card">
          <div className="tf-eye">Circuit chronométré</div>
          <h2 className="tf-h2" style={{ fontSize: 21 }}>3 tours du même circuit, le plus vite possible</h2>
          <div className="tf-tw"><table className="tf-tab">
            <thead><tr><th>Exercice</th><th>Par tour</th><th>Total x3</th></tr></thead>
            <tbody>{EX.map(function (e, k) { return (<tr key={k} className={phase === 'run' && mode === 'assist' && idx < total && idx % EX.length === k ? 'cur' : ''}><td className="ex">{e.n}<small>{e.sub}</small></td><td className="num">{e.r}{e.u}</td><td className="num">{e.r * ROUNDS}{e.u}</td></tr>); })}</tbody>
          </table></div>
          <ul className="tf-rules">
            <li>Tu enchaînes dans l’ordre, sans matériel. Tu peux te reposer entre deux exercices, mais le chrono continue.</li>
            <li>Une répétition ne compte que si le mouvement est complet.</li>
            <li>{mode === 'assist' ? 'Ton partenaire appuie sur « Exercice terminé » à la fin de chaque exercice (ou la barre espace sur ordinateur).' : 'Tu arrêtes le chrono toi-même à la fin du dernier exercice.'}</li>
          </ul>
          <HrPanel hr={hr} locked={phase === 'run' || phase === 'cd'}/>
        </div>
        <div className="tf-card tf-timer-card">
          <div className="tf-eye">Chronomètre · {mode === 'assist' ? 'avec partenaire' : 'autonome'}</div>
          <div className="tf-timer num">{phase === 'cd' ? cdN : mmss(elapsed)}</div>
          <div className="tf-state">{phase === 'idle' ? 'Prêt.' : phase === 'cd' ? 'Prépare-toi…' : phase === 'done' ? 'Test terminé : ' + mmss(elapsed) : mode === 'assist' ? 'Tour ' + round + ' sur ' + ROUNDS + ' · exercice ' + (idx % EX.length + 1) + ' sur ' + EX.length : 'Chrono en cours'}</div>
          {mode === 'assist' && phase !== 'done' ? <div className="tf-now"><small>{phase === 'run' ? 'Exercice en cours' : 'Premier exercice'}</small><b>{cur.r}{cur.u} {cur.u ? 'de ' : ''}{cur.n.toLowerCase()}</b></div> : null}
          {mode === 'assist' ? <div className="tf-slot"><i style={{ width: (idx / total * 100) + '%' }}/></div> : null}
          <div className="tf-actions">
            {phase === 'idle' ? <button type="button" className="tf-btn primary lg" onClick={begin}>Démarrer le chrono</button> : null}
            {phase === 'run' && mode === 'assist' ? <button type="button" className="tf-btn primary lg" onClick={validate}>Exercice terminé</button> : null}
            {phase === 'run' && mode === 'solo' ? <button type="button" className="tf-btn primary lg" onClick={function () { finish(false); }}>Test terminé, arrêter le chrono</button> : null}
            {phase === 'run' || phase === 'cd' ? <button type="button" className="tf-btn stop" onClick={abort}>Abandonner</button> : null}
            {phase === 'done' ? <button type="button" className="tf-btn" onClick={function () { setPhase('idle'); setMarks([]); setElapsed(0); }}>Refaire le circuit</button> : null}
            {phase === 'idle' ? <button type="button" className="tf-link" onClick={function () { setMode(null); }}>Changer de mode</button> : null}
          </div>
        </div>
        {mode === 'assist' && marks.length ? (
          <div className="tf-card" style={{ gridColumn: '1 / -1' }}>
            <div className="tf-eye">Temps par exercice</div>
            <SplitTable parts={marks.map(function (m, i) { return Math.round((m - (i ? marks[i - 1] : 0)) * 10) / 10; })}/>
          </div>
        ) : null}
      </div>
    );
  }

  function SplitTable(props) {
    var parts = props.parts;
    var seg = function (i) { return i < parts.length ? parts[i] : null; };
    return (
      <div className="tf-tw" style={{ marginTop: 12 }}><table className="tf-tab">
        <thead><tr><th>Exercice</th>{[1, 2, 3].map(function (r) { return <th key={r}>Tour {r}</th>; })}<th>Total</th></tr></thead>
        <tbody>
          {EX.map(function (e, k) {
            var tot = 0, n = 0;
            var cells = [0, 1, 2].map(function (r) { var v = seg(r * EX.length + k); if (v !== null) { tot += v; n++; } return <td key={r} className="num">{v === null ? '--' : mmss(v)}</td>; });
            return <tr key={k}><td>{e.n}</td>{cells}<td className="num"><b>{n ? mmss(tot) : '--'}</b></td></tr>;
          })}
          <tr><td><b>Temps du tour</b></td>{[0, 1, 2].map(function (r) { var s = 0, c = 0; for (var k = 0; k < EX.length; k++) { var v = seg(r * EX.length + k); if (v !== null) { s += v; c++; } } return <td key={r} className="num"><b>{c === EX.length ? mmss(s) : '--'}</b></td>; })}<td className="num"><b>{parts.length === EX.length * ROUNDS ? mmss(parts.reduce(function (a, b) { return a + b; }, 0)) : '--'}</b></td></tr>
        </tbody>
      </table></div>
    );
  }

  /* ════════════ Étape 5 : résultat + enregistrement ════════════ */
  function Gauge(props) {
    var c = 2 * Math.PI * 50, p = Math.max(0, Math.min(1, props.p));
    return (
      <svg width="116" height="116" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(127,150,175,.25)" strokeWidth="10"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke={props.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={(c * p) + ' ' + c} transform="rotate(-90 60 60)"/>
      </svg>
    );
  }
  function LevelRow(props) {
    return <div className="tf-lv">{LEVELS.map(function (l) { return <span key={l[0]} className={l[0] === props.level ? 'on' : ''}>{l[0]}</span>; })}</div>;
  }

  function Result(props) {
    var P = props.profile, L = props.leger, C = props.circuit, sc = SCALE[P.sex];
    var sv = React.useState({ state: 'idle', msg: '', off: null }), save = sv[0], setSave = sv[1];
    var p1 = pts(L.value, sc.nav[0], sc.nav[1], 50), p2 = pts(C.seconds, sc.cir[0], sc.cir[1], 50), tot = p1 + p2;
    var off = save.off, total = off ? off.score : tot, level = off ? off.level : levelOf(tot, 100);
    var vo2 = 5.857 * L.vma - 19.458;
    function doSave() {
      setSave({ state: 'busy', msg: '', off: null });
      var cid = null, warn = [];
      api('/api/cadences/campaign', { method: 'POST', body: JSON.stringify({ testKey: 'forme', sex: P.sex, scaleSex: P.sex, age: P.age, bodyWeightKg: P.weight, shareForCalibration: false }) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.erreur || 'Impossible de créer le test.');
          cid = r.j.id;
          return api('/api/cadences/result', { method: 'PUT', body: JSON.stringify({ campaignId: cid, slug: 'forme_navette', value: L.value, rawParts: [L.palier, L.laps, L.lapsIn, L.vma], status: 'validated', notes: 'vma=' + L.vma }) });
        })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.erreur || 'Enregistrement de la navette refusé.');
          return api('/api/cadences/result', { method: 'PUT', body: JSON.stringify({ campaignId: cid, slug: 'forme_circuit', value: C.seconds, rawParts: C.parts, status: 'validated', notes: C.mode === 'assist' ? 'avec_partenaire' : 'autonome' }) });
        })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.erreur || 'Enregistrement du circuit refusé.');
          var jobs = [];
          if (L.trace) jobs.push(api('/api/cadences/hr', { method: 'PUT', body: JSON.stringify({ campaignId: cid, slug: 'forme_navette', samples: L.trace.samples, summary: L.trace.summary }) }));
          if (C.trace) jobs.push(api('/api/cadences/hr', { method: 'PUT', body: JSON.stringify({ campaignId: cid, slug: 'forme_circuit', samples: C.trace.samples, summary: C.trace.summary }) }));
          return Promise.all(jobs).then(function (rs) { rs.forEach(function (x) { if (!x.ok) warn.push(x.j.erreur || 'courbe cardio non enregistrée'); }); });
        })
        .then(function () { return api('/api/cadences/campaign/close', { method: 'POST', body: JSON.stringify({ campaignId: cid }) }); })
        .then(function (r) { if (!r.ok) throw new Error(r.j.erreur || 'Clôture impossible.'); return api('/api/cadences/history?test_key=forme'); })
        .then(function (r) {
          var t = ((r.j && r.j.tests) || []).filter(function (x) { return x.id === cid; })[0];
          setSave({ state: 'ok', msg: warn.length ? 'Test enregistré, mais la courbe cardio n’a pas pu l’être (' + warn.join(', ') + ').' : '', off: t ? { score: t.score, level: t.level, scoreA: t.scoreA, levelA: t.levelA, nav: t.tests && t.tests.forme_navette, cir: t.tests && t.tests.forme_circuit } : null });
          props.onSaved(cid);
        })
        .catch(function (e) { setSave({ state: 'err', msg: (e && e.message) || 'Erreur réseau. Réessaie : tes résultats sont conservés.', off: null }); });
    }
    var navPts = off && off.nav ? off.nav.points : p1, cirPts = off && off.cir ? off.cir.points : p2;
    return (
      <div className="tf-stack">
        <div className="tf-card tf-score">
          <div>
            <div className="tf-eye">Score de forme</div>
            <div className="tf-who">{P.first} {P.last}{' · '}{frDate(P.date)} · {P.age} ans · {fr(P.weight, 1)} kg</div>
            <div className="tf-bigscore num">{fr(total, off ? 0 : 1)}<em>/ 100</em></div>
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <LevelRow level={level}/>
            <p className="tf-p" style={{ margin: 0 }}>{p1 > p2 + 8 ? 'Ton moteur aérobie est en avance sur ton endurance de force : travaille le renforcement.' : p2 > p1 + 8 ? 'Ton endurance de force devance ton moteur aérobie : ajoute de la course continue.' : 'Profil équilibré entre endurance et force.'}</p>
            <p className="tf-small">{off ? 'Score officiel calculé à l’enregistrement (barème général). Barème provisoire, en cours de calibrage.' : 'Estimation avec le barème général provisoire. Le score officiel est calculé à l’enregistrement.'}</p>
          </div>
        </div>
        <div className="tf-res">
          <div className="tf-card"><div className="tf-eye">Navette de Léger</div>
            <div className="tf-gauge"><Gauge p={navPts / 50} color="#00c8e0"/><div><div className="tf-big2 num">{fr(navPts, 1)} pts</div><div className="tf-mid num">VMA {fr(L.vma, 1)} km/h, palier {L.palier}</div><div className="tf-dim num">VO2max estimée {fr(vo2, 1)} ml/kg/min</div></div></div></div>
          <div className="tf-card"><div className="tf-eye">Circuit chronométré</div>
            <div className="tf-gauge"><Gauge p={cirPts / 50} color="#5b6fff"/><div><div className="tf-big2 num">{fr(cirPts, 1)} pts</div><div className="tf-mid num">Temps {mmss(C.seconds)}</div><div className="tf-dim num">{C.mode === 'assist' ? 'Avec partenaire' : 'Mode autonome'} · 3 tours</div></div></div></div>
        </div>
        {C.parts ? <div className="tf-card"><div className="tf-eye">Temps par exercice</div><SplitTable parts={C.parts}/></div> : null}
        {L.trace ? <div className="tf-card"><div className="tf-eye">Fréquence cardiaque · navette de Léger</div><HrSummary trace={L.trace} segTitle="Palier" color="#00c8e0"/></div> : null}
        {C.trace ? <div className="tf-card"><div className="tf-eye">Fréquence cardiaque · circuit</div><HrSummary trace={C.trace} segTitle="Exercice" color="#5b6fff"/></div> : null}
        <div className="tf-card tf-savebar">
          {save.state === 'ok' ? (
            <div><b>Test enregistré.</b> Il est dans ton historique{L.trace || C.trace ? ', avec tes courbes de fréquence cardiaque' : ''}.{save.msg ? <div className="tf-warn">{save.msg}</div> : null}
              <div className="tf-actions"><a className="tf-btn primary" href="historique.html">Voir mon historique</a><a className="tf-btn" href="tests-perso.html">Mes tests</a><button type="button" className="tf-btn" onClick={props.onRestart}>Nouveau passage</button></div></div>
          ) : (
            <div>
              <div className="tf-actions" style={{ marginTop: 0 }}>
                <button type="button" className="tf-btn primary lg" onClick={doSave} disabled={save.state === 'busy'}>{save.state === 'busy' ? 'Enregistrement…' : 'Enregistrer dans Decaform'}</button>
                <button type="button" className="tf-btn" onClick={props.onRestart} disabled={save.state === 'busy'}>Tout recommencer</button>
              </div>
              {save.state === 'err' ? <div className="tf-err" role="alert">{save.msg}</div> : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ════════════ Mes passages (historique de la batterie) ════════════ */
  function Past(props) {
    var st = React.useState(null), rows = st[0], setRows = st[1];
    var op = React.useState(null), open = op[0], setOpen = op[1];
    var tr = React.useState({}), traces = tr[0], setTraces = tr[1];
    React.useEffect(function () { api('/api/cadences/history?test_key=forme').then(function (r) { setRows(r.ok ? (r.j.tests || []).slice().reverse() : []); }); }, [props.refresh]);
    function toggle(id) {
      if (open === id) return setOpen(null);
      setOpen(id);
      if (!traces[id]) api('/api/cadences/hr?campaignId=' + encodeURIComponent(id)).then(function (r) { var m = Object.assign({}, traces); m[id] = r.ok ? (r.j.traces || []) : []; setTraces(m); });
    }
    if (!rows || !rows.length) return null;
    return (
      <section className="tf-card" style={{ marginTop: 22 }}>
        <div className="tf-eye">Mes passages</div>
        <div className="tf-past">
          {rows.map(function (t) {
            var tl = traces[t.id] || [], tn = tl.filter(function (x) { return x.test_slug === 'forme_navette'; })[0], tc = tl.filter(function (x) { return x.test_slug === 'forme_circuit'; })[0];
            return (
              <div key={t.id} className="tf-past-row">
                <button type="button" onClick={function () { toggle(t.id); }} aria-expanded={open === t.id}>
                  <span>{frDate(String(t.date).slice(0, 10))}</span><span className="num"><b>{t.score}</b> / 100</span><span>{t.level}</span><span aria-hidden="true">{open === t.id ? '▲' : '▼'}</span>
                </button>
                {open === t.id ? (
                  <div className="tf-past-body">
                    <div className="tf-small">Navette : {t.tests && t.tests.forme_navette ? fr(t.tests.forme_navette.points, 1) : '--'} pts · Circuit : {t.tests && t.tests.forme_circuit ? fr(t.tests.forme_circuit.points, 1) : '--'} pts</div>
                    {traces[t.id] === undefined ? <div className="tf-small">Chargement…</div> : (!tn && !tc) ? <div className="tf-small">Pas de courbe de fréquence cardiaque pour ce passage.</div> : null}
                    {tn ? <div><div className="tf-eye" style={{ margin: '14px 0 6px' }}>Cardio · navette</div><HrSummary trace={tn} segTitle="Palier" color="#00c8e0" shortOf={function (s, i) { return String(i + 1); }}/></div> : null}
                    {tc ? <div><div className="tf-eye" style={{ margin: '14px 0 6px' }}>Cardio · circuit</div><HrSummary trace={tc} segTitle="Exercice" color="#5b6fff" shortOf={function (s, i) { return String(i + 1); }}/></div> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  /* ════════════ Page ════════════ */
  var STEPS = [['profil', 'Profil'], ['leger', 'Test de Léger'], ['rest', 'Récupération'], ['circuit', 'Circuit'], ['result', 'Résultat']];

  function FormeApp() {
    var account = window.THWAccount.useAccount();
    var hrRef = React.useRef(null); if (!hrRef.current) hrRef.current = createHr();
    var hr = hrRef.current;
    var draft = React.useMemo(function () { var d = lsGet(DRAFT_KEY); return d && d.t && Date.now() - d.t < 6 * 3600 * 1000 ? d : null; }, []);
    var sg = React.useState(draft && draft.profile ? (draft.stage || 'profil') : 'profil'), stage = sg[0], setStage = sg[1];
    var pf = React.useState((draft && draft.profile) || { first: '', last: '', date: todayISO(), age: '', weight: '', sex: null }), profile = pf[0], setProfile = pf[1];
    var lg = React.useState((draft && draft.leger) || null), leger = lg[0], setLeger = lg[1];
    var ci = React.useState(null), circuit = ci[0], setCircuit = ci[1];
    var rs = React.useState((draft && draft.restEnd) || 0), restEnd = rs[0], setRestEnd = rs[1];
    var rf = React.useState(0), refresh = rf[0], setRefresh = rf[1];
    var running = React.useRef(false);

    // Préremplissage : prénom du compte + dernier profil connu (âge, poids, barème).
    React.useEffect(function () {
      if (draft && draft.profile) return;
      var saved = lsGet('thw-forme-profile') || {};
      api('/api/cadences/campaign').then(function (r) {
        var c = (r.ok && r.j.campagnes && r.j.campagnes[0]) || null;
        setProfile(function (p) {
          return Object.assign({}, p, {
            first: p.first || saved.first || (account && account.firstName) || '',
            last: p.last || saved.last || '',
            age: p.age || (c && c.age_at_start ? String(c.age_at_start) : ''),
            weight: p.weight || (c && c.body_weight_kg ? String(c.body_weight_kg) : ''),
            sex: p.sex || (c && c.scale_sex) || null
          });
        });
      });
    }, [account]);
    React.useEffect(function () {
      if (stage === 'profil' || stage === 'leger' && !leger) return;
      lsSet(DRAFT_KEY, { t: Date.now(), stage: stage === 'result' ? 'circuit' : stage, profile: profile, leger: leger, restEnd: restEnd });
    }, [stage, leger, restEnd]);
    React.useEffect(function () {
      function warn(e) { if (running.current) { e.preventDefault(); e.returnValue = ''; } }
      window.addEventListener('beforeunload', warn); return function () { window.removeEventListener('beforeunload', warn); };
    }, []);

    function restart() { lsSet(DRAFT_KEY, null); setLeger(null); setCircuit(null); setRestEnd(0); setStage('profil'); window.scrollTo(0, 0); }
    var idx = STEPS.map(function (s) { return s[0]; }).indexOf(stage);

    return (
      <div>
        <nav className="tf-steps" aria-label="Étapes">
          {STEPS.map(function (s, i) { return <div key={s[0]} className={'tf-step' + (i === idx ? ' on' : '') + (i < idx ? ' done' : '')}><i>{i < idx ? '✓' : i + 1}</i><span>{s[1]}</span></div>; })}
        </nav>
        {stage === 'profil' ? (
          <div>
            <header className="tf-head">
              <div className="tf-eye">Decaform · Test de forme</div>
              <h1 className="tf-h1">Deux tests, sans matériel, le même jour</h1>
              <p className="tf-p">Une course navette de Léger (endurance) et un circuit au poids du corps chronométré (endurance de force). Chacun vaut 50 points, pour un score de forme sur 100.</p>
            </header>
            <Profile profile={profile} onValid={function (p) { setProfile(p); lsSet('thw-forme-profile', { first: p.first, last: p.last }); setStage('leger'); window.scrollTo(0, 0); }}/>
          </div>
        ) : null}
        {stage === 'leger' ? (
          <div>
            <p className="tf-who" style={{ marginBottom: 14 }}>{profile.first} {profile.last} · {frDate(profile.date)} · {profile.age} ans · {fr(profile.weight, 1)} kg</p>
            <Leger hr={hr} onStart={function () { running.current = true; }}
              onDone={function (L) { running.current = false; setLeger(L); }}/>
            {leger ? (
              <div className="tf-card tf-narrow tf-center" style={{ marginTop: 18 }}>
                <div className="tf-eye">Navette terminée</div>
                <div className="tf-big2 num" style={{ marginTop: 8 }}>Palier {leger.palier} · VMA {fr(leger.vma, 1)} km/h</div>
                <p className="tf-p">Enregistré pour ce passage. Tu peux refaire la navette ci-dessus, ou passer à la récupération.</p>
                <div className="tf-actions center"><button type="button" className="tf-btn primary lg" onClick={function () { setRestEnd(Date.now() + REST_SEC * 1000); setStage('rest'); window.scrollTo(0, 0); }}>Commencer la récupération (20 min)</button></div>
              </div>
            ) : null}
          </div>
        ) : null}
        {stage === 'rest' && leger ? <Rest leger={leger} endAt={restEnd} onNext={function () { setStage('circuit'); window.scrollTo(0, 0); }}/> : null}
        {stage === 'circuit' ? (
          <div>
            <Circuit hr={hr} onStart={function () { running.current = true; }} onDone={function (C) { running.current = false; setCircuit(C); }}/>
            {circuit ? (
              <div className="tf-card tf-narrow tf-center" style={{ marginTop: 18 }}>
                <div className="tf-eye">Circuit terminé</div>
                <div className="tf-big2 num" style={{ marginTop: 8 }}>Temps {mmss(circuit.seconds)}</div>
                <div className="tf-actions center"><button type="button" className="tf-btn primary lg" onClick={function () { setStage('result'); window.scrollTo(0, 0); }}>Voir mon résultat</button></div>
              </div>
            ) : null}
          </div>
        ) : null}
        {stage === 'result' && leger && circuit ? <Result profile={profile} leger={leger} circuit={circuit} onRestart={restart} onSaved={function () { lsSet(DRAFT_KEY, null); setRefresh(refresh + 1); }}/> : null}
        <Past refresh={refresh}/>
        <p className="tf-small" style={{ marginTop: 26, textAlign: 'center' }}>Ce test ne remplace pas un avis médical. Barèmes provisoires, calibrés sur des passages réels au fil du temps. <a href="tests.html" style={{ color: 'var(--brand)' }}>Tous les tests</a> · <a href="historique.html" style={{ color: 'var(--brand)' }}>Mon historique</a></p>
      </div>
    );
  }

  function FormeStyle() {
    return (
      <style>{`
.tf-wrap{max-width:min(1040px,94vw);margin:0 auto;padding:104px 24px 80px;color:var(--text)}
@media(max-width:640px){.tf-wrap{padding:92px 16px 64px}}
.tf-wrap .num{font-variant-numeric:tabular-nums}
.tf-eye{font:500 11px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--brand)}
.tf-eye.light{color:#00c8e0}
.tf-h1{font-family:var(--font-display);font-weight:600;font-size:clamp(28px,4.4vw,40px);line-height:1.1;margin:10px 0 0;letter-spacing:-.01em}
.tf-h2{font-family:var(--font-display);font-weight:600;font-size:24px;line-height:1.2;margin:8px 0 10px;letter-spacing:-.01em}
.tf-p{color:var(--text-mid);font-size:14.5px;line-height:1.6;margin:8px 0 16px;max-width:64ch}
.tf-small{color:var(--text-dim);font-size:12.5px;line-height:1.55;margin:10px 0 0}
.tf-head{margin-bottom:22px}
.tf-card{background:var(--bg-card);border:1px solid var(--border-mid);border-radius:16px;padding:22px;box-shadow:0 1px 2px rgba(0,0,0,.05),0 8px 28px rgba(8,20,40,.07);min-width:0}
html.dark .tf-card{box-shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.25)}
.tf-narrow{max-width:680px;margin-left:auto;margin-right:auto}
.tf-center{text-align:center}.tf-center .tf-p{margin-left:auto;margin-right:auto}
.tf-stack{display:grid;gap:18px}
.tf-steps{display:flex;gap:6px;margin:0 0 26px;overflow-x:auto;padding-bottom:4px}
.tf-step{display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:max-content;padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:12.5px;color:var(--text-dim)}
.tf-step i{font:600 11px var(--font-mono);font-style:normal;width:20px;height:20px;border-radius:99px;display:grid;place-items:center;border:1px solid var(--border-mid)}
.tf-step.on{color:var(--text);border-color:var(--brand);background:rgba(0,200,224,.08)}.tf-step.on i{background:var(--brand);border-color:var(--brand);color:#04222a}
.tf-step.done{color:var(--text-mid)}.tf-step.done i{border-color:var(--brand);color:var(--brand)}
.tf-btn{font:500 14px var(--font-body);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border-radius:10px;border:1px solid var(--border-mid);background:var(--bg-card);color:var(--text);text-decoration:none;transition:filter .15s,border-color .15s}
.tf-btn:hover:not(:disabled){border-color:var(--brand);color:var(--brand)}
.tf-btn.primary{background:var(--brand);border-color:var(--brand);color:#04222a;font-weight:600}.tf-btn.primary:hover:not(:disabled){color:#04222a;filter:brightness(1.08)}
.tf-btn.stop{background:#dc3b3b;border-color:#dc3b3b;color:#fff}.tf-btn.stop:hover:not(:disabled){color:#fff;filter:brightness(1.1)}
.tf-btn.ghost{background:transparent}.tf-btn.lg{padding:14px 24px;font-size:15.5px}.tf-btn.small{padding:8px 12px;font-size:12.5px}
.tf-btn:disabled{opacity:.45;cursor:not-allowed}
.tf-btn:focus-visible,.tf-link:focus-visible,.tf-seg button:focus-visible,.tf-choice button:focus-visible,.tf-past-row button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.tf-link{background:none;border:0;padding:6px 0;color:var(--brand);font:600 12.5px var(--font-body);cursor:pointer}
.tf-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:18px}.tf-actions.center{justify-content:center}
.tf-err{margin-top:14px;padding:11px 14px;border-radius:10px;background:rgba(220,59,59,.12);color:#e25555;font-size:13.5px}
.tf-warn{margin-top:8px;color:#c98a14;font-size:13px}
.tf-rules{margin:18px 0 0;padding-left:18px;color:var(--text-mid);font-size:13px;display:grid;gap:6px}
.tf-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media(max-width:560px){.tf-grid2{grid-template-columns:1fr}}
.tf-f{display:grid;gap:6px;font-size:12.5px;color:var(--text-mid)}.tf-f>span{font-weight:600}
.tf-f input{font:500 15px var(--font-body);color:var(--text);background:var(--input-bg);border:1px solid var(--border-mid);border-radius:10px;padding:11px 12px;width:100%;min-width:0}
.tf-f input:focus{outline:2px solid var(--brand);outline-offset:1px}
.tf-seg{display:flex;gap:6px}.tf-seg button{flex:1;font:500 14px var(--font-body);padding:11px 12px;border-radius:10px;border:1px solid var(--border-mid);background:var(--input-bg);color:var(--text-mid);cursor:pointer}
.tf-seg button[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:#04222a;font-weight:600}
/* piste */
.tf-track{background:#0b1626;color:#eef3f8;border-radius:20px;padding:26px;position:relative;overflow:hidden;border:1px solid #1c3150;transition:box-shadow .08s}
.tf-track:before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 85% 0%,rgba(0,200,224,.2),transparent 70%);pointer-events:none}
.tf-track.flash{box-shadow:inset 0 0 0 3px #00c8e0,0 0 40px rgba(0,200,224,.45)}
.tf-track>*{position:relative}
.tf-track-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.tf-lvl{font:500 12px var(--font-mono);letter-spacing:.08em;color:#9db1c8;text-transform:uppercase}
.tf-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}
.tf-stat small{display:block;font:500 10.5px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:#9db1c8}
.tf-stat b{display:block;font:600 clamp(30px,5vw,46px)/1.05 var(--font-display);letter-spacing:-.02em;margin-top:6px}
.tf-stat b em{font:400 13px var(--font-body);font-style:normal;color:#9db1c8;margin-left:5px;letter-spacing:0}
.tf-lane{position:relative;margin:26px 0 14px}.tf-lane svg{width:100%;height:auto;display:block}
.tf-big{position:absolute;inset:0;display:grid;place-items:center;font:600 76px var(--font-display);color:#00c8e0;background:rgba(8,18,31,.78);border-radius:12px}
.tf-pbar{height:6px;border-radius:99px;background:rgba(238,243,248,.1);overflow:hidden}.tf-pbar i{display:block;height:100%;background:linear-gradient(90deg,#00c8e0,#5b6fff)}
.tf-ctrl{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:22px}
.tf-track .tf-btn{background:transparent;border-color:#27405f;color:#eef3f8}.tf-track .tf-btn:hover:not(:disabled){border-color:#00c8e0;color:#00c8e0}
.tf-track .tf-btn.primary{background:#00c8e0;border-color:#00c8e0;color:#06222a}.tf-track .tf-btn.primary:hover:not(:disabled){color:#06222a}
.tf-track .tf-btn.stop,.tf-track .tf-btn.stop:hover:not(:disabled){background:#dc3b3b;border-color:#dc3b3b;color:#fff}
.tf-vol{display:flex;gap:10px;align-items:center;font-size:12.5px;color:#9db1c8}.tf-vol input{accent-color:#00c8e0;width:120px}
.tf-audio-msg{margin-top:14px;font-size:13px;color:#cfe3f3;padding:10px 12px;border-radius:10px;background:rgba(238,243,248,.07)}
.tf-ptable{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}
.tf-ptable div{flex:0 0 auto;min-width:56px;text-align:center;border:1px solid var(--border);border-radius:10px;padding:8px 6px;background:var(--bg-card);font-size:12px;color:var(--text-dim)}
.tf-ptable div b{display:block;font:600 15px var(--font-display);color:var(--text)}
.tf-ptable div.cur{border-color:var(--brand);background:rgba(0,200,224,.12)}.tf-ptable div.done{opacity:.5}
.tf-help{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.tf-help p{margin:0;color:var(--text-mid);font-size:13px;line-height:1.55}.tf-help b{display:block;color:var(--text);margin-bottom:3px}
@media(max-width:800px){.tf-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.tf-help{grid-template-columns:1fr}.tf-track{padding:20px}}
/* cardio */
.tf-hr{border:1px solid var(--border-mid);border-radius:14px;padding:14px 16px;background:var(--bg-card);margin-top:16px}
.tf-stack>.tf-hr{margin-top:0}
.tf-hr-top{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.tf-hr-t{font-weight:600;font-size:14px}.tf-opt{font:500 10.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);margin-left:6px}
.tf-hr-s{color:var(--text-mid);font-size:12.5px;margin-top:2px}
.tf-hr-bpm{font:600 30px var(--font-display);color:#ef4444}.tf-hr-bpm em{font:400 12px var(--font-body);font-style:normal;color:var(--text-dim);margin-left:4px}
.tf-hr-note{margin-top:10px;font-size:12.5px;line-height:1.55;color:var(--text-mid);padding:9px 11px;border-radius:9px;background:rgba(0,200,224,.07)}
.tf-hr-note.warn{background:rgba(245,158,11,.12);color:#c98a14}
.tf-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:10px}
.tf-kpis small{display:block;font:500 10.5px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim)}
.tf-kpis b{display:block;font:600 28px var(--font-display);margin-top:4px}.tf-kpis b em{font:400 12px var(--font-body);font-style:normal;color:var(--text-dim);margin-left:4px}
.tf-hr-res{display:grid;gap:12px;margin-top:12px}
/* tableaux */
.tf-tw{overflow-x:auto;border:1px solid var(--border);border-radius:12px;margin-top:12px}
.tf-tab{width:100%;border-collapse:collapse;min-width:420px;font-size:13px}
.tf-tab th{font:500 10.5px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);text-align:right;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--bg-card-2);white-space:nowrap}
.tf-tab td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:right}
.tf-tab th:first-child,.tf-tab td:first-child{text-align:left}.tf-tab tr:last-child td{border-bottom:0}
.tf-tab tr.cur td{background:rgba(0,200,224,.12);color:var(--brand);font-weight:600}
.tf-tab .ex small{display:block;color:var(--text-dim);font-size:11.5px;font-weight:400}
/* circuit */
.tf-cgrid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px}
@media(max-width:860px){.tf-cgrid{grid-template-columns:1fr}}
.tf-choice{display:grid;gap:12px;margin-top:6px}
.tf-choice button{text-align:left;background:var(--bg-card-2);border:1px solid var(--border-mid);border-radius:14px;padding:16px 18px;cursor:pointer;color:var(--text);display:grid;gap:4px;font:inherit}
.tf-choice button:hover{border-color:var(--brand)}.tf-choice b{font-size:15px}.tf-choice span{color:var(--text-mid);font-size:13px;line-height:1.5}
.tf-timer{font:600 clamp(52px,9vw,72px)/1 var(--font-display);letter-spacing:-.03em;text-align:center;margin:10px 0 6px}
.tf-state{text-align:center;color:var(--text-mid);font-size:13.5px}
.tf-timer-card .tf-actions{justify-content:center}
.tf-now{margin:16px 0 8px;padding:14px;border-radius:12px;background:rgba(0,200,224,.1);text-align:center}
.tf-now small{display:block;font:500 10.5px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--brand)}.tf-now b{display:block;font:600 24px var(--font-display);margin-top:4px}
.tf-slot{height:8px;border-radius:99px;background:var(--bg-card-2);border:1px solid var(--border);overflow:hidden;margin:12px 0}.tf-slot i{display:block;height:100%;background:linear-gradient(90deg,var(--brand),#5b6fff)}
/* résultat */
.tf-score{display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.tf-who{font:500 12.5px var(--font-mono);color:var(--text-mid);margin:10px 0 0;letter-spacing:.02em}
.tf-bigscore{font:600 clamp(48px,8vw,68px)/1 var(--font-display);letter-spacing:-.02em;margin-top:10px}.tf-bigscore em{font:400 18px var(--font-body);font-style:normal;color:var(--text-dim);margin-left:8px}
.tf-lv{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}.tf-lv span{font:500 11px var(--font-mono);padding:5px 8px;border-radius:7px;border:1px solid var(--border);color:var(--text-dim)}.tf-lv span.on{background:var(--brand);border-color:var(--brand);color:#04222a}
.tf-res{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}@media(max-width:700px){.tf-res{grid-template-columns:1fr}}
.tf-gauge{display:flex;gap:18px;align-items:center;margin-top:14px}.tf-gauge svg{flex:none}
.tf-big2{font:600 28px/1.1 var(--font-display)}.tf-mid{margin-top:8px;color:var(--text-mid);font-size:14px}.tf-dim{color:var(--text-dim);font-size:12.5px;margin-top:2px}
.tf-savebar{border-color:var(--brand)}
.tf-past{display:grid;margin-top:10px}
.tf-past-row{border-top:1px solid var(--border)}
.tf-past-row>button{width:100%;display:grid;grid-template-columns:1.6fr 1fr 1fr 24px;gap:10px;align-items:center;text-align:left;padding:13px 4px;background:none;border:0;color:var(--text);font:inherit;cursor:pointer}
.tf-past-body{padding:0 4px 16px}
`}</style>
    );
  }

  function CadFormePage() {
    var account = window.THWAccount.useAccount();
    var loggedIn = !!(account && account.loggedIn !== false && (account.email || account.firstName || account.id));
    var bs = React.useState(null), ready = bs[0], setReady = bs[1];
    React.useEffect(function () {
      if (account === undefined) return;
      if (!loggedIn) { window.location.replace('compte.html?next=' + encodeURIComponent(NEXT_FILE)); return; }
      fetch('/api/cadences/catalog').then(function (r) { API = r.ok ? '' : APP_URL; setReady(true); }).catch(function () { API = APP_URL; setReady(true); });
    }, [account]);
    var H = window.SiteHeader, F = window.SiteFooter;
    return (
      <div>
        <FormeStyle/>
        {H ? <H active="perso"/> : null}
        <main className="tf-wrap" style={{ minHeight: '60vh' }}>{ready ? <FormeApp/> : null}</main>
        {F ? <F/> : null}
      </div>
    );
  }

  window.CadFormePage = CadFormePage;
  window.cadFormeMath = { pts: pts, legerSpeed: legerSpeed, levelOf: levelOf, SCALE: SCALE };
})();
