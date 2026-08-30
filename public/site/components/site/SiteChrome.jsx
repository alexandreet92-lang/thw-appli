/* ════════════════════════════════════════════════════════════════
   THW — Chrome partagé du site : SiteHeader + SiteFooter.
   Réutilise <ThwLogo>, <ThemeToggle>, <UIIcon>.
   Liens app non connectés pour ce livrable → APP_URL.
   ════════════════════════════════════════════════════════════════ */
var APP_URL = 'https://thw-appli.vercel.app';

/* Menu déroulant partagé — toutes les pages du site, visible depuis chacune d'elles. */
var MENU_ITEMS = [
  { label: 'Accueil',                     href: 'index.html' },
  { label: 'Découvrir les piliers',        href: 'decouvrir.html' },
  { label: 'Abonnement athlète',          href: 'abonnement-athlete.html', group: 'shop' },
  { label: 'Abonnement coach',            href: 'abonnement-coach.html', group: 'shop' },
  { label: 'Recharge de tokens',          href: 'recharge-tokens.html', group: 'shop' },
  { label: 'Devenir coach',               href: 'theme.html#espace-coach', group: 'shop' },
  { label: 'Politique de confidentialité', href: 'confidentialite.html', group: 'legal' },
  { label: 'Mentions légales',            href: 'mentions-legales.html', group: 'legal' },
  { label: "Conditions d'utilisation",     href: 'conditions-utilisation.html', group: 'legal' },
  { label: 'Exporter mes données',        href: 'exporter-mes-donnees.html', group: 'legal' },
];

/* Dropdown « Menu » pour le header partagé (desktop).
   Toujours monté : l'ouverture est une vraie animation de déroulé. */
function HeaderMenu() {
  var [open, setOpen] = React.useState(false);
  var ref = React.useRef(null);
  React.useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="header-link" onClick={function () { setOpen(function (o) { return !o; }); }}
              aria-haspopup="true" aria-expanded={open}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
                       font: 'inherit', background: open ? 'var(--bg-hover)' : 'transparent',
                       color: open ? 'var(--text)' : undefined }}>
        Menu
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
             style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .24s cubic-bezier(.22,1,.36,1)' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div role="menu" aria-hidden={!open} className={'dd-panel' + (open ? ' dd-open' : '')} style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 250, zIndex: 200,
        background: 'var(--nav-bg)', border: '1px solid var(--border-mid)', borderRadius: 14,
        padding: 6, boxShadow: 'var(--shadow)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>
        {MENU_ITEMS.map(function (m, i) {
          var divider = m.group && (i === 0 || MENU_ITEMS[i - 1].group !== m.group);
          return (
            <React.Fragment key={m.href}>
              {divider && <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }}/>}
              <a role="menuitem" href={m.href} tabIndex={open ? 0 : -1} className="dd-item" style={{
                display: 'block', padding: '10px 12px', borderRadius: 9,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
                color: 'var(--text-mid)', textDecoration: 'none', transition: 'background .14s, color .14s',
              }}
              onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--brand)'; }}
              onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-mid)'; }}>
                {m.label}
              </a>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* Sélecteur de langue — menu déroulant animé, partagé par les pages traduites. */
function LangSelect(props) {
  var LANGS = [['fr', 'Français', 'FR'], ['en', 'English', 'EN'], ['es', 'Español', 'ES']];
  var lang = props.lang || 'fr';
  var setLang = props.setLang || function () {};
  var [open, setOpen] = React.useState(false);
  var ref = React.useRef(null);
  React.useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  var current = LANGS.filter(function (l) { return l[0] === lang; })[0] || LANGS[0];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={function () { setOpen(function (o) { return !o; }); }}
        aria-haspopup="listbox" aria-expanded={open} aria-label="Langue"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          padding: '8px 12px', borderRadius: 999, background: 'var(--bg-card)',
          border: '1px solid var(--border-mid)', boxShadow: 'var(--shadow-card)',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 600, letterSpacing: '0.02em',
          color: open ? 'var(--text)' : 'var(--text-mid)', transition: 'color .16s' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/>
        </svg>
        {current[2]}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .24s cubic-bezier(.22,1,.36,1)' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div role="listbox" aria-hidden={!open} className={'dd-panel' + (open ? ' dd-open' : '')} style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 152, zIndex: 200,
        background: 'var(--nav-bg)', border: '1px solid var(--border-mid)', borderRadius: 12,
        padding: 5, boxShadow: 'var(--shadow)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>
        {LANGS.map(function (l) {
          var on = l[0] === lang;
          return (
            <button key={l[0]} type="button" role="option" aria-selected={on} tabIndex={open ? 0 : -1}
              onClick={function () { setLang(l[0]); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%',
                padding: '9px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: on ? 'var(--bg-hover)' : 'transparent',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: on ? 600 : 500,
                color: on ? 'var(--brand)' : 'var(--text-mid)', transition: 'background .14s, color .14s' }}
              onMouseEnter={function (e) { if (!on) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={function (e) { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-mid)'; } }}>
              {l[1]}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: .7 }}>{l[2]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* #rrggbb → "r,g,b" for rgba() with the active accent. Shared. */
function hexToRgb(hex) {
  var c = (hex || '#00c8e0').replace('#', '');
  if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
  return parseInt(c.slice(0, 2), 16) + ',' + parseInt(c.slice(2, 4), 16) + ',' + parseInt(c.slice(4, 6), 16);
}

function SiteHeader(props) {
  var active = props && props.active; // 'home' | 'discover' | 'plans' | 'login'
  var [open, setOpen] = React.useState(false);
  /* Langue : par défaut le header pilote le moteur i18n global (window.THWLang).
     Les pages qui traduisent elles-mêmes passent leur propre sélecteur via `extra`. */
  var [lang, setLangState] = React.useState(function () {
    return (window.THWLang && window.THWLang.getLang && window.THWLang.getLang()) || 'fr';
  });
  var setLang = function (l) {
    setLangState(l);
    if (window.THWLang && window.THWLang.setLang) window.THWLang.setLang(l);
  };
  // Compte réel : si l'utilisateur est connecté à l'app (session en cookie, même
  // domaine), on récupère son nom + abonnement pour l'afficher en haut à droite.
  var [account, setAccount] = React.useState(null);
  React.useEffect(function () {
    fetch('/api/account/summary', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.loggedIn) setAccount(j); })
      .catch(function () {});
  }, []);
  var navLinks = [
    { label: 'Accueil', href: 'index.html', key: 'home' },
    { label: 'Découvrir', href: 'decouvrir.html', key: 'discover' },
    { label: 'Plans', href: 'theme.html#abonnements', key: 'plans' },
    { label: 'Connexion', href: 'compte.html', key: 'login' },
  ];
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-lockup" href="index.html" aria-label="THW Coaching — accueil">
          <ThwLogo size={34} radius={9}/>
          <span className="brand-word">THW<span>.</span></span>
        </a>

        <nav className="header-nav">
          {navLinks.map(function (l) {
            return (
              <a key={l.key} className="header-link" href={l.href}
                 style={l.key === active ? { color: 'var(--text)', background: 'var(--bg-hover)' } : null}>
                {l.label}
              </a>
            );
          })}
          <HeaderMenu/>
        </nav>

        <div className="header-right">
          {props && props.extra ? props.extra
            : <div data-thw-lang-select="1" data-no-i18n="1"><LangSelect lang={lang} setLang={setLang}/></div>}
          <ThemeToggle/>
          <a className="btn btn-cyan" href="compte.html" title={account ? (account.email || '') : ''}>
            <UIIcon name="user" size={15}/>
            <span className="header-cta-label">
              {account
                ? ((account.firstName || 'Mon compte') + (account.tierLabel ? ' · ' + account.tierLabel : ''))
                : 'Se connecter'}
            </span>
          </a>
          <button type="button" className="btn btn-ghost header-burger"
                  aria-label="Menu" onClick={function () { setOpen(!open); }}
                  style={{ padding: 9, display: 'none' }}>
            <UIIcon name={open ? 'close' : 'menu'} size={18}/>
          </button>
        </div>
      </div>

      <div className={'header-mobile-menu' + (open ? ' hmm-open' : '')} aria-hidden={!open}>
        <div className="hmm-inner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 22px 16px' }}>
            {navLinks.map(function (l) {
              return <a key={l.key} className="header-link" href={l.href} tabIndex={open ? 0 : -1} style={{ padding: '12px 6px', fontSize: 15 }}>{l.label}</a>;
            })}
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 6px' }}/>
            {MENU_ITEMS.map(function (m) {
              return <a key={m.href} className="header-link" href={m.href} tabIndex={open ? 0 : -1} style={{ padding: '12px 6px', fontSize: 15 }}>{m.label}</a>;
            })}
          </div>
        </div>
      </div>

      <style>{`
        /* Tout menu déroulant s'ouvre par un vrai mouvement de déroulé. */
        .dd-panel {
          transform-origin: top right;
          opacity: 0; visibility: hidden;
          transform: translateY(-8px) scaleY(.92);
          transition: opacity .2s ease, transform .26s cubic-bezier(.22,1,.36,1), visibility .26s;
        }
        .dd-panel.dd-open { opacity: 1; visibility: visible; transform: none; }
        .dd-panel > * { opacity: 0; transform: translateY(-4px); transition: opacity .2s ease .04s, transform .24s cubic-bezier(.22,1,.36,1) .04s; }
        .dd-panel.dd-open > * { opacity: 1; transform: none; }
        /* Pas de piste fr ici : dans WebKit, une piste fr dans une grille à hauteur
           indéfinie se résout à 0 et le menu ne s'ouvre jamais. On anime max-height,
           en gardant le padding sur l'enfant pour que l'état fermé soit à 0. */
        .header-mobile-menu {
          overflow: hidden; max-height: 0; opacity: 0;
          border-top: 0 solid transparent;
          transition: max-height .32s cubic-bezier(.22,1,.36,1), opacity .22s ease, border-top-color .3s ease;
        }
        .header-mobile-menu > .hmm-inner { padding: 0; }
        .header-mobile-menu.hmm-open { max-height: 720px; opacity: 1; border-top-width: 1px; border-top-color: var(--border); }
        @media (prefers-reduced-motion: reduce) { .dd-panel, .dd-panel > *, .header-mobile-menu { transition: none !important; } }
        @media (max-width: 820px) {
          .header-burger { display: inline-flex !important; }
        }
        @media (min-width: 1001px) { .header-mobile-menu { display: none !important; } }
      `}</style>
    </header>
  );
}

function FooterSocial(props) {
  var paths = {
    instagram: <React.Fragment><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/></React.Fragment>,
    x: <path d="M4 4l16 16M20 4L4 20"/>,
    youtube: <React.Fragment><rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M11 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none"/></React.Fragment>,
    strava: <path d="M9 14l3-7 3 7h-2l-1-2.2L11 14zm5 0l1.5 3 1.5-3h-1.2l-.3.7-.3-.7z" fill="currentColor" stroke="none"/>,
  };
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[props.name]}
    </svg>
  );
}

function SiteFooter() {
  var year = new Date().getFullYear();
  var col = function (title, links) {
    return (
      <div className="footer-col">
        <h4>{title}</h4>
        {links.map(function (l, i) { return <a key={i} href={l[1]}>{l[0]}</a>; })}
      </div>
    );
  };
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand-lockup" href="index.html" aria-label="THW Coaching">
              <ThwLogo size={36} radius={9}/>
              <span className="brand-word">THW<span>.</span></span>
            </a>
            <p>Ton entraînement hybride — endurance + force — piloté par une IA qui te connaît.</p>
          </div>
          {col('Découvrir', [['Tous les piliers', 'decouvrir.html'], ['Coach IA', 'theme.html#coach-ia'], ['Performances', 'theme.html#performances'], ['Compétences', 'theme.html#competences']])}
          {col('Produit', [['Plans & tarifs', 'theme.html#abonnements'], ['Abonnement coach', 'abonnement-coach.html'], ['Système de tokens', 'theme.html#tokens'], ['Connexion', APP_URL], ['Essai gratuit', APP_URL]])}
          {col('Support & légal', [['Mentions légales', 'mentions-legales.html'], ['Conditions d\'utilisation', 'conditions-utilisation.html'], ['Confidentialité', 'confidentialite.html'], ['Exporter mes données', 'exporter-mes-donnees.html']])}
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© {year} THW Coaching — The Hybrid Way. Tous droits réservés.</span>
          <div className="footer-social">
            <a href="#" aria-label="Instagram"><FooterSocial name="instagram"/></a>
            <a href="#" aria-label="X"><FooterSocial name="x"/></a>
            <a href="#" aria-label="YouTube"><FooterSocial name="youtube"/></a>
            <a href="#" aria-label="Strava"><FooterSocial name="strava"/></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Scroll-reveal helper — adds .in to .reveal elements as they enter view. */
function useReveal() {
  React.useEffect(function () {
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    var show = function (e) { e.classList.add('in'); };

    // 1 — reveal anything already in/near the viewport on first paint,
    //     so the page is never blank if the observer is flaky.
    var revealVisible = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function (e) {
        if (e.classList.contains('in')) return;
        var r = e.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) show(e);
      });
    };
    revealVisible();

    if (!('IntersectionObserver' in window)) {
      els.forEach(show);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { if (!e.classList.contains('in')) io.observe(e); });

    // 2 — reveal on scroll/resize as a belt-and-braces fallback.
    window.addEventListener('scroll', revealVisible, { passive: true });
    window.addEventListener('resize', revealVisible);
    // 3 — final safety net: never leave content hidden.
    var t = setTimeout(function () { els.forEach(show); }, 1600);

    return function () {
      io.disconnect();
      clearTimeout(t);
      window.removeEventListener('scroll', revealVisible);
      window.removeEventListener('resize', revealVisible);
    };
  }, []);
}

Object.assign(window, { SiteHeader: SiteHeader, SiteFooter: SiteFooter, useReveal: useReveal, APP_URL: APP_URL, hexToRgb: hexToRgb });
