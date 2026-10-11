/* ════════════════════════════════════════════════════════════════
   THW — Page d'accueil « Découvrir » : hero + grille des 16 bulles.
   (hexToRgb est fourni par SiteChrome.jsx)
   ════════════════════════════════════════════════════════════════ */

function Bubble(props) {
  var t = props.theme;
  var href = 'theme.html#' + t.slug;
  return (
    <a className="bubble reveal tilt" data-tilt="6" href={href}
    style={{ '--b-accent': t.accent, transitionDelay: props.i * 28 + 'ms' }}>
      {t.comingSoon && <span className="bubble-soon" style={{ '--b-accent': t.accent }}>Bientôt</span>}
      {!t.comingSoon && <span className="bubble-num">{String(t.num).padStart(2, '0')}</span>}
      <span className="bubble-ico" style={{ '--b-accent': t.accent }}><ThemeIcon name={t.icon} size={26} /></span>
      <span className="bubble-title">{t.title}</span>
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
      <Tag href={live ? opts.href : undefined} className={'tilt ' + (opts.cls || '')} data-tilt="6"
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
    // Placée APRÈS la grille des piliers : elle occupait auparavant le centre
    // de l'écran, entre la promesse et la preuve, et repoussait les piliers
    // sous la ligne de flottaison.
    <section id="telecharger" className="section" style={{ paddingTop: 8 }}>
      <div className="cta-band reveal" style={{ textAlign: 'center' }}>
        <h2>Télécharge l'app — sur toutes les plateformes</h2>
        <p>iPhone, Android, Mac, Windows : une seule app, partout. Commence tout de suite dans ton navigateur, ou installe l'app native.</p>
        <div className="cta-band-btns" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
          <a className="btn btn-cyan btn-lg" href={APP_URL}><UIIcon name="spark" size={16} /> Ouvrir l'application maintenant</a>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {card({ icon: 'apple', title: 'iPhone', sub: 'App native', action: APP_STORE_URL ? 'App Store →' : 'Bientôt sur l’App Store', href: APP_STORE_URL })}
          {card({ icon: 'google', title: 'Android', sub: 'App native', action: PLAY_STORE_URL ? 'Google Play →' : 'Bientôt sur Google Play', href: PLAY_STORE_URL })}
          {card({ icon: 'grid', title: 'Mac', sub: 'Navigateur ou app', action: 'Ouvrir →', href: APP_URL, web: true, cls: 'dl-desktop-only' })}
          {card({ icon: 'grid', title: 'Windows', sub: 'Navigateur (PWA)', action: 'Ouvrir →', href: APP_URL, web: true, cls: 'dl-desktop-only' })}
        </div>
        <div className="disc-hero-note" style={{ marginTop: 16 }}>Astuce : dans Chrome/Safari, « Installer l’application » / « Ajouter à l’écran d’accueil » pose l’icône comme une vraie app (Windows, Mac, Android).</div>
      </div>
    </section>);
}

var DISC_TICKER = ['Course à pied', 'Vélo', 'Trail', 'Triathlon', 'Hyrox', 'Natation', 'Musculation', 'Aviron',
  'Coach IA · 7 agents', 'Decaform · 24 épreuves', 'Charge · CTL / ATL / TSB', 'Variabilité cardiaque & sommeil',
  'Sync Strava · Garmin · Wahoo', 'Nutrition périodisée'];
var DISC_COVER = [
  { v: 21, label: 'piliers', sub: 'pour couvrir tout ton entraînement' },
  { v: 7, label: 'agents IA', sub: 'qui travaillent pour toi, jour et nuit' },
  { v: 24, label: 'épreuves Decaform', sub: 'sur 12 jours, notées sur 1000' },
  { v: 14, label: "jours d'essai", sub: 'sans carte bancaire, sans engagement' }
];

function Discover() {
  useReveal();
  var themes = window.THW_THEMES;
  var vw = React.useState('shelf'), view = vw[0], setView = vw[1];
  return (
    <React.Fragment>
      <SiteHeader active="discover" />
      <main>
        {/* ─── Héros : bandeau de nuit + carte des courses ─── */}
        <section className="st-night st-hero" data-spot="1">
          <div className="st-hero-grid">
            <div>
              <div className="eyebrow reveal">The Hybrid Way</div>
              <h1 className="st-rise">
                <span style={{ '--i': 0, marginRight: '.24em' }}>Tout ce que</span>
                <span className="grad" style={{ '--i': 1 }}>l'app sait faire</span>
              </h1>
              <p className="lead reveal" style={{ transitionDelay: '120ms' }}>
                Endurance et force, pilotées par une IA qui te connaît. Explore les piliers
                de THW Coaching — du coach personnalisé à l'analyse de tes performances.
              </p>
              <div className="disc-hero-cta reveal" style={{ transitionDelay: '180ms' }}>
                <a className="btn btn-cyan btn-lg mag" href={APP_URL}><UIIcon name="spark" size={16} /> Essai gratuit 14 jours</a>
                <a className="btn btn-ghost btn-lg mag" href="#grille"><UIIcon name="grid" size={16} /> Explorer les piliers</a>
              </div>
              <div className="disc-hero-note reveal" style={{ transitionDelay: '220ms' }}>
                Sans engagement · résiliable à tout moment · <a href="#telecharger" style={{ color: 'var(--gold-bright)', textDecoration: 'none', fontWeight: 600 }}>télécharger l'app</a>
              </div>
            </div>
            <div className="st-reveal" style={{ transitionDelay: '160ms' }}>
              <HybridAthlete />
            </div>
          </div>
          <Ticker items={DISC_TICKER} />
        </section>

        <div className="wrap">
          {/* ─── Chiffres ─── */}
          <section className="section" style={{ paddingTop: 46, paddingBottom: 10 }}>
            <Scoreboard items={DISC_COVER} />
          </section>

          {/* ─── Decaform ─── */}
          <section className="section" style={{ paddingTop: 22 }}>
            <div className="st-reveal tilt" data-tilt="3" style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22, justifyContent: 'space-between',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid var(--gold)',
              borderRadius: 'var(--radius-lg)', padding: '24px 26px', boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ minWidth: 240, flex: '1 1 320px' }}>
                <div className="eyebrow">Nouveau · Test de condition générale</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 'clamp(24px,3.2vw,32px)', margin: '4px 0 8px', color: 'var(--text)' }}>Decaform</div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6, color: 'var(--text-mid)', margin: 0, maxWidth: 560 }}>
                  24 épreuves sur 12 jours, un score sur 1000 et un niveau par qualité. Un test <strong style={{ color: 'var(--text)' }}>exigeant</strong>, conçu pour des pratiquants ayant déjà un certain niveau — pas pour débuter.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                <Seal size={78} center="1000" centerSize={19} ring="DECAFORM · SCORE · " />
                <a className="btn btn-cyan btn-lg mag" href="cadences.html"><UIIcon name="spark" size={16} /> Faire le test</a>
              </div>
            </div>
          </section>

          {/* ─── Coach IA en direct ─── */}
          <section className="section" style={{ paddingTop: 64, paddingBottom: 30 }}>
            <CoachLive />
          </section>

          {/* ─── Le plan qui s'écrit + zones cardiaques ─── */}
          <section className="section" style={{ paddingTop: 70, paddingBottom: 10 }}>
            <PlanWriter />
          </section>

          {/* ─── La saison jusqu'au Jour J ─── */}
          <section className="section" style={{ paddingTop: 70, paddingBottom: 10 }}>
            <SeasonCurve />
          </section>

          {/* ─── Les piliers : la bibliothèque ─── */}
          <section id="grille" className="section" style={{ paddingTop: 70 }}>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div className="eyebrow center">La bibliothèque</div>
              <h2 className="st-h2">21 piliers, une seule méthode.</h2>
              <p className="st-lede" style={{ margin: '0 auto 22px' }}>Tire un livre de l'étagère : il s'ouvre sur ce que fait chaque pilier.</p>
              <div className="st-seg" role="tablist" aria-label="Affichage des piliers">
                <button type="button" role="tab" aria-selected={view === 'shelf'} className={view === 'shelf' ? 'on' : ''} onClick={function () { setView('shelf'); }}>Étagère</button>
                <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={function () { setView('list'); }}>Liste</button>
              </div>
            </div>
            {view === 'shelf'
              ? <Shelf themes={themes} />
              : <div className="bubbles">{themes.map(function (t, i) { return <Bubble key={t.slug} theme={t} i={i} />; })}</div>}
          </section>

          <DownloadSection />
        </div>

        {/* ─── Appel final : bandeau de nuit ─── */}
        <section className="st-night st-final" data-spot="1">
          <div className="wrap" style={{ textAlign: 'center', padding: '96px 32px 100px' }}>
            <div className="eyebrow center">Ta prochaine saison</div>
            <h2 className="st-h2 st-rise" style={{ fontSize: 'clamp(32px,4.6vw,56px)', color: 'var(--night-ink)' }}><span>Prêt à t'entraîner plus intelligemment ?</span></h2>
            <p className="st-lede" style={{ margin: '0 auto 30px', color: 'var(--night-muted)' }}>Un coach IA, tes données, ta méthode. Commence aujourd'hui, sans carte bancaire.</p>
            <div className="cta-band-btns">
              <FinishButton href={APP_URL}><UIIcon name="spark" size={16} /> Essai gratuit 14 jours</FinishButton>
              <a className="btn btn-ghost btn-lg mag" href="theme.html#abonnements">Voir les plans</a>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    </React.Fragment>);

}
window.Discover = Discover;
