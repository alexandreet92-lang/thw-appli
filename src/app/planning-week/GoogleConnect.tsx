'use client'
import { useState, useEffect } from 'react'

interface Status { connected: boolean; email?: string | null; suppressReminders?: boolean }

// Bouton de connexion à Google Agenda (sync 2 sens — Phase E).
// Lit /api/agenda/google/status et lance l'OAuth via /api/agenda/google/start.
export function GoogleConnectButton({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const r = await fetch('/api/agenda/google/status')
      if (r.ok) setStatus(await r.json() as Status)
      else setStatus({ connected: false })
    } catch { setStatus({ connected: false }) }
  }
  useEffect(() => { void load() }, [])

  const connect = () => { window.location.href = '/api/agenda/google/start' }

  const disconnect = async () => {
    setBusy(true)
    try { await fetch('/api/agenda/google/disconnect', { method: 'POST' }); await load(); onChange() }
    finally { setBusy(false) }
  }

  const toggleSuppress = async (v: boolean) => {
    setStatus(s => s ? { ...s, suppressReminders: v } : s)
    try { await fetch('/api/agenda/google/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suppressReminders: v }) }) } catch { /* ignore */ }
  }

  if (!status) return <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>…</div>

  if (!status.connected) {
    return (
      <button onClick={connect} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: 'conic-gradient(#4285F4,#EA4335,#FBBC05,#34A853)' }} />
        Connecter Google Agenda
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>Connecté : <strong>{status.email ?? 'Google'}</strong></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-mid)', cursor: 'pointer' }}>
        <input type="checkbox" checked={status.suppressReminders !== false} onChange={e => void toggleSuppress(e.target.checked)} />
        Laisser Google gérer les rappels de cette page (éviter les doublons)
      </label>
      <button onClick={disconnect} disabled={busy} style={{ padding: '8px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: '#ef4444', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Déconnecter</button>
    </div>
  )
}
