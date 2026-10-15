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

  // Affichage (jamais en saisie) : virgule décimale, comme partout ailleurs sur le site.
  function comma(x) { return String(x).replace('.', ','); }
  function formatValue(test, value) {
    switch (test.unit) {
      case 's': return value < 60 ? comma(round(value, 2)) + ' s' : comma(formatDuration(value, Math.abs(value - Math.round(value)) > 0.05));
      case 'm': return comma(round(value, 2)) + ' m';
      case 'kg': return comma(round(value, 1)) + ' kg';
      case 'W': return Math.round(value) + ' W';
      case 'tours': return comma(round(value, 2)) + ' tours';
      default: return comma(round(value, 2));
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
      out.push({ label: 'Ratio au poids de corps', value: frNum(rawValue / bodyWeightKg, 2) + '×' });
      var reps = test.slug.indexOf('2rm') !== -1 ? 2 : 3;
      var oneRm = rawValue * (1 + reps / 30);
      out.push({ label: '1RM estimé (Epley)', value: frNum(oneRm, 1) + ' kg' });
    }
    if (test.slug === 'bike_20min' && bodyWeightKg > 0) {
      var wkg = rawValue / bodyWeightKg;
      out.push({ label: 'Puissance', value: frNum(wkg, 2) + ' W/kg' });
      out.push({ label: 'FTP estimée (95 %)', value: Math.round(rawValue * 0.95) + ' W · ' + frNum(wkg * 0.95, 2) + ' W/kg' });
    }
    var dist = DISTANCE_M[test.slug];
    if (dist && test.unit === 's' && rawValue > 0) {
      var speed = dist / rawValue;
      out.push({ label: 'Vitesse moyenne', value: frNum(speed, 2) + ' m/s · ' + frNum(speed * 3.6, 1) + ' km/h' });
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

  var BIKE = 'bike_20min';
  function frNum(n, d) { return String(round(n, d)).replace('.', ','); }

  /* Valeur NORMALISÉE d'une épreuve en ratio (valueUsed du moteur) : × poids de corps
     pour les charges, W/kg pour le vélo. Jamais en kg ni en W : le score est calculé en ratio. */
  function formatRatio(test, ratio) {
    if (ratio == null) return '—';
    if (test.unit === 'W') return frNum(ratio, 2) + ' W/kg';
    if (test.unit === 'kg') return frNum(ratio, 2) + ' × poids de corps';
    return formatValue(test, ratio);
  }

  /* Seuil (Réf / Max) ou valeur brute exprimé pour l'affichage. Le vélo est noté en W/kg :
     on met les W/kg en premier et les watts entre parenthèses. */
  function formatThreshold(test, value, bodyWeightKg) {
    if (test.slug === BIKE && bodyWeightKg > 0) return frNum(value / bodyWeightKg, 2) + ' W/kg · ' + Math.round(value) + ' W';
    return formatValue(test, value);
  }

  /* Charges du Conditioning (kg) : tranche de poids de corps (borne haute incluse = charge la plus légère à poids pile),
     puis facteur de force de la tranche d'âge, arrondi à 2,5 kg avec plancher (barre 20 kg hommes / 15 kg femmes, haltère 5 kg).
     Même calcul que conditioningLoads() dans src/lib/cadences/protocols.ts. */
  function bandKg(bands, w) { for (var i = 0; i < bands.length; i++) { if (bands[i].max == null || w <= bands[i].max) return bands[i].kg; } return bands[bands.length - 1].kg; }
  function roundLoad(kg, floor) { return Math.max(floor, Math.round(kg / 2.5) * 2.5); }
  function conditioningLoads(cat, sex, weightKg, ageBand) {
    var T = cat && cat.conditioningLoads; if (!T) return null;
    var sx = sex === 'F' ? 'F' : 'M';
    var pf = cat.age && cat.age.pf && cat.age.pf[ageBand];
    var f = pf && isFinite(pf.force) && pf.force > 0 ? pf.force : 1;
    return {
      thruster: roundLoad(bandKg(T.thruster[sx], weightKg) * f, sx === 'F' ? 15 : 20),
      lunge: roundLoad(bandKg(T.lunge[sx], weightKg) * f, 5),
      factor: f,
    };
  }
  /* Distance à ramer sur un rameur qui surestime de overPct % (Concept2 = référence). */
  function rowerDistanceM(overPct, baseM) {
    var p = isFinite(overPct) && overPct > 0 ? overPct : 0;
    return Math.round((baseM || 2000) * (1 + p / 100));
  }

  /* Temps forfaitaire (s) d'une station du Conditioning non faite : 1,5 × son temps attendu à niveau Référence.
     Même calcul que stationPenaltySec() dans src/lib/cadences/protocols.ts. */
  function stationPenaltySec(test, sex, i) {
    var base = sex === 'F' ? test.female : test.male;
    var share = sex === 'F' && test.partShareF ? test.partShareF : test.partShare;
    if (!share || !base) return null;
    return Math.round(1.5 * share[i] * base.ref);
  }
  /* Stations passées lues dans notes (« stations_passees=3,5 » → [3, 5], à partir de 1). */
  function skippedStations(notes) {
    var m = typeof notes === 'string' ? notes.match(/stations_passees=([0-9,]+)/) : null;
    if (!m) return [];
    var out = [];
    m[1].split(',').forEach(function (x) { var n = parseInt(x, 10); if (isFinite(n) && n >= 1 && out.indexOf(n) === -1) out.push(n); });
    return out;
  }

  window.CadencesFormat = {
    stationPenaltySec: stationPenaltySec,
    skippedStations: skippedStations,
    conditioningLoads: conditioningLoads,
    rowerDistanceM: rowerDistanceM,
    formatRatio: formatRatio,
    formatThreshold: formatThreshold,
    parseDuration: parseDuration,
    formatDuration: formatDuration,
    formatValue: formatValue,
    derivedData: derivedData,
    aggregate: aggregate,
  };
})();
