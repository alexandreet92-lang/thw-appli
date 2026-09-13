/* ════════════════════════════════════════════════════════════════
   THW — Session et compte du site vitrine.
   ────────────────────────────────────────────────────────────────
   Fichier JS SIMPLE (pas de JSX) chargé AVANT tout le reste : le moteur
   i18n en a besoin pour connaître la langue du compte, or les composants
   sont transformés par Babel et s'exécutent trop tard pour ça.
   ════════════════════════════════════════════════════════════════ */
/* Auto-connexion : l'app ouvre le site avec un fragment #s=<jetons>. On établit
   la session (cookies) une seule fois, on nettoie l'URL, et on expose une
   promesse que les pages attendent avant de charger les données du compte. */
window.__thwSessionReady = (function () {
  try {
    var h = window.location.hash || '';
    var m = h.match(/(?:^#|[#&])s=([^&]+)/);
    if (!m) return Promise.resolve(false);
    var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var blob = JSON.parse(decodeURIComponent(escape(atob(b64))));
    // Nettoie le fragment tout de suite (jetons hors de l'URL visible).
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    if (!blob || !blob.at || !blob.rt) return Promise.resolve(false);
    return fetch('/api/auth/site-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ access_token: blob.at, refresh_token: blob.rt }),
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  } catch (e) { return Promise.resolve(false); }
})();

/* ════════════════════════════════════════════════════════════════
   Compte partagé — UN SEUL appel /api/account/summary par page.
   ────────────────────────────────────────────────────────────────
   Avant, chaque composant qui avait besoin du compte faisait son propre
   fetch : sur recharge-tokens.html il y en avait TROIS en parallèle
   (header + section chat + section Studio), sur compte.html trois aussi
   (header + résumé + détails d'abonnement). Or le jeton d'accès Supabase
   expire au bout d'une heure et son rafraîchissement FAIT TOURNER le
   refresh token : trois rafraîchissements simultanés se marchent dessus,
   le dernier cookie écrit peut être périmé → l'utilisateur est déconnecté
   « au hasard » en changeant de page. On sérialise donc tout par une seule
   promesse partagée.

   En plus, on garde le dernier compte connu dans sessionStorage : la
   navigation d'une page à l'autre n'affiche plus « Se connecter » le temps
   du fetch, et un incident réseau ponctuel ne fait plus croire à une
   déconnexion. ════════════════════════════════════════════════════════ */
window.THWAccount = (function () {
  var CACHE_KEY = 'thw-account-cache';
  var inflight = null;
  var memo = null;

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      // 10 min : assez pour couvrir une session de navigation, assez court
      // pour qu'une déconnexion réelle finisse par se voir.
      if (!o || !o.t || Date.now() - o.t > 600000) return null;
      return o.a || null;
    } catch (e) { return null; }
  }
  function writeCache(a) {
    try {
      if (a) sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), a: a }));
      else sessionStorage.removeItem(CACHE_KEY);
    } catch (e) { /* mode privé : on s'en passe */ }
  }

  /* Compte connu tout de suite (cache), sans attendre le réseau. */
  function cached() { return memo || readCache(); }

  /* Récupère le compte. UNE seule requête réseau, quel que soit le nombre
     d'appelants. Renvoie null si non connecté. */
  function get() {
    if (inflight) return inflight;
    inflight = (window.__thwSessionReady || Promise.resolve())
      .catch(function () { return false; })
      .then(function () { return fetch('/api/account/summary', { credentials: 'same-origin' }); })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.loggedIn) { memo = j; writeCache(j); return j; }
        // Réponse explicite « non connecté » → on purge le cache.
        if (j && j.loggedIn === false) { memo = null; writeCache(null); return null; }
        return cached();
      })
      .catch(function () {
        // Incident réseau : on ne déconnecte PAS, on retombe sur le cache.
        return cached();
      });
    return inflight;
  }

  /* Force une relecture (après connexion / déconnexion). */
  function refresh() { inflight = null; memo = null; writeCache(null); return get(); }

  /* Hook React : rend d'abord le compte en cache, puis la valeur fraîche. */
  function useAccount() {
    var init = cached();
    var st = React.useState(init);
    React.useEffect(function () {
      var alive = true;
      get().then(function (a) { if (alive) st[1](a); });
      return function () { alive = false; };
    }, []);
    return st[0];
  }

  return { get: get, refresh: refresh, cached: cached, useAccount: useAccount };
})();
