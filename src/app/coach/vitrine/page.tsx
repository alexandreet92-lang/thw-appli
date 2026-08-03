'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Coach — édition de sa VITRINE publique + boîte de réception des demandes
// de coaching. La vitrine se partage via /c/[slug].
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getMyCoachProfile, upsertMyCoachProfile, slugify,
  listIncomingRequests, respondToRequest,
  type CoachProfile, type CoachingRequest, type CoachDiploma, type CoachPalmares,
} from '@/lib/coach/vitrine'

const SPORTS: { key: string; label: string }[] = [
  { key: 'running', label: 'Course' }, { key: 'cycling', label: 'Vélo' }, { key: 'swim', label: 'Natation' },
  { key: 'gym', label: 'Renforcement' }, { key: 'hyrox', label: 'Hyrox' }, { key: 'trail', label: 'Trail' },
  { key: 'triathlon', label: 'Triathlon' }, { key: 'rowing', label: 'Aviron' },
]

export default function CoachVitrineEditor() {
  const [p, setP] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reqs, setReqs] = useState<(CoachingRequest & { athleteName: string })[]>([])

  useEffect(() => {
    void (async () => {
      const prof = await getMyCoachProfile()
      setP(prof ?? { coach_id: '', slug: null, display_name: '', headline: '', bio: '', logo_url: '', avatar_url: '', website_url: '', socials: {}, sports: [], location: '', diplomas: [], palmares: [], contact_email: '', phone: '', show_contact: false, accepting_requests: true, published: false })
      setReqs(await listIncomingRequests().catch(() => []))
      setLoading(false)
    })()
  }, [])

  if (loading || !p) return <div style={{ padding: 40, fontFamily: 'var(--font-body)', color: 'var(--text-dim)' }}>Chargement…</div>

  const set = (patch: Partial<CoachProfile>) => { setP({ ...p, ...patch }); setSaved(false) }
  const setSocial = (k: string, v: string) => set({ socials: { ...p.socials, [k]: v } })
  const toggleSport = (k: string) => set({ sports: p.sports.includes(k) ? p.sports.filter(x => x !== k) : [...p.sports, k] })
  const addDiploma = () => set({ diplomas: [...p.diplomas, { title: '' }] })
  const setDiploma = (i: number, patch: Partial<CoachDiploma>) => set({ diplomas: p.diplomas.map((d, j) => j === i ? { ...d, ...patch } : d) })
  const removeDiploma = (i: number) => set({ diplomas: p.diplomas.filter((_, j) => j !== i) })
  const addPalmares = () => set({ palmares: [...p.palmares, { title: '' }] })
  const setPalm = (i: number, patch: Partial<CoachPalmares>) => set({ palmares: p.palmares.map((d, j) => j === i ? { ...d, ...patch } : d) })
  const removePalm = (i: number) => set({ palmares: p.palmares.filter((_, j) => j !== i) })

  const save = async () => {
    setSaving(true)
    try {
      const slug = (p.slug && p.slug.trim()) ? slugify(p.slug) : slugify(p.display_name || 'coach')
      const next = await upsertMyCoachProfile({ ...p, slug })
      setP(next); setSaved(true)
    } catch (e) { alert(e instanceof Error ? e.message : 'Enregistrement impossible.') }
    finally { setSaving(false) }
  }

  const publicUrl = p.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${p.slug}` : ''
  const copy = () => { if (publicUrl) { void navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1600) } }

  const respond = async (r: CoachingRequest & { athleteName: string }, accept: boolean) => {
    try {
      await respondToRequest(r, accept)
      setReqs(list => list.filter(x => x.id !== r.id))
    } catch (e) {
      if (e instanceof Error && e.message === 'CAPACITY') {
        if (confirm('Tu as atteint la capacité de ton pack. Passer à un pack supérieur ?')) window.location.href = '/coach/subscription'
      } else { alert('Action impossible — réessaie.') }
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Ma vitrine</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 24px' }}>Ta page publique de coach — partage-la sur tes réseaux pour recevoir des demandes.</p>

      {/* Demandes reçues */}
      {reqs.length > 0 && (
        <div style={{ ...cardSt, marginBottom: 20 }}>
          <div style={secLbl}>Demandes de coaching ({reqs.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reqs.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.athleteName}</div>
                  {r.message && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 3, lineHeight: 1.5 }}>{r.message}</div>}
                </div>
                <button onClick={() => respond(r, true)} style={btnPrimary}>Accepter</button>
                <button onClick={() => respond(r, false)} style={btnGhost}>Refuser</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={cardSt}>
        {/* Statut + lien */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Toggle on={p.published} onClick={() => set({ published: !p.published })} label={p.published ? 'Vitrine en ligne' : 'Vitrine hors ligne'} />
          <Toggle on={p.accepting_requests} onClick={() => set({ accepting_requests: !p.accepting_requests })} label="Accepte des demandes" />
        </div>
        {p.published && p.slug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</span>
            <button onClick={copy} style={btnGhost}>{copied ? 'Copié ✓' : 'Copier'}</button>
            <Link href={`/c/${p.slug}`} target="_blank" style={{ ...btnGhost, textDecoration: 'none' }}>Voir</Link>
          </div>
        )}

        <Field label="Nom affiché"><input value={p.display_name ?? ''} onChange={e => set({ display_name: e.target.value })} style={inp} placeholder="Alex Coaching" /></Field>
        <Field label="Lien personnalisé" hint="c/…"><input value={p.slug ?? ''} onChange={e => set({ slug: e.target.value })} onBlur={e => set({ slug: slugify(e.target.value) })} style={inp} placeholder="alex-coaching" /></Field>
        <Field label="Accroche"><input value={p.headline ?? ''} onChange={e => set({ headline: e.target.value })} style={inp} placeholder="Coach hybride endurance & force · Ironman" /></Field>
        <Field label="Description"><textarea value={p.bio ?? ''} onChange={e => set({ bio: e.target.value })} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="Ton parcours, ta méthode, pour qui tu coaches…" /></Field>
        <Field label="Localisation"><input value={p.location ?? ''} onChange={e => set({ location: e.target.value })} style={inp} placeholder="Paris · En ligne" /></Field>
        <Field label="Photo de profil (URL image)"><input value={p.avatar_url ?? ''} onChange={e => set({ avatar_url: e.target.value })} style={inp} placeholder="https://…" /></Field>
        <Field label="Logo (URL image)"><input value={p.logo_url ?? ''} onChange={e => set({ logo_url: e.target.value })} style={inp} placeholder="https://…" /></Field>

        <div style={secLbl}>Sports</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPORTS.map(s => {
            const on = p.sports.includes(s.key)
            return <button key={s.key} onClick={() => toggleSport(s.key)} style={{ padding: '7px 13px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{s.label}</button>
          })}
        </div>

        <div style={secLbl}>Liens</div>
        <Field label="Site web"><input value={p.website_url ?? ''} onChange={e => set({ website_url: e.target.value })} style={inp} placeholder="https://…" /></Field>
        <Field label="Instagram"><input value={p.socials.instagram ?? ''} onChange={e => setSocial('instagram', e.target.value)} style={inp} placeholder="https://instagram.com/…" /></Field>
        <Field label="TikTok"><input value={p.socials.tiktok ?? ''} onChange={e => setSocial('tiktok', e.target.value)} style={inp} placeholder="https://tiktok.com/@…" /></Field>
        <Field label="YouTube"><input value={p.socials.youtube ?? ''} onChange={e => setSocial('youtube', e.target.value)} style={inp} placeholder="https://youtube.com/@…" /></Field>
        <Field label="Strava"><input value={p.socials.strava ?? ''} onChange={e => setSocial('strava', e.target.value)} style={inp} placeholder="https://strava.com/athletes/…" /></Field>

        {/* Diplômes & certifications */}
        <div style={secLbl}>Diplômes & certifications</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.diplomas.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={d.title} onChange={e => setDiploma(i, { title: e.target.value })} style={{ ...inp, flex: 2 }} placeholder="Diplôme / certification" />
              <input value={d.org ?? ''} onChange={e => setDiploma(i, { org: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Organisme" />
              <input value={d.year ?? ''} onChange={e => setDiploma(i, { year: e.target.value })} style={{ ...inp, width: 78, flex: 'none' }} placeholder="Année" inputMode="numeric" />
              <button onClick={() => removeDiploma(i)} aria-label="Retirer" style={btnRemove}>×</button>
            </div>
          ))}
          <button onClick={addDiploma} style={btnAdd}>+ Ajouter un diplôme</button>
        </div>

        {/* Palmarès */}
        <div style={secLbl}>Palmarès</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.palmares.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={d.title} onChange={e => setPalm(i, { title: e.target.value })} style={{ ...inp, flex: 1 }} placeholder="Résultat / titre (ex. Vainqueur Hyrox Paris)" />
              <input value={d.year ?? ''} onChange={e => setPalm(i, { year: e.target.value })} style={{ ...inp, width: 78, flex: 'none' }} placeholder="Année" inputMode="numeric" />
              <button onClick={() => removePalm(i)} aria-label="Retirer" style={btnRemove}>×</button>
            </div>
          ))}
          <button onClick={addPalmares} style={btnAdd}>+ Ajouter un résultat</button>
        </div>

        {/* Coordonnées */}
        <div style={secLbl}>Coordonnées</div>
        <Field label="Email de contact"><input value={p.contact_email ?? ''} onChange={e => set({ contact_email: e.target.value })} style={inp} placeholder="coach@exemple.com" inputMode="email" /></Field>
        <Field label="Téléphone"><input value={p.phone ?? ''} onChange={e => set({ phone: e.target.value })} style={inp} placeholder="+33 6 12 34 56 78" inputMode="tel" /></Field>
        <div style={{ marginTop: 12 }}>
          <Toggle on={p.show_contact} onClick={() => set({ show_contact: !p.show_contact })} label="Afficher mes coordonnées sur la vitrine" />
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.5 }}>Si désactivé, email et téléphone restent privés. Les athlètes te contactent alors via une demande de coaching.</p>
        </div>

        <button onClick={save} disabled={saving} style={{ ...btnPrimary, width: '100%', height: 46, marginTop: 20, fontSize: 14.5 }}>{saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}</button>
      </div>
    </div>
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
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }
const btnAdd: React.CSSProperties = { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnRemove: React.CSSProperties = { width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }
