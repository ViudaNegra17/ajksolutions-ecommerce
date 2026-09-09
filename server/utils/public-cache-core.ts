import { createHash } from 'node:crypto'
import { publicCachePolicy, type PublicCacheResource } from './public-cache-policy'

type Storage = {
  getItem<T>(key: string): Promise<T | null>
  setItem(key: string, value: unknown): Promise<unknown>
  removeItem(key: string): Promise<unknown>
}
type Entry<T> = { value: T; expires: number }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
      .join(',')
    return `{${entries}}`
  }
  return JSON.stringify(value) ?? 'null'
}
export function createPublicReadCache(storage: Storage, now = Date.now, limit = 512) {
  const versions = new Map<PublicCacheResource, number>()
  const keys = new Map<string, PublicCacheResource>()
  const pending = new Map<string, Promise<unknown>>()
  let enabled = true
  return {
    async read<T>(
      resource: PublicCacheResource,
      params: unknown,
      loader: () => Promise<T>,
      deadline?: () => Promise<number | undefined>
    ): Promise<{ value: T; hit: boolean }> {
      if (!enabled) return { value: await loader(), hit: false }
      const version = versions.get(resource) || 0
      const key =
        resource + ':' + version + ':' + createHash('sha256').update(canonical(params)).digest('hex')
      const entry = await storage.getItem<Entry<T>>(key)
      if (entry && entry.expires > now() && (versions.get(resource) || 0) === version)
        return { value: structuredClone(entry.value), hit: true }
      if (pending.has(key)) return { value: structuredClone((await pending.get(key)) as T), hit: false }
      const load = (async () => {
        const start = now()
        const [value, end] = await Promise.all([loader(), deadline?.()])
        const expires = Math.min(start + publicCachePolicy[resource] * 1000, end ?? Infinity)
        if (expires > now() && (versions.get(resource) || 0) === version && enabled) {
          keys.set(key, resource)
          await storage.setItem(key, { value, expires })
          while (keys.size > limit) {
            const oldest = keys.keys().next().value!
            keys.delete(oldest)
            await storage.removeItem(oldest)
          }
        }
        return value
      })()
      pending.set(key, load)
      try {
        return { value: structuredClone(await load), hit: false }
      } finally {
        pending.delete(key)
      }
    },
    async invalidate(resources: PublicCacheResource[]) {
      for (const resource of resources) versions.set(resource, (versions.get(resource) || 0) + 1)
      const affected = [...keys].filter(([, resource]) => resources.includes(resource)).map(([key]) => key)
      try {
        await Promise.all(affected.map((key) => storage.removeItem(key)))
        for (const key of affected) keys.delete(key)
      } catch (error) {
        // Fail closed: after a successful write, storage failure must never expose old content.
        enabled = false
        throw error
      }
    }
  }
}
