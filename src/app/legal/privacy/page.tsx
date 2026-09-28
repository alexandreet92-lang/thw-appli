import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Le contenu réel de la Politique de confidentialité est servi en statique.
export default function PrivacyPage(): never {
  redirect('/site/confidentialite.html')
}
