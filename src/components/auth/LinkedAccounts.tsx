'use client'

// ══════════════════════════════════════════════════════════════
// Connexions Apple / Google reliées au compte.
// Pourquoi : Apple permet « Masquer mon e-mail » → l'adresse reçue diffère de
// celle de Google, et Supabase crée alors un 2e compte vide. Ici, la personne
// se connecte avec sa méthode habituelle puis RELIE l'autre : les deux
// ouvrent ensuite le même compte.
// Prérequis Supabase : Authentication → Sign In / Providers → « Allow manual
// linking » activé.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import type { UserIdentity } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isNativeApp } from '@/lib/native/platform'

type Provider = 'apple' | 'google'

const NATIVE_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://thw-appli.vercel.app'
const LABEL: Record<Provider, string> = { apple: 'Apple', google: 'Google' }

function errorText(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('already') && (m.includes('linked') || m.includes('exists')))
    return 'Ce compte Apple ou Google est déjà utilisé par un autre compte THW. Connecte-toi avec lui pour le supprimer ou contacte le support.'
  if (m.includes('manual linking') || m.includes('manual_linking'))
    return 'La liaison de comptes n’est pas encore activée. Réessaie plus tard.'
  if (m.includes('last') || m.includes('at least'))
    return 'Impossible de retirer ta seule méthode de connexion.'
  return 'Une erreur est survenue. Réessaie dans un instant.'
}

export function LinkedAccounts() {
  const [ids, setIds] = useState<UserIdentity[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.auth.getUserIdentities()
    setIds(data?.identities ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  async function link(p: Provider) {
    setErr(''); setBusy(p)
    try {
      const sb = createClient()
      const next = encodeURIComponent('/profile')
      if (isNativeApp()) {
        const { data, error } = await sb.auth.linkIdentity({
          provider: p,
          options: { redirectTo: `${NATIVE_BASE}/auth/callback?native=1&next=${next}`, skipBrowserRedirect: true },
        })
        if (error) { setErr(errorText(error.message)); setBusy(null); return }
        if (data?.url) {
          const { Browser } = await import('@capacitor/browser')
          await Browser.open({ url: data.url })
        }
        setBusy(null)
        return
      }
      const { error } = await sb.auth.linkIdentity({
        provider: p,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
      })
      if (error) { setErr(errorText(error.message)); setBusy(null) }
    } catch (e) {
      setErr(errorText(e instanceof Error ? e.message : ''))
      setBusy(null)
    }
  }

  async function unlink(identity: UserIdentity) {
    if (!window.confirm(`Retirer ${LABEL[identity.provider as Provider] ?? identity.provider} de ce compte ? Tu pourras le relier à nouveau plus tard.`)) return
    setErr(''); setBusy(identity.provider)
    const sb = createClient()
    const { error } = await sb.auth.unlinkIdentity(identity)
    if (error) setErr(errorText(error.message))
    await load()
    setBusy(null)
  }

  if (!ids) return null
  const hasEmail = ids.some(i => i.provider === 'email')
  const canUnlink = ids.length > 1

  return (
    <div style={{ marginTop: 22 }}>
      <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 6px' }}>Méthodes de connexion</p>
      <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Relie Apple et Google pour te connecter au même compte avec l’un ou l’autre. Apple peut masquer ton e-mail : sans liaison, il crée un compte séparé.
      </p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {hasEmail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>E-mail et mot de passe</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Relié</span>
          </div>
        )}
        {(['apple', 'google'] as Provider[]).map(p => {
          const identity = ids.find(i => i.provider === p)
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: hasEmail || p === 'google' ? '1px solid var(--border)' : undefined }}>
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{LABEL[p]}</span>
              {identity ? (
                <>
                  <span style={{ fontSize: 12.5, color: 'var(--success)' }}>Relié</span>
                  {canUnlink && (
                    <button type="button" onClick={() => unlink(identity)} disabled={busy !== null}
                      style={{ fontSize: 12.5, color: 'var(--text-mid)', background: 'none', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer' }}>Retirer</button>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => link(p)} disabled={busy !== null}
                  style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--brand-gradient, linear-gradient(135deg,#00c8e0,#5b6fff))', border: 'none', borderRadius: 'var(--r-sm)', padding: '8px 14px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy === p ? 'Ouverture…' : 'Relier'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {err && <p role="alert" style={{ fontSize: 12.5, color: 'var(--danger)', margin: '10px 0 0', lineHeight: 1.5 }}>{err}</p>}
    </div>
  )
}
