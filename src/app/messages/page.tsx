'use client'
export const dynamic = 'force-dynamic'
import { MessagesView } from '@/components/coach/MessagesView'
export default function AthleteMessages() {
  return <MessagesView role="athlete" title="Messages" subtitle="Discute avec ton coach." />
}
