import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

// Placeholders so booting Nuxt for the component tests never reaches for the
// developer's real project. Every test mocks `useSupabaseClient` anyway; these
// only stop the module from throwing during app init.
process.env.NUXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.NUXT_PUBLIC_SUPABASE_KEY ||= 'test-anon-key'

/**
 * Two projects, because most of this codebase does not need a browser or a
 * Nuxt runtime to be tested:
 *
 *  unit – utils and services. Plain Node, no Nuxt bootstrap, milliseconds.
 *         Services take the Supabase client as an argument, so a fake client is
 *         all they need.
 *  nuxt – composables and components, which rely on Nuxt auto-imports,
 *         `useState` and Vue reactivity. Slower to boot, so kept separate.
 *
 * TZ is pinned so the local-calendar-day logic is reproducible on any machine
 * and in CI. Asia/Dhaka (UTC+6) is deliberate: it is far enough east that a
 * naive `toISOString()` would report the previous day for most of the morning,
 * which is exactly the bug class these tests guard.
 */
export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/composables/**', 'app/services/**', 'app/utils/**', 'app/middleware/**'],
      // Presentational components are covered by the component tests rather
      // than by a line-coverage target, and generated types have nothing to run.
      exclude: ['app/types/**'],
    },
    projects: [
      {
        resolve: {
          alias: {
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '@': fileURLToPath(new URL('./app', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['test/unit/**/*.spec.ts'],
          env: { TZ: 'Asia/Dhaka' },
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          globals: true,
          include: ['test/nuxt/**/*.spec.ts'],
          environment: 'nuxt',
          env: { TZ: 'Asia/Dhaka' },
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
      }),
    ],
  },
})
