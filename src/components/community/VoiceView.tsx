'use client'
// ══════════════════════════════════════════════════════════════════════════
// Vue plein écran de l'appel d'un canal. Ne détient PAS la salle : elle consomme
// le CallProvider global (l'appel survit à la navigation via la bulle flottante).
// Ici : lancer/rejoindre, grille des participants (visio + partage d'écran),
// contrôles (micro / caméra / écran / réduire / quitter).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useCall } from './call/CallProvider'
import type { CallTarget } from './call/types'
import {
  VideoStage, PersonTile, RoundBtn, VoiceIcon, MicIcon, MicOffIcon, CameraIcon, CameraOffIcon,
  ScreenIcon, PhoneDownIcon, MinimizeIcon, BlurIcon, GearIcon,
} from './call/callUi'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function VoiceView({ title, target, isMember, isNarrow, onBack }: {
  title: string; target: CallTarget; isMember: boolean; isNarrow: boolean; onBack: () => void
}) {
  const call = useCall()
  const mine = call.isTarget(target)
  const live = mine && call.status === 'connected' && !call.minimized

  const [showDevices, setShowDevices] = useState(false)

  // Tant que cette vue montre l'appel (cet appel, non réduit), la bulle se masque.
  const showing = mine && !call.minimized
  const { registerFull, refreshDevices } = call
  useEffect(() => { if (showing) return registerFull() }, [showing, registerFull])
  useEffect(() => { if (showDevices) refreshDevices() }, [showDevices, refreshDevices])

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
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${call.screens.length > 0 ? 104 : 150}px, 1fr))`, gap: 'var(--space-3)', alignContent: 'flex-start' }}>
              {call.people.map(t => <PersonTile key={t.key} tile={t} compact={call.screens.length > 0} />)}
            </div>
          </div>
          <div style={{ position: 'relative', flexShrink: 0, padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <RoundBtn on={call.micOn} label={call.micOn ? 'Couper le micro' : 'Activer le micro'} onClick={call.toggleMic}>{call.micOn ? <MicIcon /> : <MicOffIcon />}</RoundBtn>
            <RoundBtn on={call.camOn} label={call.camOn ? 'Couper la caméra' : 'Activer la caméra'} onClick={call.toggleCam}>{call.camOn ? <CameraIcon /> : <CameraOffIcon />}</RoundBtn>
            <RoundBtn on={call.blurOn} active label={call.blurOn ? 'Désactiver le flou' : 'Flou d\'arrière-plan'} onClick={call.toggleBlur}><BlurIcon /></RoundBtn>
            {!isNarrow && (
              <RoundBtn on={call.screenOn} active label={call.screenOn ? 'Arrêter le partage d\'écran' : 'Partager mon écran'} onClick={call.toggleScreen}><ScreenIcon /></RoundBtn>
            )}
            <RoundBtn on={showDevices} label="Réglages audio / vidéo" onClick={() => setShowDevices(v => !v)}><GearIcon /></RoundBtn>
            <button onClick={call.leave} aria-label="Quitter le salon"
              style={{ height: 46, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <PhoneDownIcon /> Quitter
            </button>
            {showDevices && (
              <div style={{ position: 'absolute', bottom: 'calc(100% - var(--space-2))', left: '50%', transform: 'translateX(-50%)', width: 300, maxWidth: 'calc(100% - var(--space-6))', background: 'var(--bg-elev)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', zIndex: 5 }}>
                <DeviceRow label="Micro" devices={call.devices.mics} onPick={call.setMic} empty="Autorise le micro pour choisir" />
                <DeviceRow label="Caméra" devices={call.devices.cams} onPick={call.setCam} empty="Autorise la caméra pour choisir" />
              </div>
            )}
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

function DeviceRow({ label, devices, onPick, empty }: { label: string; devices: MediaDeviceInfo[]; onPick: (id: string) => void; empty: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)' }}>{label}</span>
      {devices.length === 0 ? (
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{empty}</span>
      ) : (
        <select onChange={e => onPick(e.target.value)}
          style={{ height: 36, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 12.5, padding: '0 var(--space-2)', outline: 'none' }}>
          {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Périphérique'}</option>)}
        </select>
      )}
    </label>
  )
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
