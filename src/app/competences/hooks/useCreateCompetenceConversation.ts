'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sport, CategorieCompetence } from '@/types/competences'
import { streamCompetenceAI, type AIChatMsg } from '../lib/streamCompetenceAI'

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export interface GeneratedMetadata {
  nom: string
  description_courte: string
  bullets: string[]
  sports: Sport[]
  categorie: CategorieCompetence
}

const VALID_SPORTS: Sport[] = ['running', 'trail', 'cyclisme', 'triathlon', 'natation', 'rowing', 'muscu', 'hyrox', 'transversale']
const VALID_CATS: CategorieCompetence[] = ['methodologie', 'periodisation', 'adaptation', 'nutrition', 'recuperation', 'force', 'hypertrophie', 'performance']

const SYSTEM_PROMPT = `Tu es un assistant qui aide à créer des compétences d'entraînement pour une app de coaching IA. Une compétence est une approche méthodologique structurée que l'athlète peut activer pour personnaliser son coach IA.

L'utilisateur va te décrire une idée de compétence. Pose-lui les questions que TU juges pertinentes pour bien comprendre — pas un formulaire rigide. Adapte tes questions au contexte (sport, niveau, contraintes, objectifs).

Quand tu as assez d'informations (généralement après 2-4 échanges), génère la compétence finale dans ce format STRICT :

<competence>
<nom>Nom court et clair</nom>
<description>Une phrase qui résume la compétence</description>
<sports>running,trail,cyclisme</sports>
<categorie>methodologie</categorie>
<bullets>
- Premier point clé
- Deuxième point clé
- Troisième point clé
</bullets>
<prompt>
[Philosophie] ...
[Règles] ...
[Exclusions] ...
[Adaptations] ...
</prompt>
</competence>

Le prompt doit faire entre 80 et 150 mots. Pas de précisions numériques excessives (allures précises, FC précises) — rester sur les principes. Les sports valides : running, trail, cyclisme, triathlon, natation, rowing, muscu, hyrox, transversale. Les catégories valides : methodologie, periodisation, adaptation, nutrition, recuperation, force, hypertrophie, performance.`

function getTag(src: string, tag: string): string | null {
  const m = src.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? m[1].trim() : null
}

export function parseCompetenceXML(text: string): { metadata: GeneratedMetadata; prompt: string } | null {
  const block = getTag(text, 'competence')
  if (!block) return null
  const nom = getTag(block, 'nom')
  const description = getTag(block, 'description')
  const sportsRaw = getTag(block, 'sports')
  const catRaw = getTag(block, 'categorie')
  const bulletsRaw = getTag(block, 'bullets')
  const prompt = getTag(block, 'prompt')
  if (!nom || !description || !sportsRaw || !catRaw || !prompt) return null

  const sports = sportsRaw.split(',').map(s => s.trim().toLowerCase()).filter((s): s is Sport => (VALID_SPORTS as string[]).includes(s))
  const categorie = (VALID_CATS as string[]).includes(catRaw.trim().toLowerCase())
    ? catRaw.trim().toLowerCase() as CategorieCompetence
    : 'methodologie'
  const bullets = (bulletsRaw ?? '').split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)

  if (sports.length === 0) return null

  return {
    metadata: { nom, description_courte: description, bullets, sports, categorie },
    prompt: prompt.trim(),
  }
}

export function useCreateCompetenceConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [generatedMetadata, setGeneratedMetadata] = useState<GeneratedMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busyRef.current) return
    busyRef.current = true
    setError(null)

    const history: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setIsStreaming(true)

    try {
      const apiMessages: AIChatMsg[] = history.map(m => ({ role: m.role, content: m.content }))
      const full = await streamCompetenceAI(SYSTEM_PROMPT, apiMessages, (partial) => {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: partial }
          return next
        })
      })

      const parsed = parseCompetenceXML(full)
      if (parsed) {
        setGeneratedMetadata(parsed.metadata)
        setGeneratedPrompt(parsed.prompt)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur IA')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
      busyRef.current = false
    }
  }, [messages])

  const resetConversation = useCallback(() => {
    setMessages([])
    setGeneratedPrompt(null)
    setGeneratedMetadata(null)
    setError(null)
  }, [])

  // Sauvegarde : crée la compétence custom (+ activation selon `activate`).
  const saveCompetence = useCallback(async (activate: boolean): Promise<{ ok: boolean; error?: string }> => {
    if (!generatedMetadata || !generatedPrompt) return { ok: false, error: 'Aucune compétence générée' }
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return { ok: false, error: 'Non connecté' }

      const { data: inserted, error: e1 } = await sb
        .from('competences')
        .insert({
          nom: generatedMetadata.nom,
          description_courte: generatedMetadata.description_courte,
          bullets: generatedMetadata.bullets,
          sports: generatedMetadata.sports,
          categorie: generatedMetadata.categorie,
          prompt_base: generatedPrompt,
          conflits: [],
          is_predefined: false,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (e1 || !inserted) return { ok: false, error: e1?.message ?? 'Erreur insertion' }

      const { error: e2 } = await sb
        .from('user_competences')
        .upsert({
          user_id: user.id,
          competence_id: (inserted as { id: string }).id,
          active: activate,
          activated_at: activate ? new Date().toISOString() : null,
        }, { onConflict: 'user_id,competence_id' })
      if (e2) return { ok: false, error: e2.message }

      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Erreur' }
    }
  }, [generatedMetadata, generatedPrompt])

  return { messages, isStreaming, error, generatedPrompt, generatedMetadata, sendMessage, resetConversation, saveCompetence }
}
