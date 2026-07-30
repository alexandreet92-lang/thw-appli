'use client'
// ══════════════════════════════════════════════════════════════
// « Mon coach » (Dashboard athlète) — connexion à un coach, soignée : saisie du
// code en cellules segmentées, état lié élégant. Design tokens, Fraunces (titre)
// / Inter (corps), accent unique var(--primary), calme par soustraction.
// ══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { acceptInvite, listMyCoaches, revokeLink } from '@/lib/coach/relationships'
import { Avatar } from '@/components/shared/Sidebar'
import { CodeInput } from '@/components/coach/CodeCells'

interface CoachRow { linkId: string; coachId: string; since: string | null; name: string; avatar: string | null }

export function AthleteCoachCard() {
  const [coaches, setCoaches] = useState<CoachRow[]>([])
  const [ready, setReady] = useState(false)
  const [code, setCode] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const reload = useCallback(async () => {
    try {
      const links = await listMyCoaches()
      const names = new Map<string, { name: string; avatar: string | null }>()
      if (links.length) {
        try {
          const { data } = await createClient().from('profiles').select('id, full_name, first_name, avatar_url').in('id', links.map(l => l.coachId))
          ;(data ?? []).forEach((p: { id: string; full_name: string | null; first_name: string | null; avatar_url: string | null }) =>
            names.set(p.id, { name: p.full_name || p.first_name || 'Mon coach', avatar: p.avatar_url ?? null }))
        } catch { /* profil coach non lisible → repli */ }
      }
      setCoaches(links.map(l => ({ ...l, name: names.get(l.coachId)?.name ?? 'Mon coach', avatar: names.get(l.coachId)?.avatar ?? null })))
    } catch { /* silencieux */ } finally { setReady(true) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  const add = async () => {
    if (code.length !== 8 || busy) return
    setBusy(true); setMsg(null)
    try { await acceptInvite(code); setCode(''); setResetKey(k => k + 1); setAdding(false); setMsg({ text: 'Coach ajouté — il peut désormais te suivre.', ok: true }); await reload() }
    catch (e) { setMsg({ text: e instanceof Error ? e.message : 'Code invalide', ok: false }) }
    finally { setBusy(false) }
  }
  const remove = async (linkId: string) => {
    if (!confirm('Rompre le lien avec ce coach ?')) return
    try { await revokeLink(linkId); await reload() } catch { /* */ }
  }

  if (!ready) return null
  const since = (d: string | null) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) } catch { return '' } }
  const hasCoach = coaches.length > 0
  const showForm = !hasCoach || adding

  const card: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 20, padding: 'clamp(18px, 3.5vw, 26px)', marginBottom: 'var(--space-5)' }

  return (
    <div style={card}>
      {/* Coach(s) lié(s) */}
      {hasCoach && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: adding ? 20 : 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Mon coach</div>
          {coaches.map(c => (
            <div key={c.linkId} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar url={c.avatar} name={c.name} size={46} />
                <span title="Connecté" style={{ position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2.5px solid var(--bg-card)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{c.since ? `Ton coach depuis ${since(c.since)}` : 'Ton coach'}</div>
              </div>
              <button onClick={() => remove(c.linkId)} aria-label="Rompre le lien" style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .14s, color .14s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {!adding && (
            <button onClick={() => { setAdding(true); setMsg(null) }} style={{ alignSelf: 'flex-start', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Ajouter un autre coach
            </button>
          )}
        </div>
      )}

      {/* Formulaire de connexion */}
      {showForm && (
        <div style={{ textAlign: 'center' }}>
          {!hasCoach && (
            <>
              <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M19 8l2 2 3-3" /></svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>Connecte-toi à ton coach</h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 20px', lineHeight: 1.55, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>Saisis le code que ton coach t’a partagé pour qu’il puisse suivre tes entraînements.</p>
            </>
          )}

          <CodeInput key={resetKey} onChange={setCode} onComplete={() => { /* prêt à valider */ }} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
            {adding && (
              <button onClick={() => { setAdding(false); setCode(''); setResetKey(k => k + 1); setMsg(null) }} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Annuler</button>
            )}
            <button onClick={() => void add()} disabled={code.length !== 8 || busy}
              style={{ minWidth: 150, padding: '11px 22px', borderRadius: 12, border: 'none', background: code.length === 8 && !busy ? 'var(--primary)' : 'var(--bg-alt)', color: code.length === 8 && !busy ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 14.5, fontWeight: 700, cursor: code.length === 8 && !busy ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', transition: 'background .15s' }}>
              {busy ? 'Connexion…' : 'Connecter'}
            </button>
          </div>
          {msg && <p style={{ fontSize: 13, color: msg.ok ? '#22c55e' : '#ef4444', margin: '14px 0 0', fontWeight: 600 }}>{msg.text}</p>}
        </div>
      )}
    </div>
  )
}
