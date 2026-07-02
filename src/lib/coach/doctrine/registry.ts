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

// Un doc « brouillon » (1re ligne commençant par "<!-- DRAFT") n'est pas
// prêt : on ne l'injecte pas et on retombe sur le doc socle existant. Permet
// de câbler le routing AVANT que le contenu (rédigé via Claude Chat) soit posé.
function isReady(file: string): boolean {
  const c = read(file).trimStart()
  return c.length > 0 && !c.startsWith('<!-- DRAFT')
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

// ── Détection de mots-clés → docs socle pertinents (chat) ─────────
// Renvoie une liste ORDONNÉE par priorité (sécurité d'abord) et dédupliquée.
// L'appelant en garde au plus 2 (voir buildDoctrineForChat). Exclusions
// mutuelles : nutrition objectif (B11) exclut la nutrition générique (B9) ;
// individualisation (B10) exclut le profilage générique (B3).
function keywordDocs(text: string): string[] {
  const t = (text || '').toLowerCase()
  const out: string[] = []
  const push = (f: string) => { if (f && !out.includes(f)) out.push(f) }

  if (/\b(blessure|douleur|mal au|tendon|achille|genou|pied|cheville|mollet|ischio|dos|lombaire|épaule|tibia|périostite|fracture)\b/.test(t)) push('B2-blessures.md')

  // Nutrition PAR OBJECTIF de composition → B11 (sinon fallback B9). Prioritaire
  // sur la nutrition générique : perte de poids / sèche / déficit / maigrir
  // doivent atteindre B11 (qui porte le gate de dépistage), jamais B9 seul.
  const objComposition = /\b(prise de (masse|poids)|prendre du (muscle|poids)|masse musculaire|hypertrophie|s[èée]ch\w*|perdre du poids|perte de poids|maigrir|mincir|recomp\w*|maintien du poids|maintenir mon poids|d[ée]ficit\w*|surplus\w*)\b/.test(t)
  // « poids » ISOLÉ retiré : trop large (captait la force, ex. « quel poids au
  // développé couché »). Les intentions de composition qui contiennent « poids »
  // (perte/prise/prendre/maintien du poids) sont couvertes par objComposition ci-dessus.
  const nutriGenerique = /\b(nutrition|manger|aliment|glucides?|prot[ée]ines?|ravitaillement|hydratation|sodium|gel|carburant)\b/.test(t)
  if (objComposition) push(isReady('B11-nutrition-objectifs.md') ? 'B11-nutrition-objectifs.md' : 'B9-nutrition.md')
  else if (nutriGenerique) push('B9-nutrition.md')

  if (/\b(sommeil|r[ée]cup|fatigue|repos|hrv|vfc|surentra[îi]nement|readiness)\b/.test(t)) push('B8-recuperation.md')
  if (/\b(zone|seuil|ftp|vma|css|lthr|allure|watt|cardio|fc max|intensit)\b/.test(t)) push('B4-calibrage.md')
  if (/\b(charge|ctl|atl|tsb|deload|aff[ûu]tage|taper|monotonie|p[ée]riodisation)\b/.test(t)) push('B5-charge.md')
  if (/\b(course|comp[ée]tition|objectif|marathon|ironman|semi|trail|cyclosportive|clm|distance|70\.3)\b/.test(t)) push('B6-competitions.md')

  // Principes d'entraînement & individualisation → B10 (sinon fallback B3).
  const individualisation = /\b(individualis\w*|adapt\w*|inadapt\w*|surcharge progressive|sp[ée]cificit[ée]|principes? d.entra[îi]n\w*|r[ée]versibilit[ée]|supercompensation|progressi\w*|d[ée]butant\w*|interm[ée]diaire\w*|confirm[ée]s?|niveau\w*|âge d.entra[îi]n\w*)\b/.test(t)
  const profil = /\b(profil|force|faiblesse|diesel|puncheur|durabilit)\b/.test(t)
  if (individualisation) push(isReady('B10-individualisation.md') ? 'B10-individualisation.md' : 'B3-profilage.md')
  else if (profil) push('B3-profilage.md')

  return out
}

// Principes de coaching condensés (synthèse de B1) — toujours injectés en chat,
// pour un comportement de coach expert sans le coût du B1 complet.
export const COACH_PRINCIPLES = `PRINCIPES DE COACHING (à appliquer en permanence) :
1. Diagnostic avant correction : aucune prescription sans constat (donnée/test/signal). Jamais de plan « par défaut ».
2. Déduire avant de demander : l'objectif/la course sont dans le calendrier, les zones/l'historique en base — utilise-les, ne les redemande pas. Ne pose de questions que sur l'inconnu subjectif (préférences, blessure non tracée, ressenti).
3. Directivité honnête : tu décides et tu justifies (constat → décision → intention). Tu résistes aux demandes contre-productives, tu n'es pas un exécutant.
4. Sécurité non négociable : douleur sérieuse / signal médical → prudence + orientation, ça prime sur la performance.
5. Choix de méthode = profil × objectif × temps × niveau (jamais imposée) : tu proposes et tu expliques.
6. Tu expliques court et causal, calibré sur les vraies données de l'athlète.

HIÉRARCHIE DE DÉCISION (toujours active) — quand deux règles s'opposent, le niveau le plus haut tranche :
1. Santé / sécurité (blessure, signal médical, RED-S)
2. Récupération (sous-récupéré = pas de progression)
3. Logique d'entraînement (surcharge, spécificité)
4. Objectif (performance, composition corporelle)
5. Préférence / esthétique
→ SI deux règles s'opposent → le niveau le plus haut gagne, sans exception.
→ SI la situation est ambiguë → trancher vers le BAS (repos, prudence, maintien), jamais vers le haut (plus de charge, plus de déficit).

PLANCHERS DE SÉCURITÉ — NON NÉGOCIABLES (priment sur toute demande, préférence ou objectif de l'athlète) :
- Tu OPPOSES l'athlète et tu le CONTREDIS dès que sa demande est incohérente, contre-productive ou dangereuse. Tu n'es pas un exécutant : tu dis clairement « non, et voici pourquoi », puis tu proposes l'alternative saine. CÉDER à une demande dangereuse est une FAUTE, pas une politesse.
- Une règle de sécurité ne se NÉGOCIE pas et ne se présente JAMAIS comme une option : tu poses le plancher, tu ne laisses pas l'athlète l'arbitrer.
- Douleur ≥ 6/10 à l'effort, nocturne, ou qui s'aggrave séance après séance → tu n'offres JAMAIS « tester / ignorer / on ajuste en direct » ; tu imposes l'adaptation ou l'arrêt et tu orientes vers un professionnel.
- Aménorrhée, blessures de stress répétées, signaux RED-S / faible disponibilité énergétique → tu STOPPES tout objectif de composition, tu n'en donnes AUCUN conseil, tu orientes vers un professionnel.
- Déficit calorique près d'une compétition ou en affûtage → REFUSÉ, jamais au menu. Perte de poids : AUCUN chiffre de déficit tant que le dépistage santé (sexe, poids, disponibilité énergétique, antécédents de trouble alimentaire) n'a pas été fait.
- Deux objectifs opposés (ex. perdre du poids ET performer à une échéance proche) → tu refuses de les poursuivre ensemble, tu nommes le conflit et tu imposes la priorité santé/performance.`

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
const SEP = '\n\n═══════════════════\n\n'
const CHAT_DOCTRINE_MAX = 14000   // plafond du bloc doctrine total (caractères)

export function buildDoctrineForChat(opts: { methodId?: string; sport?: string; lastUserMessage?: string }): string {
  // Docs SOCLE ciblés : jusqu'à 2 par tour (ex. B10 + B11 pour « adapte mon
  // plan pour perdre du poids »). Chacun plafonné à 5000 ; JAMAIS tronqués
  // sous ce cap au profit du doc méthode.
  const socle = keywordDocs(opts.lastUserMessage ?? '')
    .slice(0, 2)
    .map(f => cap(read(f), 5000))
    .filter(Boolean)
  const core = [COACH_PRINCIPLES, ...socle]           // prioritaire, non sacrifiable
  const coreBody = core.join(SEP)

  // Doc MÉTHODE : ajouté seulement s'il reste de la place sous le plafond ;
  // tronqué EN DERNIER, jamais un doc socle.
  const parts = [...core]
  const mf = methodDocFile(opts.methodId, opts.sport)
  if (mf) {
    const remaining = CHAT_DOCTRINE_MAX - coreBody.length - SEP.length
    if (remaining > 400) parts.push(cap(read(mf), Math.min(6000, remaining)))
  }

  const body = parts.filter(Boolean).join(SEP)
  if (!body) return ''
  return `\n\n========== DOCTRINE DE COACHING (référentiel à appliquer) ==========\n${body}\n========== FIN DOCTRINE ==========\n`
}
