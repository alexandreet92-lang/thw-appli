'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PageOnboardingConfig } from './types'
import { OnboardingVisual } from './OnboardingVisual'
import { AnimatedBackground } from './AnimatedBackground'
import { ProgressBar } from './ProgressBar'

interface Props { config: PageOnboardingConfig; onDismiss: () => void }

export function OnboardingOverlay({ config, onDismiss }: Props) {
  const [current, setCurrent] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const slides = config.slides
  const slide = slides[current]

  const goTo = (idx: number) => setCurrent(Math.max(0, Math.min(slides.length - 1, idx)))

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 280)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
      if (e.key === 'ArrowRight' && current < slides.length - 1) goTo(current + 1)
      if (e.key === 'ArrowLeft' && current > 0) goTo(current - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (!mounted) return null

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
      animation: exiting ? 'ob-fade-out 280ms ease-in forwards' : 'ob-fade-in 350ms ease-out forwards',
    }}>
      <style>{`
        @keyframes ob-fade-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ob-fade-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes ob-slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes ob-stagger  { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes ob-count-up { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes stagger-in  { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes count-up    { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <AnimatedBackground />
      <ProgressBar current={current} total={slides.length} />

      {/* Passer — top right */}
      <button onClick={handleDismiss} style={{
        position: 'absolute', top: 16, right: 20,
        padding: '5px 12px', borderRadius: 20,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12, cursor: 'pointer', zIndex: 10,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Passer
      </button>

      {/* Visual zone — 58vh */}
      <div style={{ height: '58vh', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        <OnboardingVisual slide={slide} key={slide.id} />
      </div>

      {/* Content zone */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '20px 28px 32px',
        background: 'linear-gradient(to top, rgba(5,8,18,1) 80%, transparent)',
        overflow: 'hidden',
      }}>
        {/* Badge */}
        {slide.badge && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 10, color: '#06B6D4', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              {slide.badge}
            </span>
          </div>
        )}

        {/* Title */}
        <h2
          key={slide.id + '_t'}
          style={{
            fontSize: 24, fontWeight: 800, color: 'white',
            margin: '0 0 10px', lineHeight: 1.2, letterSpacing: '-0.3px',
            fontFamily: 'Syne, sans-serif',
            animation: 'ob-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {slide.title}
        </h2>

        {/* Description */}
        <p
          key={slide.id + '_d'}
          style={{
            fontSize: 14, color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.65, margin: 0,
            animation: 'ob-slide-up 0.4s 0.06s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {slide.description}
        </p>

        {/* Key points */}
        {slide.keyPoints && slide.keyPoints.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {slide.keyPoints.map((point, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                animation: `ob-slide-up 0.4s ${0.1 + i * 0.06}s both`,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'rgba(6,182,212,0.2)',
                  border: '1px solid rgba(6,182,212,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#06B6D4' }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  {point}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: i === current ? 22 : 5,
                height: 5, borderRadius: 3,
                background: i === current ? '#06B6D4' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 350ms cubic-bezier(0.16,1,0.3,1)',
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {current > 0 && (
              <button onClick={() => goTo(current - 1)} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                ←
              </button>
            )}
            {current < slides.length - 1 ? (
              <button onClick={() => goTo(current + 1)} style={{
                padding: '9px 20px', borderRadius: 24,
                background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
                border: 'none', color: 'white',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Suivant →
              </button>
            ) : (
              <button onClick={handleDismiss} style={{
                padding: '10px 24px', borderRadius: 24,
                background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
                border: 'none', color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(6,182,212,0.4)',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                C&apos;est parti ✦
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
