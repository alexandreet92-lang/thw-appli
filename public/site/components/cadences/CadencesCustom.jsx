/* ════════════════════════════════════════════════════════════════
   Mes tests personnalisés — l'utilisateur crée ses propres tests (épreuves, unités,
   repère, objectif), passe des tests et suit sa progression. PRIVÉ : jamais publié,
   jamais comparé aux autres, jamais mélangé au score Decaform.
   Publie window.CadCustom (props : appUrl). SVG/HTML bruts, aucune librairie.
   ════════════════════════════════════════════════════════════════ */
(function () {
  function tr(fr) { return window.CadTr ? window.CadTr(fr) : fr; }
  var MEASURES = [
    { k: 'time', label: 'Temps', hint: 'm:ss ou h:mm:ss', dir: 'lower' },
    { k: 'distance', label: 'Distance (m)', hint: 'mètres', dir: 'higher' },
    { k: 'weight', label: 'Poids (kg)', hint: 'kilos', dir: 'higher' },
    { k: 'reps', label: 'Répétitions', hint: 'nombre', dir: 'higher' },
    { k: 'count', label: 'Nombre', hint: 'nombre', dir: 'higher' },
    { k: 'percent', label: 'Pourcentage', hint: '0 à 100', dir: 'higher' }
  ];
  var SCORINGS = [
    { k: 'values', label: 'Valeurs seulement', help: 'Tu suis tes résultats, sans note.' },
    { k: 'per_item', label: 'Note sur 100 par épreuve', help: 'Note de chaque épreuve : 0 à ton repère, 60 au repère, 100 à ton objectif.' },
    { k: 'weighted', label: 'Note globale pondérée', help: 'Comme la note par épreuve, avec un poids pour que certaines épreuves comptent plus.' }
  ];
  var REMINDS = [{ k: '', label: 'Aucun rappel' }, { k: '3', label: 'Tous les 3 mois' }, { k: '6', label: 'Tous les 6 mois' }];
  var TEMPLATES = [
    { k: 'blank', label: 'Vierge', sub: 'Je pars de zéro', sport: '', items: [{}] },
    { k: 'swim', label: 'Natation', sub: '400 m, 200 m, 50 m', sport: 'Natation', items: [
      { name: '400 m crawl', measure: 'time', ref: '7:30', goal: '6:30' }, { name: '200 m crawl', measure: 'time', ref: '3:30', goal: '2:50' }, { name: '50 m sprint', measure: 'time', ref: '0:42', goal: '0:33' }] },
    { k: 'run', label: 'Course à pied', sub: '5 km, 3 000 m, 400 m', sport: 'Course à pied', items: [
      { name: '5 km', measure: 'time', ref: '25:00', goal: '19:00' }, { name: '3 000 m', measure: 'time', ref: '14:00', goal: '11:00' }, { name: '400 m', measure: 'time', ref: '1:35', goal: '1:02' }] },
    { k: 'lift', label: 'Haltérophilie', sub: 'Arraché, épaulé-jeté', sport: 'Haltérophilie', items: [
      { name: 'Arraché', measure: 'weight', ref: '50', goal: '100' }, { name: 'Épaulé-jeté', measure: 'weight', ref: '60', goal: '120' }, { name: 'Squat arrière', measure: 'weight', ref: '80', goal: '160' }] },
    { k: 'tri', label: 'Triathlon', sub: 'Nage, vélo, course', sport: 'Triathlon', items: [
      { name: 'Natation 750 m', measure: 'time', ref: '18:00', goal: '13:00' }, { name: 'Vélo 20 km', measure: 'time', ref: '35:00', goal: '25:00' }, { name: 'Course 5 km', measure: 'time', ref: '25:00', goal: '19:00' }] },
    { k: 'hyrox', label: 'Hyrox', sub: 'Course, stations', sport: 'Hyrox', items: [
      { name: 'Course 1 km', measure: 'time', ref: '5:30', goal: '4:00' }, { name: 'SkiErg 1 000 m', measure: 'time', ref: '6:00', goal: '4:00' }, { name: 'Circuit complet', measure: 'time', ref: '1:20:00', goal: '1:00:00' }] }
  ];

  // ── Saisie / affichage des valeurs ─────────────────────────────────────────
  function parseVal(measure, s) {
    var t = String(s == null ? '' : s).trim().replace(',', '.');
    if (!t) return null;
    if (measure === 'time') {
      if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
      var m = t.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/); if (!m) return null;
      return m[3] != null ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
    }
    var n = Number(t); return isFinite(n) ? n : null;
  }
  function fmtVal(measure, v) {
    if (v == null || !isFinite(v)) return '—';
    if (measure === 'time') {
      var h = Math.floor(v / 3600), m = Math.floor((v - h * 3600) / 60), s = Math.round(v - h * 3600 - m * 60);
      if (s === 60) { s = 0; m += 1; }
      var p = function (x) { return (x < 10 ? '0' : '') + x; };
      return h ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
    }
    var r = Math.round(v * 100) / 100; return String(r).replace('.', ',') + (measure === 'weight' ? ' kg' : measure === 'distance' ? ' m' : measure === 'percent' ? ' %' : '');
  }
  function unitOf(measure) { return measure === 'time' ? 'h:mm:ss' : measure === 'weight' ? 'kg' : measure === 'distance' ? 'm' : measure === 'percent' ? '%' : ''; }
  function fmtDate(iso, o) { try { return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString(window.CadLocale ? window.CadLocale() : 'fr-FR', o || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // ── Notation : 0 → repère = 0..60, repère → objectif = 60..100 ────────────
  function score(item, v) {
    if (v == null || item.ref == null || item.goal == null || item.ref === item.goal) return null;
    var ref = Number(item.ref), goal = Number(item.goal), x;
    if (item.direction === 'lower') {
      if (v <= goal) x = 100;
      else if (v <= ref) x = 60 + 40 * (ref - v) / (ref - goal);
      else x = 60 * ref / v;
    } else {
      if (v >= goal) x = 100;
      else if (v >= ref) x = 60 + 40 * (v - ref) / (goal - ref);
      else x = v <= 0 ? 0 : 60 * v / ref;
    }
    return Math.max(0, Math.min(100, x));
  }
  function globalScore(test, run) {
    if (test.scoring === 'values') return null;
    var num = 0, den = 0;
    (test.items || []).forEach(function (it) {
      var s = score(it, run.values_json && run.values_json[it.id]); if (s == null) return;
      var w = test.scoring === 'weighted' ? (it.weight || 1) : 1; num += s * w; den += w;
    });
    return den ? num / den : null;
  }

  function api(appUrl, method, body, qs) {
    return fetch((appUrl || '') + '/api/cadences/custom' + (qs || ''), { method: method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .catch(function () { return { ok: false, status: 0, j: { erreur: 'Erreur réseau.' } }; });
  }

  function Style() {
    return (
      <style>{`
        .cc { margin-top: 56px; }
        .cc-eye { font-family: var(--font-mono); font-size: 11.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink, #e0b766); }
        .cc h2 { font-family: var(--font-display); font-weight: 600; font-size: clamp(24px, 3vw, 34px); margin: 4px 0 0; color: var(--text); letter-spacing: -.015em; }
        .cc h3 { font-family: var(--font-display); font-weight: 700; font-size: 18px; color: var(--text); margin: 0 0 6px; }
        .cc p { font-family: var(--font-body); color: var(--text-mid); font-size: 14.5px; line-height: 1.6; margin: 0; }
        .cc-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 16px; }
        .cc-card { border: 1px solid var(--border); border-radius: 18px; padding: 22px; background: var(--hv-card); box-shadow: var(--hv-shadow); }
        .cc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 900px) { .cc-grid { grid-template-columns: minmax(0, 1fr); } }
        .cc-kp { border: 1px solid var(--border); border-radius: 14px; padding: 16px; background: var(--hv-t1); display: grid; gap: 4px; align-content: start; }
        .cc-kp b { font-family: var(--font-display); font-size: 20px; color: var(--text); margin-top: 6px; }
        .cc-kp small { color: var(--text-dim); font-size: 12.5px; font-family: var(--font-body); }
        .cc-kp.new { border-style: dashed; place-items: center; text-align: center; cursor: pointer; min-height: 150px; align-content: center; }
        .cc-kp.new:hover { border-color: var(--text-mid); }
        .cc-tag { display: inline-block; font-family: var(--font-mono); font-weight: 700; font-size: 9.5px; letter-spacing: .08em; border: 1px solid var(--border-mid); border-radius: 999px; padding: 2px 9px; color: var(--text-mid); text-transform: uppercase; width: fit-content; }
        .cc-btn { font-family: var(--font-body); font-weight: 700; font-size: 14px; border-radius: 12px; padding: 10px 18px; cursor: pointer; border: 1px solid var(--border-mid); background: var(--hv-t2); color: var(--text); transition: background .2s, transform .2s; }
        .cc-btn:hover { background: var(--hv-t3); transform: translateY(-1px); }
        .cc-btn.main { background: var(--brand-gradient); color: #fff; border-color: transparent; } .cc-btn.main:hover { filter: brightness(1.08); }
        .cc-btn.sm { padding: 7px 13px; font-size: 13px; } .cc-btn[disabled] { opacity: .5; cursor: default; transform: none; }
        .cc-link { background: none; border: 0; color: var(--text-dim); cursor: pointer; font-family: var(--font-body); font-size: 13px; padding: 6px 4px; } .cc-link:hover { color: var(--text); }
        .cc-priv { display: inline-flex; border: 1px solid var(--border-mid); border-radius: 999px; padding: 6px 14px; font-family: var(--font-body); font-weight: 700; font-size: 12.5px; color: var(--text-mid); background: var(--hv-t1); }
        .cc label { display: block; font-family: var(--font-body); font-weight: 600; font-size: 12px; color: var(--text-dim); margin: 0 0 6px; }
        .cc input, .cc select { width: 100%; background: var(--hv-t1); border: 1px solid var(--border-mid); border-radius: 10px; color: var(--text); padding: 10px 12px; font-family: var(--font-body); font-size: 14px; } html.dark .cc input, html.dark .cc select { color-scheme: dark; }
        .cc input:focus, .cc select:focus { outline: 2px solid var(--hv-line); outline-offset: 1px; }
        .cc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } @media (max-width: 700px) { .cc-two { grid-template-columns: minmax(0, 1fr); } }
        .cc-lab { font-family: var(--font-mono); font-weight: 700; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-dim); margin: 22px 0 10px; }
        .cc-tpl { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; } @media (max-width: 900px) { .cc-tpl { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cc-mod { border: 1px solid var(--border-mid); border-radius: 14px; padding: 12px; background: var(--hv-t1); text-align: left; cursor: pointer; color: var(--text); font-family: var(--font-body); }
        .cc-mod b { display: block; font-family: var(--font-display); font-size: 14px; margin-bottom: 3px; } .cc-mod span { font-size: 12px; color: var(--text-dim); }
        .cc-mod:hover, .cc-mod[aria-pressed="true"] { border-color: var(--hv-line); }
        .cc-items { overflow-x: auto; } .cc-t { width: 100%; border-collapse: collapse; min-width: 680px; font-family: var(--font-body); }
        .cc-t th { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim); text-align: left; padding: 8px 8px; border-bottom: 1px solid var(--border-mid); font-weight: 500; }
        .cc-t td { padding: 8px; border-bottom: 1px solid var(--border); vertical-align: middle; color: var(--text-mid); font-size: 14px; }
        .cc-t td.n, .cc-t th.n { text-align: right; font-variant-numeric: tabular-nums; } .cc-t td b { color: var(--text); }
        .cc-pill { border: 1px solid var(--border-mid); background: var(--hv-t1); color: var(--text-mid); border-radius: 999px; font-family: var(--font-body); font-weight: 600; font-size: 13px; padding: 7px 15px; cursor: pointer; margin: 0 6px 6px 0; }
        .cc-pill[aria-pressed="true"] { background: var(--hv-t3); color: var(--hv-on); border-color: var(--hv-line); }
        .cc-note { font-family: var(--font-body); font-size: 12.5px; color: var(--text-dim); margin-top: 6px; }
        .cc-err { border: 1px solid rgba(248,113,113,.5); border-radius: 10px; padding: 10px 14px; color: #dc2626; font-family: var(--font-body); font-size: 13.5px; margin-top: 12px; }
        .cc-up { color: #34d399 !important; font-weight: 700; } .cc-dn { color: #f87171 !important; font-weight: 700; }
        .cc-act { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; align-items: center; margin-top: 20px; }
        .cc-rv { animation: ccRise .5s both; } @keyframes ccRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .cc-rv { animation: none; } }
      `}</style>
    );
  }

  function Spark(p) {
    var v = p.values.filter(function (x) { return x != null; });
    if (v.length < 2) return <svg width="130" height="40" aria-hidden="true"><circle cx="126" cy="20" r="4" fill="var(--brand)"/></svg>;
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), sp = Math.max(mx - mn, 1e-9);
    var pts = v.map(function (x, i) { return (4 + 122 * i / (v.length - 1)) + ',' + (34 - 28 * (x - mn) / sp); });
    var last = pts[pts.length - 1].split(',');
    return <svg width="130" height="40" viewBox="0 0 130 40" aria-hidden="true"><polyline fill="none" stroke="var(--brand)" strokeWidth="2" points={pts.join(' ')}/><circle cx={last[0]} cy={last[1]} r="4" fill="var(--brand)"/></svg>;
  }

  // ── Création ───────────────────────────────────────────────────────────────
  function Builder(p) {
    var s0 = React.useState('blank'); var tpl = s0[0], setTpl = s0[1];
    var nS = React.useState(''); var name = nS[0], setName = nS[1];
    var spS = React.useState(''); var sport = spS[0], setSport = spS[1];
    var itS = React.useState([{ id: 'i1', name: '', measure: 'time', direction: 'lower', ref: '', goal: '', weight: '1' }]); var items = itS[0], setItems = itS[1];
    var scS = React.useState('per_item'); var scoring = scS[0], setScoring = scS[1];
    var rmS = React.useState(''); var remind = rmS[0], setRemind = rmS[1];
    var erS = React.useState(''); var err = erS[0], setErr = erS[1];
    var bS = React.useState(false); var busy = bS[0], setBusy = bS[1];

    function pickTpl(t) {
      setTpl(t.k); setSport(t.sport ? tr(t.sport) : ''); if (t.k !== 'blank' && !name) setName(t.label === 'Hyrox' ? tr('Test Hyrox') : window.CadT('Test {sport}', { sport: window.CadLc(tr(t.label)) }));
      setItems(t.items.map(function (x, i) {
        var m = MEASURES.filter(function (q) { return q.k === (x.measure || 'time'); })[0];
        return { id: 'i' + (i + 1), name: x.name ? tr(x.name) : '', measure: m.k, direction: m.dir, ref: x.ref || '', goal: x.goal || '', weight: '1' };
      }));
    }
    function upd(i, patch) { setItems(function (l) { return l.map(function (x, k) { if (k !== i) return x; var n = Object.assign({}, x, patch); if (patch.measure) n.direction = MEASURES.filter(function (q) { return q.k === patch.measure; })[0].dir; return n; }); }); }
    function add() { setItems(function (l) { return l.length >= 40 ? l : l.concat([{ id: 'i' + (l.length + 1) + Date.now().toString(36).slice(-3), name: '', measure: 'time', direction: 'lower', ref: '', goal: '', weight: '1' }]); }); }
    function del(i) { setItems(function (l) { return l.length > 1 ? l.filter(function (_, k) { return k !== i; }) : l; }); }
    function save() {
      setErr('');
      if (!name.trim()) { setErr(tr('Donne un nom à ton test.')); return; }
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i]; if (!it.name.trim()) { setErr(tr('Chaque épreuve a besoin d’un nom.')); return; }
        var ref = parseVal(it.measure, it.ref), goal = parseVal(it.measure, it.goal);
        if (scoring !== 'values' && (ref == null || goal == null || ref === goal)) { setErr(window.CadT('Pour une note, « {name} » a besoin d’un repère et d’un objectif différents.', { name: it.name })); return; }
        if (scoring !== 'values' && ((it.direction === 'lower' && goal > ref) || (it.direction === 'higher' && goal < ref))) { setErr(window.CadT('Pour « {name} », l’objectif doit être meilleur que le repère.', { name: it.name })); return; }
        out.push({ id: it.id, name: it.name.trim(), measure: it.measure, direction: it.direction, ref: ref, goal: goal, weight: Number(String(it.weight).replace(',', '.')) || 1 });
      }
      setBusy(true);
      api(p.appUrl, 'POST', { action: 'create_test', name: name.trim(), sport: sport.trim(), scoring: scoring, remind_months: remind ? Number(remind) : null, items: out }).then(function (res) {
        setBusy(false);
        if (res.ok && res.j.test) p.onCreated(res.j.test); else setErr(tr((res.j && res.j.erreur) || 'Enregistrement impossible.'));
      });
    }
    var sc = SCORINGS.filter(function (x) { return x.k === scoring; })[0];
    return (
      <div className="cc-card cc-rv">
        <div className="cc-top" style={{ marginBottom: 0 }}>
          <div><div className="cc-eye">{tr('Mes tests personnalisés')}</div><h2>{tr('Crée ton propre test')}</h2><p style={{ marginTop: 6, maxWidth: '62ch' }}>{tr('Définis tes épreuves, tes unités et tes objectifs. Tu passes ton test quand tu veux et tu suis ta progression comme pour Decaform.')}</p></div>
          <span className="cc-priv">{tr('Privé : visible uniquement par toi')}</span>
        </div>
        <div className="cc-lab">{tr('Partir d’un modèle (modifiable ensuite)')}</div>
        <div className="cc-tpl">{TEMPLATES.map(function (t) { return <button key={t.k} type="button" className="cc-mod" aria-pressed={tpl === t.k} onClick={function () { pickTpl(t); }}><b>{tr(t.label)}</b><span>{tr(t.sub)}</span></button>; })}</div>
        <div className="cc-two" style={{ marginTop: 22 }}>
          <div><label htmlFor="cc-name">{tr('Nom du test')}</label><input id="cc-name" value={name} maxLength={80} onChange={function (e) { setName(e.target.value); }} placeholder={tr('Ex. : Test natation de printemps')}/></div>
          <div><label htmlFor="cc-sport">{tr('Sport')}</label><input id="cc-sport" value={sport} maxLength={40} onChange={function (e) { setSport(e.target.value); }} placeholder={tr('Ex. : Natation')}/></div>
        </div>
        <div className="cc-lab">{tr('Les épreuves')}</div>
        <div className="cc-items">
          <table className="cc-t">
            <thead><tr><th>{tr('Nom de l’épreuve')}</th><th style={{ width: 150 }}>{tr('Ce que tu mesures')}</th><th style={{ width: 150 }}>{tr('Meilleur résultat')}</th><th style={{ width: 110 }}>{tr('Repère')}</th><th style={{ width: 110 }}>{tr('Objectif')}</th>{scoring === 'weighted' ? <th style={{ width: 70 }}>{tr('Poids')}</th> : null}<th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {items.map(function (it, i) {
                var m = MEASURES.filter(function (q) { return q.k === it.measure; })[0];
                return (
                  <tr key={it.id}>
                    <td><input aria-label={tr('Nom de l’épreuve')} value={it.name} maxLength={60} onChange={function (e) { upd(i, { name: e.target.value }); }}/></td>
                    <td><select aria-label={tr('Ce que tu mesures')} value={it.measure} onChange={function (e) { upd(i, { measure: e.target.value }); }}>{MEASURES.map(function (q) { return <option key={q.k} value={q.k}>{tr(q.label)}</option>; })}</select></td>
                    <td><select aria-label={tr('Meilleur résultat')} value={it.direction} onChange={function (e) { upd(i, { direction: e.target.value }); }}><option value="lower">{tr('Le plus bas')}</option><option value="higher">{tr('Le plus haut')}</option></select></td>
                    <td><input aria-label={tr('Repère')} value={it.ref} placeholder={tr(m.hint)} onChange={function (e) { upd(i, { ref: e.target.value }); }}/></td>
                    <td><input aria-label={tr('Objectif')} value={it.goal} placeholder={tr(m.hint)} onChange={function (e) { upd(i, { goal: e.target.value }); }}/></td>
                    {scoring === 'weighted' ? <td><input aria-label={tr('Poids')} value={it.weight} onChange={function (e) { upd(i, { weight: e.target.value }); }}/></td> : null}
                    <td><button type="button" className="cc-link" onClick={function () { del(i); }} disabled={items.length < 2}>{tr('Suppr.')}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}><button type="button" className="cc-btn sm" onClick={add}>{tr('Ajouter une épreuve')}</button></div>
        <div className="cc-two">
          <div><div className="cc-lab">{tr('La notation')}</div>
            {SCORINGS.map(function (x) { return <button key={x.k} type="button" className="cc-pill" aria-pressed={scoring === x.k} onClick={function () { setScoring(x.k); }}>{tr(x.label)}</button>; })}
            <p className="cc-note">{tr(sc.help)}</p></div>
          <div><div className="cc-lab">{tr('Le rythme')}</div>
            {REMINDS.map(function (x) { return <button key={x.k} type="button" className="cc-pill" aria-pressed={remind === x.k} onClick={function () { setRemind(x.k); }}>{tr(x.label)}</button>; })}
            <p className="cc-note">{tr('Le rythme sert d’indication : il te suggère quand refaire le test.')}</p></div>
        </div>
        {err ? <div className="cc-err" role="alert">{err}</div> : null}
        <div className="cc-act">
          <span className="cc-note" style={{ marginRight: 'auto', marginTop: 0 }}>{tr('Tu pourras supprimer le test plus tard ; chaque passage garde ses valeurs.')}</span>
          <button type="button" className="cc-btn" onClick={p.onCancel}>{tr('Annuler')}</button>
          <button type="button" className="cc-btn main" disabled={busy} onClick={save}>{busy ? tr('Création…') : tr('Créer le test')}</button>
        </div>
      </div>
    );
  }

  // ── Passage ────────────────────────────────────────────────────────────────
  function Run(p) {
    var test = p.test, last = p.runs[p.runs.length - 1];
    var vS = React.useState({}); var vals = vS[0], setVals = vS[1];
    var dS = React.useState(today()); var date = dS[0], setDate = dS[1];
    var cS = React.useState(''); var cond = cS[0], setCond = cS[1];
    var erS = React.useState(''); var err = erS[0], setErr = erS[1];
    var bS = React.useState(false); var busy = bS[0], setBusy = bS[1];
    function save() {
      var out = {}, any = false;
      for (var i = 0; i < test.items.length; i++) {
        var it = test.items[i], raw = vals[it.id];
        if (raw == null || String(raw).trim() === '') continue;
        var v = parseVal(it.measure, raw);
        if (v == null || v < 0) { setErr(window.CadT('Résultat invalide pour « {name} ».', { name: it.name })); return; }
        out[it.id] = v; any = true;
      }
      if (!any) { setErr(tr('Saisis au moins un résultat.')); return; }
      setErr(''); setBusy(true);
      api(p.appUrl, 'POST', { action: 'add_run', test_id: test.id, performed_on: date, values: out, conditions: cond }).then(function (res) {
        setBusy(false);
        if (res.ok && res.j.run) p.onSaved(res.j.run); else setErr(tr((res.j && res.j.erreur) || 'Enregistrement impossible.'));
      });
    }
    return (
      <div className="cc-card cc-rv">
        <div className="cc-top" style={{ marginBottom: 6 }}><div><div className="cc-eye">{test.name}</div><h2>{tr('Nouveau passage')} · {fmtDate(date)}</h2></div><span className="cc-tag">{tr('Privé')}</span></div>
        <div className="cc-items"><table className="cc-t">
          <thead><tr><th>{tr('Épreuve')}</th><th style={{ width: 170 }}>{tr('Ton résultat')}</th><th className="n" style={{ width: 120 }}>{tr('Dernier test')}</th><th className="n" style={{ width: 90 }}>{tr('Écart')}</th></tr></thead>
          <tbody>{test.items.map(function (it) {
            var lv = last && last.values_json ? last.values_json[it.id] : null, nv = parseVal(it.measure, vals[it.id]);
            var d = lv != null && nv != null ? nv - lv : null, good = d != null && (it.direction === 'lower' ? d < 0 : d > 0), eq = d === 0;
            return (
              <tr key={it.id}>
                <td><b>{it.name}</b></td>
                <td><input aria-label={it.name} value={vals[it.id] || ''} placeholder={tr(MEASURES.filter(function (q) { return q.k === it.measure; })[0].hint)} onChange={function (e) { var x = e.target.value; setVals(function (o) { var n = Object.assign({}, o); n[it.id] = x; return n; }); }}/></td>
                <td className="n">{lv != null ? fmtVal(it.measure, lv) : '—'}</td>
                <td className={'n ' + (d == null || eq ? '' : good ? 'cc-up' : 'cc-dn')}>{d == null ? '—' : eq ? '±0' : (d > 0 ? '+' : '−') + fmtVal(it.measure, Math.abs(d)).replace(/\s?(kg|m|%)$/, '')}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
        <div className="cc-two" style={{ marginTop: 14 }}>
          <div><label htmlFor="cc-date">{tr('Date')}</label><input id="cc-date" type="date" value={date} max={today()} onChange={function (e) { setDate(e.target.value); }}/></div>
          <div><label htmlFor="cc-cond">{tr('Conditions (facultatif)')}</label><input id="cc-cond" value={cond} maxLength={120} onChange={function (e) { setCond(e.target.value); }} placeholder={tr('Ex. : bassin 25 m, eau 27 °C')}/></div>
        </div>
        {err ? <div className="cc-err" role="alert">{err}</div> : null}
        <div className="cc-act"><button type="button" className="cc-btn" onClick={p.onCancel}>{tr('Annuler')}</button><button type="button" className="cc-btn main" disabled={busy} onClick={save}>{busy ? tr('Enregistrement…') : tr('Terminer le passage')}</button></div>
      </div>
    );
  }

  // ── Détail / historique d'un test ──────────────────────────────────────────
  function Detail(p) {
    var test = p.test, runs = p.runs;
    var last = runs[runs.length - 1], prev = runs[runs.length - 2];
    var gl = last ? globalScore(test, last) : null, gp = prev ? globalScore(test, prev) : null;
    var cs = React.useState(false); var confirm = cs[0], setConfirm = cs[1];
    return (
      <div className="cc-card cc-rv">
        <div className="cc-top" style={{ marginBottom: 8 }}>
          <div><div className="cc-eye">{test.sport || tr('Test personnalisé')}</div><h2>{test.name}</h2></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><span className="cc-priv">{tr('Privé : visible uniquement par toi')}</span><button type="button" className="cc-btn main sm" onClick={p.onRun}>{tr('Nouveau passage')}</button><button type="button" className="cc-btn sm" onClick={p.onBack}>{tr('Retour')}</button></div>
        </div>
        {last && gl != null ? <h3>{tr('Note globale')} {Math.round(gl)} / 100 {gp != null ? <span className={gl - gp >= 0 ? 'cc-up' : 'cc-dn'} style={{ marginLeft: 8, fontSize: 15 }}>{gl - gp >= 0 ? '▲ +' : '▼ −'}{Math.abs(Math.round(gl - gp))}</span> : null}</h3> : null}
        {!runs.length ? <p>{tr('Aucun passage pour l’instant. Clique sur « Nouveau passage » pour saisir tes premiers résultats.')}</p> : (
          <div className="cc-items"><table className="cc-t">
            <thead><tr><th>{tr('Épreuve')}</th>{runs.map(function (r) { return <th key={r.id} className="n">{fmtDate(r.performed_on)}</th>; })}<th>{tr('Évolution')}</th></tr></thead>
            <tbody>
              {test.scoring !== 'values' ? (
                <tr><td><b>{tr('Note globale')}</b></td>{runs.map(function (r) { var g = globalScore(test, r); return <td key={r.id} className="n"><b>{g == null ? '—' : Math.round(g)}</b></td>; })}<td><Spark values={runs.map(function (r) { return globalScore(test, r); })}/></td></tr>
              ) : null}
              {test.items.map(function (it) {
                return (
                  <tr key={it.id}>
                    <td><b>{it.name}</b></td>
                    {runs.map(function (r) {
                      var v = r.values_json ? r.values_json[it.id] : null, s = score(it, v);
                      return <td key={r.id} className="n">{v == null ? '—' : fmtVal(it.measure, v)}{test.scoring !== 'values' && s != null ? <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)' }}>{Math.round(s)} / 100</span> : null}</td>;
                    })}
                    <td><Spark values={runs.map(function (r) { var v = r.values_json ? r.values_json[it.id] : null; return v == null ? null : (it.direction === 'lower' ? -v : v); })}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
        {runs.length ? <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>{runs.map(function (r) { return <button key={r.id} type="button" className="cc-link" onClick={function () { p.onDelRun(r); }}>{tr('Supprimer le passage du')} {fmtDate(r.performed_on)}</button>; })}</div> : null}
        <div className="cc-act" style={{ justifyContent: 'space-between' }}>
          <span className="cc-note" style={{ margin: 0 }}>{test.remind_months ? window.CadT('Rythme conseillé : tous les {n} mois.', { n: test.remind_months }) : ''}</span>
          {confirm
            ? <span><span className="cc-note" style={{ marginRight: 10 }}>{tr('Supprimer ce test et tous ses passages ?')}</span><button type="button" className="cc-btn sm" onClick={function () { setConfirm(false); }}>{tr('Annuler')}</button> <button type="button" className="cc-btn sm main" onClick={function () { p.onDelTest(test); }}>{tr('Supprimer définitivement')}</button></span>
            : <button type="button" className="cc-link" onClick={function () { setConfirm(true); }}>{tr('Supprimer ce test')}</button>}
        </div>
      </div>
    );
  }

  // ── Composant principal ────────────────────────────────────────────────────
  function CadCustom(props) {
    if (window.CadUseLang) window.CadUseLang();
    var dS = React.useState(null); var data = dS[0], setData = dS[1];       // null = chargement
    var vS = React.useState(props.initialView || { v: 'list' }); var view = vS[0], setView = vS[1];
    var appUrl = props.appUrl || '';
    React.useEffect(function () {
      var alive = true;
      api(appUrl, 'GET').then(function (res) {
        if (!alive) return;
        if (res.ok && res.j.available) setData({ tests: res.j.tests || [], runs: res.j.runs || [] });
        else setData({ off: true, tests: [], runs: [] });
      });
      return function () { alive = false; };
    }, [appUrl]);
    if (!data) return props.standalone ? <section className="cc" aria-busy="true"><Style/><p>{tr('Chargement…')}</p></section> : null;
    if (data.off) {
      // Page dédiée : on explique au lieu d'afficher une page vide. Ailleurs : rien.
      return props.standalone ? (
        <section className="cc" id="cad-perso"><Style/>
          <div className="cc-card"><h3>{tr('Les tests personnalisés ne sont pas encore activés')}</h3>
            <p>{tr('La table nécessaire n’existe pas encore côté serveur, ou ta session n’est pas reconnue. Reconnecte-toi ; si le message persiste, l’activation est à faire côté administrateur.')}</p></div>
        </section>
      ) : null;
    }
    var runsOf = function (id) { return data.runs.filter(function (r) { return r.test_id === id; }).sort(function (a, b) { return String(a.performed_on).localeCompare(String(b.performed_on)); }); };
    var cur = view.id ? data.tests.filter(function (t) { return t.id === view.id; })[0] : null;
    function back() { if (props.onExit) props.onExit(); else setView({ v: 'list' }); }
    var body;
    if (view.v === 'build') {
      body = <Builder appUrl={appUrl} onCancel={back} onCreated={function (t) { setData(function (d) { return { tests: d.tests.concat([t]), runs: d.runs }; }); setView({ v: 'run', id: t.id }); }}/>;
    } else if (view.v === 'run' && cur) {
      body = <Run appUrl={appUrl} test={cur} runs={runsOf(cur.id)} onCancel={function () { setView({ v: 'detail', id: cur.id }); }} onSaved={function (r) { setData(function (d) { return { tests: d.tests, runs: d.runs.concat([r]) }; }); setView({ v: 'detail', id: cur.id }); }}/>;
    } else if (view.v === 'detail' && cur) {
      body = <Detail test={cur} runs={runsOf(cur.id)} onBack={back} onRun={function () { setView({ v: 'run', id: cur.id }); }}
        onDelRun={function (r) { api(appUrl, 'DELETE', null, '?kind=run&id=' + encodeURIComponent(r.id)).then(function (res) { if (res.ok) setData(function (d) { return { tests: d.tests, runs: d.runs.filter(function (x) { return x.id !== r.id; }) }; }); }); }}
        onDelTest={function (t) { api(appUrl, 'DELETE', null, '?kind=test&id=' + encodeURIComponent(t.id)).then(function (res) { if (res.ok) { setData(function (d) { return { tests: d.tests.filter(function (x) { return x.id !== t.id; }), runs: d.runs.filter(function (x) { return x.test_id !== t.id; }) }; }); back(); } }); }}/>;
    } else {
      body = (
        <div className="cc-card">
          <div className="cc-grid">
            {data.tests.map(function (t) {
              var rs = runsOf(t.id), l = rs[rs.length - 1], g = l ? globalScore(t, l) : null;
              return (
                <div key={t.id} className="cc-kp">
                  <span className="cc-tag">{t.sport || tr('Personnalisé')}</span>
                  <b>{t.name}</b>
                  <small>{t.items.length} {tr('épreuves')} · {rs.length} {rs.length > 1 ? tr('passages') : tr('passage')}{l ? ' · ' + tr('dernier') + ' : ' + fmtDate(l.performed_on) : ''}</small>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
                    <div><small>{t.scoring === 'values' ? tr('Valeurs seulement') : tr('Note globale')}</small><b style={{ fontSize: 30, display: 'block', marginTop: 2 }}>{g == null ? '—' : Math.round(g)}</b></div>
                    <Spark values={rs.map(function (r) { return globalScore(t, r); })}/>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button type="button" className="cc-btn sm" onClick={function () { setView({ v: 'run', id: t.id }); }}>{tr('Nouveau passage')}</button>
                    <button type="button" className="cc-link" onClick={function () { setView({ v: 'detail', id: t.id }); }}>{tr('Historique')}</button>
                  </div>
                </div>
              );
            })}
            <div className="cc-kp new" role="button" tabIndex={0} onClick={function () { setView({ v: 'build' }); }} onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') setView({ v: 'build' }); }}>
              <b style={{ marginTop: 0 }}>{tr('Nouveau test')}</b><small>{tr('Partir d’un modèle ou de zéro')}</small>
            </div>
          </div>
          <p className="cc-note" style={{ marginTop: 14 }}>{tr('Envie de mesurer ta forme sans matériel ?')} <a href="test-de-forme.html" style={{ color: 'var(--text)', fontWeight: 700 }}>{tr('Test de forme')}</a></p>
          <p className="cc-note" style={{ marginTop: 14 }}>{tr('Les tests personnalisés ne sont jamais publiés, ni comparés aux autres athlètes, ni mélangés au score Decaform. Seul Decaform alimente ton score global.')}</p>
        </div>
      );
    }
    return (
      <section className="cc" id="cad-perso" aria-label={tr('Mes tests personnalisés')}>
        <Style/>
        {view.v === 'list' ? (
          <div className="cc-top"><div><div className="cc-eye">{tr('Mes tests personnalisés')}</div><h2>{data.tests.length ? data.tests.length + ' ' + (data.tests.length > 1 ? tr('tests') : tr('test')) + ' · ' + tr('visibles uniquement par toi') : tr('Crée ton premier test')}</h2></div>
            <button type="button" className="cc-btn main" onClick={function () { setView({ v: 'build' }); }}>{tr('Créer un test')}</button></div>
        ) : null}
        {body}
      </section>
    );
  }

  // Page dédiée « Mes tests » (tests-perso.html) : en-tête, bande sombre, pied de page.
  function CadCustomPage() {
    var account = window.THWAccount.useAccount();
    var loggedIn = !!(account && account.loggedIn !== false && (account.email || account.firstName || account.id));
    var APP_URL = (typeof window !== 'undefined' && window.APP_URL) || 'https://thw-appli.vercel.app';
    var bS = React.useState(null); var base = bS[0], setBase = bS[1];
    React.useEffect(function () {
      if (account === undefined) return;
      if (!loggedIn) { window.location.replace('compte.html?next=' + encodeURIComponent('historique.html')); return; }
      // Même origine si l'API y répond (app), sinon l'app (site statique).
      fetch('/api/cadences/catalog').then(function (r) { setBase(r.ok ? '' : APP_URL); }).catch(function () { setBase(APP_URL); });
    }, [account]);
    var H = window.SiteHeader, F = window.SiteFooter;
    return (
      <div>
        {window.CadHistoryStyle ? <window.CadHistoryStyle/> : null}
        <style>{`.cad-wrap{max-width:min(1100px,94vw);margin:0 auto;padding:104px 24px 80px;color:var(--text)} .cad-night-band{position:relative} .cad-night-band .cc{margin-top:0}
          @media (max-width:640px){.cad-wrap{padding:92px 16px 64px}}`}</style>
        {H ? <H active="perso"/> : null}
        <div className="cad-night-band">
          <main className="cad-wrap" style={{ minHeight: '60vh' }}>
            {base === null ? null : <CadCustom appUrl={base} standalone={true}/>}
          </main>
        </div>
        {F ? <F/> : null}
      </div>
    );
  }

  window.CadCustom = CadCustom;
  window.CadCustomPage = CadCustomPage;
  window.cadCustomMath = { parseVal: parseVal, fmtVal: fmtVal, score: score, globalScore: globalScore };
})();
