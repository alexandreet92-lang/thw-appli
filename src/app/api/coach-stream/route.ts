// ══════════════════════════════════════════════════════════════
// API — /api/coach-stream
//
// Deux modes de fonctionnement :
//
// 1. SESSION PARSER (nouveau)
//    Body : { messages, sport, mode? }
//    Détecté si body.sport est présent (sans agentId).
//    Appel Anthropic direct (streaming) avec le system prompt
//    embarqué côté serveur. Le frontend envoie juste la
//    description brute de la séance ou la demande nutrition.
//
// 2. CHAT COACH (boucle agentique streamée)
//    Body : { agentId, messages, context?, modelId?, aiRules? }
//    buildChatParams + outils, puis BOUCLE agentique : on streame le
//    texte token-par-token, on résout les outils de LECTURE côté serveur
//    (read→reason→loop) et on rend les outils d'ACTION terminaux au front.
// ══════════════════════════════════════════════════════════════

export const runtime     = 'nodejs'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient } from '@/lib/agents/base'
import { buildChatParams } from '@/lib/agents/chatAgent'
import type { ChatInput } from '@/lib/coach-engine/schemas'
import { coachTools } from '@/lib/coach/tools-definition'
import { readTools, READ_TOOL_NAMES, resolveReadTool } from '@/lib/coach/read-tools'
import { createClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { getUserTier, logUsage } from '@/lib/subscriptions/check-quota'
import { TIER_LIMITS, MODEL_IDS, MODEL_MAX_TOKENS } from '@/lib/subscriptions/tier-limits'
import { getActiveCompetencesPrompt } from '@/lib/ai/competences'
import { getUserTokenLimits, recordTokenUsage } from '@/lib/tokens/limits'
import { getModelMultiplier } from '@/lib/tokens/multipliers'
import { methodsIndexText } from '@/lib/coach/methods'
import { buildDoctrineForChat } from '@/lib/coach/doctrine/registry'
import { buildAthleteContext } from '@/lib/coach/athlete-context'
import { buildCoachMemory } from '@/lib/coach/coach-memory'
import { buildLearnedInsights } from '@/lib/coach/learned-insights'

// ── System prompts côté serveur ───────────────────────────────

const SESSION_SYSTEM_PROMPT = `Tu es un coach sportif expert. Tu reçois une description de séance et tu réponds UNIQUEMENT avec un tableau JSON valide. Aucun texte, aucune explication, pas de backticks. JUSTE le JSON.

FORMAT ENDURANCE : [{"mode":"single|interval","type":"warmup|effort|recovery|cooldown","label":"Nom","zone":1-5,"value":"watts ou allure","durationMin":nombre,"reps":nombre,"effortMin":nombre,"recoveryMin":nombre,"recoveryZone":1-5,"hrAvg":""}]
FORMAT MUSCU / HYROX : {"mode":"single","type":"effort|circuit_header","label":"Nom EN ANGLAIS","zone":SÉRIES,"value":"CHARGE_KG","reps":REPS,"durationMin":0,"hrAvg":"","effortMin":0,"recoveryMin":REPOS}

ZONES ENDURANCE : Z1=récup, Z2=endurance, Z3=tempo/SL1, Z4=seuil/SL2, Z5=VO2max/PMA
INTENSITÉS : VÉLO/ELLIPTIQUE=watts, RUNNING=allure/km, NATATION=allure/100m, AVIRON=allure/500m

MUSCU / HYROX :
- zone = nombre de SÉRIES (pas une zone cardio)
- value = charge kg SANS unité ("60" pas "60kg"). Vide "" si poids de corps
- reps = répétitions. Si non précisé : 8-10 force, 12-15 endurance musculaire
- recoveryMin = repos entre séries (1.5 = 90s par défaut)
- durationMin = distance en mètres pour Sled/Farmer Carry/Run. 0 sinon
- hrAvg = kcal pour SkiErg/Rowing/Echo Bike. Vide sinon
- effortMin = durée en minutes si exercice au temps (45s → 0.75). 0 sinon
- circuit_header OBLIGATOIRE avant chaque groupe d'exercices (sauf séance simple sans circuit)
  → mode : "series"|"circuit"|"superset"|"emom"|"tabata"
  → zone = rounds. /lap → mode "circuit". /emom durationMin=durée totale
FR→EN OBLIGATOIRE : Développé couché→Bench Press, Traction/Pull up→Pull Up, Traction australienne→Australian Pull Up, Rowing banc→Barbell Row, Développé militaire/Push press→Push Press, Pompe/Push up→Push Up, Squat→Squat, Soulevé de terre→Deadlift, Fente→Lunge, Gainage/Plank→Plank, Dips→Dips, Curl biceps→Bicep Curl, Élévation latérale→Lateral Raise, Sled Push→Sled Push, SkiErg→SkiErg, Wall Balls→Wall Balls, Burpee Broad Jump→Burpee Broad Jump, Farmer Carry→Farmer Carry, Echo Bike/Assault Bike→Echo Bike, Rowing→Rowing, KB Swing→Kettlebell Swing

RÈGLES CRITIQUES :
1. JAMAIS moyenner les intensités — "250w et 220w" = 2 blocs SÉPARÉS, pas 1 bloc à 235w
2. Parenthèses = structure INTERNE à décomposer bloc par bloc
3. "/" = "puis" (séquentiel), "x3" ou "×3" = répéter 3 fois, "-" = suivi de
4. TOUJOURS décomposer en blocs INDIVIDUELS, jamais fusionner des intensités différentes
5. Ajouter échauffement (warmup) + retour calme (cooldown) si absents pour l'endurance
6. Pyramide = un bloc interval par palier (montée + descente séparément)
7. durationMin d'un interval = reps × (effortMin + recoveryMin)

EXEMPLES ENDURANCE :
"2x30' (30=5'@250w/5'@220w x3) - 10' récup @170w" →
  interval reps:2 effortMin:30 → DÉCOMPOSÉ en : interval reps:3 effortMin:5 zone:5 value:"250w" / interval reps:3 effortMin:5 zone:4 value:"220w" / single 10' zone:2 value:"170w"

"5×1000m @3:45/km R:90s" → interval reps:5 effortMin:3.75 zone:5 value:"3:45" recoveryMin:1.5 durationMin:26.25

EXEMPLES MUSCU :
"Bench @60kg + Pull up 12 reps /superset x4" →
  [{"type":"circuit_header","mode":"superset","label":"Superset","zone":4,"reps":0,"value":"","durationMin":0,"hrAvg":"","effortMin":0,"recoveryMin":1.5},
   {"type":"effort","mode":"single","label":"Bench Press","zone":4,"reps":10,"value":"60","durationMin":0,"hrAvg":"","effortMin":0,"recoveryMin":0},
   {"type":"effort","mode":"single","label":"Pull Up","zone":4,"reps":12,"value":"","durationMin":0,"hrAvg":"","effortMin":0,"recoveryMin":0}]`

const NUTRITION_SYSTEM_PROMPT_TPL = (durationMin: number, blocks: string) =>
  `Tu es un nutritionniste sportif expert. Génère une stratégie de ravitaillement en JSON.
Format : [{"timeMin":0,"type":"gel|barre|boisson|solide|autre","name":"Nom","quantity":"1 gel","glucidesG":25,"proteinesG":0}]
Règles :
- 60-90g glucides/h si durée > 1h30. Séances < 1h : juste hydratation.
- Respecte les fréquences EXACTES demandées (1 gel/30min ≠ 1 gel/60min).
- Si deux aliments tombent au même moment → une entrée PAR aliment avec le MÊME timeMin.
- Utilise les noms EXACTS des produits si l'athlète en fournit.
- Dernier ravitaillement solide 15-20min avant la fin max.
Réponds UNIQUEMENT avec un tableau JSON []. Aucun texte avant ou après.
Séance : ${durationMin}min, ${blocks || 'non détaillée'}`

// Contexte sport ajouté au message utilisateur
const SPORT_CONTEXT: Record<string, string> = {
  bike:       'Sport : Cyclisme. Intensités en WATTS.',
  run:        'Sport : Running. Intensités en allure min:sec/km.',
  swim:       'Sport : Natation. Intensités en allure min:sec/100m.',
  rowing:     'Sport : Aviron. Intensités en allure min:sec/500m.',
  gym:        'Sport : Musculation. Génère exercices avec séries/reps/charge. Noms EN ANGLAIS.',
  hyrox:      'Sport : Hyrox. Génère les stations Hyrox + runs. Noms EN ANGLAIS.',
  muscu:      'Sport : Musculation. Génère exercices avec séries/reps/charge. Noms EN ANGLAIS.',
  elliptique: 'Sport : Elliptique. Intensités en WATTS.',
}

// ── Instructions tool use — ajoutées au system prompt chat ────

const TOOL_INSTRUCTIONS = `
OUTILS DE LECTURE — ENQUÊTE SUR LES DONNÉES (raisonne comme Claude, pas comme un chatbot) :
Tu disposes d'outils pour ALLER CHERCHER les données réelles dont tu as besoin, puis raisonner dessus avant de répondre :
- get_activities : liste d'activités au-delà du contexte (tendances, historique long, un sport précis, les compétitions).
- analyze_sport_metrics : métriques objectives capteurs (courbe de puissance + FTP estimée vélo ; profil d'allure + réserve de vitesse course ; durabilité = fade + découplage cardiaque). À utiliser pour TOUTE analyse de niveau, de point faible ou pour chiffrer une prescription.
- get_training_plan / get_planned_sessions : plan actif et séances planifiées AVEC LEURS ID RÉELS.
RÈGLES :
1. Si une affirmation utile peut être VÉRIFIÉE par un outil (niveau réel, tendance, charge, point faible), APPELLE l'outil au lieu de supposer. Tu peux enchaîner plusieurs lectures avant de conclure.
2. Avant TOUTE modification de plan/séance (add/update/move/delete), si tu n'as pas déjà l'id réel dans le contexte, appelle d'abord get_training_plan ou get_planned_sessions pour récupérer les id — n'invente JAMAIS d'identifiant.
3. N'abuse pas : 1 à 3 lectures ciblées suffisent. Quand tu as ce qu'il faut, RÉPONDS (ou appelle le tool d'action). Ne lis pas en boucle.
4. Les outils de lecture sont INTERNES : n'annonce pas « je vais interroger la base », enchaîne simplement et présente une réponse aboutie, chiffrée.

OUTIL ask_clarifying_questions — POSER LES BONNES QUESTIONS (comportement de coach expert) :
Avant de répondre à une demande importante (créer/ajuster un plan, analyser une situation, choisir un objectif, bâtir une stratégie), assure-toi d'avoir les informations DÉCISIVES. C'est ton intelligence de coach : savoir, selon la situation, ce qui manque vraiment.

RÈGLES IMPÉRATIVES :
1. TOUTE question de clarification passe OBLIGATOIREMENT par le tool ask_clarifying_questions (cartes à choix). Tu ne poses JAMAIS de question en texte libre, ni en liste, ni en tableau Markdown. Si tu as besoin d'infos → tu appelles le tool, point.
2. REGROUPE toutes les questions décisives en UN SEUL appel (jusqu'à 6 questions pour les cas riches comme la création d'un plan : objectif, durée, niveau, date de début, type de compétition, fréquence…). Ne fais pas plusieurs tours successifs.
3. Après avoir reçu les réponses → GÉNÈRE directement ta réponse / ton plan. N'ouvre PAS un nouveau tour de questions, sauf si une réponse révèle une information réellement bloquante (et dans ce cas encore : via le tool, jamais en texte).
4. Pour les détails MINEURS manquants → ne demande pas, choisis une valeur standard raisonnable et ÉNONCE ton hypothèse dans la réponse.
5. Données (zones, FC, FTP, historique…) : utilise EN PRIORITÉ le contexte. Si une donnée est absente, pars sur des intensités/valeurs relatives et indique brièvement où la renseigner — n'en fais JAMAIS un interrogatoire.
6. Ne redemande jamais une donnée déjà présente dans le contexte. Si la demande est déjà claire et complète → réponds DIRECTEMENT, sans aucune question.
7. Ne combine pas ask_clarifying_questions avec un tool de modification du plan dans le même tour : pose d'abord, agis au tour suivant.

Tu as aussi accès à des outils pour modifier directement le plan d'entraînement de l'athlète.
Quand l'athlète te demande d'ajouter, modifier, supprimer ou déplacer une séance, ou de modifier la périodisation, utilise le tool approprié.
Ne dis JAMAIS à l'athlète de faire les modifications lui-même — tu as les outils pour le faire.
Avant d'appeler un tool, explique brièvement ce que tu vas faire. Exemple : "Je vais ajouter une séance de natation mardi S3."
Si la demande est ambiguë (quelle semaine ? quel jour ?), pose une question de clarification AVANT d'appeler le tool.

RÈGLE CRITIQUE — CHOIX DU BON TOOL :
- N'INVENTE JAMAIS un identifiant (training_plan_id, session_id). Utilise UNIQUEMENT les UUID réels présents dans le contexte. N'écris jamais de valeur factice comme "current-plan" ou "plan-1".
- CRÉER un nouveau plan → tool create_training_plan. Le système génère le plan détaillé à partir de TA méthodologie ET de toutes les données réelles de l'athlète (zones, historique, performances, COURSES/objectif du calendrier, santé). Tu n'as ni à générer les séances ni à fournir d'identifiant.

  COMPORTEMENT DE COACH EXPERT — OBLIGATOIRE :
  1. NE REDEMANDE JAMAIS ce que l'app connaît déjà : l'objectif et la date de course sont dans le calendrier ; les zones, performances et l'historique sont en base. Déduis-les. Ne pose de questions QUE sur l'inconnu subjectif : blessures/gênes non enregistrées, préférences, jours disponibles/indisponibles, et le choix de méthode.
  2. CHOIX DE MÉTHODE (via ask_clarifying_questions) : propose 2-3 méthodes pertinentes (voir BIBLIOTHÈQUE), PLUS l'option « Choisis pour moi (selon mes données) » et « Je décris ma façon de m'entraîner ». Si « Choisis pour moi » → sélectionne la meilleure méthode d'après ses données et justifie-la. Si « Je décris » → adapte-toi à sa description.
  3. PROPOSE TA MÉTHODOLOGIE : raisonne comme un coach d'élite (forme actuelle, base déjà acquise, blessures, dénivelé de la course, échéance) et bâtis une logique SUR-MESURE, sport par sport, en expliquant le POURQUOI. C'est TOI qui guides l'athlète.
  4. Appelle create_training_plan en remplissant : methodologie (ta logique détaillée et justifiée, sport par sport — le générateur la suit fidèlement), methode (méthode retenue), requirements_resume (tout le reste : préférences, contraintes, blessures, jours…).

${methodsIndexText()}
Choisis/propose selon le sport, l'objectif, le temps disponible et le profil. Si une MÉTHODE RETENUE est précisée plus bas, applique-la.
- MODIFIER un plan existant (add_session / add_week / update_plan_periodisation / move / delete) → uniquement si un training_plan_id ou session_id RÉEL figure dans le contexte. S'il n'y en a pas, ne tente pas de modifier : crée un plan (create_training_plan) ou réponds en texte.
- Si une semaine est marquée "⚠️ AUCUNE SÉANCE — semaine vide" → utilise OBLIGATOIREMENT add_week pour créer cette semaine.
- Si une séance a déjà un id: → utilise update_session pour la modifier ou move_session pour la déplacer.
- Ne jamais appeler update_session sur une séance qui n'existe pas (pas d'id). Ce serait une erreur.

Tu es un coach expert — TU DÉCIDES du contenu des séances. L'athlète n'a pas à te les dicter.
Quand il te demande "crée une semaine de deload" ou "ajoute une semaine de récup", tu génères toi-même les séances adaptées
en analysant le contexte : sport(s) du plan, semaines précédentes, objectif, bloc de périodisation.

DIRECTIVES POUR UNE SEMAINE DE DELOAD (avant compétition ou fin de bloc) :
- Réduis le volume de 40–50 % par rapport à la semaine précédente
- Garde 1–2 séances avec de courtes touches d'intensité pour maintenir les sensations (ex: 4×3min Z4 au lieu de 10×3min)
- Inclus 1 jour de repos complet la veille ou l'avant-veille de la compétition
- Adapte les sports selon le plan : triathlon → nage + vélo + run ; running → run easy + un fartlek court
- Durées typiques deload : 30–45min au lieu de 60–90min
- Utilise intensity: "low" ou "moderate" pour les séances deload, jamais "high" ou "max"`

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  let userId: string
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    userId = user.id
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur d\'authentification' }), { status: 401 })
  }

  // ── Quota ─────────────────────────────────────────────────────
  const check = await enforceQuota(userId, 'message')
  if (!check.allowed) return check.response

  // ── Tier / modèle ─────────────────────────────────────────────
  const tier      = await getUserTier(userId)
  const tierModel = TIER_LIMITS[tier].model
  const model     = MODEL_IDS[tierModel]
  const maxTokens = MODEL_MAX_TOKENS[tierModel]

  console.log(`[coach-stream] tier=${tier} model=${tierModel} → ${model}`)

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // ══════════════════════════════════════════════════════════════
  // MODE 1 — SESSION PARSER (sport présent, pas d'agentId)
  // ══════════════════════════════════════════════════════════════
  if (body.sport !== undefined && !body.agentId) {
    const sport    = (body.sport as string) || ''
    const mode     = (body.mode as string | undefined) || 'session'
    const messages = body.messages as Array<{ role: string; content: string }> | undefined
    const userMessage = messages?.[0]?.content ?? ''

    // ── Contexte parcours (montées significatives) ─────────────
    type ClimbInfo = {
      startKm: number; endKm: number; distanceKm: number
      elevationGainM: number; avgGradientPct: number; maxGradientPct: number
    }
    const parcoursClimbs  = (body.parcoursClimbs as ClimbInfo[] | undefined) ?? []
    const parcoursName    = (body.parcoursName as string | undefined) ?? ''
    const parcoursTotalKm = (body.parcoursTotalKm as number | undefined) ?? null

    if (!userMessage.trim()) {
      return new Response(JSON.stringify({ error: 'No message provided' }), { status: 400 })
    }

    let systemPrompt: string
    let fullMessage: string

    if (mode === 'nutrition') {
      const ctx = body.context as { duration?: number; blocks?: string } | undefined
      systemPrompt = NUTRITION_SYSTEM_PROMPT_TPL(ctx?.duration ?? 0, ctx?.blocks ?? '')
      fullMessage  = userMessage
    } else {
      systemPrompt = SESSION_SYSTEM_PROMPT

      // Injecter le contexte altimétrique si des montées significatives sont présentes
      let climbCtx = ''
      if (parcoursClimbs.length > 0) {
        const climbLines = parcoursClimbs.map((c, i) =>
          `  C${i + 1}: km ${c.startKm}→${c.endKm} | ${c.distanceKm}km | D+${c.elevationGainM}m | moy ${c.avgGradientPct}% | max ${c.maxGradientPct}%`
        ).join('\n')
        climbCtx = `\n\nPARCOURS : ${parcoursName}${parcoursTotalKm ? ` (${parcoursTotalKm} km)` : ''}\nMontées significatives :\n${climbLines}\n→ Génère des blocs calés sur ces montées. Les descentes/plats entre elles sont inférés automatiquement.`
      }

      const sportCtx = SPORT_CONTEXT[sport] ?? ''
      fullMessage = [sportCtx, climbCtx, `\nSÉANCE DEMANDÉE :\n${userMessage}`]
        .filter(Boolean).join('')
    }

    // Appel Anthropic streaming direct
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: fullMessage }],
      }),
    })

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text()
      console.error('[coach-stream] parser error:', anthropicRes.status, errorText)
      return new Response(JSON.stringify({ error: `API error: ${anthropicRes.status}` }), { status: anthropicRes.status })
    }

    const encoder = new TextEncoder()
    let inputTokens = 0, outputTokens = 0

    const parserStream = new ReadableStream({
      async start(controller) {
        const reader  = anthropicRes.body?.getReader()
        if (!reader) { controller.close(); return }
        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data) as Record<string, unknown>
                if (parsed.type === 'content_block_delta') {
                  const delta = parsed.delta as Record<string, unknown> | undefined
                  if (typeof delta?.text === 'string') {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`))
                  }
                } else if (parsed.type === 'message_start') {
                  const msg = parsed.message as Record<string, unknown> | undefined
                  const usage = msg?.usage as Record<string, unknown> | undefined
                  inputTokens = (usage?.input_tokens as number) ?? 0
                } else if (parsed.type === 'message_delta') {
                  const usage = parsed.usage as Record<string, unknown> | undefined
                  outputTokens = (usage?.output_tokens as number) ?? 0
                }
              } catch { /* non-JSON SSE line */ }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (e) {
          console.error('[coach-stream] parser stream error:', e)
        } finally {
          controller.close()
          void logUsage(userId, 'message', {
            model,
            stop_reason: 'end_turn',
            input_tokens:  inputTokens,
            output_tokens: outputTokens,
          })
        }
      },
    })

    return new Response(parserStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // ══════════════════════════════════════════════════════════════
  // MODE 2 — CHAT COACH (existant, avec outils)
  // ══════════════════════════════════════════════════════════════
  const chatBody = body as unknown as ChatInput & { aiRules?: { category: string; rule_text: string }[] }

  if (!chatBody.messages?.length) {
    return new Response('No messages provided', { status: 400 })
  }

  // Modèle effectif = celui choisi dans le composer, plafonné par le tier
  // (on ne peut pas choisir plus haut que son abonnement). On le calcule ICI
  // pour que le system prompt par-modèle (Hermès/Athéna/Zeus) corresponde
  // TOUJOURS au modèle réellement exécuté — sinon un prompt « Zeus » pourrait
  // tourner sur le modèle Hermès.
  const RANK: Record<string, number> = { hermes: 0, athena: 1, zeus: 2 }
  const requestedKey = ((chatBody as { modelId?: string }).modelId ?? 'athena')
  const cappedKey = (RANK[requestedKey] ?? 1) <= (RANK[tierModel] ?? 1) ? requestedKey : tierModel

  let chatSystemPrompt: string
  let anthropicMessages: { role: string; content: unknown }[]
  try {
    const built = buildChatParams({ ...chatBody, modelId: cappedKey as ChatInput['modelId'], aiRules: chatBody.aiRules ?? [] })
    chatSystemPrompt = built.systemPrompt
    anthropicMessages = built.anthropicMessages as { role: string; content: unknown }[]
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[coach-stream] buildChatParams failed:', msg)
    return new Response(JSON.stringify({ error: `Préparation: ${msg}` }), { status: 502, headers: { 'Content-Type': 'application/json' } })
  }

  // ── Assainir l'historique pour l'API : pas de contenu vide, rôles alternés ──
  // (les flux questions/plan ajoutent parfois des messages assistant consécutifs
  //  ou vides → l'API Anthropic rejette ces cas. On fusionne / nettoie.)
  anthropicMessages = (() => {
    const out: { role: string; content: unknown }[] = []
    for (const m of anthropicMessages) {
      const isStr = typeof m.content === 'string'
      const txt = isStr ? (m.content as string).trim() : m.content
      if (isStr && !txt) continue                    // drop message vide
      const last = out[out.length - 1]
      if (last && last.role === m.role && isStr && typeof last.content === 'string') {
        last.content = `${last.content}\n\n${txt as string}`   // fusionne rôles consécutifs
      } else {
        out.push({ role: m.role, content: isStr ? txt : m.content })
      }
    }
    while (out.length && out[0].role !== 'user') out.shift()   // doit commencer par user
    return out
  })()
  if (!anthropicMessages.length) {
    return new Response(JSON.stringify({ error: 'Conversation vide après nettoyage.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const client = getAnthropicClient()
  let systemWithTools = `${chatSystemPrompt}\n\n${TOOL_INSTRUCTIONS}`

  // ── Graphiques dans le chat (coach central) ──
  //    L'IA peut insérer un graphe SVG dans le fil de sa réponse via un bloc
  //    ```thw-chart {json}```. Injecté pour tout le chat central (tous modèles).
  if ((chatBody as { agentId?: string }).agentId === 'central') {
    systemWithTools += `

═══════════ GRAPHIQUES DANS LA RÉPONSE ═══════════
IMPORTANT : tu DISPOSES de la capacité d'afficher des graphiques dans le chat.
Ne dis JAMAIS le contraire (jamais « je ne peux pas générer de graphique », jamais
« regarde dans l'app »). Pour tracer un graphe, il te suffit d'écrire un bloc de
code de langage \`thw-chart\` contenant un JSON — l'app le transforme en graphe.
Modèle :
\`\`\`thw-chart
{"type":"line","title":"Évolution FTP","y_unit":"W","series":[{"name":"FTP","points":[{"x":"Jan","y":240},{"x":"Fév","y":248},{"x":"Mar","y":255}]}]}
\`\`\`

QUAND PRODUIRE UN GRAPHIQUE (impératif) : dès que la demande porte sur une
ÉVOLUTION dans le temps, une COMPARAISON (plusieurs activités/semaines/périodes),
une RÉPARTITION ou une COURBE (volume, charge, distance, allure, puissance/FTP,
FC, zones, TSS/CTL/ATL…), tu DOIS inclure un graphique \`thw-chart\` EN PLUS du
texte. Pour ces cas, un tableau markdown NE SUFFIT PAS et NE remplace PAS le
graphique — mets les deux si tu veux, mais le graphique est obligatoire.
N'omets le graphique que pour les demandes purement qualitatives (conseil,
explication) où aucune série de chiffres n'est en jeu.

Règles : "type" ∈ line | bar | area (bar pour des volumes par semaine, line/area
pour une évolution) ; 1 à 3 séries partageant les MÊMES x ; "y" numérique ; au
plus ~12 points par série ; couleurs auto (n'en mets pas). Écris ton analyse
avant/après le graphe. Base TOUJOURS les données sur les chiffres RÉELS de
l'athlète (jamais inventés) ; si tu n'as pas encore les chiffres, lis-les d'abord
avec tes outils.`
  }

  // ── Recherche web + fiabilité des chiffres (Athéna/Zeus) ──
  if ((chatBody as { agentId?: string }).agentId === 'central' && (cappedKey === 'athena' || cappedKey === 'zeus')) {
    systemWithTools += `

═══════════ RECHERCHE WEB & RIGUEUR DES CHIFFRES ═══════════
Tu DISPOSES d'un outil de recherche web (web_search). Utilise-le dès que la
réponse dépend d'un fait à jour, d'une référence scientifique, ou d'un chiffre
que tu n'es pas certain de connaître précisément (besoins caloriques, dépense
énergétique d'un sport, apports glucidiques recommandés, normes physiologiques…).
Mieux vaut vérifier que répondre de mémoire.

RIGUEUR QUANTITATIVE (impératif) : pour toute recommandation chiffrée (calories,
macros, allures, charges), RAISONNE à partir des données réelles de l'athlète
(poids, volume et intensité d'entraînement) et de méthodes établies — au besoin
vérifie par une recherche. Ne SOUS-ESTIME JAMAIS les besoins énergétiques d'un
gros volume d'entraînement : un athlète qui enchaîne plusieurs heures (vélo long,
PMA, natation, côtes…) peut avoir besoin de 3 500–5 000 kcal/jour. Calcule le
besoin = métabolisme de base + dépense réelle des séances du jour ; explicite ton
calcul. Si un chiffre te paraît bas pour la charge, c'est qu'il est faux : recalcule.`
  }

  // ── Qualité coaching : variété des séances + réalisme de la charge ──
  if ((chatBody as { agentId?: string }).agentId === 'central') {
    systemWithTools += `

═══════════ QUALITÉ DES SÉANCES (impératif) ═══════════
VARIÉTÉ : ne propose PAS systématiquement du « seuil continu 30–45 min ». C'est
rare en pratique. Varie les formats selon l'objectif : intervalles (ex. 5×1000,
3×3 km, 6×3 min), fractionné court (30/30, 40/20), over-under, fartlek, côtes,
allure spécifique course, sortie progressive, tempo fractionné, longue avec
blocs… Le seuil continu long reste l'exception, pas le défaut.

RÉALISME DE LA CHARGE : adapte TOUJOURS au niveau RÉEL de l'athlète (ses données).
Les méthodes d'élite — double seuil norvégien, doubles séances quotidiennes,
gros volumes au seuil — ne conviennent QU'À une minorité d'athlètes très
entraînés. Pour la grande majorité, c'est intenable et contre-productif :
n'en propose pas par défaut, et si le sujet vient, PRÉCISE explicitement que
très peu d'athlètes peuvent encaisser une telle charge et propose une version
réaliste adaptée à CET athlète.`
  }

  // ── Doctrine ciblée injectée (principes + méthode choisie + doc selon mots-clés) ──
  if ((chatBody as { agentId?: string }).agentId === 'central') {
    try {
      const selectedMethod = (chatBody as { method?: string }).method
      const lastUser = [...(chatBody.messages ?? [])].reverse().find(m => m.role === 'user')
      const doctrine = buildDoctrineForChat({
        methodId: selectedMethod,
        lastUserMessage: typeof lastUser?.content === 'string' ? lastUser.content : '',
      })
      if (doctrine) systemWithTools = `${systemWithTools}${doctrine}`
    } catch (e) {
      console.error('[coach-stream] doctrine injection failed:', e)
    }
  }

  // ── Contexte central : compétences + contexte athlète + mémoire + insights
  //    chargés EN PARALLÈLE (avant c'était partiellement séquentiel → latence).
  //    Tous fail-open : si l'un échoue, le coach répond quand même.
  if ((chatBody as { agentId?: string }).agentId === 'central') {
    try {
      const sbCtx = await createClient()
      const convId = (chatBody as { convId?: string }).convId
      const lastUserMsg = [...(chatBody.messages ?? [])].reverse().find(m => m.role === 'user')
      const lastText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : ''
      const [competencesBlock, athleteCtx, memory, insights] = await Promise.all([
        getActiveCompetencesPrompt(userId).catch(() => ''),
        buildAthleteContext(sbCtx, userId).catch(() => ''),
        buildCoachMemory(sbCtx, userId, convId).catch(() => ''),
        buildLearnedInsights(lastText).catch(() => ''),
      ])
      // Append dans l'ordre stable (compétences → contexte → mémoire → insights)
      if (competencesBlock) systemWithTools = `${systemWithTools}\n\n${competencesBlock}`
      if (athleteCtx)       systemWithTools = `${systemWithTools}\n\n${athleteCtx}`
      if (memory)           systemWithTools = `${systemWithTools}\n\n${memory}`
      if (insights)         systemWithTools = `${systemWithTools}\n\n${insights}`
    } catch (e) {
      console.error('[coach-stream] central context injection failed:', e)
    }
  }

  // ── Mode vocal : DEUX sorties — orale (parlée EN PREMIER) + écrite (résumé) ──
  if ((chatBody as { voice?: boolean }).voice) {
    systemWithTools = `${systemWithTools}

═══════════ MODE VOCAL — CONSIGNE PRIORITAIRE (PRIME SUR TOUT LE RESTE) ═══════════
Ta réponse DOIT être composée de DEUX parties, dans cet ordre EXACT, l'ORALE D'ABORD, avec ces balises littérales. Tu COMMENCES par "###ORAL###" et tu N'écris STRICTEMENT RIEN d'autre en dehors de ces deux blocs :

###ORAL###
Ta réponse PARLÉE, EN PREMIER : conversationnelle, naturelle, 2 à 5 phrases courtes, SANS aucun markdown ni symbole (#, *, |, -). Tu vas à l'essentiel comme un coach qui discute, et tu TERMINES TOUJOURS par une question ou une relance pertinente. C'est une vraie conversation. Écris des phrases COMPLÈTES séparées par une ponctuation (. ! ?) pour qu'elles puissent être dites au fur et à mesure.

###ECRIT###
APRÈS l'oral : un résumé SCHÉMATISÉ et aéré pour l'écran. CE N'EST PAS la transcription de l'oral : tu extrais seulement les points importants, sous forme de sous-titres courts en **gras**, de tirets, avec des sauts de ligne entre les sections et les chiffres clés mis en avant. Si la demande s'y prête (évolution, comparaison, répartition), inclus un graphique \`thw-chart\` et/ou un tableau. Bref et agréable à lire.

(Les deux parties doivent être DIFFÉRENTES : l'oral discute, l'écrit schématise. Cette consigne annule toute consigne de format/markdown donnée plus haut pour la partie orale.)`
  }

  // ── Pré-check tokens (fail-open : n'interrompt jamais en cas d'erreur) ──
  const tokenModelKey = (chatBody as { modelId?: string }).modelId ?? 'athena'
  try {
    const tl = await getUserTokenLimits(userId)
    const rawEstimate = Math.ceil((JSON.stringify(anthropicMessages).length + systemWithTools.length) / 4)
    const estimate = Math.ceil(rawEstimate * getModelMultiplier(tokenModelKey))
    const remainingRolling = tl.rolling_6h.limit - tl.rolling_6h.used
    const remainingTotal = (tl.monthly.limit - tl.monthly.used) + tl.bonus_tokens
    if (estimate > remainingRolling) {
      const hours = Math.max(1, Math.ceil((new Date(tl.rolling_6h.resets_at).getTime() - Date.now()) / 3_600_000))
      return new Response(JSON.stringify({ error: `Limite de 6h atteinte. Réinitialisation dans ${hours}h.` }), { status: 402, headers: { 'Content-Type': 'application/json' } })
    }
    if (estimate > remainingTotal) {
      return new Response(JSON.stringify({ error: 'Limite hebdomadaire de tokens atteinte. Recharge pour continuer.' }), { status: 402, headers: { 'Content-Type': 'application/json' } })
    }
  } catch (e) {
    console.error('[coach-stream] token pre-check failed (fail-open):', e)
  }

  // ── Modèle effectif du CHAT (cappedKey calculé plus haut, aligné avec le prompt) ──
  const chatModel = MODEL_IDS[cappedKey as keyof typeof MODEL_IDS] ?? model
  const chatMaxTokens = MODEL_MAX_TOKENS[cappedKey as keyof typeof MODEL_MAX_TOKENS] ?? maxTokens
  console.log(`[coach-stream] chat model selection → requested=${requestedKey} tier=${tierModel} → ${cappedKey} (${chatModel})`)

  // ══════════════════════════════════════════════════════════════
  // BOUCLE AGENTIQUE STREAMÉE
  //
  // À chaque étape : on streame la réponse du modèle token-par-token,
  // puis on inspecte ses tool_use :
  //  • outils de LECTURE (read-tools) → résolus côté serveur, le résultat
  //    est renvoyé au modèle qui RAISONNE et continue la boucle ;
  //  • outils d'ACTION terminaux (ask_clarifying_questions,
  //    create_training_plan, add_session…) → émis au front comme avant,
  //    et la boucle s'arrête (hand-off UI, comportement inchangé) ;
  //  • aucun tool → réponse finale déjà streamée, on s'arrête.
  // ══════════════════════════════════════════════════════════════
  const allTools = [...coachTools, ...readTools]
  const MAX_STEPS = 6

  // ── PROMPT CACHING ──────────────────────────────────────────────
  // Le bloc système (prompt + contexte athlète + doctrine + mémoire) et la
  // liste d'outils sont IDENTIQUES à chaque tour de boucle agentique (et d'un
  // message à l'autre dans la fenêtre de 5 min). On les marque `ephemeral` :
  //  • tour 1 → écriture cache (≈125 % du coût, une seule fois) ;
  //  • tours 2→6 + messages suivants → lecture cache à 10 %.
  // Effet : la boucle ne refacture plus le gros préambule plein tarif à chaque
  // étape → conso réelle divisée par ~3-4 sur une analyse multi-outils.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: systemWithTools, cache_control: { type: 'ephemeral' } },
  ]
  const cachedCustom = allTools.map((t, i) =>
    i === allTools.length - 1
      ? ({ ...t, cache_control: { type: 'ephemeral' } })
      : t,
  ) as typeof allTools
  // ── Web search (Athéna/Zeus) ──
  // Recherche web côté serveur Anthropic : ancre les réponses sur la science /
  // les faits à jour au lieu de répondre « de mémoire » (chiffres fiables).
  // Réservé aux modèles avancés (Haiku ne supporte pas cette version d'outil).
  const webEnabled = cappedKey === 'athena' || cappedKey === 'zeus'
  const cachedTools = (webEnabled
    ? [...cachedCustom, { type: 'web_search_20260209', name: 'web_search', max_uses: 5 }]
    : cachedCustom) as unknown as Anthropic.ToolUnion[]

  // ── Raisonnement étendu (extended thinking) — DÉSACTIVÉ ──
  // Mis en pause : il ajoutait trop de latence (le coach « réfléchissait » trop
  // longtemps, même pour une question simple) et déclenchait des erreurs sur le
  // chat. On privilégie des réponses rapides. Pour le réactiver plus tard
  // (feuille « Processus de réflexion »), repasser thinkingEnabled à la condition
  // agentId === 'central' && (athena|zeus) et streamer l'event « thinking ».
  const thinkingEnabled = false
  const thinkingParam = thinkingEnabled
    ? { thinking: { type: 'enabled' as const, budget_tokens: 2048 } }
    : {}

  // Client Supabase dédié aux outils de lecture (réutilisé sur toute la boucle)
  const sbForTools = await createClient()

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const send = (eventType: string, data: string) =>
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`))

      let convMessages = anthropicMessages as Anthropic.MessageParam[]
      let totalIn = 0, totalOut = 0
      let lastStop: string | null = null

      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          const ms = client.messages.stream({
            model: chatModel,
            max_tokens: chatMaxTokens,
            system: systemBlocks,
            messages: convMessages,
            tools: cachedTools,
            tool_choice: { type: 'auto' },
            ...thinkingParam,
          })

          // Streaming live du texte token-par-token + raisonnement + statut web
          let webAnnounced = false
          for await (const ev of ms) {
            if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) {
              send('text', JSON.stringify(ev.delta.text))
            } else if (ev.type === 'content_block_delta' && ev.delta.type === 'thinking_delta' && ev.delta.thinking) {
              // Raisonnement étendu en direct → feuille « Processus de réflexion »
              send('thinking', JSON.stringify(ev.delta.thinking))
            } else if (
              !webAnnounced &&
              ev.type === 'content_block_start' &&
              (ev.content_block as { type?: string })?.type === 'server_tool_use' &&
              (chatBody as { agentId?: string }).agentId === 'central'
            ) {
              webAnnounced = true
              send('tool_status', JSON.stringify({ tools: ['web_search'] }))
            }
          }

          const finalMsg = await ms.finalMessage()
          // Conso d'entrée pondérée par le coût réel du cache :
          //  • input_tokens          = entrée non cachée (plein tarif) ;
          //  • cache_creation_tokens = écriture cache (~125 %, ≈ plein tarif) ;
          //  • cache_read_tokens     = lecture cache → facturée 10 %.
          const u = finalMsg.usage as Anthropic.Usage & {
            cache_creation_input_tokens?: number | null
            cache_read_input_tokens?: number | null
          }
          totalIn  += (u?.input_tokens ?? 0)
                    + (u?.cache_creation_input_tokens ?? 0)
                    + Math.ceil((u?.cache_read_input_tokens ?? 0) * 0.1)
          totalOut += u?.output_tokens ?? 0
          lastStop  = finalMsg.stop_reason ?? null

          const toolUses = finalMsg.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
          )
          if (toolUses.length === 0) {
            // Recherche web côté serveur non terminée → on relance pour continuer.
            if (lastStop === 'pause_turn') {
              convMessages = [...convMessages, { role: 'assistant', content: finalMsg.content }]
              continue
            }
            break // réponse finale déjà streamée
          }

          const reads     = toolUses.filter(t => READ_TOOL_NAMES.has(t.name))
          const terminals = toolUses.filter(t => !READ_TOOL_NAMES.has(t.name))

          // Un outil d'action terminal → hand-off au front et fin de boucle
          if (terminals.length > 0) {
            for (const t of terminals) {
              console.log('[coach-stream] tool_use (terminal):', t.name)
              send('tool_use', JSON.stringify({ tool_name: t.name, tool_input: t.input }))
            }
            break
          }

          // Uniquement des lectures → on résout puis on reboucle
          convMessages = [...convMessages, { role: 'assistant', content: finalMsg.content }]
          // Statut « le coach consulte tes données » émis au front (chat central
          // uniquement, pour ne pas perturber les parseurs des flows guidés).
          if ((chatBody as { agentId?: string }).agentId === 'central') {
            send('tool_status', JSON.stringify({ tools: reads.map(r => r.name) }))
          }
          const results: Anthropic.ToolResultBlockParam[] = []
          for (const r of reads) {
            console.log('[coach-stream] read-tool:', r.name)
            const out = await resolveReadTool(r.name, (r.input ?? {}) as Record<string, unknown>, sbForTools, userId)
            results.push({ type: 'tool_result', tool_use_id: r.id, content: out })
          }
          convMessages = [...convMessages, { role: 'user', content: results }]

          if (step === MAX_STEPS - 1) {
            // Garde-fou : on ne laisse pas la boucle se terminer sur des lectures sans synthèse
            send('text', JSON.stringify('\n\n_(analyse interrompue — trop d\'étapes)_'))
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[coach-stream] agentic loop error:', msg)
        send('text', JSON.stringify(`\n\n⚠️ IA : ${msg}`))
      } finally {
        controller.close()
      }

      // ── Comptabilité tokens (best-effort, pondérée modèle) ──
      try {
        if (totalIn + totalOut > 0) void recordTokenUsage(userId, totalIn + totalOut, { model: tokenModelKey })
      } catch (e) {
        console.error('[coach-stream] recordTokenUsage failed:', e)
      }
      void logUsage(userId, 'message', {
        model: chatModel,
        stop_reason: lastStop ?? 'end_turn',
        input_tokens:  totalIn,
        output_tokens: totalOut,
      })
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
