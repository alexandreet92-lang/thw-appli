// Génère les PAGES STATIQUES des articles (référencement + aperçus de partage) :
//   public/site/articles/<slug>.html   une page par article (début du texte dans le HTML)
//   public/site/articles.html          index de secours (liens) entre <!--ART-INDEX-START/END-->
//   public/site/sitemap.xml            entrées entre <!--ARTICLES-START/END-->
// Usage : node scripts/articles/pages.mjs   (après scripts/articles/build.mjs)
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src/content/articles')
const SITE = path.join(ROOT, 'public/site')
const ORIGIN = 'https://www.the-hybridway.com'
const LASTMOD = new Date().toISOString().slice(0, 10)

const idx = fs.readFileSync(path.join(SRC, 'index.ts'), 'utf8')
const m = idx.match(/export const ARTICLES: ArticleMeta\[\] = (\[[\s\S]*?\n\])\n\nconst LOADERS/)
if (!m) throw new Error('ARTICLES introuvable dans index.ts')
const ARTICLES = JSON.parse(m[1])

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const neutral = h => h.replace(/<a href="#s\d+">([\s\S]*?)<\/a>/g, '<span>$1</span>')
const plain = h => h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')

const tpl = fs.readFileSync(path.join(SITE, 'articles.html'), 'utf8').replace(/<!--ART-INDEX-START-->[\s\S]*?<!--ART-INDEX-END-->/, '')
const startIdx = tpl.indexOf('<meta charset')
if (startIdx < 0) throw new Error('gabarit articles.html inattendu')

// ── Pages par article ──
const outDir = path.join(SITE, 'articles')
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true })
for (const a of ARTICLES) {
  const c = JSON.parse(fs.readFileSync(path.join(SRC, a.slug + '.json'), 'utf8'))
  const url = `${ORIGIN}/articles/${a.slug}.html`
  const title = `${a.title} — THW Coaching`
  const desc = clip(a.lede, 200)
  const body = a.open ? c.head + c.rest : neutral(c.head)
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.lede,
    inLanguage: 'fr', mainEntityOfPage: url, url,
    author: { '@type': 'Organization', name: 'THW Coaching' }, publisher: { '@type': 'Organization', name: 'THW Coaching' },
    dateModified: LASTMOD, articleSection: a.tag, isAccessibleForFree: !!a.open,
    ...(a.open ? {} : { hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.arx-reader' } }),
  }
  let h = tpl
  h = h.replace('<head>', `<head>\n  <base href="/"/>`)
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  h = h.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}"/>`)
  h = h.replace(/<!--SEO-START-->[\s\S]*?<!--SEO-END-->/, `<!--SEO-START-->
  <link rel="canonical" href="${url}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:site_name" content="THW Coaching"/>
  <meta property="og:locale" content="fr_FR"/>
  <meta property="og:title" content="${esc(a.title)}"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:image" content="${ORIGIN}/og-image.png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(a.title)}"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <meta name="twitter:image" content="${ORIGIN}/og-image.png"/>
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
  <!--SEO-END-->`)
  // Début de l'article DANS le HTML (lu par les moteurs, remplacé par le lecteur au montage).
  h = h.replace('<div id="root"></div>', `<div id="root"><div class="arx-ssr"><style>${c.css}</style><div class="arx-reader"><div class="ax">${body}</div></div></div></div>`)
  fs.writeFileSync(path.join(outDir, a.slug + '.html'), h)
}

// ── Index de secours dans articles.html (liens vers chaque article) ──
const li = ARTICLES.map(a => `<li><a href="/articles/${a.slug}.html">${esc(a.title)}</a> — ${esc(clip(a.lede, 140))}</li>`).join('\n')
const indexBlock = `<!--ART-INDEX-START--><div class="arx-ssr"><h1>Articles</h1><ul>\n${li}\n</ul></div><!--ART-INDEX-END-->`
const list = tpl.replace('<div id="root"></div>', `<div id="root">${indexBlock}</div>`)
fs.writeFileSync(path.join(SITE, 'articles.html'), list)

// ── Sitemap ──
const sm = path.join(SITE, 'sitemap.xml')
let x = fs.readFileSync(sm, 'utf8')
const entries = ARTICLES.map(a => `  <url><loc>${ORIGIN}/articles/${a.slug}.html</loc><lastmod>${LASTMOD}</lastmod><priority>0.6</priority></url>`).join('\n')
const block = `<!--ARTICLES-START-->\n${entries}\n  <!--ARTICLES-END-->`
if (x.includes('<!--ARTICLES-START-->')) x = x.replace(/<!--ARTICLES-START-->[\s\S]*?<!--ARTICLES-END-->/, block)
else x = x.replace('</urlset>', `  ${block}\n</urlset>`)
fs.writeFileSync(sm, x)
console.log(ARTICLES.length, 'pages écrites dans', outDir)
