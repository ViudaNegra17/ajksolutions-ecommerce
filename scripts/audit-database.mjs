import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import dotenv from 'dotenv'
import pg from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const env = dotenv.parse(await fs.readFile('.env'))
const url = new URL(env.DATABASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('DB audit is local-only')
process.env.DATABASE_URL = env.DATABASE_URL
const records = [],
  queries = []
const record = (value) => {
  records.push(value)
  console.log(JSON.stringify(value))
}
const direct = new pg.Client({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000
})
try {
  let start = performance.now()
  await direct.connect()
  record({ stage: 'pg.connect', ms: performance.now() - start })
  for (let sample = 1; sample <= 3; sample++) {
    start = performance.now()
    await direct.query('SELECT 1')
    record({ stage: 'pg.select1', sample, ms: performance.now() - start })
  }
} finally {
  await direct.end()
}
const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  log: [{ emit: 'event', level: 'query' }]
})
client.$on('query', (event) =>
  queries.push({
    hash: createHash('sha256').update(event.query).digest('hex').slice(0, 12),
    operation: event.query.match(/^\s*(\w+)/)?.[1],
    table: event.query.match(/(?:FROM|JOIN)\s+(?:"?public"?\.)?"?(\w+)/i)?.[1] || null,
    durationMs: event.duration
  })
)
globalThis.prisma = client
const nuxtRequire = createRequire(import.meta.resolve('nuxt/package.json'))
const { createJiti } = await import(pathToFileURL(nuxtRequire.resolve('jiti')).href)
const aliases = { '#shared': fileURLToPath(new URL('../shared', import.meta.url)) }
aliases.h3 = nuxtRequire.resolve('h3')
const load = createJiti(import.meta.url, { alias: aliases })
async function measure(stage, run, sample) {
  const offset = queries.length,
    start = performance.now()
  const value = await run()
  const selected = queries.slice(offset)
  record({
    stage,
    sample,
    ms: performance.now() - start,
    queryCount: selected.length,
    reportedQueryMs: selected.reduce((sum, q) => sum + q.durationMs, 0),
    queries: selected
  })
  return value
}
try {
  for (let sample = 1; sample <= 3; sample++)
    await measure('prisma.select1', () => client.$queryRawUnsafe('SELECT 1'), sample)
  const { publicCatalogService: catalog } = await load.import('../server/services/public-catalog.service.ts')
  const { publicServiceService: services } = await load.import('../server/services/public-service.service.ts')
  const { contentService: content } = await load.import('../server/services/operations.service.ts')
  const { publicProductQuerySchema } = await load.import('../shared/schemas/public-catalog.schema.ts')
  for (let sample = 1; sample <= 3; sample++) {
    await measure('home.settings', () => catalog.home(), sample)
    await measure('home.services', () => services.homeFeatured(), sample)
    await measure(
      'home.banners',
      () => Promise.all([content.publicBanners('HOME_HERO'), content.publicBanners('HOME_SECONDARY')]),
      sample
    )
    await measure(
      'home.total.uncached',
      () =>
        Promise.all([
          catalog.home(),
          services.homeFeatured(),
          content.publicBanners('HOME_HERO'),
          content.publicBanners('HOME_SECONDARY')
        ]),
      sample
    )
    await measure('products.list.uncached', () => catalog.list(publicProductQuerySchema.parse({})), sample)
    await measure('services.list.uncached', () => services.list(), sample)
  }
  const product = await client.product.findFirst({
    where: { active: true, deletedAt: null, category: { active: true, deletedAt: null } },
    select: { slug: true }
  })
  const service = await client.service.findFirst({
    where: { active: true, deletedAt: null, category: { active: true, deletedAt: null } },
    select: { slug: true }
  })
  record({
    stage: 'published.details',
    routes: [product && '/productos/' + product.slug, service && '/servicios/' + service.slug].filter(Boolean)
  })
  record({
    stage: 'cardinality',
    products: await client.product.count(),
    services: await client.service.count()
  })
} finally {
  await client.$disconnect()
  delete globalThis.prisma
  await fs.mkdir('logs/performance-audit', { recursive: true })
  await fs.writeFile(
    'logs/performance-audit/database.json',
    JSON.stringify(
      { capturedAt: new Date().toISOString(), provider: 'local-postgresql', host: 'localhost', records },
      null,
      2
    )
  )
}
