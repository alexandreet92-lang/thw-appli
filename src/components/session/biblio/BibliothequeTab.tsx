'use client'
// ══════════════════════════════════════════════════════════════════
// Bibliothèque — coquille de navigation par sport.
//   Sports → [Muscu|Hyrox: onglets Exercices/Séances] · [autres: Séances]
// Seul Muscu › Exercices a du contenu réel (le reste = « en préparation »).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import {
  IconBarbell, IconRun, IconBike, IconSwimming, IconFlame, IconKayak, IconTrophy, IconMountain,
  IconArrowLeft, IconChevronRight, type Icon,
} from '@tabler/icons-react'
import { SlideView } from '@/components/ui/SlideView'
import { ExercicesMuscu } from './ExercicesMuscu'
import { SeancesRunning } from './running/SeancesRunning'
import { SeancesVelo } from './velo/SeancesVelo'
import { SeancesEndurance } from './endurance/SeancesEndurance'
import { AVIRON_CONFIG, NATATION_CONFIG, TRAIL_CONFIG } from './endurance/config'
import { EnPreparation } from './EnPreparation'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

type SportId = 'muscu' | 'running' | 'velo' | 'natation' | 'hyrox' | 'aviron' | 'triathlon' | 'trail'
const SPORTS_AVEC_EXERCICES: SportId[] = ['muscu', 'hyrox']

interface SportMeta { id: SportId; label: string; icon: Icon; color: string; pret: boolean }
const SPORTS: SportMeta[] = [
  { id: 'muscu',     label: 'Muscu / Renfo', icon: IconBarbell,  color: 'var(--sport-gym)',    pret: true  },
  { id: 'running',   label: 'Running',       icon: IconRun,      color: 'var(--sport-run)',    pret: true  },
  { id: 'trail',     label: 'Trail',         icon: IconMountain, color: 'var(--sport-run)',    pret: true  },
  { id: 'velo',      label: 'Vélo',          icon: IconBike,     color: 'var(--sport-bike)',   pret: true  },
  { id: 'natation',  label: 'Natation',      icon: IconSwimming, color: 'var(--sport-swim)',   pret: true  },
  { id: 'aviron',    label: 'Aviron',        icon: IconKayak,    color: 'var(--sport-rowing)', pret: true  },
  { id: 'hyrox',     label: 'Hyrox',         icon: IconFlame,    color: 'var(--sport-hyrox)',  pret: false },
  { id: 'triathlon', label: 'Triathlon',     icon: IconTrophy,   color: 'var(--primary)',      pret: false },
]

function SousOnglets({ value, onChange }: { value: 'exos' | 'seances'; onChange: (v: 'exos' | 'seances') => void }) {
  const items: { id: 'exos' | 'seances'; label: string }[] = [
    { id: 'exos', label: 'Exercices' }, { id: 'seances', label: 'Séances' },
  ]
  return (
    <div style={{ display: 'flex', gap: 'var(--space-5)', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-5)' }}>
      {items.map(t => {
        const active = value === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 10px', fontFamily: FB, fontSize: 14, fontWeight: active ? 600 : 500,
            color: active ? 'var(--text)' : 'var(--text-dim)',
            borderBottom: active ? '2px solid var(--text)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function SportDetail({ sport, onBack }: { sport: SportMeta; onBack: () => void }) {
  const hasExos = SPORTS_AVEC_EXERCICES.includes(sport.id)
  const [tab, setTab] = useState<'exos' | 'seances'>(hasExos ? 'exos' : 'seances')
  const [tabDir, setTabDir] = useState(1)
  const changeTab = (t: 'exos' | 'seances') => { setTabDir(t === 'seances' ? 1 : -1); setTab(t) }

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
        <IconArrowLeft size={16} /> Sports
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: sport.color, flexShrink: 0 }} />
        <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{sport.label}</h2>
      </div>

      {hasExos && <SousOnglets value={tab} onChange={changeTab} />}

      <div style={{ overflowX: 'hidden' }}>
        <SlideView screenKey={tab} direction={tabDir}>
          {tab === 'exos' && sport.id === 'muscu' && <ExercicesMuscu />}
          {tab === 'exos' && sport.id === 'hyrox' && (
            <EnPreparation titre="Exercices Hyrox en préparation"
              texte="Sled, ergo, wall ball, carry — les ateliers Hyrox détaillés arrivent ici, dans le même esprit que la muscu." />
          )}
          {tab === 'seances' && sport.id === 'running' && <SeancesRunning />}
          {tab === 'seances' && sport.id === 'velo' && <SeancesVelo />}
          {tab === 'seances' && sport.id === 'aviron' && <SeancesEndurance cfg={AVIRON_CONFIG} />}
          {tab === 'seances' && sport.id === 'natation' && <SeancesEndurance cfg={NATATION_CONFIG} />}
          {tab === 'seances' && sport.id === 'trail' && <SeancesEndurance cfg={TRAIL_CONFIG} />}
          {tab === 'seances' && !['running', 'velo', 'aviron', 'natation', 'trail'].includes(sport.id) && (
            <EnPreparation titre="Séances en préparation"
              texte={`Des dizaines de séances ${sport.label.toLowerCase()} structurées par objectif arrivent ici — échauffement, corps de séance, retour au calme.`} />
          )}
        </SlideView>
      </div>
    </div>
  )
}

export function BibliothequeTab() {
  const [sport, setSport] = useState<SportMeta | null>(null)
  const [dir, setDir] = useState(1)

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={sport ? `sport-${sport.id}` : 'grid'} direction={dir}>
        {sport ? (
          <SportDetail sport={sport} onBack={() => { setDir(-1); setSport(null) }} />
        ) : (
    <div>
      <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.35 }}>
        Des séances et exercices types, expliqués.
      </p>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: '0 0 24px', maxWidth: 560, lineHeight: 1.5 }}>
        Choisis un sport pour explorer ses exercices et ses séances : leur objectif, leur déroulé, et le bon moment pour les programmer.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
        {SPORTS.map(s => {
          const Ic = s.icon
          return (
            <button key={s.id} onClick={() => { setDir(1); setSport(s) }} style={{ position: 'relative', display: 'flex', flexDirection: 'column',
              gap: 'var(--space-3)', alignItems: 'flex-start', textAlign: 'left', padding: 'var(--space-5)', minHeight: 116,
              borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)',
              opacity: s.pret ? 1 : 0.72 }}>
              {/* slot image de fond — neutre pour l'instant */}
              <div style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'var(--bg-elev)', color: s.color }}>
                <Ic size={20} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <span style={{ flex: 1, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
                <IconChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
              </div>
              {!s.pret && (
                <span style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)', fontFamily: FB,
                  fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bientôt
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
        )}
      </SlideView>
    </div>
  )
}
