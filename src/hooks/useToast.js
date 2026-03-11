import { create } from 'zustand'

let nextId = 0

export const useToastStore = create((set) => ({
  toasts: [],
  showToast: (message, type = 'error') => {
    const id = ++nextId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },
}))

export function showToast(message) {
  useToastStore.getState().showToast(message)
}
