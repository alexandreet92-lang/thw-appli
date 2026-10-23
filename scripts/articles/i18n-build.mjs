// Assemble les traductions : réinjecte les textes traduits dans le HTML d'origine et écrit
//   src/content/articles/i18n/<lang>/<slug>.json   { head, rest }
//   src/content/articles/i18n/meta.json            { slug: { lang: { title, lede, tag } } }
//   src/content/articles/i18n.ts                   chargeurs par langue (GÉNÉRÉ)
// Usage : node scripts/articles/i18n-build.mjs <dossier de travail> [--allow-missing]
import fs from 'node:fs'
import path from 'node:path'
import * as L from './i18n-lib.mjs'
import { LANGS, auto, numeric } from './i18n-auto.mjs'
import { check, parseSeg } from './i18n-check.mjs'

const WORK = process.argv[2]
const ALLOW_MISSING = process.argv.includes('--allow-missing')
const SRC = path.join(process.cwd(), 'src/content/articles')
const titles = JSON.parse(fs.readFileSync(path.join(WORK, 'titles.json'), 'utf8'))
const idx = fs.readFileSync(path.join(SRC, 'index.ts'), 'utf8')
const ARTICLES = JSON.parse(idx.match(/ARTICLES: ArticleMeta\[\] = (\[[\s\S]*?\n\])\n\nconst LOADERS/)[1])
const strip = s => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

fs.rmSync(path.join(SRC, 'i18n'), { recursive: true, force: true })
const metaOut = {}
const done = {}           // lang -> [slugs]
let problems = 0
for (const a of ARTICLES) {
  const c = JSON.parse(fs.readFileSync(path.join(SRC, a.slug + '.json'), 'utf8'))
  const meta = { ...a, tr: titles[a.slug] }
  for (const lang of LANGS) {
    const k = LANGS.indexOf(lang)
    const fp = path.join(WORK, 'out', `${a.slug}.${lang}.txt`)
    if (!fs.existsSync(fp)) { if (!ALLOW_MISSING) { console.error('MANQUANT', a.slug, lang); problems++ } continue }
    const r = check(WORK, a.slug, lang)
    if (r.errors.length) { console.error('ERREURS', a.slug, lang, r.errors.length); problems++; continue }
    const out = parseSeg(fs.readFileSync(fp, 'utf8'))
    const tr = new Map()
    let id = 0
    const parts = {}
    let ledeTr = null
    for (const part of ['head', 'rest']) {
      const ex = L.extract(c[part], id); id += ex.length
      for (const e of ex) {
        let t
        if (L.isNumeric(e.text)) t = numeric(e.text, lang)
        else { t = auto(e.text, lang, meta); if (t === undefined) t = out.get(e.id) }
        if (t === undefined) throw new Error(`segment sans traduction ${a.slug} ${lang} #${e.id}`)
        tr.set(e.id, t)
        if (!ledeTr && strip(e.text) === a.lede.trim()) ledeTr = strip(t)
      }
      parts[part] = L.apply(c[part], ex, tr)
      // garde-fous : la structure ne doit pas avoir bougé
      if (L.skeleton(parts[part]) !== L.skeleton(c[part])) throw new Error('structure modifiée ' + a.slug + ' ' + lang + ' ' + part)
      if (L.digits(parts[part]) !== L.digits(c[part])) throw new Error('chiffres modifiés ' + a.slug + ' ' + lang + ' ' + part)
    }
    if (!ledeTr) {
      // chapeau avec balises ou retouché : premier paragraphe d'introduction traduit
      const first = a.lede.trim().slice(0, 40)
      const ex = L.extract(c.head, 0).find(e => strip(e.text).startsWith(first))
      if (ex && tr.get(ex.id) !== undefined) ledeTr = strip(tr.get(ex.id))
    }
    if (!ledeTr) { console.warn('  ! chapeau', a.slug, lang, '→ français de repli'); ledeTr = a.lede }
    metaOut[a.slug] = metaOut[a.slug] || {}
    metaOut[a.slug][lang] = { title: titles[a.slug].title[k], lede: ledeTr, tag: titles[a.slug].tag[k] }
    const dir = path.join(SRC, 'i18n', lang); fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, a.slug + '.json'), JSON.stringify({ head: parts.head, rest: parts.rest }))
    ;(done[lang] = done[lang] || []).push(a.slug)
  }
}
fs.mkdirSync(path.join(SRC, 'i18n'), { recursive: true })
fs.writeFileSync(path.join(SRC, 'i18n', 'meta.json'), JSON.stringify(metaOut))

const ts = `// Fichier GÉNÉRÉ par scripts/articles/i18n-build.mjs — ne pas modifier à la main.
// Traductions des articles (en, es, it, de) : texte réinjecté dans le HTML d'origine, structure identique.
import META from './i18n/meta.json'

export type TrLang = ${LANGS.map(l => `'${l}'`).join(' | ')}
export const TR_LANGS: TrLang[] = [${LANGS.map(l => `'${l}'`).join(', ')}]
export interface ArticleTr { title: string; lede: string; tag: string }
export const META_I18N = META as Record<string, Partial<Record<TrLang, ArticleTr>>>

type Part = { head: string; rest: string }
const LOADERS: Record<TrLang, Record<string, () => Promise<{ default: Part }>>> = {
${LANGS.map(l => `  ${l}: {\n${(done[l] || []).map(s => `    '${s}': () => import('./i18n/${l}/${s}.json'),`).join('\n')}\n  },`).join('\n')}
}

export function parseLang(v: string | null | undefined): TrLang | null {
  return v && (TR_LANGS as string[]).includes(v) ? (v as TrLang) : null
}

export async function loadArticleTr(slug: string, lang: TrLang): Promise<Part | null> {
  const load = LOADERS[lang][slug]
  if (!load) return null
  return (await load()).default
}
`
fs.writeFileSync(path.join(SRC, 'i18n.ts'), ts)
console.log(Object.entries(done).map(([l, s]) => `${l}: ${s.length}/${ARTICLES.length}`).join(' | '), problems ? `| ${problems} problème(s)` : '')
process.exit(problems && !ALLOW_MISSING ? 1 : 0)
