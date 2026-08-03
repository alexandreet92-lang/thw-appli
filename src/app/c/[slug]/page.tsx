'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Vitrine PUBLIQUE d'un coach — /c/[slug]. Lien partageable (réseaux),
// visible sans compte. Éditorial et calme : Fraunces sur les titres,
// Inter sur le corps, neutres + un seul accent. CTA « Demander un coaching ».
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCoachProfileBySlug, requestCoaching, myRequestTo, type CoachProfile, type CoachingRequest } from '@/lib/coach/vitrine'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
      style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card2)', color: 'var(--text-mid)', transition: 'color 140ms, transform 140ms' }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'var(--primary)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.color = 'var(--text-mid)'; el.style.transform = 'none' }}>
      {children}
    </a>
  )
}

export default function CoachVitrine() {
  const slug = String(useParams()?.slug ?? '')
  const [profile, setProfile] = useState<CoachProfile | null>(null)
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
      if (p) setExisting(await myRequestTo(p.coach_id).catch(() => null))
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
  const monogram = name.trim().charAt(0).toUpperCase()
  const accepted = existing?.status === 'accepted'
  const pending = existing?.status === 'pending' || sent
  const socials = profile.socials ?? {}

  return (
    <div style={pageWrap}>
      <style>{`@keyframes vit_pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes vit_in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ ...card, animation: 'vit_in 0.4s ease' }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
          {(profile.avatar_url || profile.logo_url)
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={profile.avatar_url || profile.logo_url || ''} alt={name} style={{ width: 104, height: 104, borderRadius: 28, objectFit: 'cover', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }} />
            : <div style={{ width: 104, height: 104, borderRadius: 28, background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, boxShadow: '0 10px 30px rgba(6,182,212,0.28)' }}>{monogram}</div>}

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)', margin: '18px 0 0', lineHeight: 1.1, textWrap: 'balance' as const }}>{name}</h1>
          {profile.headline && <p style={{ fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 500, color: 'var(--text-mid)', margin: '8px 0 0', maxWidth: 460, lineHeight: 1.45 }}>{profile.headline}</p>}
          {profile.location && <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {profile.location}
          </p>}
        </div>

        {/* Sports */}
        {profile.sports.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 22 }}>
            {profile.sports.map(s => (
              <span key={s} style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-card2)', padding: '6px 13px', borderRadius: 999 }}>{SPORT_LABEL[s] ?? s}</span>
            ))}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text)', lineHeight: 1.65, margin: '26px auto 0', maxWidth: 540, textAlign: 'center', whiteSpace: 'pre-wrap' as const }}>{profile.bio}</p>
        )}

        {/* Diplômes & palmarès */}
        {(profile.diplomas.length > 0 || profile.palmares.length > 0) && (
          <div style={{ display: 'grid', gap: 22, marginTop: 30, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            {profile.diplomas.length > 0 && (
              <div>
                <div style={credLbl}>Diplômes & certifications</div>
                <ul style={credList}>
                  {profile.diplomas.map((d, i) => (
                    <li key={i} style={credItem}>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{d.title}</span>
                      {(d.org || d.year) && <span style={{ color: 'var(--text-dim)' }}> — {[d.org, d.year].filter(Boolean).join(' · ')}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.palmares.length > 0 && (
              <div>
                <div style={credLbl}>Palmarès</div>
                <ul style={credList}>
                  {profile.palmares.map((d, i) => (
                    <li key={i} style={credItem}>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{d.title}</span>
                      {d.year && <span style={{ color: 'var(--text-dim)' }}> — {d.year}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Coordonnées (si le coach a choisi de les afficher) */}
        {profile.show_contact && (profile.contact_email || profile.phone) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
            {profile.contact_email && (
              <a href={`mailto:${profile.contact_email}`} style={contactChip}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                {profile.contact_email}
              </a>
            )}
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/\s+/g, '')}`} style={contactChip}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {profile.phone}
              </a>
            )}
          </div>
        )}

        {/* Liens */}
        {(profile.website_url || socials.instagram || socials.tiktok || socials.youtube || socials.strava) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26 }}>
            {profile.website_url && <SocialLink href={profile.website_url} label="Site web"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z"/></svg></SocialLink>}
            {socials.instagram && <SocialLink href={socials.instagram} label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></SocialLink>}
            {socials.tiktok && <SocialLink href={socials.tiktok} label="TikTok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/></svg></SocialLink>}
            {socials.youtube && <SocialLink href={socials.youtube} label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg></SocialLink>}
            {socials.strava && <SocialLink href={socials.strava} label="Strava"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 3l5 9h-3l-2-4-2 4H2L9 3zm5 11h3l1.5 3 1.5-3h3l-4.5 8L14 14z"/></svg></SocialLink>}
          </div>
        )}

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
              {err && <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#ef4444', margin: '8px 2px 0' }}>{err} {err.toLowerCase().includes('connecte') && <Link href="/auth" style={{ color: 'var(--primary)', fontWeight: 700 }}>Se connecter</Link>}</p>}
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
const credLbl: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--text-dim)', marginBottom: 10, textAlign: 'center',
}
const credList: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }
const credItem: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }
const contactChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 'var(--r-md)',
  background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
  textDecoration: 'none',
}
