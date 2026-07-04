'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { WelcomeVisual,       WELCOME_META }       from './global/slides/WelcomeSlide'
import { AIModelsVisual,      AI_MODELS_META }     from './global/slides/AIModelsSlide'
import { AgentsVisual,        AGENTS_META }        from './global/slides/AgentsSlide'
import { QuickActionsVisual,  QUICK_ACTIONS_META } from './global/slides/QuickActionsSlide'
import { SportsVisual,        SPORTS_META }        from './global/slides/SportsSlide'
import { PlansVisual,         PLANS_META }         from './global/slides/PlansSlide'
import { FinalVisual,         FINAL_META }         from './global/slides/FinalSlide'

const THEMES = [
  { bg: 'linear-gradient(160deg, #0A0520 0%, #120A35 100%)', accent: '#8B5CF6' },
  { bg: 'linear-gradient(160deg, #051520 0%, #0A2535 100%)', accent: '#06B6D4' },
  { bg: 'linear-gradient(160deg, #0A1505 0%, #152A0A 100%)', accent: '#10B981' },
  { bg: 'linear-gradient(160deg, #200A05 0%, #351208 100%)', accent: '#F97316' },
  { bg: 'linear-gradient(160deg, #05101A 0%, #0A1F35 100%)', accent: '#3B82F6' },
  { bg: 'linear-gradient(160deg, #150520 0%, #250A35 100%)', accent: '#EC4899' },
  { bg: 'linear-gradient(160deg, #0A0520 0%, #120A35 100%)', accent: '#8B5CF6' },
]

const SLIDES = [
  { meta: WELCOME_META,       Visual: WelcomeVisual      },
  { meta: AI_MODELS_META,     Visual: AIModelsVisual     },
  { meta: AGENTS_META,        Visual: AgentsVisual       },
  { meta: QUICK_ACTIONS_META, Visual: QuickActionsVisual },
  { meta: SPORTS_META,        Visual: SportsVisual       },
  { meta: PLANS_META,         Visual: PlansVisual        },
  { meta: FINAL_META,         Visual: FinalVisual        },
]

interface Props { onDone: () => void }

export function GlobalOnboarding({ onDone }: Props) {
  const { t } = useI18n()
  const [current, setCurrent]   = useState(0)
  const [exiting, setExiting]   = useState(false)
  const [mounted, setMounted]   = useState(false)
  const touchX = useRef(0)
  const touchY = useRef(0)

  useEffect(() => { setMounted(true) }, [])

  const goTo = (i: number) => setCurrent(Math.max(0, Math.min(SLIDES.length - 1, i)))

  const handleDismiss = useCallback(() => {
    setExiting(true)
    setTimeout(onDone, 280)
  }, [onDone])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      handleDismiss()
      if (e.key === 'ArrowRight')  goTo(current + 1)
      if (e.key === 'ArrowLeft')   goTo(current - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY }
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current
    const dy = e.changedTouches[0].clientY - touchY.current
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? goTo(current + 1) : goTo(current - 1)
    }
  }

  if (!mounted) return null

  const theme  = THEMES[current]
  const slide  = SLIDES[current]
  const isLast = current === SLIDES.length - 1
  const accent = theme.accent

  const content = (
    <div
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', flexDirection: 'column',
        background: theme.bg, fontFamily: 'DM Sans, sans-serif',
        transition: 'background 600ms ease',
        animation: exiting ? 'gob-out 280ms ease-in forwards' : 'gob-in 350ms ease-out forwards',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes gob-in  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gob-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes gob-slide-up { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes go-pulse-glow { 0%,100% { box-shadow: 0 8px 32px rgba(139,92,246,0.4); } 50% { box-shadow: 0 8px 48px rgba(139,92,246,0.7); } }
      `}</style>

      {/* Barre de progression */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, ${accent}99)`, width: `${((current + 1) / SLIDES.length) * 100}%`, transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 8px ${accent}80` }} />
      </div>

      {/* Bouton Passer */}
      <button onClick={handleDismiss} style={{ position: 'absolute', top: 16, right: 20, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', zIndex: 10, fontFamily: 'DM Sans, sans-serif' }}>
        {t('onboarding.skip')}
      </button>

      {/* Zone visuelle */}
      <div style={{ height: '44vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: '20px 24px 0' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <slide.Visual key={current} />
        </div>
      </div>

      {/* Zone contenu */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 28px 28px', background: 'linear-gradient(to top, rgba(5,8,18,0.95) 75%, transparent)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {slide.meta.badge && (
          <div style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 20, background: `rgba(${hexRgb(accent)},0.15)`, border: `1px solid rgba(${hexRgb(accent)},0.3)`, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: accent, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{t(slide.meta.badge)}</span>
          </div>
        )}

        <h2 key={`t${current}`} style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.3px', fontFamily: 'Syne, sans-serif', animation: 'gob-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
          {t(slide.meta.title)}
        </h2>
        <p key={`d${current}`} style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, animation: 'gob-slide-up 0.4s 0.06s cubic-bezier(0.16,1,0.3,1) both' }}>
          {t(slide.meta.description)}
        </p>

        {slide.meta.keyPoints && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(slide.meta.keyPoints as string[]).map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, animation: `gob-slide-up 0.4s ${0.1 + i * 0.06}s both` }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: `rgba(${hexRgb(accent)},0.2)`, border: `1px solid rgba(${hexRgb(accent)},0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{t(pt)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ width: i === current ? 20 : 5, height: 5, borderRadius: 3, background: i === current ? accent : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 350ms cubic-bezier(0.16,1,0.3,1)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {current > 0 && (
              <button onClick={() => goTo(current - 1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            )}
            {isLast ? (
              <button onClick={handleDismiss} style={{ padding: '10px 24px', borderRadius: 24, background: `linear-gradient(135deg, #8B5CF6, #06B6D4)`, border: 'none', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.3px', fontFamily: 'DM Sans, sans-serif', animation: 'go-pulse-glow 2s ease-in-out infinite' }}>
                {t('onboarding.startAdventure')} →
              </button>
            ) : (
              <button onClick={() => goTo(current + 1)} style={{ padding: '9px 20px', borderRadius: 24, background: `linear-gradient(135deg, ${accent}, ${accent}99)`, border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 16px ${accent}55`, fontFamily: 'DM Sans, sans-serif' }}>
                {t('onboarding.next')} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
