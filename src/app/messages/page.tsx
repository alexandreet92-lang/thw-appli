'use client'
// La page /messages a été SUPPRIMÉE : la messagerie privée est désormais
// intégrée à la page Communauté (mode messages, façon Discord). On redirige
// les anciens liens / notifications vers /community (en conservant le fil visé).
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MessagesRedirect() {
  const router = useRouter()
  useEffect(() => {
    let dm = ''
    try { dm = new URLSearchParams(window.location.search).get('thread') ?? '' } catch { /* ignore */ }
    router.replace(dm ? `/community?dm=${encodeURIComponent(dm)}` : '/community?dm=1')
  }, [router])
  return null
}
