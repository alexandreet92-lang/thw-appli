'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { TabbedPageLayout, type PageTab } from '@/components/ui/TabbedPageLayout'
import { Dumbbell, Library } from 'lucide-react'
import { BibliothequeTab } from '@/components/session/biblio/BibliothequeTab'
import { BuilderReserve } from '@/components/session/builder/BuilderReserve'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { SESSION_ONBOARDING } from '@/onboarding/configs/session.config'

// Onglets de page : Builder (séances en réserve de l'athlète) · Bibliothèque.
type TopTab = 'builder' | 'biblio'

export default function SessionPage() {
  const [topTab, setTopTab] = useState<TopTab>('builder')
  const { t } = useI18n()
  const { show, dismiss } = usePageOnboarding(SESSION_ONBOARDING.pageId, SESSION_ONBOARDING.version)

  const TABS: PageTab<TopTab>[] = [
    { id: 'builder', label: 'Builder',                  short: 'Builder',                 subtitle: t('session.tabBuilderSubtitle'), icon: Dumbbell },
    { id: 'biblio',  label: t('session.tabBiblioLabel'), short: t('session.tabBiblioShort'), subtitle: t('session.tabBiblioSubtitle'),  icon: Library },
  ]

  return (
    <>
      <PageHelp config={SESSION_ONBOARDING} show={show} onDismiss={dismiss} />
      <TabbedPageLayout tabs={TABS} active={topTab} onChange={setTopTab}>
        {topTab === 'builder' ? <BuilderReserve /> : <BibliothequeTab />}
      </TabbedPageLayout>
    </>
  )
}
