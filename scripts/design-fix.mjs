#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
// design-fix — garde-fou + correcteur automatique du design system (docs/DESIGN_SYSTEM.md).
//
//   node scripts/design-fix.mjs            → rapport (comptes par règle)
//   node scripts/design-fix.mjs --fix      → corrige automatiquement ce qui peut l'être
//   node scripts/design-fix.mjs --enforce  → exit 1 si une règle dépasse scripts/design-baseline.json
//   node scripts/design-fix.mjs --baseline → écrit la baseline (cliquet : ne peut que baisser)
//
// Règles (inline styles + CSS) :
//   font     polices littérales (DM Sans, DM Mono, Syne, Barlow, Inter…) → var(--font-body|display)
//   radius   borderRadius numérique hors échelle → var(--r-sm|md|lg|pill)  (≤4 px = barres/points : toléré)
//   size     tailles hors échelle (7-9, 21, 23, 27) → échelle du DS
// Fraunces (display) uniquement ≥ 18 px ; en dessous, la police fonctionnelle (Inter).
// ══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const BASE = path.join(ROOT, 'scripts/design-baseline.json')
const args = new Set(process.argv.slice(2))
const SKIP = [/globals\.css$/, /\/components\/shadcn\//, /\/app\/styleguide\//]

const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(tsx|ts)$/.test(e.name) && !SKIP.some(r => r.test(p))) files.push(p)
  }
})(SRC)

const BODY = 'var(--font-body)', DISPLAY = 'var(--font-display)'
const FAMILY = /fontFamily:\s*(['"])([^'"]*)\1/g
const RADIUS = /borderRadius:\s*(\d+)(?=\s*[,}\n])/g
const SIZE = /fontSize:\s*(\d+)(?=\s*[,}\n])/g
const SIZE_MAP = { 7: 10, 8: 10, 9: 10, 21: 22, 23: 22, 27: 28 }

const radiusToken = n => (n <= 4 || n === 0 ? null : n <= 10 ? 'var(--r-sm)' : n <= 16 ? 'var(--r-md)' : n <= 24 ? 'var(--r-lg)' : n >= 99 ? 'var(--r-pill)' : null)
const isToken = v => /^var\(--font-(body|display)/.test(v) || v === 'inherit' || v === 'monospace'

const counts = { font: 0, radius: 0, size: 0 }
let changed = 0

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8'); const orig = s

  // Police : on regarde la taille voisine (même ligne) pour choisir display/body.
  s = s.replace(/^.*$/gm, line => {
    if (!/fontFamily:/.test(line)) return line
    const sz = line.match(/fontSize:\s*(\d+)/)
    const size = sz ? Number(sz[1]) : null
    return line.replace(FAMILY, (m, q, v) => {
      if (isToken(v)) return m
      counts.font++
      const display = /Syne|Fraunces/.test(v) && size !== null && size >= 18
      return `fontFamily: '${display ? DISPLAY : BODY}'`
    })
  })
  s = s.replace(RADIUS, (m, n) => { const t = radiusToken(Number(n)); if (!t) return m; counts.radius++; return `borderRadius: '${t}'` })
  s = s.replace(SIZE, (m, n) => { const to = SIZE_MAP[Number(n)]; if (!to) return m; counts.size++; return `fontSize: ${to}` })

  if (s !== orig) { changed++; if (args.has('--fix')) fs.writeFileSync(f, s) }
}

if (args.has('--baseline')) { fs.writeFileSync(BASE, JSON.stringify(counts, null, 2) + '\n'); console.log('baseline écrite', counts) }
else if (args.has('--fix')) console.log(`corrigé : ${changed} fichiers`, counts)
else console.log('violations restantes :', counts)

if (args.has('--enforce')) {
  const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : { font: 0, radius: 0, size: 0 }
  const bad = Object.keys(counts).filter(k => counts[k] > (base[k] ?? 0))
  if (bad.length) { console.error('✗ design : nouvelles violations →', bad.map(k => `${k} ${counts[k]} > ${base[k]}`).join(', ')); process.exit(1) }
  console.log('✓ design : aucune nouvelle violation')
}
