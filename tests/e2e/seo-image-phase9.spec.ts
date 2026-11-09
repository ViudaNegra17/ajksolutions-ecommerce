import { expect, test, type APIRequestContext } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial' })
const suffix = Date.now()
let slug = `qa-f9-image-${suffix}`
const name = `QA F9 Servicio ${suffix}`
const failedUrl = 'https://images.example.invalid/f9-image.png'
const validUrl = `${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'}/ajksolutions-official.png`
let categoryId = ''
let serviceId = ''

async function login(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', {
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
  })
  expect(response.ok()).toBe(true)
}

function serviceData(imageUrl: string | null) {
  return {
    name,
    slug,
    categoryId,
    shortDescription: 'Servicio de prueba aislado.',
    priceMode: 'FROM',
    price: '15.00',
    priceIncludesTax: true,
    taxRate: 0,
    active: true,
    featured: true,
    imageUrl
  }
}

test.beforeAll(async ({ request }) => {
  await login(request)
  const category = await prisma.serviceCategory.create({ data: { name, slug, active: true } })
  categoryId = category.id
  const response = await request.post('/api/admin/services', { data: serviceData(null) })
  expect(response.status(), await response.text()).toBe(201)
  const saved = (await response.json()).data
  serviceId = saved.id
  slug = saved.slug
})

test.afterAll(async ({ request }) => {
  if (serviceId) {
    await login(request)
    expect((await request.delete(`/api/admin/services/${serviceId}`)).ok()).toBe(true)
    await prisma.auditLog.deleteMany({ where: { entityId: serviceId } })
    await prisma.service.delete({ where: { id: serviceId } })
  }
  if (categoryId) await prisma.serviceCategory.delete({ where: { id: categoryId } })
  await prisma.$disconnect()
})

for (const route of ['home', 'services', 'detail'] as const) {
  for (const mode of ['missing', 'valid', 'failed'] as const) {
    test(`F9-06 ${route} imagen ${mode} conserva dimensiones, precio y CTA`, async ({ page, request }) => {
      await login(request)
      const imageUrl = mode === 'missing' ? null : mode === 'valid' ? validUrl : failedUrl
      const response = await request.put(`/api/admin/services/${serviceId}`, { data: serviceData(imageUrl) })
      expect(response.ok(), await response.text()).toBe(true)
      const errors: string[] = []
      const hydration: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (/hydration/i.test(message.text())) hydration.push(message.text())
      })
      let release = () => {}
      if (mode === 'failed') {
        const pending = new Promise<void>((resolve) => {
          release = resolve
        })
        await page.route(failedUrl, async (interception) => {
          await pending
          await interception.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<p>Controlled non-image QA response</p>'
          })
        })
      }
      try {
        const path = route === 'home' ? '/' : route === 'services' ? '/servicios' : `/servicios/${slug}`
        expect((await page.goto(path, { waitUntil: 'domcontentloaded' }))?.status()).toBe(200)
        await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
          timeout: 30_000
        })
        const surface =
          route === 'home'
            ? page.locator(`.home-services__card[href="/servicios/${slug}"]`)
            : route === 'services'
              ? page.getByRole('heading', { name, exact: true }).locator('..')
              : page.locator('article')
        const image = surface.locator('[data-service-image]')
        await image.scrollIntoViewIfNeeded()
        const before = await image.boundingBox()
        expect(before!.height).toBeGreaterThan(30)
        if (mode === 'failed') release()
        if (mode === 'valid') {
          await expect(image.locator('img')).toHaveAttribute('alt', name)
          await expect
            .poll(() =>
              image
                .locator('img')
                .evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
            )
            .toBe(true)
          await expect(image.locator('[data-service-image-fallback]')).toHaveCount(0)
        } else {
          await expect(image.getByRole('img', { name: `Imagen no disponible para ${name}` })).toBeVisible()
          await expect(image.locator('img')).toHaveCount(0)
        }
        const after = await image.boundingBox()
        expect(Math.abs(before!.height - after!.height)).toBeLessThanOrEqual(1)
        expect(Math.abs(before!.width - after!.width)).toBeLessThanOrEqual(1)
        await expect(surface.getByText('Desde', { exact: false }).first()).toBeVisible()
        await expect(surface.getByText(/15[.,]00/).first()).toBeVisible()
        if (route === 'detail')
          await expect(page.getByRole('button', { name: 'Crear ticket de servicio' })).toBeVisible()
        else {
          const link = route === 'home' ? surface : surface.getByRole('link', { name: 'Ver servicio' })
          await expect(link).toHaveAttribute('href', `/servicios/${slug}`)
          await link.click()
          await expect(page).toHaveURL(new RegExp(`/servicios/${slug}$`))
          await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
        }
        expect(errors).toEqual([])
        expect(hydration).toEqual([])
      } finally {
        release()
      }
    })
  }
}

test('F9-08 Home emite Organization y WebSite SSR con settings y conserva metadata', async ({
  page,
  request
}) => {
  const settings = (await (await request.get('/api/settings/public')).json()).data
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  const schemas = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
  ].map((match) => JSON.parse(match[1]!))
  expect(schemas.filter((schema) => schema['@type'] === 'Organization')).toHaveLength(1)
  expect(schemas.filter((schema) => schema['@type'] === 'WebSite')).toHaveLength(1)
  const organization = schemas.find((schema) => schema['@type'] === 'Organization')
  const website = schemas.find((schema) => schema['@type'] === 'WebSite')
  const origin = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
  expect(organization).toMatchObject({
    ['@context']: 'https://schema.org',
    ['@id']: `${origin}/#organization`,
    name: settings.business.name,
    url: `${origin}/`,
    logo: `${origin}/ajksolutions-official.png`
  })
  expect(website).toMatchObject({
    ['@context']: 'https://schema.org',
    name: settings.seo.siteName,
    url: `${origin}/`,
    publisher: { ['@id']: organization['@id'] }
  })
  await page.goto('/')
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 30_000
  })
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`)
  await expect(page).toHaveTitle(new RegExp(settings.seo.title))
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]'
  ]) {
    await expect(page.locator(selector)).toHaveAttribute('content', /\S/)
  }
})

test('F9-08 marcador inocuo en settings permanece dentro del JSON-LD', async ({ page, request }) => {
  await login(request)
  const original = (await (await request.get('/api/admin/settings')).json()).data
  const marker =
    '</script><script>globalThis.__phase9JsonLdProbe=true</script><script type="application/ld+json">'
  const changed = structuredClone(original)
  changed.business.name = marker
  changed.seo.defaultDescription = marker
  try {
    expect((await request.put('/api/admin/settings', { data: changed })).ok()).toBe(true)
    const response = await request.get('/')
    const html = await response.text()
    const rawDocument = await page.evaluate((source) => {
      const document = new DOMParser().parseFromString(source, 'text/html')
      return {
        executableProbe: [...document.querySelectorAll('script:not([type="application/ld+json"])')].some(
          (script) => script.textContent === 'globalThis.__phase9JsonLdProbe=true'
        ),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
          (script) => script.textContent!
        )
      }
    }, html)
    expect(rawDocument.executableProbe).toBe(false)
    expect(rawDocument.jsonld).toHaveLength(2)
    for (const json of rawDocument.jsonld) {
      expect(json).not.toContain('<')
      expect(() => JSON.parse(json)).not.toThrow()
    }
    await page.goto('/')
    const jsonld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((elements) => elements.map((element) => JSON.parse(element.textContent!)))
    expect(jsonld.find((schema) => schema['@type'] === 'Organization')?.name).toBe(marker)
    expect(jsonld.find((schema) => schema['@type'] === 'WebSite')?.description).toBe(marker)
    expect(await page.evaluate(() => '__phase9JsonLdProbe' in globalThis)).toBe(false)
    expect(
      await page
        .locator('script:not([type="application/ld+json"])')
        .evaluateAll((elements) =>
          elements.some((element) => element.textContent === 'globalThis.__phase9JsonLdProbe=true')
        )
    ).toBe(false)
  } finally {
    expect((await request.put('/api/admin/settings', { data: original })).ok()).toBe(true)
  }
})
