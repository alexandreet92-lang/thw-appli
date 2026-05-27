import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/shared/Sidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import MobileTabBar from '@/components/MobileTabBar'
import OfflineIndicator from '@/components/shared/OfflineIndicator'
import OnboardingWrapper from '@/components/shared/OnboardingWrapper'

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
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body style={{ margin: 0, background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>

        {/* Desktop */}
        <div
          className="hidden md:flex"
          style={{ height: '100vh', overflow: 'hidden' }}
        >
          <Sidebar />
          <main style={{
            flex: 1,
            minWidth: 0,
            height: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            zIndex: 10,
            background: 'var(--bg)',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          }}>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Mobile */}
        <div
          className="flex flex-col md:hidden"
          style={{ height: '100vh', overflow: 'hidden' }}
        >
          <Sidebar />
          <main style={{
            width: '100%',
            height: 'calc(100vh - 56px)',
            marginTop: '56px',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            zIndex: 10,
            background: 'var(--bg)',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          }}>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Bottom tab bar — mobile only, position:fixed */}
        <MobileTabBar />
        <OfflineIndicator />
        <OnboardingWrapper />

      </body>
    </html>
  )
}
