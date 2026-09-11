const baseUrl = (process.env.NUXT_PUBLIC_APP_URL || process.argv[2] || '').replace(/\/+$/, '')
if (!baseUrl) throw new Error('Provide NUXT_PUBLIC_APP_URL or a base URL argument')

const checks = [
  ['/', 'text/html'],
  ['/productos', 'text/html'],
  ['/robots.txt', 'text/plain'],
  ['/sitemap.xml', 'application/xml'],
  ['/api/health/live', 'application/json'],
  ['/api/health/ready', 'application/json']
]

for (const [path, contentType] of checks) {
  const response = await fetch(baseUrl + path, { redirect: 'manual' })
  if (!response.ok || !response.headers.get('content-type')?.includes(contentType)) {
    throw new Error(`Smoke check failed for ${path}: HTTP ${response.status}`)
  }
  console.log(`PASS ${path} (${response.status})`)
}
