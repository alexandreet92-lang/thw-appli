'use client'
import { useState, useEffect, useRef } from 'react'

type THWModel = 'hermes' | 'athena' | 'zeus'
type SidebarView = 'projects' | 'training' | 'networks'

interface Conv {
  id: string
  title: string
  updatedAt: number
  isPinned?: boolean
}

interface Props {
  convs:         Conv[]
  activeId:      string | null
  model:         THWModel
  onSelect:      (c: Conv) => void
  onDelete:      (id: string) => void
  onNew:         () => void
  onPin:         (id: string) => void
  onModelChange: (m: THWModel) => void
  onClose:       () => void
  persistent?:   boolean
}

function fmt(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)     return 'instant'
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function useUserInitial(): string {
  const [initial, setInitial] = useState('?')
  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined
        const src = meta?.full_name ?? meta?.name ?? user?.email ?? ''
        const ch = (src.trim()[0] ?? '?').toUpperCase()
        if (ch) setInitial(ch)
      } catch { /* ignore */ }
    })()
  }, [])
  return initial
}

function NavItem({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  const cls = active
    ? 'bg-black/[0.08] dark:bg-white/10 text-[#0A0A0A] dark:text-white'
    : 'text-[#555] dark:text-[#999] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#0A0A0A] dark:hover:text-white'
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg
                  text-[14px] font-medium transition-colors ${cls}`}
    >
      <span className="w-[15px] h-[15px] flex items-center justify-center flex-shrink-0">{icon}</span>
      {label}
    </button>
  )
}

function ConvItem({ c, activeId, onSelect, onDelete, onPin }: {
  c: Conv; activeId: string | null
  onSelect: (c: Conv) => void; onDelete: (id: string) => void; onPin: (id: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])
  const isActive = c.id === activeId
  const itemCls = isActive
    ? 'bg-black/[0.06] dark:bg-white/10'
    : 'hover:bg-black/[0.05] dark:hover:bg-white/5'
  return (
    <div ref={ref} className="relative mb-px">
      <button
        onClick={() => onSelect(c)}
        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors duration-100 ${itemCls}`}
      >
        <p className="text-[13px] font-medium truncate text-[#0A0A0A] dark:text-white leading-snug">
          {c.isPinned && <span className="mr-1 text-[#3B82F6]">★</span>}
          {c.title || 'Nouvelle discussion'}
        </p>
        <p className="text-[11px] text-[#999] mt-0.5">{fmt(c.updatedAt)}</p>
      </button>
      <button
        onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
        aria-label="Options"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded
                   flex items-center justify-center text-[#8C8C8C]
                   hover:bg-black/5 dark:hover:bg-white/10"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {menu && (
        <div className="absolute right-1.5 top-[calc(100%-2px)] z-50 min-w-[140px]
                        rounded-lg overflow-hidden
                        bg-white dark:bg-[#262626]
                        border border-black/[0.08] dark:border-white/[0.08]
                        shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
          <button
            onClick={() => { onPin(c.id); setMenu(false) }}
            className="block w-full px-3 py-2 text-left text-[12px]
                       text-[#0A0A0A] dark:text-white
                       hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
          >
            {c.isPinned ? 'Desepingler' : 'Epingler'}
          </button>
          <button
            onClick={() => { onDelete(c.id); setMenu(false) }}
            className="block w-full px-3 py-2 text-left text-[12px] text-[#EF4444]
                       hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

const ProjectsIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M1 4h4l1.5 2H14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)
const TrainingIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M1 7.5h1.5M12.5 7.5H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <rect x="2.5" y="5" width="2" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="10.5" y="5" width="2" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 7.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const NetworksIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1.5c-2 2-3 3.5-3 6s1 4 3 6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1.5c2 2 3 3.5 3 6s-1 4-3 6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 7.5h12" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

export default function AISidebar({
  convs, activeId, onSelect, onDelete, onNew, onPin, onClose, persistent = false,
}: Props) {
  const [view, setView] = useState<SidebarView>('training')
  const initial = useUserInitial()
  const filtered = view === 'training' ? convs : []  // projects / networks: vide pour l'instant
  const pinned = filtered.filter(c => c.isPinned)
  const recent = filtered.filter(c => !c.isPinned)

  const panel = (
    <aside
      style={{ width: persistent ? 240 : 280 }}
      className="h-full flex flex-col overflow-hidden
                 bg-[#F7F7F7] dark:bg-[#1A1A1A]
                 font-[DM_Sans,sans-serif]"
    >
      {/* Zone haute */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-semibold tracking-tight text-[#0A0A0A] dark:text-white">
            Hybrid
          </h1>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-xs font-semibold cursor-pointer
                       bg-[#E5E5E5] dark:bg-[#2A2A2A]
                       text-[#0A0A0A] dark:text-white"
            aria-label="Profil"
          >
            {initial}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 pb-3 flex-shrink-0 flex flex-col gap-0.5">
        <NavItem active={view === 'projects'} onClick={() => setView('projects')} icon={ProjectsIcon} label="Projets" />
        <NavItem active={view === 'training'} onClick={() => setView('training')} icon={TrainingIcon} label="Training" />
        <NavItem active={view === 'networks'} onClick={() => setView('networks')} icon={NetworksIcon} label="Networks" />
      </nav>

      {/* Label RÉCENTS */}
      <div className="px-4 pb-1 flex-shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C8C8C]">
          {view === 'projects' ? 'Projets' : 'Récents'}
        </p>
      </div>

      {/* Liste conversations */}
      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {filtered.length === 0 && (
          <p className="text-center text-[12px] text-[#8C8C8C] mt-5 mx-3">
            {view === 'projects' ? 'Aucun projet pour le moment'
              : view === 'networks' ? 'Aucune conversation Networks'
              : 'Aucune conversation'}
          </p>
        )}
        {pinned.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8C8C8C] mx-1 mt-1 mb-1">Epingles</p>
            {pinned.map(c => (
              <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
            ))}
          </>
        )}
        {recent.map(c => (
          <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
        ))}
      </div>

      {/* Bouton Nouvelle conversation */}
      <div className="px-3 pb-5 pt-2 flex-shrink-0">
        <button
          onClick={onNew}
          className="w-full h-11 rounded-full
                     bg-white text-[#0A0A0A]
                     flex items-center justify-center gap-2
                     text-[13px] font-semibold
                     shadow-[0_1px_4px_rgba(0,0,0,0.15)]
                     hover:bg-[#F5F5F5]
                     active:scale-[0.98]
                     transition-all duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Nouvelle conversation
        </button>
      </div>
    </aside>
  )

  if (persistent) return panel
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute top-0 left-0 bottom-0">{panel}</div>
    </div>
  )
}
