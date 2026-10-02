'use client'
// ══════════════════════════════════════════════════════════════════
// Tiroir IA — MOBILE (≤ 767 px), façon Claude iOS.
// Posé SOUS la colonne chat (underlay) : la colonne coulisse vers la droite
// (cf. AIPanel) et découvre ce tiroir pleine hauteur.
//   · en-tête « Hybrid » (Fraunces) + recherche des conversations ;
//   · navigation : Routines, Studio, Projets (dépliable), Agents (dépliable) ;
//   · Épinglées, Récents (limités) → « Toutes les conversations › »
//     (liste complète groupée Aujourd'hui / 7 derniers jours / Plus ancien) ;
//   · bas : avatar (profil / réglages) + pilule « Nouvelle conversation ».
// Appui long (~450 ms) sur une conversation → DrawerConvMenu.
// Couleurs : tokens --aid-* (clair / sombre) déclarés ci-dessous.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Clock, LayoutGrid, Folder, Users, Pin, MessageCircle, Search, Plus, ChevronRight, ChevronLeft, Pencil, Lock, Zap, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import type { AIProject } from '@/lib/ai/projects-sync'
import { AnimatedList, AnimatedItem } from '@/components/motion/AnimatedList'
import { DrawerConvMenu, type DrawerConv, type LpRect } from './DrawerConvMenu'

export type { DrawerConv } from './DrawerConvMenu'
export type DrawerAgent = 'training' | 'networks' | 'coach'

const RECENT_LIMIT = 8
const LONG_PRESS_MS = 450

// Tokens du tiroir (le design system n'a pas de surface « tiroir chaud » :
// valeurs validées sur maquette, déclarées une seule fois ici).
const CSS = `
:root {
  --aid-bg: #F5F4EF; /* design-allow-color */
  --aid-text: #1A1A18; /* design-allow-color */
  --aid-mid: rgba(26,26,24,0.55); /* design-allow-color */
  --aid-sel: #E8E6E0; /* design-allow-color */
  --aid-press: rgba(26,26,24,0.06); /* design-allow-color */
  --aid-pill-bg: #2B2B28; /* design-allow-color */
  --aid-pill-text: #FFFFFF; /* design-allow-color */
  --aid-av-bg: #FFFFFF; /* design-allow-color */
  --aid-av-shadow: 0 2px 10px rgba(0,0,0,0.08); /* design-allow-color */
  --aid-dot: #3B82F6; /* design-allow-color */
  --aid-menu-bg: rgba(250,250,248,0.92); /* design-allow-color */
  --aid-menu-sep: rgba(20,20,20,0.10); /* design-allow-color */
  --aid-menu-shadow: 0 18px 50px rgba(0,0,0,0.22); /* design-allow-color */
  --aid-lift-bg: #F5F4EF; /* design-allow-color */
  --aid-lift-shadow: 0 10px 40px rgba(0,0,0,0.22); /* design-allow-color */
  --aid-scrim: rgba(245,244,239,0.35); /* design-allow-color */
  --aid-main-edge: rgba(0,0,0,0.06); /* design-allow-color */
  --aid-main-shadow: rgba(0,0,0,0.07); /* design-allow-color */
  --aid-veil: rgba(255,255,255,0.12); /* design-allow-color */
}
html.dark {
  --aid-bg: #111111; /* design-allow-color */
  --aid-text: #FFFFFF; /* design-allow-color */
  --aid-mid: rgba(255,255,255,0.55); /* design-allow-color */
  --aid-sel: rgba(255,255,255,0.14); /* design-allow-color */
  --aid-press: rgba(255,255,255,0.08); /* design-allow-color */
  --aid-pill-bg: #EDEDED; /* design-allow-color */
  --aid-pill-text: #111111; /* design-allow-color */
  --aid-av-bg: #262626; /* design-allow-color */
  --aid-av-shadow: 0 2px 10px rgba(0,0,0,0.35); /* design-allow-color */
  --aid-menu-bg: rgba(44,44,46,0.92); /* design-allow-color */
  --aid-menu-sep: rgba(255,255,255,0.12); /* design-allow-color */
  --aid-menu-shadow: 0 18px 50px rgba(0,0,0,0.5); /* design-allow-color */
  --aid-lift-bg: #1C1C1E; /* design-allow-color */
  --aid-lift-shadow: 0 10px 40px rgba(0,0,0,0.6); /* design-allow-color */
  --aid-scrim: rgba(0,0,0,0.35); /* design-allow-color */
  --aid-main-edge: rgba(255,255,255,0.08); /* design-allow-color */
  --aid-main-shadow: rgba(0,0,0,0.4); /* design-allow-color */
  --aid-veil: rgba(0,0,0,0.45); /* design-allow-color */
}
@media (max-width: 767px) {
  /* Tiroir ouvert : la bande de la barre d'état prend la couleur du tiroir
     (la colonne chat poussée devient une carte aux coins arrondis). */
  .aip-root:has(.aid-drawer[data-open="true"]) { background: var(--aid-bg); }
}
.aid-drawer {
  position: absolute; top: 0; left: 0; bottom: 0; z-index: 1;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--aid-bg); color: var(--aid-text); font-family: var(--font-body);
}
.aid-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding-bottom: 12px; }
.aid-scroll::-webkit-scrollbar { display: none; }
.aid-btn { appearance: none; border: none; background: transparent; color: inherit; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.aid-press:active, .aid-mi:active { background: var(--aid-press); }
.aid-row { -webkit-tap-highlight-color: transparent; }
.aid-row:active:not([data-selected="true"]) { background: var(--aid-press); }
.aid-pulse { animation: aid_pulse 1.4s ease-in-out infinite; }
@keyframes aid_pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.aid-veil { animation: aid_fade 0.25s ease both; }
@keyframes aid_fade { from { opacity: 0; } to { opacity: 1; } }
.aid-lp-scrim {
  position: fixed; inset: 0; background: var(--aid-scrim); touch-action: none;
  -webkit-backdrop-filter: blur(10px) saturate(1.1); backdrop-filter: blur(10px) saturate(1.1);
  animation: aid_fade 0.2s ease both;
}
.aid-menu {
  background: var(--aid-menu-bg); border-radius: 30px; box-shadow: var(--aid-menu-shadow);
  -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6);
}
@media (prefers-reduced-motion: reduce) {
  .aid-pulse, .aid-veil, .aid-lp-scrim { animation: none; }
}
`

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// ── Ligne de conversation (tap = ouvrir, appui long = menu) ─────────────
function ConvRow<C extends DrawerConv>({
  conv, pinnedIcon, selected, generating, unread, renaming, renVal, onRenVal, onRenCommit, onRenCancel, onTap, onLongPress,
}: {
  conv: C
  pinnedIcon: boolean
  selected: boolean
  generating: boolean
  unread: boolean
  renaming: boolean
  renVal: string
  onRenVal: (v: string) => void
  onRenCommit: () => void
  onRenCancel: () => void
  onTap: () => void
  onLongPress: (rect: LpRect) => void
}) {
  const { t } = useI18n()
  const elRef = useRef<HTMLDivElement>(null)
  const tapRef = useRef<{ x: number; y: number; moved: boolean; long: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  useEffect(() => clear, [])

  const fireLong = () => {
    const b = elRef.current?.getBoundingClientRect()
    if (b) onLongPress({ top: b.top, left: b.left, width: b.width, height: b.height })
  }

  const icon = pinnedIcon
    ? <Pin size={22} strokeWidth={1.8} style={{ flexShrink: 0 }} />
    : <MessageCircle size={22} strokeWidth={1.8} style={{ flexShrink: 0 }} />

  if (renaming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 48, padding: '0 18px', margin: '0 10px' }}>
        {icon}
        <input
          autoFocus
          value={renVal}
          onChange={e => onRenVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onRenCommit() }
            if (e.key === 'Escape') onRenCancel()
          }}
          onBlur={onRenCommit}
          aria-label={t('record.commonRename')}
          style={{
            flex: 1, minWidth: 0, height: 40, padding: '0 12px', boxSizing: 'border-box',
            borderRadius: 'var(--r-md)', border: '1px solid var(--primary)', outline: 'none',
            background: 'var(--aid-sel)', color: 'var(--aid-text)',
            fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 600,
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={elRef}
      role="button"
      tabIndex={0}
      className="aid-row"
      data-selected={selected ? 'true' : undefined}
      aria-current={selected ? 'true' : undefined}
      onClick={onTap}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}
      onContextMenu={e => {
        e.preventDefault()
        if (tapRef.current) return // appui tactile en cours : géré par le minuteur
        fireLong()
      }}
      onTouchStart={e => {
        const p = e.touches[0]
        tapRef.current = { x: p.clientX, y: p.clientY, moved: false, long: false }
        clear()
        timer.current = setTimeout(() => {
          const r = tapRef.current
          if (r && !r.moved) { r.long = true; haptic('medium'); fireLong() }
        }, LONG_PRESS_MS)
      }}
      onTouchMove={e => {
        const r = tapRef.current
        if (!r) return
        const p = e.touches[0]
        if (Math.abs(p.clientX - r.x) > 10 || Math.abs(p.clientY - r.y) > 10) { r.moved = true; clear() }
      }}
      onTouchEnd={e => {
        clear()
        const r = tapRef.current
        tapRef.current = null
        if (!r || r.moved) return
        e.preventDefault() // coupe le « ghost click » iOS (et le clic après un appui long)
        if (r.long) return
        onTap()
      }}
      onTouchCancel={() => { clear(); tapRef.current = null }}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, minHeight: 48, padding: '0 18px', margin: '0 10px',
        borderRadius: 'var(--r-lg)', cursor: 'pointer', touchAction: 'pan-y',
        background: selected ? 'var(--aid-sel)' : 'transparent', transition: 'background 0.12s',
      }}
    >
      {icon}
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
        {conv.title}
      </span>
      {generating ? (
        <span className="aid-pulse" aria-label={t('aip.thinking')} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--aid-mid)', flexShrink: 0 }} />
      ) : unread ? (
        <span aria-label={t('aip.responseDone')} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--aid-dot)', flexShrink: 0 }} />
      ) : null}
    </div>
  )
}

// ── Ligne de navigation (icône · libellé 20 px · méta à droite) ─────────
function NavRow({ icon, label, meta, onClick, expanded }: { icon: ReactNode; label: string; meta?: ReactNode; onClick: () => void; expanded?: boolean }) {
  return (
    <button
      type="button"
      className="aid-btn aid-press"
      onClick={onClick}
      aria-expanded={expanded}
      style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', minHeight: 52, padding: '0 24px', textAlign: 'left', color: 'var(--aid-text)' }}
    >
      <span style={{ display: 'flex', flexShrink: 0, opacity: 0.9 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
      {meta != null && (
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--aid-mid)', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0", flexShrink: 0 }}>{meta}</span>
      )}
    </button>
  )
}

const sectionStyle: CSSProperties = { fontSize: 16, fontWeight: 500, color: 'var(--aid-mid)', padding: '20px 28px 8px' }
const subRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 44, padding: '0 12px',
  borderRadius: 'var(--r-md)', textAlign: 'left', color: 'var(--aid-text)', fontSize: 17, fontWeight: 500,
}

export interface MobileHistoryDrawerProps<C extends DrawerConv> {
  open: boolean
  width: number
  convs: C[]
  activeId: string | null
  generatingConvs: Set<string>
  unreadDone: Set<string>
  projects: AIProject[]
  activeProjectId: string | null
  onSelectProject: (id: string | null) => void
  onEditProject: (p: AIProject) => void
  onNewProject: () => void
  onMoveConvToProject: (convId: string, projectId: string | null) => void
  onOpenRoutines: () => void
  onOpenStudio: () => void
  onSelect: (c: C) => void
  onRename: (c: C, title: string) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
  onNew: () => void
  onClose: () => void
  onOpenProfile: () => void
  avatarUrl: string | null
  initials: string
  activeAgent: DrawerAgent
  onAgentChange: (a: DrawerAgent) => void
  coachAccess: boolean
}

export function MobileHistoryDrawer<C extends DrawerConv>(props: MobileHistoryDrawerProps<C>) {
  const {
    open, width, convs, activeId, generatingConvs, unreadDone, projects, activeProjectId,
    onSelectProject, onEditProject, onNewProject, onMoveConvToProject, onOpenRoutines, onOpenStudio,
    onSelect, onRename, onDelete, onPin, onNew, onClose, onOpenProfile, avatarUrl, initials,
    activeAgent, onAgentChange, coachAccess,
  } = props
  const { t } = useI18n()
  const [view, setView] = useState<'main' | 'all'>('main')
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [projOpen, setProjOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [renId, setRenId] = useState<string | null>(null)
  const [renVal, setRenVal] = useState('')
  const [lp, setLp] = useState<{ conv: C; rect: LpRect; pinnedRow: boolean } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)

  // Tiroir refermé → on repart d'un état propre.
  useEffect(() => {
    if (open) return
    setView('main'); setSearchOpen(false); setQ(''); setLp(null); setRenId(null)
  }, [open])

  useEffect(() => { if (searchOpen) searchRef.current?.focus() }, [searchOpen])

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null
  const scoped = convs.filter(c => (activeProjectId ? c.projectId === activeProjectId : !c.projectId))
  const byDate = [...scoped].sort((a, b) => b.updatedAt - a.updatedAt)
  const pinned = byDate.filter(c => c.isPinned)
  const recents = byDate.filter(c => !c.isPinned)
  const recentShown = recents.slice(0, RECENT_LIMIT)
  const hasMore = recents.length > RECENT_LIMIT
  const query = norm(q.trim())
  const results = query ? [...convs].sort((a, b) => b.updatedAt - a.updatedAt).filter(c => norm(c.title).includes(query)) : []

  const select = (c: C) => { haptic('light'); onSelect(c); onClose() }
  const startRename = (c: C) => { setRenId(c.id); setRenVal(c.title) }
  const commitRename = (c: C) => {
    const v = renVal.trim()
    setRenId(null)
    if (v && v !== c.title) onRename(c, v)
  }

  const row = (c: C, pinnedIcon: boolean, index: number) => (
    <AnimatedItem key={c.id} index={index}>
      <ConvRow
        conv={c}
        pinnedIcon={pinnedIcon}
        selected={c.id === activeId}
        generating={generatingConvs.has(c.id)}
        unread={unreadDone.has(c.id)}
        renaming={renId === c.id}
        renVal={renVal}
        onRenVal={setRenVal}
        onRenCommit={() => commitRename(c)}
        onRenCancel={() => setRenId(null)}
        onTap={() => select(c)}
        onLongPress={rect => setLp({ conv: c, rect, pinnedRow: pinnedIcon })}
      />
    </AnimatedItem>
  )

  const agentLabel = activeAgent === 'coach' ? t('w1a.navCoach') : t('w1a.navAthlete')
  const ic = { size: 24, strokeWidth: 1.8 }

  // ── Vue « Toutes les conversations » (groupée par date) ──
  const allView = () => {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
    const t0 = startToday.getTime()
    const t7 = t0 - 6 * 86_400_000
    const groups: { key: string; label: string; items: C[] }[] = [
      { key: 'today', label: t('dashboard.today'), items: byDate.filter(c => c.updatedAt >= t0) },
      { key: 'week', label: t('recovery.last7days'), items: byDate.filter(c => c.updatedAt < t0 && c.updatedAt >= t7) },
      { key: 'older', label: t('aid.older'), items: byDate.filter(c => c.updatedAt < t7) },
    ]
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 12px 4px' }}>
          <button type="button" className="aid-btn aid-press" onClick={() => setView('main')} aria-label={t('aip.ui.back')}
            style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={26} strokeWidth={2} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('aid.allConvs')}
          </span>
        </div>
        {groups.filter(g => g.items.length > 0).map(g => (
          <div key={g.key}>
            <div style={sectionStyle}>{g.label}</div>
            <AnimatedList>{g.items.map((c, i) => row(c, !!c.isPinned, i))}</AnimatedList>
          </div>
        ))}
      </>
    )
  }

  // ── Vue principale ──
  const mainView = () => (
    <>
      {/* Navigation */}
      <div style={{ marginTop: 6 }}>
        <NavRow icon={<Clock {...ic} />} label={t('w1a.r_routines')} onClick={() => { haptic('light'); onOpenRoutines() }} />
        <NavRow icon={<LayoutGrid {...ic} />} label={t('w1a.navStudio')} onClick={() => { haptic('light'); onOpenStudio() }} />
        <NavRow icon={<Folder {...ic} />} label={t('ai.projects')} meta={projects.length > 0 ? projects.length : undefined}
          expanded={projOpen} onClick={() => { haptic('light'); setProjOpen(o => !o) }} />
        {projOpen && (
          <div style={{ padding: '0 16px 6px 52px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {projects.map(p => {
              const isActive = p.id === activeProjectId
              const count = convs.filter(c => c.projectId === p.id).length
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button type="button" className="aid-btn aid-press" onClick={() => { haptic('light'); onSelectProject(isActive ? null : p.id) }}
                    style={{ ...subRowStyle, flex: 1, minWidth: 0, background: isActive ? 'var(--aid-sel)' : 'transparent', fontWeight: isActive ? 600 : 500 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {count > 0 && <span style={{ fontSize: 13, color: 'var(--aid-mid)', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }}>{count}</span>}
                  </button>
                  <button type="button" className="aid-btn aid-press" onClick={() => onEditProject(p)} aria-label={t('aid.editProject')}
                    style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aid-mid)', flexShrink: 0 }}>
                    <Pencil size={16} strokeWidth={2} />
                  </button>
                </div>
              )
            })}
            <button type="button" className="aid-btn aid-press" onClick={onNewProject} style={{ ...subRowStyle, color: 'var(--aid-mid)' }}>
              <Plus size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
              {t('aid.newProject')}
            </button>
          </div>
        )}
        <NavRow icon={<Users {...ic} />} label={t('w1a.navAgents')} meta={agentsOpen ? undefined : agentLabel}
          expanded={agentsOpen} onClick={() => { haptic('light'); setAgentsOpen(o => !o) }} />
        {agentsOpen && (
          <div style={{ padding: '0 16px 6px 52px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button type="button" className="aid-btn aid-press" onClick={() => { haptic('light'); onAgentChange('training') }}
              aria-pressed={activeAgent === 'training'}
              style={{ ...subRowStyle, background: activeAgent === 'training' ? 'var(--aid-sel)' : 'transparent', fontWeight: activeAgent === 'training' ? 600 : 500 }}>
              <Zap size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t('w1a.navAthlete')}</span>
            </button>
            <button type="button" className="aid-btn aid-press" onClick={() => { if (coachAccess) { haptic('light'); onAgentChange('coach') } }}
              aria-pressed={activeAgent === 'coach'} aria-disabled={!coachAccess}
              title={coachAccess ? undefined : t('aid.coachLocked')}
              style={{ ...subRowStyle, background: activeAgent === 'coach' ? 'var(--aid-sel)' : 'transparent', fontWeight: activeAgent === 'coach' ? 600 : 500, opacity: coachAccess ? 1 : 0.55, cursor: coachAccess ? 'pointer' : 'not-allowed' }}>
              <Users size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t('w1a.navCoach')}</span>
              {!coachAccess && <Lock size={15} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--aid-mid)' }} />}
            </button>
            {!coachAccess && <div style={{ fontSize: 13, color: 'var(--aid-mid)', padding: '0 12px 4px' }}>{t('aid.coachLocked')}</div>}
          </div>
        )}
      </div>

      {/* Épinglées */}
      {pinned.length > 0 && (
        <>
          <div style={sectionStyle}>{t('aid.pinned')}</div>
          <AnimatedList>{pinned.map((c, i) => row(c, true, i))}</AnimatedList>
        </>
      )}

      {/* Récents — ou en-tête du projet actif */}
      {activeProject ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 12px 4px 16px' }}>
          <button type="button" className="aid-btn aid-press" onClick={() => onSelectProject(null)} aria-label={t('aip.ui.back')}
            style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aid-mid)', flexShrink: 0 }}>
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeProject.color, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject.name}</span>
          <button type="button" className="aid-btn aid-press" onClick={() => onEditProject(activeProject)} aria-label={t('aid.editProject')}
            style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aid-mid)', flexShrink: 0 }}>
            <Pencil size={16} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div style={sectionStyle}>{t('aid.recents')}</div>
      )}
      {scoped.length === 0 ? (
        <div style={{ padding: '4px 28px', fontSize: 15, color: 'var(--aid-mid)', lineHeight: 1.5 }}>{t('aid.empty')}</div>
      ) : (
        <AnimatedList>{recentShown.map((c, i) => row(c, false, i))}</AnimatedList>
      )}
      {hasMore && (
        <button type="button" className="aid-btn aid-press" onClick={() => { haptic('light'); setView('all') }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 48, padding: '0 28px', fontSize: 17, fontWeight: 500, color: 'var(--aid-mid)', borderRadius: 'var(--r-lg)' }}>
          {t('aid.allConvs')}
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}
    </>
  )

  // ── Résultats de recherche ──
  const searchView = () => (
    <>
      <div style={sectionStyle}>{t('aid.results')}</div>
      {results.length === 0
        ? <div style={{ padding: '4px 28px', fontSize: 15, color: 'var(--aid-mid)' }}>{t('w1a.aucunResultat')}</div>
        : <AnimatedList>{results.map((c, i) => row(c, !!c.isPinned, i))}</AnimatedList>}
    </>
  )

  return (
    <div
      className="aid-drawer"
      data-open={open ? 'true' : 'false'}
      style={{ width }}
      onTouchStart={e => { const p = e.touches[0]; swipeRef.current = { x: p.clientX, y: p.clientY } }}
      onTouchEnd={e => {
        const s = swipeRef.current
        swipeRef.current = null
        if (!s || lp) return
        const p = e.changedTouches[0]
        const dx = p.clientX - s.x, dy = p.clientY - s.y
        // Balayage vers la gauche → referme le tiroir (comme Claude).
        if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) onClose()
      }}
    >
      <style>{CSS}</style>

      {/* En-tête : marque + recherche */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 12px 4px 24px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 31, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.15 }}>Hybrid</span>
        <button type="button" className="aid-btn aid-press"
          onClick={() => { haptic('light'); setSearchOpen(o => { if (o) setQ(''); return !o }) }}
          aria-label={searchOpen ? t('aip.ui.close') : t('aid.search')} aria-expanded={searchOpen}
          style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.85 }}>
          {searchOpen ? <X size={22} strokeWidth={2} /> : <Search size={22} strokeWidth={2} />}
        </button>
      </div>
      {searchOpen && (
        <div style={{ padding: '4px 16px 6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px', borderRadius: 'var(--r-pill)', background: 'var(--aid-sel)' }}>
            <Search size={18} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--aid-mid)' }} />
            <input
              ref={searchRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setQ(''); setSearchOpen(false) } }}
              placeholder={t('aid.searchPh')}
              aria-label={t('aid.search')}
              enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--aid-text)', fontFamily: 'var(--font-body)', fontSize: 17 }}
            />
            {q && (
              <button type="button" className="aid-btn" onClick={() => { setQ(''); searchRef.current?.focus() }} aria-label={t('aip.ui.close')}
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aid-mid)', flexShrink: 0 }}>
                <X size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="aid-scroll">
        {query ? searchView() : view === 'all' ? allView() : mainView()}
      </div>

      {/* Bas : avatar + nouvelle conversation */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px calc(14px + env(safe-area-inset-bottom, 0px))' }}>
        <button type="button" className="aid-btn" onClick={() => { haptic('light'); onOpenProfile() }} aria-label={t('aip.accountSettings')}
          style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--aid-av-bg)', boxShadow: 'var(--aid-av-shadow)', color: 'var(--aid-text)',
            fontSize: 19, fontWeight: 700,
          }}>
          {avatarUrl
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (initials || '?')}
        </button>
        <button type="button" className="aid-btn" onClick={onNew}
          style={{
            flex: 1, minWidth: 0, height: 52, borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 8px',
            background: 'var(--aid-pill-bg)', color: 'var(--aid-pill-text)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
            boxShadow: 'var(--aid-av-shadow)',
          }}>
          <Plus size={18} strokeWidth={2.4} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('w1i.new_conversation')}</span>
        </button>
      </div>

      {lp && (
        <DrawerConvMenu
          conv={lp.conv}
          rect={lp.rect}
          pinnedRow={lp.pinnedRow}
          projects={projects}
          onClose={() => setLp(null)}
          onPin={() => { haptic('light'); onPin(lp.conv.id); setLp(null) }}
          onRename={() => { startRename(lp.conv); setLp(null) }}
          onMove={pid => { haptic('light'); onMoveConvToProject(lp.conv.id, pid); setLp(null) }}
          onDelete={() => { haptic('heavy'); onDelete(lp.conv.id); setLp(null) }}
        />
      )}
    </div>
  )
}
