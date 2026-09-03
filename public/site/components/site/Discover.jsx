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
  var ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var chip = function (icon, label, ok) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, border: '1px solid rgba(140,140,160,0.28)', fontSize: 13, opacity: ok ? 1 : 0.62 }}>
        <UIIcon name={icon} size={14} /> {label}
      </span>);
  };
  return (
    <section className="section" style={{ paddingTop: 8 }}>
      <div className="cta-band reveal" style={{ textAlign: 'center' }}>
        <h2>Disponible partout</h2>
        <p>Une seule app, sur tous tes appareils. Commence en un clic dans ton navigateur — sur iPhone, l'app native arrive sur l'App Store.</p>
        <div className="cta-band-btns" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn btn-cyan btn-lg" href={APP_URL}><UIIcon name="spark" size={16} /> Ouvrir l'application</a>
          {isIOS && (APP_STORE_URL
            ? <a className="btn btn-ghost btn-lg" href={APP_STORE_URL}><UIIcon name="apple" size={16} /> Télécharger sur l'App Store</a>
            : <span className="btn btn-ghost btn-lg" style={{ opacity: 0.6, pointerEvents: 'none' }}><UIIcon name="apple" size={16} /> Bientôt sur l'App Store</span>)}
          {isAndroid && PLAY_STORE_URL &&
            <a className="btn btn-ghost btn-lg" href={PLAY_STORE_URL}><UIIcon name="google" size={16} /> Google Play</a>}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          {chip('apple', 'iPhone · App Store bientôt', false)}
          {chip('grid', 'Mac · navigateur', true)}
          {chip('grid', 'Windows · navigateur', true)}
          {chip('grid', 'Android · navigateur', true)}
        </div>
        <div className="disc-hero-note" style={{ marginTop: 14 }}>Astuce : depuis Chrome/Safari, « Ajouter à l'écran d'accueil » installe l'app comme une vraie application.</div>
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