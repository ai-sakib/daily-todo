import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  useToast().toasts.value = []
})

afterEach(() => vi.useRealTimers())

describe('useToast', () => {
  it('queues toasts of each kind', () => {
    const toast = useToast()
    toast.success('saved')
    toast.error('failed')
    toast.info('heads up')

    expect(toast.toasts.value.map(t => t.kind)).toEqual(['success', 'error', 'info'])
    expect(toast.toasts.value.map(t => t.message)).toEqual(['saved', 'failed', 'heads up'])
  })

  it('gives every toast a distinct id', () => {
    const toast = useToast()
    toast.success('a')
    toast.success('a')

    const [first, second] = toast.toasts.value
    expect(first!.id).not.toBe(second!.id)
  })

  it('auto-dismisses after four seconds', () => {
    const toast = useToast()
    toast.success('saved')

    vi.advanceTimersByTime(3999)
    expect(toast.toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('dismisses on demand and cancels the pending timer', () => {
    const toast = useToast()
    const id = toast.success('saved')

    toast.dismiss(id)
    expect(toast.toasts.value).toHaveLength(0)

    vi.advanceTimersByTime(5000)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('dismisses only the requested toast', () => {
    const toast = useToast()
    const first = toast.success('one')
    toast.success('two')

    toast.dismiss(first)
    expect(toast.toasts.value.map(t => t.message)).toEqual(['two'])
  })

  it('ignores an unknown id', () => {
    const toast = useToast()
    toast.success('one')

    expect(() => toast.dismiss(-1)).not.toThrow()
    expect(toast.toasts.value).toHaveLength(1)
  })

  it('shares one queue across call sites', () => {
    useToast().success('from A')
    expect(useToast().toasts.value).toHaveLength(1)
  })

  it('expires toasts independently', () => {
    const toast = useToast()
    toast.success('first')
    vi.advanceTimersByTime(2000)
    toast.success('second')

    vi.advanceTimersByTime(2000)
    expect(toast.toasts.value.map(t => t.message)).toEqual(['second'])

    vi.advanceTimersByTime(2000)
    expect(toast.toasts.value).toHaveLength(0)
  })
})
