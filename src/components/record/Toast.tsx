'use client'
import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 2400 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999]
                 px-4 py-2.5 rounded-xl
                 bg-black/85 text-white text-[13px] font-medium
                 shadow-[0_4px_24px_rgba(0,0,0,0.35)]
                 backdrop-blur-md
                 animate-[record-toast-in_180ms_ease-out]"
      role="status"
    >
      {message}
      <style>{`
        @keyframes record-toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
