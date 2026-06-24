import { redirect } from 'next/navigation'

// Doublon historique : la page d'entrée unique est /auth.
export default function LoginPage() {
  redirect('/auth')
}
