'use client'
// ══════════════════════════════════════════════════════════════════
// MESSAGES COACH — version MOBILE (maquette k4). Liste des fils (athlètes,
// DM, groupes) triée par activité, recherche, pastilles de non-lus cyan,
// rond « nouveau groupe ». Ouvrir un fil → conversation plein écran façon
// messagerie moderne qui glisse depuis la droite (bulles + composeur façon IA),
// la barre d'onglets s'efface d'elle-même (sur-page détectée par le shell).
// Mêmes sources que MessagesView (getCoachThreads + listMyGroups).
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { getCoachThreads, type Thread } from '@/lib/coach/messages'
import { listMyGroups, createGroup, getAddablePeople, type GroupSummary, type Addable } from '@/lib/messages/groups'
import { MessageThread } from '@/components/coach/MessageThread'
import { GroupChat } from '@/components/coach/GroupChat'
import {
  MPage, MTitle, Rise, SearchM, GroupM, MAvatar, RowButton, UnreadPill, SkelRows, EmptyM, SheetM, CTA, Label,
  RoundBtn, Ico, ICON, NUM, EASE, useTT,
} from './CoachKit'

type Item =
  | { kind: 'thread'; key: string; name: string; avatar: string | null; preview: string; at: string; unread: number; thread: Thread }
  | { kind: 'group'; key: string; name: string; avatar: string | null; preview: string; at: string; unread: number; group: GroupSummary }

export default function MessagesMobile() {
  const { t } = useI18n()
  const tt = useTT()
  const reduce = useReducedMotion()
  const [threads, setThreads] = useState<Thread[]>([])
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [selGroup, setSelGroup] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const load = useCallback(async () => {
    try {
      const [th, gr] = await Promise.all([getCoachThreads(), listMyGroups()])
      setThreads(th); setGroups(gr)
    } catch { /* silencieux */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const loadGroups = useCallback(async () => { try { setGroups(await listMyGroups()) } catch { /* */ } }, [])
  // Deep-link : /coach/messages?thread=<athleteId> ouvre la conversation.
  useEffect(() => {
    if (loading) return
    try {
      const wanted = new URLSearchParams(window.location.search).get('thread')
      if (wanted && threads.some(x => x.otherId === wanted)) { setSelId(wanted); setSelGroup(null) }
    } catch { /* */ }
  }, [loading, threads])

  const when = (d: string | null) => {
    if (!d) return ''
    const dt = new Date(d); const now = new Date()
    const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()) / 86400_000)
    try {
      if (days <= 0) return dt.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' })
      if (days === 1) return t('w3d.yesterday')
      if (days < 7) return dt.toLocaleDateString(currentLocale(), { weekday: 'short' })
      return dt.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })
    } catch { return '' }
  }

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [
      ...threads.map(th => ({ kind: 'thread' as const, key: `t-${th.otherId}`, name: th.name, avatar: th.avatar, preview: th.lastBody, at: th.lastAt, unread: th.unread, thread: th })),
      ...groups.map(g => ({ kind: 'group' as const, key: `g-${g.id}`, name: g.name, avatar: g.isDm ? g.dmAvatar : null, preview: g.lastBody ?? '', at: g.lastAt ?? '', unread: 0, group: g })),
    ]
    const ql = q.trim().toLowerCase()
    return list.filter(x => !ql || x.name.toLowerCase().includes(ql) || x.preview.toLowerCase().includes(ql))
      .sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || (b.at || '').localeCompare(a.at || ''))
  }, [threads, groups, q])

  const sel = threads.find(x => x.otherId === selId) ?? null
  const selectedGroup = groups.find(g => g.id === selGroup) ?? null
  const close = () => { setSelId(null); setSelGroup(null); void load() }
  const unreadTotal = threads.reduce((s, x) => s + x.unread, 0)

  return (
    <MPage>
      <MTitle title={t('coach.messagesTitle')}
        sub={unreadTotal > 0 ? <span style={NUM}>{tt('co.unread_count', '{n} non lus', { n: unreadTotal })}</span> : t('coach.messagesSubtitle')}
        right={<RoundBtn label={tt('co.new_group', 'Nouveau groupe')} onClick={() => setNewOpen(true)}><Ico d={ICON.edit} size={21} /></RoundBtn>} />

      <Rise i={1}><SearchM value={q} onChange={setQ} placeholder={tt('co.search', 'Rechercher')} /></Rise>

      <Rise i={2} style={{ marginTop: 14 }}>
        <GroupM>
          {loading ? <SkelRows n={4} /> : items.length === 0 ? (
            <EmptyM icon={<Ico d={ICON.chat} size={26} />} title={t('w3d.start_conversation')} hint={q ? tt('co.no_result', 'Aucun résultat') : undefined} />
          ) : items.map((it, i) => (
            <motion.div key={it.key} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: EASE, delay: Math.min(i, 10) * 0.035 }}>
              <RowButton first={i === 0} onClick={() => { if (it.kind === 'thread') { setSelId(it.thread.otherId); setSelGroup(null) } else { setSelGroup(it.group.id); setSelId(null) } }} style={{ minHeight: 76 }}>
                {it.kind === 'group' && !it.group.isDm
                  ? <span style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico d={ICON.users} size={24} /></span>
                  : <MAvatar name={it.name} url={it.avatar} size={52} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                  <span style={{ display: 'block', marginTop: 3, fontSize: 15, color: it.unread ? 'var(--text)' : 'var(--text-mid)', fontWeight: it.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.preview || t('w3d.start_conversation')}</span>
                </span>
                <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, alignSelf: 'stretch', justifyContent: 'center' }}>
                  {it.at && <span style={{ ...NUM, fontSize: 14, color: it.unread ? 'var(--primary)' : 'var(--text-dim)', fontWeight: it.unread ? 700 : 500 }}>{when(it.at)}</span>}
                  <UnreadPill n={it.unread} />
                </span>
              </RowButton>
            </motion.div>
          ))}
        </GroupM>
      </Rise>

      {/* Conversation plein écran (portail) */}
      {mounted && createPortal(
        <AnimatePresence>
          {(sel || selectedGroup) && (
            <motion.div key={sel ? `t-${sel.otherId}` : `g-${selectedGroup?.id}`}
              initial={reduce ? { opacity: 0 } : { x: '100%' }} animate={reduce ? { opacity: 1 } : { x: 0 }} exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 360, damping: 38, mass: 0.9 }}
              style={{ position: 'fixed', inset: 0, zIndex: 12500, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-float)' }}>
              <div style={{ height: 'env(safe-area-inset-top)', flexShrink: 0 }} />
              {sel ? (
                <>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                    <RoundBtn label={t('w3d.back')} onClick={close}><Ico d={ICON.back} size={22} sw={2.2} /></RoundBtn>
                    <Link href={`/coach/athlete?id=${sel.otherId}`} className="cm-press" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                      <MAvatar name={sel.name} url={sel.avatar} size={42} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.name}</span>
                        <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{t('w3d.athlete_role')} · {tt('co.view_profile', 'Voir la fiche')}</span>
                      </span>
                    </Link>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}><MessageThread coachId={sel.coachId} athleteId={sel.athleteId} variant="m" /></div>
                </>
              ) : selectedGroup ? (
                <div style={{ flex: 1, minHeight: 0, paddingTop: 6 }}>
                  <GroupChat group={selectedGroup} onChanged={loadGroups} onClosed={close} variant="m" />
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <NewGroupSheet open={newOpen} onClose={() => setNewOpen(false)} onCreated={id => { setNewOpen(false); void loadGroups().then(() => { setSelGroup(id); setSelId(null) }) }} />
    </MPage>
  )
}

// ── Feuille « Nouveau groupe » (coach = admin du groupe) ─────────
function NewGroupSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [pool, setPool] = useState<Addable[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setName(''); setSel(new Set()); void getAddablePeople().then(setPool).catch(() => setPool([])) } }, [open])
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const create = async () => {
    if (busy || !name.trim()) return
    setBusy(true)
    try { const id = await createGroup(name, [...sel], true); if (id) onCreated(id) } finally { setBusy(false) }
  }
  return (
    <SheetM open={open} onClose={onClose} title={t('w2d.newGroup')} label={t('w2d.newGroup')} height="calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)"
      footer={<CTA onClick={() => void create()} disabled={busy || !name.trim()}>{t('w2d.create')}</CTA>}>
      <p style={{ margin: '0 4px 12px', fontSize: 15, color: 'var(--text-mid)', textAlign: 'center' }}>{t('w2d.newGroupAdminHint')}</p>
      <GroupM style={{ padding: '4px 16px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t('w2d.groupNamePlaceholder')} className="cm-input"
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 17, fontFamily: 'var(--font-body)' }} />
      </GroupM>
      <Label right={sel.size > 0 ? <span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{sel.size}</span> : undefined}>{t('w2d.members')}</Label>
      <GroupM>
        {pool.length === 0 ? <EmptyM title={t('w2d.noOneToAddYet')} /> : pool.map((p, i) => {
          const on = sel.has(p.id)
          return (
            <RowButton key={p.id} first={i === 0} onClick={() => toggle(p.id)} style={{ minHeight: 64 }}>
              <MAvatar name={p.name} url={p.avatar} size={44} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--border-mid)', color: 'var(--on-primary)', transition: 'background .18s ease' }}>
                {on && <Ico d={<path d="M20 6 9 17l-5-5" />} size={15} sw={3} />}
              </span>
            </RowButton>
          )
        })}
      </GroupM>
    </SheetM>
  )
}
