'use client'
export const dynamic = 'force-dynamic'
import { use } from 'react'
import PublicProfileView from './View'

// Profil public d'un athlète — /u/<id>. Destination des notifications sociales
// (nouvel abonné, activité d'un ami). Respecte la confidentialité (RPC).
export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PublicProfileView userId={id} />
}
