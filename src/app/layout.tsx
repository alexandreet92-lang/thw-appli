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
      <body>
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
          <div className="bg-atmosphere" aria-hidden="true" />
          <Sidebar />
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden relative z-10"
            style={{ background: 'var(--bg)' }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
