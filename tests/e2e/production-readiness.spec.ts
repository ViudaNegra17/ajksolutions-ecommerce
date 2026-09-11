/* eslint-disable @stylistic/quotes -- Assertions include literal CSP keywords. */

import { expect, test } from '@playwright/test'

test.describe('Phase 8 production readiness', () => {
  test('serves correlation and security headers without development HSTS', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)
    expect(response.headers()['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(response.headers()['strict-transport-security']).toBeUndefined()
  })

  test('separates liveness and readiness with minimal payloads', async ({ request }) => {
    const live = await request.get('/api/health/live')
    const ready = await request.get('/api/health/ready')
    expect(live.status()).toBe(200)
    expect(await live.json()).toEqual({ status: 'ok' })
    expect(ready.status()).toBe(200)
    expect(await ready.json()).toEqual({ status: 'ok' })
  })

  test('noindexes transactional and filtered catalog pages', async ({ page }) => {
    await page.goto('/carrito')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    await page.goto('/productos?search=ssd')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'}/productos`
    )
  })

  test('keeps robots and sitemap free of transactional and legacy URLs', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Disallow: /admin')
    expect(robots).toContain('Disallow: /checkout')
    const sitemapResponse = await request.get('/sitemap.xml')
    expect(sitemapResponse.status()).toBe(200)
    const sitemap = await sitemapResponse.text()
    expect(sitemap).toContain('<urlset')
    expect(sitemap).not.toMatch(/<loc>https?:\/\/[^/]+\/licencias(?:\/[^<]*)?<\/loc>/)
    expect(sitemap).not.toContain('/checkout')
    expect(sitemap).not.toContain('/admin')
  })
})
