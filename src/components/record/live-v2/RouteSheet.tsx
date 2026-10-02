'use client'
// ════════════════════════════════════════════════════════════════════
// RouteSheet — feuille de données de la carte live (maquette L6), bâtie sur
// la SnapSheet du kit : glissée librement vers le haut / le bas, 3 crans.
//  • Réduite : ligne live W / bpm / km/h + 3 colonnes Restant (fait x) ·
//    Arrivée HH:MM (dans …) · D+ restant (fait x).
//  • Moyenne : + profil altimétrique (partie parcourue en gris).
//  • Dépliée : + Changer l'itinéraire, Commandes vocales, Fond de carte.
//  • Pied toujours visible : Démarrer (avant départ) · verrou / pause / Lap
//    (en cours) · Reprendre / Terminer (en pause).
//  Sous-pages (glissent depuis la droite) : Commandes vocales, Changer
//  l'itinéraire (parcours enregistré OU adresse).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import type { MotionValue } from 'motion/react'
import { haptic } from '@/lib/haptics'
import { useI18n } from '@/lib/i18n'
import SnapSheet, { useMeasure } from '../kit/SnapSheet'
import {
  RkFab, RkIco, RK_ICON, RkGroup, RkRow, RkTile, RkStartButton, RkControlRow, RkBigButton, RkCta,
  PauseGlyph, PlayGlyph,
} from '../kit/RecordKit'
import { NavStats, NavProfile, type NavStatsProps } from './NavUI'

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

export type VoiceVolume = 'loud' | 'normal' | 'soft'

interface Props {
  ep: { distanceM: number; altitudeM: number }[]
  totalM: number
  traveledM: number
  stats: NavStatsProps
  /** idle = avant départ ; rec = en cours (pause auto comprise) ; paused = pause manuelle. */
  phase: 'idle' | 'rec' | 'paused'
  showPlayIcon: boolean
  canLap: boolean
  swap?: boolean
  canStart: boolean
  onStart: () => void
  onPauseToggle: () => void
  onFinish: () => void
  onLap: () => void
  onLock: () => void
  voiceOn: boolean
  setVoiceOn: (v: boolean) => void
  volume: VoiceVolume
  setVolume: (v: VoiceVolume) => void
  /** Ouvre le sélecteur de parcours : 'library' (parcours enregistrés) ou 'search' (adresse). */
  onOpenRoutePicker: (mode: 'library' | 'search') => void
  onOpenLayers: () => void
  /** Vue courante (contrôlée : les boutons ronds de la carte peuvent l'ouvrir). */
  view: 'main' | 'voice' | 'route'
  onSetView: (v: 'main' | 'voice' | 'route') => void
  /** Hauteur visible cible (px) — insets de la carte / du panneau de guidage. */
  onSettle?: (h: number) => void
  heightMV?: MotionValue<number>
  /** Cran demandé de l'extérieur (ex. replier quand le guidage s'ouvre). */
  collapseKey?: number
}

export default function RouteSheet(p: Props) {
  const { t } = useI18n()
  const view = p.view
  const setView = p.onSetView
  const [snap, setSnap] = useState(1)
  const [statsRef, statsH] = useMeasure<HTMLDivElement>()
  const [profRef, profH] = useMeasure<HTMLDivElement>()

  // Sous-page ouverte → feuille entièrement dépliée ; retour → cran moyen.
  useEffect(() => { setSnap(view === 'main' ? 1 : 2) }, [view])
  useEffect(() => { if (p.collapseKey) setSnap(0) }, [p.collapseKey])

  const Seg = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={() => { haptic('light'); onClick() }} aria-pressed={on} className="rk-press" style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48, padding: '0 8px',
      borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
      background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text)',
      fontSize: 15, fontWeight: 700,
    }}>{children}</button>
  )
  const SubHeader = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 16px' }}>
      <RkFab label={t('common.back')} onClick={() => setView('main')} size={40} variant="ghost"><RkIco d={RK_ICON.back} size={20} sw={2.2} /></RkFab>
      <span style={{ fontSize: 19, fontWeight: 800 }}>{title}</span>
    </div>
  )
  const speaker = (muted: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />}
    </svg>
  )

  // ── Pied : contrôles selon la phase ──
  const lapFab = p.canLap
    ? <RkFab label={t('w2c.lap')} onClick={p.onLap} size={56}><span style={{ fontSize: 15, fontWeight: 800 }}>{t('w2c.lap')}</span></RkFab>
    : null
  const pauseBig = (
    <RkBigButton label={p.showPlayIcon ? t('w2c.resume') : t('w2c.pause')} onClick={p.onPauseToggle} size={72}>
      {p.showPlayIcon ? <PlayGlyph s={26} /> : <PauseGlyph s={26} />}
    </RkBigButton>
  )
  const footer = (
    <div style={{ padding: '6px 16px calc(12px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center' }}>
      {p.phase === 'idle' && (
        <RkStartButton label={t('w2c.start')} onClick={p.onStart} disabled={!p.canStart} size={84} />
      )}
      {p.phase === 'rec' && (
        <RkControlRow
          left={<RkFab label={t('w2c.lockAction')} onClick={p.onLock} size={56}><RkIco d={RK_ICON.lock} size={22} /></RkFab>}
          center={p.swap && p.canLap
            ? <RkBigButton label={t('w2c.lap')} onClick={p.onLap} size={72}><span style={{ fontSize: 17, fontWeight: 800 }}>{t('w2c.lap')}</span></RkBigButton>
            : pauseBig}
          right={p.swap && p.canLap
            ? <RkFab label={p.showPlayIcon ? t('w2c.resume') : t('w2c.pause')} onClick={p.onPauseToggle} size={56}>{p.showPlayIcon ? <PlayGlyph s={22} /> : <PauseGlyph s={22} />}</RkFab>
            : lapFab}
        />
      )}
      {p.phase === 'paused' && (
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <RkCta variant="primary" onClick={() => { haptic('medium'); p.onPauseToggle() }} style={{ flex: 1.3 }}>
            <PlayGlyph s={18} />{t('w2c.resume')}
          </RkCta>
          <RkCta variant="white" onClick={() => { haptic('medium'); p.onFinish() }} style={{ flex: 1, boxShadow: 'none', background: 'var(--surface-chip)' }}>
            {t('rec.finish')}
          </RkCta>
        </div>
      )}
    </div>
  )

  return (
    <SnapSheet
      snaps={[statsH, statsH + profH, 'full']}
      index={snap}
      onIndexChange={i => { setSnap(i); if (i < 2 && view !== 'main') setView('main') }}
      onSettle={p.onSettle}
      heightMV={p.heightMV}
      footer={footer}
      zIndex={45}
      topGap={140}
      ariaLabel={t('w2c.routeLabel')}
      handleLabel={t('w2c.routeLabel')}
    >
      {view === 'main' && (
        <>
          <NavStats ref={statsRef} live={p.stats.live} cols={p.stats.cols} />
          <div ref={profRef} style={{ paddingBottom: 12 }}>
            <NavProfile ep={p.ep} totalM={p.totalM} traveledM={p.traveledM} />
          </div>
          <div style={{ padding: '4px 16px 12px' }}>
            <RkGroup tone="chip">
              <RkRow icon={<RkTile color="var(--primary)"><RkIco d={RK_ICON.route} size={19} /></RkTile>}
                label={t('w2c.changeRoute')} onClick={() => setView('route')} />
              <RkRow icon={<RkTile color="var(--primary)">{speaker(!p.voiceOn)}</RkTile>}
                label={t('w2c.voiceGuidance')} sub={p.voiceOn ? t('w2c.soundOn') : t('w2c.soundOff')} onClick={() => setView('voice')} />
              <RkRow icon={<RkTile color="var(--primary)"><RkIco d={RK_ICON.layers} size={19} /></RkTile>}
                label={t('w2c.mapLayer')} onClick={p.onOpenLayers} />
            </RkGroup>
          </div>
        </>
      )}

      {/* ══ Sous-page Commandes vocales ══ */}
      {view === 'voice' && (
        <div style={{ padding: '4px 16px 16px', animation: `lv2slideIn 0.28s ${EASE}` }}>
          <SubHeader title={t('w2c.voiceGuidance')} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Seg on={p.voiceOn} onClick={() => p.setVoiceOn(true)}>{speaker(false)}{t('w2c.soundOn')}</Seg>
            <Seg on={!p.voiceOn} onClick={() => p.setVoiceOn(false)}>{speaker(true)}{t('w2c.soundOff')}</Seg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', margin: '16px 4px 8px' }}>{t('w2c.volume')}</div>
          <div style={{ display: 'flex', gap: 8, opacity: p.voiceOn ? 1 : 0.45, pointerEvents: p.voiceOn ? 'auto' : 'none' }}>
            {([['loud', 'w2c.volLoud'], ['normal', 'w2c.volNormal'], ['soft', 'w2c.volSoft']] as [VoiceVolume, string][]).map(([v, k]) => (
              <Seg key={v} on={p.volume === v} onClick={() => p.setVolume(v)}>{t(k)}</Seg>
            ))}
          </div>
        </div>
      )}

      {/* ══ Sous-page Changer l'itinéraire (CHOIX) ══ */}
      {view === 'route' && (
        <div style={{ padding: '4px 16px 16px', animation: `lv2slideIn 0.28s ${EASE}` }}>
          <SubHeader title={t('w2c.changeRoute')} />
          <RkGroup tone="chip">
            <RkRow icon={<RkTile color="var(--primary)"><RkIco d={RK_ICON.route} size={20} /></RkTile>}
              label={t('w2c.pickSavedRoute')} sub={t('w2c.pickSavedRouteSub')} onClick={() => p.onOpenRoutePicker('library')} />
            <RkRow icon={<RkTile color="var(--primary)"><RkIco d={RK_ICON.search} size={20} /></RkTile>}
              label={t('w2c.searchAddress')} sub={t('w2c.searchAddressSub')} onClick={() => p.onOpenRoutePicker('search')} />
          </RkGroup>
        </div>
      )}
    </SnapSheet>
  )
}
