'use client'
export const dynamic = 'force-dynamic'
import { MessagesView } from '@/components/coach/MessagesView'
import { useI18n } from '@/lib/i18n'
export default function AthleteMessages() {
  const { t } = useI18n()
  return <MessagesView role="athlete" title={t('w2g.messagesTitle')} subtitle={t('w2g.messagesSubtitle')} />
}
