'use client'
// Messages privés RETIRÉS de l'app (demande produit) : les anciens liens et
// notifications /messages renvoient vers l'Accueil.
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MessagesRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/')
  }, [router])
  return null
}
