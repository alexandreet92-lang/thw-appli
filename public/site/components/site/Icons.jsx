/* ════════════════════════════════════════════════════════════════
   THW — Icônes de thèmes (stroke, style Lucide). On-brand, pas d'emoji.
   <ThemeIcon name="coach" size={24} />   |   <UIIcon name="arrow" />
   ════════════════════════════════════════════════════════════════ */
(function () {
  function svg(children, extra) {
    return function (props) {
      var size = (props && props.size) || 24;
      return React.createElement('svg', Object.assign({
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, extra || {}), children.map(function (c, i) { return React.createElement(c[0], Object.assign({ key: i }, c[1])); }));
    };
  }
  var P = function (d, o) { return ['path', Object.assign({ d: d }, o || {})]; };
  var C = function (cx, cy, r, o) { return ['circle', Object.assign({ cx: cx, cy: cy, r: r }, o || {})]; };
  var L = function (x1, y1, x2, y2) { return ['line', { x1: x1, y1: y1, x2: x2, y2: y2 }]; };
  var R = function (x, y, w, h, rx) { return ['rect', { x: x, y: y, width: w, height: h, rx: rx }]; };

  var ICONS = {
    // 1 — Coach IA : bulle de chat + étincelle
    coach: svg([P('M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z'), P('M12.5 8l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z')]),
    // 2 — Compétences : cible
    target: svg([C(12, 12, 9), C(12, 12, 5), C(12, 12, 1.4, { fill: 'currentColor', stroke: 'none' })]),
    // 3 — Actions rapides : éclair
    bolt: svg([P('M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12z', { fill: 'currentColor', stroke: 'none', opacity: 0.18 }), P('M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12z')]),
    // 4 — Performances : barres + ligne
    chart: svg([L(4, 20, 20, 20), R(6, 12, 3, 6, 1), R(11, 8, 3, 10, 1), R(16, 5, 3, 13, 1)]),
    // 5 — Planification : calendrier + check
    plan: svg([R(3, 5, 18, 16, 2.5), L(3, 9.5, 21, 9.5), L(8, 3, 8, 6), L(16, 3, 16, 6), P('M8.5 15l2 2 4-4')]),
    // 6 — Calendrier : roue annuelle
    calendar: svg([C(12, 12, 9), C(12, 12, 3.2), L(12, 3, 12, 5.6), L(12, 18.4, 12, 21), L(3, 12, 5.6, 12), L(18.4, 12, 21, 12)]),
    // 7 — Récupération : cœur + pouls
    recovery: svg([P('M20.8 8.6c0 4.5-7.3 9.1-8.8 10-1.5-.9-8.8-5.5-8.8-10A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 8.8 2.1z'), P('M3.6 12.5h3l1.4-3 2.2 5 1.8-3.4 1.1 1.4h3.7')]),
    // 8 — Nutrition : pomme/feuille
    nutrition: svg([P('M12 7c-1.6-2.4-5-2.6-6.7-.6C3 9 4 14.5 7 18c1.3 1.5 2.8 2.2 4 1.4'), P('M12 7c1.6-2.4 5-2.6 6.7-.6 2 2.3 1.4 7.7-1.6 11.2-1.3 1.5-3.1 2.2-4.1 1.2'), P('M12 7c0-1.6.6-3 2-3.8')]),
    // 9 — Connexions : prise
    plug: svg([P('M9 2v6'), P('M15 2v6'), P('M7 8h10v3a5 5 0 0 1-10 0z'), P('M12 16v6')]),
    // 10 — Profil : utilisateur
    user: svg([C(12, 8, 4), P('M5 20a7 7 0 0 1 14 0')]),
    // 11 — Tokens : pièce
    token: svg([C(12, 12, 9), P('M9.5 9.5h3.2a2 2 0 0 1 0 4H9.5v-4zm0 4v3'), L(9.5, 11.5, 13.5, 11.5)]),
    // 12 — Abonnements : carte
    card: svg([R(2.5, 5, 19, 14, 3), L(2.5, 9.5, 21.5, 9.5), L(6, 14.5, 9, 14.5)]),
    // 13 — Notifications : cloche
    bell: svg([P('M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z'), P('M10.3 20a2 2 0 0 0 3.4 0')]),
    // 14 — Personnalisation : palette
    palette: svg([P('M12 3a9 9 0 0 0 0 18c1.7 0 2-1.3 1.2-2.2-.8-1 .1-2.3 1.3-2.3H17a4 4 0 0 0 4-4c0-5-4-9-9-9z'), C(7.5, 11, 1, { fill: 'currentColor', stroke: 'none' }), C(11, 7.5, 1, { fill: 'currentColor', stroke: 'none' }), C(15.5, 8.5, 1, { fill: 'currentColor', stroke: 'none' })]),
    // 15 — Enregistrement : point d'enregistrement
    record: svg([C(12, 12, 9), C(12, 12, 3.6, { fill: 'currentColor', stroke: 'none' })]),
    // 16 — Sécurité : bouclier + cadenas
    shield: svg([P('M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z'), R(9.5, 11, 5, 4, 1), P('M10.5 11v-1.5a1.5 1.5 0 0 1 3 0V11')]),
  };

  var UI = {
    arrow: svg([L(5, 12, 19, 12), P('M13 6l6 6-6 6')]),
    arrowSm: svg([P('M7 17 17 7'), P('M9 7h8v8')]),
    check: svg([P('M5 12.5 10 17.5 19.5 7')]),
    spark: svg([P('M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z', { fill: 'currentColor', stroke: 'none' })]),
    menu: svg([L(4, 7, 20, 7), L(4, 12, 20, 12), L(4, 17, 20, 17)]),
    close: svg([L(6, 6, 18, 18), L(18, 6, 6, 18)]),
    grid: svg([R(4, 4, 7, 7, 1.5), R(13, 4, 7, 7, 1.5), R(4, 13, 7, 7, 1.5), R(13, 13, 7, 7, 1.5)]),
    play: svg([P('M7 5l11 7-11 7z', { fill: 'currentColor', stroke: 'none' })]),
  };

  function ThemeIcon(props) {
    var Comp = ICONS[props.name] || ICONS.coach;
    return React.createElement(Comp, { size: props.size });
  }
  function UIIcon(props) {
    var Comp = UI[props.name] || UI.arrow;
    return React.createElement(Comp, { size: props.size });
  }
  window.ThemeIcon = ThemeIcon;
  window.UIIcon = UIIcon;
})();
