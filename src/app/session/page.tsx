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
import { useNarrow } from '@/lib/hooks/useNarrow'

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

  const isMobile = useNarrow(767)
  if (isMobile) {
    return (
      <>
        <PageHelp config={SESSION_ONBOARDING} show={show} onDismiss={dismiss} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)' }}>
          <div role="tablist" style={{ display: 'flex', background: 'var(--dash-chip, var(--bg-card2))', borderRadius: 'var(--r-pill)', padding: 3 }}>
            {([['builder', t('session.m.mine')], ['biblio', t('session.tabBiblioLabel')]] as [TopTab, string][]).map(([id, l]) => (
              <button key={id} role="tab" aria-selected={topTab === id} type="button" onClick={() => setTopTab(id)}
                style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '8px 0', fontSize: 14, fontWeight: topTab === id ? 700 : 600, fontFamily: 'inherit',
                  background: topTab === id ? 'var(--dash-card, var(--bg-elev))' : 'transparent', color: topTab === id ? 'var(--text)' : 'var(--text-mid)', boxShadow: topTab === id ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}>{l}</button>
            ))}
          </div>
          <div className="thw-mdetail">{topTab === 'builder' ? <BuilderReserve /> : <BibliothequeTab guideSport={guideSport} />}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHelp config={SESSION_ONBOARDING} show={show} onDismiss={dismiss} />
      <TabbedPageLayout tabs={TABS} active={topTab} onChange={setTopTab}>
        {topTab === 'builder' ? <BuilderReserve /> : <BibliothequeTab guideSport={guideSport} />}
      </TabbedPageLayout>
    </>
  )
}
