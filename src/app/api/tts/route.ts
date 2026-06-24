// ══════════════════════════════════════════════════════════════
// /api/tts — Synthèse vocale premium (OpenAI gpt-4o-mini-tts).
//
// POST { text, style?, language? } → audio/mpeg (mp3).
//
// · « style » mappe une voix OpenAI + une instruction de ton (manière de
//   parler) : douce / neutre / energique.
// · Si OPENAI_API_KEY est absente → 503 : le client retombe sur la
//   synthèse vocale du navigateur (dégradé gracieux).
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type StyleKey = 'douce' | 'neutre' | 'energique'

// Voix OpenAI + consigne de ton par style (manière de parler)
const STYLES: Record<StyleKey, { voice: string; instructions: string }> = {
  douce: {
    voice: 'coral',
    instructions: 'Parle d\'une voix douce, chaleureuse et apaisante. Débit posé, ton bienveillant, comme un coach attentionné.',
  },
  neutre: {
    voice: 'alloy',
    instructions: 'Parle d\'une voix neutre, claire et professionnelle. Débit régulier, ton informatif et sûr.',
  },
  energique: {
    voice: 'verse',
    instructions: 'Parle d\'une voix énergique, dynamique et motivante, comme un coach sportif qui encourage. Débit vif et enthousiaste.',
  },
}

const LANG_LABEL: Record<string, string> = {
  'fr-FR': 'français',
  'en-US': 'anglais',
  'es-ES': 'espagnol',
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Pas de clé → le client utilisera la voix du navigateur.
      return new Response(JSON.stringify({ error: 'TTS serveur non configuré' }), { status: 503 })
    }

    const body = await req.json() as { text?: string; style?: string; language?: string }
    const text = (body.text ?? '').trim()
    if (!text) return new Response(JSON.stringify({ error: 'Texte vide' }), { status: 400 })

    // Borne de sécurité (coût/latence)
    const input = text.length > 4000 ? text.slice(0, 4000) : text

    const styleKey: StyleKey = (['douce', 'neutre', 'energique'].includes(body.style ?? '')
      ? body.style
      : 'douce') as StyleKey
    const { voice, instructions } = STYLES[styleKey]
    const langLabel = LANG_LABEL[body.language ?? 'fr-FR'] ?? 'français'

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input,
        voice,
        instructions: `${instructions} Parle en ${langLabel}.`,
        response_format: 'mp3',
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[api/tts] OpenAI error', res.status, detail.slice(0, 300))
      return new Response(JSON.stringify({ error: 'Échec synthèse vocale' }), { status: 502 })
    }

    const audio = await res.arrayBuffer()
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[api/tts]', e)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 })
  }
}
