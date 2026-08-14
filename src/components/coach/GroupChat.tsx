'use client'
// ══════════════════════════════════════════════════════════════
// Chat de GROUPE + gestion des membres. L'admin (coach créateur) peut
// renommer, ajouter/retirer des membres, supprimer le groupe. Un membre
// simple (athlète) peut seulement lire, écrire et quitter le groupe.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import {
  getGroupMessages, sendGroupMessage, listMembers, addMembers, removeMember,
  renameGroup, leaveGroup, deleteGroup, getAddablePeople,
  type GroupMessage, type GroupMember, type Addable, type GroupSummary,
} from '@/lib/messages/groups'
import { createGroup } from '@/lib/messages/groups'
import { Avatar } from '@/components/shared/Sidebar'
import { createPortal } from 'react-dom'

const fmtT = (d: string) => { try { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

// Modale de création de groupe. asAdmin=true côté coach (créateur = chef).
export function NewGroupModal({ asAdmin, onClose, onCreated }: { asAdmin: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [pool, setPool] = useState<Addable[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); void getAddablePeople().then(setPool) }, [])
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function create() {
    if (busy) return
    setBusy(true)
    const id = await createGroup(name, [...sel], asAdmin)
    setBusy(false)
    if (id) onCreated(id)
  }
  if (!mounted) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'var(--font-body)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
      <div style={{ position: 'relative', width: 'min(460px, 100%)', maxHeight: '82vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
        <div style={{ flexShrink: 0, padding: '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Nouveau groupe</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{asAdmin ? 'Tu seras l’admin (ajout / retrait de membres).' : 'Groupe entre membres — sans admin.'}</div>
        </div>
        <div style={{ padding: '14px 18px', flexShrink: 0 }}>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Nom du groupe (ex. Team Marathon)" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '4px 0 6px' }}>Membres {sel.size > 0 ? `· ${sel.size}` : ''}</div>
          {pool.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '10px 0' }}>Personne à ajouter pour l’instant.</div> : pool.map(p => {
            const on = sel.has(p.id)
            return (
              <button key={p.id} onClick={() => toggle(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                <Avatar url={p.avatar} name={p.name} size={34} />
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{p.name}</span>
                <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: on ? 'var(--primary)' : 'transparent', border: on ? 'none' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                </span>
              </button>
            )
          })}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Annuler</button>
          <button onClick={() => void create()} disabled={busy || !name.trim()} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: name.trim() && !busy ? 'var(--primary)' : 'var(--bg-card2)', color: name.trim() && !busy ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: name.trim() && !busy ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>Créer</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function GroupChat({ group, onChanged, onClosed }: { group: GroupSummary; onChanged: () => void; onClosed: () => void }) {
  const [msgs, setMsgs] = useState<GroupMessage[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [panel, setPanel] = useState(false)
  const isAdmin = group.myRole === 'admin'
  const endRef = useRef<HTMLDivElement>(null)

  const loadMsgs = useCallback(async () => { setMsgs(await getGroupMessages(group.id)) }, [group.id])
  useEffect(() => { void getCurrentUser().then(u => setMe(u?.id ?? null)) }, [])
  useEffect(() => { void loadMsgs(); void listMembers(group.id).then(setMembers) }, [group.id, loadMsgs])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  // Rafraîchissement doux (les messages des autres membres).
  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel(`grp-${group.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_group_messages', filter: `group_id=eq.${group.id}` }, () => void loadMsgs()).subscribe()
    return () => { void sb.removeChannel(ch) }
  }, [group.id, loadMsgs])

  async function send() {
    const body = input.trim(); if (!body) return
    setInput('')
    const ok = await sendGroupMessage(group.id, body)
    if (ok) void loadMsgs()
  }

  const headStyle: React.CSSProperties = { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      <div style={headStyle}>
        <button onClick={onClosed} aria-label="Retour" style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={{ width: 34, height: 34, borderRadius: 11, background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{members.length} membre{members.length > 1 ? 's' : ''}{isAdmin ? ' · tu es admin' : ''}</div>
        </div>
        <button onClick={() => setPanel(true)} aria-label="Membres" style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </button>
      </div>

      {/* Fil */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.length === 0 && <div style={{ margin: 'auto', color: 'var(--text-dim)', fontSize: 13 }}>Démarrez la conversation du groupe.</div>}
        {msgs.map((m, i) => {
          const mine = m.senderId === me
          const showName = !mine && (i === 0 || msgs[i - 1].senderId !== m.senderId)
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {showName && <span style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 3px 4px', fontWeight: 600 }}>{m.senderName}</span>}
              <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: 14, background: mine ? 'var(--primary)' : 'var(--bg-card2)', color: mine ? 'var(--on-primary)' : 'var(--text)', fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {m.body}
                <span style={{ display: 'block', fontSize: 9.5, opacity: 0.6, marginTop: 3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtT(m.createdAt)}</span>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          placeholder="Message au groupe…" style={{ flex: 1, padding: '10px 13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-body)' }} />
        <button onClick={() => void send()} disabled={!input.trim()} style={{ width: 40, borderRadius: 12, border: 'none', background: input.trim() ? 'var(--primary)' : 'var(--bg-card2)', color: input.trim() ? 'var(--on-primary)' : 'var(--text-dim)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        </button>
      </div>

      {panel && <MembersPanel group={group} members={members} isAdmin={isAdmin} me={me}
        onClose={() => setPanel(false)}
        onRefresh={async () => { setMembers(await listMembers(group.id)); onChanged() }}
        onLeftOrDeleted={() => { setPanel(false); onClosed(); onChanged() }} />}
    </div>
  )
}

function MembersPanel({ group, members, isAdmin, me, onClose, onRefresh, onLeftOrDeleted }: {
  group: GroupSummary; members: GroupMember[]; isAdmin: boolean; me: string | null
  onClose: () => void; onRefresh: () => Promise<void> | void; onLeftOrDeleted: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [pool, setPool] = useState<Addable[]>([])
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)
  const memberIds = new Set(members.map(m => m.userId))

  useEffect(() => { if (adding) void getAddablePeople().then(p => setPool(p.filter(x => !memberIds.has(x.id)))) }, [adding]) // eslint-disable-line react-hooks/exhaustive-deps

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'thwDDin 0.18s ease' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Membres du groupe</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
        {isAdmin && (
          <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            {renaming ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={name} onChange={e => setName(e.target.value)} autoFocus style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-body)' }} />
                <button onClick={async () => { await renameGroup(group.id, name); setRenaming(false); await onRefresh() }} style={{ padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>OK</button>
              </div>
            ) : (
              <button onClick={() => { setName(group.name); setRenaming(true) }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                Renommer le groupe
              </button>
            )}
          </div>
        )}

        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '14px 0 2px' }}>{members.length} membre{members.length > 1 ? 's' : ''}</div>
        {members.map(m => (
          <div key={m.userId} style={row}>
            <Avatar url={m.avatar} name={m.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{m.name}{m.userId === me ? ' (toi)' : ''}</div>
              {m.role === 'admin' && <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>Admin</div>}
            </div>
            {isAdmin && m.userId !== me && (
              <button onClick={async () => { await removeMember(group.id, m.userId); await onRefresh() }} aria-label="Retirer" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--bg-card2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ))}

        {isAdmin && (
          adding ? (
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 4px' }}>Ajouter</div>
              {pool.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '8px 0' }}>Personne à ajouter.</div> : pool.map(p => (
                <div key={p.id} style={row}>
                  <Avatar url={p.avatar} name={p.name} size={30} />
                  <div style={{ flex: 1, fontSize: 13.5, color: 'var(--text)' }}>{p.name}</div>
                  <button onClick={async () => { await addMembers(group.id, [p.id]); setPool(pl => pl.filter(x => x.id !== p.id)); await onRefresh() }} style={{ padding: '6px 12px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Ajouter</button>
                </div>
              ))}
              <button onClick={() => setAdding(false)} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12.5, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>Terminé</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Ajouter des membres
            </button>
          )
        )}

        <div style={{ marginTop: 22, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={async () => { await leaveGroup(group.id); onLeftOrDeleted() }} style={{ textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0', fontFamily: 'var(--font-body)' }}>Quitter le groupe</button>
          {isAdmin && <button onClick={async () => { if (confirm('Supprimer ce groupe pour tout le monde ?')) { await deleteGroup(group.id); onLeftOrDeleted() } }} style={{ textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0', fontFamily: 'var(--font-body)' }}>Supprimer le groupe</button>}
        </div>
      </div>
    </div>
  )
}
