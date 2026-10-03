'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille « Partager ma position en direct » — façon Strava Beacon / Garmin
// LiveTrack. À l'ouverture : la session de suivi est créée (ou reprise si un
// partage est déjà actif) et la FEUILLE DE PARTAGE NATIVE s'ouvre avec le lien
// public (« Suis ma sortie vélo en direct : https://…/live/<id> ») → WhatsApp,
// Messages, mail… Le destinataire n'a besoin ni de compte ni de l'app.
// La feuille montre ensuite : explication, lien actif (Copier · Partager à
// nouveau), option secondaire « Envoyer aussi dans l'app » (MP aux membres
// suivis) et « Arrêter le partage ».
// Repli sans feuille native : copie du lien + confirmation inline.
// ══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import { listFollowing, type Person } from '@/lib/social/follows'
import { startLiveShare, stopLiveShare, currentLiveShareId, liveShareUrl, addLiveShareRecipients } from '@/lib/community/liveShare'
import { haptic } from '@/lib/haptics'
import { RkSheet, RkGroup, RkRow, RkCta, RkIco, RkTile, RK_ICON, RK_DOT, useSheetClose } from './kit/RecordKit'
import { shareLink, copyText } from './kit/nativeShare'

type Phase = 'creating' | 'ready' | 'error'

/** Libellé du message selon le sport (« Suis ma sortie vélo en direct »). */
function messageKey(sport: string | null): [string, string] {
  const s = (sport ?? '').toLowerCase()
  if (/cycl|bike|velo|vélo|mtb|gravel|ride/.test(s)) return ['record.liveShareMsgBike', 'Suis ma sortie vélo en direct']
  if (/run|course|trail/.test(s)) return ['record.liveShareMsgRun', 'Suis ma course en direct']
  if (/hik|rando|walk|marche/.test(s)) return ['record.liveShareMsgHike', 'Suis ma randonnée en direct']
  return ['record.liveShareMsgGeneric', 'Suis ma sortie en direct']
}

export default function LiveShareSheet({ sport, onStarted, onClose, onStopped, isDark }: {
  sport: string | null
  /** Session créée (id) — l'appelant passe l'interrupteur « Partager » à ON. */
  onStarted: (shareId: string) => void
  onClose: () => void
  /** Partage arrêté depuis la feuille — l'appelant repasse l'interrupteur à OFF. */
  onStopped?: () => void
  isDark: boolean
}) {
  const { t: tr } = useI18n()
  // Repli FR tant que la clé n'est pas encore au dictionnaire (jamais de clé brute).
  const t = useCallback((key: string, fr: string, vars?: Record<string, string | number>) => {
    const v = tr(key, vars)
    if (v !== key) return v
    let s = fr
    if (vars) for (const [k, val] of Object.entries(vars)) s = s.replace(`{${k}}`, String(val))
    return s
  }, [tr])
  const [open, close] = useSheetClose(onClose)
  const [phase, setPhase] = useState<Phase>('creating')
  const [shareId, setShareId] = useState<string | null>(null)
  const [sharedOnce, setSharedOnce] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Option secondaire : envoi en MP à des membres suivis.
  const [inAppOpen, setInAppOpen] = useState(false)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  const url = shareId ? liveShareUrl(shareId) : ''
  const [msgKey, msgFr] = messageKey(sport)
  const message = t(msgKey, msgFr)

  const flash = useCallback((msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), 2800)
  }, [])
  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current) }, [])

  const doShare = useCallback(async (id: string, auto: boolean) => {
    const r = await shareLink(
      { title: t('record.liveShareTitle', 'Partager ma position'), text: `${message} :`, url: liveShareUrl(id) },
      { fallbackCopy: !auto },
    )
    if (r === 'shared') { setSharedOnce(true); haptic('success') }
    else if (r === 'copied') { setSharedOnce(true); haptic('success'); flash(t('record.liveShareCopied', 'Lien copié — colle-le dans WhatsApp, Messages…')) }
    else if (r === 'failed') flash(t('record.liveShareCopyFailed', 'Copie impossible — sélectionne le lien ci-dessus.'))
  }, [message, t, flash])

  // Ouverture : reprise du partage actif, sinon création + feuille native.
  const create = useCallback(async () => {
    setPhase('creating')
    const existing = currentLiveShareId()
    if (existing) { setShareId(existing); setPhase('ready'); return }
    const id = await startLiveShare(sport)
    if (!id) { setPhase('error'); return }
    setShareId(id)
    setPhase('ready')
    haptic('success')
    onStarted(id)
    void doShare(id, true)
  }, [sport, onStarted, doShare])
  const createdRef = useRef(false)
  useEffect(() => {
    if (createdRef.current) return
    createdRef.current = true
    void create()
  }, [create])

  const copy = async () => {
    if (!url) return
    const ok = await copyText(url)
    if (ok) { haptic('light'); flash(t('record.liveShareLinkCopied', 'Lien copié')) }
    else flash(t('record.liveShareCopyFailed', 'Copie impossible — sélectionne le lien ci-dessus.'))
  }

  const stop = async () => {
    if (stopping) return
    setStopping(true)
    haptic('medium')
    await stopLiveShare(shareId ?? undefined)
    setStopping(false)
    onStopped?.()
    close()
  }

  const toggleInApp = async () => {
    const next = !inAppOpen
    setInAppOpen(next)
    if (next && people == null) {
      try { setPeople(await listFollowing()) } catch { setPeople([]) }
    }
  }
  const togglePerson = (id: string) => {
    haptic('light')
    setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const sendInApp = async () => {
    if (!shareId || sel.size === 0 || sending) return
    setSending(true)
    const n = await addLiveShareRecipients(shareId, [...sel])
    setSending(false)
    if (n > 0) {
      haptic('success')
      flash(t('record.liveShareSentN', 'Lien envoyé à {n} membre(s)', { n }))
      setSel(new Set())
      setInAppOpen(false)
    } else {
      flash(t('record.liveShareSendFailed', 'Envoi impossible — réessaie.'))
    }
  }

  const prettyUrl = url.replace(/^https?:\/\//, '')
  const bullet = (icon: ReactNode, text: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ color: 'var(--text-mid)', display: 'flex', paddingTop: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--text-mid)' }}>{text}</span>
    </div>
  )

  return (
    <RkSheet open={open} onClose={close} isDark={isDark} zIndex={20009}
      title={t('record.liveShareTitle', 'Partager ma position')}
      sub={t('record.liveShareSubLink', 'Envoie un lien de suivi en direct à tes proches.')}
      footer={phase === 'ready' ? (
        <RkCta variant="text-danger" onClick={() => { void stop() }} disabled={stopping}>
          {stopping ? t('record.liveShareStopping', 'Arrêt…') : t('record.liveShareStop', 'Arrêter le partage')}
        </RkCta>
      ) : undefined}>

      {/* ── Lien actif ── */}
      <div className="rk-card" style={{ padding: 16 }}>
        {phase === 'creating' && (
          <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 16, width: '42%', borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)' }} />
            <div style={{ height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-chip)' }} />
            <div style={{ height: 52, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)' }} />
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('record.liveShareStarting', 'Démarrage…')}</span>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
              {t('record.liveShareError', 'Impossible de créer le lien de suivi.')}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.45 }}>
              {t('record.liveShareErrorSub', 'Vérifie ta connexion internet et que tu es connecté, puis réessaie.')}
            </p>
            <RkCta variant="primary" onClick={() => { void create() }}>{t('record.liveShareRetry', 'Réessayer')}</RkCta>
          </div>
        )}

        {phase === 'ready' && shareId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="rk-dot" data-live="1" style={{ background: RK_DOT.ok }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{t('record.liveShareActive', 'Partage actif')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '4px 4px 4px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'all', WebkitUserSelect: 'all' }}>
                {prettyUrl}
              </span>
              <button type="button" onClick={() => { void copy() }} className="rk-press" style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 14px',
                border: 'none', borderRadius: 'var(--r-pill)', background: 'var(--surface-card)', color: 'var(--text)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-capsule)',
              }}>
                <RkIco d={RK_ICON.copy} size={16} />{t('record.liveShareCopy', 'Copier')}
              </button>
            </div>
            <RkCta variant="primary" onClick={() => { void doShare(shareId, false) }}>
              <RkIco d={RK_ICON.share} size={18} sw={2.2} />
              {sharedOnce ? t('record.liveShareShareAgain', 'Partager à nouveau') : t('record.liveShareShareLink', 'Partager le lien')}
            </RkCta>
            <div aria-live="polite" style={{ minHeight: 18, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', textAlign: 'center' }}>
              {note}
            </div>
          </div>
        )}
      </div>

      {/* ── Explication ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 6px 6px' }}>
        {bullet(<RkIco d={RK_ICON.globe} size={18} />, t('record.liveShareHow1', 'Le lien s’ouvre dans n’importe quel navigateur, sans compte ni appli.'))}
        {bullet(<RkIco d={RK_ICON.pin} size={18} />, t('record.liveShareHow2', 'Tes proches voient ta position sur une carte, ta distance et ta durée, mises à jour en direct.'))}
        {bullet(<RkIco d={RK_ICON.lock} size={18} />, t('record.liveShareHow3', 'Tu gardes la main : arrête le partage à tout moment.'))}
      </div>

      {/* ── Option secondaire : MP dans l'app ── */}
      {phase === 'ready' && (
        <div style={{ padding: '14px 0 4px' }}>
          <RkGroup tone="chip">
            <RkRow
              icon={<RkTile color="var(--primary)"><RkIco d={RK_ICON.users} size={19} /></RkTile>}
              label={t('record.liveShareInApp', 'Envoyer aussi dans l’app')}
              sub={t('record.liveShareInAppSub', 'En message privé à des membres que tu suis')}
              onClick={() => { void toggleInApp() }}
              chevron={false}
              right={<span style={{ color: 'var(--text-dim)', display: 'flex', transform: inAppOpen ? 'rotate(180deg)' : 'none', transition: 'transform 220ms ease' }}><RkIco d={RK_ICON.down} size={18} /></span>}
            />
          </RkGroup>
          {inAppOpen && (
            <div className="rk-fade-up" style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {people == null ? (
                <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[0, 1].map(i => <div key={i} style={{ height: 60, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', opacity: 0.7 }} />)}
                </div>
              ) : people.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-mid)', padding: '8px 4px', lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
                  {t('record.liveShareInAppEmpty', 'Tu ne suis encore personne dans l’app. Le lien ci-dessus fonctionne avec n’importe quel contact.')}
                </p>
              ) : (
                <>
                  <RkGroup>
                    {people.map(p => {
                      const on = sel.has(p.id)
                      return (
                        <RkRow key={p.id} onClick={() => togglePerson(p.id)} chevron={false}
                          icon={
                            <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--surface-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', fontWeight: 800 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name.slice(0, 1).toUpperCase()}
                            </span>
                          }
                          label={p.name}
                          right={
                            <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: on ? 'var(--primary)' : 'var(--surface-chip)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 200ms ease' }}>
                              {on && <RkIco d={RK_ICON.check} size={15} sw={3} />}
                            </span>
                          } />
                      )
                    })}
                  </RkGroup>
                  <RkCta variant="white" onClick={() => { void sendInApp() }} disabled={sel.size === 0 || sending}
                    style={{ boxShadow: 'none', background: 'var(--surface-chip)' }}>
                    {sending
                      ? t('record.liveShareSending', 'Envoi…')
                      : sel.size > 0 ? t('record.liveShareSendN', 'Envoyer à {n}', { n: sel.size }) : t('record.liveShareStart', 'Sélectionne des proches')}
                  </RkCta>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </RkSheet>
  )
}
