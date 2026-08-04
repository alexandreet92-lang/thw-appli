'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Vitrine PUBLIQUE d'un coach — /c/[slug]. Lien partageable, visible sans
// compte. Rendu visuel via CoachShowcase + CTA « Demander un coaching ».
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCoachProfileBySlug, requestCoaching, myRequestTo, type CoachProfile, type CoachingRequest } from '@/lib/coach/vitrine'
import { listCoachPublishedPrograms, type CoachProgram } from '@/lib/coach/programs'
import CoachShowcase from '@/components/coach/CoachShowcase'

export default function CoachVitrine() {
  const slug = String(useParams()?.slug ?? '')
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [programs, setPrograms] = useState<CoachProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState<CoachingRequest | null>(null)
  const [asking, setAsking] = useState(false)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const p = await getCoachProfileBySlug(slug).catch(() => null)
      if (!alive) return
      setProfile(p); setLoading(false)
      if (p) {
        setExisting(await myRequestTo(p.coach_id).catch(() => null))
        setPrograms(await listCoachPublishedPrograms(p.coach_id).catch(() => []))
      }
    })()
    return () => { alive = false }
  }, [slug])

  const send = async () => {
    if (!profile || sending) return
    setSending(true); setErr(null)
    try {
      await requestCoaching(profile.coach_id, msg.trim())
      setSent(true); setAsking(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Envoi impossible.')
    } finally { setSending(false) }
  }

  if (loading) {
    return <div style={pageWrap}><div style={{ ...card, height: 320, animation: 'vit_pulse 1.4s ease infinite' }} /></div>
  }
  if (!profile) {
    return (
      <div style={{ ...pageWrap, textAlign: 'center' }}>
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Vitrine introuvable</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', margin: '8px 0 20px' }}>Ce coach n’a pas (encore) de page publique.</p>
          <Link href="/coaches" style={ctaGhost}>Voir les coachs</Link>
        </div>
      </div>
    )
  }

  const name = profile.display_name || 'Coach'
  const accepted = existing?.status === 'accepted'
  const pending = existing?.status === 'pending' || sent

  return (
    <div style={pageWrap}>
      <style>{`@keyframes vit_pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes vit_in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ ...card, animation: 'vit_in 0.4s ease' }}>
        <CoachShowcase profile={profile} programs={programs} />

        {/* CTA */}
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {accepted ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--primary)', fontWeight: 600, margin: 0 }}>Tu es coaché·e par {name}.</p>
          ) : pending ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-mid)', margin: 0 }}>Demande envoyée — en attente de réponse.</p>
          ) : !profile.accepting_requests ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>Ce coach ne prend pas de nouvelles demandes pour le moment.</p>
          ) : asking ? (
            <div style={{ width: '100%', maxWidth: 420 }}>
              <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} autoFocus
                placeholder="Présente-toi en deux mots : ton objectif, ton niveau…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'vertical' }} />
              {err && <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--danger, #ef4444)', margin: '8px 2px 0' }}>{err} {err.toLowerCase().includes('connecte') && <Link href="/auth" style={{ color: 'var(--primary)', fontWeight: 700 }}>Se connecter</Link>}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={send} disabled={sending} style={{ ...ctaPrimary, flex: 1, opacity: sending ? 0.6 : 1 }}>{sending ? 'Envoi…' : 'Envoyer la demande'}</button>
                <button onClick={() => setAsking(false)} style={ctaGhost}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAsking(true)} style={{ ...ctaPrimary, minWidth: 240 }}>Demander un coaching</button>
          )}
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--text-dim)', textAlign: 'center', marginTop: 20 }}>
        Propulsé par <Link href="/" style={{ color: 'var(--text-mid)', fontWeight: 700, textDecoration: 'none' }}>Hybrid</Link>
      </p>
    </div>
  )
}

const pageWrap: React.CSSProperties = {
  minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  padding: 'clamp(20px, 5vw, 48px)', boxSizing: 'border-box',
}
const card: React.CSSProperties = {
  width: '100%', maxWidth: 600, margin: '0 auto', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)',
  padding: 'clamp(28px, 5vw, 48px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 20px 60px rgba(0,0,0,0.10)',
}
const ctaPrimary: React.CSSProperties = {
  height: 48, padding: '0 22px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)',
  color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
}
const ctaGhost: React.CSSProperties = {
  height: 48, padding: '0 20px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)',
  color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
}
