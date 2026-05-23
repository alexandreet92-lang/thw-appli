'use client'
import { useEffect, useState } from 'react'
import { NavItem } from './sidebar/NavItem'
import { ProjectsIcon, TrainingIcon, NetworksIcon, PlusIcon } from './sidebar/NavIcons'
import { ConvList, type ConvLike } from './sidebar/ConvList'

type THWModel = 'hermes' | 'athena' | 'zeus'
type SidebarView = 'projects' | 'training' | 'networks'

interface Conv extends ConvLike {
  agent?: 'training' | 'networks'
  isProject?: boolean
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

function useUserInitial(): string {
  const [initial, setInitial] = useState('?')
  useEffect(() => {
    void (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        const src =
          (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ??
          (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name ??
          user?.email ?? ''
        const ch = (src.trim()[0] ?? '?').toUpperCase()
        if (ch) setInitial(ch)
      } catch { /* ignore */ }
    })()
  }, [])
  return initial
}

function filterConvsByView(convs: Conv[], view: SidebarView): Conv[] {
  if (view === 'projects')  return convs.filter(c => c.isProject)
  if (view === 'networks')  return convs.filter(c => c.agent === 'networks')
  return convs.filter(c => !c.isProject && (c.agent === undefined || c.agent === 'training'))
}

export default function AISidebar({
  convs, activeId, onSelect, onDelete, onNew, onPin, onClose, persistent = false,
}: Props) {
  const [view, setView] = useState<SidebarView>('training')
  const initial = useUserInitial()
  const filtered = filterConvsByView(convs, view)

  const panel = (
    <aside
      style={{ width: persistent ? 272 : 288 }}
      className="h-full flex flex-col overflow-hidden font-[DM_Sans]
                 bg-[#F7F7F7] dark:bg-[#1A1A1A]
                 text-[#0A0A0A] dark:text-white
                 border-r border-[#E5E5E5] dark:border-[#2A2A2A]"
    >
      {/* ── ZONE HAUTE — App name + Avatar ── */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight leading-none
                         text-[#0A0A0A] dark:text-white
                         font-[Syne,DM_Sans,sans-serif]">
            Hybrid
          </h1>
          <button
            aria-label="Profil"
            className="w-9 h-9 rounded-full flex items-center justify-center
                       text-sm font-medium cursor-pointer
                       bg-[#E5E5E5] dark:bg-[#2A2A2A]
                       text-[#0A0A0A] dark:text-white
                       hover:bg-[#D9D9D9] dark:hover:bg-[#3A3A3A]
                       transition-colors"
          >
            {initial}
          </button>
        </div>
      </div>

      {/* ── ZONE NAVIGATION ── */}
      <nav className="px-3 pb-2 flex-shrink-0 flex flex-col gap-0.5">
        <NavItem
          icon={<ProjectsIcon size={16} />}
          label="Projets"
          active={view === 'projects'}
          onClick={() => setView('projects')}
        />
        <NavItem
          icon={<TrainingIcon size={16} />}
          label="Training"
          active={view === 'training'}
          onClick={() => setView('training')}
        />
        <NavItem
          icon={<NetworksIcon size={16} />}
          label="Networks"
          active={view === 'networks'}
          onClick={() => setView('networks')}
        />
      </nav>

      {/* ── LABEL ── */}
      <div className="px-5 pt-3 pb-1 flex-shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8C8C]">
          {view === 'projects' ? 'Projets' : 'Récents'}
        </p>
      </div>

      {/* ── LISTE CONVERSATIONS ── */}
      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        <ConvList
          convs={filtered}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
          onPin={onPin}
          emptyLabel={
            view === 'projects'
              ? 'Aucun projet pour le moment'
              : view === 'networks'
                ? 'Aucune conversation Networks'
                : 'Aucune conversation'
          }
        />
      </div>

      {/* ── BOUTON NOUVELLE CONVERSATION ── */}
      <div className="px-4 pb-6 pt-3 flex-shrink-0">
        <button
          onClick={onNew}
          className="w-full h-12 rounded-full
                     bg-white text-[#0A0A0A]
                     flex items-center justify-center gap-2
                     text-sm font-semibold
                     shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]
                     hover:bg-white/90
                     active:scale-[0.98]
                     transition-all duration-150"
        >
          <PlusIcon size={14} strokeWidth={2.4} />
          Nouvelle conversation
        </button>
      </div>
    </aside>
  )

  if (persistent) return panel
  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-[aisb_fade_200ms_ease_forwards] md:hidden"
        onClick={onClose}
      />
      <div className="absolute top-0 left-0 bottom-0 animate-sidebar-in md:hidden">
        {panel}
      </div>
      <style>{`
        @keyframes aisb_fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
