/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Embarque les fichiers de doctrine (.md) dans les fonctions serverless
  // qui les lisent au runtime (fs), sinon Vercel ne les trace pas.
  outputFileTracingIncludes: {
    '/api/training-plan/**': ['./src/lib/coach/doctrine/**'],
    '/api/coach-stream/**': ['./src/lib/coach/doctrine/**'],
  },
  // Page « Découvrir » : export statique autonome servi tel quel depuis
  // public/decouvrir/index.html, exposé à l'URL propre /decouvrir.
  async rewrites() {
    return [{ source: '/decouvrir', destination: '/decouvrir/index.html' }]
  },
}

module.exports = nextConfig
