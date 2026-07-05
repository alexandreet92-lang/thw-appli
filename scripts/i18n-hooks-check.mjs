#!/usr/bin/env node
// Vérifie (scope-aware) que chaque appel useI18n() est au niveau supérieur d'un
// composant (fonction Majuscule) ou d'un hook (use*). Détecte les violations des
// règles des hooks introduites par une migration i18n. Argv = liste de fichiers,
// sinon lit `git diff --name-only`.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const files = (process.argv.length > 2 ? process.argv.slice(2)
  : execSync('git diff --name-only').toString().split('\n'))
  .filter(f => f.endsWith('.tsx'))

const violations = []
for (const f of files) {
  let src
  try { src = readFileSync(f, 'utf8') } catch { continue }
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/useI18n\(\)/.test(lines[i])) continue
    const indent = lines[i].match(/^\s*/)[0].length
    let enclosing = null
    for (let j = i - 1; j >= 0; j--) {
      const l = lines[j]
      if (l.trim() === '') continue
      const jIndent = l.match(/^\s*/)[0].length
      if (jIndent < indent) {
        const m = l.match(/(?:function\s+([A-Za-z0-9_]+)|(?:const|let)\s+([A-Za-z0-9_]+)\s*[:=].*(?:=>|function)|([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?::[^={]*)?\{)/)
        if (m) { enclosing = m[1] || m[2] || m[3] || '?'; break }
      }
    }
    const ok = enclosing && (/^[A-Z]/.test(enclosing) || /^use[A-Z]/.test(enclosing))
    if (!ok) violations.push(`${f}:${i + 1}  enclosing="${enclosing}"`)
  }
}

console.log(`${files.length} fichiers .tsx analysés`)
if (violations.length === 0) console.log('OK — tous les useI18n() dans un composant/hook valide.')
else { console.log(`VIOLATIONS (${violations.length}) :`); violations.forEach(v => console.log('  ' + v)); process.exit(1) }
