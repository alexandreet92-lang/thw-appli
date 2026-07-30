'use client'
// ══════════════════════════════════════════════════════════════
// « Mon coach » (Dashboard athlète) — l'endroit le plus simple pour lier un
// coach : l'athlète saisit le code fourni par son coach → acceptInvite. Affiche
// ensuite le(s) coach(s) lié(s), avec possibilité de rompre le lien.
// Design : tokens + Fraunces (titre) / Inter (corps).
// ══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { acceptInvite, listMyCoaches, revokeLink } from '@/lib/coach/relationships'
import { Avatar } from '@/components/shared/Sidebar'

interface CoachRow { linkId: string; coachId: string; since: string | null; name: string; avatar: string | null }

export function AthleteCoachCard() {
  const [coaches, setCoaches] = useState<CoachRow[]>([])
  const [ready, setReady] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
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
    if (!code.trim() || busy) return
    setBusy(true); setMsg(null)
    try { await acceptInvite(code); setCode(''); setMsg({ text: 'Coach ajouté — il peut désormais te suivre.', ok: true }); await reload() }
    catch (e) { setMsg({ text: e instanceof Error ? e.message : 'Code invalide', ok: false }) }
    finally { setBusy(false) }
  }
  const remove = async (linkId: string) => {
    if (!confirm('Rompre le lien avec ce coach ?')) return
    try { await revokeLink(linkId); await reload() } catch { /* */ }
  }

  if (!ready) return null

  const since = (d: string | null) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) } catch { return '' } }

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 20, padding: 'clamp(16px, 3vw, 22px)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: coaches.length ? 14 : 6 }}>
        <span style={{ display: 'flex', color: 'var(--primary)' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Mon coach</h2>
      </div>

      {coaches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {coaches.map(c => (
            <div key={c.linkId} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar url={c.avatar} name={c.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.since ? `Depuis ${since(c.since)}` : 'Coach lié'}</div>
              </div>
              <button onClick={() => remove(c.linkId)} aria-label="Rompre le lien" style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: coaches.length ? '0 0 10px' : '0 0 12px', lineHeight: 1.5 }}>
        {coaches.length ? 'Ajouter un autre coach avec son code.' : 'Ton coach t’a donné un code ? Saisis-le pour qu’il puisse te suivre.'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') void add() }}
          placeholder="Code (ex. ABCD-2345)"
          style={{ flex: '1 1 180px', minWidth: 0, padding: '11px 13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }} />
        <button onClick={() => void add()} disabled={!code.trim() || busy}
          style={{ padding: '11px 18px', borderRadius: 12, border: 'none', background: code.trim() && !busy ? 'var(--primary)' : 'var(--bg-alt)', color: code.trim() && !busy ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: code.trim() && !busy ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
          {busy ? '…' : 'Ajouter'}
        </button>
      </div>
      {msg && <p style={{ fontSize: 12.5, color: msg.ok ? '#22c55e' : '#ef4444', margin: '10px 0 0', fontWeight: 600 }}>{msg.text}</p>}
    </div>
  )
}
