/* ════════════════════════════════════════════════════════════════
   THW — Pages légales & données.
   Un seul composant <LegalPage page="…"/> partagé par les 4 pages :
     • mentions-legales
     • confidentialite
     • conditions-utilisation
     • exporter-mes-donnees
   Réutilise <SiteHeader/> et <SiteFooter/> (SiteChrome.jsx).
   ════════════════════════════════════════════════════════════════ */

var LEGAL_PAGES = [
  { key: 'mentions-legales',        file: 'mentions-legales.html',        title: 'Mentions légales' },
  { key: 'confidentialite',         file: 'confidentialite.html',         title: 'Politique de confidentialité' },
  { key: 'conditions-utilisation',  file: 'conditions-utilisation.html',  title: "Conditions d'utilisation" },
  { key: 'exporter-mes-donnees',    file: 'exporter-mes-donnees.html',    title: 'Exporter mes données' },
];

var LEGAL_EMAIL = 'alexandre.et92@gmail.com';

/* Placeholder à compléter par l'éditeur — visuellement distinct. */
function Todo(props) {
  return <span className="legal-todo">{props.children}</span>;
}

function LegalMailto() {
  return <a href={'mailto:' + LEGAL_EMAIL}>{LEGAL_EMAIL}</a>;
}

/* ── Corps de chaque page ────────────────────────────────────────── */

function BodyMentions() {
  return (
    <React.Fragment>
      <section className="legal-block">
        <h2>Éditeur du site et de l'application</h2>
        <p>Alexandre Ettori — entrepreneur individuel (micro-entreprise)</p>
        <p>Adresse : 3 rue Maréchal Joffre, 92330 Sceaux</p>
        <p>Email : <LegalMailto/></p>
        <p>SIREN : <Todo>[SIREN]</Todo></p>
        <p>TVA : TVA non applicable, article 293 B du CGI (franchise en base).</p>
      </section>

      <section className="legal-block">
        <h2>Directeur de la publication</h2>
        <p>Alexandre Ettori.</p>
      </section>

      <section className="legal-block">
        <h2>Hébergeur du site</h2>
        <p>OVH SAS — 2 rue Kellermann, 59100 Roubaix, France — <a href="https://ovhcloud.com" target="_blank" rel="noopener">ovhcloud.com</a>.</p>
      </section>

      <section className="legal-block">
        <h2>Hébergement de l'application et des données</h2>
        <ul>
          <li>Application hébergée par Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA).</li>
          <li>Données stockées via Supabase (base de données hébergée dans l'Union européenne).</li>
        </ul>
      </section>

      <section className="legal-block">
        <h2>Contact</h2>
        <p>Pour toute question : <LegalMailto/>.</p>
      </section>
    </React.Fragment>
  );
}

function BodyConfidentialite() {
  return (
    <React.Fragment>
      <section className="legal-block">
        <h2>1. Qui sommes-nous ?</h2>
        <p>THW (« The Hybrid Way ») est une application de coaching sportif hybride (endurance + force) proposant un suivi d'entraînement, de la nutrition, de la récupération et un assistant IA. L'éditeur est Alexandre Ettori (micro-entreprise), 3 rue Maréchal Joffre, 92330 Sceaux. Pour toute question relative à tes données : <LegalMailto/>.</p>
      </section>

      <section className="legal-block">
        <h2>2. Quelles données nous collectons</h2>
        <ul>
          <li><strong>Compte &amp; identité</strong> : email, nom/prénom (facultatif), photo de profil (facultative), mot de passe (chiffré, jamais lisible par nous).</li>
          <li><strong>Données de profil sportif</strong> : taille, poids, sports pratiqués, objectifs, bio, préférences d'unités.</li>
          <li><strong>Données d'entraînement &amp; santé</strong> : séances, distances, durées, fréquence cardiaque, puissance, allure, récupération, blessures. Ces données peuvent constituer des <strong>données de santé</strong> ; elles sont traitées avec ton consentement explicite et pour te fournir le service.</li>
          <li><strong>Connexions tierces</strong> : si tu connectes un service externe (ex. Strava), les données que tu autorises à importer.</li>
          <li><strong>Paiement</strong> : gérées par notre prestataire <strong>Stripe</strong>. Nous ne stockons jamais ton numéro de carte.</li>
          <li><strong>Données d'usage &amp; techniques</strong> : logs, appareil, statistiques d'utilisation de l'assistant IA.</li>
        </ul>
      </section>

      <section className="legal-block">
        <h2>3. Pourquoi nous utilisons ces données (bases légales)</h2>
        <ul>
          <li>Fournir et personnaliser le service (exécution du contrat).</li>
          <li>Générer des recommandations et plans via l'assistant IA (exécution du contrat / consentement).</li>
          <li>Gérer l'abonnement et la facturation (obligation légale / contrat).</li>
          <li>Améliorer l'application et la sécurité (intérêt légitime).</li>
          <li>Traiter les données de santé/sport (<strong>consentement explicite</strong>, retirable à tout moment).</li>
        </ul>
      </section>

      <section className="legal-block">
        <h2>4. Assistant IA</h2>
        <p>Tes messages et le contexte d'entraînement pertinents sont transmis à notre fournisseur de modèles d'IA pour générer les réponses du coach. Ces échanges ne sont pas utilisés pour entraîner des modèles tiers sans ton accord.</p>
      </section>

      <section className="legal-block">
        <h2>5. Hébergement &amp; transferts</h2>
        <p>L'application est hébergée par Vercel ; les données sont stockées via Supabase dans l'Union européenne. Certains prestataires (paiement, IA) peuvent traiter des données hors UE avec des garanties appropriées (clauses contractuelles types).</p>
      </section>

      <section className="legal-block">
        <h2>6. Durée de conservation</h2>
        <p>Tes données sont conservées tant que ton compte est actif. À la suppression du compte, elles sont effacées sous 30 jours, sauf obligations légales (facturation : durée légale de conservation comptable).</p>
      </section>

      <section className="legal-block">
        <h2>7. Tes droits (RGPD)</h2>
        <p>Tu disposes des droits d'accès, de rectification, d'effacement, de portabilité, de limitation, d'opposition, et du retrait du consentement à tout moment. Tu peux exporter tes données depuis l'application (« <a href="exporter-mes-donnees.html">Exporter mes données</a> ») ou nous écrire à <LegalMailto/>. Tu peux aussi introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>
      </section>

      <section className="legal-block">
        <h2>8. Sécurité</h2>
        <p>Chiffrement en transit et au repos, contrôle d'accès par utilisateur (chaque personne n'accède qu'à ses propres données), mots de passe hachés.</p>
      </section>

      <section className="legal-block">
        <h2>9. Cookies</h2>
        <p>Nous n'utilisons que des cookies strictement nécessaires au fonctionnement du service. Si des outils de mesure d'audience sont ajoutés, un consentement te sera demandé.</p>
      </section>

      <section className="legal-block">
        <h2>10. Modifications</h2>
        <p>Nous pouvons mettre à jour cette politique ; la date en haut indique la dernière version.</p>
      </section>
    </React.Fragment>
  );
}

function BodyConditions() {
  return (
    <React.Fragment>
      <section className="legal-block">
        <h2>1. Objet et éditeur</h2>
        <p>Les présentes conditions régissent l'utilisation de l'application et du site THW, édités par Alexandre Ettori (micro-entreprise), 3 rue Maréchal Joffre, 92330 Sceaux — <LegalMailto/>. En créant un compte ou en utilisant le service, tu acceptes ces conditions.</p>
      </section>

      <section className="legal-block">
        <h2>2. Le service</h2>
        <p>THW fournit un accompagnement sportif (planification, suivi, nutrition, récupération, assistant IA). Le service est proposé « en l'état » et évolue régulièrement.</p>
      </section>

      <section className="legal-block">
        <h2>3. Compte</h2>
        <p>Tu dois avoir au moins <strong>16 ans</strong> pour utiliser le service. Tu es responsable de la confidentialité de tes identifiants et de l'exactitude des informations fournies.</p>
      </section>

      <section className="legal-block legal-callout">
        <h2>4. Avertissement santé — IMPORTANT</h2>
        <p>THW n'est <strong>pas un service médical</strong>. Les recommandations d'entraînement, de nutrition et de l'assistant IA sont fournies à titre informatif et ne remplacent pas l'avis d'un professionnel de santé. Consulte un médecin avant de démarrer un programme, notamment en cas de pathologie, de blessure ou de doute. Tu pratiques sous ta propre responsabilité.</p>
      </section>

      <section className="legal-block">
        <h2>5. Abonnements et prix (CGV)</h2>
        <p>Trois formules mensuelles sont proposées, avec un <strong>essai gratuit de 14 jours</strong> :</p>
        <ul>
          <li><strong>Premium</strong> — 14 €/mois</li>
          <li><strong>Pro</strong> — 26 €/mois</li>
          <li><strong>Expert</strong> — 49 €/mois</li>
        </ul>
        <p>Prix en euros, TVA non applicable (article 293 B du CGI). Les paiements sont traités par <strong>Stripe</strong> ; nous ne conservons pas tes données bancaires.</p>
      </section>

      <section className="legal-block">
        <h2>6. Reconduction et résiliation</h2>
        <p>L'abonnement est mensuel et <strong>reconduit tacitement</strong> à chaque échéance. Tu peux <strong>résilier à tout moment</strong> depuis l'application ; l'accès reste actif jusqu'à la fin de la période déjà payée. Aucun remboursement au prorata pour une période entamée, sauf disposition légale contraire.</p>
      </section>

      <section className="legal-block">
        <h2>7. Droit de rétractation</h2>
        <p>Conformément à l'article L221-28 du Code de la consommation, en demandant l'accès immédiat au service numérique tu reconnais renoncer à ton droit de rétractation une fois l'exécution commencée. L'<strong>essai gratuit de 14 jours</strong> te permet de tester le service sans engagement avant tout paiement.</p>
      </section>

      <section className="legal-block">
        <h2>8. Utilisation acceptable</h2>
        <p>Tu t'engages à ne pas détourner le service, le revendre, tenter d'y accéder frauduleusement, ni y publier de contenu illicite.</p>
      </section>

      <section className="legal-block">
        <h2>9. Propriété intellectuelle</h2>
        <p>Le contenu, la marque, le design et les algorithmes de THW restent la propriété de l'éditeur. Tes données personnelles t'appartiennent.</p>
      </section>

      <section className="legal-block">
        <h2>10. Responsabilité</h2>
        <p>Dans les limites permises par la loi, l'éditeur n'est pas responsable des dommages indirects liés à l'utilisation du service ni d'une interruption temporaire.</p>
      </section>

      <section className="legal-block">
        <h2>11. Médiation de la consommation</h2>
        <p>En cas de litige non résolu, tu peux recourir gratuitement à un médiateur de la consommation : <Todo>[nom + coordonnées du médiateur à désigner]</Todo>. Plateforme européenne de règlement des litiges : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>
      </section>

      <section className="legal-block">
        <h2>12. Droit applicable</h2>
        <p>Les présentes conditions sont régies par le droit français. À défaut de résolution amiable, les tribunaux français sont compétents.</p>
      </section>

      <p className="legal-contact"><strong>Contact</strong> : <LegalMailto/>.</p>
    </React.Fragment>
  );
}

function BodyExport() {
  return (
    <React.Fragment>
      <p className="legal-lead">Tes données t'appartiennent. Conformément au RGPD (droit à la portabilité), tu peux à tout moment télécharger une copie de tes données personnelles.</p>

      <section className="legal-block">
        <h2>Ce que contient l'export</h2>
        <ul>
          <li>Ton profil (identité, mensurations, préférences).</li>
          <li>Tes séances, activités et statistiques d'entraînement.</li>
          <li>Tes données de nutrition, récupération et blessures.</li>
          <li>L'historique de tes conversations avec l'assistant IA.</li>
        </ul>
      </section>

      <section className="legal-block">
        <h2>Comment l'obtenir</h2>
        <p>Depuis l'application : <strong>Profil → Confidentialité → Exporter mes données</strong>. Un fichier (format JSON) contenant l'ensemble de tes données est généré et téléchargé.</p>
      </section>

      <section className="legal-block">
        <h2>Format</h2>
        <p>Fichier structuré et lisible par machine (JSON), réutilisable pour transférer tes données vers un autre service.</p>
      </section>

      <section className="legal-block">
        <h2>Besoin d'aide ?</h2>
        <p>Écris-nous à <LegalMailto/> et nous te transmettrons une copie sous 30 jours.</p>
      </section>

      <p className="legal-note">(Pour supprimer définitivement tes données, utilise « Supprimer mon compte » dans l'application.)</p>
    </React.Fragment>
  );
}

var LEGAL_BODIES = {
  'mentions-legales':       { updated: null,             Body: BodyMentions },
  'confidentialite':        { updated: '6 juillet 2026', Body: BodyConfidentialite, updatedNote: '(à actualiser à chaque modification)' },
  'conditions-utilisation': { updated: '6 juillet 2026', Body: BodyConditions },
  'exporter-mes-donnees':   { updated: null,             Body: BodyExport },
};

/* ── Page complète ───────────────────────────────────────────────── */

function LegalPage(props) {
  var key = props.page;
  var meta = LEGAL_PAGES.find(function (p) { return p.key === key; });
  var conf = LEGAL_BODIES[key];
  var Body = conf.Body;

  React.useEffect(function () {
    document.title = meta.title + ' — THW Coaching';
  }, []);

  return (
    <React.Fragment>
      <SiteHeader active="legal"/>

      <main className="legal-main">
        <div className="legal-wrap">
          <nav className="legal-breadcrumb" aria-label="Fil d'ariane">
            <a href="decouvrir.html">Accueil</a>
            <span aria-hidden="true">/</span>
            <span className="legal-crumb-current">{meta.title}</span>
          </nav>

          <header className="legal-header">
            <h1>{meta.title}</h1>
            {conf.updated && (
              <p className="legal-updated">
                Dernière mise à jour : {conf.updated}
                {conf.updatedNote ? ' ' + conf.updatedNote : ''}
              </p>
            )}
          </header>

          <article className="legal-content">
            <Body/>
          </article>

          <nav className="legal-other" aria-label="Autres pages légales">
            <span className="legal-other-label">Voir aussi</span>
            <div className="legal-other-links">
              {LEGAL_PAGES.filter(function (p) { return p.key !== key; }).map(function (p) {
                return <a key={p.key} href={p.file}>{p.title}</a>;
              })}
            </div>
          </nav>
        </div>
      </main>

      <SiteFooter/>

      <style>{`
        .legal-main { position: relative; z-index: 1; padding: 40px 0 20px; }
        .legal-wrap { max-width: 760px; margin: 0 auto; padding: 0 24px; }

        .legal-breadcrumb {
          display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
          font-family: var(--font-body); font-size: 13px; color: var(--text-dim);
          margin-bottom: 34px;
        }
        .legal-breadcrumb a { color: var(--text-mid); text-decoration: none; transition: color .16s; }
        .legal-breadcrumb a:hover { color: var(--brand); }
        .legal-breadcrumb span[aria-hidden] { color: var(--text-dim); }
        .legal-crumb-current { color: var(--text); }

        .legal-header { margin-bottom: 34px; padding-bottom: 26px; border-bottom: 1px solid var(--border); }
        .legal-header h1 {
          font-family: var(--font-display); font-weight: 800;
          font-size: clamp(30px, 6vw, 46px); letter-spacing: -0.045em;
          line-height: 1.04; margin: 0; color: var(--text); text-wrap: balance;
        }
        .legal-updated { margin: 14px 0 0; font-family: var(--font-mono); font-size: 12.5px; color: var(--text-dim); }

        .legal-content { font-family: var(--font-body); color: var(--text-mid); }
        .legal-lead { font-size: clamp(15px, 2.4vw, 17px); line-height: 1.7; color: var(--text); margin: 0 0 8px; text-wrap: pretty; }
        .legal-block { margin: 30px 0; }
        .legal-block:first-child { margin-top: 4px; }
        .legal-block h2 {
          font-family: var(--font-display); font-weight: 700;
          font-size: clamp(17px, 3vw, 21px); letter-spacing: -0.02em;
          color: var(--text); margin: 0 0 12px;
        }
        .legal-content p { font-size: 15px; line-height: 1.72; margin: 0 0 12px; text-wrap: pretty; }
        .legal-content p:last-child { margin-bottom: 0; }
        .legal-content strong { color: var(--text); font-weight: 600; }
        .legal-content ul { list-style: none; margin: 0; padding: 0; }
        .legal-content ul li {
          position: relative; padding-left: 22px; margin: 0 0 11px;
          font-size: 15px; line-height: 1.66; text-wrap: pretty;
        }
        .legal-content ul li::before {
          content: ''; position: absolute; left: 3px; top: 10px;
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--brand);
        }
        .legal-content a { color: var(--brand); text-decoration: none; border-bottom: 1px solid color-mix(in oklab, var(--brand) 40%, transparent); transition: color .16s, border-color .16s; }
        .legal-content a:hover { color: var(--brand-vivid); border-bottom-color: var(--brand-vivid); }

        .legal-callout {
          background: color-mix(in oklab, var(--warning) 9%, var(--bg-card));
          border: 1px solid color-mix(in oklab, var(--warning) 34%, transparent);
          border-radius: var(--radius-lg); padding: 22px 24px;
        }
        .legal-callout h2 { color: color-mix(in oklab, var(--warning) 78%, var(--text)); }

        .legal-todo {
          display: inline-block; padding: 1px 8px; border-radius: 6px;
          font-family: var(--font-mono); font-size: 12.5px; font-weight: 500;
          color: color-mix(in oklab, var(--warning) 80%, var(--text));
          background: color-mix(in oklab, var(--warning) 14%, transparent);
          border: 1px dashed color-mix(in oklab, var(--warning) 45%, transparent);
        }

        .legal-contact { margin-top: 26px; }
        .legal-note { margin-top: 22px; font-size: 13.5px; color: var(--text-dim); font-style: italic; }

        .legal-other {
          margin-top: 52px; padding-top: 26px; border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 14px;
        }
        .legal-other-label {
          font-family: var(--font-body); font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim);
        }
        .legal-other-links { display: flex; flex-wrap: wrap; gap: 10px; }
        .legal-other-links a {
          display: inline-flex; align-items: center;
          padding: 9px 15px; border-radius: var(--radius-pill);
          background: var(--bg-card); border: 1px solid var(--border);
          font-family: var(--font-body); font-size: 13px; font-weight: 500;
          color: var(--text-mid); text-decoration: none; transition: all .16s;
        }
        .legal-other-links a:hover { color: var(--brand); border-color: color-mix(in oklab, var(--brand) 45%, transparent); background: var(--bg-hover); }

        @media (max-width: 600px) {
          .legal-main { padding-top: 26px; }
          .legal-wrap { padding: 0 18px; }
          .legal-callout { padding: 18px 18px; }
        }
      `}</style>
    </React.Fragment>
  );
}

window.LegalPage = LegalPage;
window.LEGAL_PAGES = LEGAL_PAGES;
