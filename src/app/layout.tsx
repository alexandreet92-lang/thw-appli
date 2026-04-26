import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/shared/Sidebar'
import GlobalAIButton from '@/components/ai/GlobalAIButton'
import { PageTransition } from '@/components/ui/PageTransition'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'THW Coaching',
  description: 'Application de coaching sportif premium',
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
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            zIndex: 10,
            background: 'var(--bg)',
            marginTop: '56px',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          }}>
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        <GlobalAIButton />
      </body>
    </html>
  )
}
