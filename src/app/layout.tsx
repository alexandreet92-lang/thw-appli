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
      <body style={{ margin: 0, background: 'var(--bg)' }}>
        <div style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}>
          <div className="bg-atmosphere" aria-hidden="true" />
          <Sidebar />
          <main style={{
            flex: 1,
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
      </body>
    </html>
  )
}
