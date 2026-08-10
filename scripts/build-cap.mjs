#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
// Build de l'app en STATIQUE pour la coquille native Capacitor (phase 5).
// Produit `out/` = tous les écrans packagés en local (démarrage instantané).
// Les routes /api + le middleware sont écartés le temps du build (ils restent
// servis par Vercel ; l'app les appelle via l'URL absolue configurée dans
// NEXT_PUBLIC_API_BASE). Restaure tout à la fin, même en cas d'erreur.
// Usage : node scripts/build-cap.mjs
// ══════════════════════════════════════════════════════════════════════════
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const HIDE = path.join(ROOT, '.cap-build-hidden')
const MOVES = [
  ['src/app/api', 'api'],
  ['src/app/auth/callback', 'auth-callback'], // handler OAuth serveur (reste sur Vercel)
  ['src/app/admin', 'admin'],                 // page admin serveur, inutile dans l'app mobile
  ['src/middleware.ts', 'middleware.ts'],
]

// Patch texte : layout global en force-static le temps de l'export (restauré après).
const LAYOUT = path.join(ROOT, 'src/app/layout.tsx')
let layoutOrig = null
function patchLayout() {
  layoutOrig = fs.readFileSync(LAYOUT, 'utf8')
  fs.writeFileSync(LAYOUT, layoutOrig.replace(
    "export const dynamic = 'force-dynamic'",
    "export const dynamic = 'force-static'"
  ))
}
function unpatchLayout() {
  if (layoutOrig != null) { fs.writeFileSync(LAYOUT, layoutOrig); layoutOrig = null }
}

function hide() {
  fs.mkdirSync(HIDE, { recursive: true })
  for (const [rel, name] of MOVES) {
    const src = path.join(ROOT, rel)
    if (fs.existsSync(src)) fs.renameSync(src, path.join(HIDE, name))
  }
  patchLayout()
}
function restore() {
  unpatchLayout()
  for (const [rel, name] of MOVES) {
    const dst = path.join(ROOT, rel)
    const src = path.join(HIDE, name)
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.renameSync(src, dst)
    }
  }
  try { fs.rmdirSync(HIDE) } catch { /* pas vide / déjà supprimé */ }
}

process.on('SIGINT', () => { restore(); process.exit(1) })

console.log('▸ Build Capacitor (statique) — mise à l’écart de /api + middleware…')
hide()
try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      CAP_BUILD: '1',
      // L'app packagée en local appelle l'API sur Vercel (base absolue).
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'https://thw-appli.vercel.app',
    },
  })
  console.log('\n✅ Build statique terminé → dossier out/  (prêt pour `npx cap sync`)')
} catch (e) {
  console.error('\n❌ Build statique échoué (voir erreurs ci-dessus).')
  process.exitCode = 1
} finally {
  restore()
  console.log('▸ /api + middleware remis en place.')
}
