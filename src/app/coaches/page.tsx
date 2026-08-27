'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Annuaire des coachs — vitrines publiées qui acceptent des demandes.
// L'athlète parcourt et ouvre une vitrine (/c/[slug]) pour demander.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { listPublishedCoaches, type CoachProfile } from '@/lib/coach/vitrine'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renfo', hyrox: 'Hyrox', trail: 'Trail', triathlon: 'Triathlon', rowing: 'Aviron' }

export default function CoachesDirectory() {
  const { t } = useI18n()
  const [coaches, setCoaches] = useState<CoachProfile[] | null>(null)
  const [q, setQ] = useState('')
  const [sportsSel, setSportsSel] = useState<Set<string>>(new Set())
  const [dipOnly, setDipOnly] = useState(false)

  useEffect(() => { void listPublishedCoaches().then(setCoaches).catch(() => setCoaches([])) }, [])

  // Sports proposés = ceux réellement présents chez les coachs publiés.
  const availableSports = Array.from(new Set((coaches ?? []).flatMap(c => c.sports))).filter(s => SPORT_LABEL[s])
  const toggleSport = (s: string) => setSportsSel(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })

  const filtered = (coaches ?? []).filter(c => {
    if (q.trim()) {
      const hay = `${c.display_name ?? ''} ${c.headline ?? ''} ${c.location ?? ''} ${c.sports.map(s => SPORT_LABEL[s] ?? s).join(' ')}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    if (sportsSel.size > 0 && !c.sports.some(s => sportsSel.has(s))) return false
    if (dipOnly && !(Array.isArray(c.diplomas) && c.diplomas.length > 0)) return false
    return true
  })
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary-dim)' : 'var(--bg-card2)', color: active ? 'var(--primary)' : 'var(--text-dim)',
  })

  return (
    <div style={{ width: '100%', maxWidth: 920, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{t('w2h.coaches.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 20px' }}>{t('w2h.coaches.subtitle')}</p>
        </div>
        <Link href="/programmes" style={{ padding: '9px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 20, flexShrink: 0 }}>{t('w2h.coaches.viewPrograms')}</Link>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('w2h.coaches.searchPlaceholder')}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', marginBottom: 12 }} />

      {/* Filtres structurés : par sport + diplômé·e */}
      {(availableSports.length > 0 || (coaches?.length ?? 0) > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {availableSports.map(s => <button key={s} onClick={() => toggleSport(s)} style={chip(sportsSel.has(s))}>{SPORT_LABEL[s] ? t('w2h.sport.' + s) : s}</button>)}
          <button onClick={() => setDipOnly(v => !v)} style={chip(dipOnly)}>{t('w2h.coaches.diplomaFilter')}</button>
          {(sportsSel.size > 0 || dipOnly || q) && <button onClick={() => { setSportsSel(new Set()); setDipOnly(false); setQ('') }} style={{ ...chip(false), border: 'none', background: 'transparent', color: 'var(--text-dim)' }}>{t('w2h.coaches.reset')}</button>}
        </div>
      )}

      {coaches === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w2h.common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('w2h.coaches.empty')}</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 0' }}>{t('w2h.coaches.emptyHint')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(c => {
            const name = c.display_name || t('w2h.coaches.coachFallback')
            return (
              <Link key={c.coach_id} href={`/c/${c.slug}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 150ms, transform 150ms' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; el.style.transform = 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {(c.avatar_url || c.logo_url)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.avatar_url || c.logo_url || ''} alt={name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {c.location && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{c.location}</div>}
                  </div>
                </div>
                {c.headline && <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{c.headline}</p>}
                {c.palmares.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    {c.palmares.length > 1 ? t('w2h.coaches.palmaresPlural', { n: c.palmares.length }) : t('w2h.coaches.palmaresSingular', { n: c.palmares.length })}
                  </div>
                )}
                {c.sports.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                    {c.sports.slice(0, 4).map(s => <span key={s} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-card2)', padding: '4px 9px', borderRadius: 999 }}>{SPORT_LABEL[s] ? t('w2h.sport.' + s) : s}</span>)}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
