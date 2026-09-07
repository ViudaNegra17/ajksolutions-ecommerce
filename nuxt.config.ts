export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image', '@nuxt/icon', '@pinia/nuxt', 'nuxt-auth-utils'],
  ssr: true,
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0f172a' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    checkoutSigningSecret: process.env.NUXT_CHECKOUT_SIGNING_SECRET || process.env.NUXT_SESSION_PASSWORD,
    orderHandoffSecret: process.env.NUXT_ORDER_HANDOFF_SECRET || process.env.NUXT_SESSION_PASSWORD,
    session: {
      password: process.env.NUXT_SESSION_PASSWORD,
      maxAge: 60 * 60 * 8,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    },
    public: { appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000' }
  },
  compatibilityDate: '2026-06-30',
  // Keep production bundling independent from vite-plugin-checker's Windows path parsing.
  // `pnpm typecheck` remains a mandatory, strict and separate quality gate.
  typescript: { strict: true, typeCheck: false },
  eslint: { config: { stylistic: { commaDangle: 'never', braceStyle: '1tbs' } } }
})
