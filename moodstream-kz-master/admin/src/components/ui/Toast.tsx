import React from 'react'
import type { Toast, ToastVariant } from '../../hooks/useToast'

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-900/80 border-green-700 text-green-100',
  error: 'bg-red-900/80 border-red-700 text-red-100',
  info: 'bg-[#1e1e1e] border-[#2a2a2a] text-white',
}

const variantIcon: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl
        backdrop-blur-sm min-w-[280px] max-w-[400px]
        animate-in slide-in-from-right-5 fade-in duration-200
        ${variantClasses[toast.variant]}
      `}
    >
      <span className="text-sm font-bold shrink-0">{variantIcon[toast.variant]}</span>
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-xs"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps): React.ReactElement {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
