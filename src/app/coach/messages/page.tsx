'use client'
export const dynamic = 'force-dynamic'
import { MessagesView } from '@/components/coach/MessagesView'
export default function CoachMessages() {
  return <MessagesView role="coach" title="Messages" subtitle="Discute avec tes athlètes, directement dans l'app." />
}
