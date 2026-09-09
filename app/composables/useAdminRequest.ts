export const adminRefreshDomains = {
  dashboard: ['admin:dashboard'],
  products: ['admin:products:list', 'admin:inventory:stock', 'admin:inventory:movements', 'admin:dashboard'],
  inventory: ['admin:inventory:stock', 'admin:inventory:movements', 'admin:products:list', 'admin:dashboard'],
  orders: ['admin:orders:list', 'admin:dashboard'],
  tickets: ['admin:tickets:list', 'admin:dashboard'],
  banners: ['admin:banners:list', 'admin:dashboard'],
  promotions: ['admin:promotions:list', 'admin:dashboard'],
  settings: ['admin:settings', 'admin:dashboard'],
  services: ['admin:services:list', 'admin:service-categories', 'admin:dashboard'],
  customers: ['admin:customers:list', 'admin:dashboard'],
  catalog: ['admin:products:list', 'admin:categories:list', 'admin:brands:list', 'admin:dashboard']
} as const

export type AdminRefreshDomain = keyof typeof adminRefreshDomains
export type AdminRefreshSelection = {
  keys?: string | string[]
  domains?: AdminRefreshDomain | AdminRefreshDomain[]
  /** Global refresh is retained for unmigrated callers and as recovery if a selective refresh fails. */
  fallbackGlobal?: boolean
}

function asArray<T>(value?: T | T[]) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

export function resolveAdminRefreshKeys(selection: AdminRefreshSelection = {}) {
  const keys = [...asArray(selection.keys)]
  for (const domain of asArray(selection.domains)) keys.push(...adminRefreshDomains[domain])
  return [...new Set(keys.filter(Boolean))]
}

/**
 * Capture Nuxt context during setup. Successful admin writes refresh only the
 * selected data keys/domains. Existing callers without a selection keep the
 * global refresh fallback, so migration can remain incremental and safe.
 */
export function useAdminRequest(selection: AdminRefreshSelection = {}) {
  const app = useNuxtApp()
  const keys = resolveAdminRefreshKeys(selection)
  const fallbackGlobal = selection.fallbackGlobal ?? true

  return $fetch.create({
    retry: 0,
    async onResponse({ request, options, response }) {
      if (typeof request !== 'string' || !request.startsWith('/api/admin/')) return
      if (['GET', 'HEAD'].includes(String(options.method || 'GET').toUpperCase()) || !response.ok) return

      await app.runWithContext(async () => {
        if (!keys.length) {
          if (fallbackGlobal) await refreshNuxtData()
          return
        }
        try {
          await refreshNuxtData(keys)
        } catch (error) {
          if (!fallbackGlobal) throw error
          await refreshNuxtData()
        }
      })
    }
  })
}
