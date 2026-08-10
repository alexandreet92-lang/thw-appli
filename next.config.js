/** @type {import('next').NextConfig} */
// CAP_BUILD=1 → build statique pour la coquille native Capacitor (phase 5).
// L'app est alors packagée EN LOCAL dans l'app iOS (démarrage instantané) ;
// les routes /api restent servies par Vercel (appels réseau via base absolue).
// Le build Vercel normal (sans CAP_BUILD) n'est PAS affecté.
const CAP = process.env.CAP_BUILD === '1'

const nextConfig = {
  turbopack: {},
  ...(CAP ? { output: 'export', images: { unoptimized: true }, eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } } : {}),
  // Cache-first (fluidité) : le cache du routeur client garde les pages déjà
  // visitées → revenir sur un écran récent est INSTANTANÉ (aucun aller-retour
  // serveur). dynamic = pages avec données ; static = pages figées.
  experimental: {
    staleTimes: { dynamic: 45, static: 300 },
  },
  // Embarque les fichiers de doctrine (.md) dans les fonctions serverless
  // qui les lisent au runtime (fs), sinon Vercel ne les trace pas.
  outputFileTracingIncludes: {
    '/api/training-plan/**': ['./src/lib/coach/doctrine/**'],
    '/api/coach-stream/**': ['./src/lib/coach/doctrine/**'],
  },
  // Page « Découvrir » : exports statiques autonomes (decouvrir.html + theme.html)
  // servis depuis public/decouvrir/. L'URL d'entrée /decouvrir redirige vers le
  // fichier dans le dossier, pour que les liens relatifs inter-pages
  // (theme.html#...) et les ancres résolvent bien sous /decouvrir/.
  ...(CAP ? {} : {
    async redirects() {
      return [
        { source: '/decouvrir', destination: '/decouvrir/decouvrir.html', permanent: false },
      ]
    },
  }),
}

module.exports = nextConfig
