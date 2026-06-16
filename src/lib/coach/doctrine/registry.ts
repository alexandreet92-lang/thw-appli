// ══════════════════════════════════════════════════════════════
// src/lib/coach/doctrine/registry.ts  (SERVER ONLY — utilise fs)
//
// Charge la doctrine de coaching (.md de ce dossier) et l'injecte de
// façon CIBLÉE dans le cerveau du coach : on ne donne jamais tout (trop
// de tokens / timeouts), seulement le pertinent selon la méthode, le
// sport et le contexte de la demande.
// ══════════════════════════════════════════════════════════════

import fs from 'fs'
import path from 'path'

const DIR = path.join(process.cwd(), 'src/lib/coach/doctrine')
const cache = new Map<string, string>()

function read(file: string): string {
  const hit = cache.get(file)
  if (hit !== undefined) return hit
  let content = ''
  try { content = fs.readFileSync(path.join(DIR, file), 'utf8') } catch { content = '' }
  cache.set(file, content)
  return content
}

// ── methodId (MethodPicker) + sport principal (code app) → fichier méthode ──
const METHOD_DOC: Record<string, string> = {
  sweetspot:           'A-velo-sweetspot.md',
  blocs_pma:           'A-velo-blocs-pma.md',
  specifique_velo:     'A-velo-cols-clm.md',
  seuil_vma:           'A-run-seuil-vma.md',
  vo2max:              'A-run-vo2max.md',
  allure_spe:          'A-run-allure-specifique.md',
  trail:               'A-run-trail-cotes.md',
  multisport:          'A-tri-multisport.md',
  brick:               'A-tri-brick.md',
  specifique_distance: 'A-tri-specifique-distance.md',
}

function methodDocFile(methodId?: string, sport?: string): string | null {
  if (!methodId || methodId === 'auto') return null
  if (METHOD_DOC[methodId]) return METHOD_DOC[methodId]
  // Méthodes transverses : dépend du sport
  if (methodId === 'polarise')   return sport === 'run' ? 'A-run-polarise.md' : 'A-velo-polarise.md'
  if (methodId === 'norvegienne') return sport === 'run' ? 'A-run-norvegienne.md' : 'A-tri-norvegienne.md'
  return null   // ex: pyramidal → pas de doc dédié, le modèle utilise sa connaissance
}

// ── Détection de mots-clés → doc socle pertinent (chat) ──────────
function keywordDoc(text: string): string | null {
  const t = (text || '').toLowerCase()
  if (/\b(blessure|douleur|mal au|tendon|achille|genou|pied|cheville|mollet|ischio|dos|lombaire|épaule|tibia|périostite|fracture)\b/.test(t)) return 'B2-blessures.md'
  if (/\b(nutrition|manger|aliment|glucide|prot[ée]ine|ravitaillement|hydratation|sodium|gel|carburant|poids)\b/.test(t)) return 'B9-nutrition.md'
  if (/\b(sommeil|r[ée]cup|fatigue|repos|hrv|vfc|surentra[îi]nement|readiness)\b/.test(t)) return 'B8-recuperation.md'
  if (/\b(zone|seuil|ftp|vma|css|lthr|allure|watt|cardio|fc max|intensit)\b/.test(t)) return 'B4-calibrage.md'
  if (/\b(charge|ctl|atl|tsb|deload|aff[ûu]tage|taper|monotonie|p[ée]riodisation)\b/.test(t)) return 'B5-charge.md'
  if (/\b(course|comp[ée]tition|objectif|marathon|ironman|semi|trail|cyclosportive|clm|distance|70\.3)\b/.test(t)) return 'B6-competitions.md'
  if (/\b(profil|force|faiblesse|diesel|puncheur|durabilit|niveau)\b/.test(t)) return 'B3-profilage.md'
  return null
}

// Principes de coaching condensés (synthèse de B1) — toujours injectés en chat,
// pour un comportement de coach expert sans le coût du B1 complet.
export const COACH_PRINCIPLES = `PRINCIPES DE COACHING (à appliquer en permanence) :
1. Diagnostic avant correction : aucune prescription sans constat (donnée/test/signal). Jamais de plan « par défaut ».
2. Déduire avant de demander : l'objectif/la course sont dans le calendrier, les zones/l'historique en base — utilise-les, ne les redemande pas. Ne pose de questions que sur l'inconnu subjectif (préférences, blessure non tracée, ressenti).
3. Directivité honnête : tu décides et tu justifies (constat → décision → intention). Tu résistes aux demandes contre-productives, tu n'es pas un exécutant.
4. Sécurité non négociable : douleur sérieuse / signal médical → prudence + orientation, ça prime sur la performance.
5. Choix de méthode = profil × objectif × temps × niveau (jamais imposée) : tu proposes et tu expliques.
6. Tu expliques court et causal, calibré sur les vraies données de l'athlète.`

// ── Doctrine pour la GÉNÉRATION DE PLAN (riche : Vercel Pro = 300 s de marge) ──
export function buildDoctrineForPlan(opts: { methodId?: string; sport?: string; injury?: boolean }): string {
  const parts: string[] = [read('B1-philosophie.md')]
  const mf = methodDocFile(opts.methodId, opts.sport)
  if (mf) parts.push(read(mf))
  parts.push(read('B7-seances.md'))      // bibliothèque de séances calibrées
  parts.push(read('B6-competitions.md')) // exigences de l'épreuve
  if (opts.injury) parts.push(read('B2-blessures.md'))
  const body = parts.filter(Boolean).join('\n\n═══════════════════\n\n')
  if (!body) return ''
  return `\n\n========== DOCTRINE DE COACHING (RÉFÉRENTIEL À APPLIQUER FIDÈLEMENT) ==========\n${body}\n========== FIN DOCTRINE ==========\n`
}

// ── Doctrine pour le CHAT (légère, ciblée, BORNÉE) ──────────────
// En chat, la conversation grandit à chaque tour ; on plafonne donc
// strictement la doctrine injectée pour ne pas alourdir/ralentir l'appel.
const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '\n…(doc tronqué)' : s)

export function buildDoctrineForChat(opts: { methodId?: string; sport?: string; lastUserMessage?: string }): string {
  const parts: string[] = [COACH_PRINCIPLES]
  const mf = methodDocFile(opts.methodId, opts.sport)
  if (mf) parts.push(cap(read(mf), 6000))           // doc méthode (≈1,5k tokens max)
  const kw = keywordDoc(opts.lastUserMessage ?? '')
  if (kw && kw !== mf) parts.push(cap(read(kw), 5000)) // doc socle ciblé, tronqué
  const body = parts.filter(Boolean).join('\n\n═══════════════════\n\n')
  if (!body) return ''
  return `\n\n========== DOCTRINE DE COACHING (référentiel à appliquer) ==========\n${cap(body, 14000)}\n========== FIN DOCTRINE ==========\n`
}
