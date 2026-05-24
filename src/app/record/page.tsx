'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import SportSelector, { type SportId, getSportIcon, getSportLabel } from '@/components/record/SportSelector'
import Toast from '@/components/record/Toast'

const MapBackground  = dynamic(() => import('@/components/record/MapBackground'),  { ssr: false })
const CyclingScreen  = dynamic(() => import('@/components/record/CyclingScreen'),  { ssr: false })

type View = 'home' | 'cycling'

export default function RecordPage() {
  const [view, setView] = useState<View>('home')
  const [sport, setSport] = useState<SportId>('cycling')
  const [sportSheetOpen, setSportSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleSelectSport = (s: SportId) => {
    setSport(s)
    setSportSheetOpen(false)
  }

  const handleStart = () => {
    if (sport === 'cycling') setView('cycling')
    else setToast('Bientôt disponible')
  }

  if (view === 'cycling') {
    return (
      <>
        <CyclingScreen
          onExit={() => setView('home')}
          onFinished={() => { setToast('Séance enregistrée'); setView('home') }}
        />
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100dvh - var(--tabbar-h, 60px))',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* Carte plein écran */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapBackground />
      </div>

      {/* Panel bas — Strava style */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
          height: 132,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.30)' }} />
        </div>

        {/* 3 boutons */}
        <div style={{
          height: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 24px',
        }}>
          {/* GAUCHE — Sport */}
          <button
            onClick={() => setSportSheetOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              {getSportIcon(sport)}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>
              {getSportLabel(sport)}
            </span>
          </button>

          {/* CENTRE — Démarrer */}
          <button
            onClick={handleStart}
            aria-label="Démarrer"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#FF6B00',
              boxShadow: '0 4px 20px rgba(255,107,0,0.50)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.12s',
            }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
            onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          {/* DROITE — Parcours */}
          <button
            onClick={() => setToast('Bientôt disponible')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="2.5"/>
                <circle cx="18" cy="18" r="2.5"/>
                <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>
              </svg>
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>Parcours</span>
          </button>
        </div>
      </div>

      <SportSelector
        open={sportSheetOpen}
        onClose={() => setSportSheetOpen(false)}
        onSelect={handleSelectSport}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
