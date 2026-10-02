'use client'
// ══════════════════════════════════════════════════════════════════════════
// Événements / défis d'un espace : cartes (tuile date, type, horaire, lieu,
// auteur) avec pastilles RSVP (Je viens / Peut-être), « À venir » puis
// « Passés », création (membres), suppression (créateur/modo, double tap).
// Append en direct (Realtime). Mobile : vue plein écran avec en-tête rond.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ChevronLeft, Plus, CalendarDays, MapPin, Trash2, Check, Repeat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { listSpaceEvents, setRsvp, deleteEvent } from '@/lib/community/events'
import { myId } from '@/lib/community/shared'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { CreateEventSheet } from './CreateEventSheet'
import { CmStyles, CmHeader, CmRound, CmCard, CmLabel, CmPill, CmSkel, CmEmpty, FB, PAGE_BG, CARD_BG, TNUM, stagger } from './kit'
import type { CommunityEvent, CommunityChannel } from '@/types/community'

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtWeekday(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) } catch { return '' }
}
const isPast = (ev: CommunityEvent) => { try { return new Date(ev.endsAt ?? ev.startsAt).getTime() < Date.now() } catch { return false } }

export function EventsView({ spaceId, isMember, canManage, isNarrow, onBack, channels = [], onChannelsChanged }: {
  spaceId: string; isMember: boolean; canManage: boolean; isNarrow: boolean; onBack: () => void
  channels?: CommunityChannel[]; onChannelsChanged?: () => void
}) {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const instanceId = useId()
  const { t } = useI18n()

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
    haptic(next ? 'success' : 'light')
    // Optimiste : la pastille bascule tout de suite, le Realtime confirmera.
    setEvents(prev => prev.map(e => {
      if (e.id !== ev.id) return e
      let going = e.goingCount, maybe = e.maybeCount
      if (e.myRsvp === 'going') going--
      if (e.myRsvp === 'maybe') maybe--
      if (next === 'going') going++
      if (next === 'maybe') maybe++
      return { ...e, myRsvp: next, goingCount: Math.max(0, going), maybeCount: Math.max(0, maybe) }
    }))
    await setRsvp(ev.id, next)
    void load()
  }
  async function remove(id: string) {
    if (confirmDel !== id) { haptic('medium'); setConfirmDel(id); return }
    setConfirmDel(null)
    if (await deleteEvent(id)) void load()
  }

  const { upcoming, past } = useMemo(() => {
    const up: CommunityEvent[] = [], pa: CommunityEvent[] = []
    for (const ev of events) (isPast(ev) ? pa : up).push(ev)
    up.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    pa.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    return { upcoming: up, past: pa }
  }, [events])

  const header = isNarrow ? (
    <CmHeader
      left={<CmRound onClick={onBack} label={t('w3e.back')}><ChevronLeft size={22} strokeWidth={2.2} /></CmRound>}
      title={t('w3e.events')}
      sub={isMember && !loading ? <span style={TNUM}>{upcoming.length}</span> : undefined}
      right={isMember ? <CmRound onClick={() => setCreating(true)} label={t('w3e.create_event')}><Plus size={22} strokeWidth={2.3} /></CmRound> : undefined}
    />
  ) : (
    <div style={{ flexShrink: 0, padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
      <CalendarDays size={20} strokeWidth={2.2} color="var(--text-mid)" />
      <span style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{t('w3e.events')}</span>
      {isMember && <CmPill variant="primary" height={40} onClick={() => setCreating(true)}><Plus size={17} strokeWidth={2.4} />{t('w3e.create_event')}</CmPill>}
    </div>
  )

  const renderCard = (ev: CommunityEvent, i: number) => {
    const past = isPast(ev)
    const d = new Date(ev.startsAt)
    const canDel = ev.createdBy === me || canManage
    return (
      <CmCard key={ev.id} className="cm-in" style={{ ...stagger(i), padding: 14, opacity: past ? 0.6 : 1 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 54, flexShrink: 0, borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 0 8px' }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
            <span style={{ ...TNUM, fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{d.getDate()}</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-dim)', padding: '3px 8px', borderRadius: 'var(--r-sm)' }}>{t(`w3e.kindlabel_${ev.kind}`)}</span>
              {ev.frequency !== 'once' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 650, color: 'var(--text-mid)' }}><Repeat size={12} strokeWidth={2.4} />{t(`w3e.freq_${ev.frequency}`)}</span>}
            </div>
            <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>{ev.title}</div>
            <div style={{ ...TNUM, marginTop: 3, fontSize: 13.5, color: 'var(--text-mid)', textTransform: 'capitalize' }}>{fmtWeekday(ev.startsAt)} · {fmtTime(ev.startsAt)}{ev.endsAt ? ` – ${fmtTime(ev.endsAt)}` : ''}</div>
            <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              {ev.location && <><MapPin size={12} strokeWidth={2.4} />{ev.location}<span aria-hidden>·</span></>}
              {t('w3e.by_author', { name: ev.authorName })}
            </div>
          </div>
          {canDel && (
            <button type="button" onClick={() => void remove(ev.id)} aria-label={t('w3e.delete')} title={t('w3e.delete')} className="cm-btn cm-press"
              style={{ height: 34, minWidth: 34, padding: confirmDel === ev.id ? '0 12px' : 0, borderRadius: 'var(--r-pill)', background: confirmDel === ev.id ? 'var(--danger-soft)' : 'transparent', color: confirmDel === ev.id ? 'var(--danger)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 13, fontWeight: 750, flexShrink: 0, marginTop: -4, marginRight: -4 }}>
              <Trash2 size={16} strokeWidth={2.1} />{confirmDel === ev.id && t('cm.confirmQ')}
            </button>
          )}
        </div>
        {ev.description && <p style={{ margin: '12px 0 0', fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{ev.description}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <RsvpPill active={ev.myRsvp === 'going'} tone="primary" onClick={() => void rsvp(ev, 'going')} label={t('w3e.rsvp_going')} count={ev.goingCount} disabled={past} />
          <RsvpPill active={ev.myRsvp === 'maybe'} tone="dark" onClick={() => void rsvp(ev, 'maybe')} label={t('w3e.rsvp_maybe')} count={ev.maybeCount} disabled={past} />
        </div>
      </CmCard>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: isNarrow ? PAGE_BG : CARD_BG, fontFamily: FB }}>
      <CmStyles />
      {header}
      <div className="cm-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isNarrow ? '4px 16px calc(28px + env(safe-area-inset-bottom))' : '14px 18px 20px', background: isNarrow ? PAGE_BG : 'var(--surface-page)' }}>
        {!isMember ? (
          <CmEmpty icon={<CalendarDays size={28} strokeWidth={1.8} />} title={t('w3e.join_to_see_events')} />
        ) : loading ? (
          <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0, 1, 2].map(i => <CmSkel key={i} h={168} r="var(--r-lg)" />)}</div>
        ) : events.length === 0 ? (
          <CmEmpty icon={<CalendarDays size={28} strokeWidth={1.8} />} title={t('w3e.no_events_yet')} body={t('w3e.events_empty_hint')}
            action={<CmPill variant="primary" onClick={() => setCreating(true)}><Plus size={17} strokeWidth={2.4} />{t('w3e.create_event')}</CmPill>} />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <CmLabel style={{ marginTop: 6 }}>{t('cm.upcoming')}</CmLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{upcoming.map((ev, i) => renderCard(ev, i))}</div>
              </>
            )}
            {past.length > 0 && (
              <>
                <CmLabel>{t('cm.past')}</CmLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{past.map((ev, i) => renderCard(ev, upcoming.length + i))}</div>
              </>
            )}
          </>
        )}
      </div>
      {creating && (
        <CreateEventSheet
          spaceId={spaceId} channels={channels} canManageChannels={canManage}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); void load() }}
          onChannelsChanged={onChannelsChanged}
        />
      )}
    </div>
  )
}

function RsvpPill({ active, tone, onClick, label, count, disabled }: { active: boolean; tone: 'primary' | 'dark'; onClick: () => void; label: string; count: number; disabled?: boolean }) {
  const on = tone === 'primary' ? { background: 'var(--primary)', color: 'var(--on-primary)' } : { background: 'var(--text)', color: 'var(--bg)' }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className="cm-btn cm-press"
      style={{ flex: 1, height: 42, borderRadius: 'var(--r-pill)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: FB, fontSize: 14.5, fontWeight: 750,
        cursor: disabled ? 'default' : 'pointer', ...(active ? on : { background: 'var(--surface-chip)', color: 'var(--text)' }), transition: 'transform .18s cubic-bezier(.2,.8,.2,1)' }}>
      {active && <Check key="c" className="cm-pop" size={16} strokeWidth={2.8} />}
      {label}
      {count > 0 && <span style={{ ...TNUM, opacity: 0.75 }}>· {count}</span>}
    </button>
  )
}
