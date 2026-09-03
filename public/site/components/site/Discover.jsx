/* ════════════════════════════════════════════════════════════════
   THW — Page d'accueil « Découvrir » : hero + grille des 16 bulles.
   (hexToRgb est fourni par SiteChrome.jsx)
   ════════════════════════════════════════════════════════════════ */

function Bubble(props) {
  var t = props.theme;
  var href = 'theme.html#' + t.slug;
  return (
    <a className="bubble reveal" href={href}
    style={{ '--b-accent': t.accent, transitionDelay: props.i * 28 + 'ms' }}>
      {t.comingSoon && <span className="bubble-soon" style={{ '--b-accent': t.accent }}>Bientôt</span>}
      {!t.comingSoon && <span className="bubble-num">{String(t.num).padStart(2, '0')}</span>}
      <span className="bubble-ico" style={{ '--b-accent': t.accent }}><ThemeIcon name={t.icon} size={26} /></span>
      <span className="bubble-title" style={{ fontFamily: "Syne" }}>{t.title}</span>
      <span className="bubble-tag">{t.tagline}</span>
    </a>);

}

/* URL App Store — à renseigner une fois l'app publiée (ex : https://apps.apple.com/app/idXXXXXXXXX).
   Tant que vide → le bouton iOS affiche « Bientôt sur l'App Store ». */
var APP_STORE_URL = '';
/* URL Google Play — à renseigner quand l'app Android est publiée. */
var PLAY_STORE_URL = '';

/* Section « Disponible partout » : l'app web (thw-appli.vercel.app) fonctionne
   AUJOURD'HUI sur Mac, Windows et Android via le navigateur ; l'app native iPhone
   arrive sur l'App Store. Un bouton principal ouvre l'app web sur tout appareil. */
function DownloadSection() {
  // Carte plateforme : un magasin (App Store / Google Play) OU l'accès web+PWA.
  var card = function (opts) {
    var live = !!opts.href;
    var Tag = live ? 'a' : 'span';
    return (
      <Tag href={live ? opts.href : undefined}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 16px', borderRadius: 16, textDecoration: 'none', color: 'inherit',
          border: '1px solid rgba(140,140,160,0.24)', background: 'rgba(140,140,160,0.05)', minWidth: 150, flex: '1 1 150px', maxWidth: 210,
          cursor: live ? 'pointer' : 'default', opacity: live || opts.web ? 1 : 0.78 }}>
        <UIIcon name={opts.icon} size={26} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{opts.title}</span>
        <span style={{ fontSize: 12.5, opacity: 0.7, textAlign: 'center', lineHeight: 1.35 }}>{opts.sub}</span>
        <span style={{ marginTop: 4, fontSize: 12.5, fontWeight: 700, color: opts.web ? 'var(--accent, #22b8cf)' : (live ? 'var(--accent, #22b8cf)' : 'inherit'), opacity: (live || opts.web) ? 1 : 0.6 }}>{opts.action}</span>
      </Tag>);
  };
  return (
    <section className="section" style={{ paddingTop: 8 }}>
      <div className="cta-band reveal" style={{ textAlign: 'center' }}>
        <h2>Télécharge l'app — sur toutes les plateformes</h2>
        <p>iPhone, Android, Mac, Windows : une seule app, partout. Commence tout de suite dans ton navigateur, ou installe l'app native.</p>
        <div className="cta-band-btns" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
          <a className="btn btn-cyan btn-lg" href={APP_URL}><UIIcon name="spark" size={16} /> Ouvrir l'application maintenant</a>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {card({ icon: 'apple', title: 'iPhone', sub: 'App native', action: APP_STORE_URL ? 'App Store →' : 'Bientôt sur l’App Store', href: APP_STORE_URL })}
          {card({ icon: 'google', title: 'Android', sub: 'App native', action: PLAY_STORE_URL ? 'Google Play →' : 'Bientôt sur Google Play', href: PLAY_STORE_URL })}
          {card({ icon: 'grid', title: 'Mac', sub: 'Navigateur ou app', action: 'Ouvrir →', href: APP_URL, web: true })}
          {card({ icon: 'grid', title: 'Windows', sub: 'Navigateur (PWA)', action: 'Ouvrir →', href: APP_URL, web: true })}
        </div>
        <div className="disc-hero-note" style={{ marginTop: 16 }}>Astuce : dans Chrome/Safari, « Installer l’application » / « Ajouter à l’écran d’accueil » pose l’icône comme une vraie app (Windows, Mac, Android).</div>
      </div>
    </section>);
}

function Discover() {
  useReveal();
  var themes = window.THW_THEMES;
  return (
    <React.Fragment>
      <SiteHeader active="discover" />
      <main>
        <div className="wrap">
          <section className="disc-hero">
            <div className="eyebrow center reveal">The Hybrid Way</div>
            <h1 className="reveal" style={{ transitionDelay: '40ms' }}>
              Tout ce que <span className="grad">l'app sait faire</span>
            </h1>
            <p className="reveal" style={{ transitionDelay: '90ms' }}>
              Endurance et force, pilotées par une IA qui te connaît. Explore les piliers
              de THW Coaching — du coach personnalisé à l'analyse de tes performances.
            </p>
            <div className="disc-hero-cta reveal" style={{ transitionDelay: '140ms' }}>
              <a className="btn btn-cyan btn-lg" href={APP_URL}><UIIcon name="spark" size={16} /> Essai gratuit 14 jours</a>
              <a className="btn btn-ghost btn-lg" href="#grille"><UIIcon name="grid" size={16} /> Explorer les piliers</a>
            </div>
            <div className="disc-hero-note reveal" style={{ transitionDelay: '180ms' }}>Sans engagement · résiliable à tout moment</div>
          </section>

          <DownloadSection />

          <section id="grille" className="bubbles">
            {themes.map(function (t, i) {return <Bubble key={t.slug} theme={t} i={i} />;})}
          </section>

          <section className="section" style={{ paddingTop: 40 }}>
            <div className="cta-band reveal">
              <h2>Prêt à t'entraîner plus intelligemment ?</h2>
              <p>Un coach IA, tes données, ta méthode. Commence aujourd'hui, sans carte bancaire.</p>
              <div className="cta-band-btns">
                <a className="btn btn-cyan btn-lg" href={APP_URL}><UIIcon name="spark" size={16} /> Essai gratuit 14 jours</a>
                <a className="btn btn-ghost btn-lg" href="theme.html#abonnements">Voir les plans</a>
              </div>
            </div>
          </section>
        </div>
        <SiteFooter />
      </main>
    </React.Fragment>);

}
window.Discover = Discover;