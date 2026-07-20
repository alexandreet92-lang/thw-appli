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
              Endurance et force, pilotées par une IA qui te connaît. Explore les 16 piliers
              de THW Coaching — du coach personnalisé à l'analyse de tes performances.
            </p>
            <div className="disc-hero-cta reveal" style={{ transitionDelay: '140ms' }}>
              <a className="btn btn-cyan btn-lg" href={APP_URL}><UIIcon name="spark" size={16} /> Essai gratuit 14 jours</a>
              <a className="btn btn-ghost btn-lg" href="#grille"><UIIcon name="grid" size={16} /> Explorer les 16 thèmes</a>
            </div>
            <div className="disc-hero-note reveal" style={{ transitionDelay: '180ms' }}>Sans engagement · résiliable à tout moment</div>
          </section>

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