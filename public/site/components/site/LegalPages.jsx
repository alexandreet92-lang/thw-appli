/* ════════════════════════════════════════════════════════════════
   THW — Pages « menu » : Exporter mes données, Politique de
   confidentialité, Mentions légales, Conditions d'utilisation.
   Réutilise SiteHeader / SiteFooter. Contenu fourni par l'éditeur.
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
    sections: [
      { h: '1. Qui sommes-nous ?', p: "THW (« The Hybrid Way ») est une application de coaching sportif hybride (endurance + force) proposant un suivi d'entraînement, de la nutrition, de la récupération et un assistant IA. L'éditeur est Alexandre Ettori (micro-entreprise), 3 rue Maréchal Joffre, 92330 Sceaux. Pour toute question relative à tes données : alexandre.et92@gmail.com." },
      { h: '2. Quelles données nous collectons', list: [
        "Compte & identité : email, nom/prénom (facultatif), photo de profil (facultative), mot de passe (chiffré, jamais lisible par nous).",
        "Données de profil sportif : taille, poids, sports pratiqués, objectifs, bio, préférences d'unités.",
        "Données d'entraînement & santé : séances, distances, durées, fréquence cardiaque, puissance, allure, récupération, blessures. Ces données peuvent constituer des données de santé ; elles sont traitées avec ton consentement explicite et pour te fournir le service.",
        "Connexions tierces : si tu connectes un service externe (ex. Strava), les données que tu autorises à importer.",
        "Paiement : gérées par notre prestataire Stripe. Nous ne stockons jamais ton numéro de carte.",
        "Données d'usage & techniques : logs, appareil, statistiques d'utilisation de l'assistant IA.",
      ] },
      { h: '3. Pourquoi nous utilisons ces données (bases légales)', list: [
        "Fournir et personnaliser le service (exécution du contrat).",
        "Générer des recommandations et plans via l'assistant IA (exécution du contrat / consentement).",
        "Gérer l'abonnement et la facturation (obligation légale / contrat).",
        "Améliorer l'application et la sécurité (intérêt légitime).",
        "Traiter les données de santé/sport (consentement explicite, retirable à tout moment).",
      ] },
      { h: '4. Assistant IA', p: "Tes messages et le contexte d'entraînement pertinents sont transmis à notre fournisseur de modèles d'IA pour générer les réponses du coach. Ces échanges ne sont pas utilisés pour entraîner des modèles tiers sans ton accord." },
      { h: '5. Hébergement & transferts', p: "L'application est hébergée par Vercel ; les données sont stockées via Supabase dans l'Union européenne. Certains prestataires (paiement, IA) peuvent traiter des données hors UE avec des garanties appropriées (clauses contractuelles types)." },
      { h: '6. Durée de conservation', p: "Tes données sont conservées tant que ton compte est actif. À la suppression du compte, elles sont effacées sous 30 jours, sauf obligations légales (facturation : durée légale de conservation comptable)." },
      { h: '7. Tes droits (RGPD)', p: "Tu disposes des droits d'accès, de rectification, d'effacement, de portabilité, de limitation, d'opposition, et du retrait du consentement à tout moment. Tu peux exporter tes données depuis l'application (« Exporter mes données ») ou nous écrire à alexandre.et92@gmail.com. Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr)." },
      { h: '8. Sécurité', p: "Chiffrement en transit et au repos, contrôle d'accès par utilisateur (chaque personne n'accède qu'à ses propres données), mots de passe hachés." },
      { h: '9. Cookies', p: "Nous n'utilisons que des cookies strictement nécessaires au fonctionnement du service. Si des outils de mesure d'audience sont ajoutés, un consentement te sera demandé." },
      { h: '10. Modifications', p: "Nous pouvons mettre à jour cette politique ; la date en haut indique la dernière version." },
    ],
  },

  'mentions-legales': {
    title: 'Mentions légales',
    intro: "Éditeur, hébergeur et contact de THW Coaching.",
    sections: [
      { h: "Éditeur du site et de l'application", p: "Alexandre Ettori — entrepreneur individuel (micro-entreprise). Adresse : 3 rue Maréchal Joffre, 92330 Sceaux. Email : alexandre.et92@gmail.com. SIREN : 107794208. TVA : TVA non applicable, article 293 B du CGI (franchise en base)." },
      { h: 'Directeur de la publication', p: "Alexandre Ettori." },
      { h: 'Hébergeur du site', p: "OVH SAS — 2 rue Kellermann, 59100 Roubaix, France — ovhcloud.com." },
      { h: "Hébergement de l'application et des données", p: "Application hébergée par Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA). Données stockées via Supabase (base de données hébergée dans l'Union européenne)." },
      { h: 'Contact', p: "Pour toute question : alexandre.et92@gmail.com." },
    ],
  },

  'conditions-utilisation': {
    title: "Conditions d'utilisation",
    intro: "Conditions générales d'utilisation et de vente de THW Coaching.",
    sections: [
      { h: '1. Objet et éditeur', p: "Les présentes conditions régissent l'utilisation de l'application et du site THW, édités par Alexandre Ettori (micro-entreprise), 3 rue Maréchal Joffre, 92330 Sceaux — alexandre.et92@gmail.com. En créant un compte ou en utilisant le service, tu acceptes ces conditions." },
      { h: '2. Le service', p: "THW fournit un accompagnement sportif (planification, suivi, nutrition, récupération, assistant IA). Le service est proposé « en l'état » et évolue régulièrement." },
      { h: '3. Compte', p: "Tu dois avoir au moins 16 ans pour utiliser le service. Tu es responsable de la confidentialité de tes identifiants et de l'exactitude des informations fournies." },
      { h: '4. Avertissement santé — IMPORTANT', p: "THW n'est pas un service médical. Les recommandations d'entraînement, de nutrition et de l'assistant IA sont fournies à titre informatif et ne remplacent pas l'avis d'un professionnel de santé. Consulte un médecin avant de démarrer un programme, notamment en cas de pathologie, de blessure ou de doute. Tu pratiques sous ta propre responsabilité." },
      { h: '5. Abonnements et prix (CGV)', p: "Trois formules mensuelles sont proposées, avec un essai gratuit de 14 jours :", list: [
        'Premium — 14 €/mois',
        'Pro — 26 €/mois',
        'Expert — 49 €/mois',
      ], p2: "Prix en euros, TVA non applicable (article 293 B du CGI). Les paiements sont traités par Stripe ; nous ne conservons pas tes données bancaires." },
      { h: '6. Reconduction et résiliation', p: "L'abonnement est mensuel et reconduit tacitement à chaque échéance. Tu peux résilier à tout moment depuis l'application ; l'accès reste actif jusqu'à la fin de la période déjà payée. Aucun remboursement au prorata pour une période entamée, sauf disposition légale contraire." },
      { h: '7. Droit de rétractation', p: "Conformément à l'article L221-28 du Code de la consommation, en demandant l'accès immédiat au service numérique tu reconnais renoncer à ton droit de rétractation une fois l'exécution commencée. L'essai gratuit de 14 jours te permet de tester le service sans engagement avant tout paiement." },
      { h: '8. Utilisation acceptable', p: "Tu t'engages à ne pas détourner le service, le revendre, tenter d'y accéder frauduleusement, ni y publier de contenu illicite." },
      { h: '9. Propriété intellectuelle', p: "Le contenu, la marque, le design et les algorithmes de THW restent la propriété de l'éditeur. Tes données personnelles t'appartiennent." },
      { h: '10. Responsabilité', p: "Dans les limites permises par la loi, l'éditeur n'est pas responsable des dommages indirects liés à l'utilisation du service ni d'une interruption temporaire." },
      { h: '11. Médiation de la consommation', p: "En cas de litige non résolu, tu peux recourir gratuitement à un médiateur de la consommation (médiateur à désigner). Plateforme européenne de règlement des litiges : ec.europa.eu/consumers/odr." },
      { h: '12. Droit applicable', p: "Les présentes conditions sont régies par le droit français. À défaut de résolution amiable, les tribunaux français sont compétents. Contact : alexandre.et92@gmail.com." },
    ],
  },
};

function LegalPage(props) {
  var data = LEGAL_CONTENT[props.page] || LEGAL_CONTENT['confidentialite'];
  useReveal();
  var muted = { color: 'var(--text-mid)' };
  var para = { fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, lineHeight: 1.7, maxWidth: 660, textWrap: 'pretty', margin: 0, color: 'var(--text-mid)' };
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

          <h1 className="reveal" style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(32px, 4.6vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.03, color: 'var(--text)', marginBottom: 18 }}>
            {data.title}
          </h1>

          {data.intro && (
            <p className="reveal" style={{ ...para, fontSize: 16, marginBottom: 40 }}>{data.intro}</p>
          )}

          {data.sections.map(function (s, i) {
            return (
              <section key={i} className="reveal" style={{ marginBottom: 30 }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 12 }}>{s.h}</h2>
                {s.p && <p style={{ ...para, marginBottom: s.list ? 12 : 0 }}>{s.p}</p>}
                {s.list && (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0 }}>
                    {s.list.map(function (item, j) {
                      return (
                        <li key={j} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', ...para }}>
                          <span style={{ marginTop: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, boxShadow: '0 0 8px var(--brand)' }} />
                          <span>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {s.p2 && <p style={{ ...para, marginTop: 12 }}>{s.p2}</p>}
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
