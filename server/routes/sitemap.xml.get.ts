import { publicCatalogService } from '../services/public-catalog.service'
import { publicServiceService } from '../services/public-service.service'

function xml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.public.appUrl).replace(/\/$/, '')
  const [data, services] = await Promise.all([publicCatalogService.sitemap(), publicServiceService.sitemap()])
  const entries = [
    { path: '/', updatedAt: null },
    { path: '/productos', updatedAt: null },
    { path: '/servicios', updatedAt: null },
    ...data.categories.map((item) => ({
      path: `/categoria/${item.slug}`,
      updatedAt: item.updatedAt
    })),
    ...data.products.map((item) => ({
      path: `/productos/${item.slug}`,
      updatedAt: item.updatedAt
    })),
    ...services.map((item) => ({ path: `/servicios/${item.slug}`, updatedAt: item.updatedAt }))
  ]
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) =>
      `  <url><loc>${xml(baseUrl + entry.path)}</loc>${
        entry.updatedAt ? `<lastmod>${entry.updatedAt.toISOString()}</lastmod>` : ''
      }</url>`
  )
  .join('\n')}
</urlset>`
})
