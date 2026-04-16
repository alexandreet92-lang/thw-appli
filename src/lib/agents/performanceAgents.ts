// ══════════════════════════════════════════════════════════════
// PERFORMANCE AGENTS
// Appels aux Managed Agents Anthropic pour l'onglet Performance.
// 3 agents spécialisés : Profil, Tests, Explication de données.
// ══════════════════════════════════════════════════════════════

const API_BASE   = 'https://api.anthropic.com/v1'
const BETA_HEADER = 'managed-agents-2026-04-01'

const AGENT_IDS = {
  profil:  'agent_011Ca8DqHw1fHXhq7yeSNNrG',
  tests:   'agent_011Ca8Ds9wMNxrpNi4B9YQuz',
  explain: 'agent_011Ca8DwizZna5RJJXcg4s25',
} as const

// ── Types ────────────────────────────────────────────────────

export interface AthleteProfile {
  ftp?: number
  weight?: number
  age?: number
  lthr?: number
  hrMax?: number
  hrRest?: number
  thresholdPace?: string
  vma?: number
  css?: string
  vo2max?: number
}

// ── Utilitaire SSE ───────────────────────────────────────────

interface SseEvent {
  type: string
  content?: { type: string; text: string }[]
  error?: { message?: string }
}

async function callManagedAgent(agentId: string, userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADER,
  }

  const envId = process.env.ANTHROPIC_ENVIRONMENT_ID
  const sessBody: Record<string, string> = { agent: agentId }
  if (envId) sessBody.environment_id = envId

  // 1. Créer la session
  const sessRes = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(sessBody),
  })
  if (!sessRes.ok) {
    const err = await sessRes.text()
    throw new Error(`Create session failed: ${sessRes.status} — ${err}`)
  }
  const sess = await sessRes.json() as { id: string }
  const sessionId = sess.id

  // 2. Envoyer le message utilisateur
  const evtRes = await fetch(`${API_BASE}/sessions/${sessionId}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      events: [{ type: 'user.message', content: [{ type: 'text', text: userMessage }] }],
    }),
  })
  if (!evtRes.ok) {
    const err = await evtRes.text()
    throw new Error(`Send events failed: ${evtRes.status} — ${err}`)
  }

  // 3. Streamer la réponse (SSE)
  const streamRes = await fetch(`${API_BASE}/sessions/${sessionId}/stream`, {
    headers: { ...headers, Accept: 'text/event-stream' },
  })
  if (!streamRes.ok || !streamRes.body) {
    throw new Error(`Stream failed: ${streamRes.status}`)
  }

  const reader  = streamRes.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text   = ''

  outer: while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const evt = JSON.parse(raw) as SseEvent
        if (evt.type === 'agent.message' && evt.content) {
          for (const block of evt.content) {
            if (block.type === 'text') text += block.text
          }
        }
        if (evt.type === 'session.status_idle') break outer
        if (evt.type === 'session.error') {
          throw new Error(`Agent error: ${evt.error?.message ?? 'unknown'}`)
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Agent error')) throw e
        // Ignore parse errors on partial chunks
      }
    }
  }

  return text.trim() || 'Analyse terminée.'
}

// ── Fonctions exportées ──────────────────────────────────────

export async function analyzeProfile(profile: AthleteProfile): Promise<string> {
  const wkg = profile.ftp && profile.weight
    ? `${(profile.ftp / profile.weight).toFixed(2)} W/kg`
    : 'non renseigné'

  const message = `Analyse le profil physiologique de cet athlète et donne une évaluation complète :

- FTP : ${profile.ftp ?? 'non renseigné'} W (${wkg})
- VMA : ${profile.vma ?? 'non renseigné'} km/h
- VO2max : ${profile.vo2max ?? 'non renseigné'} ml/kg/min
- FC max : ${profile.hrMax ?? 'non renseigné'} bpm
- FC repos : ${profile.hrRest ?? 'non renseigné'} bpm
- LTHR : ${profile.lthr ?? 'non renseigné'} bpm
- Allure seuil : ${profile.thresholdPace ?? 'non renseigné'} /km
- CSS : ${profile.css ?? 'non renseigné'} /100m
- Poids : ${profile.weight ?? 'non renseigné'} kg
- Âge : ${profile.age ?? 'non renseigné'} ans

Donne : (1) niveau global par discipline, (2) points forts, (3) points faibles, (4) axes de progression prioritaires, (5) recommandations concrètes d'entraînement. Réponds en français de façon structurée.`

  return callManagedAgent(AGENT_IDS.profil, message)
}

export async function analyzeTest(
  testName: string,
  testResults: Record<string, string>,
  profile?: AthleteProfile,
): Promise<string> {
  const hasResults = Object.keys(testResults).length > 0
  const resultsStr = hasResults
    ? Object.entries(testResults).map(([k, v]) => `- ${k} : ${v}`).join('\n')
    : '(aucun résultat enregistré — analyse le protocole et les attentes de performance)'

  const profileStr = profile
    ? `FTP: ${profile.ftp ?? '?'}W, VMA: ${profile.vma ?? '?'} km/h, VO2max: ${profile.vo2max ?? '?'} ml/kg/min, FC max: ${profile.hrMax ?? '?'} bpm, Poids: ${profile.weight ?? '?'} kg`
    : 'non disponible'

  const message = `Analyse le test sportif "${testName}" :

Résultats obtenus :
${resultsStr}

Profil athlète : ${profileStr}

Donne : (1) interprétation des résultats, (2) niveau de performance par rapport aux normes, (3) points forts et faibles identifiés, (4) recommandations concrètes d'entraînement pour progresser sur ce test. Réponds en français de façon structurée.`

  return callManagedAgent(AGENT_IDS.tests, message)
}

export async function explainData(
  dataName: string,
  dataValue: string,
  context?: { sport?: string; period?: string },
): Promise<string> {
  const ctxStr = context?.sport ? ` (sport : ${context.sport})` : ''

  const message = `Explique cette donnée d'entraînement${ctxStr} :

Métrique : ${dataName}
Valeur : ${dataValue}

Donne : (1) définition claire de cette métrique, (2) comment interpréter cette valeur, (3) si c'est un bon niveau (avec références), (4) ce que cette valeur révèle sur la forme/progression de l'athlète, (5) conseils concrets pour l'améliorer. Réponds en français de façon accessible et actionnable.`

  return callManagedAgent(AGENT_IDS.explain, message)
}
