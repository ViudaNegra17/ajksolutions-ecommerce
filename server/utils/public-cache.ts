import type { H3Event } from 'h3'
import { createPublicReadCache } from './public-cache-core'
import type { PublicCacheResource } from './public-cache-policy'
import { prisma } from './prisma'

export function definePublicCachedHandler<T>(
  resource: PublicCacheResource,
  handler: (event: H3Event) => Promise<T>
) {
  return defineEventHandler((event) =>
    publicCached(event, resource, { path: getRequestURL(event).pathname, query: getQuery(event) }, () =>
      handler(event)
    )
  )
}

let cache: ReturnType<typeof createPublicReadCache> | undefined
export function publicReadCache() {
  return (cache ||= createPublicReadCache(useStorage('public-cache')))
}
async function nextScheduleBoundary() {
  const current = new Date()
  const where = {
    active: true,
    deletedAt: null,
    OR: [{ startsAt: { gt: current } }, { endsAt: { gt: current } }]
  }
  const [banners, promotions] = await Promise.all([
    prisma.banner.findMany({ where, select: { startsAt: true, endsAt: true } }),
    prisma.promotion.findMany({ where, select: { startsAt: true, endsAt: true } })
  ])
  const times = [...banners, ...promotions]
    .flatMap((row) => [row.startsAt?.getTime(), row.endsAt?.getTime()])
    .filter((time): time is number => time !== undefined && time > current.getTime())
  return times.length ? Math.min(...times) : undefined
}
/** Cache DTOs only, not headers, sessions, H3 events or raw Prisma rows. */
export async function publicCached<T>(
  event: H3Event,
  resource: PublicCacheResource,
  parameters: unknown,
  loader: () => Promise<T>
) {
  setHeader(event, 'Cache-Control', 'no-store')
  const result = await publicReadCache().read(
    resource,
    parameters,
    loader,
    ['products', 'home', 'banners'].includes(resource) ? nextScheduleBoundary : undefined
  )
  setHeader(event, 'X-Public-Cache', result.hit ? 'HIT' : 'MISS')
  return result.value
}
