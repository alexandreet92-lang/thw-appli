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
// 2. CHAT COACH (existant)
//    Body : { agentId, messages, context?, modelId?, aiRules? }
//    Appel Anthropic NON-streaming via buildChatParams + outils.
//    Approche non-streaming choisie pour garantir le JSON complet
//    des tool_use avant émission SSE.
// ══════════════════════════════════════════════════════════════

export const runtime     = 'nodejs'
export const maxDuration = 60

import { NextRequest } from 'next/server'
import { getAnthropicClient } from '@/lib/agents/base'
import { buildChatParams } from '@/lib/agents/chatAgent'
import type { ChatInput } from '@/lib/coach-engine/schemas'
import { coachTools } from '@/lib/coach/tools-definition'
import { createClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { getUserTier, logUsage } from '@/lib/subscriptions/check-quota'
import { TIER_LIMITS, MODEL_IDS, MODEL_MAX_TOKENS } from '@/lib/subscriptions/tier-limits'

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
Tu as accès à des outils pour modifier directement le plan d'entraînement de l'athlète.
Quand l'athlète te demande d'ajouter, modifier, supprimer ou déplacer une séance, ou de modifier la périodisation, utilise le tool approprié.
Ne dis JAMAIS à l'athlète de faire les modifications lui-même — tu as les outils pour le faire.
Avant d'appeler un tool, explique brièvement ce que tu vas faire. Exemple : "Je vais ajouter une séance de natation mardi S3."
Si la demande est ambiguë (quelle semaine ? quel jour ?), pose une question de clarification AVANT d'appeler le tool.

RÈGLE CRITIQUE — CHOIX DU BON TOOL :
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
      const sportCtx = SPORT_CONTEXT[sport] ?? ''
      fullMessage = sportCtx
        ? `${sportCtx}\n\nSÉANCE DEMANDÉE :\n${userMessage}`
        : userMessage
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

  const { systemPrompt: chatSystemPrompt, anthropicMessages } = buildChatParams({
    ...chatBody,
    aiRules: chatBody.aiRules ?? [],
  })
  const client = getAnthropicClient()
  const systemWithTools = `${chatSystemPrompt}\n\n${TOOL_INSTRUCTIONS}`

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemWithTools,
    messages: anthropicMessages,
    tools: coachTools,
    tool_choice: { type: 'auto' },
  })

  console.log('[coach-stream] chat response — stop_reason:', response.stop_reason,
    '— blocks:', response.content.length,
    '— usage:', response.usage)

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      const send = (eventType: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`))
      }
      for (const block of response.content) {
        if (block.type === 'text') {
          send('text', JSON.stringify(block.text))
        } else if (block.type === 'tool_use') {
          console.log('[coach-stream] tool_use:', block.name,
            '— input keys:', Object.keys(block.input as Record<string, unknown>))
          send('tool_use', JSON.stringify({ tool_name: block.name, tool_input: block.input }))
        }
      }
      controller.close()
    },
  })

  void logUsage(userId, 'message', {
    model,
    stop_reason: response.stop_reason,
    input_tokens:  response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
