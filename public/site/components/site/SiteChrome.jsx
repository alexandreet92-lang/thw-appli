/* ════════════════════════════════════════════════════════════════
   THW — Chrome partagé du site : SiteHeader + SiteFooter.
   Réutilise <ThwLogo>, <ThemeToggle>, <UIIcon>.
   Liens app non connectés pour ce livrable → APP_URL.
   ════════════════════════════════════════════════════════════════ */
var APP_URL = 'https://thw-appli.vercel.app';

/* Menu déroulant partagé — toutes les pages du site, visible depuis chacune d'elles. */
var MENU_ITEMS = [
  { label: 'Accueil',                     href: 'index.html' },
  { label: 'Le test Decaform',             href: 'cadences.html' },
  { label: 'Tous les tests',              href: 'tests.html' },
  { label: 'Test de forme',               href: 'test-de-forme.html' },
  { label: 'Mon historique',              href: 'historique.html' },
  { label: 'Abonnement athlète',          href: 'abonnement-athlete.html', group: 'shop' },
  { label: 'Abonnement coach',            href: 'abonnement-coach.html', group: 'shop' },
  { label: 'Recharge de tokens',          href: 'recharge-tokens.html', group: 'shop' },
  { label: 'Devenir coach',               href: 'theme.html#espace-coach', group: 'shop' },
  { label: 'Politique de confidentialité', href: 'confidentialite.html', group: 'legal' },
  { label: 'Mentions légales',            href: 'mentions-legales.html', group: 'legal' },
  { label: "Conditions d'utilisation",     href: 'conditions-utilisation.html', group: 'legal' },
  { label: 'Exporter mes données',        href: 'exporter-mes-donnees.html', group: 'legal' },
];

/* Langues du site : FR est la source, les autres sont traduites au runtime (i18n.js). */
var SITE_LANGS = [['fr', 'Français', 'FR'], ['en', 'English', 'EN'], ['es', 'Español', 'ES'], ['it', 'Italiano', 'IT'], ['de', 'Deutsch', 'DE']];

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
                fontFamily: "var(--font-body), sans-serif", fontSize: 13.5, fontWeight: 500,
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
  var LANGS = SITE_LANGS;
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
      <button type="button" className="lang-select-btn" onClick={function () { setOpen(function (o) { return !o; }); }}
        aria-haspopup="listbox" aria-expanded={open} aria-label="Langue"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          padding: '8px 12px', borderRadius: 999, background: 'var(--bg-card)',
          border: '1px solid var(--border-mid)', boxShadow: 'var(--shadow-card)',
          fontFamily: "var(--font-body), sans-serif", fontSize: 12.5, fontWeight: 600, letterSpacing: '0.02em',
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
                fontFamily: "var(--font-body), sans-serif", fontSize: 13, fontWeight: on ? 600 : 500,
                color: on ? 'var(--brand)' : 'var(--text-mid)', transition: 'background .14s, color .14s' }}
              onMouseEnter={function (e) { if (!on) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={function (e) { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-mid)'; } }}>
              {l[1]}
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, opacity: .7 }}>{l[2]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════
   Connexion + compte, partagés par toutes les pages du site.
   • AuthForm      : Google / Apple / e-mail + mot de passe / mot de passe oublié.
   • Modal         : fenêtre au-dessus de la page (Échap, clic dehors, focus).
   • LoginModal    : « Se connecter » sur ordinateur (sur mobile : page compte.html).
   • PasswordModal : changer son mot de passe quand on est connecté.
   • AccountMenu   : la bulle de compte (remplace « Se connecter » une fois connecté).
   Les textes sont en français (source) : i18n.js les traduit dans le DOM.
   ════════════════════════════════════════════════════════════════ */

/* Page d'où part la connexion : on y revient après Google/Apple/déconnexion. */
function authNext() {
  try { return window.location.pathname + (window.location.search || ''); } catch (e) { return '/'; }
}

function AuthStyles() {
  return (
    <style>{`
      .thw-ov { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(5,8,12,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: thwOvIn .18s ease; }
      @keyframes thwOvIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes thwModalIn { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
      .thw-modal { position: relative; width: 100%; max-width: 420px; max-height: calc(100vh - 40px); overflow-y: auto; background: var(--bg-card, #fff); color: var(--text); border: 1px solid var(--border-mid); border-radius: 20px; padding: 30px 28px 26px; box-shadow: 0 24px 70px rgba(0,0,0,.35); animation: thwModalIn .22s cubic-bezier(.22,1,.36,1); text-align: center; }
      .thw-modal h2 { font-family: var(--font-display); font-weight: 600; font-size: 26px; margin: 14px 0 0; color: var(--text); }
      .thw-modal .thw-lead { margin: 10px 0 0; font-size: 14px; line-height: 1.6; color: var(--text-mid); }
      .thw-modal-x { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: 9px; background: transparent; color: var(--text-dim); cursor: pointer; transition: background .16s, color .16s; }
      .thw-modal-x:hover { background: var(--bg-hover); color: var(--text); }
      .thw-au-oauth { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
      .thw-au-oauth a { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 46px; border-radius: 10px; background: var(--bg-card); box-shadow: inset 0 0 0 1px var(--border-mid); color: var(--text); font-size: 14.5px; font-weight: 500; text-decoration: none; transition: box-shadow .16s, background .16s; }
      .thw-au-oauth a:hover { box-shadow: inset 0 0 0 1px var(--text-dim); background: var(--bg-hover); color: var(--text); }
      .thw-au-sep { display: flex; align-items: center; gap: 12px; margin-top: 20px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
      .thw-au-sep::before, .thw-au-sep::after { content: ''; flex: 1; height: 1px; background: var(--border); }
      .thw-au-form { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; text-align: left; }
      .thw-au-label { font-size: 12px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
      .thw-au-input { width: 100%; min-height: 46px; padding: 0 14px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border-mid); color: var(--text); font-family: var(--font-body); font-size: 14.5px; box-sizing: border-box; }
      .thw-au-input:focus { outline: 2px solid var(--brand); outline-offset: 1px; border-color: transparent; }
      .thw-au-pass { position: relative; display: block; }
      .thw-au-pass .thw-au-input { padding-right: 48px; }
      .thw-au-eye { position: absolute; top: 50%; right: 6px; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; border: none; border-radius: 9px; background: transparent; color: var(--text-dim); cursor: pointer; }
      .thw-au-eye:hover { color: var(--text); background: var(--bg-hover); }
      .thw-au-submit { min-height: 46px; margin-top: 6px; border: none; border-radius: 10px; cursor: pointer; background: var(--brand-gradient); color: #fff; font-family: var(--font-body); font-size: 14.5px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,200,224,.32); transition: filter .16s; }
      .thw-au-submit:hover { filter: brightness(1.07); }
      .thw-au-submit:disabled { opacity: .6; cursor: default; }
      .thw-au-link { background: none; border: none; padding: 0; cursor: pointer; font: inherit; font-size: 13px; font-weight: 500; color: var(--brand); text-align: left; }
      .thw-au-link:hover { text-decoration: underline; }
      .thw-au-err { margin: 4px 0 0; font-size: 12.5px; color: #ef4444; text-align: center; }
      .thw-au-ok { margin: 4px 0 0; font-size: 13px; line-height: 1.5; color: var(--text-mid); text-align: center; }
      .thw-au-hint { margin-top: 16px; font-size: 12.5px; color: var(--text-dim); text-align: center; }
      .thw-au-hint a { color: var(--brand); text-decoration: none; }
      .thw-acc-btn { display: inline-flex; align-items: center; gap: 9px; padding: 4px 14px 4px 4px; border-radius: 999px; cursor: pointer; border: 1px solid var(--border-mid); background: var(--bg-card); color: var(--text); box-shadow: var(--shadow-card); font-family: var(--font-body); font-size: 13.5px; font-weight: 600; transition: border-color .16s; }
      .thw-acc-btn:hover, .thw-acc-btn[aria-expanded="true"] { border-color: var(--brand); }
      .thw-acc-av { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--brand-gradient); color: #fff; font-size: 13px; font-weight: 700; flex-shrink: 0; }
      .thw-acc-panel { position: absolute; top: calc(100% + 10px); right: 0; width: 300px; max-width: calc(100vw - 24px); z-index: 200; background: var(--nav-bg); border: 1px solid var(--border-mid); border-radius: 16px; padding: 8px; box-shadow: var(--shadow); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
      .thw-acc-head { display: flex; align-items: center; gap: 12px; padding: 10px 10px 12px; }
      .thw-acc-head .thw-acc-av { width: 40px; height: 40px; font-size: 16px; }
      .thw-acc-name { font-weight: 600; font-size: 14.5px; color: var(--text); line-height: 1.2; }
      .thw-acc-mail { font-size: 12px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
      .thw-acc-sep { height: 1px; background: var(--border); margin: 6px 6px; }
      .thw-acc-label { padding: 8px 10px 6px; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
      .thw-acc-row { padding: 0 8px 6px; }
      .thw-acc-item { display: block; width: 100%; box-sizing: border-box; padding: 10px 10px; border-radius: 9px; border: none; background: transparent; text-align: left; cursor: pointer; font-family: var(--font-body); font-size: 13.5px; font-weight: 500; color: var(--text-mid); text-decoration: none; transition: background .14s, color .14s; }
      .thw-acc-item:hover { background: var(--bg-hover); color: var(--text); }
      .thw-acc-langs { display: flex; flex-wrap: wrap; gap: 6px; }
      .thw-acc-lang { padding: 7px 11px; border-radius: 999px; border: 1px solid var(--border-mid); background: var(--bg-card); color: var(--text-mid); cursor: pointer; font-family: var(--font-body); font-size: 12.5px; font-weight: 600; }
      .thw-acc-lang[aria-pressed="true"] { color: #fff; background: var(--brand-gradient); border-color: transparent; }
      @media (max-width: 480px) { .thw-modal { padding: 26px 20px 22px; border-radius: 18px; } .thw-acc-btn .thw-acc-name-lbl { display: none; } .thw-acc-btn { padding-right: 4px; } }
    `}</style>
  );
}

function EyeIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
      {props.off && <path d="M4 20 20 4"/>}
    </svg>
  );
}

/* Formulaire de connexion partagé (fenêtre + page compte.html). */
function AuthForm(props) {
  var next = props.next || authNext();
  var [mode, setMode] = React.useState('login');   // 'login' | 'forgot'
  var [email, setEmail] = React.useState('');
  var [password, setPassword] = React.useState('');
  var [showPass, setShowPass] = React.useState(false);
  var [loading, setLoading] = React.useState(false);
  var [err, setErr] = React.useState(null);
  var [info, setInfo] = React.useState(null);
  var oauth = function (p) { return '/api/auth/site-oauth?provider=' + p + '&next=' + encodeURIComponent(next); };

  var login = function (e) {
    e.preventDefault();
    if (!email || !password || loading) return;
    setLoading(true); setErr(null);
    fetch('/api/auth/site-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j || !res.j.success) { setErr((res.j && res.j.error) || 'Connexion impossible'); setLoading(false); return; }
        try { if (window.THWAccount) window.THWAccount.refresh(); } catch (x) {}
        window.location.reload();
      })
      .catch(function () { setErr('Connexion impossible. Réessaie.'); setLoading(false); });
  };

  var forgot = function (e) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true); setErr(null); setInfo(null);
    fetch('/api/auth/site-reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
    }).then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        setLoading(false);
        if (!res.ok) { setErr((res.j && res.j.error) || 'Envoi impossible. Réessaie.'); return; }
        setInfo('Si un compte existe avec cette adresse, un e-mail vient de partir. Clique sur le lien pour choisir un nouveau mot de passe.');
      })
      .catch(function () { setLoading(false); setErr('Envoi impossible. Réessaie.'); });
  };

  if (mode === 'forgot') {
    return (
      <div>
        <p className="thw-lead" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-mid)' }}>
          Entre l’e-mail de ton compte : on t’envoie un lien pour choisir un nouveau mot de passe.
        </p>
        <form className="thw-au-form" onSubmit={forgot}>
          <label className="thw-au-label" htmlFor="thw-au-email">Email du compte Hybrid</label>
          <input className="thw-au-input" id="thw-au-email" type="email" required placeholder="ton@email.fr" value={email} onChange={function (e) { setEmail(e.target.value); }} autoComplete="email"/>
          {err && <p className="thw-au-err">{err}</p>}
          {info && <p className="thw-au-ok">{info}</p>}
          <button className="thw-au-submit" type="submit" disabled={loading || !!info}>{loading ? 'Envoi…' : 'Envoyer le lien'}</button>
          <button type="button" className="thw-au-link" style={{ textAlign: 'center' }} onClick={function () { setMode('login'); setErr(null); setInfo(null); }}>← Retour à la connexion</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="thw-au-oauth">
        <a href={oauth('google')}><UIIcon name="google" size={18}/> Continuer avec Google</a>
        <a href={oauth('apple')}><UIIcon name="apple" size={17}/> Continuer avec Apple</a>
      </div>
      <div className="thw-au-sep">ou par email</div>
      <form className="thw-au-form" onSubmit={login}>
        <label className="thw-au-label" htmlFor="thw-au-email">Email du compte Hybrid</label>
        <input className="thw-au-input" id="thw-au-email" type="email" required placeholder="ton@email.fr" value={email} onChange={function (e) { setEmail(e.target.value); }} autoComplete="email"/>
        <label className="thw-au-label" htmlFor="thw-au-pass" style={{ marginTop: 4 }}>Mot de passe</label>
        <div className="thw-au-pass">
          <input className="thw-au-input" id="thw-au-pass" type={showPass ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={function (e) { setPassword(e.target.value); }} autoComplete="current-password"/>
          <button type="button" className="thw-au-eye" onClick={function () { setShowPass(function (v) { return !v; }); }} aria-pressed={showPass}
            aria-label={showPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}><EyeIcon off={showPass}/></button>
        </div>
        <button type="button" className="thw-au-link" onClick={function () { setMode('forgot'); setErr(null); }}>Mot de passe oublié ?</button>
        {err && <p className="thw-au-err">{err}</p>}
        <button className="thw-au-submit" type="submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  );
}

/* Fenêtre générique : Échap, clic sur le fond, défilement de la page bloqué. */
function Modal(props) {
  React.useEffect(function () {
    var onKey = function (e) { if (e.key === 'Escape') props.onClose(); };
    document.addEventListener('keydown', onKey);
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function () { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  return ReactDOM.createPortal(
    <div className="thw-ov" onMouseDown={function (e) { if (e.target === e.currentTarget) props.onClose(); }}>
      <AuthStyles/>
      <div className="thw-modal" role="dialog" aria-modal="true" aria-labelledby="thw-modal-title">
        <button type="button" className="thw-modal-x" aria-label="Fermer" onClick={props.onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>{props.eyebrow}</span>
        <h2 id="thw-modal-title">{props.title}</h2>
        {props.children}
      </div>
    </div>,
    document.body
  );
}

function LoginModal(props) {
  return (
    <Modal onClose={props.onClose} eyebrow="Espace personnel" title="Se connecter">
      <p className="thw-lead">Connecte-toi pour retrouver ton abonnement, tes tokens et toutes tes factures.</p>
      <AuthForm/>
      <p className="thw-au-hint">Pas encore de compte ? <a href={'/auth?redirect=' + encodeURIComponent(authNext())}>Crée-le en 1 minute</a> — 14 jours d’essai, sans carte bancaire.</p>
    </Modal>
  );
}

function PasswordModal(props) {
  var [pw, setPw] = React.useState('');
  var [pw2, setPw2] = React.useState('');
  var [show, setShow] = React.useState(false);
  var [loading, setLoading] = React.useState(false);
  var [err, setErr] = React.useState(null);
  var [done, setDone] = React.useState(false);
  var submit = function (e) {
    e.preventDefault();
    if (loading) return;
    if (pw.length < 8) { setErr('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (pw !== pw2) { setErr('Les deux mots de passe ne sont pas identiques.'); return; }
    setLoading(true); setErr(null);
    fetch('/api/auth/site-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ password: pw }),
    }).then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        setLoading(false);
        if (!res.ok || !res.j || !res.j.success) { setErr((res.j && res.j.error) || 'Impossible de changer le mot de passe. Réessaie.'); return; }
        setDone(true);
      })
      .catch(function () { setLoading(false); setErr('Impossible de changer le mot de passe. Réessaie.'); });
  };
  return (
    <Modal onClose={props.onClose} eyebrow="Sécurité" title="Changer le mot de passe">
      {done ? (
        <div>
          <p className="thw-lead">C’est fait : ton mot de passe est à jour.</p>
          <button type="button" className="thw-au-submit" style={{ width: '100%', marginTop: 18 }} onClick={props.onClose}>Fermer</button>
        </div>
      ) : (
        <form className="thw-au-form" style={{ marginTop: 18 }} onSubmit={submit}>
          <label className="thw-au-label" htmlFor="thw-pw1">Nouveau mot de passe</label>
          <div className="thw-au-pass">
            <input className="thw-au-input" id="thw-pw1" type={show ? 'text' : 'password'} required minLength={8} placeholder="8 caractères minimum" value={pw} onChange={function (e) { setPw(e.target.value); }} autoComplete="new-password"/>
            <button type="button" className="thw-au-eye" onClick={function () { setShow(function (v) { return !v; }); }} aria-pressed={show}
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}><EyeIcon off={show}/></button>
          </div>
          <label className="thw-au-label" htmlFor="thw-pw2" style={{ marginTop: 4 }}>Confirmer</label>
          <input className="thw-au-input" id="thw-pw2" type={show ? 'text' : 'password'} required placeholder="••••••••" value={pw2} onChange={function (e) { setPw2(e.target.value); }} autoComplete="new-password"/>
          {err && <p className="thw-au-err">{err}</p>}
          <button className="thw-au-submit" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      )}
    </Modal>
  );
}

/* La bulle de compte : réglages de base (apparence, langue, mot de passe, déconnexion). */
function AccountMenu(props) {
  var account = props.account;
  var [open, setOpen] = React.useState(false);
  var ref = React.useRef(null);
  React.useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  var adm = React.useState(false), isAdmin = adm[0], setIsAdmin = adm[1];
  React.useEffect(function () {
    var alive = true;
    fetch('/api/admin/me', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (alive && j && j.admin === true) setIsAdmin(true); }).catch(function () {});
    return function () { alive = false; };
  }, []);
  var name = account.firstName || 'Mon compte';
  var initial = (account.firstName || account.email || 'T').trim().charAt(0).toUpperCase();
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <AuthStyles/>
      <button type="button" className="thw-acc-btn" aria-haspopup="true" aria-expanded={open} title={account.email || ''}
        onClick={function () { setOpen(function (o) { return !o; }); }}>
        <span className="thw-acc-av" aria-hidden="true">{initial}</span>
        <span className="thw-acc-name-lbl">{name}</span>
      </button>
      <div role="menu" aria-hidden={!open} className={'thw-acc-panel dd-panel' + (open ? ' dd-open' : '')}>
        <div className="thw-acc-head">
          <span className="thw-acc-av" aria-hidden="true">{initial}</span>
          <div style={{ minWidth: 0 }}>
            <div className="thw-acc-name">{name}{account.tierLabel ? ' · ' + account.tierLabel : ''}</div>
            <div className="thw-acc-mail">{account.email}</div>
          </div>
        </div>
        <a role="menuitem" className="thw-acc-item" href="compte.html" tabIndex={open ? 0 : -1}>Mon compte</a>
        {isAdmin ? <a role="menuitem" className="thw-acc-item" href="statistiques.html" tabIndex={open ? 0 : -1}>Statistiques</a> : null}
        <div className="thw-acc-sep"/>
        <div className="thw-acc-label">Apparence</div>
        <div className="thw-acc-row"><ThemeToggle/></div>
        <div className="thw-acc-label">Langue</div>
        <div className="thw-acc-row">
          <div className="thw-acc-langs" data-no-i18n="1">
            {SITE_LANGS.map(function (l) {
              return <button key={l[0]} type="button" className="thw-acc-lang" aria-pressed={l[0] === props.lang} aria-label={l[1]} tabIndex={open ? 0 : -1}
                onClick={function () { props.setLang(l[0]); }}>{l[2]}</button>;
            })}
          </div>
        </div>
        <div className="thw-acc-sep"/>
        <button type="button" role="menuitem" className="thw-acc-item" tabIndex={open ? 0 : -1}
          onClick={function () { setOpen(false); props.onPassword(); }}>Changer le mot de passe</button>
        <a role="menuitem" className="thw-acc-item" tabIndex={open ? 0 : -1}
          href={'/api/auth/signout?next=' + encodeURIComponent(authNext())}>Se déconnecter</a>
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
  // La langue peut aussi changer SANS clic : quand la personne est connectée,
  // le site adopte la langue réglée dans l'app. Sans cet abonnement, le
  // sélecteur resterait affiché sur « FR » alors que la page est en anglais.
  React.useEffect(function () {
    if (!window.THWLang || !window.THWLang.onChange) return undefined;
    setLangState(window.THWLang.getLang());
    return window.THWLang.onChange(function (l) { setLangState(l); });
  }, []);
  // Compte réel : si l'utilisateur est connecté à l'app (session en cookie, même
  // domaine), on récupère son nom + abonnement pour l'afficher en haut à droite.
  // Compte partagé : un seul fetch par page, et le cache évite que le header
  // repasse sur « Se connecter » à chaque navigation.
  var account = window.THWAccount.useAccount();
  // Barre du haut : Accueil et Decaform seulement. « Découvrir » (même page que
  // l'accueil), « Plans » (tarifs : dans le pied de page et le menu) et « Connexion »
  // (même destination que le bouton « Se connecter ») ont été retirés.
  var navLinks = [
    { label: 'Accueil', href: 'index.html', key: 'home' },
    { label: 'Decaform', href: 'cadences.html', key: 'cadences' },
  ];
  // Une fois connecté : accès direct à l'historique des tests (page dédiée).
  if (account) { navLinks.push({ label: 'Mon historique', href: 'historique.html', key: 'history' }); }
  // Fenêtres de connexion / mot de passe (ordinateur). Sur mobile, « Se connecter »
  // reste un lien vers la page compte.html.
  var [loginOpen, setLoginOpen] = React.useState(false);
  var [pwOpen, setPwOpen] = React.useState(false);
  var openLogin = function (e) {
    var desktop = window.matchMedia ? window.matchMedia('(min-width: 821px)').matches : true;
    if (desktop) { e.preventDefault(); setLoginOpen(true); }
  };
  // App Store 3.1.1 : quand une page du site est ouverte DEPUIS l'app (navigateur
  // in-app, ?app=1 → sessionStorage thw_app_noprice), on masque toute la
  // navigation du site (nav + CTA compte + burger). Sinon on pourrait, depuis
  // l'app, atteindre la page « Plans » / tarifs → chemin d'achat interdit par Apple.
  var IN_APP = (function () {
    try {
      if (new URLSearchParams(window.location.search).get('app') === '1') return true;
      return sessionStorage.getItem('thw_app_noprice') === '1';
    } catch (e) { return false; }
  })();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-lockup" href="index.html" aria-label="THW Coaching — accueil">
          <ThwLogo size={34} radius={9}/>
          <span className="brand-word">THW<span>.</span></span>
        </a>

        {!IN_APP && (
          <nav className="header-nav">
            {navLinks.map(function (l) {
              return (
                <a key={l.key} className="header-link" href={l.href} aria-current={l.key === active ? 'page' : undefined}
                   style={l.key === active ? { color: 'var(--text)', whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' }}>
                  {l.label}
                </a>
              );
            })}
            <HeaderMenu/>
          </nav>
        )}

        <div className="header-right">
          {/* Connecté : langue et thème passent dans la bulle de compte. */}
          {!account && (props && props.extra ? props.extra
            : <div data-thw-lang-select="1" data-no-i18n="1"><LangSelect lang={lang} setLang={setLang}/></div>)}
          {!account && <ThemeToggle/>}
          {/* Le moteur i18n a besoin d'un sélecteur « data-thw-lang-select » pour ne pas en injecter un second. */}
          {account && <span data-thw-lang-select="1" style={{ display: 'none' }}/>}
          {!IN_APP && !account && (
            <a className="btn btn-cyan mag" href="compte.html" onClick={openLogin}>
              <UIIcon name="user" size={15}/>
              <span className="header-cta-label">Se connecter</span>
            </a>
          )}
          {!IN_APP && account && <AccountMenu account={account} lang={lang} setLang={setLang} onPassword={function () { setPwOpen(true); }}/>}
          {!IN_APP && (
            <button type="button" className="btn btn-ghost header-burger"
                    aria-label="Menu" onClick={function () { setOpen(!open); }}
                    style={{ padding: 9, display: 'none' }}>
              <UIIcon name={open ? 'close' : 'menu'} size={18}/>
            </button>
          )}
        </div>
      </div>

      {loginOpen && !account && <LoginModal onClose={function () { setLoginOpen(false); }}/>}
      {pwOpen && account && <PasswordModal onClose={function () { setPwOpen(false); }}/>}

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
  // App Store 3.1.1 : en mode app (in-app browser), on masque les colonnes qui
  // mènent aux pages tarifs / abonnement (chemin d'achat). On garde le légal.
  var IN_APP = (function () {
    try {
      if (new URLSearchParams(window.location.search).get('app') === '1') return true;
      return sessionStorage.getItem('thw_app_noprice') === '1';
    } catch (e) { return false; }
  })();
  var col = function (title, links) {
    return (
      <div className="footer-col">
        <h4>{title}</h4>
        {links.map(function (l, i) { return <a key={i} href={l[1]}>{l[0]}</a>; })}
      </div>
    );
  };
  return (
    <footer className="site-footer st-night" data-spot="1">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand-lockup" href="index.html" aria-label="THW Coaching">
              <ThwLogo size={36} radius={9}/>
              <span className="brand-word">THW<span>.</span></span>
            </a>
            <p>Ton entraînement hybride — endurance + force — piloté par une IA qui te connaît.</p>
          </div>
          {!IN_APP && col('Découvrir', [['Tous les piliers', 'index.html#grille'], ['Coach IA', 'theme.html#coach-ia'], ['Performances', 'theme.html#performances'], ['Compétences', 'theme.html#competences']])}
          {!IN_APP && col('Produit', [['Plans & tarifs', 'theme.html#abonnements'], ['Abonnement coach', 'abonnement-coach.html'], ['Système de tokens', 'theme.html#tokens'], ['Connexion', APP_URL], ['Essai gratuit', APP_URL]])}
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
        <div className="st-footmark" aria-hidden="true" data-no-i18n="1">THW<i>.</i></div>
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

Object.assign(window, { SiteHeader: SiteHeader, SiteFooter: SiteFooter, AuthForm: AuthForm, authNext: authNext, AuthStyles: AuthStyles, useReveal: useReveal, APP_URL: APP_URL, hexToRgb: hexToRgb });
