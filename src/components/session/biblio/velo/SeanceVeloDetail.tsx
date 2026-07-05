'use client'
// Détail d'une séance Vélo : profil complet + résumé + structure en blocs.
// Adapte le VOLUME selon le niveau (4 bulles) et propose des variantes.
import { useState } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import type { Seance, Bloc, PhaseBloc, Cadence, Niveau } from '@/data/seances/velo'
import { VELO_BUCKET_LABEL, SUPPORT_LABEL, NIVEAUX, hasNiveaux, scaleSeance, volumePrefixe, volumeSignature } from '@/data/seances/velo'
import { VeloProfil, ResumeBandeau, ZONE_TOKEN, ZONE_LABEL } from './VeloProfil'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

const PHASE_KEY: Record<PhaseBloc, string> = {
  echauffement: 'session.phaseEchauffement', corps: 'session.phaseCorps', recup: 'session.phaseRecup', 'retour-calme': 'session.phaseRetourCalme',
}
const CADENCE_KEY: Record<Cadence, string> = { basse: 'session.cadBasseLow', normale: 'session.cadNormaleLow', haute: 'session.cadHauteLow' }

function fmtDuree(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  if (m > 0) return s ? `${m}'${String(s).padStart(2, '0')}` : `${m}'`
  return `${s}"`
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '3px 9px', borderRadius: 'var(--r-sm)', fontFamily: FB, fontSize: 11, fontWeight: 500, background: 'var(--bg-card2)', color: 'var(--text-mid)' }}>{children}</span>
}

// Pilule sélectionnable (niveau / variante).
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600,
      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      background: active ? 'var(--primary-dim)' : 'var(--bg-card2)',
      color: active ? 'var(--primary)' : 'var(--text-mid)', transition: 'all 0.15s' }}>
      {children}
    </button>
  )
}

function ConseilLigne({ titre, texte }: { titre: string; texte?: string }) {
  if (!texte) return null
  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{titre}</span>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, margin: '3px 0 0' }}>{texte}</p>
    </div>
  )
}

function BlocRow({ b, niveau }: { b: Bloc; niveau: Niveau }) {
  const { t } = useI18n()
  const { prefix, mesure } = volumePrefixe(b, niveau)
  const puiss = b.segments && b.segments.length ? '' : (b.puissance ? b.puissance : '')
  const meta = [puiss, b.cadence ? t(CADENCE_KEY[b.cadence]) : null].filter(Boolean).join(' · ')
  return (
    <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', borderLeft: `3px solid ${ZONE_TOKEN[b.zone]}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{t(PHASE_KEY[b.phase])}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: ZONE_TOKEN[b.zone] }} />{b.zone} · {ZONE_LABEL[b.zone]}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginTop: 5, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FD, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{b.label}</span>
        <span style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
          {prefix}{mesure}{meta ? ` · ${meta}` : ''}
        </span>
      </div>
      {b.recup && (
        <p style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', margin: '5px 0 0' }}>
          {t('session.recup')} {b.recup.actif ? t('session.actif') : t('session.passif')} · {fmtDuree(b.recup.dureeSec)} ({b.recup.zone})
        </p>
      )}
    </div>
  )
}

export function SeanceVeloDetail({ seance, onBack }: { seance: Seance; onBack: () => void }) {
  const { t } = useI18n()
  const [niveau, setNiveau] = useState<Niveau>('intermediaire')
  const [varianteId, setVarianteId] = useState<string | null>(null)

  const variante = seance.variantes?.find(v => v.id === varianteId) ?? null
  const base: Seance = variante
    ? { ...seance, blocs: variante.blocs, conseil: variante.conseil ?? seance.conseil }
    : seance
  const showNiveaux = hasNiveaux(base)
  const view = showNiveaux ? scaleSeance(base, niveau) : base
  const signature = showNiveaux ? volumeSignature(base, niveau) : null
  const niveauLabel = NIVEAUX.find(n => n.id === niveau)?.label ?? ''

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
        <IconArrowLeft size={16} /> {t('session.retour')}
      </button>

      <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>{seance.nom}</h2>
      <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 var(--space-4)' }}>{seance.objectif}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <Tag>{VELO_BUCKET_LABEL[seance.bucket]}</Tag>
        <Tag>{seance.phase}</Tag>
        {seance.support.map(s => <Tag key={s}>{SUPPORT_LABEL[s]}</Tag>)}
        {seance.terrain && <Tag>{seance.terrain === 'cote' ? t('session.cote') : t('session.plat')}</Tag>}
        {seance.cadenceTag && <Tag>{t(CADENCE_KEY[seance.cadenceTag])}</Tag>}
      </div>

      {/* Switcher de variantes (même intention, structure différente) */}
      {seance.variantes && seance.variantes.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Pill active={!variante} onClick={() => setVarianteId(null)}>{t('session.base')}</Pill>
            {seance.variantes.map(v => (
              <Pill key={v.id} active={variante?.id === v.id} onClick={() => setVarianteId(v.id)}>{v.nom}</Pill>
            ))}
          </div>
          {variante && (
            <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5, margin: 'var(--space-2) 0 0' }}>{variante.pourquoi}</p>
          )}
        </div>
      )}

      {/* Bulles de niveau — pilotent le volume (fourchette) + le profil */}
      {showNiveaux && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{t('session.niveauLabel')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {NIVEAUX.map(n => (
              <Pill key={n.id} active={niveau === n.id} onClick={() => setNiveau(n.id)}>{n.label}</Pill>
            ))}
          </div>
          {signature && (
            <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', margin: 'var(--space-2) 0 0' }}>
              {t('session.volume')} {niveauLabel.toLowerCase()} : <strong style={{ color: 'var(--text)' }}>{signature}</strong>
            </p>
          )}
        </div>
      )}

      <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', marginBottom: 'var(--space-4)' }}>
        <VeloProfil seance={view} full />
      </div>
      <div style={{ marginBottom: 'var(--space-5)' }}><ResumeBandeau seance={view} /></div>

      <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-3)' }}>{t('session.deroule')}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {view.blocs.map((b, i) => <BlocRow key={i} b={b} niveau={niveau} />)}
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <h4 style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-2)' }}>{t('session.pourQuiQuand')}</h4>
        <p style={{ fontFamily: FB, fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5, margin: 0 }}>{seance.pourQui}</p>
      </div>

      {(seance.conseils || base.conseil) && (
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', background: 'var(--primary-dim)' }}>
          <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>{t('session.conseilsTitle')}</span>
          {base.conseil && (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, margin: 'var(--space-2) 0 0' }}>{base.conseil}</p>
          )}
          {seance.conseils && (
            <>
              <ConseilLigne titre={t('session.execution')} texte={seance.conseils.execution} />
              <ConseilLigne titre={t('session.erreursEviter')} texte={seance.conseils.erreurs} />
              <ConseilLigne titre={t('session.progression')} texte={seance.conseils.progression} />
              <ConseilLigne titre={t('session.quandPlacer')} texte={seance.conseils.quand} />
            </>
          )}
        </div>
      )}

      {seance.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
          {seance.tags.map(tg => <Tag key={tg}>#{tg}</Tag>)}
        </div>
      )}
    </div>
  )
}
