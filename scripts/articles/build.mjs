#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
// Génère src/content/articles/*.json + index.ts à partir des 41 articles HTML rédigés.
//   node scripts/articles/build.mjs <dossier_source>
// <dossier_source> contient a01/Art01_v3.html … a31/…, p00/Art_P00.html … p09/…
// Pour chaque article : CSS isolé sous .ax (thème clair/sombre du site), HTML de l'article,
// point de coupure (début en accès libre = problématique + enjeux), temps de lecture.
// Le texte réservé aux membres n'est JAMAIS envoyé à un visiteur : l'API coupe côté serveur.
// ══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const SRC = process.argv[2]
if (!SRC) { console.error('usage: build.mjs <dossier_source>'); process.exit(1) }
const OUT = path.join(process.cwd(), 'src/content/articles')

// Ordre d'affichage et thème (identique à la maquette validée).
const GROUPS = ['etat', 'sante', 'age', 'mesure', 'plan']
const LIST = [
  ['a01', 'etat'], ['a03', 'etat'], ['a04', 'etat'], ['a05', 'etat'], ['a06', 'etat'], ['a07', 'etat'], ['a09', 'etat'], ['a10', 'etat'], ['a16', 'etat'],
  ['a08', 'sante'], ['a11', 'sante'], ['a12', 'sante'], ['a13', 'sante'], ['a14', 'sante'], ['a15', 'sante'], ['a17', 'sante'], ['a31', 'sante'],
  ['a18', 'age'], ['a19', 'age'], ['a20', 'age'], ['a21', 'age'], ['a22', 'age'], ['a23', 'age'], ['a24', 'age'],
  ['a02', 'mesure'], ['a25', 'mesure'], ['a26', 'mesure'], ['a27', 'mesure'], ['a28', 'mesure'], ['a29', 'mesure'],
  ['p00', 'plan', 'Fondation'], ['a30', 'plan', 'Tous profils'], ['p01', 'plan', 'Enfant, 6 à 11 ans'], ['p02', 'plan', 'Adolescent'],
  ['p03', 'plan', '18 à 29 ans'], ['p04', 'plan', '30 à 45 ans'], ['p05', 'plan', '45 à 64 ans'], ['p06', 'plan', '65 à 74 ans'],
  ['p07', 'plan', '75 ans et plus'], ['p08', 'plan', 'Obésité'], ['p09', 'plan', 'Troubles alimentaires'],
]
// Articles en accès libre pour tous (information de sécurité : jamais derrière un compte).
const OPEN = new Set(['p09'])

const find = id => {
  const dir = path.join(SRC, id)
  const f = fs.readdirSync(dir).find(n => /\.html$/.test(n) && /Art/.test(n) && /_v3|_P0/.test(n))
  return path.join(dir, f)
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
const text = h => decode(h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const slugify = s => s.replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── CSS : isolation sous .ax, thème clair/sombre du site, keyframes préfixés ──
function splitTop(s, sep) { // split hors parenthèses/crochets/chaînes
  const out = []; let d = 0, q = '', cur = ''
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = ''; continue }
    if (c === '"' || c === "'") { q = c; cur += c; continue }
    if (c === '(' || c === '[') d++
    if (c === ')' || c === ']') d--
    if (c === sep && d === 0) { out.push(cur); cur = '' } else cur += c
  }
  out.push(cur); return out
}
function parseBlocks(css) { // [{sel, body}] au premier niveau
  const out = []; let i = 0
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')
  while (i < css.length) {
    const o = css.indexOf('{', i); if (o < 0) break
    const sel = css.slice(i, o).trim()
    let d = 1, j = o + 1
    while (j < css.length && d > 0) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++ }
    out.push({ sel, body: css.slice(o + 1, j - 1) }); i = j
  }
  return out
}
function scopeCss(raw) {
  const kf = new Set(); for (const m of raw.matchAll(/@keyframes\s+([\w-]+)/g)) kf.add(m[1])
  let light = '', dark = '', darkMedia = ''
  const rules = []
  const renameKf = s => { let r = s; for (const n of kf) r = r.replace(new RegExp('(?<![\\w-])' + n + '(?![\\w-])', 'g'), 'ax-' + n); return r }
  const scopeSel = sel => splitTop(sel, ',').map(x => x.trim()).filter(Boolean).map(x => {
    if (/^(html|body|:root)$/.test(x)) return '.ax'
    if (x === '*') return '.ax *'
    if (/^(\*|html|body)\s/.test(x)) return '.ax ' + x.replace(/^(\*|html|body)\s+/, '')
    return '.ax ' + x
  }).join(',')
  function walk(css, wrap) {
    for (const { sel, body } of parseBlocks(css)) {
      if (/^@media/.test(sel)) {
        if (/prefers-color-scheme\s*:\s*dark/.test(sel)) { for (const b of parseBlocks(body)) if (/:root/.test(b.sel)) darkMedia += b.body + ';'; continue }
        const inner = []; const save = rules.length; walk(body, true)
        const added = rules.splice(save); if (added.length) rules.push(sel + '{' + added.join('') + '}'); continue
      }
      if (/^@keyframes/.test(sel)) { rules.push(sel.replace(/(@keyframes\s+)([\w-]+)/, '$1ax-$2') + '{' + body + '}'); continue }
      if (/^@/.test(sel)) continue
      if (/^:root\[data-theme=["']dark["']\]$/.test(sel)) { dark += body + ';'; continue }
      if (/^:root\[data-theme=["']light["']\]$/.test(sel)) { light += body + ';'; continue }
      if (/^:root$/.test(sel)) { light += body + ';'; continue }
      if (/^(html|body)$/.test(sel)) {
        const keep = body.split(';').filter(d => /^\s*(color|font-family|line-height)\s*:/.test(d)).join(';')
        if (keep) rules.push('.ax{' + renameKf(keep) + '}'); continue
      }
      // éléments de mise en page de la maquette, supprimés du site
      if (/^\.(strip|wrap|proto|note|skel)\b/.test(sel)) continue
      rules.push(scopeSel(sel) + '{' + renameKf(body) + '}')
    }
  }
  walk(raw, false)
  const darkBody = dark || darkMedia
  return (light ? '.ax{' + light + '}' : '') + (darkBody ? 'html.dark .ax{' + darkBody + '}' : '') + rules.join('\n')
}

// ── Coupure : avant la 3e <h2> (problématique, enjeux, puis démonstration) ──
function cutIndex(html) {
  const h2 = [...html.matchAll(/<h2[\s>]/g)].map(m => m.index)
  if (h2.length < 3) return -1
  let at = h2[2]
  const before = html.slice(Math.max(0, at - 260), at)
  const m = before.match(/<div class="(?:etape|stage)[^"]*">[^<]*<\/div>\s*$/)
  if (m) at -= m[0].length
  return at
}
const balanced = h => (h.match(/<div[\s>]/g) || []).length === (h.match(/<\/div>/g) || []).length &&
  (h.match(/<svg[\s>]/g) || []).length === (h.match(/<\/svg>/g) || []).length

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })
const meta = []; const used = new Set()

// Passe 1 : numéro rédactionnel (N°12, P1…) -> slug + titre court, pour transformer les renvois en liens.
const REF = {}
for (const [id] of LIST) {
  const src = fs.readFileSync(find(id), 'utf8')
  const title = text(src.match(/<title>([\s\S]*?)<\/title>/)[1])
  let slug = slugify(title); if (used.has(slug)) slug += '-' + id; used.add(slug)
  const key = id[0] === 'p' ? 'P' + Number(id.slice(1)) : String(Number(id.slice(1)))
  REF[key] = { slug, title }
}
used.clear()
const link = (k, label) => `<a href="articles.html?a=${REF[k].slug}" data-art="${REF[k].slug}">${label}</a>`
function linkRefs(html) {
  let inSvg = false, inA = false
  return html.split(/(<[^>]+>)/).map(t => {
    if (t[0] === '<') {
      if (/^<svg[\s>]/.test(t)) inSvg = true; else if (t === '</svg>') inSvg = false
      if (/^<a[\s>]/.test(t)) inA = true; else if (t === '</a>') inA = false
      return t
    }
    if (inSvg || inA) return t
    return t
      .replace(/N°(\d+)\s*,\s*(« [^»]*»)/g, (m, n, q) => REF[n] ? link(n, q) : m)
      .replace(/N°(\d+)/g, (m, n) => REF[n] ? link(n, '« ' + REF[n].title + ' »') : m)
      .replace(/\b(articles?)\s+(\d{1,2})\b/g, (m, w, n) => REF[n] ? w + ' ' + link(n, '« ' + REF[n].title + ' »') : m)
      .replace(/\barticles P(\d) et P(\d)\b/g, (m, a, b) => REF['P' + a] && REF['P' + b] ? 'articles ' + link('P' + a, '« ' + REF['P' + a].title + ' »') + ' et ' + link('P' + b, '« ' + REF['P' + b].title + ' »') : m)
  }).join('')
}
LIST.forEach(([id, group, profile], order) => {
  const file = find(id); const src = fs.readFileSync(file, 'utf8')
  const title = text(src.match(/<title>([\s\S]*?)<\/title>/)[1])
  const style = src.match(/<style>([\s\S]*?)<\/style>/)[1]
  let art = src.match(/<article[^>]*>([\s\S]*?)<\/article>/)[1].trim()
  art = art.replace(/<script[\s\S]*?<\/script>/g, '')
    const kick = (art.match(/<div class="kick">([\s\S]*?)<\/div>/) || [, ''])[1]
  const lede = text((art.match(/<p class="lede">([\s\S]*?)<\/p>/) || [, ''])[1])
  let slug = slugify(title); if (used.has(slug)) slug += '-' + id; used.add(slug)
  if (id === 'a17') art = art.replace('votre cœur', 'ton cœur') // tutoiement du site
  art = linkRefs(art)
  const h1 = text(art.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1])
  const cut = OPEN.has(id) ? art.length : cutIndex(art)
  if (cut < 0) throw new Error(id + ': coupure introuvable')
  const head = art.slice(0, cut), rest = art.slice(cut)
  if (!OPEN.has(id) && !balanced(head)) console.warn('  ! aperçu non équilibré :', id)
  if (!balanced(art)) console.warn('  ! article non équilibré :', id)
  const words = text(art).split(' ').length
  const ratio = Math.round(100 * text(head).split(' ').length / words)
  const tag = group === 'plan' ? profile : text(kick)
  const m = { slug, order, group, tag, title: h1, lede, minutes: Math.max(1, Math.round(words / 200)), open: OPEN.has(id) }
  meta.push(m)
  fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify({ slug, css: scopeCss(style), head, rest }))
  console.log(id.padEnd(4), slug.padEnd(34), String(words).padStart(5), 'mots', String(ratio).padStart(3) + '% libre', ' ', tag)
})
const idx = `// Fichier GÉNÉRÉ par scripts/articles/build.mjs — ne pas modifier à la main.
// Métadonnées publiques (liste) + chargement paresseux du contenu, réservé au serveur.
export type ArticleGroup = ${GROUPS.map(g => `'${g}'`).join(' | ')}
export interface ArticleMeta { slug: string; order: number; group: ArticleGroup; tag: string; title: string; lede: string; minutes: number; open: boolean }
export interface ArticleContent { slug: string; css: string; head: string; rest: string }

export const ARTICLES: ArticleMeta[] = ${JSON.stringify(meta, null, 2)}

const LOADERS: Record<string, () => Promise<{ default: ArticleContent }>> = {
${meta.map(m => `  '${m.slug}': () => import('./${m.slug}.json'),`).join('\n')}
}

export async function loadArticle(slug: string): Promise<ArticleContent | null> {
  const load = LOADERS[slug]
  if (!load) return null
  return (await load()).default
}
`
fs.writeFileSync(path.join(OUT, 'index.ts'), idx)
console.log('\n' + meta.length + ' articles écrits dans', OUT)
