export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    'Disallow: /carrito',
    'Disallow: /checkout',
    'Disallow: /pedido',
    'Disallow: /*/comprar',
    `Sitemap: ${config.public.appUrl}/sitemap.xml`
  ].join('\n')
})
