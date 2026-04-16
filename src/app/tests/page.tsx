'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import AIAssistantButton from '@/components/ai/AIAssistantButton'

// ── Types ────────────────────────────────────────────────────────
type TestSport = 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox'

interface TestDef {
  id: string
  name: string
  desc: string
  duration: string
  difficulty: 'Modéré' | 'Intense' | 'Maximal'
}

// ── Données ──────────────────────────────────────────────────────
const TESTS: Record<TestSport, TestDef[]> = {
  running: [
    {
      id: 'vo2max-run',
      name: 'VO2max',
      desc: 'Test d\'effort gradué pour mesurer la consommation maximale d\'oxygène. Paliers progressifs jusqu\'à épuisement.',
      duration: '20–35 min',
      difficulty: 'Maximal',
    },
    {
      id: 'vma',
      name: 'VMA',
      desc: 'Vitesse Maximale Aérobie sur piste. Détermine ton allure plafond pour calibrer toutes tes zones.',
      duration: '~6 min',
      difficulty: 'Maximal',
    },
    {
      id: 'lactate-run',
      name: 'Test lactate',
      desc: 'Mesure de la lactatémie à différentes intensités. Zones précises, identification du seuil SL1 et SL2.',
      duration: '60–90 min',
      difficulty: 'Modéré',
    },
    {
      id: 'cooper',
      name: 'Cooper',
      desc: '12 minutes d\'effort maximal en continu. Distance parcourue → estimation VO2max selon la formule Cooper.',
      duration: '12 min',
      difficulty: 'Maximal',
    },
    {
      id: 'tmi',
      name: 'TMI',
      desc: 'Test de Maintien d\'Intensité. Mesure la capacité à tenir une allure au seuil lactate sur durée prolongée.',
      duration: '30 min',
      difficulty: 'Intense',
    },
  ],
  cycling: [
    {
      id: 'cp20',
      name: 'CP20',
      desc: 'Critical Power sur 20 minutes — puissance moyenne × 0.95 = estimation FTP. Le test vélo de référence.',
      duration: '~35 min',
      difficulty: 'Maximal',
    },
    {
      id: 'critical-power',
      name: 'Critical Power',
      desc: 'Modèle multi-durées (3–12–20 min) pour tracer la courbe puissance-durée et calculer W\' et CP.',
      duration: '2 × séances',
      difficulty: 'Maximal',
    },
    {
      id: 'lactate-cycling',
      name: 'Lactate',
      desc: 'Profil lactatémique sur ergocycle. Paliers de 5 min, prise de sang au doigt. Zones ultra-précises.',
      duration: '60–90 min',
      difficulty: 'Modéré',
    },
    {
      id: 'endurance-cycling',
      name: 'Endurance',
      desc: 'Test de 2h à puissance modérée (60–65% FTP). Calibration de la zone 2 et mesure de la dérive cardiaque.',
      duration: '120 min',
      difficulty: 'Modéré',
    },
    {
      id: 'vo2max-cycling',
      name: 'VO2max / PMA',
      desc: 'Test rampe sur ergocycle. Paliers de 1 min, +20W à chaque étape. Détermine la Puissance Maximale Aérobie.',
      duration: '15–25 min',
      difficulty: 'Maximal',
    },
    {
      id: 'wingate',
      name: 'Wingate',
      desc: 'Sprint anaérobie de 30 secondes à résistance maximale. Mesure puissance de crête et capacité anaérobie.',
      duration: '30 sec',
      difficulty: 'Maximal',
    },
  ],
  natation: [
    {
      id: 'css',
      name: 'CSS',
      desc: 'Critical Swim Speed — allure au seuil lactate en natation. Calculée depuis le 400m et le 200m.',
      duration: '~30 min',
      difficulty: 'Intense',
    },
    {
      id: 'vmax-swim',
      name: 'VMax',
      desc: 'Vitesse maximale sur 25 ou 50m. Mesure la puissance explosive en eau et le sprint nage.',
      duration: '~15 min',
      difficulty: 'Maximal',
    },
  ],
  aviron: [
    {
      id: '2000m-row',
      name: '2000m',
      desc: 'Test référence Concept2. Effort anaérobie lactique de ~7 min. Comparaison mondiale via le classement Concept2.',
      duration: '~7 min',
      difficulty: 'Maximal',
    },
    {
      id: '10000m-row',
      name: 'Endurance 10000m',
      desc: 'Capacité aérobie et gestion de l\'allure sur longue durée. Mesure de la dérive technique et cardiaque.',
      duration: '~40 min',
      difficulty: 'Modéré',
    },
    {
      id: '30min-row',
      name: '30 minutes',
      desc: 'Distance maximale parcourue en 30 minutes. Estimateur direct du FTP aviron (split /500m de référence).',
      duration: '30 min',
      difficulty: 'Intense',
    },
    {
      id: 'power-row',
      name: 'Power',
      desc: 'Test de puissance explosive sur ergomètre. Sprint de 10 secondes à résistance maximale.',
      duration: '10 sec',
      difficulty: 'Maximal',
    },
    {
      id: 'vo2max-row',
      name: 'VO2max',
      desc: 'Test rampe sur ergomètre. Résistance croissante toutes les 60 secondes jusqu\'à épuisement. Détermine la PMA aviron.',
      duration: '15–20 min',
      difficulty: 'Maximal',
    },
  ],
  hyrox: [
    {
      id: 'pft',
      name: 'PFT',
      desc: 'Performance Fitness Test — circuit Hyrox complet chronométré. Référence globale pour évaluer ton niveau.',
      duration: '50–90 min',
      difficulty: 'Maximal',
    },
    {
      id: 'station',
      name: 'Station isolée',
      desc: 'Test chronométré sur une station Hyrox spécifique au choix. Identifie tes points faibles station par station.',
      duration: '3–8 min',
      difficulty: 'Intense',
    },
    {
      id: 'bbj',
      name: 'BBJ',
      desc: 'Burpee Broad Jump — 20 répétitions chronométrées ou distance maximale sur série standardisée.',
      duration: '3–5 min',
      difficulty: 'Intense',
    },
    {
      id: 'farmer-carry',
      name: 'Farmer Carry',
      desc: 'Charges standardisées Hyrox (24/32 kg). Distance maximale ou chrono sur 200m. Test de grip et gainage.',
      duration: '2–4 min',
      difficulty: 'Intense',
    },
    {
      id: 'wall-ball',
      name: 'Wall Ball',
      desc: 'Nombre maximal de répétitions en 5 min ou chrono sur 100 reps. Mesure puissance-endurance des membres inférieurs.',
      duration: '5 min',
      difficulty: 'Intense',
    },
    {
      id: 'sled-push',
      name: 'Sled Push',
      desc: 'Poids maximal poussé sur 25m × 4 allers-retours. Test de force-vitesse sur sled Hyrox standardisé.',
      duration: '2–4 min',
      difficulty: 'Maximal',
    },
    {
      id: 'sled-pull',
      name: 'Sled Pull',
      desc: 'Poids maximal tiré sur 25m × 4 allers-retours avec corde. Test de force de traction et endurance musculaire.',
      duration: '2–4 min',
      difficulty: 'Maximal',
    },
    {
      id: 'run-compromised',
      name: 'Run Compromised',
      desc: 'Allure de course mesurée immédiatement après une station Hyrox. Quantifie l\'impact de la fatigue sur la foulée.',
      duration: '10–20 min',
      difficulty: 'Intense',
    },
  ],
}

// ── Config onglets ───────────────────────────────────────────────
const SPORT_TABS: { id: TestSport; label: string; short: string; color: string; bg: string; icon: React.ReactNode }[] = [
  {
    id: 'running',
    label: 'Running',
    short: 'Run',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.10)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M13 4a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none"/>
        <path d="M7 20l3-6 3 3 3-7"/>
        <path d="M15 4l-2 4-3 1-2 4"/>
      </svg>
    ),
  },
  {
    id: 'cycling',
    label: 'Cyclisme',
    short: 'Vélo',
    color: '#00c8e0',
    bg: 'rgba(0,200,224,0.10)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/>
        <path d="M5 17l4-10h4l4 10M9 7h6"/>
      </svg>
    ),
  },
  {
    id: 'natation',
    label: 'Natation',
    short: 'Nata',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.10)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M2 18c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2 3.6-.6 5-2"/>
        <path d="M2 12c1.4-1.4 3-2 5-2s3.6.6 5 2 3 2 5 2"/>
        <path d="M14 6l-2-4-3 4 2 1"/>
      </svg>
    ),
  },
  {
    id: 'aviron',
    label: 'Aviron',
    short: 'Row',
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.10)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 19l14-14M5 5l7 7M12 12l7 7"/>
      </svg>
    ),
  },
  {
    id: 'hyrox',
    label: 'Hyrox',
    short: 'HRX',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
]

const DIFFICULTY_COLOR: Record<TestDef['difficulty'], string> = {
  'Modéré':  '#22c55e',
  'Intense': '#f59e0b',
  'Maximal': '#ef4444',
}

// ── Placeholder panel ────────────────────────────────────────────
interface OpenTest { sport: TestSport; test: TestDef }

function TestPanel({ open: ot, onClose }: { open: OpenTest | null; onClose: () => void }) {
  if (!ot || typeof document === 'undefined') return null

  const cfg = SPORT_TABS.find(t => t.id === ot.sport)!

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          animation: 'cardEnter 0.2s ease both',
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1051,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        padding: '24px 24px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.28s cubic-bezier(0.4,0,0.2,1) both',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }}/>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${cfg.color}18`,
              border: `1px solid ${cfg.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: cfg.color, flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: 0 }}>{ot.test.name}</h2>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                  background: `${DIFFICULTY_COLOR[ot.test.difficulty]}22`,
                  color: DIFFICULTY_COLOR[ot.test.difficulty],
                  textTransform: 'uppercase' as const, letterSpacing: '0.07em',
                }}>{ot.test.difficulty}</span>
              </div>
              <p style={{ fontSize: 11, color: cfg.color, margin: 0, fontWeight: 600 }}>
                {SPORT_TABS.find(t => t.id === ot.sport)?.label} · {ot.test.duration}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
              color: 'var(--text-dim)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Placeholder */}
        <div style={{
          minHeight: 200,
          borderRadius: 16,
          border: `1px dashed ${cfg.color}40`,
          background: `${cfg.color}06`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 32,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${cfg.color}15`,
            border: `1px solid ${cfg.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cfg.color, opacity: 0.7,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
              Contenu à venir
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6, maxWidth: 280 }}>
              Le protocole du test <strong style={{ color: 'var(--text-mid)' }}>{ot.test.name}</strong> sera disponible dans une prochaine mise à jour.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── TestCard ─────────────────────────────────────────────────────
function TestCard({
  test, sport, accentColor, onOpen,
}: {
  test: TestDef; sport: TestSport; accentColor: string; onOpen: () => void
}) {
  const diffColor = DIFFICULTY_COLOR[test.difficulty]
  return (
    <div
      className="card-enter"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 6 }}>
            <h3 style={{
              fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700,
              margin: 0, color: 'var(--text)', letterSpacing: '-0.01em',
            }}>{test.name}</h3>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: `${diffColor}20`, color: diffColor,
              textTransform: 'uppercase' as const, letterSpacing: '0.07em',
              flexShrink: 0,
            }}>{test.difficulty}</span>
          </div>
          <p style={{
            fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6,
            display: '-webkit-box', WebkitBoxOrient: 'vertical' as const,
            WebkitLineClamp: 2, overflow: 'hidden',
          }}>
            {test.desc}
          </p>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>{test.duration}</span>
        </div>
        <button
          onClick={onOpen}
          style={{
            padding: '7px 16px', borderRadius: 9,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}40`,
            color: accentColor,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap' as const,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}28`
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${accentColor}70`
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}18`
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${accentColor}40`
          }}
        >
          Ouvrir
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════
export default function TestsPage() {
  const [sport, setSport]     = useState<TestSport>('running')
  const [openTest, setOpenTest] = useState<OpenTest | null>(null)

  const cfg     = SPORT_TABS.find(t => t.id === sport)!
  const tests   = TESTS[sport]
  const total   = Object.values(TESTS).reduce((s, arr) => s + arr.length, 0)

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            Tests
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '5px 0 0' }}>
            {total} protocoles · 5 disciplines
          </p>
        </div>
        <AIAssistantButton agent="performance" context={{ page: 'tests' }}/>
      </div>

      {/* ── Tab bar desktop ── */}
      <div className="hidden md:flex" style={{ gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {SPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSport(t.id)}
            style={{
              flex: 1, minWidth: 110, padding: '11px 14px',
              borderRadius: 12, border: '1px solid', cursor: 'pointer',
              borderColor: sport === t.id ? t.color : 'var(--border)',
              background: sport === t.id ? t.bg : 'var(--bg-card)',
              color: sport === t.id ? t.color : 'var(--text-mid)',
              fontFamily: 'Syne,sans-serif', fontSize: 13,
              fontWeight: sport === t.id ? 700 : 400,
              boxShadow: sport === t.id ? `0 0 0 1px ${t.color}33` : 'var(--shadow-card)',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <span style={{ opacity: sport === t.id ? 1 : 0.6 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab bar mobile ── */}
      <div className="md:hidden" style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {SPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSport(t.id)}
            style={{
              flex: 1, minWidth: 58, padding: '8px 6px',
              borderRadius: 10, border: '1px solid', cursor: 'pointer',
              borderColor: sport === t.id ? t.color : 'var(--border)',
              background: sport === t.id ? t.bg : 'var(--bg-card)',
              color: sport === t.id ? t.color : 'var(--text-mid)',
              fontFamily: 'Syne,sans-serif', fontSize: 11,
              fontWeight: sport === t.id ? 700 : 400,
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <span style={{ opacity: sport === t.id ? 1 : 0.6 }}>{t.icon}</span>
            {t.short}
          </button>
        ))}
      </div>

      {/* ── Sous-titre de section ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: cfg.color }}/>
          <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {cfg.label}
          </span>
          <span style={{
            fontSize: 11, padding: '2px 9px', borderRadius: 20,
            background: `${cfg.color}15`, color: cfg.color, fontWeight: 600,
          }}>
            {tests.length} test{tests.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Grille de cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: 12,
        }}
        className="md:grid-cols-2"
      >
        {tests.map((test, i) => (
          <TestCard
            key={test.id}
            test={test}
            sport={sport}
            accentColor={cfg.color}
            onOpen={() => setOpenTest({ sport, test })}
          />
        ))}
      </div>

      {/* ── Placeholder panel ── */}
      {openTest && (
        <TestPanel
          open={openTest}
          onClose={() => setOpenTest(null)}
        />
      )}
    </div>
  )
}
