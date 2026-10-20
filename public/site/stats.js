/* Mesure d'audience anonyme du site THW. Sans cookie, sans identifiant persistant :
   un identifiant de session (sessionStorage) détruit à la fermeture de l'onglet.
   Envoie à /api/t. Ignoré : localhost, Do Not Track, appareil marqué "ne pas me compter". */
(function () {
  'use strict';
  if (window.thwTrack) return;
  var off = false;
  try { off = localStorage.getItem('thw_no_track') === '1'; } catch (e) {}
  if (off || navigator.doNotTrack === '1' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) { window.thwTrack = function () {}; return; }

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  var sid = ss('thw_sid');
  if (!sid) { sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); ss('thw_sid', sid); }

  // Provenance : figée à la première page de la session.
  var lp = null;
  try { lp = JSON.parse(ss('thw_lp') || 'null'); } catch (e) {}
  if (!lp) {
    var q = new URLSearchParams(location.search), refHost = '';
    try { refHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    if (refHost && /(^|\.)the-hybridway\.com$|thw-appli/.test(refHost)) refHost = '';
    lp = { r: refHost, u: q.get('utm_source') || '', c: q.get('utm_campaign') || '', q: /\/defi/.test(location.pathname) ? (q.get('s') || '') : '' };
    ss('thw_lp', JSON.stringify(lp));
  }

  function lang() { try { return localStorage.getItem('thw-lang') || document.documentElement.lang || ''; } catch (e) { return ''; } }
  function send(e, x) {
    var body = JSON.stringify({ e: e, sid: sid, p: location.pathname, r: lp.r, u: lp.u, c: lp.c, q: lp.q, l: lang(), x: x || {} });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/t', new Blob([body], { type: 'text/plain' }))) return;
    } catch (err) {}
    try { fetch('/api/t', { method: 'POST', body: body, keepalive: true, headers: { 'content-type': 'text/plain' } }); } catch (err) {}
  }
  window.thwTrack = send;

  var t0 = Date.now(), left = false;
  send('pageview');
  function leave() { if (left) return; left = true; send('leave', { ms: Math.min(Date.now() - t0, 1800000) }); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); else if (left) { left = false; t0 = Date.now(); } });
  window.addEventListener('pagehide', leave);

  // Clics vers l'inscription / connexion / l'application / les plans.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^\/?auth|\/auth\?|thw-appli\.vercel\.app|login\.html|[?&]signup/i.test(h)) send('cta', { t: 'signup' });
    else if (/abonnement|theme\.html#abonnements|recharge-tokens/i.test(h)) send('cta', { t: 'plans' });
  }, true);
})();
