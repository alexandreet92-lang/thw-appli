'use client'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import OnboardingSlide from './OnboardingSlide'
import SetupScreen from './SetupScreen'
import WelcomeSlide from './slides/WelcomeSlide'
import RecordSlide from './slides/RecordSlide'
import TrainingSlide from './slides/TrainingSlide'
import PerformanceSlide from './slides/PerformanceSlide'
import AISlide from './slides/AISlide'

const SLIDES = [
  { id: 'welcome',     label: 'Bienvenue',    Component: WelcomeSlide },
  { id: 'record',      label: 'Enregistrer',  Component: RecordSlide },
  { id: 'training',    label: 'Planning',     Component: TrainingSlide },
  { id: 'performance', label: 'Performance',  Component: PerformanceSlide },
  { id: 'ai',          label: 'Coach IA',     Component: AISlide },
]

interface Props { onComplete: () => void }

export default function OnboardingScreen({ onComplete }: Props) {
  const { t } = useI18n()
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showSetup, setShowSetup] = useState(false)
  const touchX = useRef(0)

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1)
    setCurrent(idx)
  }

  const next = () => {
    if (current < SLIDES.length - 1) goTo(current + 1)
    else setShowSetup(true)
  }
  const prev = () => { if (current > 0) goTo(current - 1) }

  const { Component } = SLIDES[current]

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(160deg, #0A0A0F 0%, #0F1A2E 100%)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
      fontFamily: 'DM Sans, sans-serif',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ob-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', flexShrink: 0 }}>
        <button onClick={onComplete} style={{ background: 'rgba(255,255,255,0.10)', border: 'none', color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '6px 14px', borderRadius: 20, fontFamily: 'DM Sans, sans-serif' }}>
          {t('onboarding.skip')}
        </button>
      </div>

      {/* Slide content */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchX.current
          if (dx < -50 && current < SLIDES.length - 1) goTo(current + 1)
          if (dx > 50 && current > 0) goTo(current - 1)
        }}
      >
        {showSetup ? (
          <SetupScreen onComplete={onComplete} />
        ) : (
          <OnboardingSlide key={current} direction={direction} slideKey={current}>
            <Component />
          </OnboardingSlide>
        )}
      </div>

      {/* Footer */}
      {!showSetup && (
        <div style={{ flexShrink: 0, padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),20px)' }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? '#06B6D4' : 'rgba(255,255,255,0.28)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 300ms cubic-bezier(0.16,1,0.3,1)' }} />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {current > 0 && (
              <button onClick={prev} style={{ height: 52, paddingInline: 24, borderRadius: 14, background: 'rgba(255,255,255,0.10)', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {t('onboarding.back')}
              </button>
            )}
            <button onClick={next} style={{ flex: 1, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 20px rgba(6,182,212,0.30)' }}>
              {current === SLIDES.length - 1 ? t('onboarding.configureProfile') : t('onboarding.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
