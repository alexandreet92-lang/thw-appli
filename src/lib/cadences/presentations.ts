// ══════════════════════════════════════════════════════════════════
// CADENCES — présentation publique de chaque test (textes d'affichage).
// Tout ce que la page « Les tests » et la page détail d'un test affichent en
// plus de la config : accroche, public, durée, fréquence, matériel, sécurité.
// Les chiffres (épreuves, jours, points, âges) viennent de la config, jamais d'ici.
//
// Les durées, le matériel et les consignes des batteries autres que Decaform
// sont des PROPOSITIONS rédigées à partir des épreuves : à relire par Alexandre.
// ══════════════════════════════════════════════════════════════════

export type Audience = 'enfants' | 'ados' | 'adultes' | 'seniors'

export type GearGroup = { k: string; items: string[] }

export type Presentation = {
  audience: Audience
  /** « Enfants 8–10 ans » : l'étiquette de la carte. */
  audienceLabel: string
  tagline: string
  forWho: string
  /** Durée d'une séance d'épreuves, échauffement compris. */
  perDay: string
  /** Durée cumulée, en clair. */
  total: string
  frequency: string
  gear: GearGroup[]
  /** L'avertissement principal, affiché sur la page du test. */
  safety: string
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  enfants: 'Enfants',
  ados: 'Ados',
  adultes: 'Adultes',
  seniors: 'Seniors',
}

export const PRESENTATIONS: Record<string, Presentation> = {
  decaform: {
    audience: 'adultes',
    audienceLabel: 'Adultes 18–80 ans',
    tagline: 'Mesurez vraiment où vous en êtes, physiquement — et suivez vos progrès chaque année.',
    forWho: 'Des pratiquants réguliers ayant déjà un certain niveau — ce n’est pas un test pour débuter. 18 à 80 ans, hommes et femmes, avec un barème général ou ajusté à l’âge.',
    perDay: '1 h – 1 h 30',
    total: '10 à 13 h au total sur 12 jours',
    frequency: 'Une fois par an, toujours à la même période.',
    gear: [
      { k: 'Salle', items: ['Barre olympique + disques', 'Rack', 'Banc', 'Barre de traction + ceinture ou gilet de lest', 'Box (60 cm H / 40 cm F)', 'Rameur'] },
      { k: 'Extérieur', items: ['Piste de 400 m', 'Gazon', 'Plots', 'Mètre ruban', 'Chrono (idéalement cellules)'] },
      { k: 'Piscine', items: ['Bassin de 25 ou 50 m'] },
      { k: 'Vélo', items: ['Vélo ou home-trainer avec capteur de puissance'] },
    ],
    safety: 'Decaform demande des efforts intenses et maximaux. Consultez un médecin avant de tester, surtout après 40 ans ou en cas d’antécédent.',
  },
  start: {
    audience: 'adultes',
    audienceLabel: 'Adultes débutants 18–64 ans',
    tagline: 'La version accessible de Decaform : douze épreuves pour situer sa condition physique et progresser pas à pas.',
    forWho: 'Des adultes de 18 à 64 ans qui débutent ou reprennent. Des variantes accessibles sont prévues, et c’est la passerelle vers Decaform.',
    perDay: '45 min – 1 h',
    total: 'environ 3 à 4 h au total sur 4 jours',
    frequency: 'Une à deux fois par an, à la même période.',
    gear: [
      { k: 'Terrain', items: ['Piste ou parcours plat de 100 m', 'Plots', 'Chrono'] },
      { k: 'Salle', items: ['Rameur', 'Barre de traction ou sangle', 'Box ou marche de 40 à 60 cm', 'Tapis'] },
    ],
    safety: 'Les épreuves se règlent à votre niveau. En cas de doute, ou si vous reprenez après une longue pause, demandez l’avis d’un médecin.',
  },
  forme: {
    audience: 'adultes',
    audienceLabel: 'Adultes 18–80 ans, tous niveaux',
    tagline: 'Deux épreuves sans matériel, le même jour : une course navette de 20 m au rythme de bips, puis un circuit au poids du corps chronométré.',
    forWho: 'Tout adulte en bonne santé, quel que soit son niveau. Aucun équipement à acheter : deux plots, un espace de 25 m et votre téléphone. Une sangle cardio Bluetooth est possible, jamais obligatoire.',
    perDay: '35 – 60 min',
    total: 'une seule séance, échauffement et récupération compris',
    frequency: 'Deux à quatre fois par an, dans les mêmes conditions.',
    gear: [
      { k: 'Terrain', items: ['2 plots à 20 m', 'Espace plat de 25 m', 'Téléphone ou ordinateur avec le son'] },
      { k: 'Facultatif', items: ['Sangle cardio Bluetooth (Chrome sur ordinateur ou Android)', 'Un partenaire qui lance chaque exercice'] },
    ],
    safety: 'Efforts intenses : avis médical conseillé avant de commencer, surtout après 40 ans ou en cas d’antécédent cardiaque. On arrête à la moindre douleur, vertige ou gêne dans la poitrine.',
  },
  senior: {
    audience: 'seniors',
    audienceLabel: 'Seniors 65 ans et +',
    tagline: 'Un test de condition physique pensé pour l’autonomie : force, endurance, équilibre et souplesse.',
    forWho: 'Des personnes de 65 ans et plus. Les épreuves s’inspirent des tests de référence en gériatrie et se font en sécurité, chacun à son rythme.',
    perDay: '30 – 45 min',
    total: 'environ 2 h au total sur 3 jours',
    frequency: 'Une à deux fois par an, pour suivre l’évolution.',
    gear: [
      { k: 'Intérieur', items: ['Chaise stable sans accoudoirs', 'Haltère léger ou bouteille', 'Chrono', 'Mètre ruban'] },
      { k: 'Extérieur', items: ['Espace plat pour la marche de 6 minutes'] },
    ],
    safety: 'Pas d’effort maximal. Faites-vous accompagner, et arrêtez au moindre vertige, essoufflement anormal ou douleur. Avis médical conseillé avant de commencer.',
  },
  kids_8_10: {
    audience: 'enfants',
    audienceLabel: 'Enfants 8–10 ans',
    tagline: 'Un test ludique pour mesurer vitesse, coordination et condition physique des 8–10 ans, sans matériel lourd.',
    forWho: 'Des enfants de 8 à 10 ans, filles et garçons, sportifs ou non. Des épreuves courtes, jamais d’effort maximal dangereux, encadrées par un adulte.',
    perDay: '30 – 45 min',
    total: 'environ 2 h au total sur 3 jours',
    frequency: 'Une fois par an, à la même période.',
    gear: [
      { k: 'Terrain', items: ['Espace plat de 20 m', 'Plots', 'Mètre ruban', 'Chrono'] },
      { k: 'Intérieur', items: ['Tapis'] },
    ],
    safety: 'Un adulte encadre chaque épreuve. On arrête à la moindre douleur : ce n’est pas une compétition.',
  },
  kids_11_12: {
    audience: 'enfants',
    audienceLabel: 'Enfants 11–12 ans',
    tagline: 'Un test complet mais sans danger pour les 11–12 ans : courses, sauts, force et coordination.',
    forWho: 'Des enfants de 11 à 12 ans, filles et garçons. Des épreuves adaptées à leur âge, sans charge lourde, encadrées par un adulte.',
    perDay: '30 – 45 min',
    total: 'environ 2 h au total sur 3 jours',
    frequency: 'Une fois par an, à la même période.',
    gear: [
      { k: 'Terrain', items: ['Espace plat de 20 m', 'Plots', 'Mètre ruban', 'Chrono'] },
      { k: 'Intérieur', items: ['Tapis'] },
    ],
    safety: 'Un adulte encadre chaque épreuve. Pas de charge lourde, pas d’effort maximal : on arrête à la moindre douleur.',
  },
  teens_13_14: {
    audience: 'ados',
    audienceLabel: 'Ados 13–14 ans',
    tagline: 'Le test des 13–14 ans : au poids du corps, avec un peu de natation pour l’endurance.',
    forWho: 'Des adolescents de 13 à 14 ans. Les épreuves se font au poids du corps ; des variantes sans matériel sont prévues.',
    perDay: '45 min – 1 h',
    total: 'environ 2 h 30 au total sur 3 jours',
    frequency: 'Une fois par an, à la même période.',
    gear: [
      { k: 'Terrain', items: ['Espace plat de 30 m', 'Plots', 'Chrono'] },
      { k: 'Piscine', items: ['Bassin de 25 m'] },
    ],
    safety: 'Pas de charge maximale. Technique avant performance, et on arrête à la moindre douleur.',
  },
  teens_15_17: {
    audience: 'ados',
    audienceLabel: 'Ados 15–17 ans',
    tagline: 'Le test des 15–17 ans : piste, salle et piscine, avec une première charge encadrée.',
    forWho: 'Des adolescents de 15 à 17 ans, avec la salle et la piscine à portée. Des variantes sans matériel sont prévues.',
    perDay: '45 min – 1 h',
    total: 'environ 3 h au total sur 3 jours',
    frequency: 'Une fois par an, à la même période.',
    gear: [
      { k: 'Piste', items: ['Piste ou terrain plat de 100 m', 'Plots', 'Chrono'] },
      { k: 'Salle', items: ['Barre et disques', 'Banc', 'Rameur', 'Haltères'] },
      { k: 'Piscine', items: ['Bassin de 25 m'] },
    ],
    safety: 'Charge encadrée, jamais de maximum absolu : la technique passe toujours avant la charge ou le chrono.',
  },
}

export function presentationOf(testKey: string | null | undefined): Presentation {
  return PRESENTATIONS[testKey ?? 'decaform'] ?? PRESENTATIONS.decaform
}
