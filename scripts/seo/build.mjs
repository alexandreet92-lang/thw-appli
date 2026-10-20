// Référencement : prérendu du HTML (lisible sans JS par Google et les robots IA),
// canonical / noindex / JSON-LD, sitemap.xml, robots.txt, llms.txt.
// Usage : npm run seo:build   (idempotent ; relancer après toute modif d'une page publique)
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { chromium } from 'playwright-core'
import { build as esbuild } from 'esbuild'
import { ORIGIN, PUBLIC, PRIVATE, ORG } from './config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = path.join(ROOT, 'public/site')
const PUB = path.join(ROOT, 'public')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.jsx': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.mp4': 'video/mp4' }

const rx = (a, b) => new RegExp(`[ \\t]*${a}[\\s\\S]*?${b}\\n?`, 'g')
const SSR_RX = /<!--SSR-START-->[\s\S]*?<!--SSR-END-->/
const SEO_RX = rx('<!--SEO-START-->', '<!--SEO-END-->')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8')
const meta = (html, re) => (html.match(re) || [])[1] || ''
const title = (h) => meta(h, /<title>([^<]*)<\/title>/)
const desc = (h) => meta(h, /<meta name="description" content="([^"]*)"/)

// Les pages Decaform lisent /api/cadences/* : on branche les mêmes fonctions (config publique) sur le serveur local.
const apiOut = path.join(os.tmpdir(), 'thw-seo-api.mjs')
await esbuild({ entryPoints: [path.join(ROOT, 'scripts/seo/api-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: apiOut,
  alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' })
const api = await import(apiOut + '?t=' + Date.now())

function server() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://x')
    let p = decodeURIComponent(u.pathname)
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    if (p === '/api/cadences/products') return json(api.products())
    if (p === '/api/cadences/catalog') return json(api.catalog(u.searchParams.get('test_key')))
    if (p.startsWith('/api/')) return json({ loggedIn: false })
    if (p === '/') p = '/index.html'
    const cands = [path.join(SITE, p), path.join(PUB, p)]
    const f = cands.find((c) => c.startsWith(PUB) && fs.existsSync(c) && fs.statSync(c).isFile())
    if (!f) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' })
    fs.createReadStream(f).pipe(res)
  })
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)))
}

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'
  const direct = path.join(base, 'chromium')
  if (fs.existsSync(direct)) return direct
  return undefined // laisse playwright-core chercher son navigateur par défaut
}

function jsonLd(page, html) {
  const graph = []
  const crumbs = []
  for (const k of page.ld) {
    if (k === 'org') graph.push(ORG)
    if (k === 'website') graph.push({ '@type': 'WebSite', '@id': ORIGIN + '/#website', url: ORIGIN + '/', name: 'THW Coaching',
      inLanguage: 'fr', publisher: { '@id': ORIGIN + '/#organization' } })
    if (k === 'app') graph.push({ '@type': 'SoftwareApplication', name: 'THW Coaching', applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS', description: desc(html), url: ORIGIN + '/', publisher: { '@id': ORIGIN + '/#organization' } })
    if (k.startsWith('crumb:')) crumbs.push(k.slice(6))
  }
  if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: crumbs[0], item: ORIGIN + page.path } ] })
  if (!graph.length) return ''
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`
}

function seoHead(page, html, priv) {
  const lines = ['<!--SEO-START-->']
  if (priv) lines.push('<meta name="robots" content="noindex, nofollow"/>')
  const canon = priv ? page.canonical : page.path
  if (canon) lines.push(`<link rel="canonical" href="${ORIGIN}${canon}"/>`)
  if (!priv && page.path === '/') lines.push('<meta name="google-site-verification" content="k2lv5SIpO6-vmoPV9F3Xc8qtWWatTUrIoOJoiV-E-hc"/>')
  if (!priv) lines.push(jsonLd(page, html))
  lines.push('<!--SEO-END-->')
  return lines.filter(Boolean).map((l) => '  ' + l).join('\n') + '\n'
}

function apply(file, headBlock, ssr, over) {
  let html = read(file)
  html = html.replace(SEO_RX, '')
  if (over?.title && /<title>[^<]*<\/title>/.test(html)) html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(over.title)}</title>`)
  if (over?.description) {
    if (/<meta name="description"/.test(html)) html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(over.description)}"/>`)
    else html = html.replace('</title>', `</title>\n  <meta name="description" content="${esc(over.description)}"/>`)
  }
  html = html.replace('</head>', headBlock + '</head>')
  if (ssr != null) {
    html = html.replace(SSR_RX, '')
    html = html.replace('<div id="root"></div>', '<div id="root"><!--SSR-START--><div data-ssr style="visibility:hidden">' + ssr + '</div><!--SSR-END--></div>')
    html = html.replace(/<div id="root"><!--SSR-START-->[\s\S]*?<!--SSR-END-->\s*<\/div>/, (m) => m) // no-op, garde la forme
  }
  fs.writeFileSync(path.join(SITE, file), html)
}

function stripSsr(file) {
  // Remet <div id="root"></div> propre avant de rendre (évite de rendre un snapshot périmé).
  const html = read(file).replace(/<div id="root"><!--SSR-START-->[\s\S]*?<!--SSR-END--><\/div>/, '<div id="root"></div>')
  fs.writeFileSync(path.join(SITE, file), html)
}

const srv = await server()
const port = srv.address().port
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] })
const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } })
const report = []
// Environnement sans accès à unpkg : SEO_VENDOR=<dossier contenant node_modules avec react@18, react-dom@18, @babel/standalone>
const VENDOR = process.env.SEO_VENDOR
if (VENDOR) {
  await ctx.route('**/unpkg.com/**', (rt) => {
    const u = rt.request().url()
    const f = u.includes('react-dom') ? 'react-dom/umd/react-dom.development.js' : u.includes('babel') ? '@babel/standalone/babel.min.js' : 'react/umd/react.development.js'
    rt.fulfill({ path: path.join(VENDOR, 'node_modules', f), contentType: 'text/javascript' })
  })
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|unpkg\.com)/, (rt) => rt.abort())
}

for (const page of PUBLIC) {
  stripSsr(page.file)
  const html0 = read(page.file)
  if (!html0.includes('<div id="root"></div>')) { apply(page.file, seoHead(page, html0, false), null, page); report.push([page.file, 'head seul']); continue }
  const pg = await ctx.newPage()
  await pg.addInitScript(() => { try { localStorage.setItem('thw-lang', 'fr'); localStorage.setItem('thw-no-track', '1'); localStorage.setItem('thw_no_track', '1') } catch (e) {} })
  pg.on('pageerror', (e) => console.warn('  [erreur page]', page.file, String(e).slice(0, 120)))
  await pg.goto(`http://127.0.0.1:${port}/${page.file}`, { waitUntil: 'networkidle', timeout: 60000 })
  await pg.waitForFunction(() => (document.getElementById('root')?.innerText || '').trim().length > 200, null, { timeout: 30000 })
  await pg.waitForTimeout(800)
  const ssr = await pg.evaluate(() => {
    const root = document.getElementById('root').cloneNode(true)
    root.querySelectorAll('img[src^="data:"]').forEach((i) => i.setAttribute('src', '/logo.png'))
    root.querySelectorAll('script,style,#thw-lang-switch,#thw-lang-host,[data-no-ssr]').forEach((n) => n.remove())
    return root.innerHTML
  })
  await pg.close()
  apply(page.file, seoHead(page, html0, false), ssr, page)
  report.push([page.file, `${(ssr.length / 1024).toFixed(0)} Ko rendu`])
}
for (const page of PRIVATE) {
  if (!fs.existsSync(path.join(SITE, page.file))) continue
  stripSsr(page.file)
  apply(page.file, seoHead(page, read(page.file), true), null, null)
  report.push([page.file, 'noindex'])
}
await browser.close(); srv.close()

// sitemap.xml
const today = new Date().toISOString().slice(0, 10)
const urls = PUBLIC.map((p) => `  <url><loc>${ORIGIN}${p.path}</loc><lastmod>${today}</lastmod><priority>${p.prio.toFixed(1)}</priority></url>`).join('\n')
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)

// robots.txt : tout est ouvert aux robots (y compris IA) sauf les pages privées et l'API.
const priv = PRIVATE.map((p) => `Disallow: /${p.file}`).join('\n')
fs.writeFileSync(path.join(SITE, 'robots.txt'),
`User-agent: *\nAllow: /\n${priv}\nDisallow: /api/\n\n# Robots IA explicitement autorisés sur les pages publiques\n` +
['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot']
  .map((b) => `User-agent: ${b}\nAllow: /\n${priv}\nDisallow: /api/\n`).join('\n') + `\nSitemap: ${ORIGIN}/sitemap.xml\n`)

// llms.txt : résumé du site pour les IA (bonus, non garanti lu).
const lines = PUBLIC.filter((p) => p.prio >= 0.4).map((p) => `- [${(title(read(p.file)) || p.path).replace(/\s*[·—-]\s*THW Coaching$/, '')}](${ORIGIN}${p.path}): ${desc(read(p.file))}`)
fs.writeFileSync(path.join(SITE, 'llms.txt'),
`# THW Coaching (The Hybrid Way)\n\n> Application de coaching sportif par IA pour athlètes hybrides (endurance et force), et Decaform, un test physique sur 1000 points qui mesure sept qualités physiques pour tous les âges.\n\n## Pages principales\n${lines.join('\n')}\n`)

console.table(report.map(([f, s]) => ({ page: f, résultat: s })))
