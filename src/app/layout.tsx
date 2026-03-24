import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'THW Coaching',
  description: 'Application de coaching sportif premium',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-[var(--bg)] text-[var(--text)]">
        {children}
      </body>
    </html>
  )
}
   
