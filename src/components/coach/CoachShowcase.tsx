'use client'

// ══════════════════════════════════════════════════════════════════
// CoachShowcase — PROFIL (aperçu coach + page publique). Pleine largeur :
// hero + stats + actions, puis sections en grille (à propos, vidéo, palmarès,
// diplômes, programmes, activités, réseaux). États vides qui invitent à remplir.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CoachProfile } from '@/lib/coach/vitrine'
import type { CoachProgram } from '@/lib/coach/programs'
import type { SocialCounts } from '@/lib/social/follows'
import ProgramDeck from '@/components/coach/ProgramDeck'
import ProgramFilters, { applyProgramFilters, DEFAULT_FILTERS, type ProgFilters } from '@/components/coach/ProgramFilters'
import ProgramDetailView from '@/components/coach/ProgramDetailView'
import ActivityShowcase from '@/components/profile/ActivityShowcase'
import { getProfileActivityShowcase, setActivityVisibility, type ActivityShowcaseData, type ActivityVisibility } from '@/lib/profile/activityShowcase'
import SlideSheet from '@/components/ui/SlideSheet'

const VIS_LABEL: Record<ActivityVisibility, string> = { public: 'Tout le monde', followers: 'Mes abonnés', private: 'Personne' }

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', rowing: 'Aviron', trail: 'Trail', triathlon: 'Triathlon' }

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

interface ShowcaseProps {
  profile: CoachProfile
  programs?: CoachProgram[]
  counts?: SocialCounts
  isCoach?: boolean
  isOwner?: boolean
  isFollowing?: boolean
  followBusy?: boolean
  onToggleFollow?: () => void
  actions?: React.ReactNode          // boutons supplémentaires (Modifier / Message / coaching)
  activitiesHref?: string            // lien « Voir les activités » (si dispo)
}

export default function CoachShowcase({ profile, programs = [], counts, isCoach, isOwner, isFollowing, followBusy, onToggleFollow, actions, activitiesHref }: ShowcaseProps) {
  const [openProgram, setOpenProgram] = useState<CoachProgram | null>(null)
  const [progFilters, setProgFilters] = useState<ProgFilters>(DEFAULT_FILTERS)
  const filteredPrograms = applyProgramFilters(programs, progFilters)
  const [showcase, setShowcase] = useState<ActivityShowcaseData | null>(null)
  const [vis, setVis] = useState<ActivityVisibility>('public')
  const uid = profile.coach_id
  useEffect(() => {
    if (!uid) return
    void getProfileActivityShowcase(uid).then(d => { setShowcase(d); if (d) setVis(d.visibility) }).catch(() => {})
  }, [uid])
  const changeVis = async (v: ActivityVisibility) => { setVis(v); await setActivityVisibility(v).catch(() => {}); if (uid) void getProfileActivityShowcase(uid).then(setShowcase).catch(() => {}) }
  const yearNow = new Date().getFullYear()
  const name = profile.display_name || 'Profil'
  const monogram = name.trim().charAt(0).toUpperCase()
  const socials = profile.socials ?? {}
  const years = palmaresByYear(profile.palmares)
  const hasLinks = !!(profile.website_url || socials.instagram || socials.tiktok || socials.youtube || socials.strava)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── HERO ── */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 'clamp(16px,4vw,28px)', alignItems: 'center', flexWrap: 'wrap' }}>
          {(profile.avatar_url || profile.logo_url)
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={profile.avatar_url || profile.logo_url || ''} alt={name} style={{ width: 'clamp(96px,18vw,140px)', height: 'clamp(96px,18vw,140px)', borderRadius: 'clamp(24px,4vw,36px)', objectFit: 'cover', flexShrink: 0, boxShadow: '0 12px 34px rgba(0,0,0,0.18)' }} />
            : <div style={{ width: 'clamp(96px,18vw,140px)', height: 'clamp(96px,18vw,140px)', borderRadius: 'clamp(24px,4vw,36px)', background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 600, flexShrink: 0, boxShadow: '0 12px 34px rgba(6,182,212,0.28)' }}>{monogram}</div>}

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,42px)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)', margin: 0, lineHeight: 1.05 }}>{name}</h1>
              {isCoach && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Coach
                </span>
              )}
            </div>
            {profile.headline && <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(15px,2.2vw,18px)', fontWeight: 500, color: 'var(--text-mid)', margin: '8px 0 0', lineHeight: 1.4 }}>{profile.headline}</p>}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
              {profile.location && <span style={{ fontSize: 12.5, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {profile.location}
              </span>}
              {profile.sports.slice(0, 5).map(s => (
                <span key={s} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-card2)', padding: '5px 11px', borderRadius: 999 }}>{SPORT_LABEL[s] ?? s}</span>
              ))}
            </div>

            {/* Stats */}
            {counts && (
              <div style={{ display: 'flex', gap: 'clamp(20px,5vw,40px)', marginTop: 18, flexWrap: 'wrap' }}>
                <Stat n={counts.followers} label="Abonnés" />
                <Stat n={counts.following} label="Abonnements" />
                {(isCoach || counts.coached > 0) && <Stat n={counts.coached} label="Coachés" />}
                {showcase?.can_view && showcase.ytd_count > 0 && <Stat n={showcase.ytd_count} label={`Activités ${yearNow}`} />}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              {onToggleFollow && !isOwner && (
                <button onClick={onToggleFollow} disabled={followBusy}
                  style={{ height: 42, padding: '0 24px', borderRadius: 999, border: 'none', cursor: followBusy ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, background: isFollowing ? 'var(--bg-card2)' : 'var(--primary)', color: isFollowing ? 'var(--text-mid)' : 'var(--on-primary)', opacity: followBusy ? 0.6 : 1 }}>
                  {isFollowing ? 'Abonné' : "S'abonner"}
                </button>
              )}
              {actions}
            </div>
          </div>
        </div>
      </div>

      {/* ── VIDÉO ── */}
      {profile.intro_video_url && (
        <div style={card}>
          <SectionTitle>Présentation</SectionTitle>
          <video controls preload="metadata" playsInline src={profile.intro_video_url}
            style={{ width: '100%', maxHeight: 480, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', objectFit: 'cover', marginTop: 4 }} />
        </div>
      )}

      {/* ── À PROPOS ── */}
      {(profile.bio || isOwner) && (
        <div style={card}>
          <SectionTitle>À propos</SectionTitle>
          {profile.bio
            ? <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' as const }}>{profile.bio}</p>
            : <Empty>Ajoute une description : ton parcours, ta méthode, pour qui tu coaches.</Empty>}
        </div>
      )}

      {/* ── PROGRAMMES (deck pleine largeur) ── */}
      {(programs.length > 0 || isOwner) && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
            <SectionTitle>Programmes</SectionTitle>
            {programs.length > 0 && <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{programs.length}</span>}
          </div>
          {programs.length > 0 ? (
            <>
              <ProgramFilters programs={programs} value={progFilters} onChange={setProgFilters} />
              {filteredPrograms.length > 0
                ? <ProgramDeck programs={filteredPrograms} onOpen={setOpenProgram} />
                : <Empty>Aucun programme ne correspond à ces filtres.</Empty>}
            </>
          ) : <Empty>{isCoach ? 'Publie un programme pour le montrer ici.' : 'Aucun programme publié.'}</Empty>}
        </div>
      )}

      {/* ── GRILLE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Palmarès */}
        {(profile.palmares.length > 0 || isOwner) && (
          <div style={card}>
            <SectionTitle>Palmarès</SectionTitle>
            {years.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {years.map(g => (
                  <div key={g.year} style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                    <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', minWidth: 42, flexShrink: 0 }}>{g.year === '—' ? '·' : g.year}</span>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {g.items.map((t, i) => <li key={i} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : <Empty>Ajoute tes résultats marquants, année par année.</Empty>}
          </div>
        )}

        {/* Diplômes */}
        {(profile.diplomas.length > 0 || isOwner) && (
          <div style={card}>
            <SectionTitle>Diplômes & certifications</SectionTitle>
            {profile.diplomas.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.diplomas.map((d, i) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{d.title}</span>
                    {(d.org || d.year) && <span style={{ color: 'var(--text-dim)' }}> — {[d.org, d.year].filter(Boolean).join(' · ')}</span>}
                  </li>
                ))}
              </ul>
            ) : <Empty>Ajoute tes diplômes et certifications.</Empty>}
          </div>
        )}

        {/* Activités (pleine largeur) */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <SectionTitle>Activités</SectionTitle>
            {activitiesHref && <Link href={activitiesHref} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Tout voir →</Link>}
          </div>
          {showcase
            ? <ActivityShowcase data={showcase} isOwner={!!isOwner} />
            : <Empty>Chargement des activités…</Empty>}

          {/* Réglage de confidentialité (propriétaire) */}
          {isOwner && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>Qui peut voir mes activités ?</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['public', 'followers', 'private'] as ActivityVisibility[]).map(v => (
                  <button key={v} onClick={() => void changeVis(v)}
                    style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700,
                      border: vis === v ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: vis === v ? 'var(--primary-dim)' : 'transparent', color: vis === v ? 'var(--primary)' : 'var(--text-mid)' }}>
                    {VIS_LABEL[v]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coordonnées */}
        {profile.show_contact && (profile.contact_email || profile.phone) && (
          <div style={card}>
            <SectionTitle>Coordonnées</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.contact_email && <a href={`mailto:${profile.contact_email}`} style={contactRow}><Ic path="M2 4h20v16H2zM2 7l10 5 10-5" />{profile.contact_email}</a>}
              {profile.phone && <a href={`tel:${profile.phone.replace(/\s+/g, '')}`} style={contactRow}><Ic path="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" />{profile.phone}</a>}
            </div>
          </div>
        )}

        {/* Réseaux */}
        {hasLinks && (
          <div style={card}>
            <SectionTitle>Réseaux</SectionTitle>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {profile.website_url && <Social href={profile.website_url} label="Site web"><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z"/><circle cx="12" cy="12" r="10"/></Social>}
              {socials.instagram && <Social href={socials.instagram} label="Instagram"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></Social>}
              {socials.tiktok && <Social href={socials.tiktok} label="TikTok"><path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/></Social>}
              {socials.youtube && <Social href={socials.youtube} label="YouTube"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></Social>}
              {socials.strava && <a href={socials.strava} target="_blank" rel="noopener noreferrer" aria-label="Strava" style={socialCircle}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 3l5 9h-3l-2-4-2 4H2L9 3zm5 11h3l1.5 3 1.5-3h3l-4.5 8L14 14z"/></svg></a>}
            </div>
          </div>
        )}
      </div>

      {/* Surpage détail d'un programme */}
      <SlideSheet open={!!openProgram} onClose={() => setOpenProgram(null)} title="Programme">
        {openProgram && <ProgramDetailView program={openProgram} coachName={isOwner ? null : profile.display_name} coachSlug={profile.slug} />}
      </SlideSheet>
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 24, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{children}</div>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>{children}</p>
}
function Ic({ path }: { path: string }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
}
function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} style={socialCircle}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg></a>
}

const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,3vw,24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const socialCircle: React.CSSProperties = { width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card2)', color: 'var(--text-mid)' }
const contactRow: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)', textDecoration: 'none' }
