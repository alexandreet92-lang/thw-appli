'use client'
export const dynamic = 'force-dynamic'
import { MessagesView } from '@/components/coach/MessagesView'
import { useIsMobile } from '@/components/ai/mobile/MobileKit'
import MessagesMobile from '@/components/coach/mobile/MessagesMobile'
import { useI18n } from '@/lib/i18n'
export default function CoachMessages() {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  // Mobile (≤ 767 px) : messagerie nouveau style (liste + conversation plein écran).
  if (isMobile) return <MessagesMobile />
  return <MessagesView role="coach" title={t('coach.messagesTitle')} subtitle={t('coach.messagesSubtitle')} />
}
