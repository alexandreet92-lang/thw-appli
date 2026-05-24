'use client'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface ToastState { message: string; visible: boolean; closing: boolean }

interface ToastContextValue {
  showToast: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: '', visible: false, closing: false })

  const showToast = useCallback((msg: string) => {
    setState({ message: msg, visible: true, closing: false })
  }, [])

  // Timer auto-dismiss
  useEffect(() => {
    if (!state.visible || state.closing) return
    const hideAt = setTimeout(() => setState(s => ({ ...s, closing: true })), 2000)
    return () => clearTimeout(hideAt)
  }, [state.visible, state.closing, state.message])

  // Cleanup after slide-out
  useEffect(() => {
    if (!state.closing) return
    const done = setTimeout(() => setState({ message: '', visible: false, closing: false }), 230)
    return () => clearTimeout(done)
  }, [state.closing])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {state.visible && (
        <div
          className={state.closing ? 'toast-slide-out' : 'toast-slide-in'}
          style={{
            position: 'fixed', top: 'calc(80px + env(safe-area-inset-top))', right: 16, zIndex: 10010,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(6,182,212,0.18)',
            border: '1px solid rgba(6,182,212,0.45)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            color: '#fff', borderRadius: 12, padding: '10px 14px',
            fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 6px 22px rgba(0,0,0,0.25)',
          }}
          role="status"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3 3 7-7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {state.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) return { showToast: () => { /* no-op hors provider */ } }
  return ctx
}
