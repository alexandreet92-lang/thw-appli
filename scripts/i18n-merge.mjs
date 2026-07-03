#!/usr/bin/env node
// Fusion des clés i18n renvoyées par les agents dans src/lib/i18n/dictionaries.ts.
// Entrée : un JSON [{ ns, keys:[{key,fr,en}], ... }] passé en argv[2].
// - Insère les clés FR dans l'objet `fr` et EN dans l'objet `en`, groupées par ns.
// - N'écrit PAS d'espagnol (repli auto sur FR).
// - Idempotent : ne duplique pas une clé déjà présente.
import { readFileSync, writeFileSync } from 'node:fs'

const dictPath = 'src/lib/i18n/dictionaries.ts'
const results = JSON.parse(readFileSync(process.argv[2], 'utf8'))

// Rassemble toutes les clés uniques, groupées par namespace, fr et en séparés.
const byNs = new Map()
let total = 0
for (const r of results) {
  if (!r || !Array.isArray(r.keys)) continue
  for (const { key, fr, en } of r.keys) {
    if (!key || typeof key !== 'string') continue
    const ns = key.split('.')[0]
    if (!byNs.has(ns)) byNs.set(ns, new Map())
    const m = byNs.get(ns)
    if (!m.has(key)) { m.set(key, { fr: fr ?? key, en: en ?? fr ?? key }); total++ }
  }
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')

function block(lang) {
  const lines = []
  for (const [ns, m] of byNs) {
    lines.push(`  // ${ns}`)
    let line = '  '
    for (const [key, val] of m) {
      const frag = `'${esc(key)}': '${esc(val[lang])}', `
      if ((line + frag).length > 118) { lines.push(line.trimEnd()); line = '  ' }
      line += frag
    }
    if (line.trim()) lines.push(line.trimEnd())
  }
  return lines.join('\n')
}

let src = readFileSync(dictPath, 'utf8')

// Insère avant la fermeture de chaque objet (fr / en). On repère `\nconst en:` et
// `\nexport const DICTS` comme bornes de fin des objets fr et en respectivement.
function injectInto(src, langVar, nextMarker, langKey) {
  const startRe = new RegExp(`const ${langVar}: Dict = \\{`)
  const startM = src.match(startRe)
  if (!startM) throw new Error(`objet ${langVar} introuvable`)
  const endIdx = src.indexOf(nextMarker, startM.index)
  if (endIdx === -1) throw new Error(`fin de ${langVar} introuvable`)
  // Recule jusqu'à la dernière `}` avant nextMarker.
  const closeIdx = src.lastIndexOf('}', endIdx)
  const before = src.slice(0, closeIdx)
  const after = src.slice(closeIdx)
  return `${before}  // ===== i18n wave (auto) =====\n${block(langKey)}\n${after}`
}

src = injectInto(src, 'fr', '\nconst en: Dict', 'fr')
src = injectInto(src, 'en', '\nconst es: Dict', 'en')

writeFileSync(dictPath, src)
console.log(`Inséré ${total} clés dans fr + en (${byNs.size} namespaces).`)
