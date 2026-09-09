/**
 * Capture Nuxt context during setup. Imperative reads keep their normal semantics;
 * successful writes reconcile mounted Nuxt queries before callers show success.
 * Existing local refresh calls remain useful for page-specific normalization.
 */
export function useAdminRequest() {
  const app = useNuxtApp()
  return $fetch.create({
    retry: 0,
    async onResponse({ request, options, response }) {
      if (typeof request !== 'string' || !request.startsWith('/api/admin/')) return
      if (['GET', 'HEAD'].includes(String(options.method || 'GET').toUpperCase()) || !response.ok) return
      await app.runWithContext(() => refreshNuxtData())
    }
  })
}
