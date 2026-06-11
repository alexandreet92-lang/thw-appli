import type { Metadata, Viewport } from 'next'
import './globals.css'
import { DesktopShell } from '@/components/shared/DesktopShell'
import { MobileShell } from '@/components/shared/MobileShell'
import MobileTabBar from '@/components/MobileTabBar'
import OfflineIndicator from '@/components/shared/OfflineIndicator'
import GlobalOnboardingWrapper from '@/components/onboarding/GlobalOnboardingWrapper'
import { ClientShell } from '@/app/ClientShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'THW Coaching',
  description: 'Application de coaching sportif premium',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
}

export function generateViewport(): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body style={{ margin: 0, background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>
        <ClientShell>

          {/* Desktop — sidebar ancrée (push) + header flottant */}
          <DesktopShell>{children}</DesktopShell>

          {/* Mobile — chrome « effet Claude » (sidebar fixe dessous, page qui glisse) */}
          <MobileShell>{children}</MobileShell>

          {/* Bottom tab bar — mobile only, position:fixed */}
          <MobileTabBar />
          <OfflineIndicator />
          <GlobalOnboardingWrapper />

        </ClientShell>
      </body>
    </html>
  )
}
