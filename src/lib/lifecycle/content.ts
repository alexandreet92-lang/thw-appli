export type Lang = 'fr' | 'en' | 'es' | 'it' | 'de'
export type StepId = 'welcome' | 'tests' | 'app'

export const STEPS: { id: StepId; afterDays: number; path: string }[] = [
  { id: 'welcome', afterDays: 0, path: '/tests.html' },
  { id: 'tests', afterDays: 3, path: '/test-de-forme.html' },
  { id: 'app', afterDays: 7, path: '/compte.html' },
]

interface Copy { subject: string; body: string[]; cta: string; unsub: string; hello: (n: string) => string }

const C: Record<Lang, Record<StepId, Omit<Copy, 'unsub' | 'hello'>> & { unsub: string; hello: (n: string) => string }> = {
  fr: {
    hello: n => (n ? `${n},` : 'Bonjour,'), unsub: 'Se désinscrire',
    welcome: { subject: 'Bienvenue chez THW', cta: 'Découvrir les tests', body: ['Ton compte THW est prêt.', 'Le plus simple pour démarrer : passe un test de forme. Chaque test a son barème par âge et ses vidéos explicatives.'] },
    tests: { subject: 'Où en est ta forme ?', cta: 'Faire le test de forme', body: ['Un test de forme prend peu de temps et te donne un point de départ clair.', 'Refais-le plus tard pour voir ta progression sur la courbe de ton compte.'] },
    app: { subject: 'Retrouve tes séances sur ton compte', cta: 'Ouvrir mon compte', body: ['Tes séances récentes, tes tests et ton abonnement sont réunis sur ton compte.', 'Connecte Strava dans l’application pour voir tes entraînements apparaître automatiquement.'] },
  },
  en: {
    hello: n => (n ? `${n},` : 'Hello,'), unsub: 'Unsubscribe',
    welcome: { subject: 'Welcome to THW', cta: 'Discover the tests', body: ['Your THW account is ready.', 'The easiest way to start: take a fitness test. Each test has an age-based scale and explanatory videos.'] },
    tests: { subject: 'How fit are you really?', cta: 'Take the fitness test', body: ['A fitness test takes little time and gives you a clear starting point.', 'Retake it later to see your progress on the curve in your account.'] },
    app: { subject: 'Find your sessions in your account', cta: 'Open my account', body: ['Your recent sessions, tests and subscription are gathered in your account.', 'Connect Strava in the app to see your workouts appear automatically.'] },
  },
  es: {
    hello: n => (n ? `${n},` : 'Hola,'), unsub: 'Darse de baja',
    welcome: { subject: 'Bienvenido a THW', cta: 'Descubrir los tests', body: ['Tu cuenta THW está lista.', 'Lo más sencillo para empezar: haz un test de forma. Cada test tiene su baremo por edad y vídeos explicativos.'] },
    tests: { subject: '¿Cómo está tu forma?', cta: 'Hacer el test de forma', body: ['Un test de forma lleva poco tiempo y te da un punto de partida claro.', 'Repítelo más adelante para ver tu progresión en la curva de tu cuenta.'] },
    app: { subject: 'Encuentra tus sesiones en tu cuenta', cta: 'Abrir mi cuenta', body: ['Tus sesiones recientes, tus tests y tu suscripción están reunidos en tu cuenta.', 'Conecta Strava en la app para ver tus entrenamientos aparecer automáticamente.'] },
  },
  it: {
    hello: n => (n ? `${n},` : 'Ciao,'), unsub: 'Annulla l’iscrizione',
    welcome: { subject: 'Benvenuto in THW', cta: 'Scopri i test', body: ['Il tuo account THW è pronto.', 'Il modo più semplice per iniziare: fai un test di forma. Ogni test ha la sua scala per età e video esplicativi.'] },
    tests: { subject: 'A che punto è la tua forma?', cta: 'Fai il test di forma', body: ['Un test di forma richiede poco tempo e ti dà un punto di partenza chiaro.', 'Rifallo più tardi per vedere i tuoi progressi nella curva del tuo account.'] },
    app: { subject: 'Ritrova le tue sessioni nel tuo account', cta: 'Apri il mio account', body: ['Le tue sessioni recenti, i test e l’abbonamento sono riuniti nel tuo account.', 'Collega Strava nell’app per vedere comparire automaticamente i tuoi allenamenti.'] },
  },
  de: {
    hello: n => (n ? `${n},` : 'Hallo,'), unsub: 'Abmelden',
    welcome: { subject: 'Willkommen bei THW', cta: 'Tests entdecken', body: ['Dein THW-Konto ist bereit.', 'Am einfachsten startest du mit einem Fitnesstest. Jeder Test hat eine Skala nach Alter und Erklärvideos.'] },
    tests: { subject: 'Wie fit bist du wirklich?', cta: 'Fitnesstest machen', body: ['Ein Fitnesstest dauert nicht lange und gibt dir einen klaren Ausgangspunkt.', 'Wiederhole ihn später, um deinen Fortschritt auf der Kurve in deinem Konto zu sehen.'] },
    app: { subject: 'Deine Einheiten in deinem Konto', cta: 'Mein Konto öffnen', body: ['Deine letzten Einheiten, Tests und dein Abo sind in deinem Konto vereint.', 'Verbinde Strava in der App, damit deine Trainings automatisch erscheinen.'] },
  },
}

export function copyFor(lang: string, step: StepId) {
  const l = (['fr', 'en', 'es', 'it', 'de'] as const).includes(lang as Lang) ? (lang as Lang) : 'fr'
  return { hello: C[l].hello, unsub: C[l].unsub, ...C[l][step] }
}
