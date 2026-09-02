'use client'
import { useState, useEffect } from 'react'
import { SplashScreen } from '@/components/ui/SplashScreen'
import GlobalSaveToast from '@/components/ui/GlobalSaveToast'
import { ReauthGate } from '@/components/auth/ReauthGate'
import { I18nProvider } from '@/lib/i18n'
import { CallProvider } from '@/components/community/call/CallProvider'
import { CallBubble } from '@/components/community/call/CallBubble'
import { installNativeApiFetch } from '@/lib/native/apiFetch'
import { isNativeApp, openWebsite } from '@/lib/native/platform'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

interface ClientShellProps {
  children: React.ReactNode
}

export function ClientShell({ children }: ClientShellProps) {
  const [showSplash, setShowSplash] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // App native : redirige les appels /api vers Vercel + ajoute le token (no-op en web).
    installNativeApiFetch()
    setHydrated(true)
    // Effet « verre » (#7) : autorise le flou selon le contexte (web/Release).
    void import('@/lib/native/platform').then(m => m.applyGlassBlur())
    const alreadySeen = sessionStorage.getItem('splash_v1')
    if (!alreadySeen) {
      setShowSplash(true)
    }
    // Service worker :
    //  • WEB (PWA) → on l'enregistre : démarrage à froid plus rapide.
    //  • APP NATIVE (Capacitor) → le bundle est DÉJÀ local. Le SW n'apporte rien
    //    et, pire, il met en cache l'ancienne version à CHAQUE mise à jour de
    //    l'app → l'app « ne se met jamais à jour ». On le DÉSENREGISTRE et on
    //    vide les caches pour que l'app reflète toujours le dernier build.
    if ('serviceWorker' in navigator) {
      if (isNativeApp()) {
        void navigator.serviceWorker.getRegistrations()
          .then(rs => rs.forEach(r => { void r.unregister() })).catch(() => { /* ignore */ })
        if ('caches' in window) {
          void caches.keys().then(ks => ks.forEach(k => { void caches.delete(k) })).catch(() => { /* ignore */ })
        }
      } else {
        navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ })
      }
    }
  }, [])

  // App native : les liens vers le SITE (/site/*.html, ou target="_blank") ne
  // s'ouvrent PAS dans la WebView Capacitor (window.open / _blank inertes). On
  // intercepte tout clic sur ces liens et on ouvre le site dans le navigateur
  // système (via openWebsite → Capacitor Browser). No-op total sur le web.
  useEffect(() => {
    if (!isNativeApp()) return
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!el) return
      const href = el.getAttribute('href') || ''
      const isSite = href.startsWith('/site/')
      const isExternal = /^https?:\/\//i.test(href)
      const isBlank = el.target === '_blank'
      if (isSite || (isExternal && isBlank)) {
        e.preventDefault()
        // Chemin relatif → openWebsite (préfixe le domaine) ; URL absolue → telle quelle.
        if (isExternal) { void import('@/lib/native/platform').then(m => m.openExternalUrl(href)) }
        else { void openWebsite(href) }
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // App native : retour des liens com.thehybridway.app://auth-callback —
  // OAuth (Google/Apple) ET liens d'email (réinitialisation, confirmation).
  // On termine la session ici, puis on route vers la destination `next`
  // (ex. /auth/reset-password) au lieu de toujours retomber sur l'accueil.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE) return
    let cleanup: (() => void) | undefined
    void (async () => {
      const { App } = await import('@capacitor/app')
      const handle = await App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
        if (!url || !url.includes('auth-callback')) return
        try {
          const q = new URLSearchParams(url.split('?')[1] ?? '')
          try { const { Browser } = await import('@capacitor/browser'); await Browser.close() } catch { /* déjà fermé */ }

          // Échec renvoyé par Supabase (lien expiré, déjà utilisé…) : on ne
          // reste PAS muet, on renvoie l'utilisateur sur /auth avec la raison.
          const err = q.get('error_code') || q.get('error')
          if (err) { window.location.href = `/auth?error=${encodeURIComponent(err)}`; return }

          const rawNext = q.get('next') ?? '/'
          const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
          const sb = createClient()

          // Lien d'email au format {{ .TokenHash }} : vérifiable sans verifier
          // PKCE, donc valide même si le mail est ouvert ailleurs.
          const tokenHash = q.get('token_hash')
          if (tokenHash) {
            const type = (q.get('type') ?? 'recovery') as EmailOtpType
            const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type })
            window.location.href = error ? '/auth?error=otp_expired' : next
            return
          }

          const code = q.get('code')
          if (code) {
            const { error } = await sb.auth.exchangeCodeForSession(code)
            window.location.href = error ? '/auth?error=pkce_exchange_failed' : next
          }
        } catch { /* ignore */ }
      })
      cleanup = () => { void handle.remove() }
    })()
    return () => { try { cleanup?.() } catch { /* ignore */ } }
  }, [])

  const handleSplashDone = () => {
    sessionStorage.setItem('splash_v1', '1')
    setShowSplash(false)
  }

  if (!hydrated) return <I18nProvider><CallProvider>{children}</CallProvider></I18nProvider>

  return (
    <I18nProvider>
      <CallProvider>
        {showSplash && (
          <SplashScreen onDone={handleSplashDone} />
        )}
        {children}
        <CallBubble />
        <GlobalSaveToast />
        <ReauthGate />
      </CallProvider>
    </I18nProvider>
  )
}
