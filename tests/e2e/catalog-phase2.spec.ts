import { expect, test } from '@playwright/test'
import 'dotenv/config'

test('muestra el formulario administrativo de nuevo producto', async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  test.skip(!email || !password, 'Configura las credenciales del seed para esta prueba')

  const login = await page.request.post('/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBeTruthy()
  await page.goto('/admin/catalogo/productos/nuevo')
  await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible()
  await expect(page.getByLabel('Nombre')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar producto' })).toBeVisible()
  await page.goto('/admin/catalogo/productos')
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
  await page.goto('/admin/catalogo/inventario')
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible()
})

test('administra categoría, producto y ajuste de inventario mediante la API', async ({ request }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  test.skip(!email || !password, 'Configura las credenciales del seed para esta prueba')

  const login = await request.post('/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBeTruthy()

  const suffix = Date.now().toString()
  const categoryResponse = await request.post('/api/admin/categories', {
    data: { name: `E2E ${suffix}`, slug: `e2e-${suffix}`, active: true, sortOrder: 0 }
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const category = (await categoryResponse.json()).data as { id: string }
  const categoryUpdate = await request.put(`/api/admin/categories/${category.id}`, {
    data: {
      name: `E2E editada ${suffix}`,
      slug: `e2e-${suffix}`,
      active: false,
      sortOrder: 1
    }
  })
  expect(categoryUpdate.ok()).toBeTruthy()
  const categoryActivation = await request.put(`/api/admin/categories/${category.id}`, {
    data: {
      name: `E2E editada ${suffix}`,
      slug: `e2e-${suffix}`,
      active: true,
      sortOrder: 1
    }
  })
  expect(categoryActivation.ok()).toBeTruthy()

  let productId = ''
  try {
    const productInput = {
      sku: `E2E-${suffix}`,
      name: 'Producto E2E',
      slug: `producto-e2e-${suffix}`,
      categoryId: category.id,
      productType: 'PHYSICAL',
      priceMode: 'FIXED',
      price: 100,
      taxRate: 15,
      priceIncludesTax: false,
      manageStock: true,
      active: true,
      featured: false,
      images: [],
      attributeValues: [],
      variants: [],
      supplierProducts: []
    } as const
    const productResponse = await request.post('/api/admin/products', {
      data: productInput
    })
    expect(productResponse.ok()).toBeTruthy()
    productId = ((await productResponse.json()).data as { id: string }).id
    const productList = await request.get(`/api/admin/products?search=E2E-${suffix}`)
    expect(productList.ok()).toBeTruthy()
    expect(
      ((await productList.json()).data.items as Array<{ id: string }>).some((item) => item.id === productId)
    ).toBe(true)

    const priceUpdate = await request.put(`/api/admin/products/${productId}`, {
      data: { ...productInput, price: 120 }
    })
    expect(priceUpdate.ok()).toBeTruthy()
    expect(((await priceUpdate.json()).data as { price: string }).price).toBe('120')

    const locationsResponse = await request.get('/api/admin/inventory/locations')
    const locations = (await locationsResponse.json()).data as Array<{ id: string }>
    expect(locations.length).toBeGreaterThan(0)

    const adjustment = await request.post('/api/admin/inventory/adjust', {
      data: {
        locationId: locations[0]!.id,
        productId,
        type: 'INITIAL',
        quantity: 3,
        reason: 'Carga E2E'
      }
    })
    expect(adjustment.ok()).toBeTruthy()

    const availability = await request.get(`/api/admin/products/${productId}/availability`)
    expect(availability.ok()).toBeTruthy()
    await expect(availability.json()).resolves.toMatchObject({
      success: true,
      data: { ownStock: 3, supplierStock: 0, source: 'OWN_STOCK' }
    })

    const negative = await request.post('/api/admin/inventory/adjust', {
      data: {
        locationId: locations[0]!.id,
        productId,
        type: 'ADJUSTMENT_OUT',
        quantity: 4,
        reason: 'No permitido'
      }
    })
    expect(negative.status()).toBe(409)
  } finally {
    if (productId) await request.delete(`/api/admin/products/${productId}`)
    await request.delete(`/api/admin/categories/${category.id}`)
    const { prisma } = await import('../../server/utils/prisma')
    const stockIds = productId
      ? (
          await prisma.inventoryStock.findMany({
            where: { productId },
            select: { id: true }
          })
        ).map((stock) => stock.id)
      : []
    const entityIds = [category.id, productId, ...stockIds].filter(Boolean)
    await prisma.auditLog.deleteMany({ where: { entityId: { in: entityIds } } })
    if (productId) {
      await prisma.inventoryMovement.deleteMany({ where: { productId } })
      await prisma.product.deleteMany({ where: { id: productId } })
    }
    await prisma.category.deleteMany({ where: { id: category.id } })
    await prisma.$disconnect()
  }
})

test('rechaza ciclos de categorías y categorías eliminadas en productos nuevos', async ({ request }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  test.skip(!email || !password, 'Configura las credenciales del seed para esta prueba')

  const login = await request.post('/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBeTruthy()

  const suffix = Date.now().toString()
  const categoryIds: string[] = []
  try {
    const parentResponse = await request.post('/api/admin/categories', {
      data: { name: `Ciclo A ${suffix}`, slug: `ciclo-a-${suffix}`, active: true, sortOrder: 0 }
    })
    expect(parentResponse.ok()).toBeTruthy()
    const parentId = ((await parentResponse.json()).data as { id: string }).id
    categoryIds.push(parentId)

    const childResponse = await request.post('/api/admin/categories', {
      data: {
        name: `Ciclo B ${suffix}`,
        slug: `ciclo-b-${suffix}`,
        parentId,
        active: true,
        sortOrder: 0
      }
    })
    expect(childResponse.ok()).toBeTruthy()
    const childId = ((await childResponse.json()).data as { id: string }).id
    categoryIds.push(childId)

    const selfCycle = await request.put(`/api/admin/categories/${parentId}`, {
      data: {
        name: `Ciclo A ${suffix}`,
        slug: `ciclo-a-${suffix}`,
        parentId,
        active: true,
        sortOrder: 0
      }
    })
    expect(selfCycle.status()).toBe(422)

    const indirectCycle = await request.put(`/api/admin/categories/${parentId}`, {
      data: {
        name: `Ciclo A ${suffix}`,
        slug: `ciclo-a-${suffix}`,
        parentId: childId,
        active: true,
        sortOrder: 0
      }
    })
    expect(indirectCycle.status()).toBe(422)

    const deletedResponse = await request.post('/api/admin/categories', {
      data: {
        name: `Eliminada ${suffix}`,
        slug: `eliminada-e2e-${suffix}`,
        active: true,
        sortOrder: 0
      }
    })
    expect(deletedResponse.ok()).toBeTruthy()
    const deletedId = ((await deletedResponse.json()).data as { id: string }).id
    categoryIds.push(deletedId)
    expect((await request.delete(`/api/admin/categories/${deletedId}`)).ok()).toBeTruthy()

    const invalidProduct = await request.post('/api/admin/products', {
      data: {
        sku: `DELETED-${suffix}`,
        name: 'Producto inválido',
        categoryId: deletedId,
        priceMode: 'FIXED',
        price: 10
      }
    })
    expect(invalidProduct.status()).toBe(422)
  } finally {
    const { prisma } = await import('../../server/utils/prisma')
    await prisma.auditLog.deleteMany({ where: { entityId: { in: categoryIds } } })
    for (const id of [...categoryIds].reverse()) {
      await prisma.category.deleteMany({ where: { id } })
    }
    await prisma.$disconnect()
  }
})
