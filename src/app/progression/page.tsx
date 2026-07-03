'use client'

// ══════════════════════════════════════════════════════════════════
// ProgressionHub — page d'entrée de l'onglet Progression.
// Shuriken THW animé au centre + 7 bulles sports équidistantes sur un
// cercle. Clic → explosion → navigation /progression/[sport].
// (Trail = « À venir » : pas de navigation.)
// ══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { ShurikenAnimated } from './components/ShurikenAnimated'
import { SportBubble, type SportDef } from './components/SportBubble'

const RAW_SPORTS: { id: string; label: string; gradient: string; comingSoon?: boolean }[] = [
  { id: 'running',  label: 'Running',  gradient: 'linear-gradient(135deg,#f97316,#fb923c)' },
  { id: 'cycling',  label: 'Cyclisme', gradient: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  { id: 'hyrox',    label: 'Hyrox',    gradient: 'linear-gradient(135deg,#ef4444,#f87171)' },
  { id: 'natation', label: 'Natation', gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
  { id: 'aviron',   label: 'Aviron',   gradient: 'linear-gradient(135deg,#06b6d4,#22d3ee)' },
  { id: 'muscu',    label: 'Muscu',    gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
  { id: 'trail',    label: 'Trail',    gradient: 'linear-gradient(135deg,#84cc16,#a3e635)', comingSoon: true },
]
const RADIUS_PCT = 39
// Lignes de connexion : départ au bord du halo, arrêt avant la bulle.
const CONN_START = 23
const CONN_END = 33

function circlePoint(i: number, total: number): { x: number; y: number } {
  const a = ((i / total) * 360 - 90) * (Math.PI / 180)
  return { x: 50 + RADIUS_PCT * Math.cos(a), y: 50 + RADIUS_PCT * Math.sin(a) }
}

const SPORTS: (SportDef & { x: number; y: number })[] = RAW_SPORTS.map((s, i) => {
  const { x, y } = circlePoint(i, RAW_SPORTS.length)
  return { ...s, x, y, pos: { left: `calc(${x}% - 40px)`, top: `calc(${y}% - 40px)` }, floatDelay: `${(i * 0.4).toFixed(1)}s` }
})

export default function ProgressionHub({ onSelectSport }: { onSelectSport?: (id: string) => void } = {}) {
  const router = useRouter()
  const { t } = useI18n()
  const [soon, setSoon] = useState(false)

  function handleClick(sport: SportDef, el: HTMLButtonElement) {
    if (sport.comingSoon) { setSoon(true); setTimeout(() => setSoon(false), 2200); return }
    el.classList.add('prog-bubble-exploding')
    // Rendu inline dans /activities (garde la nav) si callback fourni, sinon route.
    setTimeout(() => { if (onSelectSport) onSelectSport(sport.id); else router.push(`/progression/${sport.id}`) }, 480)
  }

  return (
    <div className="prog-hub">
      <style>{`
        .prog-hub { position: relative; width: 100%; max-width: 720px; margin: 0 auto; aspect-ratio: 1 / 1; min-height: 420px; }
        .prog-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); border: 1px solid var(--border); border-radius: 50%; opacity: 0.5; }
        .prog-ring-1 { width: 40%; height: 40%; } .prog-ring-2 { width: 62%; height: 62%; } .prog-ring-3 { width: 84%; height: 84%; }
        .prog-conn { stroke: rgba(148,163,184,0.45); stroke-width: 1.2px; stroke-dasharray: 2 6; stroke-linecap: round; animation: prog-dash 4.5s linear infinite; }
        .prog-conn-dot { fill: rgba(148,163,184,0.5); }
        @keyframes prog-dash { to { stroke-dashoffset: -16; } }
        .prog-bubble { position: absolute; width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: none; color: #fff; z-index: 3; box-shadow: 0 6px 20px rgba(0,0,0,0.18); transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s; animation: prog-float 5s ease-in-out infinite; }
        .prog-bubble:hover { transform: scale(1.10) translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.26); }
        .prog-bubble-label { font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
        .prog-bubble-soon { position: absolute; bottom: -20px; font-size: 8px; color: #84cc16; background: rgba(132,204,22,0.18); padding: 2px 8px; border-radius: 999px; font-weight: 700; white-space: nowrap; text-transform: uppercase; }
        @keyframes prog-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .prog-bubble-exploding { animation: prog-explode .6s cubic-bezier(.34,1.56,.64,1) forwards !important; z-index: 10; }
        @keyframes prog-explode { 0% { transform: scale(1); } 45% { transform: scale(1.5); } 100% { transform: scale(14); opacity: 0; } }
        .prog-hub-title { position: absolute; bottom: -6%; left: 0; right: 0; text-align: center; }
        @media (max-width: 768px) { .prog-bubble { width: 62px; height: 62px; } .prog-bubble-label { font-size: 8px; } }
        @media (prefers-reduced-motion: reduce) { .prog-bubble, .prog-conn { animation: none; } }
      `}</style>

      <div className="prog-ring prog-ring-1" /><div className="prog-ring prog-ring-2" /><div className="prog-ring prog-ring-3" />

      {/* Lignes de connexion : du bord du halo jusqu'avant chaque bulle
          (gap des deux côtés — elles ne passent ni sous le logo ni sous
          les bulles), trait fin constant + flux pointillé vers l'extérieur. */}
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
        {SPORTS.map(s => {
          const ux = (s.x - 50) / RADIUS_PCT
          const uy = (s.y - 50) / RADIUS_PCT
          const x1 = 50 + ux * CONN_START, y1 = 50 + uy * CONN_START
          const x2 = 50 + ux * CONN_END,   y2 = 50 + uy * CONN_END
          return (
            <g key={s.id}>
              <line className="prog-conn" x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
              <circle className="prog-conn-dot" cx={x2} cy={y2} r={0.55} />
            </g>
          )
        })}
      </svg>

      <ShurikenAnimated />

      {SPORTS.map(s => <SportBubble key={s.id} sport={{ ...s, label: t(`progression.sport_${s.id}`) }} onClick={el => handleClick(s, el)} />)}

      <div className="prog-hub-title">
        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text)', margin: 0 }}>{t('progression.hubTitle')}</h2>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>{t('progression.hubSubtitle')}</p>
        {soon && <p style={{ fontSize: 12, color: '#84cc16', marginTop: 8, fontWeight: 600 }}>{t('progression.trailComingSoon')}</p>}
      </div>
    </div>
  )
}
