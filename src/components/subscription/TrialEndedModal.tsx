'use client'
// ══════════════════════════════════════════════════════════════════
// Surpage de FIN D'ESSAI (athlète). À la 1re arrivée après les 14 jours,
// on explique : l'essai premium est terminé, l'app reste utilisable en
// gratuit (fonctions limitées), et pour garder le premium il faut s'abonner.
// Le bouton envoie un LIEN SÉCURISÉ par email vers la page des formules.
// Affichée une seule fois (flag localStorage) ; ensuite le bandeau prend le relais.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEntitlements } from '@/hooks/useEntitlements'

const SEEN_KEY = 'thw_trial_ended_seen'

export function TrialEndedModal() {
  const router = useRouter()
  const { loading, isFree } = useEntitlements()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !isFree) return
    let seen = false
    try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* ignore */ }
    if (seen) return
    void createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setShow(true)
    })
  }, [loading, isFree])

  if (!show) return null

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  const sendLink = async () => {
    if (!email || sending) return
    setSending(true); setErr(null)
    try {
      const r = await fetch('/api/subscription/request-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'change' }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? 'Envoi impossible') }
      setSent(true)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Envoi impossible.') }
    finally { setSending(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(8,12,18,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(460px, 100%)', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(26px, 5vw, 38px)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 18px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(6,182,212,0.3)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(21px, 5vw, 25px)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.2, textWrap: 'balance' as const }}>Ton essai premium est terminé</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-mid)', margin: '12px 0 0', lineHeight: 1.6 }}>
          Tes 14 jours d’essai sont écoulés. Tu peux continuer à utiliser l’app <strong style={{ color: 'var(--text)' }}>gratuitement</strong> — mais avec des fonctions IA limitées. Pour garder l’expérience complète, choisis une formule <strong style={{ color: 'var(--text)' }}>Premium, Pro ou Expert</strong>.
        </p>

        {sent ? (
          <div style={{ marginTop: 22, padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', margin: 0, fontWeight: 600 }}>Lien envoyé ✓</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 0' }}>Regarde ta boîte mail{email ? ` (${email})` : ''} pour choisir et régler ta formule.</p>
            <button onClick={dismiss} style={{ ...ghostBtn, marginTop: 12 }}>Continuer</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button onClick={sendLink} disabled={sending || !email} style={{ ...primaryBtn, opacity: sending || !email ? 0.65 : 1 }}>
                {sending ? 'Envoi…' : 'Recevoir le lien pour m’abonner'}
              </button>
              <button onClick={() => { dismiss(); router.push('/settings/subscription') }} style={ghostBtn}>Voir les formules</button>
              <button onClick={dismiss} style={{ ...ghostBtn, background: 'transparent', color: 'var(--text-dim)' }}>Continuer en gratuit</button>
            </div>
            {err && <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#ef4444', margin: '10px 0 0' }}>{err}</p>}
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', margin: '14px 0 0' }}>On t’envoie un lien sécurisé par email vers la page de paiement.</p>
          </>
        )}
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = { height: 48, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { height: 44, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }
