// ══════════════════════════════════════════════════════════════
// /api/stt — Transcription audio (Speech-to-Text, OpenAI).
//
// POST multipart/form-data { file: <audio>, language?: 'fr' } → { text }
//
// · Capté une seule fois côté client (getUserMedia + MediaRecorder) → pas
//   de conflit avec une reconnaissance navigateur, et la waveform peut
//   refléter le vrai volume du micro.
// · Modèle premium gpt-4o-mini-transcribe, repli whisper-1.
// · Si OPENAI_API_KEY absente → 503.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function extFor(type: string): string {
  if (type.includes('mp4'))  return 'mp4'
  if (type.includes('mpeg')) return 'mp3'
  if (type.includes('webm')) return 'webm'
  if (type.includes('ogg'))  return 'ogg'
  if (type.includes('wav'))  return 'wav'
  return 'm4a'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return new Response(JSON.stringify({ error: 'STT serveur non configuré' }), { status: 503 })

    const form = await req.formData()
    const file = form.get('file')
    const language = (form.get('language') as string | null) ?? 'fr'
    if (!(file instanceof Blob) || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Audio vide' }), { status: 400 })
    }

    const filename = `audio.${extFor(file.type || '')}`

    const callOpenAI = async (model: string) => {
      const oaForm = new FormData()
      oaForm.append('file', file, filename)
      oaForm.append('model', model)
      if (language) oaForm.append('language', language.slice(0, 2))
      return fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: oaForm,
      })
    }

    let res = await callOpenAI('gpt-4o-mini-transcribe')
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[api/stt] gpt-4o-mini-transcribe error', res.status, detail.slice(0, 200))
      res = await callOpenAI('whisper-1')
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[api/stt] OpenAI error', res.status, detail.slice(0, 300))
      return new Response(JSON.stringify({ error: 'Échec transcription' }), { status: 502 })
    }

    const data = await res.json() as { text?: string }
    return new Response(JSON.stringify({ text: (data.text ?? '').trim() }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[api/stt]', e)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 })
  }
}
