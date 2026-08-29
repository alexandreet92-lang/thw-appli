'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { TabbedPageLayout, type PageTab } from '@/components/ui/TabbedPageLayout'
import { Dumbbell, Library } from 'lucide-react'
import { BibliothequeTab } from '@/components/session/biblio/BibliothequeTab'
import { getGuideDemoId, GUIDE_DEMO_EVENT } from '@/components/guide/guideDemo'
import { BuilderReserve } from '@/components/session/builder/BuilderReserve'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { SESSION_ONBOARDING } from '@/onboarding/configs/session.config'

// Onglets de page : Builder (séances en réserve de l'athlète) · Bibliothèque.
type TopTab = 'builder' | 'biblio'

export default function SessionPage() {
  const [topTab, setTopTab] = useState<TopTab>('builder')
  // Sport que le GUIDE demande d'ouvrir dans la bibliothèque (démo « Ouvre un sport »).
  const [guideSport, setGuideSport] = useState<string | null>(null)
  const { t } = useI18n()
  const { show, dismiss } = usePageOnboarding(SESSION_ONBOARDING.pageId, SESSION_ONBOARDING.version)

  // Le guide pilote la page : 'session:biblio' → onglet Bibliothèque ;
  // 'session:sport-<id>' → ouvre en plus la fiche d'un sport (montre ses séances).
  useEffect(() => {
    const apply = (id: string | null) => {
      if (!id || !id.startsWith('session:')) return
      const key = id.slice('session:'.length)
      if (key.startsWith('sport-')) { setTopTab('biblio'); setGuideSport(key.slice('sport-'.length)) }
      else if (key === 'biblio') { setTopTab('biblio'); setGuideSport(null) }
    }
    try { apply(getGuideDemoId()) } catch { /* ignore */ }
    const h = (e: Event) => apply((e as CustomEvent<{ id: string | null }>).detail?.id ?? null)
    window.addEventListener(GUIDE_DEMO_EVENT, h)
    return () => window.removeEventListener(GUIDE_DEMO_EVENT, h)
  }, [])

  const TABS: PageTab<TopTab>[] = [
    { id: 'builder', label: 'Builder',                  short: 'Builder',                 subtitle: t('session.tabBuilderSubtitle'), icon: Dumbbell },
    { id: 'biblio',  label: t('session.tabBiblioLabel'), short: t('session.tabBiblioShort'), subtitle: t('session.tabBiblioSubtitle'),  icon: Library },
  ]

  return (
    <>
      <PageHelp config={SESSION_ONBOARDING} show={show} onDismiss={dismiss} />
      <TabbedPageLayout tabs={TABS} active={topTab} onChange={setTopTab}>
        {topTab === 'builder' ? <BuilderReserve /> : <BibliothequeTab guideSport={guideSport} />}
      </TabbedPageLayout>
    </>
  )
}
