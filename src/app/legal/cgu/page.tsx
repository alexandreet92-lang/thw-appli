import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Le contenu réel des Conditions d'utilisation est servi en statique.
export default function CguPage(): never {
  redirect('/site/conditions-utilisation.html')
}
