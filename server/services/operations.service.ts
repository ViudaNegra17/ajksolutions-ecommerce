import type { H3Event } from 'h3'
import { Prisma, type BannerPlacement, type OrderStatus } from '@prisma/client'
import type { BannerInput } from '#shared/schemas/banner.schema'
import type { DashboardPeriod } from '#shared/schemas/dashboard.schema'
import type { PromotionInput } from '#shared/schemas/promotion.schema'
import type { z } from 'zod'
import type { adminSettingsSchema } from '#shared/schemas/admin-settings.schema'
import { normalizePhone } from '#shared/utils/tickets'
import { prisma } from '../utils/prisma'
import { apiError } from '../utils/api-error'
import { nextCommercialCode } from '../repositories/code.repository'
import { auditService } from './audit.service'

type SettingsInput = z.infer<typeof adminSettingsSchema>
const VALUE_STATUSES: OrderStatus[] = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'PAYMENT_PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'SHIPPED',
  'DELIVERED'
]
const CONFIRMED_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'PAYMENT_PENDING',
  'PAID',
  'PREPARING',
  'READY',
  'SHIPPED',
  'DELIVERED'
]
export function orderMetricPolicy(status: OrderStatus) {
  return {
    orderValue: VALUE_STATUSES.includes(status),
    confirmedValue: CONFIRMED_STATUSES.includes(status),
    deliveredValue: status === 'DELIVERED'
  }
}
export function ownStockAvailable(input: {
  productType: 'PHYSICAL' | 'DIGITAL'
  quantityOnHand: number
  quantityReserved: number
}) {
  return input.productType === 'PHYSICAL' ? input.quantityOnHand - input.quantityReserved : null
}
export function isScheduleActive(
  input: {
    active: boolean
    deletedAt: Date | null
    startsAt: Date | null
    endsAt: Date | null
  },
  now = new Date()
) {
  return (
    input.active &&
    !input.deletedAt &&
    (!input.startsAt || input.startsAt <= now) &&
    (!input.endsAt || input.endsAt >= now)
  )
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}
function current(value: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>
}
function fromZoned(parts: Record<string, number>, timeZone: string) {
  const guess = new Date(
    Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour || 0, parts.minute || 0, parts.second || 0)
  )
  const seen = current(guess, timeZone)
  const offset =
    Date.UTC(seen.year!, seen.month! - 1, seen.day!, seen.hour!, seen.minute!, seen.second!) - guess.getTime()
  return new Date(guess.getTime() - offset)
}
export function dashboardRange(period: DashboardPeriod, now = new Date(), timeZone = 'America/Guayaquil') {
  const local = current(now, timeZone)
  const startParts: Record<string, number> = { ...local, hour: 0, minute: 0, second: 0 }
  if (period === 'month') startParts.day = 1
  else if (period !== 'today') {
    const days = period === '7d' ? 6 : 29
    const date = new Date(Date.UTC(startParts.year!, startParts.month! - 1, startParts.day! - days))
    startParts.year = date.getUTCFullYear()
    startParts.month = date.getUTCMonth() + 1
    startParts.day = date.getUTCDate()
  }
  return { from: fromZoned(startParts, timeZone), to: now }
}
function scheduleWhere(now = new Date()) {
  return {
    active: true,
    deletedAt: null,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
    ]
  } satisfies Prisma.BannerWhereInput
}

export const dashboardService = {
  async get(period: DashboardPeriod) {
    const settingRows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'business.timeZone',
            'currency',
            'inventory.lowStockThreshold',
            'orders.newAlertHours',
            'tickets.newAlertHours'
          ]
        }
      }
    })
    const settings = new Map(settingRows.map((row) => [row.key, row.value]))
    const timeZone =
      typeof settings.get('business.timeZone') === 'string'
        ? String(settings.get('business.timeZone'))
        : 'America/Guayaquil'
    const threshold = Number(settings.get('inventory.lowStockThreshold') ?? 3)
    const orderHours = Number(settings.get('orders.newAlertHours') ?? 24)
    const ticketHours = Number(settings.get('tickets.newAlertHours') ?? 24)
    const currency = typeof settings.get('currency') === 'string' ? String(settings.get('currency')) : 'USD'
    const range = dashboardRange(period, new Date(), timeZone)
    const createdAt = { gte: range.from, lte: range.to }
    const orderAlertBefore = new Date(Date.now() - orderHours * 3_600_000)
    const ticketAlertBefore = new Date(Date.now() - ticketHours * 3_600_000)
    const [
      orderGroups,
      orderSums,
      ticketGroups,
      customers,
      products,
      stocks,
      recentOrders,
      recentTickets,
      oldOrders,
      oldTickets,
      productsWithoutImage,
      contactFeatured,
      supplierOnly
    ] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], where: { createdAt }, _count: { _all: true } }),
      Promise.all([
        prisma.order.aggregate({
          where: { createdAt, status: { in: VALUE_STATUSES } },
          _sum: { total: true }
        }),
        prisma.order.aggregate({
          where: { createdAt, status: { in: CONFIRMED_STATUSES } },
          _sum: { total: true }
        }),
        prisma.order.aggregate({ where: { createdAt, status: 'DELIVERED' }, _sum: { total: true } })
      ]),
      prisma.ticket.groupBy({ by: ['status'], where: { createdAt }, _count: { _all: true } }),
      prisma.customer.count({ where: { createdAt, deletedAt: null } }),
      prisma.product.count({ where: { active: true, deletedAt: null } }),
      prisma.inventoryStock.groupBy({
        by: ['productId'],
        _sum: { quantityOnHand: true, quantityReserved: true }
      }),
      prisma.order.findMany({
        where: { createdAt },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          currency: true,
          deliveryType: true,
          status: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } }
        }
      }),
      prisma.ticket.findMany({
        where: { createdAt },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketCode: true,
          priority: true,
          status: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } }
        }
      }),
      prisma.order.count({
        where: {
          status: 'NEW',
          createdAt: { lt: orderAlertBefore },
          items: { some: { availabilitySource: 'OWN_STOCK' } }
        }
      }),
      prisma.ticket.count({ where: { status: 'NEW', createdAt: { lt: ticketAlertBefore } } }),
      prisma.product.count({ where: { active: true, deletedAt: null, images: { none: {} } } }),
      prisma.product.count({
        where: { active: true, deletedAt: null, featured: true, priceMode: 'CONTACT' }
      }),
      prisma.product.count({
        where: {
          productType: 'PHYSICAL',
          active: true,
          deletedAt: null,
          inventoryStocks: { none: { quantityOnHand: { gt: 0 } } },
          supplierProducts: {
            some: { active: true, supplierStock: { gt: 0 }, supplier: { active: true, deletedAt: null } }
          }
        }
      })
    ])
    const ownStock = new Map(
      stocks.map((row) => [
        row.productId,
        {
          onHand: row._sum.quantityOnHand || 0,
          reserved: row._sum.quantityReserved || 0
        }
      ])
    )
    const stockProducts = await prisma.product.findMany({
      where: {
        id: { in: [...ownStock.keys()] },
        productType: 'PHYSICAL',
        manageStock: true,
        active: true,
        deletedAt: null
      },
      select: { id: true, productCode: true, name: true, slug: true }
    })
    const lowStock = stockProducts
      .flatMap((product) => {
        const stock = ownStock.get(product.id)!
        const available = ownStockAvailable({
          productType: 'PHYSICAL',
          quantityOnHand: stock.onHand,
          quantityReserved: stock.reserved
        })!
        return available <= threshold ? [{ ...product, ...stock, available }] : []
      })
      .sort((a, b) => a.available - b.available)
      .slice(0, 12)
    const orderCount = new Map(orderGroups.map((row) => [row.status, row._count._all]))
    const ticketCount = new Map(ticketGroups.map((row) => [row.status, row._count._all]))
    return {
      period,
      range: { from: range.from.toISOString(), to: range.to.toISOString(), timeZone },
      orders: {
        new: orderCount.get('NEW') || 0,
        pending: (orderCount.get('NEW') || 0) + (orderCount.get('CONTACTED') || 0),
        confirmed: CONFIRMED_STATUSES.reduce((sum, status) => sum + (orderCount.get(status) || 0), 0),
        delivered: orderCount.get('DELIVERED') || 0
      },
      tickets: {
        new: ticketCount.get('NEW') || 0,
        open: ticketGroups
          .filter((row) => !['DELIVERED', 'CANCELLED'].includes(row.status))
          .reduce((sum, row) => sum + row._count._all, 0)
      },
      customers,
      products,
      money: {
        orderValue: orderSums[0]._sum.total?.toFixed(2) || '0.00',
        confirmedValue: orderSums[1]._sum.total?.toFixed(2) || '0.00',
        deliveredValue: orderSums[2]._sum.total?.toFixed(2) || '0.00',
        currency
      },
      lowStock: { threshold, items: lowStock },
      supplierOnly,
      alerts: {
        oldReservedOrders: oldOrders,
        oldNewTickets: oldTickets,
        productsWithoutImage,
        contactFeatured
      },
      recentOrders: recentOrders.map((row) => ({
        ...row,
        total: row.total.toFixed(2),
        createdAt: row.createdAt.toISOString(),
        customer: `${row.customer.firstName} ${row.customer.lastName}`
      })),
      recentTickets: recentTickets.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        customer: `${row.customer.firstName} ${row.customer.lastName}`,
        service: row.service.name
      }))
    }
  }
}

export const contentService = {
  async bannersAdmin() {
    return prisma.banner.findMany({
      where: { deletedAt: null },
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
    })
  },
  async publicBanners(placement?: BannerPlacement) {
    const rows = await prisma.banner.findMany({
      where: { ...scheduleWhere(), placement },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    })
    return rows.map(
      ({ title, subtitle, description, imageUrl, mobileImageUrl, ctaLabel, ctaUrl, placement: where }) => ({
        title,
        subtitle,
        description,
        imageUrl,
        mobileImageUrl,
        ctaLabel,
        ctaUrl,
        placement: where
      })
    )
  },
  async saveBanner(event: H3Event, userId: string, input: BannerInput, id?: string) {
    const old = id ? await prisma.banner.findFirst({ where: { id, deletedAt: null } }) : null
    if (id && !old) throw apiError(404, 'BANNER_NOT_FOUND', 'El banner no existe.')
    const data = {
      ...input,
      subtitle: input.subtitle || null,
      description: input.description || null,
      mobileImageUrl: input.mobileImageUrl || null,
      ctaLabel: input.ctaLabel || null,
      ctaUrl: input.ctaUrl || null,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null
    }
    const item = id
      ? await prisma.banner.update({ where: { id }, data })
      : await prisma.$transaction(async (tx) =>
          tx.banner.create({ data: { ...data, code: await nextCommercialCode(tx, 'banner') } })
        )
    await auditService.record(event, {
      userId,
      action: id ? 'BANNER_UPDATED' : 'BANNER_CREATED',
      entity: 'Banner',
      entityId: item.id,
      oldValues: old ? json(old) : undefined,
      newValues: json({ code: item.code, placement: item.placement, active: item.active })
    })
    return item
  },
  async deleteBanner(event: H3Event, userId: string, id: string) {
    const old = await prisma.banner.findFirst({ where: { id, deletedAt: null } })
    if (!old) throw apiError(404, 'BANNER_NOT_FOUND', 'El banner no existe.')
    const item = await prisma.banner.update({ where: { id }, data: { active: false, deletedAt: new Date() } })
    await auditService.record(event, {
      userId,
      action: 'BANNER_DELETED',
      entity: 'Banner',
      entityId: id,
      oldValues: json(old),
      newValues: json({ active: false, deletedAt: item.deletedAt })
    })
    return item
  },
  async promotionsAdmin() {
    return prisma.promotion.findMany({
      where: { deletedAt: null },
      include: { products: { select: { productId: true } }, categories: { select: { categoryId: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
    })
  },
  async promotionOptions() {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      }),
      prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      })
    ])
    return { products, categories }
  },
  async savePromotion(event: H3Event, userId: string, input: PromotionInput, id?: string) {
    const old = id ? await prisma.promotion.findFirst({ where: { id, deletedAt: null } }) : null
    if (id && !old) throw apiError(404, 'PROMOTION_NOT_FOUND', 'La promoción no existe.')
    const [products, categories] = await Promise.all([
      prisma.product.count({ where: { id: { in: input.productIds }, deletedAt: null } }),
      prisma.category.count({ where: { id: { in: input.categoryIds }, deletedAt: null } })
    ])
    if (products !== input.productIds.length || categories !== input.categoryIds.length)
      throw apiError(422, 'PROMOTION_TARGET_INVALID', 'Un target de promoción no existe.')
    const item = await prisma.$transaction(async (tx) => {
      const common = {
        name: input.name,
        description: input.description || null,
        badge: input.badge,
        type: input.type,
        startsAt: input.startsAt || null,
        endsAt: input.endsAt || null,
        active: input.active,
        priority: input.priority
      }
      if (id) {
        return tx.promotion.update({
          where: { id },
          data: {
            ...common,
            products: { deleteMany: {}, create: input.productIds.map((productId) => ({ productId })) },
            categories: { deleteMany: {}, create: input.categoryIds.map((categoryId) => ({ categoryId })) }
          },
          include: { products: true, categories: true }
        })
      }
      return tx.promotion.create({
        data: {
          ...common,
          code: await nextCommercialCode(tx, 'promotion'),
          products: { create: input.productIds.map((productId) => ({ productId })) },
          categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) }
        },
        include: { products: true, categories: true }
      })
    })
    await auditService.record(event, {
      userId,
      action: id ? 'PROMOTION_UPDATED' : 'PROMOTION_CREATED',
      entity: 'Promotion',
      entityId: item.id,
      oldValues: old ? json(old) : undefined,
      newValues: json({
        code: item.code,
        active: item.active,
        targets: input.productIds.length + input.categoryIds.length
      })
    })
    return item
  },
  async deletePromotion(event: H3Event, userId: string, id: string) {
    const old = await prisma.promotion.findFirst({ where: { id, deletedAt: null } })
    if (!old) throw apiError(404, 'PROMOTION_NOT_FOUND', 'La promoción no existe.')
    const item = await prisma.promotion.update({
      where: { id },
      data: { active: false, deletedAt: new Date() }
    })
    await auditService.record(event, {
      userId,
      action: 'PROMOTION_DELETED',
      entity: 'Promotion',
      entityId: id,
      oldValues: json(old),
      newValues: json({ active: false, deletedAt: item.deletedAt })
    })
    return item
  }
}

const settingDefaults: SettingsInput = {
  business: {
    name: 'AjkSolutionS',
    whatsapp: '593999999999',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'EC',
    timeZone: 'America/Guayaquil'
  },
  commerce: { currency: 'USD', taxRate: 0, pricesIncludeTax: false },
  inventory: { defaultLocationCode: 'LOC-000001', lowStockThreshold: 3 },
  operations: { orderAlertHours: 24, ticketAlertHours: 24 },
  seo: {
    siteName: 'AjkSolutionS',
    defaultTitle: 'AjkSolutionS e-Commerce',
    defaultDescription: 'Productos tecnológicos y servicios profesionales.'
  },
  social: { facebook: '', instagram: '' }
}
const settingKeys = {
  'business.name': ['business', 'name'],
  'business.whatsapp': ['business', 'whatsapp'],
  'business.email': ['business', 'email'],
  'business.phone': ['business', 'phone'],
  'business.address': ['business', 'address'],
  'business.city': ['business', 'city'],
  ['country']: ['business', 'country'],
  'business.timeZone': ['business', 'timeZone'],
  ['currency']: ['commerce', 'currency'],
  'tax.defaultRate': ['commerce', 'taxRate'],
  'tax.pricesIncludeTax': ['commerce', 'pricesIncludeTax'],
  'inventory.defaultLocationCode': ['inventory', 'defaultLocationCode'],
  'inventory.lowStockThreshold': ['inventory', 'lowStockThreshold'],
  'orders.newAlertHours': ['operations', 'orderAlertHours'],
  'tickets.newAlertHours': ['operations', 'ticketAlertHours'],
  'seo.siteName': ['seo', 'siteName'],
  'seo.defaultTitle': ['seo', 'defaultTitle'],
  'seo.defaultDescription': ['seo', 'defaultDescription'],
  'social.facebook': ['social', 'facebook'],
  'social.instagram': ['social', 'instagram']
} as const

export const settingsService = {
  async get() {
    const result = structuredClone(settingDefaults)
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(settingKeys) } } })
    for (const row of rows) {
      const path = settingKeys[row.key as keyof typeof settingKeys]
      if (path) (result[path[0]] as Record<string, unknown>)[path[1]] = row.value
    }
    return result
  },
  async update(event: H3Event, userId: string, input: SettingsInput) {
    const whatsapp = normalizePhone(input.business.whatsapp)
    if (!whatsapp) throw apiError(422, 'WHATSAPP_INVALID', 'El WhatsApp comercial no es válido.')
    try {
      new Intl.DateTimeFormat('es-EC', { timeZone: input.business.timeZone })
    } catch {
      throw apiError(422, 'TIMEZONE_INVALID', 'La zona horaria no es válida.')
    }
    const location = await prisma.inventoryLocation.findFirst({
      where: { locationCode: input.inventory.defaultLocationCode, active: true, deletedAt: null }
    })
    if (!location) throw apiError(422, 'LOCATION_NOT_FOUND', 'La ubicación predeterminada no existe.')
    input.business.whatsapp = whatsapp
    const old = await this.get()
    await prisma.$transaction(
      Object.entries(settingKeys).map(([key, path]) => {
        const value = (input[path[0]] as Record<string, unknown>)[path[1]] as Prisma.InputJsonValue
        return prisma.setting.upsert({
          where: { key },
          create: { key, value, category: path[0] },
          update: { value, category: path[0] }
        })
      })
    )
    await auditService.record(event, {
      userId,
      action: 'SETTING_UPDATED',
      entity: 'Setting',
      entityId: 'operational-settings',
      oldValues: json(old),
      newValues: json(input)
    })
    return input
  }
}

export const customerAdminService = {
  async list(input: { page: number; pageSize: number; search?: string }) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(input.search
        ? {
            OR: [
              { customerCode: { contains: input.search, mode: 'insensitive' } },
              { firstName: { contains: input.search, mode: 'insensitive' } },
              { lastName: { contains: input.search, mode: 'insensitive' } },
              { documentNumber: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
              { whatsapp: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          customerCode: true,
          firstName: true,
          lastName: true,
          documentType: true,
          documentNumber: true,
          email: true,
          whatsapp: true,
          active: true,
          updatedAt: true,
          _count: { select: { orders: true, tickets: true } }
        }
      }),
      prisma.customer.count({ where })
    ])
    return {
      items: items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() })),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize)
      }
    }
  },
  async detail(id: string) {
    const item = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        customerCode: true,
        firstName: true,
        lastName: true,
        documentType: true,
        documentNumber: true,
        email: true,
        phone: true,
        whatsapp: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        addresses: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            currency: true,
            deliveryType: true,
            createdAt: true
          }
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ticketCode: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            service: { select: { name: true } }
          }
        }
      }
    })
    if (!item) throw apiError(404, 'CUSTOMER_NOT_FOUND', 'El cliente no existe.')
    const value = item.orders
      .filter((order) => order.status !== 'CANCELLED')
      .reduce((sum, order) => sum.plus(order.total), new Prisma.Decimal(0))
    return {
      ...item,
      historicalOrderValue: value.toFixed(2),
      orders: item.orders.map((order) => ({ ...order, total: order.total.toFixed(2) }))
    }
  }
}
