'use client'

// ══════════════════════════════════════════════════════════════════
// CoachShowcase — rendu VISUEL de la vitrine coach (aperçu et page publique).
// Grand nom + photo, vidéo de présentation, galerie, bio, sports, diplômes,
// palmarès, programmes, coordonnées. Purement présentationnel.
// ══════════════════════════════════════════════════════════════════
import Link from 'next/link'
import type { CoachProfile } from '@/lib/coach/vitrine'
import type { CoachProgram } from '@/lib/coach/programs'
import { LEVEL_LABEL } from '@/lib/coach/programs'
import type { SocialCounts } from '@/lib/social/follows'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }

/** Palmarès groupé par année (années décroissantes, « sans date » à la fin). */
function palmaresByYear(items: { title: string; year?: string }[]): { year: string; items: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const it of items) {
    const y = (it.year ?? '').trim() || '—'
    if (!groups.has(y)) groups.set(y, [])
    groups.get(y)!.push(it.title)
  }
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] === '—' ? 1 : b[0] === '—' ? -1 : b[0].localeCompare(a[0])))
    .map(([year, list]) => ({ year, items: list }))
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
      style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card2)', color: 'var(--text-mid)' }}>
      {children}
    </a>
  )
}

interface ShowcaseProps {
  profile: CoachProfile
  programs?: CoachProgram[]
  counts?: SocialCounts
  isCoach?: boolean
  isOwner?: boolean
  isFollowing?: boolean
  followBusy?: boolean
  onToggleFollow?: () => void
}

export default function CoachShowcase({ profile, programs = [], counts, isCoach, isOwner, isFollowing, followBusy, onToggleFollow }: ShowcaseProps) {
  const name = profile.display_name || 'Coach'
  const monogram = name.trim().charAt(0).toUpperCase()
  const socials = profile.socials ?? {}
  const gallery = profile.gallery ?? []
  const palmaresYears = palmaresByYear(profile.palmares)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
        {(profile.avatar_url || profile.logo_url)
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={profile.avatar_url || profile.logo_url || ''} alt={name} style={{ width: 120, height: 120, borderRadius: 32, objectFit: 'cover', boxShadow: '0 12px 34px rgba(0,0,0,0.18)' }} />
          : <div style={{ width: 120, height: 120, borderRadius: 32, background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 50, fontWeight: 600, boxShadow: '0 12px 34px rgba(6,182,212,0.28)' }}>{monogram}</div>}

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)', margin: '18px 0 0', lineHeight: 1.08, textWrap: 'balance' as const }}>{name}</h1>
        {profile.headline && <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text-mid)', margin: '10px 0 0', maxWidth: 480, lineHeight: 1.45 }}>{profile.headline}</p>}
        {profile.location && <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', margin: '10px 0 0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {profile.location}
        </p>}

        {/* Compteurs sociaux */}
        {counts && (
          <div style={{ display: 'flex', gap: 26, justifyContent: 'center', marginTop: 18 }}>
            <Stat n={counts.followers} label="Abonnés" />
            <Stat n={counts.following} label="Abonnements" />
            {(isCoach || counts.coached > 0) && <Stat n={counts.coached} label="Coachés" />}
          </div>
        )}

        {/* S'abonner */}
        {onToggleFollow && !isOwner && (
          <button onClick={onToggleFollow} disabled={followBusy}
            style={{ marginTop: 16, height: 40, padding: '0 22px', borderRadius: 999, border: 'none', cursor: followBusy ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
              background: isFollowing ? 'var(--bg-card2)' : 'var(--primary)', color: isFollowing ? 'var(--text-mid)' : 'var(--on-primary)', opacity: followBusy ? 0.6 : 1 }}>
            {isFollowing ? 'Abonné' : "S'abonner"}
          </button>
        )}

        {profile.sports.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18 }}>
            {profile.sports.map(s => (
              <span key={s} style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-card2)', padding: '6px 13px', borderRadius: 999 }}>{SPORT_LABEL[s] ?? s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Vidéo de présentation */}
      {profile.intro_video_url && (
        <video controls preload="metadata" playsInline
          style={{ width: '100%', maxHeight: 420, borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', objectFit: 'cover' }}
          src={profile.intro_video_url} />
      )}

      {/* Galerie */}
      {gallery.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: gallery.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {gallery.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', aspectRatio: gallery.length === 1 ? '16 / 9' : '1 / 1', objectFit: 'cover', borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text)', lineHeight: 1.65, margin: 0, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', whiteSpace: 'pre-wrap' as const }}>{profile.bio}</p>
      )}

      {/* Diplômes & palmarès */}
      {(profile.diplomas.length > 0 || profile.palmares.length > 0) && (
        <div style={{ display: 'grid', gap: 22, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {palmaresYears.map(g => (
                  <div key={g.year} style={{ display: 'flex', gap: 14, alignItems: 'baseline', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>{g.year === '—' ? '·' : g.year}</span>
                    <ul style={{ ...credList, textAlign: 'left', flex: 1, minWidth: 0 }}>
                      {g.items.map((t, i) => <li key={i} style={{ ...credItem, textAlign: 'left', color: 'var(--text)', fontWeight: 600 }}>{t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Programmes */}
      {programs.length > 0 && (
        <div style={{ maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
          <div style={credLbl}>Programmes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {programs.map(pr => (
              <Link key={pr.id} href={`/programmes/${pr.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', textDecoration: 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{pr.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{pr.duration_weeks}</span> sem.{pr.level ? ` · ${LEVEL_LABEL[pr.level]}` : ''}
                  </div>
                </div>
                <span style={{ color: 'var(--primary)', fontSize: 18, flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Coordonnées */}
      {profile.show_contact && (profile.contact_email || profile.phone) && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
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

      {/* Liens / réseaux */}
      {(profile.website_url || socials.instagram || socials.tiktok || socials.youtube || socials.strava) && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {profile.website_url && <SocialLink href={profile.website_url} label="Site web"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z"/></svg></SocialLink>}
          {socials.instagram && <SocialLink href={socials.instagram} label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></SocialLink>}
          {socials.tiktok && <SocialLink href={socials.tiktok} label="TikTok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/></svg></SocialLink>}
          {socials.youtube && <SocialLink href={socials.youtube} label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg></SocialLink>}
          {socials.strava && <SocialLink href={socials.strava} label="Strava"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 3l5 9h-3l-2-4-2 4H2L9 3zm5 11h3l1.5 3 1.5-3h3l-4.5 8L14 14z"/></svg></SocialLink>}
        </div>
      )}
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

const credLbl: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10, textAlign: 'center' }
const credList: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }
const credItem: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }
const contactChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }
