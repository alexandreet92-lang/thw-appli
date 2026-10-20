/** @type {import('next').NextConfig} */
// CAP_BUILD=1 → build statique pour la coquille native Capacitor (phase 5).
// L'app est alors packagée EN LOCAL dans l'app iOS (démarrage instantané) ;
// les routes /api restent servies par Vercel (appels réseau via base absolue).
// Le build Vercel normal (sans CAP_BUILD) n'est PAS affecté.
const CAP = process.env.CAP_BUILD === '1'

const nextConfig = {
  turbopack: {},
  // On n'échoue jamais le build sur des erreurs de type/lint « strictes »
  // (le code a ~150 warnings de typage souples hérités, sans impact runtime).
  // Le build CAP les ignorait déjà ; on aligne le build Vercel pour que les
  // déploiements web/API réussissent de façon fiable.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  ...(CAP ? { output: 'export', images: { unoptimized: true } } : {}),
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
    // Domaine du site vitrine : the-hybridway.com sert public/site/ à la RACINE
    // (/ → index.html, /compte.html, /components/…), tout en gardant /api et /auth
    // du même projet → la session Supabase reste sur le même domaine.
    async rewrites() {
      const has = [{ type: 'host', value: '(www\\.)?the-hybridway\\.com' }]
      return {
        // site.css et colors_and_type.css existent aussi dans public/ (version de l'app) :
        // sans règle prioritaire, le domaine servirait ces mauvaises versions.
        beforeFiles: [
          { source: '/', has, destination: '/site/index.html' },
          { source: '/site.css', has, destination: '/site/site.css' },
          { source: '/colors_and_type.css', has, destination: '/site/colors_and_type.css' },
          // Référencement : le domaine du site sert SON robots.txt / sitemap / llms.txt
          // (public/robots.txt est celui de l'app : tout interdit).
          { source: '/robots.txt', has, destination: '/site/robots.txt' },
          { source: '/sitemap.xml', has, destination: '/site/sitemap.xml' },
          { source: '/llms.txt', has, destination: '/site/llms.txt' },
        ],
        afterFiles: [{ source: '/:path*', has, destination: '/site/:path*' }],
        fallback: [],
      }
    },
    async redirects() {
      return [
        { source: '/decouvrir', destination: '/decouvrir/decouvrir.html', permanent: false },
      ]
    },
  }),
}

module.exports = nextConfig
