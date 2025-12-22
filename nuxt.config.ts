// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase' // Add the module here
  ],
  
  // The module automatically reads these from .env, 
  // but if you want to be explicit:
  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    // Disable the module's automatic redirect so your custom middleware works
    redirect: false 
  },
})