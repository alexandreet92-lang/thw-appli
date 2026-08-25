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
  message: string
  placement?: StepPlacement
  /** 'click' : avance quand l'utilisateur clique vraiment la cible ; 'next' : via le bouton. */
  advanceOn?: 'click' | 'next'
  /** Rayon du halo autour de la cible (px). */
  pad?: number
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
  { route: '/planning', title: 'Ton planning', message: 'Le planning, c\'est ta semaine d\'entraînement, jour par jour. On va voir ensemble chaque élément : créer une séance pour chaque sport, régler l\'intensité d\'un jour, lire les 3 pastilles, naviguer entre les semaines et gérer tes plans A/B. Tu peux cliquer librement pendant le guide.' },
  { route: '/planning', anchor: 'plan-day', title: 'Créer une séance', message: 'Chaque colonne = un jour. Appuie sur un jour pour créer une séance : tu choisis d\'abord le SPORT (course, vélo, Hyrox, muscu, boxe, aviron…). Chaque sport ouvre son constructeur dédié — allures & zones pour la course, watts pour le vélo, exercices & séries pour la muscu, stations pour l\'Hyrox. Tu montes ensuite la séance bloc par bloc.' },
  { route: '/planning', anchor: 'plan-daytype', title: 'Type de journée (hard / mid…)', message: 'La pastille colorée autour du numéro fixe l\'intensité du jour : récup, léger, modéré (mid) ou dur (hard). Appuie dessus pour la changer. Elle t\'aide à alterner jours durs et faciles et à répartir ta charge intelligemment sur la semaine.' },
  { route: '/planning', anchor: 'plan-bubble', title: 'Les 3 pastilles d\'un jour', message: 'Un jour peut afficher 3 pastilles différentes : une pastille COURSE (ton objectif du calendrier, avec un drapeau), une SÉANCE PLANIFIÉE (ce que tu dois faire — titre, durée, RPE) et une ACTIVITÉ RÉALISÉE (ce que tu as fait, synchronisé depuis ta montre). Appuie sur l\'une d\'elles pour l\'ouvrir en détail.' },
  { route: '/planning', anchor: 'plan-weeknav', title: 'Naviguer dans les semaines', message: 'Avec les flèches, passe d\'une semaine à l\'autre pour construire ton plan à l\'avance ; le bouton « Auj. » te ramène à la semaine en cours. Tu peux aussi choisir le nombre de semaines affichées.' },
  { route: '/planning', anchor: 'plan-abtoggle', title: 'Plan A / Plan B', message: 'Garde deux versions de ta semaine — Plan A (optimal) et Plan B (minimal, pour les semaines chargées) — puis bascule ou compare-les. Idéal quand tu ne sais pas encore combien tu pourras t\'entraîner.' },
  { route: '/planning', anchor: 'plan-volume', title: 'Volume de la semaine', message: 'Ici, le volume total de la semaine — réalisé vs prévu — réparti par sport. C\'est ton garde-fou pour ne pas surcharger et suivre l\'évolution de ta charge.' },
  { route: '/planning', title: 'À toi de jouer', message: 'Appuie sur n\'importe quel jour pour créer ta première séance. Tu peux rouvrir ce guide à tout moment via la loupe en haut à droite, ou taper ce que tu veux faire.' },
]

// ── Catalogue initial (étendu au fil de l'eau) ────────────────────
// Deux familles d'étapes :
//  • ACTION (« démarrer », « créer ») → on POINTE le bouton (où appuyer).
//  • NAVIGATION (« voir / ouvrir X ») → on VA sur la page (route) et on EXPLIQUE
//    son fonctionnement (message centré), sans pointer la nav.
export const GUIDE_ACTIONS: GuideAction[] = [
  {
    id: 'start-workout', label: 'Démarrer / enregistrer une séance', category: 'Entraînement',
    keywords: ['démarrer', 'commencer', 'enregistrer', 'lancer', 'séance', 'entrainement', 'workout', 'live', 'chrono', 'record'],
    steps: [
      { anchor: 'start-workout', message: 'Clique ici pour démarrer et enregistrer une séance en direct.', advanceOn: 'click', placement: 'bottom' },
    ],
  },
  {
    id: 'open-planning', label: 'Voir / construire mon planning', category: 'Planning',
    keywords: ['planning', 'calendrier', 'semaine', 'programme', 'plan', 'séances prévues', 'ajouter séance', 'bulles', 'type de journée', 'hard', 'mid'],
    steps: PLANNING_TOUR,
  },
  {
    id: 'add-session', label: 'Ajouter une séance au planning', category: 'Planning',
    keywords: ['ajouter', 'créer', 'nouvelle séance', 'planifier', 'programmer', 'fractionné', 'sortie', 'sport'],
    steps: [PLANNING_TOUR[1], PLANNING_TOUR[2]],
  },
  {
    id: 'open-performance', label: 'Voir mes performances et records', category: 'Performance',
    keywords: ['performance', 'records', 'progression', 'vma', 'ftp', 'puissance', 'allure', 'zones', 'profil'],
    steps: [
      { route: '/performance', message: 'Voici Performance : tes records par distance, tes zones d\'intensité, ta courbe de puissance et ton profil de qualités qui évolue dans le temps. Saisis tes tests pour affiner tes zones et suivre ta progression.' },
    ],
  },
  {
    id: 'open-nutrition', label: 'Gérer ma nutrition', category: 'Nutrition',
    keywords: ['nutrition', 'manger', 'calories', 'macros', 'protéines', 'poids', 'repas', 'stratégie'],
    steps: [
      { route: '/nutrition', message: 'Voici Nutrition : tes cibles caloriques et macros, ton suivi quotidien (repas, poids) et ta stratégie alimentaire adaptée à ta charge d\'entraînement.' },
    ],
  },
  {
    id: 'open-injuries', label: 'Suivre mes blessures', category: 'Santé',
    keywords: ['blessure', 'douleur', 'santé', 'récupération', 'kiné', 'rééducation', 'prévention'],
    steps: [
      { route: '/injuries', message: 'Voici Blessures : déclare une blessure, suis sa guérison, et consulte les analyses (zones chroniques, prévention, disponibilité) pour t\'entraîner sans casser.' },
    ],
  },
  {
    id: 'ask-ai', label: 'Demander à l\'assistant IA', category: 'Assistant',
    keywords: ['ia', 'assistant', 'coach', 'aide', 'question', 'analyse', 'conseil', 'plan d\'entrainement'],
    steps: [
      { anchor: 'open-ai', message: 'Clique ici pour ouvrir l\'assistant : il analyse tes données, crée des plans et répond à tes questions.', advanceOn: 'click', placement: 'bottom' },
    ],
  },
  {
    id: 'open-community', label: 'Découvrir la communauté', category: 'Communauté',
    keywords: ['communauté', 'social', 'amis', 'abonnés', 'découvrir', 'partager', 'coach', 'club'],
    steps: [
      { route: '/community', message: 'Voici la communauté : découvre les activités des autres athlètes, suis des amis, échange dans les espaces et trouve un coach.' },
    ],
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
const HOME_STEP: GuideStep = { route: '/', title: 'Ton tableau de bord', message: 'Ici, ta forme du jour (CTL/ATL/TSB), ta charge sur 4 semaines, ton sommeil et des accès rapides. C\'est ton point de départ chaque jour.' }
const PLANNING_STEP: GuideStep = { route: '/planning', title: 'Planning', message: 'Ta semaine d\'entraînement. Ajoute une séance sur un jour avec « + », choisis le sport, construis les blocs (allures, watts, répétitions), et glisse-les pour réorganiser. Tu peux dupliquer une séance sur plusieurs semaines.' }
const PERF_STEP: GuideStep = { route: '/performance', title: 'Performance', message: 'Tes records par distance, tes zones d\'intensité, ta courbe de puissance et ton profil de qualités qui évolue dans le temps. Saisis tes tests pour affiner tes zones.' }
const AI_STEP: GuideStep = { anchor: 'open-ai', title: 'Assistant IA', message: 'Ton coach IA : il analyse tes données, crée des plans d\'entraînement complets et répond à tes questions avec des graphiques. Clique sur son icône en haut à droite pour l\'ouvrir.', placement: 'bottom' }

export const EXPRESS_TOUR: GuideStep[] = [
  { title: 'Bienvenue', message: 'Voici l\'essentiel en 1 minute. On va parcourir les pages clés ensemble — tu pourras relancer ce guide à tout moment via la loupe.' },
  HOME_STEP,
  PLANNING_STEP,
  PLANNING_TOUR[1],   // « Créer une séance » — flèche sur un jour
  PERF_STEP,
  AI_STEP,
  { title: 'C\'est parti', message: 'Tu as l\'essentiel ! Utilise la loupe en haut à droite dès que tu ne sais pas où appuyer, ou tape ce que tu veux faire.' },
]

// Le tour complet reprend l'express + les autres pages, chacune ouverte + expliquée.
// Le PLANNING est détaillé élément par élément (les 3 pastilles, créer une séance
// par sport, type de journée hard/mid, navigation, plans A/B, volume).
export const FULL_TOUR: GuideStep[] = [
  { title: 'Bienvenue', message: 'On va faire le tour complet de l\'app, page par page. À chaque étape, la page s\'ouvre et je t\'explique comment elle marche, avec une flèche sur chaque élément. Tu peux cliquer librement et passer à tout moment.' },
  HOME_STEP,
  ...PLANNING_TOUR.slice(1, 7),   // détail Planning (sans son intro/outro propres)
  { route: '/calendar', title: 'Calendrier', message: 'Ta vue d\'ensemble : tes objectifs, tes courses et tes phases de préparation dans le temps.' },
  { route: '/session', title: 'Bibliothèque de séances', message: 'Un catalogue de séances prêtes (par sport, niveau, objectif). Choisis-en une, ajuste-la et ajoute-la à ton planning.' },
  { route: '/activities', title: 'Entraînements', message: 'L\'historique de tes séances réalisées, avec toutes les données (FC, puissance, allure, zones) et l\'analyse de chaque activité.' },
  PERF_STEP,
  { route: '/nutrition', title: 'Nutrition', message: 'Tes cibles caloriques et macros, ton suivi quotidien (repas, poids) et ta stratégie alimentaire adaptée à ta charge.' },
  { route: '/injuries', title: 'Blessures', message: 'Déclare et suis tes blessures, avec un historique et des analyses de prévention pour t\'entraîner sans casser.' },
  { route: '/recovery', title: 'Récupération', message: 'Ton HRV, ton sommeil et ta readiness du jour — pour savoir quand pousser et quand lever le pied.' },
  { route: '/community', title: 'Communauté', message: 'Découvre les activités des autres athlètes, suis des amis, échange dans les espaces et trouve un coach.' },
  AI_STEP,
  { title: 'Terminé', message: 'Tu as fait le tour ! Relance ce guide ou cherche une action précise à tout moment via la loupe en haut à droite.' },
]
