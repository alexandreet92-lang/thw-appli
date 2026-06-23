'use client'
// Vue détail d'un exercice : fiche complète OU encart « brique sèche ».
import { IconArrowLeft, IconAlertTriangle } from '@tabler/icons-react'
import {
  PRESCRIPTIONS, MODE_LABEL, GROUPE_LABEL, EQUIP_LABEL, MUSCLE_LABEL,
  modePrimaire, type Exercice,
} from '@/data/exercices'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 'var(--r-sm)', fontFamily: FB, fontSize: 11, fontWeight: 500,
      background: accent ? 'var(--primary-dim)' : 'var(--bg-card2)', color: accent ? 'var(--primary)' : 'var(--text-mid)' }}>
      {children}
    </span>
  )
}

function Liste({ titre, items }: { titre: string; items: string[] }) {
  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }}>{titre}</h4>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: 'flex', gap: 'var(--space-3)', fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0, marginTop: 7 }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ExerciceFiche({ exo, onBack }: { exo: Exercice; onBack: () => void }) {
  const primaire = modePrimaire(exo)
  const aEncadrer = exo.flags.includes('a-encadrer')

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
        <IconArrowLeft size={16} /> Retour
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{exo.nom}</h2>
        {aEncadrer && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 'var(--r-sm)',
            background: 'var(--zone-bad-bg)', color: 'var(--zone-bad-border)', fontFamily: FB, fontSize: 11, fontWeight: 600 }}>
            <IconAlertTriangle size={13} /> À encadrer
          </span>
        )}
      </div>

      {/* méta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <Tag>{GROUPE_LABEL[exo.groupe]}</Tag>
        <Tag>Difficulté {exo.difficulteTechnique}/10</Tag>
        {exo.equipement.map(eq => <Tag key={eq}>{EQUIP_LABEL[eq]}</Tag>)}
      </div>

      {/* muscles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        {exo.muscles.map(m => <Tag key={m}>{MUSCLE_LABEL[m]}</Tag>)}
      </div>

      {/* modes + prescription (couche coach IA) */}
      <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {exo.modes.map(({ mode }) => {
          const presc = PRESCRIPTIONS[mode]
          const isPrim = mode === primaire
          return (
            <div key={mode} style={{ padding: 'var(--space-4)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)',
              borderLeft: isPrim ? '3px solid var(--primary)' : '3px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
                <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{MODE_LABEL[mode]}</span>
                {isPrim && <Tag accent>Primaire</Tag>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)' }}>
                <span>Charge <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{presc.charge}</strong></span>
                <span>Tempo <strong style={{ color: 'var(--text)' }}>{presc.tempo}</strong></span>
                <span>Volume <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{presc.volume}</strong></span>
              </div>
            </div>
          )
        })}
      </div>

      {/* fiche complète OU brique sèche */}
      {exo.fiche ? (
        <>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>Pourquoi cet exercice</h4>
            <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.55, margin: 0 }}>{exo.fiche.utilite}</p>
          </div>
          <Liste titre="Exécution" items={exo.fiche.execution} />
          <Liste titre="Erreurs fréquentes" items={exo.fiche.erreurs} />
        </>
      ) : (
        <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-5)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
          <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.55, margin: 0 }}>
            Mouvement de base, connu et maîtrisé. Il sert de <strong style={{ color: 'var(--text)' }}>brique</strong> pour
            construire tes séances — pas besoin d'explication détaillée. Les fiches complètes sont réservées aux exercices
            atypiques à haut rendement.
          </p>
        </div>
      )}
    </div>
  )
}
