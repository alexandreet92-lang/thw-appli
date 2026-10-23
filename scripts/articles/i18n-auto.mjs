// Règles automatiques (pas de traducteur) : phrases-types récurrentes, nombres/valeurs, titres et rubriques.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
export const LANGS = ['en', 'es', 'it', 'de']
const here = path.dirname(fileURLToPath(import.meta.url))
export const PHRASEBOOK = JSON.parse(fs.readFileSync(path.join(here, 'i18n-phrasebook.json'), 'utf8'))

/** Segment sans lettres (valeurs, axes) : seule la convention numérique change. */
export function numeric(text, lang) {
  let t = text
  if (lang === 'en') {
    t = t.replace(/(\d)[   ](\d{3})(?!\d)/g, '$1,$2').replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)[   ]%/g, '$1%')
  } else if (lang === 'it') {
    t = t.replace(/(\d)[   ]%/g, '$1%')
  }
  return t
}
export function auto(text, lang, meta) {
  const k = LANGS.indexOf(lang)
  if (PHRASEBOOK[text]) return PHRASEBOOK[text][k]
  const plain = text.replace(/<[^>]*>/g, '').trim()
  if (meta && meta.tag && plain === meta.tag) return meta.tr.tag[k]
  if (meta && meta.title && plain === meta.title) return meta.tr.title[k]
  return undefined
}
