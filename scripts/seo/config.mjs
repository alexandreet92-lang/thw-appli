// Configuration SEO du site vitrine (public/site/). Une seule source de vérité.
export const ORIGIN = 'https://www.the-hybridway.com'

// Pages publiques : indexées, prérendues, dans le sitemap.
export const PUBLIC = [
  { file: 'index.html', path: '/', prio: 1.0, ld: ['org', 'website', 'app'] },
  { file: 'tests.html', path: '/tests.html', prio: 0.9, ld: ['crumb:Les tests Decaform'] },
  { file: 'cadences.html', path: '/cadences.html', prio: 0.9, ld: ['crumb:Decaform'] },
  { file: 'test-de-forme.html', path: '/test-de-forme.html', prio: 0.9, ld: ['crumb:Test de forme'] },
  { file: 'theme.html', path: '/theme.html', prio: 0.7, ld: ['crumb:Fonctionnalités'] },
  { file: 'app.html', path: '/app.html', prio: 0.7, ld: ['crumb:L\'application'],
    title: 'The THW Coaching app — AI coaching for hybrid athletes',
    description: 'Discover the THW Coaching app: AI coach, training plans, performance analysis, nutrition and recovery for endurance and strength athletes.' },
  { file: 'abonnement-athlete.html', path: '/abonnement-athlete.html', prio: 0.6, ld: ['crumb:Abonnements athlète'] },
  { file: 'abonnement-coach.html', path: '/abonnement-coach.html', prio: 0.5, ld: ['crumb:Abonnements coach'] },
  { file: 'support.html', path: '/support.html', prio: 0.4, ld: ['crumb:Support'] },
  { file: 'mentions-legales.html', path: '/mentions-legales.html', prio: 0.2, ld: [] },
  { file: 'confidentialite.html', path: '/confidentialite.html', prio: 0.2, ld: [] },
  { file: 'conditions-utilisation.html', path: '/conditions-utilisation.html', prio: 0.2, ld: [] },
]

// Pages privées ou doublons : noindex (et canonical vers la page de référence si doublon).
export const PRIVATE = [
  { file: 'compte.html' }, { file: 'statistiques.html' }, { file: 'prospection.html' }, { file: 'historique.html' },
  { file: 'login.html' }, { file: 'tests-perso.html' }, { file: 'questionnaire.html' },
  { file: 'coach-ia.html' }, { file: 'recharge-tokens.html' }, { file: 'exporter-mes-donnees.html' },
  { file: 'index-hero.html', canonical: '/' },
]

export const ORG = {
  '@type': 'Organization',
  '@id': ORIGIN + '/#organization',
  name: 'THW Coaching',
  alternateName: 'The Hybrid Way',
  url: ORIGIN + '/',
  logo: ORIGIN + '/logo.png',
  email: 'contact@the-hybridway.com',
}
