'use client'
import { useEffect, useState } from 'react'
import { LogoAgent } from './sidebar/LogoOfficial'
import { NavItem } from './sidebar/NavItem'
import { ProjectsIcon, PlusIcon } from './sidebar/NavIcons'
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

const SIDEBAR_BG = '#1A1A1A'

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
  // 'training' = par défaut : convs sans agent + agent === 'training', hors projets
  return convs.filter(c => !c.isProject && (c.agent === undefined || c.agent === 'training'))
}

export default function AISidebar({
  convs, activeId, onSelect, onDelete, onNew, onPin, onClose, persistent = false,
}: Props) {
  const [view, setView] = useState<SidebarView>('training')
  const initial = useUserInitial()
  const filtered = filterConvsByView(convs, view)

  const panel = (
    <div style={{
      width: persistent ? 272 : 288, height: '100%',
      background: SIDEBAR_BG, color: '#FFFFFF',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* ── ZONE HAUTE — App name + Avatar ── */}
      <div style={{ padding: '20px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            margin: 0,
            fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em',
            color: '#FFFFFF', lineHeight: 1,
            fontFamily: 'Syne, DM Sans, sans-serif',
          }}>
            Hybrid
          </h1>
          <button
            aria-label="Profil"
            style={{
              width: 36, height: 36, borderRadius: 999, border: 'none',
              background: '#3A3A3A', color: '#FFFFFF',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'background-color 120ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3A3A3A' }}
          >
            {initial}
          </button>
        </div>
      </div>

      {/* ── ZONE NAVIGATION — 3 items ── */}
      <nav style={{ padding: '0 12px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem
          icon={<ProjectsIcon size={20} />}
          label="Projets"
          active={view === 'projects'}
          onClick={() => setView('projects')}
        />
        <NavItem
          icon={<LogoAgent agent="training" size={20} />}
          label="Training"
          active={view === 'training'}
          onClick={() => setView('training')}
        />
        <NavItem
          icon={<LogoAgent agent="networks" size={20} />}
          label="Networks"
          active={view === 'networks'}
          onClick={() => setView('networks')}
        />
      </nav>

      {/* ── SÉPARATEUR + LABEL ── */}
      <div style={{ padding: '8px 20px 4px', flexShrink: 0 }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 500,
          color: 'rgba(255,255,255,0.40)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {view === 'projects' ? 'Projets' : 'Récents'}
        </p>
      </div>

      {/* ── LISTE CONVERSATIONS ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
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
      <div style={{ padding: '12px 16px 24px', flexShrink: 0 }}>
        <button
          onClick={onNew}
          style={{
            width: '100%', height: 48, borderRadius: 999,
            background: '#FFFFFF', color: '#1A1A1A', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', transition: 'background-color 150ms, transform 150ms',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.92)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          <PlusIcon size={16} strokeWidth={2.4} />
          Nouvelle conversation
        </button>
      </div>
    </div>
  )

  if (persistent) return panel
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)',
          animation: 'aisb_fade 200ms ease forwards',
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        animation: 'aisb_slidein 240ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        {panel}
      </div>
      <style>{`
        @keyframes aisb_fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes aisb_slidein { from { transform: translateX(-100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  )
}
