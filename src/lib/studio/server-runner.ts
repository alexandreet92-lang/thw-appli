// ══════════════════════════════════════════════════════════════
// Studio — RUNNER SERVEUR pour les runs AUTONOMES (planifiés).
// ──────────────────────────────────────────────────────────────
// Même parcours par couches que le runner navigateur, mais :
//  • sources lues avec le service client (readSourceWith + userId) ;
//  • agents/synthèses = appel Anthropic DIRECT (pas de coach-stream) ;
//  • AUCUN nœud validation/action : un run autonome ne peut pas attendre
//    un accord humain — le planificateur refuse ces systèmes en amont ;
//  • conso débitée sur le solde STUDIO (recordStudioUsage, runId).
// ══════════════════════════════════════════════════════════════

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELS } from '@/lib/agents/base'
import { createServiceClient } from '@/lib/supabase/server'
import { getModelMultiplier } from '@/lib/tokens/multipliers'
import { recordStudioUsage } from '@/lib/tokens/studio'
import { readSourceWith } from './source-readers'
import { buildLivingContext } from './living'
import { SOURCE_LABEL, type StudioGraph, type StudioMethod } from './graph'

// Traduit la méthode du coach en consignes injectées à TOUS les agents (via le
// contexte partagé). Le garde-fou clé : jusqu'où l'IA a le droit d'écrire les
// séances. Vide si aucune méthode définie → comportement inchangé.
// Doctrine d'entraînement TOUJOURS appliquée — indépendante des réglages du
// coach. C'est la façon de « penser » du Studio : raisonnement par phases +
// pilotage par forces/faiblesses + prudence sur la fatigue.
const CORE_DOCTRINE = [
  "RAISONNE TOUJOURS PAR PHASES (mésocycles), jamais séance par séance isolée. Un plan se construit par blocs successifs de 2 à 4 semaines, chacun avec UNE qualité dominante à développer (ex. seuil, VMA, endurance/durabilité, force, spécifique course). Rétro-planifie les phases depuis la ou les compétitions (de la plus lointaine à la plus proche) : base → développement → spécifique → affûtage.",
  "PILOTE PAR LES FORCES ET FAIBLESSES : analyse d'abord les données réelles de l'athlète pour identifier son point faible limitant et ses points forts. Mets l'accent des phases sur le point faible qui bride l'objectif. Exemple : un coureur rapide mais peu endurant qui prépare un semi/marathon → accent DURABILITÉ (sorties longues, longues à allure, endurance sous fatigue). À l'inverse, un athlète très endurant mais lent → accent VITESSE/PUISSANCE (VMA, force). Le type de séance qui comble la lacune DIFFÈRE d'un athlète à l'autre, même à objectif identique.",
  "Annonce explicitement, en tête de proposition, la PHASE en cours (numéro, durée, qualité travaillée, pourquoi) avant de décliner les séances.",
]

function methodGuidance(m?: StudioMethod | null): string {
  const parts: string[] = [...CORE_DOCTRINE]

  // Jusqu'où l'IA écrit les séances.
  if (m?.aiWrites === 'none') parts.push("N'écris JAMAIS le déroulé détaillé d'une séance. Donne seulement l'intention de chaque séance (objectif, type, intensité cible, durée) ; c'est le coach qui écrit le contenu.")
  else if (m?.aiWrites === 'all') parts.push("Tu peux écrire le déroulé complet de toutes les séances, y compris les séances clés.")
  else parts.push("Écris le déroulé complet UNIQUEMENT des séances SIMPLES (endurance, footing, récupération, mobilité, renfo générique). Pour les séances SPÉCIFIQUES et complexes (fractionné fin, force spécifique, technique, séances de durabilité travaillées), NE les invente pas : donne un BRIEF (objectif, intensité, contraintes) et laisse le coach écrire le déroulé — SAUF si des exemples de séances du coach te sont fournis ci-dessous, auquel cas tu peux proposer un déroulé dans SA manière, à faire valider.")

  const cad: Record<string, string> = { weekly: 'la semaine à venir', biweekly: 'les deux semaines à venir', triweekly: 'les trois semaines à venir', block: 'le bloc/mésocycle complet à venir' }
  if (m?.cadence && cad[m.cadence]) parts.push(`Horizon d'écriture détaillée : ${cad[m.cadence]} (mais garde la vision de la phase entière).`)
  if (m?.phaseWeeks && m.phaseWeeks >= 1) parts.push(`Longueur type d'une phase : ${m.phaseWeeks} semaines (adapte si la proximité d'une compétition l'exige).`)

  // Latitude laissée au Studio.
  if (m?.latitude === 'strict') parts.push("LATITUDE = STRICTE : colle au plus près à ce que le coach a défini (règles, exemples). N'improvise pas de contenu nouveau ; en cas de doute, propose une variante prudente et signale-la.")
  else if (m?.latitude === 'creative') parts.push("LATITUDE = CRÉATIVE : le coach te donne une base ; tu peux proposer, varier et innover autour, tant que tu respectes la logique de phase et les forces/faiblesses. Reste physiologiquement cohérent.")
  else parts.push("LATITUDE = ÉQUILIBRÉE : pars de la base et des règles du coach, adapte avec discernement aux données de l'athlète.")

  // Prudence fatigue (défaut : activée).
  if (m?.fatigueCaution !== false) parts.push("PRUDENCE FATIGUE : la charge/fatigue CALCULÉE (TSS, load) est peu fiable et peut sur- ou sous-estimer la fatigue réelle. Ne t'y fie JAMAIS seul : croise-la avec le ressenti subjectif (RPE, check-in récupération, sommeil) et la performance réelle. En cas de divergence, privilégie le ressenti et SIGNALE-le au coach au lieu de couper la charge de ta propre initiative. Ne sur-réagis pas à un seul chiffre.")

  const rules = (m?.rules ?? []).map(r => r.trim()).filter(Boolean)
  if (rules.length) parts.push('Règles propres du coach à respecter impérativement :\n- ' + rules.join('\n- '))

  const examples = (m?.sessionExamples ?? []).map(r => r.trim()).filter(Boolean)
  if (examples.length) parts.push("Exemples de types de séances fournis par le coach (inspire-t'en pour le style et la structure) :\n- " + examples.join('\n- '))

  return `\n\n--- MÉTHODE & DOCTRINE DU STUDIO (à respecter impérativement) ---\n${parts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n--- fin méthode ---`
}

// Séances SPÉCIFIQUES déjà écrites par le coach pour CET athlète → exemples de
// style. Le Studio s'en inspire (structure des blocs, vocabulaire, dosage) pour
// proposer dans la manière du coach au lieu d'un contenu générique.
async function coachStyleExamples(
  sb: ReturnType<typeof createServiceClient>, athleteUserId: string,
): Promise<string> {
  try {
    const { data } = await sb.from('planned_sessions')
      .select('sport, title, duration_min, intensity, blocks, notes')
      .eq('user_id', athleteUserId).eq('source', 'coach')
      .order('week_start', { ascending: false }).limit(20)
    const rows = (data ?? []) as { sport: string | null; title: string | null; duration_min: number | null; intensity: string | null; blocks: unknown; notes: string | null }[]
    const withBlocks = rows.filter(r => Array.isArray(r.blocks) && (r.blocks as unknown[]).length > 0).slice(0, 6)
    if (withBlocks.length === 0) return ''
    const fmtBlock = (b: Record<string, unknown>): string => {
      const reps = b.mode === 'interval' && b.reps ? `${b.reps}× ` : ''
      const val = b.value ? String(b.value) : ''
      const dist = b.distanceM ? `${b.distanceM} m` : ''
      const dur = b.durationMin ? `${b.durationMin} min` : ''
      const zone = b.zone ? `Z${b.zone}` : ''
      const rec = b.mode === 'interval' && b.recoveryMin ? ` (récup ${b.recoveryMin} min)` : ''
      const label = b.label && String(b.label).trim() ? `${String(b.label).trim()} : ` : ''
      return `${label}${reps}${[dist, val, dur, zone].filter(Boolean).join(' · ')}${rec}`.trim()
    }
    const lines = withBlocks.map(r => {
      const blocks = (r.blocks as Record<string, unknown>[]).map(fmtBlock).filter(Boolean).join(' | ')
      const meta = [r.sport, r.duration_min ? `${r.duration_min} min` : '', r.intensity].filter(Boolean).join(', ')
      return `• « ${r.title ?? 'Séance'} » (${meta})\n  ${blocks}${r.notes ? `\n  Note coach : ${r.notes}` : ''}`
    })
    return `\n\n--- EXEMPLES DE SÉANCES ÉCRITES PAR LE COACH POUR CET ATHLÈTE (inspire-toi de CE style : structure des blocs, dosage, vocabulaire — n'invente pas au-delà) ---\n${lines.join('\n')}\n--- fin exemples ---`
  } catch { return '' }
}

const MODEL_BY_KEY: Record<string, string> = {
  hermes: MODELS.fast,
  athena: MODELS.balanced,
  zeus:   MODELS.powerful,
}

const SYSTEM_PROMPT =
  `Tu es un agent d'un SYSTÈME AUTOMATISÉ du Studio de THW Coaching (coaching sportif hybride endurance + force), défini par l'athlète lui-même. ` +
  `Exécute ton rôle de façon autonome et complète, en te basant UNIQUEMENT sur les données réelles reçues en entrée. ` +
  `Écris en français, clair, concret et actionnable. N'invente jamais de données ; si une donnée manque, dis-le brièvement.`

export interface ServerRunResult {
  renders: { title: string; text: string }[]
  logs: { nodeId: string; title: string; text: string }[]
  errors: { title: string; message: string }[]
  weightedTokens: number
}

export async function runGraphServer(userId: string, graph: StudioGraph, runId: string, systemId?: string, billUserId?: string): Promise<ServerRunResult> {
  const sb = createServiceClient()
  // Les données lues + le contexte vivant sont ceux de `userId` (l'athlète pour
  // un run coach) ; la conso est débitée sur `billUserId` (le coach) si fourni.
  const billTo = billUserId ?? userId
  // Contexte « système vivant » (garde-fou santé + mémoire du dernier cycle),
  // partagé par tous les agents — même logique que les runs manuels.
  const learnFromCoach = graph.method?.learnFromCoach !== false
  const living = (await buildLivingContext(sb, userId, systemId))
    + methodGuidance(graph.method)
    + (learnFromCoach ? await coachStyleExamples(sb, userId) : '')
  const client = getAnthropicClient()
  const nodes = graph.nodes
  const byId = new Map(nodes.map(n => [n.id, n]))
  const deps = new Map<string, Set<string>>()
  const incoming = new Map<string, string[]>()
  for (const n of nodes) { deps.set(n.id, new Set()); incoming.set(n.id, []) }
  for (const e of graph.edges) {
    if (byId.has(e.from) && byId.has(e.to)) {
      deps.get(e.to)!.add(e.from)
      incoming.get(e.to)!.push(e.from)
    }
  }

  const outputs: Record<string, string> = {}
  const done = new Set<string>()
  const failed = new Set<string>()
  const skipped = new Set<string>()
  const logs: ServerRunResult['logs'] = []
  const errors: ServerRunResult['errors'] = []
  let weightedTokens = 0

  const gatherUpstream = (nodeId: string): string =>
    (incoming.get(nodeId) ?? [])
      .map(src => {
        const s = byId.get(src)
        const out = outputs[src] ?? ''
        return s && out ? `[De : ${s.title}]\n${out}` : out
      })
      .filter(Boolean)
      .join('\n\n')

  const callAgentServer = async (modelKey: string, userContent: string): Promise<string> => {
    const resp: Anthropic.Message = await client.messages.create({
      model: MODEL_BY_KEY[modelKey] ?? MODELS.balanced,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    const raw = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0)
    weightedTokens += Math.ceil(raw * getModelMultiplier(modelKey))
    void recordStudioUsage(billTo, raw, modelKey, runId)
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n\n')
      .trim()
    // Sortie coupée par la limite de tokens → on le SIGNALE au lieu de passer une
    // sortie tronquée en aval comme si elle était complète (rapport cut-off).
    if (resp.stop_reason === 'max_tokens') {
      return `${text}\n\n_[Sortie tronquée : limite de longueur atteinte. Relance ce nœud pour obtenir la suite.]_`
    }
    return text
  }

  let guard = 0
  while (done.size + failed.size + skipped.size < nodes.length && guard++ < 40) {
    const pending = nodes.filter(n => !done.has(n.id) && !failed.has(n.id) && !skipped.has(n.id))
    const toSkip = pending.filter(n => [...deps.get(n.id)!].some(d => failed.has(d) || skipped.has(d)))
    if (toSkip.length) { toSkip.forEach(n => skipped.add(n.id)); continue }
    const ready = pending.filter(n => [...deps.get(n.id)!].every(d => done.has(d)))
    if (ready.length === 0) break   // cycle / inatteignable — validé en amont normalement

    await Promise.all(ready.map(async n => {
      try {
        if (n.kind === 'trigger') {
          outputs[n.id] = (n.role ?? '').trim()
        } else if (n.kind === 'source') {
          const key = n.sourceKey ?? 'activities'
          const text = await readSourceWith(sb, userId, key)
          outputs[n.id] = text
          logs.push({ nodeId: n.id, title: `${n.title} (${SOURCE_LABEL[key]})`, text })
        } else if (n.kind === 'action' && (n.actionKey === 'notify_report' || n.actionKey === 'message_athlete')) {
          // Actions « sortie texte » : le contenu = l'amont. notify_report est
          // envoyé par le planificateur ; message_athlete produit un BROUILLON
          // de message que le coach relira et enverra à la validation (aucun
          // envoi direct ici).
          const upstream = gatherUpstream(n.id)
          if (!upstream.trim()) throw new Error('Aucun contenu à envoyer')
          outputs[n.id] = upstream
          logs.push({ nodeId: n.id, title: n.title, text: upstream })
        } else if (n.kind === 'validation' || n.kind === 'action') {
          throw new Error('Nœud Validation/écriture (Planning/Calendrier) non exécutable en run autonome — accord humain requis')
        } else {
          const upstream = gatherUpstream(n.id)
          const role = (n.role ?? '').trim() || 'Tu es un coach expert. Réponds de façon claire, concrète et actionnable.'
          const prompt = upstream
            ? `${role}${living}\n\n--- Contributions et données reçues en entrée ---\n${upstream}\n\n--- Fin des entrées ---\n\nProduis ta contribution maintenant.`
            : `${role}${living}`
          const text = await callAgentServer(n.model ?? 'athena', prompt)
          outputs[n.id] = text
          logs.push({ nodeId: n.id, title: n.title, text })
        }
        done.add(n.id)
      } catch (e) {
        failed.add(n.id)
        const message = e instanceof Error ? e.message : 'Erreur inconnue'
        errors.push({ title: n.title, message })
        logs.push({ nodeId: n.id, title: `${n.title} — en erreur`, text: message })
      }
    }))
  }

  // Rendus = nœuds terminaux (sans fil sortant), hors trigger.
  const hasOut = new Set(graph.edges.map(e => e.from))
  const renders = nodes
    .filter(n => n.kind !== 'trigger' && !hasOut.has(n.id))
    .map(n => ({ title: n.title, text: outputs[n.id] ?? '' }))

  return { renders, logs, errors, weightedTokens }
}
