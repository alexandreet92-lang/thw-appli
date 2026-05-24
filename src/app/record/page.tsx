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
    <div className="relative w-full h-[calc(100dvh-var(--tabbar-h,60px))] overflow-hidden bg-[var(--bg)]">
      {/* Carte plein écran (60% top) */}
      <div className="absolute inset-0 z-0">
        <MapBackground />
      </div>

      {/* Zone basse (40% bottom) */}
      <div
        className="absolute left-0 right-0 bottom-0 z-10
                   bg-[var(--bg)] border-t border-[var(--border)]
                   rounded-t-3xl
                   pt-4 pb-[max(20px,env(safe-area-inset-bottom))] px-5"
        style={{ height: '40%' }}
      >
        <h1 className="text-lg font-semibold text-center text-[var(--text)] mb-5">
          Enregistrer
        </h1>

        <button
          onClick={() => setView('sport-select')}
          className="w-full h-14 rounded-2xl
                     bg-gradient-to-r from-cyan-500 to-blue-600
                     text-white font-semibold text-base
                     shadow-[0_4px_18px_rgba(6,182,212,0.30)]
                     active:scale-[0.98] transition-transform mb-3"
        >
          Démarrer une activité
        </button>

        <button
          onClick={() => setToast('Fonctionnalité à venir')}
          className="w-full h-14 rounded-2xl
                     bg-[var(--bg-card2)] text-[var(--text)] font-medium text-base
                     border border-[var(--border)]
                     active:scale-[0.98] transition-transform"
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
