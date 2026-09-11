import { expect, test } from '@playwright/test'
import 'dotenv/config'
import { prisma } from '../../server/utils/prisma'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now().toString()
const fixture = {
  categoryId: '',
  attributeId: '',
  categorySlug: `e2e-fase-3-${suffix}`,
  variantSlug: `e2e-equipo-variant-${suffix}`,
  contactSlug: `e2e-equipo-contact-${suffix}`,
  deletedSlug: `e2e-equipo-deleted-${suffix}`
}

async function waitForHydration(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-public-app]')).toHaveAttribute('data-hydrated', 'true', {
    timeout: 15_000
  })
}

test.beforeAll(async () => {
  const category = await prisma.category.create({
    data: { name: `Equipos E2E ${suffix}`, slug: fixture.categorySlug, active: true }
  })
  const attribute = await prisma.attribute.create({
    data: {
      name: 'Capacidad',
      slug: `capacidad-e2e-${suffix}`,
      type: 'SELECT',
      filterable: true,
      variant: true,
      categories: { create: { categoryId: category.id } },
      options: {
        create: [
          { value: '8gb', label: '8 GB', sortOrder: 1 },
          { value: '16gb', label: '16 GB', sortOrder: 2 }
        ]
      }
    },
    include: { options: true }
  })
  fixture.categoryId = category.id
  fixture.attributeId = attribute.id
  const product = await prisma.product.create({
    data: {
      productCode: `E2EP-${suffix}`,
      sku: `E2EP-${suffix}`,
      name: `Laptop E2E Fase 3 ${suffix}`,
      slug: fixture.variantSlug,
      shortDescription: 'Equipo verificable para el portal público.',
      categoryId: category.id,
      priceMode: 'FIXED',
      price: '500.00',
      taxRate: '0.00',
      active: true,
      featured: true,
      metaTitle: 'Laptop E2E catálogo público',
      variants: {
        create: attribute.options.map((option, index) => ({
          variantCode: `E2EV${index}-${suffix}`,
          sku: `E2EV${index}-${suffix}`,
          combinationKey: option.id,
          priceOverride: option.value === '8gb' ? '400.00' : '450.00',
          attributeValues: {
            create: { attributeId: attribute.id, optionId: option.id }
          }
        }))
      }
    },
    include: { variants: true }
  })
  await prisma.product.createMany({
    data: [
      {
        productCode: `E2EC-${suffix}`,
        sku: `E2EC-${suffix}`,
        name: `Solución CONTACT E2E ${suffix}`,
        slug: fixture.contactSlug,
        categoryId: category.id,
        priceMode: 'CONTACT',
        active: true
      },
      {
        productCode: `E2ED-${suffix}`,
        sku: `E2ED-${suffix}`,
        name: `Producto eliminado E2E ${suffix}`,
        slug: fixture.deletedSlug,
        categoryId: category.id,
        priceMode: 'CONTACT',
        active: true,
        deletedAt: new Date()
      }
    ]
  })
  const location = await prisma.inventoryLocation.findFirstOrThrow({
    where: { active: true, deletedAt: null }
  })
  await prisma.inventoryStock.createMany({
    data: product.variants.map((variant, index) => ({
      locationId: location.id,
      productId: product.id,
      variantId: variant.id,
      quantityOnHand: index === 0 ? 3 : 1
    }))
  })
})

test.afterAll(async () => {
  if (fixture.categoryId) await prisma.product.deleteMany({ where: { categoryId: fixture.categoryId } })
  if (fixture.attributeId) await prisma.attribute.delete({ where: { id: fixture.attributeId } })
  if (fixture.categoryId) await prisma.category.delete({ where: { id: fixture.categoryId } })
  await prisma.$disconnect()
})

test('API pública pagina, filtra y no expone datos internos', async ({ request }) => {
  const response = await request.get(
    `/api/products?category=${fixture.categorySlug}&page=1&pageSize=1&sort=price-asc`
  )
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body.success).toBe(true)
  expect(body.data.items).toHaveLength(1)
  expect(body.data.pagination.total).toBe(2)
  expect(JSON.stringify(body)).not.toContain('supplierCost')
  expect(JSON.stringify(body)).not.toContain('deletedAt')

  const deleted = await request.get(`/api/products/${fixture.deletedSlug}`)
  expect(deleted.status()).toBe(404)
})

test('Home navega al catálogo y conserva el filtro en la URL', async ({ page }) => {
  await page.goto(`/?e2e=${suffix}`)
  await waitForHydration(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tecnología')
  await page.goto('/productos')
  await waitForHydration(page)
  await page.locator('#filter-category').selectOption(fixture.categorySlug)
  await expect(page).toHaveURL(new RegExp(`category=${fixture.categorySlug}`))
  await expect(page.getByRole('link', { name: `Laptop E2E Fase 3 ${suffix}` }).first()).toBeVisible()
})

test('la búsqueda abre detalle y la variante actualiza precio y disponibilidad', async ({ page }) => {
  await page.goto('/productos')
  await waitForHydration(page)
  await page.locator('#catalog-search').fill(`Laptop E2E Fase 3 ${suffix}`)
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/search=Laptop/)
  await page
    .getByRole('link', { name: `Laptop E2E Fase 3 ${suffix}` })
    .first()
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Laptop E2E')
  await page.getByRole('button', { name: '8 GB' }).click()
  await expect(page.getByText(/400[.,]00/).first()).toBeVisible()
  await page.getByRole('button', { name: '16 GB' }).click()
  await expect(page.getByText(/450[.,]00/).first()).toBeVisible()
  await expect(page.getByText(/Disponible/).first()).toBeVisible()
})

test('CONTACT no muestra cero y SEO, sitemap y robots son públicos', async ({ page, request }) => {
  await page.goto(`/productos/${fixture.contactSlug}`)
  await waitForHydration(page)
  await expect(page.getByText('Consultar precio').first()).toBeVisible()
  await expect(page.getByText(/\$\s*0(?:[.,]00)?/)).toHaveCount(0)

  await page.goto(`/productos/${fixture.variantSlug}`)
  await waitForHydration(page)
  await expect(page).toHaveTitle(/Laptop E2E catálogo público/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    new RegExp(`/productos/${fixture.variantSlug}$`)
  )
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2)

  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain(`/productos/${fixture.variantSlug}`)
  expect(sitemap).not.toContain(fixture.deletedSlug)
  expect(sitemap).not.toContain('/admin')
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /admin')
  expect(robots).toContain('Disallow: /api')
})
