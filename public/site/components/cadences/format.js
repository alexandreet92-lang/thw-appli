/* ════════════════════════════════════════════════════════════════
   CADENCES (site) — format & valeurs dérivées (AFFICHAGE seulement).
   JS pur (pas de JSX) : publie window.CadencesFormat. Les dérivées ne
   touchent JAMAIS au score (calculé côté serveur). Porté de
   src/lib/cadences/format.ts.
   ════════════════════════════════════════════════════════════════ */
(function () {
  function parseDuration(str) {
    var s = String(str || '').trim().replace(',', '.');
    if (!s) return null;
    if (s.indexOf(':') !== -1) {
      var parts = s.split(':');
      if (parts.length !== 2) return null;
      var m = Number(parts[0]), sec = Number(parts[1]);
      if (!isFinite(m) || !isFinite(sec) || sec < 0 || sec >= 60) return null;
      return m * 60 + sec;
    }
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function formatDuration(sec, decimals) {
    if (!isFinite(sec)) return '—';
    var m = Math.floor(sec / 60);
    var s = sec - m * 60;
    var ss = decimals ? s.toFixed(1).padStart(4, '0') : String(Math.round(s)).padStart(2, '0');
    return m + ':' + ss;
  }

  function round(n, d) {
    if (d == null) d = 2;
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }

  function formatValue(test, value) {
    switch (test.unit) {
      case 's': return formatDuration(value, value < 60);
      case 'm': return round(value, 2) + ' m';
      case 'kg': return round(value, 1) + ' kg';
      case 'W': return Math.round(value) + ' W';
      case 'tours': return round(value, 2) + ' tours';
      default: return String(round(value, 2));
    }
  }

  var DISTANCE_M = {
    sprint_30m: 30, sprint_100m: 100, run_400m: 400, run_3200m: 3200,
    swim_50m: 50, swim_200m: 200, repeat_200m_x6: 1200, agility_slalom: 180,
  };
  var SWIM = { swim_50m: 1, swim_200m: 1 };

  /* Données dérivées affichées après saisie (jamais dans le score). */
  function derivedData(test, rawValue, bodyWeightKg) {
    var out = [];
    if (test.kind === 'ratio' && test.unit === 'kg' && bodyWeightKg > 0) {
      out.push({ label: 'Ratio au poids de corps', value: round(rawValue / bodyWeightKg, 2) + '×' });
      var reps = test.slug.indexOf('2rm') !== -1 ? 2 : 3;
      var oneRm = rawValue * (1 + reps / 30);
      out.push({ label: '1RM estimé (Epley)', value: round(oneRm, 1) + ' kg' });
    }
    if (test.slug === 'bike_20min' && bodyWeightKg > 0) {
      var wkg = rawValue / bodyWeightKg;
      out.push({ label: 'Puissance', value: round(wkg, 2) + ' W/kg' });
      out.push({ label: 'FTP estimée (95 %)', value: Math.round(rawValue * 0.95) + ' W · ' + round(wkg * 0.95, 2) + ' W/kg' });
    }
    var dist = DISTANCE_M[test.slug];
    if (dist && test.unit === 's' && rawValue > 0) {
      var speed = dist / rawValue;
      out.push({ label: 'Vitesse moyenne', value: round(speed, 2) + ' m/s · ' + round(speed * 3.6, 1) + ' km/h' });
      var perKm = rawValue / (dist / 1000);
      if (dist >= 400) out.push({ label: 'Allure', value: formatDuration(perKm) + ' / km' });
      if (SWIM[test.slug]) out.push({ label: 'Allure', value: formatDuration(rawValue / (dist / 100)) + ' / 100 m' });
    }
    return out;
  }

  /* Agrège les passages d'une épreuve en une valeur brute (avant équipement/ratio,
     que le moteur applique côté serveur). parts = tableau de nombres déjà parsés. */
  function aggregate(test, parts) {
    var vals = parts.filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (!vals.length) return null;
    if (test.aggregate === 'sum') return vals.reduce(function (a, b) { return a + b; }, 0);
    return test.direction === 'higher_is_better' ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
  }

  window.CadencesFormat = {
    parseDuration: parseDuration,
    formatDuration: formatDuration,
    formatValue: formatValue,
    derivedData: derivedData,
    aggregate: aggregate,
  };
})();
