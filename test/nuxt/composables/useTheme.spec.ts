import { beforeEach, describe, expect, it, vi } from 'vitest'

const root = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  root().classList.remove('dark')
  root().style.colorScheme = ''
  useTheme().theme.value = 'light'
})

describe('apply', () => {
  it('adds the dark class and colour-scheme hint', () => {
    useTheme().apply('dark')

    expect(root().classList.contains('dark')).toBe(true)
    expect(root().style.colorScheme).toBe('dark')
  })

  it('removes them again for light', () => {
    const theme = useTheme()
    theme.apply('dark')
    theme.apply('light')

    expect(root().classList.contains('dark')).toBe(false)
    expect(root().style.colorScheme).toBe('light')
  })

  it('persists the choice', () => {
    useTheme().apply('dark')
    expect(localStorage.getItem('daily-theme')).toBe('dark')
  })

  it('still applies the theme when storage is unavailable', () => {
    // Private browsing: setItem throws, but the page must not break.
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => useTheme().apply('dark')).not.toThrow()
    expect(root().classList.contains('dark')).toBe(true)

    setItem.mockRestore()
  })
})

describe('toggle', () => {
  it('flips light to dark and back', () => {
    const theme = useTheme()

    theme.toggle()
    expect(theme.theme.value).toBe('dark')

    theme.toggle()
    expect(theme.theme.value).toBe('light')
  })

  it('keeps the document in step', () => {
    const theme = useTheme()
    theme.toggle()
    expect(root().classList.contains('dark')).toBe(true)
  })
})

describe('syncFromDocument', () => {
  it('adopts the class the boot script already applied', () => {
    // The inline script in nuxt.config.ts sets the class before hydration; the
    // composable must not fight it.
    root().classList.add('dark')

    const theme = useTheme()
    theme.syncFromDocument()

    expect(theme.theme.value).toBe('dark')
  })

  it('reads light when the class is absent', () => {
    const theme = useTheme()
    theme.apply('dark')
    root().classList.remove('dark')
    theme.syncFromDocument()

    expect(theme.theme.value).toBe('light')
  })
})

describe('shared state', () => {
  it('is the same theme everywhere it is used', () => {
    useTheme().apply('dark')
    expect(useTheme().theme.value).toBe('dark')
  })
})
