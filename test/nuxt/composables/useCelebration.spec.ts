import { beforeEach, describe, expect, it, vi } from 'vitest'

const confetti = vi.hoisted(() => vi.fn())
vi.mock('canvas-confetti', () => ({ default: confetti }))

beforeEach(() => {
  vi.clearAllMocks()
  // requestAnimationFrame would otherwise loop for the full confetti duration.
  vi.stubGlobal('requestAnimationFrame', vi.fn())
})

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('celebrate', () => {
  it('shows the overlay with a phrase', () => {
    const { celebrate, visible, phrase } = useCelebration()
    celebrate()

    expect(visible.value).toBe(true)
    expect(phrase.value).not.toBe('')
  })

  it('fires confetti from both sides', async () => {
    const { celebrate } = useCelebration()
    celebrate()
    await flush()

    expect(confetti).toHaveBeenCalledTimes(2)
    expect(confetti.mock.calls[0]![0]).toMatchObject({ angle: 60, origin: { x: 0, y: 0.65 } })
    expect(confetti.mock.calls[1]![0]).toMatchObject({ angle: 120, origin: { x: 1, y: 0.65 } })
  })

  it('can show the overlay without confetti', async () => {
    // Reopening an already-finished day should not replay the barrage.
    const { celebrate, visible } = useCelebration()
    celebrate(false)
    await flush()

    expect(visible.value).toBe(true)
    expect(confetti).not.toHaveBeenCalled()
  })

  it('picks a phrase from the list each time', () => {
    const { celebrate, phrase } = useCelebration()
    const seen = new Set<string>()

    for (let i = 0; i < 40; i += 1) {
      celebrate(false)
      seen.add(phrase.value)
    }

    expect(seen.size).toBeGreaterThan(1)
    expect([...seen].every(text => text.length > 0)).toBe(true)
  })

  it('always picks a real phrase, never undefined', () => {
    const { celebrate, phrase } = useCelebration()

    // Math.random() can return values arbitrarily close to 1; the index must
    // never run off the end of the array.
    for (const value of [0, 0.5, 0.999999999]) {
      vi.spyOn(Math, 'random').mockReturnValue(value)
      celebrate(false)
      expect(phrase.value).toBeTruthy()
    }
    vi.spyOn(Math, 'random').mockRestore()
  })
})

describe('dismiss', () => {
  it('hides the overlay', () => {
    const { celebrate, dismiss, visible } = useCelebration()
    celebrate(false)
    dismiss()

    expect(visible.value).toBe(false)
  })

  it('starts hidden', () => {
    expect(useCelebration().visible.value).toBe(false)
  })

  it('is per-instance, not global', () => {
    const first = useCelebration()
    const second = useCelebration()
    first.celebrate(false)

    expect(second.visible.value).toBe(false)
  })
})
