'use client'
import { modelToAgent } from './sidebar/LogoOfficial'

type THWModel = 'hermes' | 'athena' | 'zeus'

const AGENT_LABEL: Record<ReturnType<typeof modelToAgent>, string> = {
  training: 'Training',
  networks: 'Networks',
  hermes:   'Training',
}

interface Props {
  model:                THWModel
  isDesktop:            boolean
  fullscr:              boolean
  onOpenSidebar:        () => void
  onNewConv:            () => void
  onToggleFullscreen:   () => void
  onClose:              () => void
  agentLabelOverride?:  string
}

function HeaderBtn({
  onClick, title, children, className = '',
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  text-[#8C8C8C]
                  hover:bg-black/5 dark:hover:bg-white/[0.06]
                  transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export default function AIHeader({
  model, isDesktop, fullscr,
  onOpenSidebar, onNewConv, onToggleFullscreen, onClose,
  agentLabelOverride,
}: Props) {
  const agent = modelToAgent(model)
  const agentLabel = agentLabelOverride ?? AGENT_LABEL[agent]
  return (
    <header
      className="h-12 flex items-center px-2.5 flex-shrink-0 relative
                 bg-white dark:bg-[#0A0A0A]
                 font-[DM_Sans]"
    >
      {/* Hamburger — mobile only */}
      {!isDesktop && (
        <HeaderBtn onClick={onOpenSidebar} title="Menu">
          <svg width="18" height="13" viewBox="0 0 18 13" fill="none">
            <path d="M0 1h18M0 6.5h18M0 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </HeaderBtn>
      )}

      {/* Nom agent centré — texte uniquement */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
        <span className="text-sm font-semibold text-[#0A0A0A] dark:text-white">
          {agentLabel}
        </span>
      </div>

      {/* Actions droite */}
      <div className="ml-auto flex items-center gap-0.5">
        <HeaderBtn onClick={onNewConv} title="Nouvelle conversation">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </HeaderBtn>

        <HeaderBtn onClick={onToggleFullscreen} title={fullscr ? 'Réduire' : 'Plein écran'} className="hidden md:flex">
          {fullscr ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          )}
        </HeaderBtn>

        <HeaderBtn onClick={onClose} title="Fermer">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </HeaderBtn>
      </div>
    </header>
  )
}
