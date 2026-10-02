'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// /auth — entrée de l'app (maquettes A1 / A2).
//  • Entrée : logo + « Hybrid » + ENDURANCE × FORCE + accroche sur halo cyan,
//    langue en haut à droite, puis Apple → Google → e-mail + mentions légales.
//  • E-mail : Connexion / Créer un compte (segmented), champs blancs, jauge de
//    robustesse, CGU, « Rester connecté », mot de passe oublié.
//  • Mot de passe oublié / Vérification de l'e-mail : même grammaire.
// Navigation entre écrans = glissement iOS (SlideView « push », retour par
// glissement depuis le bord gauche).
// Apple / Google : web ET app native (voir src/lib/native/socialAuth.ts).
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, Suspense, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthInput } from '@/components/auth/AuthInput'
import { ErrorMessage } from '@/components/auth/ErrorMessage'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { EmailVerification } from '@/components/auth/EmailVerification'
import {
  AUTH_CSS, FB, FS, AuthScreen, AuthHeading, AuthSegmented, BackButton, BrandMark, LangPill, LegalLine,
  OrDivider, PrimaryPill, SocialButtons, SuccessNote, ToggleRow,
} from '@/components/auth/AuthKit'
import { SlideView } from '@/components/ui/SlideView'
import { getAuthError, isRetryableAuthError, getAuthLinkError } from '@/lib/auth/errors'
import { authCallbackUrl } from '@/lib/auth/redirect'
import { useI18n } from '@/lib/i18n'
import { signInWithProvider, onNativeBrowserClosed, type SocialProvider, type SocialOutcome } from '@/lib/native/socialAuth'

const TERMS_VERSION = '2025-06'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PW_MIN = 8
// Build natif (Capacitor) : NEXT_PUBLIC_API_BASE n'est défini que dans le bundle
// local. Sert ici au retour d'OAuth et à la navigation « dure » post-connexion.
const NATIVE_BUILD = !!process.env.NEXT_PUBLIC_API_BASE

type View = 'entry' | 'email' | 'forgot' | 'verify'
const DEPTH: Record<View, number> = { entry: 0, email: 1, forgot: 2, verify: 2 }
const PROVIDER_NAME: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' }

/**
 * L'animation d'entrée ne doit pas se jouer SOUS l'écran de démarrage : on
 * attend qu'il commence à disparaître (ou qu'il ait déjà été vu cette session).
 */
function useAfterSplash(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const done = () => {
      try { if (sessionStorage.getItem('splash_v1') === '1') return true } catch { return true }
      return !!document.querySelector('[data-splash-screen="out"]')
    }
    if (done()) { setReady(true); return }
    const t0 = Date.now()
    const id = window.setInterval(() => {
      if (done() || Date.now() - t0 > 3200) { window.clearInterval(id); setReady(true) }
    }, 90)
    return () => window.clearInterval(id)
  }, [])
  return ready
}

function AuthPageInner() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const params = useSearchParams()
  const expired = params.get('expired') === '1'
  // Erreur remontée par /auth/callback (lien d'email expiré, OAuth refusé…).
  const linkError = params.get('error')
  const linkErrorDesc = params.get('error_description') ?? ''
  // Redirection post-connexion (lien depuis l'app vers abonnement / recharge…).
  // Chemin interne uniquement → pas d'open-redirect.
  const redirectRaw = params.get('redirect')
  const dest = redirectRaw && /^\/(?!\/)/.test(redirectRaw) ? redirectRaw : '/'

  // OAuth annulé par l'utilisateur (Google « Annuler », Apple fermé) : silencieux.
  const linkMsg = (code: string | null): string => {
    if (!code) return ''
    if (code === 'access_denied' && /cancel|denied|annul/i.test(linkErrorDesc)) return ''
    return getAuthLinkError(code)
  }

  const [view, setView] = useState<View>('entry')
  const [dir, setDir] = useState(1)
  const [tab, setTab] = useState<0 | 1>(0) // 0 connexion · 1 inscription
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState(expired ? t('auth.expired') : linkMsg(linkError))
  const [resetSent, setResetSent] = useState(false)
  const [remember, setRemember] = useState(true)
  const [touched, setTouched] = useState(false)
  // Pendant la fin de connexion Apple native (enregistrement du nom), on
  // empêche la redirection automatique déclenchée par SIGNED_IN.
  const holdRedirect = useRef(false)

  const ready = useAfterSplash()
  // L'entrée ne s'anime qu'une fois (pas à chaque retour depuis l'écran e-mail).
  const [played, setPlayed] = useState(false)
  const animateEntry = ready && !played
  useEffect(() => { if (ready && view !== 'entry') setPlayed(true) }, [ready, view])

  useEffect(() => {
    if (expired) setError(t('auth.expired'))
    else if (linkError) setError(linkMsg(linkError))
    // linkMsg dépend uniquement des paramètres d'URL déjà listés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, linkError, t])

  // App native : session déjà là (retour d'OAuth traité par ClientShell, ou
  // session restaurée) → on entre dans l'app.
  useEffect(() => {
    if (!NATIVE_BUILD) return
    const sb = createClient()
    void sb.auth.getSession().then((res: { data: { session: Session | null } }) => { if (res.data.session && !holdRedirect.current) window.location.href = dest })
    const { data: sub } = sb.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !holdRedirect.current) window.location.href = dest
    })
    return () => sub.subscription.unsubscribe()
  }, [dest])

  // Web : /auth?redirect=… avec une session existante → directement sur la page.
  useEffect(() => {
    if (NATIVE_BUILD || !redirectRaw) return
    const sb = createClient()
    void sb.auth.getSession().then((res: { data: { session: Session | null } }) => { if (res.data.session) window.location.replace(dest) })
  }, [redirectRaw, dest])

  // Safari (OAuth natif) fermé sans terminer → on relâche le bouton.
  useEffect(() => {
    let off: (() => void) | undefined
    let alive = true
    void onNativeBrowserClosed(() => setBusy(null)).then(f => { if (alive) off = f; else f() })
    // Web : retour arrière depuis la page Google/Apple (cache bfcache).
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setBusy(null) }
    window.addEventListener('pageshow', onShow)
    return () => { alive = false; off?.(); window.removeEventListener('pageshow', onShow) }
  }, [])

  function go(next: View) {
    setDir(DEPTH[next] >= DEPTH[view] ? 1 : -1)
    setView(next)
    setError('')
  }

  const emailValid = EMAIL_RE.test(email.trim())
  const pwMatch = password === confirmPassword
  const isLogin = tab === 0
  const canLogin = emailValid && password.length > 0
  const canSignup = emailValid && acceptedTerms && pwMatch && password.length >= PW_MIN
  const emailErr = touched && email.length > 0 && !emailValid ? t('au.emailInvalid') : undefined
  const confirmErr = !isLogin && confirmPassword.length > 0 && !pwMatch ? t('auth.pwMismatch') : undefined

  function socialMessage(r: SocialOutcome, p: SocialProvider): string {
    if (r.kind !== 'error') return ''
    if (r.reason === 'provider_disabled') return t('au.err.providerOff', { p: PROVIDER_NAME[p] })
    if (r.reason === 'network') return t('au.err.network')
    return t('au.err.social', { p: PROVIDER_NAME[p] })
  }

  async function handleSocial(p: SocialProvider) {
    if (busy || loading) return
    setError(''); setBusy(p)
    holdRedirect.current = true
    const r = await signInWithProvider(p, dest)
    if (r.kind === 'signedIn') {
      // Apple natif : session ouverte sur place → rechargement dur (bundle local).
      try { localStorage.setItem('last_auth_date', Date.now().toString()) } catch { /* ignore */ }
      window.location.href = dest
      return
    }
    holdRedirect.current = false
    // 'redirect' : la page part vers Google/Apple (web) ou Safari (natif) —
    // le bouton reste en attente jusqu'au retour / à la fermeture.
    if (r.kind === 'redirect') return
    setBusy(null)
    if (r.kind === 'error') setError(socialMessage(r, p))
  }

  async function handleLogin() {
    if (!canLogin || loading) return
    setLoading(true); setError('')
    const sb = createClient()
    const mail = email.trim()
    // Indisponibilité passagère (base lente → 504/timeout) : une relance silencieuse.
    let e = (await sb.auth.signInWithPassword({ email: mail, password })).error
    if (e && isRetryableAuthError(e)) {
      await new Promise(r => setTimeout(r, 1200))
      e = (await sb.auth.signInWithPassword({ email: mail, password })).error
    }
    if (e) { setLoading(false); setError(getAuthError(e)); return }
    const now = Date.now().toString()
    localStorage.setItem('last_auth_date', now)
    localStorage.setItem('thw_last_pw_auth', now)
    localStorage.setItem('thw_remember', remember ? '1' : '0')
    // Natif : rechargement dur (export statique, pas de router.refresh serveur).
    if (NATIVE_BUILD) { window.location.href = dest }
    else { router.replace(dest); router.refresh() }
  }

  async function handleSignup() {
    if (!canSignup || loading) return
    setLoading(true); setError('')
    const { error: e } = await createClient().auth.signUp({
      email: email.trim(), password,
      options: {
        emailRedirectTo: authCallbackUrl('/'),
        // RGPD : trace de l'acceptation CGU + confidentialité (date + version).
        // `lang` : les templates d'email Supabase ne lisent que les métadonnées.
        data: { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION, lang },
      },
    })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    go('verify')
  }

  async function handleForgotPassword() {
    if (!emailValid) { setTouched(true); setError(t('au.emailInvalid')); return }
    setLoading(true); setError('')
    const { error: e } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authCallbackUrl('/auth/reset-password'),
    })
    setLoading(false)
    if (e) { setError(getAuthError(e)); return }
    setResetSent(true)
  }

  const stagger = (i: number): CSSProperties => ({ ['--d' as string]: `${360 + i * 80}ms` })

  // ── Écran d'entrée (A1) ───────────────────────────────────────────
  const entry = (
    <div style={{ position: 'relative', minHeight: '100dvh', background: 'var(--surface-page)', overflow: 'hidden' }}>
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 480, pointerEvents: 'none',
        background: 'radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 70%)',
      }} />
      <div className="au-col" style={{
        position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 24px)',
        visibility: ready ? 'visible' : 'hidden',
      }}>
        <div className={animateEntry ? 'au-fade' : undefined} style={{ display: 'flex', justifyContent: 'flex-end', ['--d' as string]: '500ms' }}>
          <LangPill />
        </div>

        <div style={{ textAlign: 'center', marginTop: 'clamp(16px, 6vh, 64px)' }}>
          <div className={animateEntry ? 'au-logo' : undefined} style={{ display: 'flex', justifyContent: 'center' }}>
            <BrandMark size={76} />
          </div>
          <div className={animateEntry ? 'au-rise' : undefined} style={{ ['--d' as string]: '120ms' }}>
            <div style={{ fontFamily: FS, fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', marginTop: 12 }}>Hybrid</div>
            <div style={{ fontFamily: FB, fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-mid)', marginTop: 10 }}>{t('auth.heroTagline')}</div>
          </div>
          <p className={animateEntry ? 'au-rise' : undefined} style={{ ['--d' as string]: '220ms', fontFamily: FB, fontSize: 15, lineHeight: 1.45, color: 'var(--text-mid)', margin: '18px auto 0', maxWidth: 290 }}>
            {t('au.pitch')}
          </p>
        </div>

        <div style={{ flex: 1, minHeight: 40 }} />

        <ErrorMessage error={error} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SocialButtons busy={busy} onPick={p => void handleSocial(p)} stagger={animateEntry ? stagger : undefined} />
          <button type="button" className={`au-btn au-mail${animateEntry ? ' au-rise' : ''}`} style={animateEntry ? stagger(2) : undefined}
            disabled={busy !== null} data-dim={busy ? '1' : undefined} onClick={() => go('email')}>
            {t('au.emailCta')}
          </button>
        </div>
        <div className={animateEntry ? 'au-fade' : undefined} style={{ ['--d' as string]: '700ms' }}>
          <LegalLine style={{ marginTop: 14 }} />
        </div>
      </div>
    </div>
  )

  // ── Écran e-mail (A2) ─────────────────────────────────────────────
  const emailScreen = (
    <AuthScreen>
      <div><BackButton onClick={() => go('entry')} /></div>
      <AuthHeading
        title={isLogin ? `${t('auth.welcomeBack')} 👋` : t('auth.createAccount')}
        sub={isLogin ? t('au.loginSub') : t('au.signupSub')} />

      <form noValidate onSubmit={e => { e.preventDefault(); void (isLogin ? handleLogin() : handleSignup()) }}>
        <AuthSegmented value={tab} onChange={v => { setTab(v); setError('') }} labels={[t('auth.tabLogin'), t('auth.tabSignup')]} />

        <AuthInput label={t('auth.email')} type="email" placeholder="ton@email.com" value={email}
          onChange={v => { setEmail(v); if (touched && EMAIL_RE.test(v.trim())) setTouched(false) }}
          autoComplete="email" error={emailErr} onBlur={() => { if (email) setTouched(true) }} />
        <AuthInput label={t('auth.password')} type="password" placeholder="••••••••" value={password} onChange={setPassword}
          showToggle autoComplete={isLogin ? 'current-password' : 'new-password'}
          hint={!isLogin && password.length < PW_MIN ? t('au.pwMin') : undefined} />

        {!isLogin && (
          <>
            <PasswordStrengthBar password={password} />
            <AuthInput label={t('auth.confirm')} type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword}
              showToggle error={confirmErr} autoComplete="new-password" />

            <button type="button" role="checkbox" aria-checked={acceptedTerms} onClick={() => setAcceptedTerms(v => !v)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: '4px 4px 18px', border: 'none', background: 'none',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span aria-hidden style={{
                width: 24, height: 24, borderRadius: 'var(--r-sm)', flexShrink: 0,
                background: acceptedTerms ? 'var(--primary)' : 'var(--surface-card)',
                boxShadow: acceptedTerms ? 'none' : 'inset 0 0 0 2px var(--border-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms',
              }}>{acceptedTerms && <Check size={15} color="var(--on-primary)" strokeWidth={3} />}</span>
              <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, fontFamily: FB }}>
                {t('auth.termsAccept')}{' '}
                <a href="/site/conditions-utilisation.html" target="_blank" rel="noopener" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{t('auth.termsCgu')}</a>{' '}
                {t('auth.termsAnd')}{' '}
                <a href="/site/confidentialite.html" target="_blank" rel="noopener" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{t('auth.termsPrivacy')}</a>
              </span>
            </button>
          </>
        )}

        {isLogin && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, flexWrap: 'wrap', margin: '2px 4px 20px' }}>
            <ToggleRow checked={remember} onChange={setRemember} label={t('auth.remember')} />
            <button type="button" className="au-link" style={{ fontSize: 14, minHeight: 44, whiteSpace: 'nowrap' }} onClick={() => go('forgot')}>{t('auth.forgot')}</button>
          </div>
        )}

        <ErrorMessage error={error} />
        <PrimaryPill type="submit" loading={loading} disabled={!(isLogin ? canLogin : canSignup) || busy !== null}>
          {isLogin ? t('auth.login') : t('auth.signup')}
        </PrimaryPill>
      </form>

      <OrDivider />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SocialButtons busy={busy} onPick={p => void handleSocial(p)} />
      </div>
      {isLogin && <LegalLine style={{ marginTop: 16 }} />}
    </AuthScreen>
  )

  // ── Mot de passe oublié ───────────────────────────────────────────
  const forgotScreen = (
    <AuthScreen>
      <div><BackButton onClick={() => { go('email'); setResetSent(false) }} /></div>
      <AuthHeading title={t('auth.forgotTitle')} sub={t('auth.forgotDesc')} />
      <form noValidate onSubmit={e => { e.preventDefault(); void handleForgotPassword() }}>
        <AuthInput label={t('auth.email')} type="email" placeholder="ton@email.com" value={email} onChange={v => { setEmail(v); setResetSent(false) }}
          autoComplete="email" error={emailErr} />
        <ErrorMessage error={error} />
        <div style={{ height: 6 }} />
        <PrimaryPill type="submit" loading={loading} disabled={!email}>{t('auth.forgotSend')}</PrimaryPill>
      </form>
      {resetSent && <SuccessNote>{t('auth.forgotSent')}</SuccessNote>}
    </AuthScreen>
  )

  // ── Vérification de l'e-mail ──────────────────────────────────────
  const verifyScreen = (
    <AuthScreen>
      <div><BackButton onClick={() => { setTab(0); go('email') }} /></div>
      <EmailVerification email={email.trim()} onBack={() => { setTab(0); go('email') }} />
    </AuthScreen>
  )

  const screen = view === 'entry' ? entry : view === 'email' ? emailScreen : view === 'forgot' ? forgotScreen : verifyScreen
  const back = view === 'entry' ? undefined : () => go(view === 'email' ? 'entry' : 'email')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-page)' }}>
      <style>{AUTH_CSS}</style>
      <SlideView variant="push" screenKey={view} direction={dir} onBack={back} background="var(--surface-page)">
        {screen}
      </SlideView>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  )
}
