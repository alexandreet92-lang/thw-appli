'use client'
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { ProfileCompletion } from '@/components/auth/ProfileCompletion'

export default function ProfilePage() {
  const router = useRouter()

  const handleDone = () => {
    router.replace('/')
  }

  return <ProfileCompletion onDone={handleDone} />
}
