import { normalizeAppUrl } from './config/production-env'

const isProduction = process.env.NODE_ENV === 'production'
const developmentSessionSecret = !isProduction ? process.env.NUXT_SESSION_PASSWORD : undefined

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image', '@nuxt/icon', '@pinia/nuxt', 'nuxt-auth-utils'],
  ssr: true,
  devtools: { enabled: !isProduction && process.env.NUXT_DEVTOOLS === 'true' },
  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#ffffff' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'light', fallback: 'light' },
  runtimeConfig: {
    checkoutSigningSecret: process.env.NUXT_CHECKOUT_SIGNING_SECRET || developmentSessionSecret,
    orderHandoffSecret: process.env.NUXT_ORDER_HANDOFF_SECRET || developmentSessionSecret,
    session: {
      password: process.env.NUXT_SESSION_PASSWORD,
      maxAge: 60 * 60 * 8,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
      }
    },
    public: {
      appUrl: normalizeAppUrl(process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000')
    }
  },
  compatibilityDate: '2026-06-30',
  nitro: { storage: { 'public-cache': { driver: 'memory' } } },
  // Keep production bundling independent from vite-plugin-checker's Windows path parsing.
  // `pnpm typecheck` remains a mandatory, strict and separate quality gate.
  typescript: { strict: true, typeCheck: false },
  debug: process.env.NUXT_DEBUG === 'true',
  hooks: {
    'vite:extendConfig'(config, { isClient }) {
      if (isProduction) return
      if (!isClient) {
        // Reka ships compiled ESM. Let Node load it rather than transforming its entire
        // barrel on the first SSR request. Keep Nuxt's other SSR rules unchanged.
        const ssr = config.ssr
        if (ssr && ssr.external !== true) {
          ssr.external = [...new Set([...(ssr.external || []), 'reka-ui'])]
        }
        return
      }
      // Nuxt UI excludes Reka's barrel from pre-bundling through build.transpile.
      // Pre-bundle only the dev client to avoid hundreds of individual module requests.
      const optimizeDeps = config.optimizeDeps
      if (!optimizeDeps) return
      optimizeDeps.exclude = optimizeDeps.exclude?.filter((name) => name !== 'reka-ui')
      optimizeDeps.include ||= []
      optimizeDeps.include.push('@nuxt/ui > reka-ui')
    }
  },
  eslint: { config: { stylistic: { commaDangle: 'never', braceStyle: '1tbs' } } }
})
