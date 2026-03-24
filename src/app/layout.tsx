import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/shared/Sidebar'

export const metadata: Metadata = {
  title: 'THW Coaching',
  description: 'Application de coaching sportif premium',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="light">
      <body style={{ margin: 0, background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>
        <div className="bg-atmosphere" aria-hidden="true" />

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
          }}>
            {children}
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
          }}>
            {children}
          </main>
        </div>

      </body>
    </html>
  )
}
