/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
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
  async redirects() {
    return [
      { source: '/decouvrir', destination: '/decouvrir/decouvrir.html', permanent: false },
    ]
  },
}

module.exports = nextConfig
