'use client'
// ══════════════════════════════════════════════════════════════════════════
// Vue Événements / défis d'un espace : cartes à venir, RSVP (Je viens / Peut-être),
// création (membres), suppression (créateur/modo). Append en direct (Realtime).
// Sobre, tokens uniquement.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listSpaceEvents, setRsvp, deleteEvent } from '@/lib/community/events'
import { myId } from '@/lib/community/shared'
import { CreateEventSheet } from './CreateEventSheet'
import type { CommunityEvent, EventKind } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const KIND_LABEL: Record<EventKind, string> = { sortie: 'Sortie', wod: 'WOD', defi: 'Défi', course: 'Course', autre: 'Événement' }

function fmtWhen(iso: string): string {
  try {
    const d = new Date(iso)
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${day} · ${time}`
  } catch { return '' }
}
const isPast = (iso: string) => { try { return new Date(iso).getTime() < Date.now() } catch { return false } }

export function EventsView({ spaceId, isMember, canManage, isNarrow, onBack }: {
  spaceId: string; isMember: boolean; canManage: boolean; isNarrow: boolean; onBack: () => void
}) {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const instanceId = useId()

  const load = useCallback(async () => {
    if (!isMember) { setEvents([]); setLoading(false); return }
    setEvents(await listSpaceEvents(spaceId)); setLoading(false)
  }, [spaceId, isMember])
  useEffect(() => { setLoading(true); void load() }, [load])
  useEffect(() => { void myId().then(setMe) }, [])

  useEffect(() => {
    if (!isMember) return
    const sb = createClient()
    const ch = sb.channel(`comm-ev-${spaceId}-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_events', filter: `space_id=eq.${spaceId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_event_rsvps' }, () => void load())
      .subscribe()
    return () => { void sb.removeChannel(ch) }
  }, [spaceId, isMember, load, instanceId])

  async function rsvp(ev: CommunityEvent, status: 'going' | 'maybe') {
    const next = ev.myRsvp === status ? null : status
    if (await setRsvp(ev.id, next)) void load()
  }
  async function remove(id: string) {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cet événement ?')) return
    if (await deleteEvent(id)) void load()
  }

  const header = (
    <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      {isNarrow && (
        <button onClick={onBack} aria-label="Retour" style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <span style={{ flex: 1, fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Événements</span>
      {isMember && (
        <button onClick={() => setCreating(true)} style={{ height: 32, padding: '0 var(--space-3)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>+ Créer</button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-3) var(--space-5) var(--space-5)' }}>
        {!isMember ? (
          <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', textAlign: 'center', padding: 'var(--space-8)' }}>Rejoins l&apos;espace pour voir et créer des événements.</p>
        ) : loading ? (
          <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[0, 1, 2].map(i => <span key={i} style={{ height: 96, borderRadius: 'var(--r-md)', background: 'var(--surface-neutral)' }} />)}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
            <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>Aucun événement pour l&apos;instant</p>
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>Organise une sortie, un WOD ou un défi — les membres seront prévenus.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {events.map(ev => {
              const past = isPast(ev.startsAt)
              return (
                <div key={ev.id} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)', opacity: past ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-dim)', padding: '3px 8px', borderRadius: 'var(--r-sm)' }}>{KIND_LABEL[ev.kind]}</span>
                    <span className="tnum" style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtWhen(ev.startsAt)}</span>
                    {(ev.createdBy === me || canManage) && (
                      <button onClick={() => void remove(ev.id)} aria-label="Supprimer" style={{ marginLeft: 'auto', width: 26, height: 26, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    )}
                  </div>
                  <p style={{ fontFamily: FD, fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{ev.title}</p>
                  <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
                    {ev.location ? `${ev.location} · ` : ''}par {ev.authorName}
                  </p>
                  {ev.description && <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ev.description}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <RsvpBtn active={ev.myRsvp === 'going'} onClick={() => void rsvp(ev, 'going')} label="Je viens" count={ev.goingCount} disabled={past} />
                    <RsvpBtn active={ev.myRsvp === 'maybe'} onClick={() => void rsvp(ev, 'maybe')} label="Peut-être" count={ev.maybeCount} disabled={past} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {creating && <CreateEventSheet spaceId={spaceId} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); void load() }} />}
    </div>
  )
}

function RsvpBtn({ active, onClick, label, count, disabled }: { active: boolean; onClick: () => void; label: string; count: number; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 var(--space-3)', border: 'none', borderRadius: 'var(--r-sm)', cursor: disabled ? 'default' : 'pointer', background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)', outline: active ? '1px solid var(--primary)' : 'none', fontFamily: FB, fontSize: 12.5, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text-mid)' }}>
      {label}{count > 0 && <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums', color: active ? 'var(--primary)' : 'var(--text-dim)' }}>{count}</span>}
    </button>
  )
}
