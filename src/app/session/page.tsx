'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { TabbedPageLayout, type PageTab } from '@/components/ui/TabbedPageLayout'
import { Dumbbell, Library } from 'lucide-react'
import { BibliothequeTab } from '@/components/session/biblio/BibliothequeTab'
import { BuilderReserve } from '@/components/session/builder/BuilderReserve'
import { PageHelp } from '@/onboarding/system/PageHelp'
import { usePageOnboarding } from '@/onboarding/system/usePageOnboarding'
import { SESSION_ONBOARDING } from '@/onboarding/configs/session.config'

// Onglets de page : Builder (séances en réserve de l'athlète) · Bibliothèque.
type TopTab = 'builder' | 'biblio'

const FB = 'var(--font-body)'

export default function SessionPage() {
  const [topTab, setTopTab] = useState<TopTab>('builder')
  const { show, dismiss, reopen } = usePageOnboarding(SESSION_ONBOARDING.pageId, SESSION_ONBOARDING.version)

  const TABS: PageTab<TopTab>[] = [
    { id: 'builder', label: 'Builder',      short: 'Builder', subtitle: 'Créer & réutiliser', icon: Dumbbell },
    { id: 'biblio',  label: 'Bibliothèque', short: 'Biblio',  subtitle: 'Séances expliquées', icon: Library },
  ]

  const helpBtn = (
    <button onClick={reopen} aria-label="Aide" style={{
      width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-dim)',
      border: 'none', color: 'var(--primary)', fontFamily: FB, fontSize: 13, fontWeight: 700,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>?</button>
  )

  return (
    <>
      <PageHelp config={SESSION_ONBOARDING} show={show} onDismiss={dismiss} />
      <TabbedPageLayout headerExtra={helpBtn} tabs={TABS} active={topTab} onChange={setTopTab}>
        {topTab === 'builder' ? <BuilderReserve /> : <BibliothequeTab />}
      </TabbedPageLayout>
    </>
  )
}
