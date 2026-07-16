'use client'
// Écran d'entrée : garde FTP (obligatoire, jamais de valeur par défaut),
// résumé de la séance planifiée du jour (ou sortie libre), connexion des
// capteurs, puis « Démarrer ». Si FTP absent → on le dit et on renvoie vers le
// profil (règle d'interconnexion), sans deviner de valeur.
import { IconX, IconBike, IconHeartbeat, IconRotateClockwise, IconAlertTriangle, IconArrowRight } from '@tabler/icons-react'
import { fmtClock } from './format'
import type { RidePlan } from './types'
import type { SensorStatus, SensorKind } from './useSensors'

interface Props {
  ftp: number | null
  fcMax: number | null
  plan: RidePlan | null
  loading: boolean
  available: boolean | null
  status: Record<SensorKind, SensorStatus>
  onConnect: (k: SensorKind) => void
  onStart: () => void
  onExit: () => void
}

const STAT: Record<SensorStatus, string> = { idle: 'Connecter', connecting: 'Connexion…', connected: 'Connecté', error: 'Réessayer' }

function Row({ icon, label, st, onClick }: { icon: React.ReactNode; label: string; st: SensorStatus; onClick: () => void }) {
  const on = st === 'connected'
  return (
    <button onClick={onClick} disabled={st === 'connecting'} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)' }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-card)', color: on ? 'var(--charge-low)' : 'var(--text-mid)' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: on ? 'var(--charge-low)' : 'var(--primary)' }}>{STAT[st]}</span>
    </button>
  )
}

export default function StartGate({ ftp, fcMax, plan, loading, available, status, onConnect, onStart, onExit }: Props) {
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
      <button onClick={onExit} aria-label="Fermer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><IconX size={16} /></button>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Home trainer</span>
      <span style={{ width: 36 }} />
    </div>
  )

  const wrap = (child: React.ReactNode) => (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>{header}<div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 24px' }}>{child}</div></div>
  )

  if (loading) return wrap(<p style={{ color: 'var(--text-mid)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>Chargement du profil…</p>)

  if (ftp == null) return wrap(
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-card2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--charge-mid)' }}><IconAlertTriangle size={26} /></div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>FTP manquant</h2>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 auto 20px', maxWidth: 300 }}>Ton FTP vélo n&apos;est pas renseigné. Toutes les cibles et zones en dépendent — renseigne-le pour lancer une séance.</p>
      <a href="/performance" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 'var(--r-md)', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>Renseigner mon FTP <IconArrowRight size={18} /></a>
    </div>
  )

  return wrap(
    <>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginTop: 8 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, margin: '0 0 6px' }}>Séance du jour</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{plan?.title ?? 'Sortie libre'}</p>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600, margin: '4px 0 0' }}>
          {plan ? `${plan.blocks.length} blocs · ${fmtClock(plan.totalS)}` : 'Aucune séance planifiée — enregistrement libre'} · FTP {ftp} W{fcMax ? ` · FC max ${fcMax}` : ''}
        </p>
      </div>

      {available === false && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12, marginTop: 12, color: 'var(--text-mid)' }}>
          <IconAlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>Capteurs indisponibles sur ce navigateur (Web Bluetooth requis — Chrome, Edge ou Android). L&apos;écran reste consultable ; tu peux démarrer sans données temps réel.</span>
        </div>
      )}

      {available !== false && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginTop: 12 }}>
          <Row icon={<IconBike size={18} />} label="Home trainer / capteur de puissance" st={status.trainer} onClick={() => onConnect('trainer')} />
          <Row icon={<IconHeartbeat size={18} />} label="Ceinture cardio" st={status.hr} onClick={() => onConnect('hr')} />
          <Row icon={<IconRotateClockwise size={18} />} label="Capteur de cadence" st={status.cadence} onClick={() => onConnect('cadence')} />
        </div>
      )}

      <button onClick={onStart} style={{ width: '100%', height: 54, marginTop: 20, borderRadius: 'var(--r-md)', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>Démarrer</button>
    </>
  )
}
