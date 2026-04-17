// ══════════════════════════════════════════════════════════════
// PERFORMANCE AGENTS
// Appels à l'agent unifié Anthropic pour l'onglet Performance.
// ══════════════════════════════════════════════════════════════

const API_BASE    = 'https://api.anthropic.com/v1'
const BETA_HEADER = 'managed-agents-2026-04-01'

const AGENT_ID = 'agent_011CaA6jzcmrj51wUc8qTc7y'

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

async function callManagedAgent(payload: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADER,
  }

  const sessBody: Record<string, string> = { agent: AGENT_ID }
  const envId = process.env.ANTHROPIC_ENVIRONMENT_ID
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

  // 2. Envoyer le message utilisateur (JSON sérialisé)
  const userMessage = JSON.stringify(payload)
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
  return callManagedAgent({
    demande: 'profil_complet',
    profil:  profile,
  })
}

export async function analyzeTest(
  testName: string,
  testResults: Record<string, string>,
  profile?: AthleteProfile,
): Promise<string> {
  return callManagedAgent({
    demande:    'analyse_test',
    test:       testName,
    resultats:  testResults,
    profil:     profile ?? null,
  })
}

export async function explainData(
  dataName: string,
  dataValue: string,
  context?: { sport?: string; period?: string },
): Promise<string> {
  return callManagedAgent({
    demande:  'explication_donnee',
    donnee:   dataName,
    valeur:   dataValue,
    contexte: context ?? null,
  })
}

export async function getLacunes(
  profile: AthleteProfile,
  testHistory: Record<string, unknown>[],
): Promise<string> {
  return callManagedAgent({
    demande:          'lacunes',
    profil:           profile,
    historique_tests: testHistory,
  })
}

export async function getProgression(
  profile: AthleteProfile,
  historique: Record<string, unknown>[],
): Promise<string> {
  return callManagedAgent({
    demande:    'progression',
    profil:     profile,
    historique: historique,
  })
}
