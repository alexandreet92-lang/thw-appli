// Construit public/site/components/prospection/prospection.bundle.js à partir de ProspectionClient.tsx.
// Usage : npx esbuild non requis en prod ; lancer `node scripts/prospection-site/build.mjs` (esbuild installé à la volée).
import { build } from 'esbuild'
import path from 'node:path'
const d = path.resolve('scripts/prospection-site')
await build({
  entryPoints: [d + '/entry.jsx'], bundle: true, minify: true, format: 'iife', jsx: 'automatic', outfile: 'public/site/components/prospection/prospection.bundle.js',
  alias: { 'react': d + '/react-shim.js', 'react/jsx-runtime': d + '/jsx-shim.js', 'react-dom/client': d + '/react-dom-client-shim.js', '@/lib/i18n': d + '/i18n-stub.js' },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info',
})
