// Applies the persisted theme before first paint so there is no flash of the
// wrong colour scheme during hydration.
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem('daily-theme')
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch (e) {}
})()
`.trim()

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],

  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    // Auth redirects are handled by middleware/auth.global.ts instead.
    redirect: false,
  },

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    viewer: false,
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Daily — one day at a time',
      meta: [
        { name: 'description', content: 'A calm daily todo tracker for the habits and tasks that matter.' },
        { name: 'theme-color', content: '#4f46e5' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
      script: [{ innerHTML: themeBootScript, tagPosition: 'head' }],
    },
  },

  typescript: { strict: true },
})
