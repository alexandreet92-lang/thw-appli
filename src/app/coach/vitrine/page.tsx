'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Coach — VITRINE. À l'ouverture : un APERÇU visuel (ce que voient les athlètes,
// via CoachShowcase). Bouton « Modifier » → formulaire d'édition (photo de profil,
// vidéo de présentation, galerie, diplômes, palmarès, coordonnées…).
// La vitrine se partage via /c/[slug].
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  getMyCoachProfile, upsertMyCoachProfile, slugify, getAccountDefaults,
  listIncomingRequests, respondToRequest,
  type CoachProfile, type CoachingRequest, type CoachDiploma, type CoachPalmares,
} from '@/lib/coach/vitrine'
import { listMyPrograms, type CoachProgram } from '@/lib/coach/programs'
import { uploadCoachMedia } from '@/lib/coach/media'
import { getSocialCounts, type SocialCounts } from '@/lib/social/follows'
import CoachShowcase from '@/components/coach/CoachShowcase'
import SlideSheet from '@/components/ui/SlideSheet'
import CoachProgramsPage from '@/app/coach/programs/page'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'

const SPORTS: { key: string; label: string }[] = [
  { key: 'running', label: 'Course' }, { key: 'cycling', label: 'Vélo' }, { key: 'swim', label: 'Natation' },
  { key: 'gym', label: 'Renforcement' }, { key: 'hyrox', label: 'Hyrox' }, { key: 'trail', label: 'Trail' },
  { key: 'triathlon', label: 'Triathlon' }, { key: 'rowing', label: 'Aviron' },
]

const EMPTY: CoachProfile = { coach_id: '', slug: null, display_name: '', headline: '', bio: '', logo_url: '', avatar_url: '', website_url: '', socials: {}, sports: [], location: '', diplomas: [], palmares: [], gallery: [], intro_video_url: '', contact_email: '', phone: '', show_contact: false, visibility: 'public', accepting_requests: true, published: false }

const VISIBILITY: { key: CoachProfile['visibility']; label: string; hint: string }[] = [
  { key: 'public', label: 'Public', hint: 'Visible par tout le monde' },
  { key: 'subscribers', label: 'Abonnés', hint: 'Visible par tes abonnés seulement' },
  { key: 'private', label: 'Privé', hint: 'Visible par toi seul' },
]

export default function CoachVitrinePage() {
  const { t } = useI18n()
  const [p, setP] = useState<CoachProfile | null>(null)
  const [programs, setPrograms] = useState<CoachProgram[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [reqs, setReqs] = useState<(CoachingRequest & { athleteName: string })[]>([])
  const [counts, setCounts] = useState<SocialCounts | null>(null)

  const avatarInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      const prof = await getMyCoachProfile()
      // Pré-remplissage depuis le compte (nom, photo) si le profil est vierge.
      let base = prof ?? EMPTY
      if (!base.display_name || !base.avatar_url) {
        const acc = await getAccountDefaults().catch(() => ({ full_name: null, avatar_url: null }))
        base = { ...base, display_name: base.display_name || acc.full_name || '', avatar_url: base.avatar_url || acc.avatar_url || '' }
      }
      setP(base)
      setReqs(await listIncomingRequests().catch(() => []))
      setPrograms((await listMyPrograms().catch(() => [])).filter(pr => pr.published))
      try {
        const user = await getCurrentUser()
        if (user) setCounts(await getSocialCounts(user.id))
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [])

  if (loading || !p) return <div style={{ padding: 40, fontFamily: 'var(--font-body)', color: 'var(--text-dim)' }}>{t('w1h.loading')}</div>

  const set = (patch: Partial<CoachProfile>) => { setP({ ...p, ...patch }); setSaved(false) }
  const setSocial = (k: string, v: string) => set({ socials: { ...p.socials, [k]: v } })
  const toggleSport = (k: string) => set({ sports: p.sports.includes(k) ? p.sports.filter(x => x !== k) : [...p.sports, k] })
  const addDiploma = () => set({ diplomas: [...p.diplomas, { title: '' }] })
  const setDiploma = (i: number, patch: Partial<CoachDiploma>) => set({ diplomas: p.diplomas.map((d, j) => j === i ? { ...d, ...patch } : d) })
  const removeDiploma = (i: number) => set({ diplomas: p.diplomas.filter((_, j) => j !== i) })
  const addPalmares = () => set({ palmares: [...p.palmares, { title: '' }] })
  const setPalm = (i: number, patch: Partial<CoachPalmares>) => set({ palmares: p.palmares.map((d, j) => j === i ? { ...d, ...patch } : d) })
  const removePalm = (i: number) => set({ palmares: p.palmares.filter((_, j) => j !== i) })
  const removeGallery = (i: number) => set({ gallery: p.gallery.filter((_, j) => j !== i) })

  const upload = async (files: FileList | null, target: 'avatar' | 'gallery' | 'video') => {
    if (!files || !files.length) return
    setUploading(target)
    try {
      if (target === 'gallery') {
        const urls: string[] = []
        for (const f of Array.from(files)) { const { url } = await uploadCoachMedia(f); urls.push(url) }
        set({ gallery: [...p.gallery, ...urls] })
      } else {
        const { url } = await uploadCoachMedia(files[0])
        set(target === 'avatar' ? { avatar_url: url } : { intro_video_url: url })
      }
    } catch (e) { alert(e instanceof Error ? e.message : t('w1h.upload_failed')) }
    finally { setUploading(null) }
  }

  const save = async () => {
    setSaving(true)
    try {
      const slug = (p.slug && p.slug.trim()) ? slugify(p.slug) : slugify(p.display_name || 'coach')
      const next = await upsertMyCoachProfile({ ...p, slug })
      setP(next); setSaved(true)
    } catch (e) { alert(e instanceof Error ? e.message : t('w1h.save_failed')) }
    finally { setSaving(false) }
  }

  const refreshPrograms = async () => { setPrograms((await listMyPrograms().catch(() => [])).filter(pr => pr.published)) }

  const publicUrl = p.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${p.slug}` : ''
  const copy = () => { if (publicUrl) { void navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1600) } }

  const respond = async (r: CoachingRequest & { athleteName: string }, accept: boolean) => {
    try {
      await respondToRequest(r, accept)
      setReqs(list => list.filter(x => x.id !== r.id))
    } catch (e) {
      if (e instanceof Error && e.message === 'CAPACITY') {
        if (confirm(t('w1h.capacity_upgrade'))) window.location.href = '/coach/subscription'
      } else { alert(t('w1h.action_failed')) }
    }
  }

  // ══════════════════════════════════ PROFIL + SURPAGES ══════════════════════════════════
  return (
    <>
      <div style={{ width: '100%', maxWidth: 1080, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
        {/* En-tête */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('w1h.my_profile')}</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.published ? 'var(--primary)' : 'var(--text-dim)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: p.published ? 'var(--primary)' : 'var(--text-dim)' }}>{p.published ? t('w1h.online') : t('w1h.offline')}</span>
          </div>
        </div>

        {/* Demandes reçues */}
        {reqs.length > 0 && (
          <div style={{ ...cardSt, marginBottom: 16 }}>
            <div style={secLbl}>{t('w1h.coaching_requests', { n: reqs.length })}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reqs.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.athleteName}</div>
                    {r.message && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 3, lineHeight: 1.5 }}>{r.message}</div>}
                  </div>
                  <button onClick={() => respond(r, true)} style={primary}>{t('w1h.accept')}</button>
                  <button onClick={() => respond(r, false)} style={ghost}>{t('w1h.decline')}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profil (pleine largeur) */}
        <CoachShowcase profile={p} programs={programs} counts={counts ?? undefined} isCoach isOwner activitiesHref="/activities"
          actions={<>
            <button onClick={() => setEditOpen(true)} style={{ height: 42, padding: '0 22px', borderRadius: 999, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('w1h.edit')}</button>
            <button onClick={() => setCreateOpen(true)} style={{ height: 42, padding: '0 18px', borderRadius: 999, border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('w1h.add_program')}</button>
            {p.published && p.slug && <a href={`/c/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ height: 42, padding: '0 18px', borderRadius: 999, background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>{t('w1h.view_public')}</a>}
          </>} />

        {/* Lien de partage */}
        {p.published && p.slug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
            <button onClick={copy} style={ghost}>{copied ? t('w1h.copied') : t('w1h.copy')}</button>
          </div>
        )}
      </div>

      {/* Surpage — Modifier le profil */}
      <SlideSheet open={editOpen} onClose={() => setEditOpen(false)} title={t('w1h.edit_my_profile')}>
        <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '8px clamp(16px,4vw,32px) 48px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
          <div style={cardSt}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Toggle on={p.published} onClick={() => set({ published: !p.published })} label={p.published ? t('w1h.showcase_online') : t('w1h.showcase_offline')} />
          <Toggle on={p.accepting_requests} onClick={() => set({ accepting_requests: !p.accepting_requests })} label={t('w1h.accepting_requests')} />
        </div>

        <div style={secLbl}>{t('w1h.visibility')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {VISIBILITY.map(v => {
            const on = p.visibility === v.key
            return (
              <button key={v.key} onClick={() => set({ visibility: v.key })} title={v.hint}
                style={{ padding: '9px 14px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{v.label}</button>
            )
          })}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '8px 0 0' }}>{VISIBILITY.find(v => v.key === p.visibility)?.hint}</p>

        {/* Médias : photo de profil + vidéo + galerie */}
        <div style={secLbl}>{t('w1h.profile_photo')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {p.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover' }} />
            : <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 24 }}>?</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => avatarInput.current?.click()} disabled={uploading === 'avatar'} style={ghost}>{uploading === 'avatar' ? t('w1h.sending') : t('w1h.choose_photo')}</button>
            {p.avatar_url && <button onClick={() => set({ avatar_url: '' })} style={ghost}>{t('w1h.remove')}</button>}
          </div>
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={e => { void upload(e.target.files, 'avatar'); e.target.value = '' }} />
        </div>

        <div style={secLbl}>{t('w1h.intro_video')}</div>
        {p.intro_video_url ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <video src={p.intro_video_url} controls preload="metadata" playsInline style={{ width: '100%', maxHeight: 260, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }} />
            <button onClick={() => set({ intro_video_url: '' })} style={{ ...ghost, alignSelf: 'flex-start' }}>{t('w1h.remove_video')}</button>
          </div>
        ) : (
          <button onClick={() => videoInput.current?.click()} disabled={uploading === 'video'} style={addBtn}>{uploading === 'video' ? t('w1h.sending') : t('w1h.upload_video')}</button>
        )}
        <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={e => { void upload(e.target.files, 'video'); e.target.value = '' }} />

        <div style={secLbl}>{t('w1h.photo_gallery')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {p.gallery.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 84, height: 84 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: 84, height: 84, borderRadius: 'var(--r-md)', objectFit: 'cover' }} />
              <button onClick={() => removeGallery(i)} aria-label={t('w1h.remove')} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button onClick={() => galleryInput.current?.click()} disabled={uploading === 'gallery'} style={{ width: 84, height: 84, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontSize: 24, cursor: 'pointer' }}>{uploading === 'gallery' ? '…' : '+'}</button>
        </div>
        <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={e => { void upload(e.target.files, 'gallery'); e.target.value = '' }} />

        {/* Textes */}
        <Field label={t('w1h.field_display_name')}><input value={p.display_name ?? ''} onChange={e => set({ display_name: e.target.value })} style={inp} placeholder="Alex Coaching" /></Field>
        <Field label={t('w1h.field_custom_link')} hint="c/…"><input value={p.slug ?? ''} onChange={e => set({ slug: e.target.value })} onBlur={e => set({ slug: slugify(e.target.value) })} style={inp} placeholder="alex-coaching" /></Field>
        <Field label={t('w1h.field_headline')}><input value={p.headline ?? ''} onChange={e => set({ headline: e.target.value })} style={inp} placeholder={t('w1h.ph_headline')} /></Field>
        <Field label={t('w1h.field_description')}><textarea value={p.bio ?? ''} onChange={e => set({ bio: e.target.value })} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder={t('w1h.ph_description')} /></Field>
        <Field label={t('w1h.field_location')}><input value={p.location ?? ''} onChange={e => set({ location: e.target.value })} style={inp} placeholder={t('w1h.ph_location')} /></Field>
        <Field label={t('w1h.field_logo')}><input value={p.logo_url ?? ''} onChange={e => set({ logo_url: e.target.value })} style={inp} placeholder="https://…" /></Field>

        <div style={secLbl}>{t('w1h.sports')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPORTS.map(s => {
            const on = p.sports.includes(s.key)
            return <button key={s.key} onClick={() => toggleSport(s.key)} style={{ padding: '7px 13px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{s.label}</button>
          })}
        </div>

        <div style={secLbl}>{t('w1h.links')}</div>
        <Field label={t('w1h.field_website')}><input value={p.website_url ?? ''} onChange={e => set({ website_url: e.target.value })} style={inp} placeholder="https://…" /></Field>
        <Field label="Instagram"><input value={p.socials.instagram ?? ''} onChange={e => setSocial('instagram', e.target.value)} style={inp} placeholder="https://instagram.com/…" /></Field>
        <Field label="TikTok"><input value={p.socials.tiktok ?? ''} onChange={e => setSocial('tiktok', e.target.value)} style={inp} placeholder="https://tiktok.com/@…" /></Field>
        <Field label="YouTube"><input value={p.socials.youtube ?? ''} onChange={e => setSocial('youtube', e.target.value)} style={inp} placeholder="https://youtube.com/@…" /></Field>
        <Field label="Strava"><input value={p.socials.strava ?? ''} onChange={e => setSocial('strava', e.target.value)} style={inp} placeholder="https://strava.com/athletes/…" /></Field>

        {/* Diplômes */}
        <div style={secLbl}>{t('w1h.diplomas_certs')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.diplomas.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={d.title} onChange={e => setDiploma(i, { title: e.target.value })} style={{ ...inp, flex: 2 }} placeholder={t('w1h.ph_diploma')} />
              <input value={d.org ?? ''} onChange={e => setDiploma(i, { org: e.target.value })} style={{ ...inp, flex: 1 }} placeholder={t('w1h.ph_org')} />
              <input value={d.year ?? ''} onChange={e => setDiploma(i, { year: e.target.value })} style={{ ...inp, width: 78, flex: 'none' }} placeholder={t('w1h.ph_year')} inputMode="numeric" />
              <button onClick={() => removeDiploma(i)} aria-label={t('w1h.remove')} style={removeBtn}>×</button>
            </div>
          ))}
          <button onClick={addDiploma} style={addBtn}>{t('w1h.add_diploma')}</button>
        </div>

        {/* Palmarès */}
        <div style={secLbl}>{t('w1h.palmares')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.palmares.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={d.title} onChange={e => setPalm(i, { title: e.target.value })} style={{ ...inp, flex: 1 }} placeholder={t('w1h.ph_result')} />
              <input value={d.year ?? ''} onChange={e => setPalm(i, { year: e.target.value })} style={{ ...inp, width: 78, flex: 'none' }} placeholder={t('w1h.ph_year')} inputMode="numeric" />
              <button onClick={() => removePalm(i)} aria-label={t('w1h.remove')} style={removeBtn}>×</button>
            </div>
          ))}
          <button onClick={addPalmares} style={addBtn}>{t('w1h.add_result')}</button>
        </div>

        {/* Coordonnées */}
        <div style={secLbl}>{t('w1h.contact_info')}</div>
        <Field label={t('w1h.field_contact_email')}><input value={p.contact_email ?? ''} onChange={e => set({ contact_email: e.target.value })} style={inp} placeholder="coach@exemple.com" inputMode="email" /></Field>
        <Field label={t('w1h.field_phone')}><input value={p.phone ?? ''} onChange={e => set({ phone: e.target.value })} style={inp} placeholder="+33 6 12 34 56 78" inputMode="tel" /></Field>
        <div style={{ marginTop: 12 }}>
          <Toggle on={p.show_contact} onClick={() => set({ show_contact: !p.show_contact })} label={t('w1h.show_contact')} />
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.5 }}>{t('w1h.contact_privacy_note')}</p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={save} disabled={saving} style={{ ...primary, flex: 1, height: 46, fontSize: 14.5 }}>{saving ? t('w1h.saving') : saved ? t('w1h.saved') : t('w1h.save')}</button>
          <button onClick={() => setEditOpen(false)} style={{ ...ghost, height: 46 }}>{t('w1h.close')}</button>
        </div>
          </div>
        </div>
      </SlideSheet>

      {/* Surpage — Créer un programme (plein écran, glisse de la droite) */}
      <SlideSheet open={createOpen} onClose={() => { setCreateOpen(false); void refreshPrograms() }} title={t('w1h.create_program')}>
        <CoachProgramsPage />
      </SlideSheet>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', margin: '14px 0 0' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>{label}{hint && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}> · {hint}</span>}</span>
      {children}
    </label>
  )
}
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 40, height: 24, borderRadius: 999, background: on ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 160ms', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 160ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </button>
  )
}

const cardSt: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,26px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const secLbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '22px 0 10px' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }
const primary: React.CSSProperties = { padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const ghost: React.CSSProperties = { padding: '9px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const addBtn: React.CSSProperties = { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const removeBtn: React.CSSProperties = { width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }
