'use client'
export const dynamic = 'force-dynamic'
import { MessagesView } from '@/components/coach/MessagesView'
import { useI18n } from '@/lib/i18n'
export default function CoachMessages() {
  const { t } = useI18n()
  return <MessagesView role="coach" title={t('coach.messagesTitle')} subtitle={t('coach.messagesSubtitle')} />
}
