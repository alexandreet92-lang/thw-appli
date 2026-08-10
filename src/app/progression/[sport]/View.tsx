'use client'

// Route /progression/[sport] (accès direct par URL). La vue est partagée
// avec le rendu inline de la section Progression de /activities.
import { useParams, useRouter } from 'next/navigation'
import { ProgressionSportView } from '../components/ProgressionSportView'

export default function ProgressionSportPage() {
  const params = useParams()
  const router = useRouter()
  const sport = String(params.sport ?? '')
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      <ProgressionSportView sport={sport} onBack={() => router.push('/progression')} />
    </div>
  )
}
