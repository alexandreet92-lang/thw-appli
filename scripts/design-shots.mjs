#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
// design-shots — banc de captures de TOUS les écrans (avant / après un changement
// de design). Aucun compte requis : serveur de dev local avec THW_DEV_BYPASS=1,
// session factice dans le navigateur, Supabase et /api interceptés (réponses vides).
// Les écrans montrent donc leur chrome (typo, boutons, cartes, marges) ; les
// listes de données sont vides.
//
//   node scripts/design-shots.mjs <label> [--themes dark,light] [--only /planning,/profile]
//   → design-shots/<label>/<theme>/<route>.png
//   node scripts/design-shots.mjs --diff <labelA> <labelB>   → % de pixels modifiés par écran
// ══════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'design-shots')
const PORT = Number(process.env.SHOTS_PORT || 3190)
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined)

// Routes statiques (hors admin/dynamiques/plein écran technique)
function listRoutes() {
  const out = []
  const walk = (dir, rel = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) { if (e.name === 'page.tsx') out.push(rel || '/'); continue }
      if (e.name.startsWith('[') || e.name === 'api' || e.name === 'admin' || e.name.startsWith('(')) continue
      walk(path.join(dir, e.name), `${rel}/${e.name}`)
    }
  }
  walk(path.join(ROOT, 'src/app'))
  return out.filter(r => !['/icons-demo', '/live', '/record'].includes(r)).sort()
}

const args = process.argv.slice(2)
if (args[0] === '--diff') {
  const { PNG } = await import('pngjs').catch(() => ({}))
  if (!PNG) { console.error('npm i -D pngjs pixelmatch  (requis pour --diff)'); process.exit(1) }
  const pixelmatch = (await import('pixelmatch')).default
  const [, a, b] = args
  const rows = []
  for (const theme of ['dark', 'light']) {
    const da = path.join(OUT, a, theme)
    if (!fs.existsSync(da)) continue
    for (const f of fs.readdirSync(da)) {
      const pa = path.join(da, f), pb = path.join(OUT, b, theme, f)
      if (!fs.existsSync(pb)) continue
      const A = PNG.sync.read(fs.readFileSync(pa)), B = PNG.sync.read(fs.readFileSync(pb))
      if (A.width !== B.width || A.height !== B.height) { rows.push([theme, f, 100]); continue }
      const n = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold: 0.1 })
      rows.push([theme, f, +(n / (A.width * A.height) * 100).toFixed(2)])
    }
  }
  rows.sort((x, y) => y[2] - x[2])
  for (const [t, f, p] of rows) console.log(`${String(p).padStart(6)} %  ${t}  ${f}`)
  process.exit(0)
}

const label = args[0] || 'current'
const themes = (args.includes('--themes') ? args[args.indexOf('--themes') + 1] : 'dark,light').split(',')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
const routes = (only ?? listRoutes())

const env = { ...process.env, THW_DEV_BYPASS: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://dummy.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy', NEXT_TELEMETRY_DISABLED: '1' }
const srv = spawn('npx', ['next', 'dev', '-p', String(PORT)], { env, stdio: 'ignore', detached: true })
const stop = () => { try { process.kill(-srv.pid) } catch { /* déjà arrêté */ } }
process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(1) })
for (let i = 0; i < 90; i++) { try { const r = await fetch(`http://localhost:${PORT}/programmes`); if (r.status < 500) break } catch { /* démarrage */ } await new Promise(r => setTimeout(r, 1000)) }

const fakeSession = JSON.stringify({
  access_token: 'a.b.c', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800,
  user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'demo@thw.test', app_metadata: {}, user_metadata: { full_name: 'Alex Demo' }, created_at: '2024-01-01T00:00:00Z' },
})
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
for (const theme of themes) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  await ctx.addInitScript(([th, sess]) => {
    try { sessionStorage.setItem('splash_v1', '1'); localStorage.setItem('thw-theme', th); localStorage.setItem('sb-dummy-auth-token', sess) } catch { /* ignore */ }
  }, [theme, fakeSession])
  await ctx.route('**://dummy.supabase.co/**', r => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-range': '0-0/0' }, body: r.request().method() === 'OPTIONS' ? '' : '[]' }))
  await ctx.route(/\/api\//, r => r.fulfill({ status: 503, headers: { 'content-type': 'application/json' }, body: '{"error":"offline"}' }))
  const dir = path.join(OUT, label, theme); fs.mkdirSync(dir, { recursive: true })
  for (const r of routes) {
    const pg = await ctx.newPage()
    try {
      await pg.goto(`http://localhost:${PORT}${r}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await pg.waitForTimeout(2200)
      await pg.evaluate(t => { document.documentElement.classList.remove('light', 'dark'); document.documentElement.classList.add(t) }, theme)
      await pg.addStyleTag({ content: 'nextjs-portal,[data-nextjs-toast]{display:none!important}' })
      await pg.waitForTimeout(300)
      await pg.screenshot({ path: path.join(dir, `${r === '/' ? 'home' : r.slice(1).replace(/\//g, '_')}.png`) })
      process.stdout.write(`✓ ${theme} ${r}\n`)
    } catch (e) { process.stdout.write(`✗ ${theme} ${r}: ${e.message.split('\n')[0]}\n`) }
    await pg.close()
  }
  await ctx.close()
}
await browser.close(); stop()
