'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  defaultName?: string
  sport: string
  onSave: (name: string, isPublic: boolean) => Promise<void>
  onClose: () => void
  isDark: boolean
}

export default function SegmentSaveForm({ defaultName = '', sport, onSave, onClose, isDark }: Props) {
  const [name, setName] = useState(defaultName)
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  const bg = isDark ? '#0A0A0A' : '#fff'
  const text = isDark ? '#fff' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'
  const sep = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const btnBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'

  const handleSave = async () => {
    if (saving || !name.trim()) return
    setSaving(true)
    await onSave(name.trim(), isPublic)
    setSaving(false)
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      background: bg, color: text,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
      animation: 'slideUp 280ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${sep}`, position: 'relative' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 15, fontWeight: 600 }}>Créer un segment</span>
        <button onClick={handleSave} disabled={saving || !name.trim()} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 10, background: 'none', border: 'none', color: name.trim() ? '#06B6D4' : dim, fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'default', opacity: saving ? 0.5 : 1 }}>
          {saving ? '…' : 'Créer'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, marginBottom: 10 }}>Nom du segment</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Montée du Col de la Croix"
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 16px', fontSize: 16, color: text, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dim, marginBottom: 10 }}>Sport</p>
          <div style={{ background: surface, borderRadius: 12, padding: '12px 16px', border: `1px solid ${border}` }}>
            <span style={{ fontSize: 15, color: text, fontWeight: 500 }}>
              {sport === 'cycling' ? 'Vélo' : sport === 'running' ? 'Running' : sport === 'trail' ? 'Trail' : sport === 'mtb' ? 'VTT' : sport === 'hiking' ? 'Randonnée' : sport}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: `1px solid ${sep}` }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: text }}>Segment public</p>
            <p style={{ fontSize: 12, color: dim, margin: '2px 0 0' }}>Visible dans les classements</p>
          </div>
          <button
            onClick={() => setIsPublic(p => !p)}
            style={{ width: 44, height: 26, borderRadius: 13, background: isPublic ? '#06B6D4' : (isDark ? 'rgba(255,255,255,0.15)' : '#D1D5DB'), border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}
          >
            <span style={{ position: 'absolute', top: 3, left: isPublic ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', paddingBottom: 'max(env(safe-area-inset-bottom),20px)' }}>
        <button onClick={handleSave} disabled={saving || !name.trim()} style={{ width: '100%', height: 52, borderRadius: 16, background: name.trim() ? 'linear-gradient(135deg,#06B6D4,#2563EB)' : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'), border: 'none', color: name.trim() ? '#fff' : dim, fontSize: 16, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'default', fontFamily: 'DM Sans, sans-serif' }}>
          {saving ? 'Création…' : 'Créer le segment'}
        </button>
      </div>
    </div>,
    document.body
  )
}
