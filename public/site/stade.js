/* ════════════════════════════════════════════════════════════════
   THW — couche « stade » (comportements partagés du site vitrine).
   Chargé dans le <head> (sans defer) : il doit couvrir la page qui arrive
   sous le rideau AVANT le premier paint. Tout le reste est délégué au
   document, donc fonctionne aussi sur les éléments rendus plus tard par
   React (aimants, cartes inclinables, apparitions, compteurs, sceaux).
     .mag            bouton aimanté (suit légèrement le curseur)
     .tilt           carte inclinée en 3D + reflet (--cx / --cy)
     [data-spot]     halo qui suit le curseur (--mx / --my)
     .st-reveal      apparaît en montant quand il entre dans l'écran
     .st-rise        ses enfants se lèvent un par un (--i)
     .st-stamp       sceau qui « frappe » à l'entrée dans l'écran
     [data-count]    compteur qui monte jusqu'à sa valeur
   ════════════════════════════════════════════════════════════════ */
(function () {
  var RM = false;
  try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var FINE = false;
  try { FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  var KEY = 'thw-curtain';
  var root = document.documentElement;

  // 1 — Page qui arrive sous le rideau : couverte immédiatement.
  var arriving = false;
  try { arriving = !RM && sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (arriving) root.classList.add('thw-cur-pre');

  function curtainEl() {
    var c = document.getElementById('thw-curtain');
    if (!c) {
      c = document.createElement('div');
      c.id = 'thw-curtain';
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-no-i18n', '1');
      c.innerHTML = '<span>THW<i>.</i></span>';
      document.body.appendChild(c);
    }
    return c;
  }
  function anim(el, frames, opts) {
    if (!el.animate) { return { onfinish: null, finished: Promise.resolve() }; }
    return el.animate(frames, opts);
  }

  // Rideau sortant : la page est rendue (React a monté) → on découvre.
  function uncover() {
    var c = curtainEl();
    c.style.transform = 'scaleX(1)';
    c.style.transformOrigin = 'right';
    root.classList.remove('thw-cur-pre');
    var a = anim(c, [{ transform: 'scaleX(1)', transformOrigin: 'right' }, { transform: 'scaleX(0)', transformOrigin: 'right' }],
      { duration: 520, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    var done = function () { c.style.transform = 'scaleX(0)'; };
    if (a && a.finished) a.finished.then(done, done); else done();
  }
  function whenRendered(cb) {
    var t0 = Date.now();
    (function wait() {
      var r = document.getElementById('root');
      if ((r && r.children.length) || !r || Date.now() - t0 > 1400) { setTimeout(cb, 60); return; }
      requestAnimationFrame(wait);
    })();
  }

  // Rideau entrant : clic sur un lien vers une autre page du site.
  function sameSitePage(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    if (!/\.html$/i.test(u.pathname) && u.pathname.indexOf('/site') !== 0) return false;
    // Même page, seule l'ancre change : pas de rideau.
    if (u.pathname === location.pathname && u.search === location.search) return false;
    return u.href;
  }
  document.addEventListener('click', function (e) {
    if (RM || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    var to = sameSitePage(a);
    if (!to) return;
    e.preventDefault();
    try { sessionStorage.setItem(KEY, '1'); } catch (err) {}
    var c = curtainEl();
    var go = function () { location.href = to; };
    var an = anim(c, [{ transform: 'scaleX(0)', transformOrigin: 'left' }, { transform: 'scaleX(1)', transformOrigin: 'left' }],
      { duration: 420, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    if (an && an.finished) an.finished.then(go, go); else go();
    setTimeout(go, 900); // filet de sécurité
  });
  // Retour arrière depuis le cache : ne jamais laisser la page couverte.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { var c = document.getElementById('thw-curtain'); if (c) c.style.transform = 'scaleX(0)'; root.classList.remove('thw-cur-pre'); }
  });

  // 2 — Barre de progression.
  function prog() {
    var p = document.getElementById('thw-prog');
    if (!p) {
      p = document.createElement('div'); p.id = 'thw-prog'; p.setAttribute('aria-hidden', 'true');
      p.innerHTML = '<i class="fill"></i><b class="run"></b>';
      document.body.appendChild(p);
    }
    var h = document.documentElement;
    var v = Math.min(1, Math.max(0, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    p.firstChild.style.transform = 'scaleX(' + v + ')';
    // Le petit coureur avance en tête de la barre.
    p.lastChild.style.left = (v * 100) + '%';
    p.classList.toggle('on', v > 0.002 && v < 0.998);
  }

  // 3 — Aimants, cartes inclinables, halo (délégués).
  var magEl = null, tiltEl = null;
  function onMove(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var spot = t.closest('[data-spot]');
    if (spot) {
      var rs = spot.getBoundingClientRect();
      spot.style.setProperty('--mx', (e.clientX - rs.left) + 'px');
      spot.style.setProperty('--my', (e.clientY - rs.top) + 'px');
    }
    if (RM || !FINE) return;
    var m = t.closest('.mag');
    if (magEl && magEl !== m) { magEl.style.transform = ''; magEl = null; }
    if (m) {
      var r = m.getBoundingClientRect();
      m.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px)';
      magEl = m;
    }
    var c = t.closest('.tilt');
    if (tiltEl && tiltEl !== c) { tiltEl.style.transform = ''; tiltEl = null; }
    if (c) {
      var rc = c.getBoundingClientRect();
      var x = (e.clientX - rc.left) / rc.width, y = (e.clientY - rc.top) / rc.height;
      var k = c.getAttribute('data-tilt') ? parseFloat(c.getAttribute('data-tilt')) : 8;
      c.style.transform = 'perspective(900px) rotateY(' + ((x - 0.5) * k).toFixed(2) + 'deg) rotateX(' + ((0.5 - y) * k).toFixed(2) + 'deg) translateY(-4px)';
      c.style.setProperty('--cx', (x * 100).toFixed(1) + '%');
      c.style.setProperty('--cy', (y * 100).toFixed(1) + '%');
      tiltEl = c;
    }
  }
  function onLeave() {
    if (magEl) { magEl.style.transform = ''; magEl = null; }
    if (tiltEl) { tiltEl.style.transform = ''; tiltEl = null; }
  }

  // 4 — Apparitions, titres, sceaux, compteurs (IntersectionObserver).
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count'));
    if (isNaN(to)) return;
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var fmt = function (v) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); };
    if (RM) { el.textContent = fmt(to); return; }
    var t0 = performance.now(), dur = 1300;
    (function f(t) {
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  var io = null;
  var SEL = '.st-reveal,.st-rise,.st-stamp,.st-coverline,[data-count],[data-inview]';
  function show(el) {
    if (el.__stDone) return;
    el.__stDone = true;
    el.classList.add('st-in');
    if (el.hasAttribute('data-count')) countUp(el);
    el.querySelectorAll && Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), function (n) { if (!n.__stDone) { n.__stDone = true; countUp(n); } });
  }
  function watch(scope) {
    var list = (scope || document).querySelectorAll ? (scope || document).querySelectorAll(SEL) : [];
    Array.prototype.forEach.call(list, function (el) {
      if (el.__stWatched) return;
      el.__stWatched = true;
      if (el.hasAttribute('data-count') && !RM) el.textContent = '0';
      if (io) io.observe(el); else show(el);
    });
  }
  function boot() {
    curtainEl();
    prog();
    window.addEventListener('scroll', prog, { passive: true });
    window.addEventListener('resize', prog);
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('scroll', onLeave, { passive: true });
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); show(en.target); } });
      }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    }
    watch(document);
    // React rend après coup : on surveille les nouveaux éléments.
    if ('MutationObserver' in window) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; watch(document); prog(); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    // Filet de sécurité : rien ne reste invisible.
    setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll('.st-reveal,.st-rise,.st-stamp,.st-coverline'), function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) show(el); }); }, 2200);
    if (arriving) whenRendered(uncover);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.THWStade = { reducedMotion: RM, watch: watch };
})();
