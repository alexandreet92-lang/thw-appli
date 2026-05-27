'use client'
import type { PageOnboardingConfig } from './types'
import { usePageOnboarding } from './usePageOnboarding'
import { OnboardingOverlay } from './OnboardingOverlay'

interface Props { config: PageOnboardingConfig }

export function PageHelp({ config }: Props) {
  const { show, dismiss, reopen } = usePageOnboarding(config.pageId, config.version)

  return (
    <>
      <button
        onClick={reopen}
        title="Aide"
        style={{
          position: 'fixed',
          bottom: 'calc(84px + env(safe-area-inset-bottom))',
          right: 16,
          zIndex: 99997,
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(6,182,212,0.10)',
          border: '1px solid rgba(6,182,212,0.30)',
          color: '#06B6D4',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'DM Sans, sans-serif',
          backdropFilter: 'blur(4px)',
        }}
      >
        ?
      </button>
      {show && <OnboardingOverlay config={config} onDismiss={dismiss} />}
    </>
  )
}
