// Prépare le travail des traducteurs : un fichier par article avec les SEULS textes restant à traduire.
// Usage : node scripts/articles/i18n-extract.mjs <dossier de travail>   (contient titles.json ; écrit seg/<slug>.txt)
import fs from 'node:fs'
import path from 'node:path'
import * as L from './i18n-lib.mjs'
import { LANGS, auto } from './i18n-auto.mjs'

const WORK = process.argv[2]
const SRC = path.join(process.cwd(), 'src/content/articles')
const titles = JSON.parse(fs.readFileSync(path.join(WORK, 'titles.json'), 'utf8'))
const idx = fs.readFileSync(path.join(SRC, 'index.ts'), 'utf8')
const ARTICLES = JSON.parse(idx.match(/ARTICLES: ArticleMeta\[\] = (\[[\s\S]*?\n\])\n\nconst LOADERS/)[1])
fs.mkdirSync(path.join(WORK, 'seg'), { recursive: true })

let sumNeed = 0, sumAuto = 0
for (const a of ARTICLES) {
  const c = JSON.parse(fs.readFileSync(path.join(SRC, a.slug + '.json'), 'utf8'))
  const meta = { ...a, tr: titles[a.slug] }
  let id = 0, need = [], autoN = 0
  for (const part of ['head', 'rest']) {
    const ex = L.extract(c[part], id); id += ex.length
    for (const e of ex) {
      if (L.isNumeric(e.text)) { autoN++; continue }
      if (auto(e.text, 'en', meta) !== undefined) { autoN++; continue }
      need.push(e)
    }
  }
  fs.writeFileSync(path.join(WORK, 'seg', a.slug + '.txt'), need.map(e => `#${e.id}\n${e.text}\n`).join('\n'))
  sumNeed += need.length; sumAuto += autoN
  // le chapeau (lede) : contrôlé pour l'assemblage
  const lede = a.lede.trim()
  const hit = need.concat([]).find(e => e.text.replace(/<[^>]*>/g, '').trim() === lede)
  if (!hit) console.warn('  ! chapeau non retrouvé tel quel :', a.slug)
}
console.log('à traduire :', sumNeed, '| automatiques :', sumAuto)
