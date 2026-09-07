'use client'
// ══════════════════════════════════════════════════════════════════════════
// Vue plein écran de l'appel d'un canal. Ne détient PAS la salle : elle consomme
// le CallProvider global (l'appel survit à la navigation via la bulle flottante).
// Ici : lancer/rejoindre, grille des participants (visio + partage d'écran),
// contrôles (micro / caméra / écran / réduire / quitter).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useCall } from './call/CallProvider'
import { sendChannelMessage } from '@/lib/community/messages'
import type { CallTarget } from './call/types'
import {
  VideoStage, PersonTile, RoundBtn, VoiceIcon, MicIcon, MicOffIcon, CameraIcon, CameraOffIcon,
  ScreenIcon, PhoneDownIcon, MinimizeIcon, BlurIcon, GearIcon,
} from './call/callUi'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

// mm:ss (ou h:mm:ss au-delà d'une heure).
export function fmtCallDur(s: number): string {
  const sec = Math.max(0, Math.floor(s))
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = sec % 60
  const two = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(ss)}` : `${m}:${two(ss)}`
}

export function VoiceView({ title, target, isMember, isNarrow, onBack }: {
  title: string; target: CallTarget; isMember: boolean; isNarrow: boolean; onBack: () => void
}) {
  const { t } = useI18n()
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
    <button onClick={onBack} aria-label={t('w2g.back')} style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
            <CallPresence call={call} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 12, color: 'var(--danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', animation: 'callDot 1.4s ease-in-out infinite' }} />
              {fmtCallDur(call.callSeconds)}
            </span>
            <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{t('w2g.online', { n: call.people.length })}</span>
            <button onClick={call.minimize} aria-label={t('w2g.minimizeCall')} title={t('w2g.minimizeCall')}
              style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MinimizeIcon /></button>
            <style>{`@keyframes callDot{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          </span>
        )}
      </div>

      {live ? (
        <>
          {call.needAudioTap && (
            <button onClick={call.enableAudio} style={{ margin: '0 var(--space-5) var(--space-2)', height: 34, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              {t('w2g.enableSound')}
            </button>
          )}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {call.screens.map(t => <VideoStage key={t.key} tile={t} />)}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${call.screens.length > 0 ? 104 : 150}px, 1fr))`, gap: 'var(--space-3)', alignContent: 'flex-start' }}>
              {call.people.map(t => <PersonTile key={t.key} tile={t} compact={call.screens.length > 0} />)}
            </div>
          </div>
          <div style={{ position: 'relative', flexShrink: 0, padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <RoundBtn on={call.micOn} label={call.micOn ? t('w2g.muteMic') : t('w2g.unmuteMic')} onClick={call.toggleMic}>{call.micOn ? <MicIcon /> : <MicOffIcon />}</RoundBtn>
            <RoundBtn on={call.camOn} label={call.camOn ? t('w2g.stopCam') : t('w2g.startCam')} onClick={call.toggleCam}>{call.camOn ? <CameraIcon /> : <CameraOffIcon />}</RoundBtn>
            <RoundBtn on={call.blurOn} active label={call.blurOn ? t('w2g.disableBlur') : t('w2g.enableBlur')} onClick={call.toggleBlur}><BlurIcon /></RoundBtn>
            {!isNarrow && (
              <RoundBtn on={call.screenOn} active label={call.screenOn ? t('w2g.stopScreen') : t('w2g.shareScreen')} onClick={call.toggleScreen}><ScreenIcon /></RoundBtn>
            )}
            <RoundBtn on={showDevices} label={t('w2g.avSettings')} onClick={() => setShowDevices(v => !v)}><GearIcon /></RoundBtn>
            <button onClick={call.leave} aria-label={t('w2g.leaveRoom')}
              style={{ height: 46, padding: '0 var(--space-5)', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <PhoneDownIcon /> {t('w2g.leave')}
            </button>
            {showDevices && (
              <div style={{ position: 'absolute', bottom: 'calc(100% - var(--space-2))', left: '50%', transform: 'translateX(-50%)', width: 300, maxWidth: 'calc(100% - var(--space-6))', background: 'var(--bg-elev)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', zIndex: 5 }}>
                <DeviceRow label={t('w2g.deviceMic')} devices={call.devices.mics} onPick={call.setMic} empty={t('w2g.micPermitPrompt')} />
                <DeviceRow label={t('w2g.deviceCam')} devices={call.devices.cams} onPick={call.setCam} empty={t('w2g.camPermitPrompt')} />
              </div>
            )}
          </div>
          {call.notice && <p style={{ margin: 0, padding: '0 var(--space-5) var(--space-4)', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', textAlign: 'center' }}>{call.notice}</p>}
          {'channelId' in target && <CallComposer channelId={target.channelId} />}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>{t('w2g.callRoom')}</span>
          <Message call={call} mine={mine} isMember={isMember} />
          {mine && call.status === 'connected' && call.minimized && (
            <button onClick={call.expand} style={primaryBtn}>{t('w2g.backToCall')}</button>
          )}
          {isMember && (!call.active || (!mine)) && (
            <button onClick={() => call.start(target, title)} style={primaryBtn}>
              {call.active && !mine ? t('w2g.joinThisCall') : t('w2g.joinRoom')}
            </button>
          )}
          {isMember && mine && (call.status === 'error') && (
            <button onClick={() => call.start(target, title)} style={primaryBtn}>{t('w2g.retry')}</button>
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

// Présence en un coup d'œil : combien ont le micro / la caméra / un partage
// d'écran actifs. Discret, dans l'en-tête, à côté du chrono.
function CallPresence({ call }: { call: ReturnType<typeof useCall> }) {
  const mic = call.people.filter(p => p.micOn).length
  const cam = call.people.filter(p => p.variant === 'camera' && p.video).length
  const scr = call.screens.length
  const chip = (icon: React.ReactNode, n: number, activeColor: string) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: n > 0 ? activeColor : 'var(--text-dim)', fontFamily: FB, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>
      {icon}<span>{n}</span>
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {chip(<MicIcon size={12} />, mic, 'var(--text-mid)')}
      {chip(<CameraIcon size={12} />, cam, 'var(--primary)')}
      {scr > 0 && chip(<ScreenIcon size={12} />, scr, 'var(--danger)')}
    </span>
  )
}

// Champ de message pendant l'appel : on garde le fil du canal vivant sans quitter
// la vue d'appel. Le message part dans le canal (visible dans l'onglet Discussion).
function CallComposer({ channelId }: { channelId: string }) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    const ok = await sendChannelMessage(channelId, body)
    setSending(false)
    if (ok) setText('')
  }
  return (
    <div style={{ flexShrink: 0, padding: '0 var(--space-5) calc(var(--space-4) + env(safe-area-inset-bottom))', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
        placeholder={t('w2g.callMsgPlaceholder')}
        maxLength={4000}
        style={{ flex: 1, height: 40, borderRadius: 'var(--r-pill)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 13, padding: '0 var(--space-4)', outline: 'none' }}
      />
      <button onClick={() => void send()} disabled={!text.trim() || sending} aria-label={t('w1g.send')}
        style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: text.trim() && !sending ? 'pointer' : 'default', background: text.trim() && !sending ? 'var(--primary)' : 'var(--surface-neutral)', color: text.trim() && !sending ? 'var(--on-primary)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
      </button>
    </div>
  )
}

function DeviceRow({ label, devices, onPick, empty }: { label: string; devices: MediaDeviceInfo[]; onPick: (id: string) => void; empty: string }) {
  const { t } = useI18n()
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600, color: 'var(--text-mid)' }}>{label}</span>
      {devices.length === 0 ? (
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>{empty}</span>
      ) : (
        <select onChange={e => onPick(e.target.value)}
          style={{ height: 36, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 12.5, padding: '0 var(--space-2)', outline: 'none' }}>
          {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || t('w2g.device')}</option>)}
        </select>
      )}
    </label>
  )
}

function Message({ call, mine, isMember }: { call: ReturnType<typeof useCall>; mine: boolean; isMember: boolean }) {
  const { t } = useI18n()
  let text: string
  if (mine && call.status === 'connecting') text = t('w2g.msgConnecting')
  else if (mine && call.status === 'unconfigured') text = t('w2g.msgUnconfigured')
  else if (mine && call.status === 'forbidden') text = t('w2g.msgForbidden')
  else if (mine && call.status === 'error') text = `${t('w2g.msgError')}${call.errDetail ? ` (${call.errDetail})` : ''}`
  else if (mine && call.status === 'connected' && call.minimized) text = t('w2g.msgMinimized')
  else if (call.active && !mine) text = t('w2g.msgBusyElsewhere', { title: call.title })
  else if (!isMember) text = t('w2g.msgJoinNotMember')
  else text = t('w2g.msgJoinMember')
  return <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', maxWidth: 420, lineHeight: 1.5 }}>{text}</p>
}
