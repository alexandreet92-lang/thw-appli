'use client'
// ════════════════════════════════════════════════════════════════════
// LiveFrame — cadre visuel UNIQUE des écrans live GPS « historiques »
// (Running, Trail, Randonnée, VTT, Ski, Eau libre), aligné sur le langage du
// live Vélo (LiveShell) et des maquettes mock8 r2 : page gris chaud, en-tête
// ×/pilule d'état/réglages, pages de données en cartes à filets, balayage
// horizontal à élan, pagination en pilule. Les contrôles (Démarrer, verrou,
// pause, lap, Reprendre/Terminer) restent dans CyclingControls.
// Présentation pure : chaque écran garde ses hooks, son GPS et sa sauvegarde.
// ════════════════════════════════════════════════════════════════════
import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react'
import { GPSStatus } from '@/hooks/useGPSTracking'
import { useI18n } from '@/lib/i18n'
import {
  rkScope, RkFab, RkIco, RK_ICON, RkStatusPill, RK_DOT, RkPager, RkPageDots, RkGrid, RkCell, RkBanner, RkBannerSlot,
} from './RecordKit'

export type LivePhase = 'ready' | 'running' | 'paused' | 'confirming_stop'

/** Libellé + couleur de point d'un statut GPS (pilules / bandeaux). */
export function gpsInfo(status: GPSStatus, accuracy: number | null, t: (k: string, v?: Record<string, string | number>) => string): { dot: string; text: string; searching: boolean } {
  const acc = accuracy != null ? Math.max(1, Math.round(accuracy)) : null
  switch (status) {
    case GPSStatus.good: return { dot: RK_DOT.ok, text: t('w2c.gpsGood', { acc: acc ?? 3 }), searching: false }
    case GPSStatus.approximate: return { dot: RK_DOT.warn, text: t('w2c.gpsMedium', { acc: acc ?? 12 }), searching: false }
    case GPSStatus.requesting:
    case GPSStatus.acquiring: return { dot: RK_DOT.info, text: t('w2c.gpsSearching'), searching: true }
    case GPSStatus.poor: return { dot: 'var(--danger)', text: t('record.gpsStatusPoor'), searching: false }
    case GPSStatus.denied: return { dot: 'var(--danger)', text: t('record.gpsStatusDenied'), searching: false }
    case GPSStatus.error: return { dot: 'var(--danger)', text: t('record.gpsStatusError'), searching: false }
    case GPSStatus.unavailable: return { dot: RK_DOT.idle, text: t('record.gpsStatusUnavailable'), searching: false }
    default: return { dot: RK_DOT.idle, text: t('record.gpsStatusIdle'), searching: false }
  }
}

interface FrameProps {
  isDark: boolean
  /** Nom du sport (pilule d'état). */
  title: string
  phase: LivePhase
  autoPaused?: boolean
  gpsStatus?: GPSStatus
  gpsAccuracy?: number | null
  onClose: () => void
  onSettings?: () => void
  closeLabel: string
  settingsLabel?: string
  pageCount: number
  pageIndex: number
  onPageChange: (i: number) => void
  /** Contenu de la page courante. */
  children: ReactNode
  /** Remplace la pilule d'état (ex. sélecteur de type de ski). */
  center?: ReactNode
  /** Bloc sous l'en-tête (au-dessus des pages). */
  below?: ReactNode
  /** Bandeaux transitoires (pilules) sous l'en-tête. */
  banners?: ReactNode
  /** Overlays de l'écran (contrôles, feuilles, formulaires…). */
  overlays?: ReactNode
}

export default function LiveFrame({
  isDark, title, phase, autoPaused, gpsStatus, gpsAccuracy, onClose, onSettings, closeLabel, settingsLabel,
  pageCount, pageIndex, onPageChange, children, center, below, banners, overlays,
}: FrameProps) {
  const { t } = useI18n()
  const g = gpsStatus != null ? gpsInfo(gpsStatus, gpsAccuracy ?? null, t) : null
  const pill = phase === 'ready'
    ? { dot: g?.dot ?? RK_DOT.ok, text: `${title} · ${t('rec.statusReady')}`, live: !!g?.searching }
    : phase === 'running'
      ? autoPaused
        ? { dot: RK_DOT.warn, text: `${title} · ${t('rec.statusAutoPaused')}`, live: false }
        : { dot: RK_DOT.rec, text: `${title} · ${t('rec.statusRecording')}`, live: true }
      : { dot: RK_DOT.warn, text: `${title} · ${t('rec.statusPaused')}`, live: false }
  const showClose = phase !== 'running'

  return (
    <div className={rkScope(isDark)} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--surface-page)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', width: '100vw', height: '100dvh', overflow: 'hidden',
    }}>
      {/* En-tête : × · pilule d'état · réglages */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px', position: 'relative', zIndex: 5 }}>
        <div style={{ width: 44 }}>
          {showClose && (
            <RkFab label={closeLabel} onClick={onClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          {center ?? <RkStatusPill dot={pill.dot} live={pill.live}>{pill.text}</RkStatusPill>}
        </div>
        <div style={{ width: 44 }}>
          {onSettings && (
            <RkFab label={settingsLabel ?? ''} onClick={onSettings}><RkIco d={RK_ICON.sliders} size={19} /></RkFab>
          )}
        </div>
      </div>
      {below}

      {/* Pages : balayage horizontal à élan (une page montée à la fois). */}
      <RkPager index={pageIndex} count={pageCount} onIndexChange={onPageChange}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 176px)' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', padding: '4px 16px 12px' }}>
          {children}
        </div>
      </RkPager>

      <RkPageDots count={pageCount} index={pageIndex} onSelect={onPageChange}
        style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: phase === 'paused' || phase === 'confirming_stop' ? 'calc(env(safe-area-inset-bottom) + 172px)' : 'calc(env(safe-area-inset-bottom) + 150px)', zIndex: 4, transition: 'bottom 0.3s cubic-bezier(0.22,1,0.36,1)' }} />

      <RkBannerSlot top={62}>
        {autoPaused && phase === 'running' && <RkBanner dot={RK_DOT.warn}>{t('w2c.autoPaused')}</RkBanner>}
        {banners}
      </RkBannerSlot>

      {overlays}
    </div>
  )
}

// ── Cellules / grilles des pages de données historiques ──────────────
/** Ajuste la taille d'une valeur pour qu'elle tienne dans sa colonne. */
function fit(base: number, value: string, full: boolean): number {
  const len = Math.max(3, value.length)
  const max = Math.floor((full ? 600 : 270) / len)
  return Math.max(22, Math.min(base, max))
}

export interface LegacyCellProps {
  label: string
  value: string
  unit?: string
  big?: boolean
  /** Conservé pour compatibilité (le thème vient des tokens). */
  isDark?: boolean
  font?: string
  sizes?: { big: number; small: number }
  span?: 1 | 2
}

/** Cellule de données (remplace les « Cell » locales des pages sport). */
export function LegacyCell({ label, value, unit, big, font, sizes, span }: LegacyCellProps) {
  const base = big ? Math.round((sizes?.big ?? 56) * 1.14) : Math.round((sizes?.small ?? 30) * 1.27)
  return <RkCell label={label} value={value} unit={unit} big={big} span={span} size={fit(base, value, !!big || span === 2)} font={font} />
}

/** Carte de données : héro(s) pleine largeur + grille 2 colonnes à filets. */
export function LegacyGrid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const kids = Children.toArray(children).filter(isValidElement)
  return (
    <div className="rk-card" style={{ flexShrink: 0, ...style }}>
      <RkGrid>{kids}</RkGrid>
    </div>
  )
}
