'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import SportSelector, { type SportId } from '@/components/record/SportSelector'
import Toast from '@/components/record/Toast'

const MapBackground  = dynamic(() => import('@/components/record/MapBackground'),  { ssr: false })
const CyclingScreen  = dynamic(() => import('@/components/record/CyclingScreen'),  { ssr: false })

type View = 'home' | 'sport-select' | 'cycling'

export default function RecordPage() {
  const [view, setView] = useState<View>('home')
  const [toast, setToast] = useState<string | null>(null)

  const onSelectSport = (sport: SportId) => {
    if (sport === 'cycling') {
      setView('cycling')
    } else {
      setToast('Bientôt disponible')
      setView('home')
    }
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
      {/* Carte plein écran (60% top) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapBackground />
      </div>

      {/* Panel bas (40% bottom) — style cohérent avec les cards de l'app */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-mid)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 18,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-card)',
          height: '42%',
        }}
      >
        <h1 style={{
          margin: '0 0 18px',
          textAlign: 'center',
          fontFamily: 'Syne, sans-serif',
          fontSize: 22, fontWeight: 700,
          color: 'var(--text)',
        }}>
          Enregistrer
        </h1>

        <button
          onClick={() => setView('sport-select')}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg,#06B6D4,#2563EB)',
            color: '#fff',
            fontFamily: 'Syne, sans-serif',
            fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(6,182,212,0.30)',
            transition: 'transform 0.12s',
            marginBottom: 12,
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          Démarrer une activité
        </button>

        <button
          onClick={() => setToast('Fonctionnalité à venir')}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: 'var(--bg-card2)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text)',
            fontFamily: 'Syne, sans-serif',
            fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'transform 0.12s, background 0.12s',
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          Créer un parcours
        </button>
      </div>

      <SportSelector
        open={view === 'sport-select'}
        onClose={() => setView('home')}
        onSelect={onSelectSport}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
