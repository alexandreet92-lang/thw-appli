'use client'
// ══════════════════════════════════════════════════════════════════════════
// Vue plein écran de l'appel d'un canal. Ne détient PAS la salle : elle consomme
// le CallProvider global (l'appel survit à la navigation via la bulle flottante).
// Ici : lancer/rejoindre, grille des participants (visio + partage d'écran),
// contrôles (micro / caméra / écran / réduire / quitter).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { useCall } from './call/CallProvider'
import type { CallTarget } from './call/types'
import {
  VideoStage, PersonTile, RoundBtn, VoiceIcon, MicIcon, MicOffIcon, CameraIcon, CameraOffIcon,
  ScreenIcon, PhoneDownIcon, MinimizeIcon,
} from './call/callUi'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function VoiceView({ title, target, isMember, isNarrow, onBack }: {
  title: string; target: CallTarget; isMember: boolean; isNarrow: boolean; onBack: () => void
}) {
  const call = useCall()
  const mine = call.isTarget(target)
  const live = mine && call.status === 'connected' && !call.minimized

  // Tant que cette vue montre l'appel (cet appel, non réduit), la bulle se masque.
  const showing = mine && !call.minimized
  const { registerFull } = call
  useEffect(() => { if (showing) return registerFull() }, [showing, registerFull])

  const BackBtn = isNarrow ? (
    <button onClick={onBack} aria-label="Retour" style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-card)' }}>
      <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {BackBtn}
        <VoiceIcon />
        <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        {live && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{call.people.length} en ligne</span>
            <button onClick={call.minimize} aria-label="Réduire l'appel" title="Réduire l'appel"
              style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MinimizeIcon /></button>
          </span>
        )}
      </div>

      {live ? (
        <>
          {call.needAudioTap && (
            <button onClick={call.enableAudio} style={{ margin: '0 var(--space-5) var(--space-2)', height: 34, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              Activer le son
            </button>
          )}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {call.screens.map(t => <VideoStage key={t.key} tile={t} />)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)', alignContent: 'flex-start' }}>
              {call.people.map(t => <PersonTile key={t.key} tile={t} />)}
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <RoundBtn on={call.micOn} label={call.micOn ? 'Couper le micro' : 'Activer le micro'} onClick={call.toggleMic}>{call.micOn ? <MicIcon /> : <MicOffIcon />}</RoundBtn>
            <RoundBtn on={call.camOn} label={call.camOn ? 'Couper la caméra' : 'Activer la caméra'} onClick={call.toggleCam}>{call.camOn ? <CameraIcon /> : <CameraOffIcon />}</RoundBtn>
            {!isNarrow && (
              <RoundBtn on={call.screenOn} active label={call.screenOn ? 'Arrêter le partage d\'écran' : 'Partager mon écran'} onClick={call.toggleScreen}><ScreenIcon /></RoundBtn>
            )}
            <button onClick={call.leave} aria-label="Quitter le salon"
              style={{ height: 46, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <PhoneDownIcon /> Quitter
            </button>
          </div>
          {call.notice && <p style={{ margin: 0, padding: '0 var(--space-5) var(--space-4)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', textAlign: 'center' }}>{call.notice}</p>}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Salon d&apos;appel</span>
          <Message call={call} mine={mine} isMember={isMember} />
          {mine && call.status === 'connected' && call.minimized && (
            <button onClick={call.expand} style={primaryBtn}>Revenir à l&apos;appel</button>
          )}
          {isMember && (!call.active || (!mine)) && (
            <button onClick={() => call.start(target, title)} style={primaryBtn}>
              {call.active && !mine ? 'Rejoindre cet appel' : 'Rejoindre le salon'}
            </button>
          )}
          {isMember && mine && (call.status === 'error') && (
            <button onClick={() => call.start(target, title)} style={primaryBtn}>Réessayer</button>
          )}
        </div>
      )}
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)',
  background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
}

function Message({ call, mine, isMember }: { call: ReturnType<typeof useCall>; mine: boolean; isMember: boolean }) {
  let text: string
  if (mine && call.status === 'connecting') text = 'Connexion…'
  else if (mine && call.status === 'unconfigured') text = 'La voix arrive très bientôt : il reste à activer LiveKit côté serveur.'
  else if (mine && call.status === 'forbidden') text = 'Les salons d\'appel sont réservés à l\'abonnement Pro.'
  else if (mine && call.status === 'error') text = `Connexion impossible pour l'instant.${call.errDetail ? ` (${call.errDetail})` : ''}`
  else if (mine && call.status === 'connected' && call.minimized) text = 'Appel en cours (réduit).'
  else if (call.active && !mine) text = `Un appel est déjà en cours ailleurs (${call.title}). Le rejoindre quittera l'autre.`
  else if (!isMember) text = 'Rejoins l\'espace pour parler, te voir et partager ton écran avec les membres présents.'
  else text = 'Rejoins le salon : audio, vidéo et partage d\'écran, en direct avec les membres présents.'
  return <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 420, lineHeight: 1.5 }}>{text}</p>
}
