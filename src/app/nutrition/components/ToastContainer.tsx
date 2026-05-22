'use client'
import type { Toast, ToastType } from '@/hooks/useToast'

function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2.5} strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

const STYLES: Record<ToastType, { bg: string; border: string; iconBg: string; text: string; bar: string }> = {
  success: { bg: 'rgba(5,18,10,0.97)',  border: 'rgba(16,185,129,0.35)', iconBg: 'rgba(16,185,129,0.15)', text: '#d1fae5', bar: '#10B981' },
  error:   { bg: 'rgba(18,5,5,0.97)',   border: 'rgba(239,68,68,0.35)',  iconBg: 'rgba(239,68,68,0.15)',  text: '#fee2e2', bar: '#EF4444' },
  info:    { bg: 'rgba(5,8,18,0.97)',   border: 'rgba(59,130,246,0.35)', iconBg: 'rgba(59,130,246,0.15)', text: '#dbeafe', bar: '#3B82F6' },
}

interface Props {
  toasts:    Toast[]
  onDismiss: (id: string) => void
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 320, width: 'calc(100vw - 32px)' }}>
      {toasts.map(t => {
        const s = STYLES[t.type]
        const Icon = t.type === 'success' ? CheckIcon : t.type === 'error' ? XIcon : InfoIcon
        return (
          <div key={t.id} className={`toast-item${t.leaving ? ' leaving' : ''}`} style={{ pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px 12px', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.45)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: s.text, fontFamily: 'DM Sans,sans-serif', lineHeight: 1.4, flex: 1 }}>
                {t.message}
              </span>
              <button onClick={() => onDismiss(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, opacity: 0.45, fontSize: 18, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>
                ×
              </button>
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: s.bar, width: '100%', animation: 'progress-bar 3000ms linear forwards' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
