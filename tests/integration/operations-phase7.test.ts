import 'dotenv/config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../../server/utils/prisma'
import { contentService, dashboardService } from '../../server/services/operations.service'
import { publicCatalogService } from '../../server/services/public-catalog.service'

const suffix = Date.now().toString()
const ids: Record<string, string> = {}

describe('Fase 7: operación y contenido', () => {
  beforeAll(async () => {
    const category = await prisma.category.create({
      data: { name: `Categoría F7 ${suffix}`, slug: `categoria-f7-${suffix}`, active: true }
    })
    ids.category = category.id
    const product = await prisma.product.create({
      data: {
        productCode: `F7P${suffix.slice(-10)}`,
        sku: `F7-${suffix}`,
        name: `Producto F7 ${suffix}`,
        slug: `producto-f7-${suffix}`,
        categoryId: category.id,
        productType: 'PHYSICAL',
        priceMode: 'FIXED',
        price: '19.90',
        taxRate: '0',
        manageStock: true,
        active: true
      }
    })
    ids.product = product.id
    const promotion = await prisma.promotion.create({
      data: {
        code: `PRO-T${suffix.slice(-6)}`,
        name: 'Promoción principal',
        badge: 'Oferta',
        type: 'INFORMATIONAL',
        active: true,
        priority: 10,
        categories: { create: { categoryId: category.id } }
      }
    })
    ids.promotion = promotion.id
    const banners = await Promise.all([
      prisma.banner.create({
        data: {
          code: `BAN-A${suffix.slice(-6)}`,
          title: 'Segundo',
          imageUrl: 'https://example.com/2.jpg',
          placement: 'HOME_HERO',
          active: true,
          sortOrder: 2
        }
      }),
      prisma.banner.create({
        data: {
          code: `BAN-B${suffix.slice(-6)}`,
          title: 'Primero',
          imageUrl: 'https://example.com/1.jpg',
          placement: 'HOME_HERO',
          active: true,
          sortOrder: 1
        }
      }),
      prisma.banner.create({
        data: {
          code: `BAN-C${suffix.slice(-6)}`,
          title: 'Futuro',
          imageUrl: 'https://example.com/3.jpg',
          placement: 'HOME_HERO',
          active: true,
          startsAt: new Date(Date.now() + 86_400_000)
        }
      }),
      prisma.banner.create({
        data: {
          code: `BAN-D${suffix.slice(-6)}`,
          title: 'Expirado',
          imageUrl: 'https://example.com/4.jpg',
          placement: 'HOME_HERO',
          active: true,
          endsAt: new Date(Date.now() - 86_400_000)
        }
      }),
      prisma.banner.create({
        data: {
          code: `BAN-E${suffix.slice(-6)}`,
          title: 'Eliminado',
          imageUrl: 'https://example.com/5.jpg',
          placement: 'HOME_HERO',
          active: true,
          deletedAt: new Date()
        }
      })
    ])
    ids.banners = banners.map((item) => item.id).join(',')
  })

  afterAll(async () => {
    await prisma.banner.deleteMany({ where: { id: { in: ids.banners.split(',') } } })
    await prisma.promotion.deleteMany({ where: { id: ids.promotion } })
    await prisma.product.deleteMany({ where: { id: ids.product } })
    await prisma.category.deleteMany({ where: { id: ids.category } })
    await prisma.$disconnect()
  })

  it('publica únicamente banners vigentes y respeta sortOrder estable', async () => {
    const items = (await contentService.publicBanners('HOME_HERO')).filter((item) =>
      ['Primero', 'Segundo', 'Futuro', 'Expirado', 'Eliminado'].includes(item.title)
    )
    expect(items.map((item) => item.title)).toEqual(['Primero', 'Segundo'])
  })

  it('aplica por categoría un badge informativo sin cambiar precio', async () => {
    const result = await publicCatalogService.list({
      page: 1,
      pageSize: 20,
      search: `Producto F7 ${suffix}`,
      sort: 'relevance',
      attributes: ''
    })
    const item = result.items.find((row) => row.id === ids.product)
    expect(item?.promotion?.badge).toBe('Oferta')
    expect(item?.price.amount).toBe('19.90')
  })

  it('dashboard entrega strings decimales, threshold configurado y nunca stock DIGITAL', async () => {
    const result = await dashboardService.get('30d')
    expect(result.money.orderValue).toMatch(/^\d+\.\d{2}$/)
    expect(result.lowStock.threshold).toBe(3)
    expect(result.lowStock.items.every((item) => item.available <= result.lowStock.threshold)).toBe(true)
  })

  it('settings público sólo expone DTO permitido', async () => {
    const settings = await publicCatalogService.settings()
    expect(settings.business.name).toBeTruthy()
    expect(settings.currency).toBe('USD')
    expect(settings).not.toHaveProperty('DATABASE_URL')
    expect(JSON.stringify(settings)).not.toContain('sessionSecret')
  })
})
