import { publicInvalidations } from '../utils/public-cache-policy'
import { publicReadCache } from '../utils/public-cache'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', async (event) => {
    const path = getRequestURL(event).pathname
    if (!path.startsWith('/api/')) return
    // HTTP clients/CDNs must always revalidate against our explicitly invalidated server cache.
    setHeader(event, 'Cache-Control', 'no-store')
    if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return
    const resources = publicInvalidations(path)
    if (!resources.length) return
    try {
      // The handler (and any DB transaction) has settled before this hook.
      // Also invalidate failed writes: an audit failure can occur after a DB commit.
      await publicReadCache().invalidate(resources)
    } catch {
      console.error('Public cache disabled after invalidation storage failure')
    }
  })
})
