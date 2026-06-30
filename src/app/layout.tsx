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
    // Bord à bord : le contenu remplit les zones sûres (encoche / home indicator),
    // pas de bande blanche distincte. La couleur de la barre système suit le thème.
    viewportFit: 'cover',
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#080A0F' },
    ],
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* Anti-flash : applique le thème (clair le jour / sombre la nuit) AVANT le
            paint. Surcharge manuelle > dernier mode auto calculé > heure locale.
            useTheme affine ensuite avec le lever/coucher du soleil exact. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=localStorage.getItem('thw-theme')||localStorage.getItem('thw-auto-mode');if(!m){var h=new Date().getHours();m=(h>=7&&h<20)?'light':'dark';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(m);}catch(e){}})();` }} />
      </head>
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
