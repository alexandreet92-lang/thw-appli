/* ════════════════════════════════════════════════════════════════
   THW — Runtime i18n engine + FR/EN/ES switcher.
   ────────────────────────────────────────────────────────────────
   • French is the SOURCE language (what's authored in the components).
   • Translation happens on the rendered DOM, keyed on the French text,
     so it works identically on dev pages AND self-contained bundles,
     with zero edits to the React components.
   • A MutationObserver re-applies after React re-renders.
   • The FR/EN/ES control is injected next to <ThemeToggle/>.

   Dictionary lives in window.THW_I18N_DICT = { en:{...}, es:{...} }
   (loaded from i18n-dict.js before this file).
   ════════════════════════════════════════════════════════════════ */
(function () {
  var KEY = 'thw-lang';
  // Distingue « l'utilisateur a choisi FR » de « personne n'a jamais choisi ».
  // Sans ce drapeau, impossible de savoir si on a le droit d'aligner le site
  // sur la langue du compte : 'fr' par défaut est indiscernable d'un choix.
  var PICKED_KEY = 'thw-lang-picked';
  var DEFAULT = 'fr';
  var LANGS = ['fr', 'en', 'es'];
  var LABEL = { fr: 'FR', en: 'EN', es: 'ES' };

  var DICT = window.THW_I18N_DICT || { en: {}, es: {} };

  // Normalise whitespace for stable keys.
  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  // Pre-build normalised lookup maps (author keys may contain odd spacing).
  // `fr` existe UNIQUEMENT pour le <title> et la meta description : celles-ci
  // sont écrites en ANGLAIS dans la source, parce que c'est ce que Googlebot
  // lit (il ne voit pas la traduction faite au runtime). Le corps des pages,
  // lui, reste rédigé en français et se traduit dans l'autre sens.
  var MAP = { en: {}, es: {}, fr: {} };
  ['en', 'es', 'fr'].forEach(function (lg) {
    var src = DICT[lg] || {};
    for (var k in src) { if (src.hasOwnProperty(k)) MAP[lg][norm(k)] = src[k]; }
  });

  var origText = new WeakMap(); // textNode -> original FR string
  var origAttr = new WeakMap(); // element  -> { attrName: originalFR }
  var current = getLang();
  var observer = null;
  var scheduled = false;

  function getLang() { try { return localStorage.getItem(KEY) || DEFAULT; } catch (e) { return DEFAULT; } }
  function hasPicked() { try { return localStorage.getItem(PICKED_KEY) === '1'; } catch (e) { return false; } }
  // Choix EXPLICITE de l'utilisateur (clic sur le sélecteur) : il gagne sur la
  // langue du compte, et pour toujours sur cet appareil.
  function setLang(l) {
    try { localStorage.setItem(KEY, l); localStorage.setItem(PICKED_KEY, '1'); } catch (e) {}
    apply(l);
  }
  // Alignement AUTOMATIQUE (langue du compte) : on mémorise la langue mais pas
  // le drapeau de choix, pour continuer à suivre le compte s'il change.
  function adoptLang(l) {
    if (LANGS.indexOf(l) < 0 || l === current) return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply(l);
  }

  // ── Text nodes ──────────────────────────────────────────────────
  function skip(node) {
    var p = node.parentNode;
    while (p && p.nodeType === 1) {
      var tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true;
      if (p.id === 'thw-lang-switch') return true;
      if (p.hasAttribute && p.hasAttribute('data-no-i18n')) return true;
      p = p.parentNode;
    }
    return false;
  }

  function translateTextNode(node, lang) {
    var orig = origText.has(node) ? origText.get(node) : node.nodeValue;
    var key = norm(orig);
    if (!key || !/[A-Za-zÀ-ÿ]/.test(key)) return; // ignore pure ws / numbers / symbols
    if (lang === 'fr') { if (origText.has(node)) node.nodeValue = orig; return; }
    var t = MAP[lang] && MAP[lang][key];
    if (t === undefined) return;
    if (!origText.has(node)) origText.set(node, orig);
    var lead = (orig.match(/^\s*/) || [''])[0];
    var trail = (orig.match(/\s*$/) || [''])[0];
    node.nodeValue = lead + t + trail;
  }

  // ── Attributes ──────────────────────────────────────────────────
  var ATTR_SELECTOR = '[placeholder],[aria-label],[title],[alt]';
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

  function translateAttrs(el, lang) {
    if (el.id === 'thw-lang-switch' || el.closest && el.closest('#thw-lang-switch')) return;
    var store = origAttr.get(el);
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var origVal = store && store[a] !== undefined ? store[a] : el.getAttribute(a);
      var key = norm(origVal);
      if (!key) return;
      if (lang === 'fr') { if (store && store[a] !== undefined) el.setAttribute(a, store[a]); return; }
      var t = MAP[lang] && MAP[lang][key];
      if (t === undefined) return;
      if (!store) { store = {}; origAttr.set(el, store); }
      if (store[a] === undefined) store[a] = origVal;
      el.setAttribute(a, t);
    });
  }

  // ── Head (title + meta description) ─────────────────────────────
  var origTitle, origDesc;
  // Contrairement au corps de page, le <head> se traduit AUSSI vers le français
  // (source anglaise, cf. commentaire sur MAP.fr).
  function translateHead(lang) {
    if (origTitle === undefined) origTitle = document.title;
    var tt = MAP[lang] && MAP[lang][norm(origTitle)];
    document.title = tt === undefined ? origTitle : tt;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      if (origDesc === undefined) origDesc = meta.getAttribute('content') || '';
      var td = MAP[lang] && MAP[lang][norm(origDesc)];
      meta.setAttribute('content', td === undefined ? origDesc : td);
    }
  }

  // ── Walk ────────────────────────────────────────────────────────
  function walk(root, lang) {
    if (!root) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return skip(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var batch = [], n;
    while ((n = tw.nextNode())) batch.push(n);
    batch.forEach(function (node) { translateTextNode(node, lang); });

    var els = root.querySelectorAll(ATTR_SELECTOR);
    for (var i = 0; i < els.length; i++) translateAttrs(els[i], lang);
  }

  // ── Switcher ────────────────────────────────────────────────────
  function findThemeToggle() {
    var tagged = document.querySelector('[data-thw-theme]');
    if (tagged) return tagged;
    var groups = document.querySelectorAll('[role="group"]');
    for (var i = 0; i < groups.length; i++) {
      var al = groups[i].getAttribute('aria-label') || '';
      if (/th[eè]me|theme|tema|interfaz|interface/i.test(al)) return groups[i];
    }
    return null;
  }

  function buildSwitcher() {
    var wrap = document.createElement('div');
    wrap.id = 'thw-lang-switch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('data-no-i18n', '1');
    wrap.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:2px', 'padding:3px',
      'border-radius:999px', 'background:var(--bg-card)',
      'border:1px solid var(--border-mid)', 'box-shadow:var(--shadow-card)',
    ].join(';');
    LANGS.forEach(function (lg) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-lang', lg);
      b.textContent = LABEL[lg];
      b.title = lg.toUpperCase();
      b.style.cssText = [
        'border:none', 'cursor:pointer', 'border-radius:999px',
        "font-family:'DM Sans',sans-serif", 'font-size:12px', 'font-weight:600',
        'line-height:1', 'padding:6px 9px', 'transition:color .18s,background .18s,box-shadow .18s',
      ].join(';');
      b.addEventListener('click', function () { setLang(lg); });
      b.addEventListener('mouseenter', function () { if (current !== lg) b.style.color = 'var(--text)'; });
      b.addEventListener('mouseleave', function () { if (current !== lg) b.style.color = 'var(--text-mid)'; });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function paintSwitcher(lang) {
    var sw = document.getElementById('thw-lang-switch');
    if (!sw) return;
    var btns = sw.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-lang') === lang;
      btns[i].style.color = on ? '#fff' : 'var(--text-mid)';
      btns[i].style.background = on ? 'var(--brand-gradient)' : 'transparent';
      btns[i].style.boxShadow = on ? '0 2px 10px rgba(0,200,224,0.30)' : 'none';
    }
  }

  // Time before we give up waiting for a header ThemeToggle and float the
  // switcher instead. Long enough for in-browser Babel to mount the React
  // header (~1–2s), so header pages always get the switcher placed INLINE.
  var FALLBACK_AFTER_MS = 2200;
  var startTime = Date.now();

  function ensureSwitcher() {
    // Le header partagé fournit déjà son propre sélecteur de langue → ne rien injecter.
    if (document.querySelector('[data-thw-lang-select]')) {
      var old = document.getElementById('thw-lang-switch');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var oldHost = document.getElementById('thw-lang-host');
      if (oldHost && oldHost.parentNode) oldHost.parentNode.removeChild(oldHost);
      return;
    }
    var tt = findThemeToggle();
    var sw = document.getElementById('thw-lang-switch');
    if (tt && tt.parentNode) {
      // Place (or move) the switcher inline, immediately before the toggle.
      tt.setAttribute('data-thw-theme', '1');
      if (!sw || sw.nextElementSibling !== tt) {
        if (!sw) sw = buildSwitcher();
        tt.parentNode.insertBefore(sw, tt);
        var host = document.getElementById('thw-lang-host');
        if (host && host.parentNode) host.parentNode.removeChild(host); // drop fallback
        paintSwitcher(current);
      }
      return;
    }
    // No ThemeToggle yet. Keep waiting until the settle window elapses, then
    // float the switcher (for genuine no-header pages: questionnaire, login).
    if (sw) return;
    if (Date.now() - startTime < FALLBACK_AFTER_MS || !document.body) return;
    var fh = document.createElement('div');
    fh.id = 'thw-lang-host';
    fh.setAttribute('data-no-i18n', '1');
    fh.style.cssText = 'position:fixed;top:14px;right:14px;z-index:9999;';
    fh.appendChild(buildSwitcher());
    document.body.appendChild(fh);
    paintSwitcher(current);
  }

  // ── Apply ───────────────────────────────────────────────────────
  // Abonnés au changement de langue (le header React doit repeindre son
  // sélecteur quand la langue est adoptée depuis le compte, pas seulement
  // quand l'utilisateur clique).
  var langListeners = [];
  function onChange(fn) {
    langListeners.push(fn);
    return function () { langListeners = langListeners.filter(function (f) { return f !== fn; }); };
  }

  function apply(lang) {
    var changed = current !== lang;
    current = lang;
    document.documentElement.setAttribute('lang', lang);
    if (observer) observer.disconnect();
    try {
      ensureSwitcher();
      walk(document.body, lang);
      translateHead(lang);
      paintSwitcher(lang);
    } finally {
      if (observer && document.body) {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    }
    if (changed) {
      for (var i = 0; i < langListeners.length; i++) {
        try { langListeners[i](lang); } catch (e) { /* un abonné cassé n'en bloque pas d'autres */ }
      }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; apply(current); });
  }

  function boot() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', boot); return; }
    observer = new MutationObserver(schedule);
    apply(current);
    // React content mounts asynchronously (Babel transform) — re-apply a few times.
    var tries = 0;
    var iv = setInterval(function () { apply(current); if (++tries >= 14) clearInterval(iv); }, 350);
  }

  /* ── Langue du compte ──────────────────────────────────────────────
     Si la personne est connectée, le site adopte la langue réglée dans
     l'app (profiles.language, renvoyée par /api/account/summary) — sauf
     si elle a explicitement choisi une langue sur le site, auquel dernier
     cas son choix prime. THWAccount mutualise la requête : aucun appel
     réseau supplémentaire n'est déclenché ici. */
  function syncWithAccount() {
    if (hasPicked()) return;
    var acc = window.THWAccount && window.THWAccount.get
      ? window.THWAccount.get()
      : fetch('/api/account/summary', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { return j && j.loggedIn ? j : null; });
    Promise.resolve(acc)
      .then(function (a) { if (a && a.language && !hasPicked()) adoptLang(a.language); })
      .catch(function () { /* hors ligne / non connecté : on garde la langue locale */ });
  }

  window.THWLang = { getLang: getLang, setLang: setLang, apply: apply, onChange: onChange, langs: LANGS };
  boot();
  syncWithAccount();
})();
