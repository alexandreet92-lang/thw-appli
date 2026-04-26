'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, useCallback } from 'react'

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
  status: ConnectionStatus
  color: string
  logoInitial: string
  simpleIconSlug?: string
  description: string
  lastSync?: string
}

interface Category {
  id: CategoryId
  label: string
}

interface ConnectModalState {
  appId: string
  step: 'confirm' | 'loading'
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

// ── Apps ────────────────────────────────────────────────────────

const APPS: AppDef[] = [
  // Entraînement
  { id: 'strava',       name: 'Strava',               category: 'training',   status: 'connected', color: '#FC4C02', logoInitial: 'ST', simpleIconSlug: 'strava',      description: 'Suivi GPS running & cycling',         lastSync: 'Il y a 2h' },
  { id: 'garmin',       name: 'Garmin Connect',        category: 'training',   status: 'available', color: '#007CC3', logoInitial: 'GC', simpleIconSlug: 'garmin',      description: 'Montres et capteurs Garmin' },
  { id: 'wahoo',        name: 'Wahoo',                 category: 'training',   status: 'available', color: '#E8002D', logoInitial: 'WH', simpleIconSlug: 'wahoo',       description: 'Capteurs & home trainers' },
  { id: 'polar',        name: 'Polar',                 category: 'training',   status: 'available', color: '#D9001B', logoInitial: 'PO', simpleIconSlug: 'polar',       description: 'Montres sport & cardiaque' },
  { id: 'suunto',       name: 'Suunto',                category: 'training',   status: 'available', color: '#E8002D', logoInitial: 'SU', simpleIconSlug: 'suunto',      description: 'Montres outdoor & navigation' },
  { id: 'coros',        name: 'Coros',                 category: 'training',   status: 'available', color: '#1A1A1A', logoInitial: 'CO',                               description: 'Montres GPS performance' },
  { id: 'zwift',        name: 'Zwift',                 category: 'training',   status: 'available', color: '#F05C2B', logoInitial: 'ZW', simpleIconSlug: 'zwift',       description: 'Cyclisme & course virtuelle' },
  { id: 'rouvy',        name: 'Rouvy',                 category: 'training',   status: 'coming',    color: '#00A651', logoInitial: 'RV',                               description: 'Simulation de routes réelles' },
  { id: 'mywhoosh',     name: 'MyWhoosh',              category: 'training',   status: 'coming',    color: '#FF6B00', logoInitial: 'MW',                               description: 'Cyclisme virtuel compétitif' },

  // Récupération & Santé
  { id: 'whoop',        name: 'Whoop',                 category: 'recovery',   status: 'available', color: '#00C8A0', logoInitial: 'WP', simpleIconSlug: 'whoop',       description: 'Récupération & strain quotidien' },
  { id: 'oura',         name: 'Oura',                  category: 'recovery',   status: 'available', color: '#B8A882', logoInitial: 'OR', simpleIconSlug: 'ouraring',    description: 'Bague connectée & sommeil' },
  { id: 'hrv4training', name: 'HRV4Training',          category: 'recovery',   status: 'coming',    color: '#FF3366', logoInitial: 'H4',                               description: 'Suivi HRV via smartphone' },
  { id: 'elitehrv',     name: 'Elite HRV',             category: 'recovery',   status: 'coming',    color: '#4A90D9', logoInitial: 'EH',                               description: 'Analyse variabilité cardiaque' },
  { id: 'welltory',     name: 'Welltory',              category: 'recovery',   status: 'coming',    color: '#7C5CBF', logoInitial: 'WT',                               description: 'Stress & énergie quotidiens' },
  { id: 'apple-health', name: 'Apple Health',          category: 'recovery',   status: 'available', color: '#FF2D55', logoInitial: 'AH', simpleIconSlug: 'apple',       description: 'Hub santé iOS centralisé' },
  { id: 'google-fit',   name: 'Google Fit',            category: 'recovery',   status: 'available', color: '#4285F4', logoInitial: 'GF', simpleIconSlug: 'googlefit',   description: 'Hub santé Android' },
  { id: 'samsung',      name: 'Samsung Health',        category: 'recovery',   status: 'coming',    color: '#1428A0', logoInitial: 'SH', simpleIconSlug: 'samsung',     description: 'Écosystème Galaxy' },

  // Balance & Corps
  { id: 'withings',     name: 'Withings',              category: 'body',       status: 'available', color: '#FF6600', logoInitial: 'WI', simpleIconSlug: 'withings',    description: 'Balances & montres santé' },
  { id: 'fitbit',       name: 'Fitbit',                category: 'body',       status: 'available', color: '#00B0B9', logoInitial: 'FB', simpleIconSlug: 'fitbit',      description: 'Bracelets & composition' },
  { id: 'garmin-h',     name: 'Garmin Health',         category: 'body',       status: 'available', color: '#007CC3', logoInitial: 'GH', simpleIconSlug: 'garmin',      description: 'Données santé Garmin' },
  { id: 'zepp',         name: 'Zepp / Mi Fit',         category: 'body',       status: 'coming',    color: '#FF6900', logoInitial: 'ZP', simpleIconSlug: 'zepp',        description: 'Wearables Amazfit & Xiaomi' },
  { id: 'renpho',       name: 'Renpho',                category: 'body',       status: 'coming',    color: '#00A8FF', logoInitial: 'RP',                               description: 'Balances connectées abordables' },
  { id: 'eufy',         name: 'Eufy Smart Scale',      category: 'body',       status: 'coming',    color: '#2C7BE5', logoInitial: 'EU',                               description: 'Balances Eufy intelligentes' },
  { id: 'tanita',       name: 'Tanita',                category: 'body',       status: 'coming',    color: '#003087', logoInitial: 'TN',                               description: 'Analyseurs corporels pro' },
  { id: 'omron',        name: 'Omron',                 category: 'body',       status: 'coming',    color: '#C40000', logoInitial: 'OM',                               description: 'Tensiomètres & cardio' },
  { id: 'goodvibes',    name: 'Goodvibes',             category: 'body',       status: 'coming',    color: '#6C3FC5', logoInitial: 'GV',                               description: 'Bien-être & habitudes' },

  // Nutrition
  { id: 'myfitnesspal', name: 'MyFitnessPal',          category: 'nutrition',  status: 'available', color: '#005594', logoInitial: 'MF', simpleIconSlug: 'myfitnesspal', description: 'Suivi calorique & macro' },
  { id: 'cronometer',   name: 'Cronometer',            category: 'nutrition',  status: 'available', color: '#F29200', logoInitial: 'CR', simpleIconSlug: 'cronometer',  description: 'Micronutriments précis' },
  { id: 'yazio',        name: 'Yazio',                 category: 'nutrition',  status: 'coming',    color: '#EC6F1A', logoInitial: 'YZ',                               description: 'Calories & recettes saines' },
  { id: 'lifesum',      name: 'Lifesum',               category: 'nutrition',  status: 'coming',    color: '#8CC63F', logoInitial: 'LS',                               description: 'Plans nutritionnels guidés' },
  { id: 'macrofactor',  name: 'Macrofactor',           category: 'nutrition',  status: 'coming',    color: '#6366F1', logoInitial: 'MC',                               description: 'Macros adaptatifs intelligents' },
  { id: 'carbon',       name: 'Carbon Diet Coach',     category: 'nutrition',  status: 'coming',    color: '#1C1C1E', logoInitial: 'CD',                               description: 'Coaching nutritionnel IA' },

  // Biométrie & Capteurs
  { id: 'stryd',        name: 'Stryd',                 category: 'biometrics', status: 'available', color: '#FF5722', logoInitial: 'SY',                               description: 'Puissance de course running' },
  { id: 'core',         name: 'Core',                  category: 'biometrics', status: 'coming',    color: '#00C8E0', logoInitial: 'CR',                               description: 'Température corporelle core' },
  { id: 'supersapiens', name: 'Supersapiens',          category: 'biometrics', status: 'coming',    color: '#00E5B4', logoInitial: 'SS',                               description: 'Glucose sanguin en continu' },
  { id: 'levels',       name: 'Levels',                category: 'biometrics', status: 'coming',    color: '#111827', logoInitial: 'LV',                               description: 'Métabolisme & énergie' },
  { id: 'dexcom',       name: 'Dexcom',                category: 'biometrics', status: 'coming',    color: '#00A4E0', logoInitial: 'DX', simpleIconSlug: 'dexcom',      description: 'Capteur glucose G7' },
  { id: 'abbott',       name: 'Abbott Freestyle Libre',category: 'biometrics', status: 'coming',    color: '#E31837', logoInitial: 'AB',                               description: 'Libre 3 MCG' },

  // Sommeil
  { id: 'sleepcycle',   name: 'Sleep Cycle',           category: 'sleep',      status: 'available', color: '#5B4FCF', logoInitial: 'SC',                               description: 'Réveil intelligent & cycles' },
  { id: 'pillow',       name: 'Pillow',                category: 'sleep',      status: 'coming',    color: '#FF9500', logoInitial: 'PI',                               description: 'Analyse sommeil Apple Watch' },
  { id: 'autosleep',    name: 'AutoSleep',             category: 'sleep',      status: 'coming',    color: '#FF2D55', logoInitial: 'AS',                               description: 'Suivi automatique sommeil' },
]

// ── Spinner ─────────────────────────────────────────────────────

function Spinner({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
      stroke={color} strokeWidth={2.5} strokeLinecap="round"
    >
      <path d="M12 2a10 10 0 0110 10" opacity={0.25} />
      <path d="M12 2a10 10 0 0110 10" />
    </svg>
  )
}

// ── AppLogo ─────────────────────────────────────────────────────

function AppLogo({
  app,
  size = 48,
  logoErrors,
  onError,
}: {
  app: AppDef
  size?: number
  logoErrors: Set<string>
  onError: (id: string) => void
}) {
  const hasError = logoErrors.has(app.id)
  const showIcon = app.simpleIconSlug && !hasError
  const radius = size <= 48 ? 12 : 14

  return (
    <div style={{
      width: size, height: size,
      borderRadius: radius,
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {showIcon ? (
        <img
          src={`https://cdn.simpleicons.org/${app.simpleIconSlug}/${app.color.replace('#', '')}`}
          width={Math.round(size * 0.54)}
          height={Math.round(size * 0.54)}
          alt={app.name}
          onError={() => onError(app.id)}
          style={{ objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <div style={{
          width: size, height: size,
          background: app.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: Math.round(size * 0.27), color: '#fff',
          letterSpacing: '0.02em',
        }}>
          {app.logoInitial}
        </div>
      )}
    </div>
  )
}

// ── StatusBadge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 20,
        background: 'rgba(34,197,94,0.13)',
        color: '#22c55e',
        fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#22c55e', flexShrink: 0,
          boxShadow: '0 0 4px #22c55e',
        }} />
        Connecté
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px', borderRadius: 20,
        background: 'rgba(249,115,22,0.12)',
        color: '#f97316',
        fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        <Spinner size={8} color="#f97316" />
        En cours de connexion
      </span>
    )
  }
  if (status === 'available') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 8px', borderRadius: 20,
        border: '1px solid var(--border-mid)',
        color: 'var(--text-dim)',
        fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        Disponible
      </span>
    )
  }
  // coming
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      border: '1px solid var(--border)',
      color: 'var(--text-dim)',
      fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
      whiteSpace: 'nowrap', opacity: 0.7,
    }}>
      En cours d&apos;intégration
    </span>
  )
}

// ── AppRow ──────────────────────────────────────────────────────

function AppRow({
  app,
  effectiveStatus,
  isSyncing,
  isHovered,
  logoErrors,
  onLogoError,
  onMouseEnter,
  onMouseLeave,
  onConnect,
  onDisconnect,
  onSync,
  isMobile,
}: {
  app: AppDef
  effectiveStatus: ConnectionStatus
  isSyncing: boolean
  isHovered: boolean
  logoErrors: Set<string>
  onLogoError: (id: string) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onConnect: () => void
  onDisconnect: () => void
  onSync: () => void
  isMobile: boolean
}) {
  const [syncHov, setSyncHov] = useState(false)
  const [disconnectHov, setDisconnectHov] = useState(false)
  const [connectHov, setConnectHov] = useState(false)

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: isMobile ? '12px 14px' : '11px 16px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: isHovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        marginBottom: 6,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 14,
        flexDirection: isMobile ? 'column' : 'row',
        transition: 'background 0.14s',
      }}
    >
      {/* Logo + Name/Desc row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <AppLogo app={app} size={48} logoErrors={logoErrors} onError={onLogoError} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: 13, color: 'var(--text)',
            lineHeight: 1.3, marginBottom: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {app.name}
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 11,
            color: 'var(--text-dim)', lineHeight: 1.4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {app.description}
          </div>
        </div>
      </div>

      {/* Status + last sync */}
      <div style={{
        minWidth: isMobile ? 'auto' : 140,
        textAlign: isMobile ? 'left' : 'right',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: isMobile ? 'center' : 'flex-end',
        gap: 4,
        flexShrink: 0,
      }}>
        <StatusBadge status={effectiveStatus} />
        {effectiveStatus === 'connected' && app.lastSync && (
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 10,
            color: 'var(--text-dim)',
          }}>
            {app.lastSync}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{
        minWidth: isMobile ? 'auto' : 130,
        display: 'flex', gap: 6,
        justifyContent: isMobile ? 'flex-start' : 'flex-end',
        flexShrink: 0,
      }}>
        {effectiveStatus === 'connected' && (
          <>
            <button
              onClick={onSync}
              disabled={isSyncing}
              onMouseEnter={() => setSyncHov(true)}
              onMouseLeave={() => setSyncHov(false)}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: `1px solid ${isSyncing ? 'var(--border)' : '#00c8e0'}`,
                background: syncHov && !isSyncing ? 'rgba(0,200,224,0.10)' : 'transparent',
                color: isSyncing ? 'var(--text-dim)' : '#00c8e0',
                fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                cursor: isSyncing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.14s',
                whiteSpace: 'nowrap',
              }}
            >
              {isSyncing ? <Spinner size={11} color="#00c8e0" /> : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              )}
              Sync
            </button>
            <button
              onClick={onDisconnect}
              onMouseEnter={() => setDisconnectHov(true)}
              onMouseLeave={() => setDisconnectHov(false)}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: '1px solid #ef4444',
                background: disconnectHov ? 'rgba(239,68,68,0.09)' : 'transparent',
                color: '#ef4444',
                fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.14s',
                whiteSpace: 'nowrap',
              }}
            >
              Déconnecter
            </button>
          </>
        )}

        {effectiveStatus === 'pending' && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            color: 'var(--text-dim)',
            fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}>
            <Spinner size={11} color="var(--text-dim)" />
            Autorisation en cours
          </span>
        )}

        {effectiveStatus === 'available' && (
          <button
            onClick={onConnect}
            onMouseEnter={() => setConnectHov(true)}
            onMouseLeave={() => setConnectHov(false)}
            style={{
              padding: '5px 12px', borderRadius: 7,
              border: `1px solid ${app.color}`,
              background: connectHov ? `${app.color}1a` : `${app.color}0d`,
              color: app.color,
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.14s',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Connecter
          </button>
        )}

        {effectiveStatus === 'coming' && (
          <button
            disabled
            style={{
              padding: '5px 10px', borderRadius: 7,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
              cursor: 'default', opacity: 0.6,
              whiteSpace: 'nowrap',
            }}
          >
            En cours d&apos;intégration
          </button>
        )}
      </div>
    </div>
  )
}

// ── PillFilter ──────────────────────────────────────────────────

function PillFilter({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`tab-btn${active ? ' active' : ''}`}
    >
      {label}
    </button>
  )
}

// ── ConnectModal ─────────────────────────────────────────────────

function ConnectModal({
  modal,
  app,
  logoErrors,
  onLogoError,
  onCancel,
  onContinue,
}: {
  modal: ConnectModalState
  app: AppDef
  logoErrors: Set<string>
  onLogoError: (id: string) => void
  onCancel: () => void
  onContinue: () => void
}) {
  const [cancelHov, setCancelHov] = useState(false)
  const [continueHov, setContinueHov] = useState(false)

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.50)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border-mid)',
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 16,
          animation: 'fadeUp 0.22s ease forwards',
        }}
      >
        {modal.step === 'loading' ? (
          <>
            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Spinner size={36} color="#00c8e0" />
              <span style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                color: 'var(--text-mid)', textAlign: 'center',
              }}>
                Redirection en cours...
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Logo */}
            <AppLogo app={app} size={56} logoErrors={logoErrors} onError={onLogoError} />

            {/* Title */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: 17, color: 'var(--text)', marginBottom: 8,
              }}>
                Connexion à {app.name}
              </div>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: 'var(--text-mid)', lineHeight: 1.6,
                margin: 0, maxWidth: 320,
              }}>
                Tu vas être redirigé vers {app.name} pour autoriser l&apos;accès à tes données
                d&apos;entraînement. THW Coach ne stocke jamais tes identifiants.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
              <button
                onClick={onCancel}
                onMouseEnter={() => setCancelHov(true)}
                onMouseLeave={() => setCancelHov(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1px solid var(--border-mid)',
                  background: cancelHov ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text-mid)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'background 0.14s',
                }}
              >
                Annuler
              </button>
              <button
                onClick={onContinue}
                onMouseEnter={() => setContinueHov(true)}
                onMouseLeave={() => setContinueHov(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: 'none',
                  background: continueHov
                    ? 'linear-gradient(135deg, #00b8ce, #4a5fff)'
                    : 'linear-gradient(135deg, #00c8e0, #5b6fff)',
                  color: '#fff',
                  fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 2px 14px rgba(0,200,224,0.3)',
                  transition: 'background 0.14s',
                }}
              >
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

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 2000,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-mid)',
      borderRadius: 12,
      padding: '11px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
      fontFamily: 'DM Sans, sans-serif', fontSize: 13,
      color: 'var(--text)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'fadeUp 0.2s ease forwards',
      maxWidth: 340,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#f97316', flexShrink: 0,
        boxShadow: '0 0 6px #f97316',
      }} />
      {message}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>(() => {
    const map: Record<string, ConnectionStatus> = {}
    APPS.forEach(a => { map[a.id] = a.status })
    return map
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [connectModal, setConnectModal] = useState<ConnectModalState | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryId>('training')
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set())
  const [pendingToast, setPendingToast] = useState<string | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [syncAllHov, setSyncAllHov] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // IntersectionObserver for active sidebar category
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    CATEGORIES.forEach(cat => {
      const el = document.getElementById(`section-${cat.id}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat.id) },
        { threshold: 0.3 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const handleLogoError = useCallback((id: string) => {
    setLogoErrors(prev => new Set([...prev, id]))
  }, [])

  const handleSync = useCallback((appId: string) => {
    setSyncingId(appId)
    setTimeout(() => setSyncingId(null), 1500)
  }, [])

  const handleSyncAll = useCallback(() => {
    setSyncingAll(true)
    setTimeout(() => setSyncingAll(false), 2000)
  }, [])

  const handleDisconnect = useCallback((appId: string) => {
    setStatuses(prev => ({ ...prev, [appId]: 'available' }))
  }, [])

  const handleConnectClick = useCallback((appId: string) => {
    setConnectModal({ appId, step: 'confirm' })
  }, [])

  const handleModalContinue = useCallback(() => {
    if (!connectModal) return
    setConnectModal(prev => prev ? { ...prev, step: 'loading' } : null)
    const appId = connectModal.appId
    setTimeout(() => {
      setConnectModal(null)
      setStatuses(prev => ({ ...prev, [appId]: 'pending' }))
      const app = APPS.find(a => a.id === appId)
      if (app) setPendingToast(`En attente d'autorisation de ${app.name}`)
    }, 2000)
  }, [connectModal])

  const handleModalCancel = useCallback(() => {
    setConnectModal(null)
  }, [])

  const filteredApps = useMemo(() => {
    return APPS.filter(app => {
      const matchSearch = search === '' || app.name.toLowerCase().includes(search.toLowerCase())
      const currentStatus = statuses[app.id] ?? app.status
      const matchFilter = statusFilter === 'all' || currentStatus === statusFilter
      return matchSearch && matchFilter
    })
  }, [search, statusFilter, statuses])

  const connectedCount = useMemo(
    () => APPS.filter(a => (statuses[a.id] ?? a.status) === 'connected').length,
    [statuses]
  )

  const modalApp = connectModal ? APPS.find(a => a.id === connectModal.appId) : null

  const filterPills: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'Tout' },
    { id: 'connected', label: 'Connecté' },
    { id: 'available', label: 'Disponible' },
    { id: 'pending',   label: 'En cours' },
  ]

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

        {/* ── Header ── */}
        <div style={{
          padding: isMobile ? '24px 16px 0' : '32px 32px 0',
          background: 'var(--bg)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            marginBottom: 20,
          }}>
            <div>
              <h1 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: 24, color: 'var(--text)',
                margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em',
              }}>
                Connexions
              </h1>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: 'var(--text-mid)', marginTop: 5, marginBottom: 0,
                maxWidth: 500, lineHeight: 1.6,
              }}>
                Connecte tes applications pour centraliser tes données : entraînement, récupération, nutrition et santé.
              </p>
              {connectedCount > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 8,
                  fontFamily: 'DM Mono, monospace', fontSize: 11,
                  color: '#22c55e',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#22c55e', display: 'inline-block',
                    boxShadow: '0 0 6px #22c55e',
                  }} />
                  {connectedCount} application{connectedCount > 1 ? 's' : ''} connectée{connectedCount > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              onMouseEnter={() => setSyncAllHov(true)}
              onMouseLeave={() => setSyncAllHov(false)}
              style={{
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: syncingAll
                  ? 'var(--bg-card2)'
                  : syncAllHov
                    ? 'linear-gradient(135deg, #00b8ce, #4a5fff)'
                    : 'linear-gradient(135deg, #00c8e0, #5b6fff)',
                color: syncingAll ? 'var(--text-dim)' : '#fff',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13,
                cursor: syncingAll ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: syncingAll ? 'none' : '0 2px 16px rgba(0,200,224,0.25)',
                transition: 'background 0.18s',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {syncingAll
                ? <Spinner size={13} color="#00c8e0" />
                : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                )
              }
              {syncingAll ? 'Synchronisation...' : 'Synchroniser tout'}
            </button>
          </div>

          {/* Search + filters */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'var(--bg)',
            paddingTop: 8, paddingBottom: 14,
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <span style={{
                  position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                  color: searchFocused ? '#00c8e0' : 'var(--text-dim)',
                  display: 'flex', pointerEvents: 'none',
                  transition: 'color 0.14s',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Rechercher une application..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 33px',
                    borderRadius: 10,
                    border: `1px solid ${searchFocused ? 'rgba(0,200,224,0.4)' : 'var(--border)'}`,
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                    outline: 'none', boxSizing: 'border-box',
                    boxShadow: searchFocused ? '0 0 0 3px rgba(0,200,224,0.10)' : 'none',
                    transition: 'border-color 0.14s, box-shadow 0.14s',
                  }}
                />
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {filterPills.map(pill => (
                  <PillFilter
                    key={pill.id}
                    label={pill.label}
                    active={statusFilter === pill.id}
                    onClick={() => setStatusFilter(pill.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div style={{ display: 'flex', flex: 1, padding: isMobile ? '0 0 60px' : '0 32px 60px' }}>

          {/* Left sidebar — desktop only */}
          {!isMobile && (
            <div style={{
              width: 200, flexShrink: 0,
              position: 'sticky', top: 0,
              alignSelf: 'flex-start',
              height: 'calc(100vh - 120px)',
              overflowY: 'auto',
              paddingTop: 24, paddingRight: 16,
            }}>
              {CATEGORIES.map(cat => {
                const catConnected = APPS.filter(
                  a => a.category === cat.id && (statuses[a.id] ?? a.status) === 'connected'
                ).length
                const isActive = activeCategory === cat.id

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const el = document.getElementById(`section-${cat.id}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: 'none',
                      borderLeft: isActive ? '3px solid #00c8e0' : '3px solid transparent',
                      background: isActive ? 'rgba(0,200,224,0.07)' : 'transparent',
                      color: isActive ? '#00c8e0' : 'var(--text-dim)',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      marginBottom: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      transition: 'background 0.14s, color 0.14s',
                    }}
                  >
                    <span style={{ lineHeight: 1.3 }}>{cat.label}</span>
                    {catConnected > 0 && (
                      <span style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 10,
                        color: '#22c55e',
                        background: 'rgba(34,197,94,0.12)',
                        padding: '1px 5px', borderRadius: 8,
                        flexShrink: 0,
                      }}>
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
            <div style={{
              overflowX: 'auto', display: 'flex', gap: 8,
              padding: '14px 16px 0',
              scrollbarWidth: 'none',
              width: '100%',
              flexShrink: 0,
            }}>
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const el = document.getElementById(`section-${cat.id}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '5px 12px', borderRadius: 20,
                      border: isActive ? 'none' : '1px solid var(--border-mid)',
                      background: isActive ? 'linear-gradient(135deg, #00c8e0, #5b6fff)' : 'var(--bg-card)',
                      color: isActive ? '#fff' : 'var(--text-dim)',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Right content */}
          <div style={{
            flex: 1, minWidth: 0,
            paddingTop: 24,
            paddingLeft: isMobile ? 16 : 0,
            paddingRight: isMobile ? 16 : 0,
          }}>
            {filteredApps.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                color: 'var(--text-dim)',
                fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              }}>
                Aucune application ne correspond à ta recherche.
              </div>
            ) : (
              CATEGORIES.map(cat => {
                const catApps = filteredApps.filter(a => a.category === cat.id)
                if (catApps.length === 0) return null
                const connCount = catApps.filter(a => (statuses[a.id] ?? a.status) === 'connected').length

                return (
                  <section
                    key={cat.id}
                    id={`section-${cat.id}`}
                    style={{ paddingTop: 32, paddingBottom: 16 }}
                  >
                    {/* Section header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      paddingBottom: 16,
                    }}>
                      <div style={{ width: 28, height: 1, background: 'var(--border)', flexShrink: 0 }} />
                      <span style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 700,
                        fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                        color: 'var(--text-dim)',
                        whiteSpace: 'nowrap',
                      }}>
                        {cat.label}
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {connCount > 0 && (
                          <span style={{
                            fontFamily: 'DM Mono, monospace', fontSize: 10,
                            color: '#22c55e', background: 'rgba(34,197,94,0.12)',
                            padding: '1px 6px', borderRadius: 10,
                          }}>
                            {connCount} connectée{connCount > 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{
                          fontFamily: 'DM Mono, monospace', fontSize: 10,
                          color: 'var(--text-dim)', background: 'var(--bg-card2)',
                          border: '1px solid var(--border)',
                          padding: '1px 6px', borderRadius: 10,
                        }}>
                          {catApps.length} app{catApps.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* App rows */}
                    {catApps.map(app => (
                      <AppRow
                        key={app.id}
                        app={app}
                        effectiveStatus={statuses[app.id] ?? app.status}
                        isSyncing={syncingId === app.id}
                        isHovered={hoveredId === app.id}
                        logoErrors={logoErrors}
                        onLogoError={handleLogoError}
                        onMouseEnter={() => setHoveredId(app.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onConnect={() => handleConnectClick(app.id)}
                        onDisconnect={() => handleDisconnect(app.id)}
                        onSync={() => handleSync(app.id)}
                        isMobile={isMobile}
                      />
                    ))}
                  </section>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Connect Modal ── */}
      {connectModal && modalApp && (
        <ConnectModal
          modal={connectModal}
          app={modalApp}
          logoErrors={logoErrors}
          onLogoError={handleLogoError}
          onCancel={handleModalCancel}
          onContinue={handleModalContinue}
        />
      )}

      {/* ── Toast ── */}
      {pendingToast && (
        <Toast message={pendingToast} onDismiss={() => setPendingToast(null)} />
      )}
    </>
  )
}
