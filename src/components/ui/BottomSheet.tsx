'use client'
import { createPortal } from 'react-dom'
import { useEffect, useState, ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  icon?: ReactNode
}

export function BottomSheet({
  isOpen, onClose, children, title, icon
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full bg-background rounded-t-[24px]
                   max-h-[88vh] flex flex-col shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>
        {(title || icon) && (
          <div className="flex items-center gap-2 px-5 pt-3 pb-2 flex-shrink-0">
            {icon && <span className="text-cyan-500">{icon}</span>}
            {title && (
              <h2 className="text-base font-semibold text-foreground">
                {title}
              </h2>
            )}
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
