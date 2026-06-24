'use client'
// Détail d'un sport : header (retour + pastille couleur + titre serif),
// onglets Exercices/Séances (soulignement dans la couleur du sport),
// puis le contenu réel du sport (logique inchangée).
import { useState } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { SlideView } from '@/components/ui/SlideView'
import { SPORTS_AVEC_EXERCICES, type SportTheme } from './sportTheme'
import { ExercicesMuscu } from './ExercicesMuscu'
import { SeancesRunning } from './running/SeancesRunning'
import { SeancesVelo } from './velo/SeancesVelo'
import { SeancesEndurance } from './endurance/SeancesEndurance'
import { AVIRON_CONFIG, NATATION_CONFIG, TRAIL_CONFIG } from './endurance/config'
import { EnPreparation } from './EnPreparation'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function SousOnglets({ theme, value, onChange }: {
  theme: SportTheme; value: 'exos' | 'seances'; onChange: (v: 'exos' | 'seances') => void
}) {
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
            borderBottom: active ? `2px solid ${theme.accent}` : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function Contenu({ theme, tab }: { theme: SportTheme; tab: 'exos' | 'seances' }) {
  if (tab === 'exos') {
    if (theme.id === 'muscu') return <ExercicesMuscu />
    return <EnPreparation titre="Exercices Hyrox en préparation"
      texte="Sled, ergo, wall ball, carry — les ateliers Hyrox détaillés arrivent ici, dans le même esprit que la muscu." />
  }
  switch (theme.id) {
    case 'running':  return <SeancesRunning />
    case 'velo':     return <SeancesVelo />
    case 'aviron':   return <SeancesEndurance cfg={AVIRON_CONFIG} />
    case 'natation': return <SeancesEndurance cfg={NATATION_CONFIG} />
    case 'trail':    return <SeancesEndurance cfg={TRAIL_CONFIG} />
    default:
      return <EnPreparation titre="Séances en préparation"
        texte={`Des dizaines de séances ${theme.label.toLowerCase()} structurées par objectif arrivent ici — échauffement, corps de séance, retour au calme.`} />
  }
}

export function SportDetail({ theme, onBack }: { theme: SportTheme; onBack: () => void }) {
  const hasExos = SPORTS_AVEC_EXERCICES.includes(theme.id)
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
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: theme.accent, flexShrink: 0 }} />
        <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{theme.label}</h2>
      </div>

      {hasExos && <SousOnglets theme={theme} value={tab} onChange={changeTab} />}

      <div style={{ overflowX: 'hidden' }}>
        <SlideView screenKey={tab} direction={tabDir}>
          <Contenu theme={theme} tab={tab} />
        </SlideView>
      </div>
    </div>
  )
}
