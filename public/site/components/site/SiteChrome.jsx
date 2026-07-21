/* ════════════════════════════════════════════════════════════════
   THW — Chrome partagé du site : SiteHeader + SiteFooter.
   Réutilise <ThwLogo>, <ThemeToggle>, <UIIcon>.
   Liens app non connectés pour ce livrable → APP_URL.
   ════════════════════════════════════════════════════════════════ */
var APP_URL = 'https://thw-appli.vercel.app';
var LOGIN_URL = APP_URL + '/auth';

/* Si une page fournit une surpage de connexion locale (ex. page tokens), le clic
   « Connexion » l'ouvre au lieu de partir vers l'app. Sinon → /auth normal. */
function thwMaybeLogin(e) {
  if (typeof window.THW_LOGIN === 'function') { e.preventDefault(); window.THW_LOGIN(); }
}

/* Menu déroulant partagé — présent sur la page principale et sur chaque page listée. */
var MENU_ITEMS = [
  { label: 'Politique de confidentialité', href: 'confidentialite.html' },
  { label: 'Mentions légales',            href: 'mentions-legales.html' },
  { label: "Conditions d'utilisation",     href: 'conditions-utilisation.html' },
  { label: 'Exporter mes données',        href: 'exporter-mes-donnees.html' },
  { label: 'Abonnement',                  href: 'Abonnements.html', group: 'shop' },
  { label: 'Recharge Tokens',             href: 'Achat de tokens.html', group: 'shop' },
];

/* Dropdown « Menu » pour le header partagé (desktop). */
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
             style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 250, zIndex: 200,
          background: 'var(--nav-bg)', border: '1px solid var(--border-mid)', borderRadius: 14,
          padding: 6, boxShadow: 'var(--shadow)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        }}>
          {MENU_ITEMS.map(function (m, i) {
            var divider = m.group === 'shop' && (i === 0 || MENU_ITEMS[i - 1].group !== 'shop');
            return (
              <React.Fragment key={m.href}>
                {divider && <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }}/>}
                <a role="menuitem" href={m.href} style={{
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
      )}
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
  var active = props && props.active; // 'discover' | 'plans'
  var [open, setOpen] = React.useState(false);
  var navLinks = [
    { label: 'Découvrir', href: 'Découvrir.html', key: 'discover' },
    { label: 'Plans', href: 'Thème.html#abonnements', key: 'plans' },
    { label: 'Connexion', href: LOGIN_URL, key: 'login' },
  ];
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-lockup" href="Découvrir.html" aria-label="THW Coaching — accueil">
          <ThwLogo size={34} radius={9}/>
          <span className="brand-word">THW<span>.</span></span>
        </a>

        <nav className="header-nav">
          {navLinks.map(function (l) {
            return (
              <a key={l.key} className="header-link" href={l.href}
                 onClick={l.key === 'login' ? thwMaybeLogin : null}
                 style={l.key === active ? { color: 'var(--text)', background: 'var(--bg-hover)' } : null}>
                {l.label}
              </a>
            );
          })}
          <HeaderMenu/>
        </nav>

        <div className="header-right">
          {props && props.extra ? props.extra : null}
          <ThemeToggle/>
          <a className="btn btn-cyan" href={LOGIN_URL}>
            <UIIcon name="spark" size={15}/>
            <span className="header-cta-label">Essai gratuit 14 jours</span>
          </a>
          <button type="button" className="btn btn-ghost header-burger"
                  aria-label="Menu" onClick={function () { setOpen(!open); }}
                  style={{ padding: 9, display: 'none' }}>
            <UIIcon name={open ? 'close' : 'menu'} size={18}/>
          </button>
        </div>
      </div>

      {open && (
        <div className="header-mobile-menu" style={{
          borderTop: '1px solid var(--border)', padding: '8px 22px 16px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {navLinks.map(function (l) {
            return <a key={l.key} className="header-link" href={l.href} onClick={l.key === 'login' ? thwMaybeLogin : null} style={{ padding: '12px 6px', fontSize: 15 }}>{l.label}</a>;
          })}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 6px' }}/>
          {MENU_ITEMS.map(function (m) {
            return <a key={m.href} className="header-link" href={m.href} style={{ padding: '12px 6px', fontSize: 15 }}>{m.label}</a>;
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 820px) {
          .header-burger { display: inline-flex !important; }
        }
        @media (min-width: 821px) { .header-mobile-menu { display: none !important; } }
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
            <a className="brand-lockup" href="Découvrir.html" aria-label="THW Coaching">
              <ThwLogo size={36} radius={9}/>
              <span className="brand-word">THW<span>.</span></span>
            </a>
            <p>Ton entraînement hybride — endurance + force — piloté par une IA qui te connaît.</p>
          </div>
          {col('Découvrir', [['Toutes les fonctionnalités', 'Découvrir.html'], ['Coach IA', 'Thème.html#coach-ia'], ['Performances', 'Thème.html#performances'], ['Compétences', 'Thème.html#competences']])}
          {col('Produit', [['Plans & tarifs', 'Thème.html#abonnements'], ['Système de tokens', 'Thème.html#tokens'], ['Connexion', LOGIN_URL], ['Essai gratuit', LOGIN_URL]])}
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
