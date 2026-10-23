// Contrôle d'une traduction : node scripts/articles/i18n-check.mjs <dossier de travail> <slug> <en|es|it|de>
// Échec (code 1) si un segment manque, est en trop, vide, change de balises ou de chiffres.
import fs from 'node:fs'
import path from 'node:path'
import * as L from './i18n-lib.mjs'

export function parseSeg(txt) {
  const m = new Map()
  for (const block of txt.split(/\n(?=#\d+\n)/)) {
    const mm = /^#(\d+)\n([\s\S]*)$/.exec(block.trim())
    if (mm) m.set(Number(mm[1]), mm[2].trim())
  }
  return m
}
const FR_WORDS = /(^|[\s(«“])(les|des|une|est|pas|dans|pour|avec|sur|ton|tes|sont|cette|aux|qui|nous|vous|ils|elle)(?=[\s,.;:)»”]|$)/gi

export function check(work, slug, lang) {
  const src = parseSeg(fs.readFileSync(path.join(work, 'seg', slug + '.txt'), 'utf8'))
  const fp = path.join(work, 'out', `${slug}.${lang}.txt`)
  if (!fs.existsSync(fp)) return { errors: ['fichier absent : ' + fp], warns: [] }
  const out = parseSeg(fs.readFileSync(fp, 'utf8'))
  const errors = [], warns = []
  for (const id of src.keys()) if (!out.has(id)) errors.push(`#${id} manquant`)
  for (const id of out.keys()) if (!src.has(id)) errors.push(`#${id} en trop`)
  for (const [id, fr] of src) {
    const t = out.get(id); if (t === undefined) continue
    if (!t) { errors.push(`#${id} vide`); continue }
    if (/\n/.test(t)) errors.push(`#${id} plusieurs lignes`)
    if (L.skeleton(fr) !== L.skeleton(t)) errors.push(`#${id} balises différentes\n   FR: ${L.skeleton(fr).slice(0, 160)}\n   ${lang.toUpperCase()}: ${L.skeleton(t).slice(0, 160)}`)
    if (L.digits(fr) !== L.digits(t)) errors.push(`#${id} chiffres différents (FR ${L.digits(fr)} / ${lang.toUpperCase()} ${L.digits(t)})\n   FR: ${fr.slice(0, 140)}\n   ${lang.toUpperCase()}: ${t.slice(0, 140)}`)
    const words = fr.replace(/<[^>]*>/g, '').split(/\s+/).length
    if (words > 4 && t === fr) warns.push(`#${id} identique au français`)
    const leak = (t.replace(/<[^>]*>/g, ' ').match(FR_WORDS) || []).length
    if (words > 5 && leak >= 3) warns.push(`#${id} semble encore en français (${leak} mots)`)
    const r = t.length / Math.max(1, fr.length)
    if (fr.length > 60 && (r < 0.45 || r > 2.2)) warns.push(`#${id} longueur suspecte (x${r.toFixed(2)})`)
  }
  return { errors, warns, n: src.size }
}

if (process.argv[1] && process.argv[1].endsWith('i18n-check.mjs')) {
  const [work, slug, lang] = process.argv.slice(2)
  const r = check(work, slug, lang)
  r.errors.slice(0, 40).forEach(e => console.log('ERREUR', e))
  r.warns.slice(0, 20).forEach(w => console.log('ATTENTION', w))
  console.log(`${slug} ${lang} : ${r.errors.length} erreur(s), ${r.warns.length} attention(s), ${r.n ?? '?'} segments`)
  process.exit(r.errors.length ? 1 : 0)
}
