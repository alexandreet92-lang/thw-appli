import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/shared/Sidebar'

export const metadata: Metadata = {
  title: 'THW Coaching',
  description: 'Application de coaching sportif premium',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
          <div className="bg-atmosphere" aria-hidden="true" />
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative z-10">
            <div className="page-enter">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
