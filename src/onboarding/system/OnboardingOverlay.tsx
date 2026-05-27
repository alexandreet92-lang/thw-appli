'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PageOnboardingConfig } from './types'
import { OnboardingVisual } from './OnboardingVisual'

interface Props { config: PageOnboardingConfig; onDismiss: () => void }

export function OnboardingOverlay({ config, onDismiss }: Props) {
  const [current, setCurrent] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const slides = config.slides
  const slide = slides[current]

  const goTo = (idx: number) => setCurrent(idx)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 250)
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
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        animation: exiting ? 'fade-out 250ms forwards' : 'fade-in 300ms forwards',
      }}
    >
      <style>{`
        @keyframes fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes fade-out { from{opacity:1} to{opacity:0} }
        @keyframes scale-in  { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes scale-out { from{transform:scale(1);opacity:1} to{transform:scale(0.9);opacity:0} }
        @keyframes count-up  { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes stagger-in{ from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes fade-in-up{ from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'var(--card, #111827)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          animation: exiting ? 'scale-out 250ms forwards' : 'scale-in 300ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Visual */}
        <div style={{ height: 220, background: 'linear-gradient(135deg,#0A0A1A,#0F1A2E)', position: 'relative', overflow: 'hidden' }}>
          <OnboardingVisual slide={slide} key={slide.id} />
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px' }}>
          <p style={{ fontSize: 11, color: '#8C8C8C', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'DM Sans, sans-serif' }}>
            {current + 1} / {slides.length}
          </p>

          <h3
            key={slide.id + '_title'}
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground, #fff)', margin: '0 0 10px', fontFamily: 'Syne, sans-serif', animation: 'fade-in-up 0.3s ease' }}
          >
            {slide.title}
          </h3>

          <p
            key={slide.id + '_desc'}
            style={{ fontSize: 14, color: 'var(--muted-foreground, rgba(255,255,255,0.6))', lineHeight: 1.6, margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', animation: 'fade-in-up 0.3s 0.05s ease both' }}
          >
            {slide.description}
          </p>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? '#06B6D4' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 300ms cubic-bezier(0.16,1,0.3,1)' }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {current < slides.length - 1 ? (
                <>
                  <button onClick={handleDismiss} style={{ padding: '8px 14px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Passer
                  </button>
                  <button onClick={() => goTo(current + 1)} style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Suivant →
                  </button>
                </>
              ) : (
                <button onClick={handleDismiss} style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#06B6D4,#2563EB)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  C&apos;est parti
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
