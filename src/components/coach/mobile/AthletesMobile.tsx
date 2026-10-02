'use client'
// ══════════════════════════════════════════════════════════════════
// ATHLÈTES — version MOBILE (maquette k2). Recherche pilule, puces de
// filtre avec compteurs, « à suivre en priorité » (cartes défilantes + IA),
// liste groupée (avatar + point de statut, sports, charge 7 j, dernière
// activité), glisser une ligne → Message / Gérer, mode sélection multiple
// (barre d'actions groupées), feuilles : gérer, trier/grouper, inviter
// (code en cellules + partage), rejoindre un coach.
// Tous les états et gestionnaires viennent de la page (aucune logique dupliquée).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { setAthleteGroup, setAthleteNote, type RosterAthlete, type Forme } from '@/lib/coach/roster'
import type { CoachAthleteLink } from '@/lib/coach/relationships'
import { InviteCodeReveal } from '@/components/coach/CodeCells'
import {
  MPage, MTitle, Rise, CCard, CardHead, MAvatar, Tag, RowText, SwipeRow, SearchM, ChipsM, SheetM, CTA, MiniPill, EmptyM, SkelRows,
  RoundBtn, Ico, ICON, NUM, STATUS_COLOR, CARD_BG, SOFT_SHADOW, GroupM, Label, EASE, SPRING, useTT,
} from './CoachKit'

type Sort = 'alert' | 'name' | 'recent' | 'load'
export interface AthletesMobileProps {
  roster: RosterAthlete[]; loading: boolean; pending: CoachAthleteLink[]; coaches: { linkId: string; coachId: string; since: string | null }[]
  q: string; setQ: (v: string) => void
  filter: 'all' | Forme; setFilter: (v: 'all' | Forme) => void
  group: string; setGroup: (v: string) => void; groups: string[]
  sort: Sort; setSort: (v: Sort) => void
  visible: RosterAthlete[]; priority: RosterAthlete[]
  kpis: { total: number; active: number; alert: number }
  sel: Set<string>; toggleSel: (id: string) => void; clearSel: () => void
  manage: RosterAthlete | null; setManage: (a: RosterAthlete | null) => void
  newCode: string | null; acceptCode: string; setAcceptCode: (v: string) => void; acceptMsg: string | null; busy: boolean
  onInvite: () => void; onAccept: () => void; onRevoke: (linkId: string) => void; bulkGroup: (name: string) => void
  reload: () => Promise<void>; launchSystem: () => void
}

export default function AthletesMobile(p: AthletesMobileProps) {
  const { t } = useI18n()
  const router = useRouter()
  const tt = useTT()
  const reduce = useReducedMotion()
  const [selecting, setSelecting] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [groupSheet, setGroupSheet] = useState(false)
  const [groupName, setGroupName] = useState('')

  // Arrivée depuis le dashboard (« Gérer » les invitations) → feuille Inviter.
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).get('invite') === '1') setInviteOpen(true) } catch { /* */ }
  }, [])

  const lastSeen = (days: number) => !Number.isFinite(days) ? tt('co.never_active', 'Aucune activité') : days <= 0 ? tt('co.today', 'Aujourd’hui') : days === 1 ? tt('co.yesterday', 'Hier') : tt('co.days_ago', 'Il y a {n} j', { n: days })
  const count = (f: Forme) => p.roster.filter(a => a.status === f).length
  const FILTERS: { v: 'all' | Forme; l: string; count: number; dot?: string }[] = [
    { v: 'all', l: t('w1h.filter_all'), count: p.roster.length },
    { v: 'ok', l: t('w1h.filter_ok'), count: count('ok'), dot: STATUS_COLOR.ok },
    { v: 'warn', l: t('w1h.filter_warn'), count: count('warn'), dot: STATUS_COLOR.warn },
    { v: 'injured', l: t('w1h.filter_injured'), count: count('injured'), dot: STATUS_COLOR.injured },
    { v: 'inactive', l: t('w1h.filter_inactive'), count: count('inactive'), dot: STATUS_COLOR.inactive },
  ]
  const SORTS: { v: Sort; l: string }[] = [
    { v: 'alert', l: t('w1h.sort_priority') }, { v: 'name', l: t('w1h.sort_name') }, { v: 'recent', l: t('w1h.sort_recent') }, { v: 'load', l: t('w1h.sort_load') },
  ]
  const exitSelect = () => { setSelecting(false); p.clearSel() }

  const shareCode = async (code: string) => {
    const text = tt('co.invite_share_text', 'Rejoins mon équipe sur THW Coaching avec le code {code}', { code })
    try {
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ text }); return }
      await navigator.clipboard?.writeText(text)
    } catch { /* partage annulé */ }
  }

  const statusSub = (a: RosterAthlete) => {
    const sports = a.sports.slice(0, 2).join(' · ')
    const st = a.status === 'ok' ? t('w3d.forme_ok') : (a.reason || t(`w3d.forme_${a.status}`))
    return [sports, a.group, st].filter(Boolean).join(' · ')
  }

  return (
    <MPage>
      <MTitle
        title={t('w1h.athletes_title')}
        sub={p.loading ? ' ' : <span style={NUM}>{tt('co.roster_summary', '{total} athlètes · {active} actifs 7 j · {alert} en alerte', { total: p.kpis.total, active: p.kpis.active, alert: p.kpis.alert })}</span>}
        right={<>
          {p.roster.length > 0 && (
            <RoundBtn label={selecting ? t('w1h.cancel') : tt('co.select', 'Sélectionner')} onClick={() => selecting ? exitSelect() : setSelecting(true)}>
              <Ico d={selecting ? ICON.close : <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 5-5.5" /></>} size={21} sw={2.1} />
            </RoundBtn>
          )}
          <RoundBtn label={t('w1h.invite_athlete')} onClick={() => setInviteOpen(true)}><Ico d={ICON.plus} size={22} sw={2.2} /></RoundBtn>
        </>}
      />

      {/* Recherche + filtres */}
      <Rise i={1}>
        <div data-guide="roster-search"><SearchM value={p.q} onChange={p.setQ} placeholder={t('w1h.ph_search_athlete')} /></div>
      </Rise>
      <Rise i={2} style={{ marginTop: 12 }}>
        <ChipsM options={FILTERS} value={p.filter} onChange={p.setFilter} />
      </Rise>
      <Rise i={3} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <MiniPill onClick={() => setSortOpen(true)}>
          <Ico d={<path d="M3 6h18M6 12h12M10 18h4" />} size={16} />
          {SORTS.find(s => s.v === p.sort)?.l}
        </MiniPill>
        {p.groups.length > 0 && (
          <MiniPill onClick={() => setSortOpen(true)}>
            <Ico d={ICON.folder} size={16} />
            {p.group === '__all' ? t('w1h.all_groups') : p.group}
          </MiniPill>
        )}
      </Rise>

      {p.loading ? (
        <Rise i={4} style={{ marginTop: 16 }}><CCard><SkelRows n={5} /></CCard></Rise>
      ) : p.roster.length === 0 ? (
        <Rise i={4} style={{ marginTop: 16 }}>
          <CCard>
            <EmptyM icon={<Ico d={ICON.users} size={26} />} title={t('w1h.invite_first')} hint={t('w1h.empty_roster')}
              action={<CTA onClick={() => { setInviteOpen(true); if (!p.newCode) p.onInvite() }} disabled={p.busy}>{t('w1h.generate_invite_code')}</CTA>} />
          </CCard>
        </Rise>
      ) : (
        <>
          {/* À suivre en priorité — cartes défilantes (synthèse IA) */}
          {p.priority.length > 0 && p.filter === 'all' && !p.q && (
            <Rise i={4}>
              <Label right={<span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{p.priority.length}</span>}>{t('w1h.priority_follow')}</Label>
              <div className="cm-scroll-x" data-hswipe style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -16px', padding: '2px 16px 6px', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16 }}>
                {p.priority.map(a => (
                  <Link key={a.id} href={`/coach/athlete?id=${a.id}`} className="cm-press"
                    style={{ flex: '0 0 272px', scrollSnapAlign: 'start', background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, padding: 16, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <MAvatar name={a.name} url={a.avatar} status={a.status} size={44} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      <Tag color={STATUS_COLOR[a.status]}>{t(`w3d.forme_${a.status}`)}</Tag>
                    </span>
                    <span style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.insight?.headline ?? a.reason}</span>
                    {a.insight?.action && (
                      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, color: 'var(--text)', lineHeight: 1.4 }}>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--primary)', background: 'var(--primary-dim)', borderRadius: 'var(--r-pill)', padding: '3px 8px' }}>IA</span>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.insight.action}</span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </Rise>
          )}

          {/* Roster */}
          <Rise i={5}>
            <Label right={<span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{p.visible.length}</span>}>{t('w1h.all_roster')}</Label>
            <GroupM style={{ padding: '0 16px' }}>
              {p.visible.length === 0 ? (
                <EmptyM title={tt('co.no_match', 'Aucun athlète ne correspond')} hint={tt('co.no_match_hint', 'Change le filtre ou la recherche.')} />
              ) : (
                <AnimatePresence initial={false}>
                  {p.visible.map((a, i) => {
                    const on = p.sel.has(a.id)
                    const body: ReactNode = (
                      <>
                        {selecting && (
                          <motion.span initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING}
                            style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--border-mid)', color: 'var(--on-primary)' }}>
                            {on && <Ico d={<path d="M20 6 9 17l-5-5" />} size={15} sw={3} />}
                          </motion.span>
                        )}
                        <MAvatar name={a.name} url={a.avatar} status={a.status} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{a.name}</span>
                            {a.unread > 0 && <span style={{ ...NUM, flexShrink: 0, minWidth: 20, height: 20, padding: '0 6px', boxSizing: 'border-box', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{a.unread}</span>}
                          </span>
                          <span style={{ display: 'block', fontSize: 15, color: 'var(--text-mid)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusSub(a) || '—'}</span>
                        </span>
                        <span style={{ flexShrink: 0, textAlign: 'right' }}>
                          <span style={{ ...NUM, display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{Math.round(a.tss7)} TSS</span>
                          <span style={{ display: 'block', fontSize: 14, color: 'var(--text-dim)', marginTop: 3 }}>{lastSeen(a.lastDays)}</span>
                        </span>
                      </>
                    )
                    const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, minHeight: 72, padding: '12px 0', textDecoration: 'none', color: 'inherit', width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', textAlign: 'left', fontFamily: 'var(--font-body)', cursor: 'pointer' }
                    return (
                      <motion.div key={a.id} layout={reduce ? false : 'position'}
                        initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE, delay: Math.min(i, 10) * 0.035 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                        {selecting ? (
                          <div style={{ position: 'relative' }}>
                            {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--border)' }} />}
                            <button type="button" onClick={() => p.toggleSel(a.id)} aria-pressed={on} aria-label={t('w1h.aria_select')} className="cm-press" style={rowStyle}>{body}</button>
                          </div>
                        ) : (
                          <SwipeRow first={i === 0} actions={[
                            { label: tt('co.message', 'Message'), tone: 'primary', icon: <Ico d={ICON.chat} size={19} />, onClick: () => router.push(`/coach/messages?thread=${a.id}`) },
                            { label: t('w3d.manage'), tone: 'neutral', icon: <Ico d={ICON.more} size={19} />, onClick: () => p.setManage(a) },
                          ]}>
                            <Link data-guide="roster-row" href={`/coach/athlete?id=${a.id}`} className="cm-press" style={rowStyle}>{body}</Link>
                          </SwipeRow>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </GroupM>
            {!selecting && p.visible.length > 0 && <p style={{ margin: '10px 4px 0', fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>{tt('co.swipe_hint', 'Glisse une ligne vers la gauche pour écrire ou gérer.')}</p>}
          </Rise>

          <Rise i={6} style={{ marginTop: 18 }}>
            <div data-guide="roster-invite"><CTA onClick={() => setInviteOpen(true)}><Ico d={ICON.plus} size={20} sw={2.4} />{t('w1h.invite_athlete')}</CTA></div>
          </Rise>
        </>
      )}

      {/* ── Barre d'actions groupées ── */}
      <AnimatePresence>
        {p.sel.size > 0 && (
          <motion.div initial={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }} transition={SPRING}
            style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom) + 84px)', zIndex: 90, background: 'var(--text)', color: 'var(--bg)', borderRadius: 'var(--r-pill)', padding: 6, display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-float)', fontFamily: 'var(--font-body)' }}>
            <span style={{ ...NUM, flex: 1, minWidth: 0, paddingLeft: 12, fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.sel.size > 1 ? t('w1h.selected_plural', { n: p.sel.size }) : t('w1h.selected_singular', { n: p.sel.size })}</span>
            <button type="button" onClick={p.launchSystem} className="cm-press" style={bulkBtn(true)}>{t('w1h.launch_system')}</button>
            <button type="button" onClick={() => { setGroupName(''); setGroupSheet(true) }} className="cm-press" style={bulkBtn(false)}>{t('w1h.group')}</button>
            <button type="button" onClick={exitSelect} aria-label={t('w1h.cancel')} className="cm-press" style={{ ...bulkBtn(false), width: 40, padding: 0 }}><Ico d={ICON.close} size={18} sw={2.4} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Feuille : trier / grouper ── */}
      <SheetM open={sortOpen} onClose={() => setSortOpen(false)} title={tt('co.sort_title', 'Trier et filtrer')} label={tt('co.sort_title', 'Trier et filtrer')}>
        <Label>{tt('co.sort_by', 'Trier par')}</Label>
        <GroupM>
          {SORTS.map((s, i) => <CheckRow key={s.v} first={i === 0} on={p.sort === s.v} label={s.l} onClick={() => { p.setSort(s.v); setSortOpen(false) }} />)}
        </GroupM>
        {p.groups.length > 0 && (<>
          <Label>{tt('co.group_label', 'Groupe')}</Label>
          <GroupM>
            <CheckRow first on={p.group === '__all'} label={t('w1h.all_groups')} onClick={() => { p.setGroup('__all'); setSortOpen(false) }} />
            {p.groups.map(g => <CheckRow key={g} on={p.group === g} label={g} onClick={() => { p.setGroup(g); setSortOpen(false) }} />)}
          </GroupM>
        </>)}
      </SheetM>

      {/* ── Feuille : grouper la sélection ── */}
      <SheetM open={groupSheet} onClose={() => setGroupSheet(false)} title={t('w1h.group')} label={t('w1h.group')}
        footer={<CTA onClick={() => { setGroupSheet(false); p.bulkGroup(groupName); setSelecting(false) }}>{tt('co.apply', 'Appliquer')}</CTA>}>
        <GroupM style={{ padding: '4px 16px' }}>
          <input list="coach-groups-m" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder={t('w1h.prompt_group_name')} autoFocus className="cm-input"
            style={fieldStyle} />
          <datalist id="coach-groups-m">{p.groups.map(g => <option key={g} value={g} />)}</datalist>
        </GroupM>
        {p.groups.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {p.groups.map(g => <MiniPill key={g} onClick={() => setGroupName(g)}>{g}</MiniPill>)}
          </div>
        )}
      </SheetM>

      {/* ── Feuille : gérer un athlète ── */}
      <SheetM open={!!p.manage} onClose={() => p.setManage(null)} label={t('w1h.aria_manage')}
        footer={<CTA onClick={() => p.setManage(null)}>{t('w1h.done')}</CTA>}>
        {p.manage && (() => {
          const a = p.manage
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 4px 6px' }}>
                <MAvatar name={a.name} url={a.avatar} status={a.status} size={56} ring="var(--surface-page)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ marginTop: 4 }}><Tag color={STATUS_COLOR[a.status]}>{t(`w3d.forme_${a.status}`)}</Tag></div>
                </div>
              </div>
              <Label>{t('w1h.group_label')}</Label>
              <GroupM style={{ padding: '4px 16px' }}>
                <input list="coach-groups" defaultValue={a.group ?? ''} placeholder={t('w1h.ph_group')} className="cm-input"
                  onBlur={async e => { await setAthleteGroup(a.linkId, e.target.value.trim() || null); await p.reload() }} style={fieldStyle} />
                <datalist id="coach-groups">{p.groups.map(g => <option key={g} value={g} />)}</datalist>
              </GroupM>
              <Label>{t('w1h.private_note')}</Label>
              <GroupM style={{ padding: '4px 16px' }}>
                <textarea defaultValue={a.note ?? ''} rows={4} placeholder={t('w1h.ph_private_note')} className="cm-input"
                  onBlur={async e => { await setAthleteNote(a.linkId, e.target.value); await p.reload() }}
                  style={{ ...fieldStyle, resize: 'none', padding: '12px 0', lineHeight: 1.45 }} />
              </GroupM>
              <GroupM style={{ marginTop: 18 }}>
                <Link href={`/coach/athlete?id=${a.id}`} className="cm-press" style={sheetRow(true)}><Ico d={ICON.user} size={20} />{tt('co.open_profile', 'Ouvrir la fiche')}</Link>
                <Link href={`/coach/messages?thread=${a.id}`} className="cm-press" style={sheetRow(false)}><Ico d={ICON.chat} size={20} />{tt('co.message', 'Message')}</Link>
                <button type="button" onClick={() => { const id = a.linkId; p.setManage(null); p.onRevoke(id) }} className="cm-press" style={{ ...sheetRow(false), color: 'var(--danger)' }}><Ico d={ICON.trash} size={20} />{t('w1h.remove_athlete')}</button>
              </GroupM>
            </>
          )
        })()}
      </SheetM>

      {/* ── Feuille : inviter / rejoindre ── */}
      <SheetM open={inviteOpen} onClose={() => setInviteOpen(false)} title={t('w1h.invite_athlete')} label={t('w1h.invite_athlete')}>
        <p style={{ margin: '0 4px 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45, textAlign: 'center' }}>{t('w1h.invite_athlete_desc')}</p>
        <CTA onClick={p.onInvite} disabled={p.busy}><Ico d={ICON.plus} size={20} sw={2.4} />{t('w1h.generate_invite_code')}</CTA>
        <AnimatePresence>
          {p.newCode && (
            <motion.div key={p.newCode} initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>
              <CCard style={{ marginTop: 14 }}>
                <InviteCodeReveal code={p.newCode} />
                <div style={{ marginTop: 12 }}><CTA variant="soft" onClick={() => void shareCode(p.newCode as string)}><Ico d={<><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 6-4-4-4 4M12 2v13" /></>} size={19} />{tt('co.share_invite', 'Partager l’invitation')}</CTA></div>
              </CCard>
            </motion.div>
          )}
        </AnimatePresence>

        {p.pending.length > 0 && (<>
          <Label right={<span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{p.pending.length}</span>}>{t('w1h.awaiting_acceptance')}</Label>
          <GroupM>
            {p.pending.map((inv, i) => (
              <div key={inv.id} style={{ ...sheetRow(i === 0), cursor: 'default' }}>
                <span style={{ ...NUM, flex: 1, fontSize: 17, fontWeight: 800, letterSpacing: '0.08em' }}>{inv.code}</span>
                <MiniPill tone="danger" onClick={() => p.onRevoke(inv.id)}>{t('w1h.cancel')}</MiniPill>
              </div>
            ))}
          </GroupM>
        </>)}

        <Label>{t('w1h.coach_invited_you')}</Label>
        <GroupM style={{ padding: '14px 16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.45 }}>{t('w1h.coach_invited_desc')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={p.acceptCode} onChange={e => p.setAcceptCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') p.onAccept() }} placeholder={t('w1h.ph_code')} className="cm-input"
              style={{ flex: 1, minWidth: 0, minHeight: 48, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--surface-chip)', color: 'var(--text)', fontSize: 17, fontFamily: 'var(--font-body)', letterSpacing: '0.08em', outline: 'none' }} />
            <MiniPill tone="primary" onClick={p.onAccept} disabled={p.busy || !p.acceptCode.trim()}>{t('w1h.accept')}</MiniPill>
          </div>
          {p.acceptMsg && <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>{p.acceptMsg}</p>}
        </GroupM>
        {p.coaches.length > 0 && (
          <GroupM style={{ marginTop: 12 }}>
            {p.coaches.map((c, i) => (
              <div key={c.linkId} style={{ ...sheetRow(i === 0), cursor: 'default' }}>
                <span style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{t('w1h.linked_coach')}</span>
                <MiniPill tone="danger" onClick={() => p.onRevoke(c.linkId)}>{t('w1h.revoke')}</MiniPill>
              </div>
            ))}
          </GroupM>
        )}
      </SheetM>
    </MPage>
  )
}

function CheckRow({ label, on, onClick, first }: { label: string; on: boolean; onClick: () => void; first?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="cm-press" style={{ ...sheetRow(!!first), cursor: 'pointer' }}>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      <span style={{ color: 'var(--primary)', display: 'flex', width: 22 }}>{on && <Ico d={<path d="M20 6 9 17l-5-5" />} size={22} sw={2.6} />}</span>
    </button>
  )
}

const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 48, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 17, fontFamily: 'var(--font-body)', padding: 0 }
function sheetRow(first: boolean): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', minHeight: 56, padding: '10px 0', border: 'none', borderTop: first ? 'none' : '1px solid var(--border)', background: 'transparent', textDecoration: 'none', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 600, textAlign: 'left' }
}
function bulkBtn(primary: boolean): React.CSSProperties {
  return { flexShrink: 0, height: 40, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: primary ? 'var(--primary)' : 'color-mix(in srgb, var(--bg) 16%, transparent)', color: primary ? 'var(--on-primary)' : 'var(--bg)' }
}
