/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Embarque les fichiers de doctrine (.md) dans les fonctions serverless
  // qui les lisent au runtime (fs), sinon Vercel ne les trace pas.
  outputFileTracingIncludes: {
    '/api/training-plan/**': ['./src/lib/coach/doctrine/**'],
    '/api/coach-stream/**': ['./src/lib/coach/doctrine/**'],
  },
  // Sert l'export autonome de la landing « Découvrir » (public/decouvrir/index.html)
  // à l'URL permanente /decouvrir. Next ne résout pas index.html pour un chemin
  // de dossier sous public/ : on rewrite explicitement.
  async rewrites() {
    return [{ source: '/decouvrir', destination: '/decouvrir/index.html' }]
  },
}

module.exports = nextConfig
