/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Embarque les fichiers de doctrine (.md) dans les fonctions serverless
  // qui les lisent au runtime (fs), sinon Vercel ne les trace pas.
  outputFileTracingIncludes: {
    '/api/training-plan/**': ['./src/lib/coach/doctrine/**'],
    '/api/coach-stream/**': ['./src/lib/coach/doctrine/**'],
  },
}

module.exports = nextConfig
