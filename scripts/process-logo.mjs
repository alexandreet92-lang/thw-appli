// ══════════════════════════════════════════════════════════════
// Génère logo-thw-dark.png + logo-thw-light.png à partir d'une
// source À FOND TRANSPARENT (lettres THW détourées).
//
// Prérequis :
//   - Node disponible
//   - npm i -D sharp
//   - public/branding/logo-thw-source.png  (PNG transparent des lettres)
//
// Lancement :  node scripts/process-logo.mjs
//
// NB : le détourage du fond sombre dégradé de l'icône d'origine n'est PAS
// fait ici (un script ne le nettoie pas proprement). Fournir une source
// déjà transparente, ou exporter directement les 2 PNG depuis le design.
// ══════════════════════════════════════════════════════════════

import sharp from 'sharp'

const SRC   = 'public/branding/logo-thw-source.png'
const SIZE  = 512
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

const base = () => sharp(SRC).resize(SIZE, SIZE, { fit: 'contain', background: TRANSPARENT })

// Mode nuit : lettres telles quelles (cyan vif), fond transparent.
await base().png().toFile('public/branding/logo-thw-dark.png')

// Mode jour : teinte vers #0891B2 pour contraste sur fond clair.
await base().tint('#0891B2').png().toFile('public/branding/logo-thw-light.png')

console.log('✓ logo-thw-dark.png et logo-thw-light.png générés dans public/branding/')
