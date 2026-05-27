'use client'
import { useEffect, useState } from 'react'
import { syncPendingSessions } from '@/lib/syncPendingSessions'
import { getPendingSessions } from '@/lib/offlineStorage'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncCount, setSyncCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = async () => {
      setIsOnline(true)
      const pending = getPendingSessions().length
      if (pending > 0) {
        setSyncing(true)
        const n = await syncPendingSessions()
        setSyncing(false)
        if (n > 0) setSyncCount(n)
      }
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync at mount if online and pending sessions exist
    if (navigator.onLine) {
      const pending = getPendingSessions()
      if (pending.length > 0) {
        setSyncing(true)
        syncPendingSessions().then(n => {
          setSyncing(false)
          if (n > 0) setSyncCount(n)
        })
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-dismiss sync toast after 3s
  useEffect(() => {
    if (syncCount === 0) return
    const t = setTimeout(() => setSyncCount(0), 3000)
    return () => clearTimeout(t)
  }, [syncCount])

  if (isOnline && syncCount === 0 && !syncing) return null

  return (
    <>
      {/* Hors ligne */}
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          padding: '6px 16px',
          background: 'rgba(239,68,68,0.93)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />
          <span style={{ fontSize: 12, color: 'white', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            Hors ligne — séances sauvegardées localement
          </span>
        </div>
      )}

      {/* Sync en cours */}
      {syncing && isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          padding: '6px 16px',
          background: 'rgba(6,182,212,0.90)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: 'white', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            Synchronisation en cours…
          </span>
        </div>
      )}

      {/* Sync terminée */}
      {syncCount > 0 && isOnline && !syncing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          padding: '6px 16px',
          background: 'rgba(16,185,129,0.90)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: 'white', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            {syncCount} séance{syncCount > 1 ? 's' : ''} synchronisée{syncCount > 1 ? 's' : ''} ✓
          </span>
        </div>
      )}
    </>
  )
}
