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

// ── Catalogue initial (étendu au fil de l'eau) ────────────────────
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
    keywords: ['planning', 'calendrier', 'semaine', 'programme', 'plan', 'séances prévues', 'ajouter séance'],
    steps: [
      { anchor: 'nav-planning', message: 'Ouvre ton planning : ta semaine d\'entraînement.', advanceOn: 'click', placement: 'right', route: '/planning' },
    ],
  },
  {
    id: 'add-session', label: 'Ajouter une séance au planning', category: 'Planning',
    keywords: ['ajouter', 'créer', 'nouvelle séance', 'planifier', 'programmer', 'fractionné', 'sortie'],
    steps: [
      { anchor: 'nav-planning', route: '/planning', message: 'D\'abord, ouvre le planning.', advanceOn: 'click', placement: 'right' },
      { message: 'Sur un jour, appuie sur « + » pour créer une séance, choisis le sport, puis construis les blocs (allures, watts, répétitions).', placement: 'auto' },
    ],
  },
  {
    id: 'open-performance', label: 'Voir mes performances et records', category: 'Performance',
    keywords: ['performance', 'records', 'progression', 'vma', 'ftp', 'puissance', 'allure', 'zones', 'profil'],
    steps: [
      { anchor: 'nav-performance', message: 'Ouvre Performance : tes records, zones, courbe de puissance et profil.', advanceOn: 'click', placement: 'right', route: '/performance' },
    ],
  },
  {
    id: 'open-nutrition', label: 'Gérer ma nutrition', category: 'Nutrition',
    keywords: ['nutrition', 'manger', 'calories', 'macros', 'protéines', 'poids', 'repas', 'stratégie'],
    steps: [
      { anchor: 'nav-nutrition', message: 'Ouvre Nutrition : tes cibles, ton suivi et ta stratégie.', advanceOn: 'click', placement: 'right', route: '/nutrition' },
    ],
  },
  {
    id: 'open-injuries', label: 'Suivre mes blessures', category: 'Santé',
    keywords: ['blessure', 'douleur', 'santé', 'récupération', 'kiné', 'rééducation', 'prévention'],
    steps: [
      { anchor: 'nav-injuries', message: 'Ouvre Blessures : historique, suivi et analyses de prévention.', advanceOn: 'click', placement: 'right', route: '/injuries' },
    ],
  },
  {
    id: 'ask-ai', label: 'Demander à l\'assistant IA', category: 'Assistant',
    keywords: ['ia', 'assistant', 'coach', 'aide', 'question', 'analyse', 'conseil', 'plan d\'entrainement'],
    steps: [
      { anchor: 'open-ai', message: 'Ouvre l\'assistant : il analyse tes données, crée des plans et répond à tes questions.', advanceOn: 'click', placement: 'bottom' },
    ],
  },
  {
    id: 'open-community', label: 'Découvrir la communauté', category: 'Communauté',
    keywords: ['communauté', 'social', 'amis', 'abonnés', 'découvrir', 'partager', 'coach', 'club'],
    steps: [
      { anchor: 'nav-community', message: 'Ouvre la communauté : activités des autres, coachs, clubs.', advanceOn: 'click', placement: 'right', route: '/community' },
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
export const EXPRESS_TOUR: GuideStep[] = [
  { message: 'Bienvenue ! Voici l\'essentiel en 30 secondes. Tu pourras revoir ce guide à tout moment via la loupe.', placement: 'auto' },
  { anchor: 'start-workout', message: 'Démarrer : lance et enregistre une séance en direct.', placement: 'bottom' },
  { anchor: 'nav-planning', message: 'Planning : construis et suis ta semaine d\'entraînement.', placement: 'right' },
  { anchor: 'nav-performance', message: 'Performance : tes records, zones et progression.', placement: 'right' },
  { anchor: 'open-ai', message: 'L\'assistant IA : analyses, plans et réponses à tes questions.', placement: 'bottom' },
]

// Le tour complet reprend l'express + une étape par page principale.
export const FULL_TOUR: GuideStep[] = [
  ...EXPRESS_TOUR,
  { anchor: 'nav-nutrition', message: 'Nutrition : cibles, suivi et stratégie alimentaire.', placement: 'right' },
  { anchor: 'nav-injuries', message: 'Blessures : historique, suivi et prévention.', placement: 'right' },
  { anchor: 'nav-community', message: 'Communauté : découvre les autres athlètes et les coachs.', placement: 'right' },
  { message: 'C\'est tout ! Utilise la loupe en haut à droite dès que tu ne sais pas où appuyer.', placement: 'auto' },
]
