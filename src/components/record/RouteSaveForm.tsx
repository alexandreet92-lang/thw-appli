'use client'
import { useState } from 'react'

interface Props {
  routeName: string
  onChangeName: (n: string) => void
  onSave: (name: string, isPublic: boolean) => Promise<void>
  onClose: () => void
  isDark: boolean
}

export default function RouteSaveForm({ routeName, onChangeName, onSave, onClose, isDark }: Props) {
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const bg = isDark ? '#111827' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    await onSave(routeName || 'Mon parcours', isPublic)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', width: '100%', background: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '20px', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: separator }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: text, margin: '0 0 16px', fontFamily: 'Syne, sans-serif' }}>Enregistrer le parcours</p>
        <input
          value={routeName}
          onChange={e => onChangeName(e.target.value)}
          placeholder="Nom du parcours"
          style={{ width: '100%', boxSizing: 'border-box', background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 16px', fontSize: 15, color: text, outline: 'none', fontFamily: 'DM Sans, sans-serif', marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([{ value: false, label: '🔒 Privé' }, { value: true, label: '🌍 Public' }] as { value: boolean; label: string }[]).map(opt => (
            <button key={String(opt.value)} onClick={() => setIsPublic(opt.value)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: isPublic === opt.value ? 'rgba(6,182,212,0.15)' : separator, border: `1.5px solid ${isPublic === opt.value ? '#06B6D4' : 'transparent'}`, color: isPublic === opt.value ? '#06B6D4' : text, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #06B6D4, #2563EB)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer le parcours'}
        </button>
      </div>
    </div>
  )
}
