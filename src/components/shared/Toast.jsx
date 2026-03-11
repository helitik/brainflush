import { useToastStore } from '../../hooks/useToast'
import { useIsDesktop } from '../../hooks/useIsDesktop'

export function Toast() {
  const toasts = useToastStore((s) => s.toasts)
  const isDesktop = useIsDesktop()
  if (!toasts.length) return null

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none ${isDesktop ? 'bottom-6' : 'top-4'}`}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto"
          style={{
            background: toast.type === 'error' ? 'color-mix(in srgb, #ef4444 15%, var(--bg-card))' : 'var(--bg-card)',
            color: toast.type === 'error' ? '#ef4444' : 'var(--text-primary)',
            border: `1px solid ${toast.type === 'error' ? 'color-mix(in srgb, #ef4444 30%, var(--border-color))' : 'var(--border-color)'}`,
            boxShadow: 'var(--shadow-sm)',
            animation: `toast-in-${isDesktop ? 'up' : 'down'} 0.2s ease-out`,
          }}
        >
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-in-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toast-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
