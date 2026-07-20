/* ════════════════════════════════════════════════════════════════
   THW — Template réutilisable de page thème.
   Lit ?t=<slug>, applique l'accent du thème, rend tout le contenu.
   ════════════════════════════════════════════════════════════════ */
function getSlug() {
  // Hash routing (#slug) — robust against query-param rewriting by hosts/proxies.
  var h = (window.location.hash || '').replace(/^#/, '').trim();
  if (h) return decodeURIComponent(h);
  // Fallbacks: ?theme=slug, then default.
  var q = new URLSearchParams(window.location.search).get('theme');
  return q || 'coach-ia';
}
function themeBySlug(slug) {
  return (window.THW_THEMES || []).filter(function (x) { return x.slug === slug; })[0];
}
function currentTheme() {
  var list = window.THW_THEMES || [];
  return themeBySlug(getSlug()) || list[0];
}

function PlanTable(props) {
  var p = props.plans;
  if (!p) return null;
  if (!p.cols) {
    return p.caption ? <p className="plan-caption" style={{ marginTop: 0 }}>{p.caption}</p> : null;
  }
  var cell = function (v, j) {
    if (v === '✓') return <td key={j} className="ok">✓</td>;
    return <td key={j}>{v}</td>;
  };
  return (
    <React.Fragment>
      <div className="plan-table-wrap reveal">
        <table className="plan-table">
          <thead><tr>{p.cols.map(function (c, i) { return <th key={i}>{c}</th>; })}</tr></thead>
          <tbody>
            {p.rows.map(function (r, i) { return <tr key={i}>{r.map(function (v, j) { return cell(v, j); })}</tr>; })}
          </tbody>
        </table>
      </div>
      {p.caption && <p className="plan-caption">{p.caption}</p>}
    </React.Fragment>
  );
}

function PricingCards(props) {
  return (
    <div className="price-grid reveal">
      {props.pricing.map(function (p, i) {
        return (
          <div key={i} className={'price-card' + (p.featured ? ' featured' : '')}>
            {p.featured && <span className="price-flag">Recommandé</span>}
            <div className="price-name">{p.name}</div>
            <div className="price-amt">{p.monthly}<small> /mois</small></div>
            <div className="price-year">ou {p.yearly} · ≈ −20 %</div>
            <div className="price-for">{p.for}</div>
            <a className="btn btn-accent" href={APP_URL} style={{ width: '100%', marginTop: 8 }}>Choisir {p.name}</a>
            <div className="price-coach">Coach <b>{p.coach}</b> par défaut</div>
          </div>
        );
      })}
    </div>
  );
}

function SubCard(props) {
  var s = props.s;
  return (
    <div className={'sub-card reveal' + (s.highlight ? ' feat span2' : '')}>
      {s.badge && <span className="sub-badge" style={{ background: s.badgeColor || 'var(--accent)' }}>{s.badge}</span>}
      {s.tagline && <span className="sub-tag">{s.tagline}</span>}
      <h3>{s.title}</h3>
      <p className="sub-desc">{s.desc}</p>
      {s.items && (
        <ul className="sub-list">
          {s.items.map(function (it, k) { return <li key={k}>{it}</li>; })}
        </ul>
      )}
      {s.example && <div className="sub-example"><b>Exemple</b>{s.example}</div>}
      {s.quote && <p className="sub-quote">{s.quote}</p>}
    </div>
  );
}

function ComingSoon(props) {
  var t = props.theme;
  return (
    <main>
      <div className="wrap">
        <div className="breadcrumb">
          <a href="Découvrir.html">Découvrir</a><span className="sep">/</span><span>{t.title}</span>
        </div>
        <section className="soon-wrap">
          <div className="soon-ico"><ThemeIcon name={t.icon} size={42}/></div>
          <div className="soon-pill">Bientôt disponible</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
          <a className="btn btn-cyan btn-lg" href="Découvrir.html"><UIIcon name="grid" size={16}/> Explorer les autres thèmes</a>
        </section>
      </div>
      <SiteFooter/>
    </main>
  );
}

function ThemeView(props) {
  var t = props.theme;

  React.useEffect(function () {
    document.body.style.setProperty('--accent', t.accent);
    document.body.style.setProperty('--accent-rgb', hexToRgb(t.accent));
    document.title = t.title + ' — THW Coaching';
  }, [t.slug]);
  useReveal();

  if (t.comingSoon) {
    return (
      <React.Fragment>
        <SiteHeader/>
        <ComingSoon theme={t}/>
      </React.Fragment>
    );
  }

  var related = (t.related || []).map(themeBySlug).filter(Boolean);

  return (
    <React.Fragment>
      <SiteHeader active={t.slug === 'abonnements' ? 'plans' : null}/>
      <main>
        <div className="wrap">
          <div className="breadcrumb">
            <a href="Découvrir.html">Découvrir</a><span className="sep">/</span><span>{t.title}</span>
          </div>

          {/* Hero */}
          <section className="th-hero">
            <div className="th-hero-copy">
              <div className="th-hero-ico reveal"><ThemeIcon name={t.icon} size={30}/></div>
              <div className="eyebrow reveal" style={{ color: 'var(--accent)' }}>{String(t.num).padStart(2, '0')} · {t.accentName}</div>
              <h1 className="reveal">{t.tagline}</h1>
              <p className="lede reveal">{t.intro}</p>
              {t.benefits && (
                <ul className="th-benefits reveal">
                  {t.benefits.map(function (b, i) {
                    return <li key={i}><span className="bchk"><UIIcon name="check" size={13}/></span>{b}</li>;
                  })}
                </ul>
              )}
              {t.audience && <div className="th-audience reveal"><b>Pour qui ?</b> {t.audience}</div>}
              <div className="reveal" style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a className="btn btn-accent btn-lg" href={APP_URL}><UIIcon name="spark" size={15}/> {t.cta}</a>
                <a className="btn btn-ghost btn-lg" href="Découvrir.html">Tous les thèmes</a>
              </div>
            </div>
            <div className="th-hero-media reveal" style={{ transitionDelay: '120ms' }}>
              <Mockup type={t.mockup}/>
            </div>
          </section>

          {/* Subthemes */}
          {t.subthemes && t.subthemes.length > 0 && (
            <section className="section">
              <div className="section-head reveal">
                <div className="eyebrow">En détail</div>
                <h2>Ce que tu trouves dans {t.title.toLowerCase()}.</h2>
              </div>
              <div className="sub-grid">
                {t.subthemes.map(function (s, i) { return <SubCard key={i} s={s}/>; })}
              </div>
            </section>
          )}

          {/* Pricing (abonnements only) */}
          {t.pricing && (
            <section className="section">
              <div className="section-head reveal"><div className="eyebrow">Tarifs</div><h2>Trois formules, sans engagement.</h2></div>
              <PricingCards pricing={t.pricing}/>
            </section>
          )}

          {/* Plans / limits */}
          {t.plans && (
            <section className="section">
              <div className="section-head reveal"><div className="eyebrow">Selon ton plan</div><h2>Ce qui change d'un abonnement à l'autre.</h2></div>
              <PlanTable plans={t.plans}/>
            </section>
          )}

          {/* Related */}
          {related.length > 0 && (
            <section className="section">
              <div className="section-head reveal"><div className="eyebrow">À explorer ensuite</div><h2>Thèmes liés.</h2></div>
              <div className="rel-grid">
                {related.map(function (r, i) {
                  return (
                    <a key={i} className="rel-card reveal" href={'Thème.html#' + r.slug} style={{ '--rc-accent': r.accent, transitionDelay: (i * 30) + 'ms' }}>
                      <span className="rel-ico" style={{ '--rc-accent': r.accent }}><ThemeIcon name={r.icon} size={20}/></span>
                      <span className="rel-name">{r.title}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Final CTA */}
          <section className="section">
            <div className="cta-band reveal">
              <h2>{t.cta}.</h2>
              <p>14 jours d'essai gratuit. Découvre ce que THW Coaching change à ton entraînement.</p>
              <div className="cta-band-btns">
                <a className="btn btn-accent btn-lg" href={APP_URL}><UIIcon name="spark" size={16}/> Essai gratuit 14 jours</a>
                <a className="btn btn-ghost btn-lg" href="Thème.html#abonnements">Voir les plans</a>
              </div>
            </div>
          </section>
        </div>
        <SiteFooter/>
      </main>
    </React.Fragment>
  );
}

/* Router: re-reads the hash on navigation and remounts the view
   (so in-page #slug → #slug links update content, accent and reveal). */
function ThemePage() {
  var [slug, setSlug] = React.useState(getSlug());
  React.useEffect(function () {
    var onHash = function () { setSlug(getSlug()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return function () { window.removeEventListener('hashchange', onHash); };
  }, []);
  var t = themeBySlug(slug) || (window.THW_THEMES || [])[0];
  return <ThemeView key={slug} theme={t}/>;
}
window.ThemePage = ThemePage;
