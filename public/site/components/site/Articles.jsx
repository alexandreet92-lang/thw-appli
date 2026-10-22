/* ════════════════════════════════════════════════════════════════
   THW — Page Articles : liste triée par thème, lecteur, accès limité aux visiteurs,
   « lu », « enregistré », partage, articles du même thème.
   ────────────────────────────────────────────────────────────────
   • Liste : GET /api/articles (métadonnées + état du membre).
   • Article : GET /api/articles/[slug]. Un visiteur ne reçoit QUE le début (coupure côté serveur).
   • Lu / enregistré : PATCH /api/articles/[slug] (membres).
   • Adresse d'un article : articles.html?a=<slug> (historique du navigateur géré ici).
   Le texte des articles est en français (data-no-i18n) ; les libellés de l'interface sont traduits.
   ════════════════════════════════════════════════════════════════ */

var ART_GROUPS = [
  ['etat', 'État des lieux'],
  ['sante', 'Santé et longévité'],
  ['age', 'Vieillir'],
  ['mesure', 'Mesurer et performer'],
  ['plan', "Plans d'action"],
];
var ART_START = ['passer-a-l-action-et-tenir', 'condition-physique-en-recul'];

function artGroupLabel(g) { for (var i = 0; i < ART_GROUPS.length; i++) if (ART_GROUPS[i][0] === g) return ART_GROUPS[i][1]; return ''; }
function artSlugFromUrl() { try { return new URLSearchParams(window.location.search).get('a') || null; } catch (e) { return null; } }
function artUrl(slug) { return window.location.pathname + (slug ? '?a=' + encodeURIComponent(slug) : ''); }
function artFetch(url, opts) {
  return (window.__thwSessionReady || Promise.resolve()).catch(function () {}).then(function () {
    return fetch(url, Object.assign({ credentials: 'same-origin' }, opts || {}));
  });
}

/* ─── Icônes ─── */
function ArtIcon(props) {
  var p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  var n = props.name;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
      {n === 'check' && <path d="M5 12.5l4.5 4.5L19 7.5"/>}
      {n === 'bookmark' && <path d={props.filled ? 'M6 3.5h12v17l-6-4.2-6 4.2z' : 'M6 3.5h12v17l-6-4.2-6 4.2z'} fill={props.filled ? 'currentColor' : 'none'}/>}
      {n === 'share' && <g><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></g>}
      {n === 'back' && <path d="M15 5l-7 7 7 7"/>}
      {n === 'circle' && <circle cx="12" cy="12" r="8"/>}
    </svg>
  );
}

/* ─── Miniature animée par thème (dessin propre à la page, pas une donnée) ─── */
function ArtThumb(props) {
  var g = props.group, i = props.i;
  var inner;
  if (g === 'etat') {
    var y0 = 16 + (i * 7) % 16, y1 = 48 + (i * 5) % 14, ym = (y0 + y1) / 2 + ((i % 3) - 1) * 6;
    inner = <g><line className="gl" x1="14" y1="68" x2="236" y2="68"/><path className="ln" d={'M14 ' + y0 + ' C60 ' + (y0 + 6) + ' 92 ' + ym + ' 132 ' + ym + ' S204 ' + (y1 - 2) + ' 236 ' + y1}/><circle className="dot" cx="236" cy={y1} r="4"/></g>;
  } else if (g === 'sante') {
    var bars = [];
    for (var k = 0; k < 7; k++) { var h = 16 + ((k * 17 + i * 7) % 34) + k * 3; bars.push(<rect key={k} className="bar" x={26 + k * 30} y={68 - h} width="18" height={h} rx="2" style={{ animationDelay: (0.2 + k * 0.08) + 's', opacity: 0.45 + k * 0.08 }}/>); }
    inner = <g><line className="gl" x1="14" y1="68" x2="236" y2="68"/>{bars}</g>;
  } else if (g === 'age') {
    var a0 = 52 + (i * 3) % 8, a1 = 14 + (i * 5) % 10;
    inner = <g><line className="gl" x1="14" y1="68" x2="236" y2="68"/><path className="ln" d={'M14 ' + a0 + ' C70 ' + (a0 - 2) + ' 112 ' + (a1 + 18) + ' 152 ' + (a1 + 8) + ' S210 ' + (a1 + 3) + ' 236 ' + a1}/><path className="ln soft" d={'M14 ' + (a1 + 8) + ' C70 ' + (a1 + 12) + ' 120 44 160 54 S210 64 236 66'}/></g>;
  } else if (g === 'mesure') {
    var st = [];
    for (var j = 0; j < 5; j++) st.push(<rect key={j} className="bar" x={30 + j * 40} y={66 - (j + 1) * 11} width="26" height={(j + 1) * 11} rx="2" style={{ animationDelay: (0.2 + j * 0.12) + 's' }}/>);
    inner = <g><line className="gl" x1="14" y1="68" x2="236" y2="68"/>{st}</g>;
  } else {
    var w = 40 + (i % 3) * 14;
    inner = <g><line className="gl" x1="14" y1="68" x2="236" y2="68"/><path className="ln" d={'M14 64 L' + w + ' 64 L' + w + ' 50 L' + (w + 52) + ' 50 L' + (w + 52) + ' 36 L' + (w + 104) + ' 36 L' + (w + 104) + ' 22 L236 22'}/><circle className="dot" cx="236" cy="22" r="4"/></g>;
  }
  return <svg className="arx-thumb" viewBox="0 0 250 84" preserveAspectRatio="none" aria-hidden="true">{inner}</svg>;
}

/* ─── Carte d'article ─── */
function ArtCard(props) {
  var a = props.a, st = props.st || {}, i = props.i;
  var open = function () { props.onOpen(a.slug); };
  return (
    <div className={'arx-card' + (st.read ? ' is-read' : '')} role="link" tabIndex={0}
         onClick={open} onKeyDown={function (e) { if (e.key === 'Enter') open(); }}
         style={{ animationDelay: Math.min(i * 40, 520) + 'ms' }}>
      <ArtThumb group={a.group} i={i}/>
      <div className="body">
        <div className="meta"><span data-no-i18n="1">{a.tag}</span></div>
        <h3 data-no-i18n="1">{a.title}</h3>
        <p data-no-i18n="1">{a.lede}</p>
        <div className="foot">
          <span className={'arx-state' + (st.read ? ' read' : '')}>
            {st.read ? <ArtIcon name="check"/> : null}
            {st.read ? <span>Lu</span> : <span><b data-no-i18n="1" style={{ fontWeight: 500 }}>{a.minutes}</b> <span>min de lecture</span></span>}
          </span>
          <button type="button" className="arx-bm" aria-pressed={!!st.saved}
                  aria-label={st.saved ? 'Retirer des articles enregistrés' : 'Enregistrer cet article'}
                  onClick={function (e) { e.stopPropagation(); props.onSave(a.slug); }}>
            <ArtIcon name="bookmark" filled={!!st.saved}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Partage : feuille native si disponible (toutes les applis du téléphone), sinon liste ─── */
function ArtShare(props) {
  var [open, setOpen] = React.useState(false);
  var [copied, setCopied] = React.useState(false);
  var ref = React.useRef(null);
  var url = new URL('articles.html?a=' + encodeURIComponent(props.slug), window.location.href).href;
  var title = props.title;
  React.useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  var copy = function () {
    var done = function () { setCopied(true); setTimeout(function () { setCopied(false); setOpen(false); }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('', url); });
    else { try { window.prompt('', url); } catch (e) {} }
  };
  var click = function () {
    if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
    setOpen(function (o) { return !o; });
  };
  var enc = encodeURIComponent(url), tt = encodeURIComponent(title);
  var targets = [
    ['WhatsApp', 'https://wa.me/?text=' + tt + '%20' + enc],
    ['Telegram', 'https://t.me/share/url?url=' + enc + '&text=' + tt],
    ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc],
    ['X', 'https://twitter.com/intent/tweet?url=' + enc + '&text=' + tt],
    ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc],
    ['Reddit', 'https://www.reddit.com/submit?url=' + enc + '&title=' + tt],
  ];
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className="arx-act" onClick={click} aria-haspopup="true" aria-expanded={open}>
        <ArtIcon name="share"/><span>Partager</span>
      </button>
      {open && (
        <div className="arx-share" role="menu">
          <button type="button" role="menuitem" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
          {targets.map(function (t) { return <a key={t[0]} role="menuitem" href={t[1]} target="_blank" rel="noopener noreferrer" data-no-i18n="1">{t[0]}</a>; })}
          <a role="menuitem" href={'mailto:?subject=' + tt + '&body=' + enc}>E-mail</a>
          <a role="menuitem" href={'sms:?&body=' + tt + '%20' + enc}>SMS</a>
        </div>
      )}
    </span>
  );
}

/* ─── Squelette de chargement ─── */
function ArtSkeleton() {
  return (
    <div className="arx-col" style={{ paddingTop: 24 }} aria-hidden="true">
      <div className="arx-sk" style={{ height: 14, width: 140, marginBottom: 18 }}/>
      <div className="arx-sk" style={{ height: 40, width: '92%', marginBottom: 12 }}/>
      <div className="arx-sk" style={{ height: 40, width: '60%', marginBottom: 26 }}/>
      {[100, 96, 99, 90, 100, 70].map(function (w, i) { return <div key={i} className="arx-sk" style={{ height: 14, width: w + '%', marginBottom: 12 }}/>; })}
    </div>
  );
}

/* ─── Lecteur ─── */
function ArtReader(props) {
  var slug = props.slug, list = props.list, states = props.states;
  var [art, setArt] = React.useState(null);
  var [err, setErr] = React.useState(false);
  var [prog, setProg] = React.useState(0);
  var bodyRef = React.useRef(null);

  var load = function () {
    setArt(null); setErr(false);
    artFetch('/api/articles/' + encodeURIComponent(slug)).then(function (r) {
      if (!r.ok) throw new Error('http');
      return r.json();
    }).then(function (j) { setArt(j); props.onSession(j.loggedIn); window.scrollTo(0, 0); })
      .catch(function () { setErr(true); });
  };
  React.useEffect(load, [slug, props.reloadKey]);

  /* Graphiques animés à l'entrée dans l'écran + liens internes + progression de lecture */
  React.useEffect(function () {
    if (!art || !bodyRef.current) return undefined;
    var root = bodyRef.current;
    var els = root.querySelectorAll('[data-play]');
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('play'); io.unobserve(e.target); } }); }, { threshold: 0.3 });
      els.forEach(function (el) { io.observe(el); });
    } else { els.forEach(function (el) { el.classList.add('play'); }); }
    var onClick = function (e) {
      var a = e.target.closest && e.target.closest('a[data-art]');
      if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); props.onOpen(a.getAttribute('data-art')); }
    };
    root.addEventListener('click', onClick);
    var onScroll = function () {
      var r = root.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      setProg(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return function () { if (io) io.disconnect(); root.removeEventListener('click', onClick); window.removeEventListener('scroll', onScroll); };
  }, [art]);

  if (err) {
    return (
      <div className="arx-col" style={{ paddingTop: 40 }}>
        <p style={{ color: 'var(--text-mid)' }}>Cet article n'a pas pu être chargé.</p>
        <div className="arx-btns"><button type="button" className="btn btn-ghost" onClick={load}>Réessayer</button><button type="button" className="btn btn-ghost" onClick={props.onBack}>Retour aux articles</button></div>
      </div>
    );
  }
  if (!art) return <ArtSkeleton/>;

  var meta = art.meta, st = states[slug] || art.state || {};
  var member = !!art.loggedIn;
  var related = list.filter(function (a) { return a.group === meta.group && a.slug !== slug; })
    .sort(function (a, b) { var ra = (states[a.slug] || {}).read ? 1 : 0, rb = (states[b.slug] || {}).read ? 1 : 0; return ra - rb || a.order - b.order; })
    .slice(0, 6);

  return (
    <div className="arx-reader">
      <div className="arx-prog" aria-hidden="true"><i style={{ width: Math.round(prog * 100) + '%' }}/></div>
      <div className="arx-col">
        <button type="button" className="arx-back" onClick={props.onBack}><span style={{ width: 16, height: 16, display: 'inline-flex' }}><ArtIcon name="back"/></span><span>Tous les articles</span></button>
        <div className="arx-bar">
          <button type="button" className="arx-act" aria-pressed={!!st.read} onClick={function () { props.onRead(slug); }}>
            <ArtIcon name="check"/><span>{st.read ? 'Lu' : 'Marquer comme lu'}</span>
          </button>
          <button type="button" className="arx-act" aria-pressed={!!st.saved} onClick={function () { props.onSave(slug); }}>
            <ArtIcon name="bookmark" filled={!!st.saved}/><span>{st.saved ? 'Enregistré' : 'Enregistrer'}</span>
          </button>
          <ArtShare slug={slug} title={meta.title}/>
          <span className="arx-time"><b data-no-i18n="1" style={{ fontWeight: 500 }}>{meta.minutes}</b> <span>min de lecture</span></span>
        </div>
      </div>

      <div className="arx-col ax-wrap" ref={bodyRef}>
        <div className={art.locked ? 'arx-clip' : ''} data-no-i18n="1">
          <div className="ax" dangerouslySetInnerHTML={{ __html: '<style>' + art.css + '</style>' + art.html }}/>
        </div>
        {art.locked && (
          <div className="arx-gate" role="region" aria-labelledby="arx-gate-t">
            <h2 id="arx-gate-t">La suite est réservée aux membres</h2>
            <p>Tu viens de lire la question et les enjeux. La démonstration, la réponse et le plan d'action s'ouvrent avec un compte.</p>
            <ul>
              <li>L'article complet, avec ses graphiques et ses sources</li>
              <li>Marquer les articles lus et enregistrer ceux que tu veux retrouver</li>
              <li>Tes résultats de tests et ton historique, au même endroit</li>
            </ul>
            <div className="arx-btns">
              <a className="btn btn-cyan" href={'/auth?redirect=' + encodeURIComponent(authNext())}>Créer un compte</a>
              <a className="btn btn-ghost" href="compte.html" onClick={props.onLoginClick}>Se connecter</a>
            </div>
          </div>
        )}
      </div>

      {!art.locked && (
        <div>
          <div className="arx-done">
            <p>{st.read ? 'Cet article est marqué comme lu.' : 'Tu as terminé cet article ? Marque-le comme lu pour suivre ta progression.'}</p>
            <div className="arx-btns">
              <button type="button" className={'btn ' + (st.read ? 'btn-ghost' : 'btn-cyan')} onClick={function () { props.onRead(slug); }}>{st.read ? 'Retirer des lus' : 'Marquer comme lu'}</button>
              <ArtShare slug={slug} title={meta.title}/>
            </div>
          </div>
          <div className="arx-cta">
            <h2>Mesure ce que tu viens de lire</h2>
            <p>Les articles expliquent pourquoi. Les tests te disent où tu en es, et combien tu progresses.</p>
            <div className="arx-btns">
              <a className="btn btn-cyan" href="test-de-forme.html">Faire le test de forme</a>
              <a className="btn btn-ghost" href="cadences.html">Découvrir Decaform</a>
              <a className="btn btn-ghost" href="tests.html">Tous les tests</a>
            </div>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="arx-rel">
          <h2>Dans le même thème</h2>
          <p className="sub">{artGroupLabel(meta.group)}</p>
          <div className="arx-grid">
            {related.map(function (a, i) {
              return <ArtCard key={a.slug} a={a} i={i} st={states[a.slug]} onOpen={props.onOpen} onSave={props.onSave}/>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
function ArticlesPage() {
  var [list, setList] = React.useState(null);
  var [states, setStates] = React.useState({});
  var [member, setMember] = React.useState(false);
  var [slug, setSlug] = React.useState(artSlugFromUrl());
  var [group, setGroup] = React.useState('all');
  var [status, setStatus] = React.useState(function () { try { return new URLSearchParams(window.location.search).get('f') === 'saved' ? 'saved' : 'all'; } catch (e) { return 'all'; } });
  var [q, setQ] = React.useState('');
  var [failed, setFailed] = React.useState(false);
  var [loginOpen, setLoginOpen] = React.useState(false);
  var [toast, setToast] = React.useState(null);
  var [reloadKey, setReloadKey] = React.useState(0);
  var account = window.THWAccount.useAccount();

  var loadList = function () {
    setFailed(false);
    artFetch('/api/articles').then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (j) { setList(j.articles); setStates(j.state || {}); setMember(!!j.loggedIn); })
      .catch(function () { setFailed(true); });
  };
  React.useEffect(loadList, []);
  /* Le compte peut apparaître après coup (auto-connexion) : on recharge l'état. */
  React.useEffect(function () { if (account && !member && list) { loadList(); setReloadKey(function (k) { return k + 1; }); } }, [!!account]);

  React.useEffect(function () {
    var onPop = function () { setSlug(artSlugFromUrl()); };
    window.addEventListener('popstate', onPop);
    return function () { window.removeEventListener('popstate', onPop); };
  }, []);

  var go = function (s) {
    try { window.history.pushState({}, '', artUrl(s)); } catch (e) {}
    setSlug(s); window.scrollTo(0, 0);
  };
  var say = function (m) { setToast(m); setTimeout(function () { setToast(null); }, 2200); };
  var askLogin = function () {
    var desktop = window.matchMedia ? window.matchMedia('(min-width: 821px)').matches : true;
    if (desktop) setLoginOpen(true); else window.location.href = 'compte.html';
  };
  var onLoginClick = function (e) {
    var desktop = window.matchMedia ? window.matchMedia('(min-width: 821px)').matches : true;
    if (desktop) { e.preventDefault(); setLoginOpen(true); }
  };

  /* Bascule lu / enregistré : optimiste, annulée si le serveur refuse. */
  var toggle = function (s, key) {
    if (!member) { askLogin(); return; }
    var cur = states[s] || {}, next = !cur[key];
    var prev = states;
    var upd = Object.assign({}, cur); upd[key] = next;
    var all = Object.assign({}, states); all[s] = upd; setStates(all);
    var body = {}; body[key] = next;
    artFetch('/api/articles/' + encodeURIComponent(s), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) {
        if (r.status === 401) { setMember(false); setStates(prev); askLogin(); return null; }
        if (!r.ok) throw new Error('http');
        return r.json();
      })
      .then(function (j) {
        if (!j) return;
        var merged = Object.assign({}, all); merged[s] = j.state; setStates(merged);
        say(key === 'saved' ? (next ? 'Article enregistré sur ton compte' : 'Retiré des articles enregistrés') : (next ? 'Marqué comme lu' : 'Retiré des articles lus'));
      })
      .catch(function () { setStates(prev); say("Action impossible pour l'instant"); });
  };

  var counts = React.useMemo(function () {
    var c = { read: 0, saved: 0 };
    if (!list) return c;
    list.forEach(function (a) { var s = states[a.slug]; if (s && s.read) c.read++; if (s && s.saved) c.saved++; });
    return c;
  }, [list, states]);

  var header = <SiteHeader active="articles"/>;
  var modal = loginOpen && !member ? <LoginModal onClose={function () { setLoginOpen(false); }}/> : null;
  var toastEl = toast ? <div className="arx-toast" role="status">{toast}</div> : null;

  if (slug) {
    return (
      <div className="arx-page">
        {header}
        <div className="wrap">
          {list
            ? <ArtReader slug={slug} list={list} states={states} reloadKey={reloadKey}
                onOpen={go} onBack={function () { go(null); }} onRead={function (s) { toggle(s, 'read'); }} onSave={function (s) { toggle(s, 'saved'); }}
                onSession={function (m) { if (m !== member) setMember(m); }} onLoginClick={onLoginClick}/>
            : failed ? <div className="arx-col" style={{ paddingTop: 40 }}><p style={{ color: 'var(--text-mid)' }}>Les articles n'ont pas pu être chargés.</p><button type="button" className="btn btn-ghost" onClick={loadList}>Réessayer</button></div>
            : <ArtSkeleton/>}
        </div>
        <SiteFooter/>{modal}{toastEl}
      </div>
    );
  }

  var ql = q.trim().toLowerCase();
  var shown = (list || []).filter(function (a) {
    if (group !== 'all' && a.group !== group) return false;
    var s = states[a.slug] || {};
    var stt = member ? status : 'all';
    if (stt === 'unread' && s.read) return false;
    if (stt === 'read' && !s.read) return false;
    if (stt === 'saved' && !s.saved) return false;
    if (ql && (a.title + ' ' + a.tag + ' ' + a.lede).toLowerCase().indexOf(ql) < 0) return false;
    return true;
  });
  var total = list ? list.length : 0;
  var C = 2 * Math.PI * 27;

  return (
    <div className="arx-page">
      {header}
      <div className="wrap">
        <div className="arx-hero">
          <div>
            <span className="eyebrow">Articles</span>
            <h1>Comprendre pour passer à l'action</h1>
            <p className="lead">Des articles construits comme des démonstrations : une question, des preuves lues et sourcées, une réponse franche, puis ce qu'on met en place. Chacun mène à un test que tu peux faire ici.</p>
            {list && (
              <div className="arx-stats">
                <div className="arx-stat"><b>{total}</b><span>articles</span></div>
                <div className="arx-stat"><b>{ART_GROUPS.length}</b><span>thèmes</span></div>
                <div className="arx-stat"><b>{list.filter(function (a) { return a.group === 'plan'; }).length}</b><span>plans d'action</span></div>
              </div>
            )}
          </div>
          {member && list && (
            <div className="arx-ring">
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle className="trk" cx="32" cy="32" r="27"/>
                <circle className="val" cx="32" cy="32" r="27" strokeDasharray={C} strokeDashoffset={C * (1 - (total ? counts.read / total : 0))}/>
              </svg>
              <div><b data-no-i18n="1">{counts.read} / {total}</b><span>articles lus</span></div>
            </div>
          )}
        </div>

        {list && !member && (
          <div className="arx-visitor">
            <p>Tu peux lire le début de chaque article. Avec un compte, tu lis tout, tu marques les articles lus et tu enregistres ceux que tu veux retrouver.</p>
            <div className="arx-btns">
              <a className="btn btn-cyan" href={'/auth?redirect=' + encodeURIComponent(authNext())}>Créer un compte</a>
              <a className="btn btn-ghost" href="compte.html" onClick={onLoginClick}>Se connecter</a>
            </div>
          </div>
        )}

        {failed && <div className="arx-empty">Les articles n'ont pas pu être chargés. <button type="button" className="btn btn-ghost" style={{ marginLeft: 10 }} onClick={loadList}>Réessayer</button></div>}

        {!list && !failed && (
          <div className="arx-grid" style={{ marginTop: 40 }} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map(function (i) { return <div key={i} className="arx-sk" style={{ height: 250, borderRadius: 16 }}/>; })}
          </div>
        )}

        {list && (
          <div>
            <div className="arx-start">
              {ART_START.map(function (s, i) {
                var a = list.filter(function (x) { return x.slug === s; })[0];
                if (!a) return null;
                return (
                  <div key={s} className="arx-hero-card" role="link" tabIndex={0} onClick={function () { go(s); }} onKeyDown={function (e) { if (e.key === 'Enter') go(s); }}>
                    <span className="k">{i === 0 ? 'Commencer ici : la méthode' : 'Commencer ici : le constat'}</span>
                    <h2 data-no-i18n="1">{a.title}</h2>
                    <p>{i === 0 ? "Pourquoi savoir quoi faire ne suffit pas, et ce qui fait tenir." : "Ce que disent vraiment les données sur l'évolution de la forme."}</p>
                  </div>
                );
              })}
            </div>

            <div className="arx-tools">
              <input className="arx-search" type="search" value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Rechercher un article" aria-label="Rechercher un article"/>
            </div>
            <div className="arx-chips" role="group" aria-label="Thèmes">
              <button type="button" className="arx-chip" aria-pressed={group === 'all'} onClick={function () { setGroup('all'); }}><span>Tous</span><small data-no-i18n="1">{total}</small></button>
              {ART_GROUPS.map(function (g) {
                var n = list.filter(function (a) { return a.group === g[0]; }).length;
                return <button key={g[0]} type="button" className="arx-chip" aria-pressed={group === g[0]} onClick={function () { setGroup(g[0]); }}><span>{g[1]}</span><small data-no-i18n="1">{n}</small></button>;
              })}
            </div>
            {member && (
              <div className="arx-chips status" role="group" aria-label="Statut">
                <button type="button" className="arx-chip" aria-pressed={status === 'all'} onClick={function () { setStatus('all'); }}><span>Tous les statuts</span></button>
                <button type="button" className="arx-chip" aria-pressed={status === 'unread'} onClick={function () { setStatus('unread'); }}><span>Non lus</span><small data-no-i18n="1">{total - counts.read}</small></button>
                <button type="button" className="arx-chip" aria-pressed={status === 'read'} onClick={function () { setStatus('read'); }}><span>Lus</span><small data-no-i18n="1">{counts.read}</small></button>
                <button type="button" className="arx-chip" aria-pressed={status === 'saved'} onClick={function () { setStatus('saved'); }}><span>Enregistrés</span><small data-no-i18n="1">{counts.saved}</small></button>
              </div>
            )}

            {shown.length === 0 && (
              <div className="arx-empty">
                {status === 'saved' ? "Tu n'as encore enregistré aucun article. Utilise le marque-page d'une carte pour le retrouver ici." : 'Aucun article ne correspond à cette recherche.'}
              </div>
            )}
            {ART_GROUPS.map(function (g) {
              var rows = shown.filter(function (a) { return a.group === g[0]; });
              if (!rows.length) return null;
              return (
                <div key={g[0]}>
                  <h2 className="arx-sec"><span>{g[1]}</span><span data-no-i18n="1">{rows.length}</span></h2>
                  <div className="arx-grid">
                    {rows.map(function (a, i) { return <ArtCard key={a.slug} a={a} i={i} st={states[a.slug]} onOpen={go} onSave={function (s) { toggle(s, 'saved'); }}/>; })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter/>{modal}{toastEl}
    </div>
  );
}
