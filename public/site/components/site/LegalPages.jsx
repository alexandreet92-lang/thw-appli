/* ════════════════════════════════════════════════════════════════
   THW — Pages « menu » (confidentialité, mentions, CGU, export données).
   Reconstruit pour le déploiement. Réutilise SiteHeader / SiteFooter.
   La page « Exporter mes données » reproduit la maquette validée ;
   les 3 pages légales attendent leur texte définitif.
   ════════════════════════════════════════════════════════════════ */

var LEGAL_CONTENT = {
  'exporter-mes-donnees': {
    title: 'Exporter mes données',
    intro: "Tes données t'appartiennent. Conformément au RGPD (droit à la portabilité), tu peux à tout moment télécharger une copie de tes données personnelles.",
    sections: [
      { h: "Ce que contient l'export", list: [
        'Ton profil (identité, mensurations, préférences).',
        "Tes séances, activités et statistiques d'entraînement.",
        'Tes données de nutrition, récupération et blessures.',
        "L'historique de tes conversations avec l'assistant IA.",
      ] },
      { h: "Comment l'obtenir", p: "Depuis l'application : Profil → Confidentialité → Exporter mes données. Un fichier contenant l'ensemble de tes données est généré et téléchargé." },
      { h: 'Format', p: "Fichier structuré et lisible par machine (JSON), réutilisable pour transférer tes données vers un autre service." },
    ],
  },
  'confidentialite': {
    title: 'Politique de confidentialité',
    intro: "Comment THW Coaching collecte, utilise et protège tes données personnelles (RGPD).",
    sections: [{ h: 'Document', p: "Le texte complet de cette page sera publié prochainement. Pour toute question sur tes données, écris à support@thwcoaching.com." }],
  },
  'mentions-legales': {
    title: 'Mentions légales',
    intro: "Éditeur, hébergeur et contact de THW Coaching.",
    sections: [{ h: 'Document', p: "Le texte complet de cette page sera publié prochainement. Contact : support@thwcoaching.com." }],
  },
  'conditions-utilisation': {
    title: "Conditions d'utilisation",
    intro: "Conditions générales d'utilisation et de vente de THW Coaching.",
    sections: [{ h: 'Document', p: "Le texte complet de cette page sera publié prochainement. Contact : support@thwcoaching.com." }],
  },
};

function LegalPage(props) {
  var data = LEGAL_CONTENT[props.page] || LEGAL_CONTENT['confidentialite'];
  useReveal();
  var muted = { color: 'var(--text-mid)' };
  return (
    <React.Fragment>
      <SiteHeader />
      <main>
        <div className="wrap" style={{ maxWidth: 800, paddingTop: 32, paddingBottom: 88 }}>
          <nav className="reveal" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-dim)', marginBottom: 22 }}>
            <a href="Découvrir.html" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Accueil</a>
            <span style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--text-mid)' }}>{data.title}</span>
          </nav>

          <h1 className="reveal" style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: 'var(--text)', marginBottom: 20 }}>
            {data.title}
          </h1>

          {data.intro && (
            <p className="reveal" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, lineHeight: 1.65, maxWidth: 640, marginBottom: 44, textWrap: 'pretty', ...muted }}>
              {data.intro}
            </p>
          )}

          {data.sections.map(function (s, i) {
            return (
              <section key={i} className="reveal" style={{ marginBottom: 34, transitionDelay: (i * 40) + 'ms' }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 14 }}>{s.h}</h2>
                {s.p && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, lineHeight: 1.7, maxWidth: 640, textWrap: 'pretty', ...muted }}>{s.p}</p>}
                {s.list && (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0 }}>
                    {s.list.map(function (item, j) {
                      return (
                        <li key={j} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, lineHeight: 1.55, ...muted }}>
                          <span style={{ marginTop: 7, width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, boxShadow: '0 0 8px var(--brand)' }} />
                          <span>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}

          <a href={APP_URL} className="btn btn-cyan" style={{ marginTop: 12 }}>
            <UIIcon name="spark" size={15} /> Ouvrir l'application
          </a>
        </div>
        <SiteFooter />
      </main>
    </React.Fragment>
  );
}
window.LegalPage = LegalPage;
