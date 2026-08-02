import type { ConfirmOptions } from '~/types'

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

const CLOSED: ConfirmState = { open: false, title: '' }

let resolver: ((confirmed: boolean) => void) | null = null

/**
 * Promise-based replacement for `window.confirm`, rendered by
 * `<AppConfirmDialog>` so destructive actions get a styled, accessible prompt.
 */
export function useConfirm() {
  const state = useState<ConfirmState>('confirm-dialog', () => ({ ...CLOSED }))

  function confirm(options: ConfirmOptions): Promise<boolean> {
    state.value = { ...options, open: true }
    return new Promise<boolean>(resolve => {
      resolver = resolve
    })
  }

  function resolve(confirmed: boolean) {
    state.value = { ...CLOSED }
    resolver?.(confirmed)
    resolver = null
  }

  return { state, confirm, resolve }
}
