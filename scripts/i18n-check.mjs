#!/usr/bin/env node
// Vérifie que toute clé utilisée via t('...') / t("...") existe dans le dictionnaire FR.
// Parcourt src/**/*.tsx|ts, extrait les appels t('x'), compare aux clés de `fr`.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dict = readFileSync('src/lib/i18n/dictionaries.ts', 'utf8')
// Isole l'objet fr pour lister les clés déclarées.
const frBlock = dict.slice(dict.indexOf('const fr: Dict'), dict.indexOf('const en: Dict'))
const declared = new Set([...frBlock.matchAll(/'([^']+)'\s*:/g)].map(m => m[1]))

const files = []
;(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) { if (e !== 'node_modules') walk(p) }
    else if (/\.(tsx|ts)$/.test(e) && !/\.backup\.|\.v2\.backup\./.test(e)) files.push(p)
  }
})('src')

const used = new Map() // key -> first file
for (const f of files) {
  const c = readFileSync(f, 'utf8')
  for (const m of c.matchAll(/\bt\(\s*(['"])([^'"]+)\1/g)) {
    const k = m[2]
    if (!k.includes('.')) continue // ignore les t(dynamique) sans namespace
    if (!used.has(k)) used.set(k, f)
  }
}

const missing = [...used].filter(([k]) => !declared.has(k))
if (missing.length === 0) {
  console.log(`OK — ${used.size} clés utilisées, toutes présentes dans le dictionnaire.`)
  process.exit(0)
}
console.log(`MANQUANTES (${missing.length}) :`)
for (const [k, f] of missing) console.log(`  ${k}   (${f})`)
process.exit(1)
