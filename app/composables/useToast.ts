import type { Toast, ToastKind } from '~/types'

const DISMISS_AFTER = 4000

/** App-wide toast queue, rendered once by `<AppToastHost>` in the layout. */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function push(kind: ToastKind, message: string) {
    const id = Date.now() + Math.random()
    toasts.value = [...toasts.value, { id, kind, message }]

    if (import.meta.client) {
      timers.set(id, setTimeout(() => dismiss(id), DISMISS_AFTER))
    }
    return id
  }

  return {
    toasts,
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
}
