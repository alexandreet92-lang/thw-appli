'use client'

type THWModel = 'hermes' | 'athena' | 'zeus'

const MODEL_NAMES: Record<THWModel, string> = {
  hermes: 'Hermès',
  athena: 'Athéna',
  zeus:   'Zeus',
}

interface Props {
  model:                THWModel
  isDesktop:            boolean
  fullscr:              boolean
  onOpenSidebar:        () => void
  onNewConv:            () => void
  onToggleFullscreen:   () => void
  onClose:              () => void
}

function HeaderBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'transparent', cursor: 'pointer', color: '#8C8C8C',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'background 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

export default function AIHeader({ model, isDesktop, fullscr, onOpenSidebar, onNewConv, onToggleFullscreen, onClose }: Props) {
  return (
    <div style={{
      height: 48, padding: '0 10px',
      display: 'flex', alignItems: 'center', gap: 4,
      flexShrink: 0, background: 'transparent',
      position: 'relative',
    }}>
      {/* Hamburger — mobile only */}
      {!isDesktop && (
        <HeaderBtn onClick={onOpenSidebar} title="Menu">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M0 1h16M0 6h16M0 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </HeaderBtn>
      )}

      {/* Agent name — texte centré, sans étoile */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {MODEL_NAMES[model]}
        </span>
      </div>

      {/* Right actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
        <HeaderBtn onClick={onNewConv} title="Nouvelle conversation">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </HeaderBtn>

        <HeaderBtn onClick={onToggleFullscreen} title={fullscr ? 'Reduire' : 'Plein ecran'}>
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
    </div>
  )
}
