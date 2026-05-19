'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ── Types ───────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'pending' | 'available' | 'coming'
type StatusFilter = 'all' | ConnectionStatus
type CategoryId =
  | 'training'
  | 'recovery'
  | 'body'
  | 'nutrition'
  | 'biometrics'
  | 'sleep'

interface AppDef {
  id: string
  name: string
  category: CategoryId
  /** provider key in oauth_tokens (null = no OAuth configured) */
  provider: string | null
  color: string
  logoInitial: string
  /** filename in /public/logos/apps/ (without .png), null = use initials */
  logo: string | null
  description: string
}

interface Category {
  id: CategoryId
  label: string
}

interface ConnectModalState {
  appId: string
  step: 'confirm' | 'loading'
}

interface ConnectionInfo {
  provider:     string
  last_used_at: string | null
  updated_at:   string | null
}

// ── Helpers ─────────────────────────────────────────────────────

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 120)   return 'À l\'instant'
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return `Il y a ${Math.floor(diff / 86400)}j`
}

// ── Categories ──────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'training',   label: 'Entraînement' },
  { id: 'recovery',   label: 'Récupération & Santé' },
  { id: 'body',       label: 'Balance & Corps' },
  { id: 'nutrition',  label: 'Nutrition' },
  { id: 'biometrics', label: 'Biométrie & Capteurs' },
  { id: 'sleep',      label: 'Sommeil' },
]

// Canonical section IDs used in HTML
const SECTION_ID: Record<CategoryId, string> = {
  training:   'entrainement',
  recovery:   'recuperation-sante',
  body:       'balance-corps',
  nutrition:  'nutrition',
  biometrics: 'biometrie-capteurs',
  sleep:      'sommeil',
}

function scrollToSection(catId: CategoryId) {
  const el = document.getElementById(SECTION_ID[catId])
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Apps ────────────────────────────────────────────────────────

const APPS: AppDef[] = [
  // Entraînement
  { id: 'strava',       name: 'Strava',               category: 'training',   provider: 'strava',    color: '#FC4C02', logoInitial: 'ST', logo: 'strava',        description: 'Suivi GPS running & cycling' },
  { id: 'garmin',       name: 'Garmin Connect',        category: 'training',   provider: null,        color: '#007CC3', logoInitial: 'GC', logo: null,            description: 'Montres et capteurs Garmin' },
  { id: 'wahoo',        name: 'Wahoo',                 category: 'training',   provider: 'wahoo',     color: '#E8002D', logoInitial: 'WH', logo: 'wahoo',         description: 'Capteurs & home trainers' },
  { id: 'polar',        name: 'Polar',                 category: 'training',   provider: 'polar',     color: '#D9001B', logoInitial: 'PO', logo: 'polar',         description: 'Montres sport & cardiaque' },
  { id: 'suunto',       name: 'Suunto',                category: 'training',   provider: null,        color: '#E8002D', logoInitial: 'SU', logo: 'suunto',        description: 'Montres outdoor & navigation' },
  { id: 'coros',        name: 'Coros',                 category: 'training',   provider: null,        color: '#1A1A1A', logoInitial: 'CO', logo: 'coros',         description: 'Montres GPS performance' },
  { id: 'zwift',        name: 'Zwift',                 category: 'training',   provider: null,        color: '#F05C2B', logoInitial: 'ZW', logo: 'zwift',         description: 'Cyclisme & course virtuelle' },
  { id: 'rouvy',        name: 'Rouvy',                 category: 'training',   provider: null,        color: '#00A651', logoInitial: 'RV', logo: 'rouvy',         description: 'Simulation de routes réelles' },
  { id: 'mywhoosh',     name: 'MyWhoosh',              category: 'training',   provider: null,        color: '#FF6B00', logoInitial: 'MW', logo: 'mywhoosh',      description: 'Cyclisme virtuel compétitif' },

  // Récupération & Santé
  { id: 'whoop',        name: 'Whoop',                 category: 'recovery',   provider: null,        color: '#00C8A0', logoInitial: 'WP', logo: 'whoop',         description: 'Récupération & strain quotidien' },
  { id: 'oura',         name: 'Oura',                  category: 'recovery',   provider: null,        color: '#B8A882', logoInitial: 'OR', logo: 'oura',          description: 'Bague connectée & sommeil' },
  { id: 'hrv4training', name: 'HRV4Training',          category: 'recovery',   provider: null,        color: '#FF3366', logoInitial: 'H4', logo: 'hrv4training',  description: 'Suivi HRV via smartphone' },
  { id: 'elitehrv',     name: 'Elite HRV',             category: 'recovery',   provider: null,        color: '#4A90D9', logoInitial: 'EH', logo: 'elitehrv',      description: 'Analyse variabilité cardiaque' },
  { id: 'welltory',     name: 'Welltory',              category: 'recovery',   provider: null,        color: '#7C5CBF', logoInitial: 'WT', logo: 'welltory',      description: 'Stress & énergie quotidiens' },
  { id: 'apple-health', name: 'Apple Health',          category: 'recovery',   provider: null,        color: '#FF2D55', logoInitial: 'AH', logo: 'applehealth',   description: 'Hub santé iOS centralisé' },
  { id: 'google-fit',   name: 'Google Fit',            category: 'recovery',   provider: null,        color: '#4285F4', logoInitial: 'GF', logo: 'googlefit',     description: 'Hub santé Android' },
  { id: 'samsung',      name: 'Samsung Health',        category: 'recovery',   provider: null,        color: '#1428A0', logoInitial: 'SH', logo: 'samsunghealth', description: 'Écosystème Galaxy' },

  // Balance & Corps
  { id: 'withings',     name: 'Withings',              category: 'body',       provider: 'withings',  color: '#FF6600', logoInitial: 'WI', logo: 'withings',      description: 'Balance, composition corporelle & sommeil' },
  { id: 'fitbit',       name: 'Fitbit',                category: 'body',       provider: null,        color: '#00B0B9', logoInitial: 'FB', logo: 'fitbit',        description: 'Bracelets & composition' },
  { id: 'garmin-h',     name: 'Garmin Health',         category: 'body',       provider: null,        color: '#007CC3', logoInitial: 'GH', logo: null,            description: 'Données santé Garmin' },
  { id: 'zepp',         name: 'Zepp / Mi Fit',         category: 'body',       provider: null,        color: '#FF6900', logoInitial: 'ZP', logo: 'zepp',          description: 'Wearables Amazfit & Xiaomi' },
  { id: 'renpho',       name: 'Renpho',                category: 'body',       provider: null,        color: '#00A8FF', logoInitial: 'RP', logo: 'renpho',        description: 'Balances connectées abordables' },
  { id: 'eufy',         name: 'Eufy Smart Scale',      category: 'body',       provider: null,        color: '#2C7BE5', logoInitial: 'EU', logo: 'eufy',          description: 'Balances Eufy intelligentes' },
  { id: 'tanita',       name: 'Tanita',                category: 'body',       provider: null,        color: '#003087', logoInitial: 'TN', logo: 'tanita',        description: 'Analyseurs corporels pro' },
  { id: 'omron',        name: 'Omron',                 category: 'body',       provider: null,        color: '#C40000', logoInitial: 'OM', logo: 'omron',         description: 'Tensiomètres & cardio' },

  // Nutrition
  { id: 'myfitnesspal', name: 'MyFitnessPal',          category: 'nutrition',  provider: null,        color: '#005594', logoInitial: 'MF', logo: 'myfitnesspal',  description: 'Suivi calorique & macro' },
  { id: 'cronometer',   name: 'Cronometer',            category: 'nutrition',  provider: null,        color: '#F29200', logoInitial: 'CR', logo: 'cronometer',    description: 'Micronutriments précis' },
  { id: 'yazio',        name: 'Yazio',                 category: 'nutrition',  provider: null,        color: '#EC6F1A', logoInitial: 'YZ', logo: 'yazio',         description: 'Calories & recettes saines' },
  { id: 'lifesum',      name: 'Lifesum',               category: 'nutrition',  provider: null,        color: '#8CC63F', logoInitial: 'LS', logo: 'lifesum',       description: 'Plans nutritionnels guidés' },
  { id: 'macrofactor',  name: 'Macrofactor',           category: 'nutrition',  provider: null,        color: '#6366F1', logoInitial: 'MC', logo: 'macrofactor',   description: 'Macros adaptatifs intelligents' },
  { id: 'carbon',       name: 'Carbon Diet Coach',     category: 'nutrition',  provider: null,        color: '#1C1C1E', logoInitial: 'CD', logo: null,            description: 'Coaching nutritionnel IA' },

  // Biométrie & Capteurs
  { id: 'stryd',        name: 'Stryd',                 category: 'biometrics', provider: null,        color: '#FF5722', logoInitial: 'SY', logo: 'stryd',         description: 'Puissance de course running' },
  { id: 'core',         name: 'Core',                  category: 'biometrics', provider: null,        color: '#00C8E0', logoInitial: 'CR', logo: 'core',          description: 'Température corporelle core' },
  { id: 'supersapiens', name: 'Supersapiens',          category: 'biometrics', provider: null,        color: '#00E5B4', logoInitial: 'SS', logo: 'supersapiens',  description: 'Glucose sanguin en continu' },
  { id: 'levels',       name: 'Levels',                category: 'biometrics', provider: null,        color: '#111827', logoInitial: 'LV', logo: 'levels',        description: 'Métabolisme & énergie' },
  { id: 'dexcom',       name: 'Dexcom',                category: 'biometrics', provider: null,        color: '#00A4E0', logoInitial: 'DX', logo: 'dexcom',        description: 'Capteur glucose G7' },
  { id: 'abbott',       name: 'Abbott Freestyle Libre',category: 'biometrics', provider: null,        color: '#E31837', logoInitial: 'AB', logo: 'abbott',        description: 'Libre 3 MCG' },

  // Sommeil
  { id: 'sleepcycle',   name: 'Sleep Cycle',           category: 'sleep',      provider: null,        color: '#5B4FCF', logoInitial: 'SC', logo: 'sleepcycle',    description: 'Réveil intelligent & cycles' },
  { id: 'pillow',       name: 'Pillow',                category: 'sleep',      provider: null,        color: '#FF9500', logoInitial: 'PI', logo: null,            description: 'Analyse sommeil Apple Watch' },
  { id: 'autosleep',    name: 'AutoSleep',             category: 'sleep',      provider: null,        color: '#FF2D55', logoInitial: 'AS', logo: null,            description: 'Suivi automatique sommeil' },
]

// Providers with working OAuth flow
const OAUTH_PROVIDERS = new Set(['strava', 'wahoo', 'withings', 'polar'])

// Blue accent used consistently across all CTAs
const ACCENT = '#5b6fff'

// ── Spinner ─────────────────────────────────────────────────────

function Spinner({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
      stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 2a10 10 0 0110 10" opacity={0.25} />
      <path d="M12 2a10 10 0 0110 10" />
    </svg>
  )
}

// ── RefreshIcon ─────────────────────────────────────────────────

function RefreshIcon({ size = 13, spinning = false }: { size?: number; spinning?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
      style={{ flexShrink: 0, animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

// ── AppLogo ─────────────────────────────────────────────────────

function AppLogo({ app, size = 44, logoErrors, onError }: {
  app: AppDef; size?: number; logoErrors: Set<string>; onError: (id: string) => void
}) {
  const hasError = logoErrors.has(app.id)
  const showLogo = app.logo !== null && !hasError
  const radius = 10
  const imgSize = Math.round(size * 0.72)
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
      background: showLogo ? '#fff' : app.color,
      border: showLogo ? '1px solid rgba(0,0,0,0.08)' : 'none',
      boxShadow: showLogo ? '0 1px 6px rgba(0,0,0,0.10)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: showLogo ? 4 : 0,
      boxSizing: 'border-box' as const,
    }}>
      {showLogo ? (
        <img
          src={`/logos/apps/${app.logo}.png`}
          width={imgSize} height={imgSize}
          alt={app.name}
          onError={() => onError(app.id)}
          style={{ objectFit: 'contain', display: 'block', width: '100%', height: '100%' }}
        />
      ) : (
        <span style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: Math.round(size * 0.27), color: '#fff', letterSpacing: '0.02em',
        }}>
          {app.logoInitial}
        </span>
      )}
    </div>
  )
}

// ── StatusBadge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.13)', color: '#22c55e', fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 4px #22c55e' }} />
      Connecté
    </span>
  )
  if (status === 'pending') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, background: 'rgba(91,111,255,0.12)', color: ACCENT, fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
      <Spinner size={8} color={ACCENT} />
      En cours
    </span>
  )
  if (status === 'available') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
      Disponible
    </span>
  )
  // coming
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, background: 'rgba(249,115,22,0.10)', color: '#f97316', fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
      En cours d&apos;intégration
    </span>
  )
}

// ── AppRow ──────────────────────────────────────────────────────

function AppRow({ app, effectiveStatus, lastSync, isSyncing, isHovered, logoErrors, onLogoError, onMouseEnter, onMouseLeave, onConnect, onDisconnect, onSync, isMobile }: {
  app: AppDef; effectiveStatus: ConnectionStatus; lastSync: string | null
  isSyncing: boolean; isHovered: boolean; logoErrors: Set<string>
  onLogoError: (id: string) => void; onMouseEnter: () => void; onMouseLeave: () => void
  onConnect: () => void; onDisconnect: () => void; onSync: () => void; isMobile: boolean
}) {
  const [syncHov, setSyncHov] = useState(false)
  const [disconnectHov, setDisconnectHov] = useState(false)
  const [connectHov, setConnectHov] = useState(false)

  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: isHovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 14,
        flexDirection: 'row',
        transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
        transform: isHovered ? 'translateY(-1px)' : 'none',
        boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.10)' : 'none',
      }}>

      {/* Logo + Name + Description */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <AppLogo app={app} size={isMobile ? 36 : 44} logoErrors={logoErrors} onError={onLogoError} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 500, fontSize: isMobile ? 13 : 14, color: 'var(--text)', lineHeight: 1.3, marginBottom: isMobile ? 0 : 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {app.name}
          </div>
          {!isMobile && (
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {app.description}
            </div>
          )}
        </div>
      </div>

      {/* Status + last sync */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <StatusBadge status={effectiveStatus} />
        {!isMobile && effectiveStatus === 'connected' && lastSync && (
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-dim)' }}>{lastSync}</span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>

        {effectiveStatus === 'connected' && (
          <>
            {/* Sync */}
            <button onClick={onSync} disabled={isSyncing}
              onMouseEnter={() => setSyncHov(true)} onMouseLeave={() => setSyncHov(false)}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: `1px solid ${syncHov && !isSyncing ? 'var(--border-mid)' : 'var(--border)'}`,
                background: syncHov && !isSyncing ? 'var(--bg-hover)' : 'transparent',
                color: isSyncing ? 'var(--text-dim)' : 'var(--text-mid)',
                fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                cursor: isSyncing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.14s, border-color 0.14s',
                whiteSpace: 'nowrap',
              }}>
              {isSyncing
                ? <Spinner size={11} color="var(--text-dim)" />
                : <RefreshIcon size={10} />
              }
              Sync
            </button>
            {/* Disconnect */}
            <button onClick={onDisconnect}
              onMouseEnter={() => setDisconnectHov(true)} onMouseLeave={() => setDisconnectHov(false)}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: 'none',
                background: disconnectHov ? 'rgba(239,68,68,0.08)' : 'transparent',
                color: disconnectHov ? '#ef4444' : 'var(--text-dim)',
                fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.14s, color 0.14s',
                whiteSpace: 'nowrap',
              }}>
              Déconnecter
            </button>
          </>
        )}

        {effectiveStatus === 'pending' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            <Spinner size={11} color="var(--text-dim)" />
            Autorisation…
          </span>
        )}

        {effectiveStatus === 'available' && (
          <button onClick={onConnect}
            onMouseEnter={() => setConnectHov(true)} onMouseLeave={() => setConnectHov(false)}
            style={{
              padding: '5px 12px', borderRadius: 7,
              border: `1px solid ${ACCENT}`,
              background: connectHov ? ACCENT : 'transparent',
              color: connectHov ? '#fff' : ACCENT,
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Connecter
          </button>
        )}

        {effectiveStatus === 'coming' && (
          <button disabled style={{
            padding: '5px 10px', borderRadius: 7,
            border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-dim)',
            fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
            cursor: 'default', opacity: 0.55, whiteSpace: 'nowrap',
          }}>
            Bientôt disponible
          </button>
        )}
      </div>
    </div>
  )
}

// ── PillFilter ──────────────────────────────────────────────────

function PillFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '6px 14px', borderRadius: 20,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? ACCENT : hov ? 'var(--bg-hover)' : 'var(--bg-card2)',
        color: active ? '#fff' : hov ? 'var(--text)' : 'var(--text-dim)',
        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'background 0.14s, color 0.14s',
        whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  )
}

// ── ConnectModal ─────────────────────────────────────────────────

function ConnectModal({ modal, app, logoErrors, onLogoError, onCancel, onContinue }: {
  modal: ConnectModalState; app: AppDef; logoErrors: Set<string>; onLogoError: (id: string) => void
  onCancel: () => void; onContinue: () => void
}) {
  const [cancelHov, setCancelHov] = useState(false)
  const [continueHov, setContinueHov] = useState(false)
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border-mid)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, animation: 'fadeUp 0.22s ease forwards' }}>
        {modal.step === 'loading' ? (
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Spinner size={36} color={ACCENT} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', textAlign: 'center' }}>
              Redirection vers {app.name}…
            </span>
          </div>
        ) : (
          <>
            <AppLogo app={app} size={56} logoErrors={logoErrors} onError={onLogoError} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 8 }}>
                Connexion à {app.name}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0, maxWidth: 320 }}>
                Tu vas être redirigé vers {app.name} pour autoriser l&apos;accès à tes données. THW Coach ne stocke jamais tes identifiants.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
              <button onClick={onCancel}
                onMouseEnter={() => setCancelHov(true)} onMouseLeave={() => setCancelHov(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border-mid)', background: cancelHov ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-mid)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.14s' }}>
                Annuler
              </button>
              <button onClick={onContinue}
                onMouseEnter={() => setContinueHov(true)} onMouseLeave={() => setContinueHov(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: continueHov ? '#4a5bef' : ACCENT, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 14px rgba(91,111,255,0.35)', transition: 'background 0.14s' }}>
                Continuer
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Toast ───────────────────────────────────────────────────────

function Toast({ message, type = 'info', onDismiss }: { message: string; type?: 'info' | 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t) }, [onDismiss])
  const color = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : ACCENT
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 24, zIndex: 2000, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: '11px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.20)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeUp 0.2s ease forwards', maxWidth: 360 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
      {message}
    </div>
  )
}

// ── Inner page (needs useSearchParams) ───────────────────────────

function ConnectionsInner() {
  const searchParams = useSearchParams()

  const [connections, setConnections] = useState<ConnectionInfo[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [syncingAll, setSyncingAll] = useState(false)
  const [connectModal, setConnectModal] = useState<ConnectModalState | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryId>('training')
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'info'|'success'|'error' }[]>([])
  const [toastCounter, setToastCounter] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchFocused, setSearchFocused] = useState(false)
  const [syncAllHov, setSyncAllHov] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // IntersectionObserver — highlight active sidebar item while scrolling
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    CATEGORIES.forEach(cat => {
      const el = document.getElementById(SECTION_ID[cat.id])
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat.id) },
        { threshold: 0.25, rootMargin: '-80px 0px -60% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  function addToast(message: string, type: 'info'|'success'|'error' = 'info') {
    const id = toastCounter + 1
    setToastCounter(id)
    setToasts(prev => [...prev, { id, message, type }])
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Load real connection status
  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/oauth/status')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connected ?? [])
      }
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => { void loadStatus() }, [loadStatus])

  // Check OAuth redirect result
  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const provider = searchParams.get('provider')
    if (oauth === 'connected' && provider) {
      const app = APPS.find(a => a.provider === provider)
      addToast(`${app?.name ?? provider} connecté avec succès`, 'success')
      void loadStatus()
      window.history.replaceState({}, '', '/connections')
    } else if (oauth === 'denied') {
      addToast('Connexion annulée', 'info')
      window.history.replaceState({}, '', '/connections')
    } else if (oauth === 'error') {
      addToast('Erreur lors de la connexion', 'error')
      window.history.replaceState({}, '', '/connections')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive status for each app from real connections
  const connectedProviders = useMemo(() => {
    const map: Record<string, ConnectionInfo> = {}
    for (const c of connections) map[c.provider] = c
    return map
  }, [connections])

  function getEffectiveStatus(app: AppDef): ConnectionStatus {
    if (app.provider && connectedProviders[app.provider]) return 'connected'
    if (app.provider && OAUTH_PROVIDERS.has(app.provider)) return 'available'
    if (!app.provider) return 'coming'
    return 'available'
  }

  function getLastSync(app: AppDef): string | null {
    if (!app.provider) return null
    const info = connectedProviders[app.provider]
    if (!info) return null
    return formatRelative(info.last_used_at ?? info.updated_at)
  }

  const handleLogoError = useCallback((id: string) => {
    setLogoErrors(prev => new Set([...prev, id]))
  }, [])

  const handleSync = useCallback(async (app: AppDef) => {
    if (!app.provider) return
    setSyncingIds(prev => new Set([...prev, app.id]))
    try {
      const res = await fetch(`/api/sync/${app.provider}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        addToast(`${app.name} synchronisé — ${data.synced ?? 0} éléments`, 'success')
        await loadStatus()
      } else {
        addToast(`Erreur sync ${app.name}: ${data.error ?? ''}`, 'error')
      }
    } catch {
      addToast(`Erreur réseau pour ${app.name}`, 'error')
    } finally {
      setSyncingIds(prev => { const s = new Set(prev); s.delete(app.id); return s })
    }
  }, [loadStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSyncAll = useCallback(async () => {
    const toSync = APPS.filter(a => a.provider && connectedProviders[a.provider])
    if (!toSync.length) { addToast('Aucune application connectée', 'info'); return }
    setSyncingAll(true)
    const ids = new Set(toSync.map(a => a.id))
    setSyncingIds(ids)
    try {
      const results = await Promise.allSettled(
        toSync.map(app => fetch(`/api/sync/${app.provider}`, { method: 'POST' }).then(r => r.json().then(d => ({ app, ok: r.ok, data: d }))))
      )
      let synced = 0
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.ok) synced += r.value.data.synced ?? 0
      }
      addToast(`Synchronisation terminée — ${synced} éléments importés`, 'success')
      await loadStatus()
    } catch {
      addToast('Erreur lors de la synchronisation', 'error')
    } finally {
      setSyncingAll(false)
      setSyncingIds(new Set())
    }
  }, [connectedProviders, loadStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDisconnect = useCallback(async (app: AppDef) => {
    if (!app.provider) return
    try {
      const res = await fetch(`/api/oauth/disconnect?provider=${app.provider}`, { method: 'POST' })
      if (res.ok) {
        addToast(`${app.name} déconnecté`, 'info')
        await loadStatus()
      } else {
        addToast(`Erreur déconnexion ${app.name}`, 'error')
      }
    } catch {
      addToast(`Erreur réseau`, 'error')
    }
  }, [loadStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectClick = useCallback((appId: string) => {
    setConnectModal({ appId, step: 'confirm' })
  }, [])

  const handleModalContinue = useCallback(() => {
    if (!connectModal) return
    const app = APPS.find(a => a.id === connectModal.appId)
    if (!app?.provider) return
    setConnectModal(prev => prev ? { ...prev, step: 'loading' } : null)
    setTimeout(() => {
      window.location.href = `/api/oauth/connect?provider=${app.provider}`
    }, 600)
  }, [connectModal])

  const filteredApps = useMemo(() => {
    return APPS.filter(app => {
      const matchSearch = search === '' || app.name.toLowerCase().includes(search.toLowerCase())
      const currentStatus = getEffectiveStatus(app)
      const matchFilter = statusFilter === 'all' || currentStatus === statusFilter
      return matchSearch && matchFilter
    })
  }, [search, statusFilter, connectedProviders]) // eslint-disable-line react-hooks/exhaustive-deps

  const connectedCount = useMemo(
    () => APPS.filter(a => a.provider && connectedProviders[a.provider]).length,
    [connectedProviders]
  )

  const modalApp = connectModal ? APPS.find(a => a.id === connectModal.appId) : null

  const filterPills: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'Tout' },
    { id: 'connected', label: 'Connecté' },
    { id: 'available', label: 'Disponible' },
    { id: 'coming',    label: 'En cours' },
  ]

  return (
    <>
      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ padding: isMobile ? '24px 16px 0' : '32px 32px 0', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: isMobile ? 20 : 24, color: 'var(--text)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Connexions
              </h1>
              {!isMobile && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-mid)', marginTop: 5, marginBottom: 0, maxWidth: 500, lineHeight: 1.6 }}>
                  Connecte tes applications pour centraliser tes données : entraînement, récupération, nutrition et santé.
                </p>
              )}
              {!loadingStatus && connectedCount > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#22c55e' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
                  {connectedCount} app{connectedCount > 1 ? 's' : ''} connectée{connectedCount > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Sync All */}
            <button onClick={handleSyncAll} disabled={syncingAll || loadingStatus || connectedCount === 0}
              onMouseEnter={() => setSyncAllHov(true)} onMouseLeave={() => setSyncAllHov(false)}
              style={{
                padding: isMobile ? '8px 14px' : '10px 18px',
                height: isMobile ? 40 : 'auto',
                width: isMobile ? '100%' : 'auto',
                borderRadius: 10, border: 'none',
                background: (syncingAll || connectedCount === 0) ? 'var(--bg-card2)' : syncAllHov ? '#4a5bef' : ACCENT,
                color: (syncingAll || connectedCount === 0) ? 'var(--text-dim)' : '#fff',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 13,
                cursor: (syncingAll || connectedCount === 0) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: (syncingAll || connectedCount === 0) ? 'none' : '0 2px 16px rgba(91,111,255,0.30)',
                transition: 'background 0.18s',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              <RefreshIcon size={13} spinning={syncingAll} />
              {syncingAll ? 'Synchronisation...' : 'Synchroniser tout'}
            </button>
          </div>

          {/* ── Search + filters (sticky bar) ─────────────────── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', paddingTop: 8, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: searchFocused ? ACCENT : 'var(--text-dim)', display: 'flex', pointerEvents: 'none', transition: 'color 0.14s' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input type="text" placeholder="Rechercher une application..." value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 34px',
                    borderRadius: 12,
                    border: `1px solid ${searchFocused ? `${ACCENT}80` : 'var(--border)'}`,
                    background: 'var(--input-bg)', color: 'var(--text)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box' as const,
                    boxShadow: searchFocused ? `0 0 0 3px ${ACCENT}18` : 'none',
                    transition: 'border-color 0.14s, box-shadow 0.14s',
                  }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {filterPills.map(pill => (
                  <PillFilter key={pill.id} label={pill.label} active={statusFilter === pill.id} onClick={() => setStatusFilter(pill.id)} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, padding: isMobile ? '0 0 60px' : '0 32px 60px' }}>

          {/* Left sidebar (desktop only) */}
          {!isMobile && (
            <div style={{
              width: 196, flexShrink: 0,
              position: 'sticky', top: 100, alignSelf: 'flex-start',
              paddingTop: 28, paddingRight: 16,
            }}>
              {CATEGORIES.map(cat => {
                const catConnected = APPS.filter(a => a.category === cat.id && a.provider && connectedProviders[a.provider]).length
                const isActive = activeCategory === cat.id
                return (
                  <button key={cat.id}
                    onClick={() => scrollToSection(cat.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '7px 10px', borderRadius: 8, border: 'none',
                      borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                      background: isActive ? `${ACCENT}12` : 'transparent',
                      color: isActive ? ACCENT : 'var(--text-dim)',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer', marginBottom: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      transition: 'background 0.14s, color 0.14s',
                    }}>
                    <span style={{ lineHeight: 1.3 }}>{cat.label}</span>
                    {catConnected > 0 && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '1px 5px', borderRadius: 8, flexShrink: 0 }}>
                        {catConnected}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Mobile: horizontal category pills */}
          {isMobile && (
            <div style={{ overflowX: 'auto', display: 'flex', gap: 8, padding: '14px 16px 0', scrollbarWidth: 'none' as const, width: '100%', flexShrink: 0 }}>
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id
                return (
                  <button key={cat.id}
                    onClick={() => scrollToSection(cat.id)}
                    style={{
                      flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                      border: isActive ? 'none' : '1px solid var(--border-mid)',
                      background: isActive ? ACCENT : 'var(--bg-card)',
                      color: isActive ? '#fff' : 'var(--text-dim)',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                    {cat.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Right content ──────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 24, paddingLeft: isMobile ? 16 : 0, paddingRight: isMobile ? 16 : 0 }}>
            {filteredApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                Aucune application ne correspond à ta recherche.
              </div>
            ) : (
              CATEGORIES.map(cat => {
                const catApps = filteredApps.filter(a => a.category === cat.id)
                if (catApps.length === 0) return null
                const connCount = catApps.filter(a => a.provider && connectedProviders[a.provider]).length
                return (
                  <section key={cat.id} id={SECTION_ID[cat.id]} style={{ paddingTop: 32, paddingBottom: 8 }}>

                    {/* Section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 11,
                        letterSpacing: '0.10em', textTransform: 'uppercase' as const,
                        color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {cat.label}
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {connCount > 0 && (
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 7px', borderRadius: 10 }}>
                            {connCount} connectée{connCount > 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-card2)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 10 }}>
                          {catApps.length} app{catApps.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {catApps.map(app => {
                      const effStatus = getEffectiveStatus(app)
                      return (
                        <AppRow key={app.id} app={app} effectiveStatus={effStatus}
                          lastSync={getLastSync(app)}
                          isSyncing={syncingIds.has(app.id)}
                          isHovered={hoveredId === app.id}
                          logoErrors={logoErrors} onLogoError={handleLogoError}
                          onMouseEnter={() => setHoveredId(app.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onConnect={() => app.provider && OAUTH_PROVIDERS.has(app.provider) ? handleConnectClick(app.id) : undefined}
                          onDisconnect={() => handleDisconnect(app)}
                          onSync={() => handleSync(app)}
                          isMobile={isMobile} />
                      )
                    })}
                  </section>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {connectModal && modalApp && (
        <ConnectModal modal={connectModal} app={modalApp} logoErrors={logoErrors} onLogoError={handleLogoError}
          onCancel={() => setConnectModal(null)} onContinue={handleModalContinue} />
      )}

      {/* Toasts */}
      {toasts.map((t, i) => (
        <div key={t.id} style={{ position: 'fixed', bottom: 28 + i * 60, right: 24, zIndex: 2000 + i }}>
          <Toast message={t.message} type={t.type} onDismiss={() => dismissToast(t.id)} />
        </div>
      ))}
    </>
  )
}

// ── Page wrapper (Suspense for useSearchParams) ──────────────────

export default function ConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsInner />
    </Suspense>
  )
}
