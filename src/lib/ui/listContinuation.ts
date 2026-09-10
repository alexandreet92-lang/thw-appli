// ══════════════════════════════════════════════════════════════════════════
// Auto-continuation de liste dans un <textarea> : quand une ligne commence par
// « 1. » (ou « 1) ») ou « - » (ou « * » / « • ») et qu'on appuie sur Entrée, la
// ligne suivante démarre automatiquement avec le marqueur suivant (2., -, …).
// Sur une puce VIDE (marqueur sans texte), Entrée retire le marqueur et sort de
// la liste. Shift+Entrée reste un saut de ligne normal.
//
// Usage (textarea contrôlé) :
//   onKeyDown={e => listContinuationKeyDown(e, value, setValue)}
// Retourne true si l'événement a été géré (et preventDefault appelé).
// ══════════════════════════════════════════════════════════════════════════

export function listContinuationKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: (v: string) => void,
): boolean {
  // Ne pas interférer avec la validation par Entrée (envoi) : uniquement quand
  // on est effectivement dans une liste. La composition IME est ignorée.
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return false
  const ne = e.nativeEvent as unknown as { isComposing?: boolean }
  if (ne?.isComposing) return false

  const el = e.currentTarget
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? start
  if (start !== end) return false // sélection active → comportement normal

  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const line = value.slice(lineStart, start)

  const ordered = line.match(/^(\s*)(\d+)([.)])(\s+)(.*)$/)
  const unordered = line.match(/^(\s*)([-*•])(\s+)(.*)$/)
  if (!ordered && !unordered) return false

  let insert: string
  let emptyItem: boolean
  if (ordered) {
    const [, indent, num, sep, , content] = ordered
    emptyItem = content.trim() === ''
    insert = `\n${indent}${parseInt(num, 10) + 1}${sep} `
  } else {
    const [, indent, marker, , content] = unordered!
    emptyItem = content.trim() === ''
    insert = `\n${indent}${marker} `
  }

  e.preventDefault()

  let newValue: string
  let caret: number
  if (emptyItem) {
    // Puce vide → on retire le marqueur et on sort de la liste.
    newValue = value.slice(0, lineStart) + value.slice(start)
    caret = lineStart
  } else {
    newValue = value.slice(0, start) + insert + value.slice(end)
    caret = start + insert.length
  }

  setValue(newValue)
  // Le textarea est contrôlé : on repositionne le curseur après le re-render.
  requestAnimationFrame(() => {
    try { el.selectionStart = el.selectionEnd = caret } catch { /* ignore */ }
  })
  return true
}
