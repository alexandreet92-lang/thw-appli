'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'available' | 'coming'
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
  description: string
  lastSync?: string
}

interface Category {
  id: CategoryId
  label: string
}

// ── Data ───────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'training',   label: 'Entraînement' },
  { id: 'recovery',   label: 'Récupération & Santé' },
  { id: 'body',       label: 'Balance & Composition' },
  { id: 'nutrition',  label: 'Nutrition' },
  { id: 'biometrics', label: 'Biométrie & Capteurs' },
  { id: 'sleep',      label: 'Sommeil' },
]

const APPS: AppDef[] = [
  // Entraînement
  { id: 'strava',       name: 'Strava',          category: 'training',   status: 'connected', color: '#FC4C02', logoInitial: 'ST', description: 'Suivi GPS running & cycling', lastSync: 'Il y a 2h' },
  { id: 'garmin',       name: 'Garmin Connect',  category: 'training',   status: 'available', color: '#007CC3', logoInitial: 'GC', description: 'Montres et capteurs Garmin' },
  { id: 'wahoo',        name: 'Wahoo',           category: 'training',   status: 'available', color: '#E8002D', logoInitial: 'WH', description: 'Capteurs & home trainers' },
  { id: 'polar',        name: 'Polar',           category: 'training',   status: 'available', color: '#D9001B', logoInitial: 'PO', description: 'Montres sport & cardiaque' },
  { id: 'suunto',       name: 'Suunto',          category: 'training',   status: 'available', color: '#E8002D', logoInitial: 'SU', description: 'Montres outdoor & navigation' },
  { id: 'coros',        name: 'Coros',           category: 'training',   status: 'available', color: '#1A1A1A', logoInitial: 'CO', description: 'Montres GPS performance' },
  { id: 'zwift',        name: 'Zwift',           category: 'training',   status: 'available', color: '#F05C2B', logoInitial: 'ZW', description: 'Cyclisme & course virtuelle' },
  { id: 'rouvy',        name: 'Rouvy',           category: 'training',   status: 'coming',    color: '#00A651', logoInitial: 'RV', description: 'Simulation de routes réelles' },
  { id: 'mywhoosh',     name: 'MyWhoosh',        category: 'training',   status: 'coming',    color: '#FF6B00', logoInitial: 'MW', description: 'Cyclisme virtuel compétitif' },

  // Récupération & Santé
  { id: 'whoop',        name: 'Whoop',           category: 'recovery',   status: 'available', color: '#00C8A0', logoInitial: 'WP', description: 'Récupération & strain quotidien' },
  { id: 'oura',         name: 'Oura',            category: 'recovery',   status: 'available', color: '#B8A882', logoInitial: 'OR', description: 'Bague connectée & sommeil' },
  { id: 'hrv4training', name: 'HRV4Training',    category: 'recovery',   status: 'coming',    color: '#FF3366', logoInitial: 'H4', description: 'Suivi HRV via smartphone' },
  { id: 'elitehrv',     name: 'Elite HRV',       category: 'recovery',   status: 'coming',    color: '#4A90D9', logoInitial: 'EH', description: 'Analyse variabilité cardiaque' },
  { id: 'welltory',     name: 'Welltory',        category: 'recovery',   status: 'coming',    color: '#7C5CBF', logoInitial: 'WT', description: 'Stress & énergie quotidiens' },
  { id: 'apple-health', name: 'Apple Health',    category: 'recovery',   status: 'available', color: '#FF2D55', logoInitial: 'AH', description: 'Hub santé iOS centralisé' },
  { id: 'google-fit',   name: 'Google Fit',      category: 'recovery',   status: 'available', color: '#4285F4', logoInitial: 'GF', description: 'Hub santé Android' },
  { id: 'samsung',      name: 'Samsung Health',  category: 'recovery',   status: 'coming',    color: '#1428A0', logoInitial: 'SH', description: 'Écosystème Galaxy' },

  // Balance & Composition
  { id: 'withings',     name: 'Withings',        category: 'body',       status: 'available', color: '#FF6600', logoInitial: 'WI', description: 'Balances & montres santé' },
  { id: 'fitbit',       name: 'Fitbit',          category: 'body',       status: 'available', color: '#00B0B9', logoInitial: 'FB', description: 'Bracelets & composition' },
  { id: 'garmin-h',     name: 'Garmin Health',   category: 'body',       status: 'available', color: '#007CC3', logoInitial: 'GH', description: 'Données santé Garmin' },
  { id: 'zepp',         name: 'Zepp / Mi Fit',   category: 'body',       status: 'coming',    color: '#FF6900', logoInitial: 'ZP', description: 'Wearables Amazfit & Xiaomi' },
  { id: 'renpho',       name: 'Renpho',          category: 'body',       status: 'coming',    color: '#00A8FF', logoInitial: 'RP', description: 'Balances connectées abordables' },
  { id: 'eufy',         name: 'Eufy Smart Scale', category: 'body',      status: 'coming',    color: '#2C7BE5', logoInitial: 'EU', description: 'Balances Eufy intelligentes' },
  { id: 'tanita',       name: 'Tanita',          category: 'body',       status: 'coming',    color: '#003087', logoInitial: 'TN', description: 'Analyseurs corporels pro' },
  { id: 'omron',        name: 'Omron',           category: 'body',       status: 'coming',    color: '#C40000', logoInitial: 'OM', description: 'Tensiomètres & cardio' },
  { id: 'goodvibes',    name: 'Goodvibes',       category: 'body',       status: 'coming',    color: '#6C3FC5', logoInitial: 'GV', description: 'Bien-être & habitudes' },

  // Nutrition
  { id: 'myfitnesspal', name: 'MyFitnessPal',    category: 'nutrition',  status: 'available', color: '#005594', logoInitial: 'MF', description: 'Suivi calorique & macro' },
  { id: 'cronometer',   name: 'Cronometer',      category: 'nutrition',  status: 'available', color: '#F29200', logoInitial: 'CR', description: 'Micronutriments précis' },
  { id: 'yazio',        name: 'Yazio',           category: 'nutrition',  status: 'coming',    color: '#EC6F1A', logoInitial: 'YZ', description: 'Calories & recettes saines' },
  { id: 'lifesum',      name: 'Lifesum',         category: 'nutrition',  status: 'coming',    color: '#8CC63F', logoInitial: 'LS', description: 'Plans nutritionnels guidés' },
  { id: 'macrofactor',  name: 'Macrofactor',     category: 'nutrition',  status: 'coming',    color: '#6366F1', logoInitial: 'MC', description: 'Macros adaptatifs intelligents' },
  { id: 'carbon',       name: 'Carbon Diet Coach', category: 'nutrition', status: 'coming',   color: '#1C1C1E', logoInitial: 'CD', description: 'Coaching nutritionnel IA' },

  // Biométrie & Capteurs
  { id: 'stryd',        name: 'Stryd',           category: 'biometrics', status: 'available', color: '#FF5722', logoInitial: 'SY', description: 'Puissance de course running' },
  { id: 'core',         name: 'Core',            category: 'biometrics', status: 'coming',    color: '#00C8E0', logoInitial: 'CR', description: 'Température corporelle core' },
  { id: 'supersapiens', name: 'Supersapiens',    category: 'biometrics', status: 'coming',    color: '#00E5B4', logoInitial: 'SS', description: 'Glucose sanguin en continu' },
  { id: 'levels',       name: 'Levels',          category: 'biometrics', status: 'coming',    color: '#111827', logoInitial: 'LV', description: 'Métabolisme & énergie' },
  { id: 'dexcom',       name: 'Dexcom',          category: 'biometrics', status: 'coming',    color: '#00A4E0', logoInitial: 'DX', description: 'Capteur glucose G7' },
  { id: 'abbott',       name: 'Abbott Freestyle Libre', category: 'biometrics', status: 'coming', color: '#E31837', logoInitial: 'AB', description: 'Libre 3 MCG' },

  // Sommeil
  { id: 'sleepcycle',   name: 'Sleep Cycle',     category: 'sleep',      status: 'available', color: '#5B4FCF', logoInitial: 'SC', description: 'Réveil intelligent & cycles' },
  { id: 'pillow',       name: 'Pillow',          category: 'sleep',      status: 'coming',    color: '#FF9500', logoInitial: 'PI', description: 'Analyse sommeil Apple Watch' },
  { id: 'autosleep',    name: 'AutoSleep',       category: 'sleep',      status: 'coming',    color: '#FF2D55', logoInitial: 'AS', description: 'Suivi automatique sommeil' },
]

// ── Status helpers ─────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 20,
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
  if (status === 'available') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 7px', borderRadius: 20,
        border: '1px solid var(--border-mid)',
        color: 'var(--text-dim)',
        fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        Disponible
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 20,
      background: 'rgba(234,179,8,0.12)',
      color: '#eab308',
      fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      En cours
    </span>
  )
}

// ── Spinner ────────────────────────────────────────────────────

function Spinner({ size = 14, color = '#00c8e0' }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── App card ───────────────────────────────────────────────────

function AppCard({
  app,
  effectiveStatus,
  isFavorite,
  isSyncing,
  isConnecting,
  onFavorite,
  onConnect,
  onDisconnect,
  onSync,
}: {
  app: AppDef
  effectiveStatus: ConnectionStatus
  isFavorite: boolean
  isSyncing: boolean
  isConnecting: boolean
  onFavorite: () => void
  onConnect: () => void
  onDisconnect: () => void
  onSync: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [syncHovered, setSyncHovered] = useState(false)
  const [connectHovered, setConnectHovered] = useState(false)
  const [disconnectHovered, setDisconnectHovered] = useState(false)
  const [starHovered, setStarHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '14px',
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative',
        boxShadow: hovered ? 'var(--shadow)' : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        cursor: 'default',
      }}
    >
      {/* Top row: logo + star */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        {/* Logo */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: app.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: 13, color: '#fff',
          letterSpacing: '0.02em',
          boxShadow: `0 2px 10px ${app.color}44`,
        }}>
          {app.logoInitial}
        </div>

        {/* Star button */}
        <button
          onClick={onFavorite}
          onMouseEnter={() => setStarHovered(true)}
          onMouseLeave={() => setStarHovered(false)}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          style={{
            width: 28, height: 28, borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: starHovered ? 'var(--bg-hover)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0,
            transition: 'background 0.14s',
            color: isFavorite ? '#eab308' : 'var(--text-dim)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={1.8}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      </div>

      {/* Name + description */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: 13, color: 'var(--text)',
          lineHeight: 1.3, marginBottom: 3,
        }}>
          {app.name}
        </div>
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 11,
          color: 'var(--text-dim)', lineHeight: 1.4,
        }}>
          {app.description}
        </div>
      </div>

      {/* Status + last sync */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <StatusBadge status={effectiveStatus} />
        {effectiveStatus === 'connected' && (app.lastSync ?? true) && (
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 10,
            color: 'var(--text-dim)',
          }}>
            {app.lastSync ?? 'Synchronisé'}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {effectiveStatus === 'connected' && (
          <>
            <button
              onClick={onSync}
              disabled={isSyncing}
              onMouseEnter={() => setSyncHovered(true)}
              onMouseLeave={() => setSyncHovered(false)}
              style={{
                flex: 1,
                padding: '6px 10px', borderRadius: 8,
                border: `1px solid ${isSyncing ? 'var(--border)' : '#00c8e0'}`,
                background: syncHovered && !isSyncing ? 'rgba(0,200,224,0.08)' : 'transparent',
                color: isSyncing ? 'var(--text-dim)' : '#00c8e0',
                fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                cursor: isSyncing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'background 0.14s',
              }}
            >
              {isSyncing ? <Spinner size={11} color="#00c8e0" /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
              )}
              Sync
            </button>
            <button
              onClick={onDisconnect}
              onMouseEnter={() => setDisconnectHovered(true)}
              onMouseLeave={() => setDisconnectHovered(false)}
              style={{
                flex: 1,
                padding: '6px 10px', borderRadius: 8,
                border: '1px solid #ef4444',
                background: disconnectHovered ? 'rgba(239,68,68,0.08)' : 'transparent',
                color: '#ef4444',
                fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.14s',
              }}
            >
              Déconnecter
            </button>
          </>
        )}
        {effectiveStatus === 'available' && (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            onMouseEnter={() => setConnectHovered(true)}
            onMouseLeave={() => setConnectHovered(false)}
            style={{
              flex: 1,
              padding: '6px 10px', borderRadius: 8,
              border: `1px solid ${app.color}`,
              background: connectHovered && !isConnecting
                ? `${app.color}18`
                : `${app.color}0c`,
              color: isConnecting ? 'var(--text-dim)' : app.color,
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              cursor: isConnecting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'background 0.14s',
            }}
          >
            {isConnecting ? <Spinner size={11} color={app.color} /> : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            )}
            {isConnecting ? 'Connexion...' : 'Connecter'}
          </button>
        )}
        {effectiveStatus === 'coming' && (
          <button
            disabled
            style={{
              flex: 1,
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              cursor: 'default', opacity: 0.7,
            }}
          >
            Bientôt disponible
          </button>
        )}
      </div>
    </div>
  )
}

// ── Category section header ─────────────────────────────────────

function CategoryHeader({ label, total, connected }: { label: string; total: number; connected: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 12,
    }}>
      <span style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-dim)',
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 1,
        background: 'var(--border)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {connected > 0 && (
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 10,
            color: '#22c55e',
            background: 'rgba(34,197,94,0.12)',
            padding: '1px 6px', borderRadius: 10,
          }}>
            {connected} connecté{connected > 1 ? 's' : ''}
          </span>
        )}
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: 10,
          color: 'var(--text-dim)',
          background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          padding: '1px 6px', borderRadius: 10,
        }}>
          {total}
        </span>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({})
  const [syncing, setSyncing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [syncAllHovered, setSyncAllHovered] = useState(false)

  const getStatus = useCallback((app: AppDef): ConnectionStatus => {
    return connections[app.id] ?? app.status
  }, [connections])

  const handleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleConnect = useCallback((app: AppDef) => {
    setConnecting(app.id)
    setTimeout(() => {
      setConnections(prev => ({ ...prev, [app.id]: 'connected' }))
      setConnecting(null)
    }, 1500)
  }, [])

  const handleDisconnect = useCallback((app: AppDef) => {
    setConnections(prev => ({ ...prev, [app.id]: 'available' }))
  }, [])

  const handleSync = useCallback((app: AppDef) => {
    setSyncing(app.id)
    setTimeout(() => setSyncing(null), 1500)
  }, [])

  const handleSyncAll = useCallback(() => {
    setSyncingAll(true)
    setTimeout(() => setSyncingAll(false), 2000)
  }, [])

  const filteredApps = useMemo(() => {
    return APPS.filter(app => {
      const st = getStatus(app)
      const matchSearch = search.trim() === '' || app.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || st === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, getStatus])

  const pinnedApps = useMemo(() => {
    return APPS.filter(app => favorites.has(app.id))
  }, [favorites])

  const filterPills: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'Tout' },
    { id: 'connected', label: 'Connecté' },
    { id: 'available', label: 'Disponible' },
    { id: 'coming',    label: 'En cours' },
  ]

  const totalConnected = APPS.filter(a => getStatus(a) === 'connected').length

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingBottom: 60,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          marginBottom: 28,
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: 28, color: 'var(--text)',
              margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em',
            }}>
              Connexions
            </h1>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 13,
              color: 'var(--text-mid)', marginTop: 6, marginBottom: 0,
              maxWidth: 540, lineHeight: 1.6,
            }}>
              Connecte tes applications pour centraliser automatiquement toutes tes données : entraînement, récupération, nutrition et santé.
            </p>
            {totalConnected > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 10,
                fontFamily: 'DM Mono, monospace', fontSize: 11,
                color: '#22c55e',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#22c55e', display: 'inline-block',
                  boxShadow: '0 0 6px #22c55e',
                }} />
                {totalConnected} application{totalConnected > 1 ? 's' : ''} connectée{totalConnected > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Sync all button */}
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            onMouseEnter={() => setSyncAllHovered(true)}
            onMouseLeave={() => setSyncAllHovered(false)}
            style={{
              padding: '10px 20px',
              borderRadius: 10, border: 'none',
              background: syncingAll
                ? 'var(--bg-card2)'
                : syncAllHovered
                  ? 'linear-gradient(135deg, #00b8ce, #4a5fff)'
                  : 'linear-gradient(135deg, #00c8e0, #5b6fff)',
              color: syncingAll ? 'var(--text-dim)' : '#fff',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
              cursor: syncingAll ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: syncingAll ? 'none' : '0 2px 16px rgba(0,200,224,0.25)',
              transition: 'background 0.18s, box-shadow 0.18s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {syncingAll ? <Spinner size={14} color="#00c8e0" /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            )}
            {syncingAll ? 'Synchronisation...' : 'Synchroniser tout'}
          </button>
        </div>

        {/* ── Search + filters (sticky) ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)',
          paddingTop: 8, paddingBottom: 14,
          marginBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Search input */}
          <div style={{
            position: 'relative', marginBottom: 10,
          }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: searchFocused ? '#00c8e0' : 'var(--text-dim)',
              display: 'flex', pointerEvents: 'none',
              transition: 'color 0.14s',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher une application..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%', padding: '9px 12px 9px 36px',
                borderRadius: 10,
                border: `1px solid ${searchFocused ? 'rgba(0,200,224,0.4)' : 'var(--border)'}`,
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
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

        {/* ── Pinned favorites row ── */}
        {pinnedApps.length > 0 && (
          <div style={{ marginBottom: 32, marginTop: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth={1.5}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-dim)',
              }}>
                Favoris
              </span>
            </div>
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto',
              paddingBottom: 4,
              scrollbarWidth: 'thin',
            }}>
              {pinnedApps.map(app => (
                <div key={app.id} style={{ flexShrink: 0, width: 200 }}>
                  <AppCard
                    app={app}
                    effectiveStatus={getStatus(app)}
                    isFavorite={favorites.has(app.id)}
                    isSyncing={syncing === app.id}
                    isConnecting={connecting === app.id}
                    onFavorite={() => handleFavorite(app.id)}
                    onConnect={() => handleConnect(app)}
                    onDisconnect={() => handleDisconnect(app)}
                    onSync={() => handleSync(app)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Category sections ── */}
        {filteredApps.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: 'var(--text-dim)',
            fontFamily: 'DM Sans, sans-serif', fontSize: 14,
          }}>
            Aucune application ne correspond à ta recherche.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {CATEGORIES.map(cat => {
              const catApps = filteredApps.filter(a => a.category === cat.id)
              if (catApps.length === 0) return null
              const connectedCount = catApps.filter(a => getStatus(a) === 'connected').length

              return (
                <section key={cat.id}>
                  <CategoryHeader
                    label={cat.label}
                    total={catApps.length}
                    connected={connectedCount}
                  />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 10,
                  }}>
                    {catApps.map(app => (
                      <AppCard
                        key={app.id}
                        app={app}
                        effectiveStatus={getStatus(app)}
                        isFavorite={favorites.has(app.id)}
                        isSyncing={syncing === app.id}
                        isConnecting={connecting === app.id}
                        onFavorite={() => handleFavorite(app.id)}
                        onConnect={() => handleConnect(app)}
                        onDisconnect={() => handleDisconnect(app)}
                        onSync={() => handleSync(app)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pill filter component ───────────────────────────────────────

function PillFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 12px', borderRadius: 20,
        border: active ? 'none' : '1px solid var(--border-mid)',
        background: active
          ? 'linear-gradient(135deg, #00c8e0, #5b6fff)'
          : hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        color: active ? '#fff' : hovered ? 'var(--text)' : 'var(--text-mid)',
        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'background 0.14s, color 0.14s',
        whiteSpace: 'nowrap',
        boxShadow: active ? '0 1px 8px rgba(0,200,224,0.2)' : 'none',
      }}
    >
      {label}
    </button>
  )
}
