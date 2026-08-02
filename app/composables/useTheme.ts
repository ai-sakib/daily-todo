const STORAGE_KEY = 'daily-theme'

type Theme = 'light' | 'dark'

/**
 * Dark mode toggle. The initial class is applied by an inline script in
 * `nuxt.config.ts` before paint; this composable only keeps it in sync.
 */
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function apply(next: Theme) {
    theme.value = next
    if (!import.meta.client) return

    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.style.colorScheme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing — the choice simply will not persist.
    }
  }

  function syncFromDocument() {
    if (!import.meta.client) return
    theme.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggle, apply, syncFromDocument }
}
