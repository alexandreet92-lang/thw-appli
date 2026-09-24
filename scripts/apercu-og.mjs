#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// apercu-og.mjs — fabrique la carte d'aperçu de /pour-les-coachs
//
// POURQUOI. Le lien de cette page part en message privé Instagram. Sans
// carte d'aperçu, Instagram affiche l'adresse toute nue — et un lien nu
// envoyé par un inconnu, c'est la forme même du spam. La carte est donc
// une pièce du démarchage, pas une décoration.
//
// ELLE NE PEUT PAS DÉRIVER. Les couleurs ne sont pas écrites ici : elles
// sont LUES dans src/app/globals.css (bloc .dark + --primary). Si le
// design system change, relancer le script suffit.
//
// Usage :  node scripts/apercu-og.mjs
// Sortie : public/pour-les-coachs/apercu.png  (1200 × 630)
// ════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { capturer, navigateur } from './capture-chromium.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = join(RACINE, 'public', 'pour-les-coachs', 'apercu.png')

const LARGEUR = 1200
const HAUTEUR = 630

// ── Les mots de la carte. Les mêmes que le titre de la page. ──
const TITRE = 'Coachez plus d’athlètes\nsans y passer plus d’heures.'
const SOUS_TITRE = 'L’IA écrit les plans, ajuste les séances, suit la charge.\nVous gardez la relation et les décisions.'
const PIED = 'Six semaines d’accès complet, offertes.'
const DOMAINE = 'the-hybridway.com'

/** Lit un token de couleur dans globals.css, à l'intérieur d'un sélecteur donné. */
function token(css, selecteur, nom) {
  const bloc = css.split(selecteur)[1]
  if (!bloc) throw new Error(`Sélecteur ${selecteur} introuvable dans globals.css`)
  const trouve = bloc.slice(0, bloc.indexOf('}')).match(new RegExp(`--${nom}\\s*:\\s*([^;]+);`))
  if (!trouve) throw new Error(`Token --${nom} introuvable sous ${selecteur}`)
  return trouve[1].trim()
}

/** Télécharge les polices et les incorpore en base64 : le rendu ne dépend
 *  alors d'aucun réseau, donc il est reproductible à l'identique. */
async function policesEmbarquees() {
  const url = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600'
    + '&family=Inter:wght@400;500;600&display=swap'
  const navigateur = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' }
  let css = await (await fetch(url, { headers: navigateur })).text()
  const adresses = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) ?? [])]
  for (const adresse of adresses) {
    const octets = Buffer.from(await (await fetch(adresse)).arrayBuffer())
    css = css.replaceAll(adresse, `data:font/woff2;base64,${octets.toString('base64')}`)
  }
  return css
}

const css = readFileSync(join(RACINE, 'src', 'app', 'globals.css'), 'utf8')
const couleurs = {
  fond: token(css, '.dark {', 'bg'),
  carte: token(css, '.dark {', 'bg-card'),
  texte: token(css, '.dark {', 'text'),
  attenue: token(css, '.dark {', 'text-mid'),
  bordure: token(css, '.dark {', 'border'),
  accent: token(css, ':root {', 'primary'),
}

const logo = readFileSync(join(RACINE, 'public', 'branding', 'logo-thw-dark.png')).toString('base64')
const polices = await policesEmbarquees()

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${polices}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${LARGEUR}px; height: ${HAUTEUR}px; }
body {
  background: ${couleurs.fond};
  color: ${couleurs.texte};
  font-family: 'Inter', system-ui, sans-serif;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 64px 72px;
  position: relative; overflow: hidden;
}
/* Une seule lueur d'accent, en haut à droite — la page en a une aussi. */
body::after {
  content: ''; position: absolute; top: -280px; right: -200px;
  width: 760px; height: 760px; border-radius: 50%;
  background: radial-gradient(circle, ${couleurs.accent}26 0%, transparent 68%);
}
.marque { display: flex; align-items: center; gap: 16px; position: relative; z-index: 1; }
.marque img { width: 52px; height: 52px; object-fit: contain; }
.marque span { font-family: 'Fraunces', Georgia, serif; font-size: 25px; font-weight: 600; letter-spacing: -0.01em; }
.titre {
  position: relative; z-index: 1;
  font-family: 'Fraunces', Georgia, serif; font-weight: 600;
  font-size: 61px; line-height: 1.1; letter-spacing: -0.02em;
  white-space: pre-line; max-width: 900px;
}
.sous {
  margin-top: 22px; font-size: 25px; line-height: 1.45;
  color: ${couleurs.attenue}; white-space: pre-line; max-width: 820px;
}
.pied {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid ${couleurs.bordure}; padding-top: 24px;
  font-size: 22px; font-weight: 500;
}
.pied .offre { color: ${couleurs.accent}; }
.pied .domaine { color: ${couleurs.attenue}; }
</style></head><body>
  <div class="marque"><img src="data:image/png;base64,${logo}" alt=""><span>THW Coaching</span></div>
  <div>
    <div class="titre">${TITRE}</div>
    <div class="sous">${SOUS_TITRE}</div>
  </div>
  <div class="pied"><span class="offre">${PIED}</span><span class="domaine">${DOMAINE}</span></div>
</body></html>`

if (!navigateur()) {
  console.error('Aucun navigateur trouvé. Indiquer le chemin avec CHROME_BIN=…')
  process.exit(1)
}

const page = join(tmpdir(), `apercu-og-${process.pid}.html`)
writeFileSync(page, html)

let poids
try {
  poids = await capturer({ url: `file://${page}`, largeur: LARGEUR, hauteur: HAUTEUR, sortie: SORTIE })
} finally {
  rmSync(page, { force: true })
}

console.log(`Carte écrite : ${SORTIE.replace(RACINE + '/', '')} — ${LARGEUR}×${HAUTEUR}, ${(poids / 1024).toFixed(0)} ko`)
console.log(`Couleurs lues dans globals.css : fond ${couleurs.fond}, accent ${couleurs.accent}`)
