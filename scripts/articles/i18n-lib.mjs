// Segmentation du HTML des articles pour la traduction : on extrait les TEXTES (et eux seuls), on les fait
// traduire, puis on les réinjecte à leur place EXACTE dans le HTML d'origine (balises, classes, graphiques
// restent octet pour octet identiques). Aucune dépendance : le HTML est généré et bien formé.

const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'wbr', 'col'])
const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'cite', 'code', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'br', 'wbr', 'tspan'])
const TEXT_ATTRS = new Set(['aria-label', 'title', 'alt', 'placeholder'])
const RAW = new Set(['style', 'script'])

/** Arbre minimal avec positions (offsets) dans la source. */
export function parse(src) {
  const root = { name: '#root', children: [], start: 0, openEnd: 0, closeStart: src.length, end: src.length, attrs: [] }
  const stack = [root]
  let i = 0
  const n = src.length
  while (i < n) {
    const lt = src.indexOf('<', i)
    if (lt < 0) { pushText(stack, src, i, n); break }
    if (lt > i) pushText(stack, src, i, lt)
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt); i = e < 0 ? n : e + 3; continue }
    if (src[lt + 1] === '/') {
      const e = src.indexOf('>', lt); const name = src.slice(lt + 2, e).trim().toLowerCase()
      // ferme jusqu'à l'élément correspondant
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) { stack[k].closeStart = lt; stack[k].end = e + 1; stack.length = k; break }
      }
      i = e + 1; continue
    }
    // balise ouvrante
    const m = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(src.slice(lt, lt + 60))
    if (!m) { pushText(stack, src, lt, lt + 1); i = lt + 1; continue }
    const name = m[1].toLowerCase()
    let j = lt + m[0].length
    const attrs = []
    let selfClose = false
    while (j < n) {
      while (j < n && /\s/.test(src[j])) j++
      if (src[j] === '>') { j++; break }
      if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break }
      const am = /^([^\s=>\/]+)/.exec(src.slice(j, j + 80))
      if (!am) { j++; continue }
      const aname = am[1]; j += aname.length
      let value = null, vs = -1, ve = -1
      if (src[j] === '=') {
        j++
        const q = src[j]
        if (q === '"' || q === "'") { vs = j + 1; ve = src.indexOf(q, vs); value = src.slice(vs, ve); j = ve + 1 }
        else { vs = j; while (j < n && !/[\s>]/.test(src[j])) j++; ve = j; value = src.slice(vs, ve) }
      }
      attrs.push({ name: aname.toLowerCase(), value, vs, ve })
    }
    const el = { name, children: [], start: lt, openEnd: j, closeStart: j, end: j, attrs, parent: stack[stack.length - 1] }
    stack[stack.length - 1].children.push(el)
    if (VOID.has(name) || selfClose) { el.end = j; i = j; continue }
    if (RAW.has(name)) { const cl = src.indexOf('</' + name, j); el.closeStart = cl; const e = src.indexOf('>', cl); el.end = e + 1; i = e + 1; continue }
    stack.push(el); i = j
  }
  return root
}
function pushText(stack, src, a, b) { if (b > a) stack[stack.length - 1].children.push({ name: '#text', start: a, end: b, text: src.slice(a, b) }) }

const hasText = s => /[\p{L}\p{N}]/u.test(s.replace(/<[^>]*>/g, ' ').replace(/&[#a-zA-Z0-9]+;/g, ' '))
// Segment purement numérique/symbolique (axes, valeurs) : traité par règle, pas par un traducteur.
export const isNumeric = s => !/\p{L}/u.test(s.replace(/<[^>]*>/g, ' ').replace(/&[#a-zA-Z0-9]+;/g, ' '))

/** Liste les segments { start, end, kind } dans l'ordre du document. */
export function segments(src) {
  const root = parse(src)
  const out = []
  const walk = (el) => {
    let run = null
    const flush = () => {
      if (!run) return
      // rogne les blancs de bord
      let a = run.a, b = run.b
      while (a < b && /\s/.test(src[a])) a++
      while (b > a && /\s/.test(src[b - 1])) b--
      const raw = src.slice(a, b)
      if (b > a && hasText(raw)) out.push({ start: a, end: b, kind: 'text' })
      run = null
    }
    for (const c of el.children) {
      const inline = c.name === '#text' || (INLINE.has(c.name))
      if (inline) { if (!run) run = { a: c.start, b: c.end }; else run.b = c.end; collectAttrs(c) ; continue }
      flush()
      for (const at of c.attrs) if (TEXT_ATTRS.has(at.name) && at.value && hasText(at.value)) out.push({ start: at.vs, end: at.ve, kind: 'attr' })
      if (c.name === 'style' || c.name === 'script') continue
      walk(c)
    }
    flush()
  }
  // attributs textuels portés par des éléments inline
  const collectAttrs = (c) => {
    if (c.name === '#text') return
    for (const at of c.attrs) if (TEXT_ATTRS.has(at.name) && at.value && hasText(at.value)) out.push({ start: at.vs, end: at.ve, kind: 'attr' })
    for (const k of c.children) collectAttrs(k)
  }
  for (const at of root.attrs) void at
  walk(root)
  out.sort((x, y) => x.start - y.start)
  return out
}

export const norm = s => s.replace(/\s+/g, ' ').trim()

/** Extrait les textes à traduire : [{ id, text, numeric }] pour une chaîne HTML. */
export function extract(src, startId = 0) {
  return segments(src).map((s, k) => ({ id: startId + k, seg: s, text: norm(src.slice(s.start, s.end)) }))
}

/** Réinjecte les traductions (map id → texte) dans le HTML d'origine. */
export function apply(src, extracted, tr) {
  let out = src
  for (let k = extracted.length - 1; k >= 0; k--) {
    const e = extracted[k]
    const t = tr.get(e.id)
    if (t === undefined) throw new Error('segment manquant ' + e.id)
    const safe = e.seg.kind === 'attr' ? t.replace(/"/g, '&quot;') : t
    out = out.slice(0, e.seg.start) + safe + out.slice(e.seg.end)
  }
  return out
}

/** Squelette des balises d'un fragment (pour vérifier que le traducteur n'a rien cassé). */
export function skeleton(s) {
  return [...s.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*)?)>/g)].map(m => m[0].replace(/\s+/g, ' ').replace(/aria-label="[^"]*"/g, 'aria-label=""')).join('')
}
/** Suites de chiffres d'un fragment (insensible aux séparateurs , . espace). */
export function digits(s) {
  return s.replace(/<[^>]*>/g, ' ').replace(/&#\d+;|&[a-z]+;/gi, ' ').match(/\d+/g)?.sort().join(',') ?? ''
}
