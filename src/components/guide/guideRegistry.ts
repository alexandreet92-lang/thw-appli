// ══════════════════════════════════════════════════════════════════
// Registre du GUIDE APPLI — source de vérité unique.
// Chaque « action » = quelque chose que l'utilisateur peut vouloir faire,
// avec ses mots-clés (recherche floue) et ses ÉTAPES (le guide pas-à-pas :
// une flèche pointe l'élément `data-guide`, avec un message).
// ══════════════════════════════════════════════════════════════════

export type StepPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right'

export interface GuideStep {
  /** Valeur de l'attribut data-guide de l'élément à pointer. Absent = message centré. */
  anchor?: string
  /** Route à ouvrir AVANT d'afficher cette étape (le moteur navigue puis attend l'élément). */
  route?: string
  title?: string
  /** Texte d'introduction court (une phrase). Optionnel si `lines` est fourni. */
  message?: string
  /** Puces expliquées LIGNE PAR LIGNE, animées à l'apparition (l'une après l'autre). */
  lines?: string[]
  placement?: StepPlacement
  /** Nom de la PAGE de cette étape (affiché dans l'en-tête « Page X/N · <page> »).
   *  Si absent : déduit de `route`, sinon hérité de l'étape précédente. */
  page?: string
  /** 'click' : avance quand l'utilisateur clique vraiment la cible ; 'next' : via le bouton. */
  advanceOn?: 'click' | 'next'
  /** Rayon du halo autour de la cible (px). */
  pad?: number
  /** Ouvre un panneau de DÉMO (non enregistré) sur la page cible pour montrer une UI :
   *  le moteur émet l'évènement `thw:guide-demo` {id} ; la page l'ouvre, et le referme
   *  quand l'id change / à la fin du guide. */
  demo?: string
  /** Étape réservée aux comptes COACH (abonnement) — filtrée pour les athlètes. */
  coachOnly?: boolean
}

export interface GuideAction {
  id: string
  label: string
  keywords: string[]
  category: string
  steps: GuideStep[]
}

// ══════════════════════════════════════════════════════════════════
// TOURS DÉTAILLÉS PAR PAGE — le guide NAVIGUE sur la page, puis une flèche
// animée pointe CHAQUE élément et explique à quoi il sert. Non-bloquant :
// pendant le guide, on peut cliquer et utiliser la page librement, puis
// « Suivant » pour l'étape d'après. Cibles = attributs data-guide="…".
// ──────────────────────────────────────────────────────────────────

// PLANNING — détail complet : les 3 pastilles, créer une séance par sport,
// le type de journée (hard/mid…), la navigation, les plans A/B, le volume.
export const PLANNING_TOUR: GuideStep[] = [
  { route: '/planning', title: 'Le planning', message: 'Ta semaine d\'entraînement, jour par jour. On va tout voir — je t\'ouvre les vrais écrans au fur et à mesure.', lines: [
    'Créer une séance pour **chaque sport**',
    'Régler l\'**intensité** d\'un jour (récup → dur)',
    'Lire les **3 pastilles** d\'un jour',
    'Comparer tes **Plans A/B** et suivre ton **volume**',
  ] },
  { route: '/planning', anchor: 'plan-day', title: 'Créer une séance', lines: [
    'Chaque **colonne = un jour**',
    'Appuie sur un jour pour **ajouter** une séance',
    'Tu peux **glisser** une séance pour la déplacer',
  ] },
  { route: '/planning', demo: 'add-chooser', anchor: 'chooser-training', title: 'Qu\'ajouter sur ce jour ?', message: 'Trois choix s\'ouvrent :', lines: [
    '**Entraînement** — une séance (tous sports)',
    '**Course** — un objectif du calendrier (drapeau)',
    '**Test de forme** — VMA, FTP, CSS… relié à Performance',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-sport', title: 'Choisis ton sport', message: 'Chaque sport a son **propre constructeur** :', lines: [
    '**Course / Vélo** — allures ou watts + zones',
    '**Muscu / Hyrox** — exercices, séries, charges, stations',
    '**Boxe, Aviron, Natation, Mobilité…** aussi',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-type', title: 'Type de séance', lines: [
    'Course : **EF, SL1/SL2, Seuil, VMA, Sortie longue…**',
    'Ça **pré-cadre** les zones et l\'objectif',
    'Tu peux en **cumuler** plusieurs',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-blocks', title: 'Construire les blocs', lines: [
    '**Bloc simple** — une portion continue (ex. 20′ Z2)',
    '**Intervalle / Série** — répétitions effort/récup',
    'En extérieur : **Progressif**, **VMA / Strides**',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-zones', title: 'Zones d\'allure', lines: [
    'Calculées sur **tes tests** (VMA / seuil / FTP)',
    'Tu vois où tombe **chaque zone** avant de caler tes blocs',
    'Pas de test ? valeurs par défaut, à affiner dans **Performance**',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-profile', title: 'Profil d\'intensité', lines: [
    'Un **graphe** de ta séance : hauteur = intensité',
    'Tu vois l\'**enchaînement** effort/récup d\'un coup d\'œil',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-load', title: 'Charge estimée', lines: [
    '**SM métab** — charge métabolique (endurance)',
    '**SN neuro** — charge neuromusculaire (vitesse/force)',
    '+ **durée · distance · allure moy.** de la séance',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-mode', title: 'Manuel ou + IA', lines: [
    '**Manuel** — tu montes les blocs toi-même',
    '**+ IA** — décris ta séance, l\'IA **génère les blocs**',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-memo', title: 'Mémo & Dupliquer', lines: [
    '**Mémo** — une antisèche **imprimable** de la séance',
    '**Dupliquer** (en édition) — répète la séance sur **plusieurs semaines**',
    '…avec ajustement de **durée** ou de **%** à chaque répétition',
  ] },
  { route: '/planning', demo: 'builder-run', anchor: 'builder-add', title: 'Ajouter au planning', lines: [
    '**Ajouter →** enregistre la séance sur le jour choisi',
    'Tu choisis **Plan A ou B** en haut',
    'Tu peux fermer sans rien enregistrer si tu changes d\'avis',
  ] },
  { route: '/planning', anchor: 'plan-daytype', title: 'Type de journée', lines: [
    'La **pastille** autour du numéro = l\'intensité du jour',
    '**Récup · Léger · Modéré (mid) · Dur (hard)**',
    'Alterne dur/facile pour **bien répartir ta charge**',
  ] },
  { route: '/planning', anchor: 'plan-bubble', title: 'Les 3 pastilles d\'un jour', lines: [
    '**Course** — ton objectif (drapeau)',
    '**Séance planifiée** — à faire (titre, durée, RPE)',
    '**Activité réalisée** — déjà faite (synchro montre)',
  ] },
  { route: '/planning', anchor: 'plan-weeknav', title: 'Naviguer dans les semaines', lines: [
    'Les **flèches** changent de semaine',
    '« **Auj.** » revient à la semaine en cours',
    'Construis ton plan **plusieurs semaines à l\'avance**',
  ] },
  { route: '/planning', anchor: 'plan-abtoggle', title: 'Plan A / Plan B', lines: [
    '**Plan A** — ta semaine optimale',
    '**Plan B** — version minimale (semaines chargées)',
    '**Compare** les deux d\'un seul clic',
  ] },
  { route: '/planning', anchor: 'plan-volume', title: 'Volume de la semaine', lines: [
    'Total **réalisé vs prévu**, réparti par sport',
    'Ton **garde-fou** pour ne pas surcharger',
  ] },
  { route: '/planning', title: 'À toi de jouer', message: 'Tu sais tout sur le planning. Appuie sur un jour pour créer ta première séance.', lines: [
    'Relance ce guide via la **loupe** en haut',
    'Ou tape simplement ce que tu veux faire',
  ] },
]

// DASHBOARD « / » — forme, charge, sommeil, séances, accès rapides.
export const HOME_TOUR: GuideStep[] = [
  { route: '/', title: 'Ton tableau de bord', message: 'Ton point de départ chaque jour. Un coup d\'œil et tu sais comment tu vas et quoi faire.', lines: [
    'Ta **forme du jour** et ta **charge**',
    'Ton **sommeil** et ta **récup**',
    'Tes **prochaines séances** et **accès rapides**',
  ] },
  { route: '/', anchor: 'greeting', title: 'Ta salutation', message: 'Ton nom, la date et ton statut d\'abonnement — le contexte du jour.' },
  { route: '/', anchor: 'dash-model-switch', title: 'Deux vues du tableau de bord', lines: [
    '**Datas** — forme, charge, sommeil (data-driven)',
    '**Classique** — prochaines séances, dernière activité',
    'Bascule quand tu veux, on va voir les deux',
  ] },
  { route: '/', demo: 'dash:data', anchor: 'forme-arc', title: 'Forme du jour', lines: [
    'Ta **fraîcheur** (TSB) calculée sur ta charge réelle',
    'Vert = frais et prêt · rouge = fatigué',
    'La base pour décider : pousser ou lever le pied',
  ] },
  { route: '/', demo: 'dash:data', anchor: 'load-kpis', title: 'CTL · ATL · TSB', lines: [
    '**CTL** — ta forme de fond (charge chronique)',
    '**ATL** — ta fatigue récente (charge aiguë)',
    '**TSB** = CTL − ATL, ton équilibre du jour',
  ] },
  { route: '/', demo: 'dash:data', anchor: 'pmc-chart', title: 'Charge sur 4 semaines', lines: [
    'La courbe de ta **charge d\'entraînement**',
    'Tu vois si tu **montes**, **stagnes** ou **décharges**',
    'Clique dessus pour l\'historique complet',
  ] },
  { route: '/', demo: 'dash:data', anchor: 'sleep-card', title: 'Sommeil', lines: [
    'Durée + **stades** (profond, paradoxal, léger)',
    'Synchronisé depuis ta montre / capteur',
  ] },
  { route: '/', demo: 'dash:classique', anchor: 'next-sessions', title: 'Prochaines séances', lines: [
    'Ce qui t\'attend dans les prochains jours',
    'Clique une séance pour l\'ouvrir',
  ] },
  { route: '/', demo: 'dash:classique', anchor: 'last-activity', title: 'Dernière activité', lines: [
    'Ta séance la plus récente, en résumé',
    'Clique pour l\'analyse complète',
  ] },
  { route: '/', anchor: 'vitrine', title: 'Ma vitrine', lines: [
    'Ta **carte publique** : profil + activités',
    'Ce que voient les autres athlètes et un coach',
  ] },
  { route: '/', anchor: 'start-workout', title: 'Démarrer une séance', message: 'Le bouton pour lancer un entraînement en direct (GPS, capteurs, chrono). On y revient plus loin.' },
  { route: '/', anchor: 'app-search', title: 'La loupe = ce guide', lines: [
    'Tape ce que tu veux faire',
    'Je te montre où appuyer, comme maintenant',
  ] },
  { route: '/', anchor: 'open-ai', title: 'Ton assistant IA', message: 'Toujours à portée en haut à droite : analyses, plans, réponses. On l\'ouvrira en détail.' },
]

// PERFORMANCE — profil, records, zones, courbe, tests.
export const PERF_TOUR: GuideStep[] = [
  { route: '/performance', title: 'Performance', message: 'Tout ton niveau réel, mesuré et suivi dans le temps.', lines: [
    'Ton **profil** (VMA, FTP, CSS…) et tes **qualités**',
    'Tes **records** et ta **courbe de puissance**',
    'Tes **zones** et tes **tests**',
  ] },
  { route: '/performance', anchor: 'page-tabs', title: '3 onglets', lines: [
    '**Profil** — ton niveau et tes qualités',
    '**Datas** — records et courbes',
    '**Tests** — protocoles pour te mesurer',
  ] },
  { route: '/performance', demo: 'perf:profil', anchor: 'perf-profil-global', title: 'Profil global', lines: [
    'Tes valeurs clés : **VMA, seuil, FTP, CSS, FCmax…**',
    'Base de calcul de **toutes tes zones**',
  ] },
  { route: '/performance', demo: 'perf:profil', anchor: 'perf-analyze', title: 'Analyser avec l\'IA', message: 'L\'IA lit ton profil et te dit tes forces, tes manques et quoi travailler.' },
  { route: '/performance', demo: 'perf:profil', anchor: 'perf-profil-sport', title: 'Un profil par sport', lines: [
    'Course, Cyclisme, Natation, Hyrox…',
    'Chaque sport a ses qualités propres',
  ] },
  { route: '/performance', demo: 'perf:profil', anchor: 'perf-profil-radar', title: 'Profil de qualités', lines: [
    'Un **radar** : vitesse, endurance, seuil, force…',
    'Il **évolue** dans le temps — compare tes années',
  ] },
  { route: '/performance', demo: 'perf:profil', anchor: 'perf-profil-zones', title: 'Zones d\'intensité', lines: [
    '**FC**, **allure** ou **puissance** selon le sport',
    'Ce sont ces zones qu\'on utilise dans le planning',
  ] },
  { route: '/performance', demo: 'perf:tests', anchor: 'page-tabs', title: 'Onglet Tests', lines: [
    'Des **protocoles** par sport (VMA, FTP, CSS, Hyrox…)',
    'Tu fais le test → tes zones se **mettent à jour**',
    'Chaque test garde son **historique**',
  ] },
]

// ENTRAÎNEMENTS / activités — historique + analyse.
export const ACTIVITIES_TOUR: GuideStep[] = [
  { route: '/activities', title: 'Tes entraînements', message: 'L\'historique de tout ce que tu as réalisé, avec l\'analyse complète.', lines: [
    'Filtrer et retrouver une séance',
    'Ouvrir l\'**analyse** d\'une activité',
    'Suivre tes **KPIs** par sport',
  ] },
  { route: '/activities', anchor: 'page-tabs', title: '2 onglets', lines: [
    '**Données** — tes KPIs et ta charge',
    '**Analyse** — la liste de tes activités',
  ] },
  { route: '/activities', anchor: 'act-filters', title: 'Filtrer', lines: [
    'Cherche par **nom**, **sport**, ou entraînement/course',
    'Bascule liste / cartes / carte GPS',
  ] },
  { route: '/activities', anchor: 'act-row', title: 'Une activité', lines: [
    'Chaque ligne = une séance réalisée',
    'Clique pour l\'**analyse détaillée** : FC, puissance, allure, zones, laps',
  ] },
]

// CALENDRIER — objectifs, courses, phases.
export const CALENDAR_TOUR: GuideStep[] = [
  { route: '/calendar', title: 'Ton calendrier', message: 'La vue d\'ensemble de ta saison : objectifs, courses et phases de prépa.', lines: [
    'Ton **objectif principal** et son compte à rebours',
    'Tes **courses** placées dans l\'année',
    'Tes **phases** de préparation (périodisation)',
  ] },
  { route: '/calendar', anchor: 'cal-goal', title: 'Objectif de l\'année', lines: [
    'Ta course A et le **temps qui reste**',
    'Tout le plan se construit autour d\'elle',
  ] },
  { route: '/calendar', anchor: 'cal-view', title: 'Année ou Mois', lines: [
    '**Année** — vue macro de ta saison',
    '**Mois** — détail semaine par semaine',
    'Clique un **jour** pour ajouter une course, une phase ou un test',
  ] },
]

// BIBLIOTHÈQUE de séances.
export const SESSION_TOUR: GuideStep[] = [
  { route: '/session', title: 'Bibliothèque de séances', message: 'Un catalogue de séances prêtes à l\'emploi, par sport.', lines: [
    'Choisis un **sport**, puis une **catégorie**',
    'Filtre par filière, distance, durée, RPE',
    'Ajuste et **envoie-la dans ton planning**',
  ] },
  { route: '/session', anchor: 'lib-sport-grid', title: 'Choisis un sport', lines: [
    'Course, vélo, muscu, Hyrox, boxe…',
    'Chaque sport a ses familles de séances',
  ] },
  { route: '/session', anchor: 'page-tabs', title: 'Builder & Bibliothèque', lines: [
    '**Bibliothèque** — les séances toutes faites',
    '**Builder** — pour composer la tienne',
    'Une séance ouverte → **Ajouter au planning** (tu règles le niveau et le jour)',
  ] },
]

// NUTRITION — cibles, suivi, stratégie.
export const NUTRITION_TOUR: GuideStep[] = [
  { route: '/nutrition', title: 'Nutrition', message: 'Manger selon ta charge : des cibles claires et un suivi simple.', lines: [
    'Tes **cibles** kcal et macros du jour',
    'Ton **suivi** (repas, hydratation, poids)',
    'Ta **stratégie** adaptée à l\'entraînement',
  ] },
  { route: '/nutrition', anchor: 'page-tabs', title: '4 onglets', lines: [
    '**Aujourd\'hui** · **Plan** · **Suivi** · **Corps**',
  ] },
  { route: '/nutrition', demo: 'nutri:today', anchor: 'nutri-fueling', title: 'Cibles du jour', lines: [
    'Un **anneau** kcal + les **barres** de macros',
    'Consommé vs objectif, ajusté à ta séance du jour',
  ] },
  { route: '/nutrition', demo: 'nutri:today', anchor: 'nutri-day-meals', title: 'Repas du jour', lines: [
    'Ajoute tes repas — total mis à jour en direct',
    'Recherche d\'aliments et code-barres (mobile)',
  ] },
  { route: '/nutrition', demo: 'nutri:plan', anchor: 'nutri-targets', title: 'Cibles par type de jour', lines: [
    'Des cibles différentes : **récup / modéré / dur**',
    'Tu manges plus les jours durs, moins les jours off',
  ] },
  { route: '/nutrition', demo: 'nutri:plan', anchor: 'nutri-ai-plan', title: 'Plan généré par l\'IA', message: 'L\'IA construit ta stratégie sur 14 jours ; tu peux tout éditer.' },
  { route: '/nutrition', demo: 'nutri:tracking', anchor: 'nutri-tracking', title: 'Suivi & tendances', lines: [
    'Kcal, adhérence, protéines g/kg… sur la durée',
    'Pour voir si ta stratégie **tient dans le temps**',
  ] },
]

// BLESSURES.
export const INJURIES_TOUR: GuideStep[] = [
  { route: '/injuries', title: 'Blessures', message: 'Déclare, suis la guérison, et entraîne-toi sans casser.', lines: [
    '**Signaler** une gêne ou une blessure',
    'Suivre la **guérison** jour après jour',
    'Des **analyses** de prévention',
  ] },
  { route: '/injuries', anchor: 'inj-declare', title: 'Signaler', lines: [
    'Zone, sévérité (gêne → blessure), contexte',
    'Ça crée un suivi de guérison dédié',
  ] },
  { route: '/injuries', demo: 'inj:apercu', anchor: 'inj-stats', title: 'Disponibilité', lines: [
    'Ton état : **dispo**, **adapté** ou **repos conseillé**',
    'Les mouvements à éviter aujourd\'hui',
  ] },
  { route: '/injuries', demo: 'inj:analyse', anchor: 'inj-analytics', title: 'Analyses & prévention', lines: [
    'Zones **chroniques**, récidives, délai de retour',
    'Pour comprendre et **éviter la prochaine**',
  ] },
]

// RÉCUPÉRATION.
export const RECOVERY_TOUR: GuideStep[] = [
  { route: '/recovery', title: 'Récupération', message: 'Savoir quand pousser et quand lever le pied.', lines: [
    'Ton **readiness** du jour',
    'Ton **HRV** et ton **sommeil**',
    'Un **check-in** subjectif rapide',
  ] },
  { route: '/recovery', anchor: 'rec-readiness', title: 'Readiness du jour', lines: [
    'Un score /100 qui combine HRV, sommeil, ressenti',
    'Vert = vas-y · orange = allège',
  ] },
  { route: '/recovery', title: 'HRV, sommeil, check-in', message: 'Dans les onglets : ta variabilité cardiaque (HRV), tes nuits, la charge, et un check-in quotidien qui alimente ton readiness.', lines: [
    '**HRV** — l\'état de ton système nerveux',
    '**Check-in** — 4 curseurs, 20 secondes',
    '**Sources** — connecte ta montre / capteur',
  ] },
]

// COMMUNAUTÉ.
export const COMMUNITY_TOUR: GuideStep[] = [
  { route: '/community', title: 'Communauté', message: 'Des espaces façon Discord : échange, motive-toi, trouve un coach.', lines: [
    'Rejoins des **espaces** et leurs **canaux**',
    'Participe à des **événements / défis**',
    'Partage tes séances, trouve un **coach**',
  ] },
  { route: '/community', anchor: 'comm-spaces', title: 'Tes espaces', lines: [
    'Chaque icône = un **espace** (un groupe)',
    'La loupe pour en **découvrir**, + pour en **créer**',
  ] },
  { route: '/community', anchor: 'comm-channels', title: 'Les canaux', lines: [
    'À l\'intérieur d\'un espace : des **canaux** par thème',
    'Texte, annonces, et **vocal** (Pro+)',
  ] },
  { route: '/community', anchor: 'comm-events', title: 'Événements & défis', lines: [
    'Rejoins ou crée un **défi** collectif',
    'Classements et RSVP',
  ] },
  { route: '/community', anchor: 'comm-composer', title: 'Écris & partage', lines: [
    'Messages, mentions, réactions',
    'Partage une **séance** ou une **activité** dans le canal',
  ] },
]

// CONNEXIONS — montres, capteurs, services.
export const CONNECTIONS_TOUR: GuideStep[] = [
  { route: '/connections', title: 'Connexions', message: 'Branche tes appareils et services : tout se synchronise automatiquement.', lines: [
    'Montre / capteurs (FC, puissance, GPS)',
    'Services (Strava, Polar, santé…)',
    'Une fois relié, tes séances **remontent seules**',
  ] },
  { route: '/connections', title: 'Pourquoi connecter', message: 'Plus tu connectes, plus l\'app est juste : forme, zones, sommeil et HRV se calculent sur tes vraies données.' },
]

// MESSAGES — messagerie privée.
export const MESSAGES_TOUR: GuideStep[] = [
  { route: '/messages', title: 'Messages', message: 'Ta messagerie privée : échange avec ton coach et tes contacts.', lines: [
    'Conversations 1-à-1',
    'Statuts **envoyé / vu**, **modifier** et **supprimer**',
    'Pièces jointes, photo et dictée',
  ] },
]

// ASSISTANT IA — on ouvre le vrai panneau et on montre tout.
export const AI_TOUR: GuideStep[] = [
  { route: '/', demo: 'ai', title: 'Ton assistant IA', message: 'Ton coach de poche. Il connaît tes données et agit vraiment sur l\'app.', lines: [
    '**Analyse** tes séances et ta forme',
    'Crée des **plans** d\'entraînement et de **nutrition**',
    'Répond avec de **vrais graphiques**',
  ] },
  { route: '/', demo: 'ai', anchor: 'ai-input', title: 'Pose ta question', lines: [
    'Écris en langage naturel : « analyse ma semaine »',
    'Ou **dicte à la voix**',
    'Il a le contexte de TES données',
  ] },
  { route: '/', demo: 'ai', anchor: 'ai-send', title: 'Envoie', lines: [
    'Réponse en texte + **graphiques** (donut, radar, PMC, courbe…)',
    'Il peut **modifier ton planning ou ta nutrition** directement',
  ] },
  { route: '/', demo: 'ai', title: 'Les actions rapides', message: 'Des raccourcis pré-écrits pour les demandes courantes — un tap et c\'est parti.', lines: [
    'Analyser une séance, créer un plan, préparer une course…',
    'Rangées par **thèmes**',
    'Chaque action choisit le **bon modèle** toute seule',
  ] },
  { route: '/', demo: 'ai', title: 'Les modèles', message: 'Tu choisis la puissance de l\'IA selon la tâche.', lines: [
    'Un modèle **rapide** pour les questions simples',
    'Un modèle **avancé** pour l\'analyse et les plans',
    'Le bon compromis vitesse / profondeur',
  ] },
  { route: '/', demo: 'ai', anchor: 'ai-plus', title: 'Le menu Actions', lines: [
    'Joindre un **fichier** ou une capture',
    'Ouvrir les **Routines** et le **Studio**',
    'Lancer des flux avancés',
  ] },
  { route: '/', demo: 'ai', title: 'Plusieurs volets', message: 'Tu peux garder plusieurs conversations/volets en parallèle — une pour l\'analyse, une pour le plan — sans tout mélanger.' },
  { route: '/', demo: 'ai', title: 'Routines', message: 'Programme des actions IA récurrentes : bilan hebdo automatique, rappel d\'objectif, check du lundi… Elles tournent toutes seules et t\'envoient le résultat.' },
  { route: '/', demo: 'ai', title: 'Studio', message: 'Le canvas d\'orchestration multi-agents : enchaîne des étapes (analyser → décider → générer → appliquer) pour des tâches complexes, façon systèmes automatisés.' },
]

// DÉMARRER / live — on ouvre la page record.
export const START_TOUR: GuideStep[] = [
  { route: '/record', title: 'Démarrer une séance', message: 'Enregistre ton entraînement en direct — GPS, capteurs, chrono, guidage.', lines: [
    'Choisis ton **sport**',
    'Lance, l\'app **suit tout en direct**',
    'À la fin, la séance file dans tes **entraînements**',
  ] },
  { route: '/record', anchor: 'rec-sport', title: 'Choisis ton sport', lines: [
    'Course, vélo, natation, muscu, Hyrox, boxe, rameur…',
    'Chaque sport a son écran live adapté',
  ] },
  { route: '/record', anchor: 'rec-start', title: 'Le gros bouton Démarrer', lines: [
    'Lance la séance — libre ou une **séance planifiée**',
    'GPS pour l\'extérieur, capteurs FC/puissance en Bluetooth',
  ] },
  { route: '/record', title: 'Pendant la séance', message: 'L\'écran live t\'accompagne en temps réel, selon le sport.', lines: [
    '**Chrono**, distance, allure/puissance, FC en direct',
    'Le **bloc en cours** et le **prochain** (séances guidées)',
    'Muscu/Hyrox : séries, reps, **exercice suivant**',
    'Bouton **Terminer** → résumé + enregistrement auto',
  ] },
  { route: '/record', title: 'Après la séance', message: 'Tu retrouves ta séance dans Entraînements avec l\'analyse complète, et tes records se mettent à jour tout seuls.' },
]

// INTERFACE COACH — RÉSERVÉE aux comptes coach (abonnement). Toutes ces étapes
// portent coachOnly : elles sont filtrées pour les athlètes (jamais montrées ni
// routées vers /coach).
export const COACH_TOUR: GuideStep[] = [
  { route: '/', anchor: 'coach-toggle', coachOnly: true, title: 'Espace coach', message: 'Réservé aux comptes coach (abonnement). Ce bouton bascule vers ton espace pour gérer tes athlètes.' },
  { route: '/coach', coachOnly: true, title: 'Tableau de bord coach', message: 'Ta vue d\'ensemble : athlètes prioritaires, messages, et accès rapides.', lines: [
    'Athlètes **prioritaires** (à relancer, en risque…)',
    'Tuiles : Athlètes · Bibliothèque · Programmes · Studio',
  ] },
  { route: '/coach/athletes', anchor: 'roster-row', coachOnly: true, title: 'Ton roster', lines: [
    'La liste de tes athlètes, cherchables et filtrables',
    'Clique un athlète pour ouvrir sa **fiche complète**',
    'Invite un athlète avec un **code**',
  ] },
  { route: '/coach/athletes', coachOnly: true, title: 'Fiche athlète', message: 'Sur un athlète, tu vois SES données (identité ET données du bon athlète) et tu agis pour lui.', lines: [
    'Onglets : aperçu, fiche, data, objectifs, connexions',
    'Actions : message, plan, **analyse IA** de l\'athlète',
  ] },
  { route: '/coach/training', coachOnly: true, title: 'Training & Planning coach', message: 'Construis les séances et le planning d\'un athlète comme dans ton appli — mais pour lui.', lines: [
    'Mêmes constructeurs (course, muscu, Hyrox…)',
    'Blocs, zones, allures/watts sur l\'athlète ciblé',
  ] },
  { route: '/coach/studio', anchor: 'studio-run', coachOnly: true, title: 'Studio — passer à l\'échelle', lines: [
    'Choisis un **système** (plan, analyse, message…)',
    'Sélectionne **plusieurs athlètes**',
    'Lance-le sur tout le groupe d\'un coup',
  ] },
  { route: '/coach/programs', coachOnly: true, title: 'Programmes', message: 'Crée des programmes réutilisables, assigne-les à tes athlètes et publie-les (monétisation via Stripe).' },
  { route: '/coach/messages', coachOnly: true, title: 'Messagerie coach', message: 'Échange avec tes athlètes : messages, retours sur séances, suivi. Vu / envoyé, édition et suppression inclus.' },
]

// Pages qui ne se déduisent pas proprement de la route (panneaux ouverts
// au-dessus de l'accueil, sous-routes coach) → libellé explicite pour
// l'en-tête « Page X/N · <page> » du guide.
AI_TOUR.forEach(s => { s.page = s.page ?? 'Assistant IA' })
START_TOUR.forEach(s => { s.page = s.page ?? 'Démarrer' })
COACH_TOUR.forEach(s => { s.page = s.page ?? 'Espace coach' })

// ── Catalogue initial (étendu au fil de l'eau) ────────────────────
// Deux familles d'étapes :
//  • ACTION (« démarrer », « créer ») → on POINTE le bouton (où appuyer).
//  • NAVIGATION (« voir / ouvrir X ») → on VA sur la page (route) et on EXPLIQUE
//    son fonctionnement (message centré), sans pointer la nav.
export const GUIDE_ACTIONS: GuideAction[] = [
  {
    id: 'open-dashboard', label: 'Comprendre mon tableau de bord', category: 'Accueil',
    keywords: ['accueil', 'dashboard', 'tableau', 'forme', 'ctl', 'atl', 'tsb', 'charge', 'sommeil', 'vitrine'],
    steps: HOME_TOUR,
  },
  {
    id: 'start-workout', label: 'Démarrer / enregistrer une séance', category: 'Entraînement',
    keywords: ['démarrer', 'commencer', 'enregistrer', 'lancer', 'séance', 'entrainement', 'workout', 'live', 'chrono', 'record', 'gps'],
    steps: START_TOUR,
  },
  {
    id: 'open-planning', label: 'Voir / construire mon planning', category: 'Planning',
    keywords: ['planning', 'semaine', 'programme', 'plan', 'séances prévues', 'ajouter séance', 'bulles', 'type de journée', 'hard', 'mid'],
    steps: PLANNING_TOUR,
  },
  {
    id: 'add-session', label: 'Ajouter une séance au planning', category: 'Planning',
    keywords: ['ajouter', 'créer', 'nouvelle séance', 'planifier', 'programmer', 'fractionné', 'sortie', 'sport'],
    steps: [PLANNING_TOUR[1], PLANNING_TOUR[2], PLANNING_TOUR[3]],
  },
  {
    id: 'open-calendar', label: 'Planifier ma saison (calendrier)', category: 'Calendrier',
    keywords: ['calendrier', 'objectif', 'course', 'compétition', 'saison', 'phase', 'périodisation', 'année'],
    steps: CALENDAR_TOUR,
  },
  {
    id: 'open-library', label: 'Trouver une séance (bibliothèque)', category: 'Bibliothèque',
    keywords: ['bibliothèque', 'catalogue', 'séance prête', 'modèle', 'exercice', 'template'],
    steps: SESSION_TOUR,
  },
  {
    id: 'open-activities', label: 'Voir mes entraînements réalisés', category: 'Entraînements',
    keywords: ['activités', 'entrainements', 'historique', 'analyse', 'séances réalisées', 'strava', 'laps'],
    steps: ACTIVITIES_TOUR,
  },
  {
    id: 'open-performance', label: 'Voir mes performances et records', category: 'Performance',
    keywords: ['performance', 'records', 'progression', 'vma', 'ftp', 'puissance', 'allure', 'zones', 'profil', 'radar', 'tests'],
    steps: PERF_TOUR,
  },
  {
    id: 'open-nutrition', label: 'Gérer ma nutrition', category: 'Nutrition',
    keywords: ['nutrition', 'manger', 'calories', 'macros', 'protéines', 'poids', 'repas', 'stratégie', 'hydratation'],
    steps: NUTRITION_TOUR,
  },
  {
    id: 'open-injuries', label: 'Suivre mes blessures', category: 'Santé',
    keywords: ['blessure', 'douleur', 'santé', 'kiné', 'rééducation', 'prévention', 'guérison'],
    steps: INJURIES_TOUR,
  },
  {
    id: 'open-recovery', label: 'Suivre ma récupération', category: 'Santé',
    keywords: ['récupération', 'hrv', 'readiness', 'sommeil', 'fatigue', 'repos', 'check-in'],
    steps: RECOVERY_TOUR,
  },
  {
    id: 'ask-ai', label: 'Utiliser l\'assistant IA', category: 'Assistant',
    keywords: ['ia', 'assistant', 'coach', 'aide', 'question', 'analyse', 'conseil', 'plan d\'entrainement', 'studio', 'graphique'],
    steps: AI_TOUR,
  },
  {
    id: 'open-community', label: 'Découvrir la communauté', category: 'Communauté',
    keywords: ['communauté', 'social', 'amis', 'abonnés', 'découvrir', 'partager', 'club', 'défi', 'événement', 'canal'],
    steps: COMMUNITY_TOUR,
  },
  {
    id: 'open-connections', label: 'Connecter ma montre / mes capteurs', category: 'Connexions',
    keywords: ['connexions', 'montre', 'capteur', 'strava', 'polar', 'garmin', 'synchro', 'appareil', 'santé'],
    steps: CONNECTIONS_TOUR,
  },
  {
    id: 'open-messages', label: 'Envoyer un message', category: 'Messages',
    keywords: ['messages', 'messagerie', 'discussion', 'coach', 'contact', 'privé', 'écrire'],
    steps: MESSAGES_TOUR,
  },
  {
    id: 'open-coach', label: 'Découvrir l\'espace coach', category: 'Coach',
    keywords: ['coach', 'athlètes', 'roster', 'studio', 'programme', 'entraîneur', 'clients', 'suivi athlète'],
    steps: COACH_TOUR,
  },
]

// ── Recherche floue locale ────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
/** Score simple : correspondance sur libellé + mots-clés + catégorie. */
export function searchActions(query: string): GuideAction[] {
  const q = norm(query.trim())
  if (!q) return GUIDE_ACTIONS
  const terms = q.split(/\s+/).filter(Boolean)
  const scored = GUIDE_ACTIONS.map(a => {
    const hay = norm(`${a.label} ${a.category} ${a.keywords.join(' ')}`)
    let score = 0
    for (const t of terms) {
      if (hay.includes(t)) score += 2
      else if (a.keywords.some(k => norm(k).startsWith(t))) score += 1
    }
    if (norm(a.label).includes(q)) score += 3
    return { a, score }
  }).filter(x => x.score > 0).sort((x, y) => y.score - x.score)
  return scored.map(x => x.a)
}

// ── Tours d'onboarding ────────────────────────────────────────────
// Le tour NAVIGUE réellement sur chaque page et EXPLIQUE son fonctionnement
// (message centré sur la page ouverte), au lieu de pointer la navigation.
// VISITE EXPRESS — l'essentiel de chaque page (~25 étapes).
export const EXPRESS_TOUR: GuideStep[] = [
  { title: 'Bienvenue', message: 'L\'essentiel de l\'app en quelques minutes. On passe par chaque page clé — tu pourras tout revoir en détail via la loupe.' },
  HOME_TOUR[0], HOME_TOUR[3], HOME_TOUR[7], HOME_TOUR[11], HOME_TOUR[12],  // tableau de bord : forme, prochaines séances, loupe, IA
  PLANNING_TOUR[1], PLANNING_TOUR[2], PLANNING_TOUR[3], PLANNING_TOUR[12], // planning : créer, chooser, sport, type de journée
  CALENDAR_TOUR[0], CALENDAR_TOUR[2],                                       // calendrier
  SESSION_TOUR[0],                                                          // bibliothèque
  ACTIVITIES_TOUR[0], ACTIVITIES_TOUR[3],                                   // entraînements
  PERF_TOUR[0], PERF_TOUR[5],                                               // performance : profil + radar
  NUTRITION_TOUR[0], NUTRITION_TOUR[2],                                     // nutrition
  INJURIES_TOUR[0],                                                         // blessures
  RECOVERY_TOUR[0], RECOVERY_TOUR[1],                                       // récup
  COMMUNITY_TOUR[0],                                                        // communauté
  AI_TOUR[0], AI_TOUR[2],                                                   // IA
  START_TOUR[0],                                                            // démarrer
  { route: '/', anchor: 'coach-toggle', coachOnly: true, title: 'Espace coach', message: 'Si tu es coach, un espace dédié gère tes athlètes (visible en haut).' },
  { title: 'C\'est parti', message: 'Tu as l\'essentiel ! Pour creuser une page, tape ce que tu veux faire dans la loupe, ou lance la visite complète.' },
]

// VISITE COMPLÈTE — chaque page en détail, élément par élément (~90 étapes).
// On concatène tous les tours de page (chacun ouvre la page et pointe chaque élément).
export const FULL_TOUR: GuideStep[] = [
  { title: 'Bienvenue', message: 'On va faire le tour COMPLET de l\'app, page par page. Chaque page s\'ouvre, j\'ouvre les vrais écrans et une flèche pointe chaque fonctionnalité. Tu peux cliquer librement et passer à tout moment.' },
  ...HOME_TOUR,
  ...PLANNING_TOUR.slice(1, 17),   // planning détaillé (sans son intro/outro)
  ...CALENDAR_TOUR,
  ...SESSION_TOUR,
  ...ACTIVITIES_TOUR,
  ...PERF_TOUR,
  ...NUTRITION_TOUR,
  ...INJURIES_TOUR,
  ...RECOVERY_TOUR,
  ...COMMUNITY_TOUR,
  ...CONNECTIONS_TOUR,
  ...MESSAGES_TOUR,
  ...AI_TOUR,
  ...START_TOUR,
  ...COACH_TOUR,
  { title: 'Terminé', message: 'Tu as fait le tour complet ! Relance ce guide ou cherche une action précise à tout moment via la loupe en haut à droite.' },
]
