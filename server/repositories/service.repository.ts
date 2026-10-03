import type { Prisma } from '@prisma/client'
import type { ServiceInput } from '#shared/schemas/service.schema'
import { prisma } from '../utils/prisma'

const serviceInclude = {
  category: true,
  fields: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: { options: { orderBy: [{ sortOrder: 'asc' as const }, { label: 'asc' as const }] } }
  }
}

export const serviceCategoryRepository = {
  list() {
    return prisma.serviceCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { children: true, services: true } }
      }
    })
  },
  find(id: string) {
    return prisma.serviceCategory.findFirst({ where: { id, deletedAt: null } })
  },
  findActive(id: string) {
    return prisma.serviceCategory.findFirst({ where: { id, active: true, deletedAt: null } })
  },
  create(data: Prisma.ServiceCategoryUncheckedCreateInput) {
    return prisma.serviceCategory.create({ data })
  },
  update(id: string, data: Prisma.ServiceCategoryUncheckedUpdateInput) {
    return prisma.serviceCategory.update({ where: { id }, data })
  },
  usage(id: string) {
    return prisma.serviceCategory.findUnique({
      where: { id },
      select: { _count: { select: { children: true, services: true } } }
    })
  }
}

function serviceScalars(input: ServiceInput) {
  return {
    name: input.name,
    slug: input.slug!,
    shortDescription: input.shortDescription || null,
    description: input.description || null,
    categoryId: input.categoryId,
    priceMode: input.priceMode,
    price: input.priceMode === 'QUOTE' ? null : input.price,
    priceIncludesTax: input.priceIncludesTax,
    taxRate: input.taxRate,
    estimatedDuration: input.estimatedDuration || null,
    warranty: input.warranty || null,
    remoteAvailable: input.remoteAvailable,
    onsiteAvailable: input.onsiteAvailable,
    homeServiceAvailable: input.homeServiceAvailable,
    requiresDevice: input.requiresDevice,
    allowAttachments: input.allowAttachments,
    imageUrl: input.imageUrl || null,
    featured: input.featured,
    active: input.active,
    metaTitle: input.metaTitle || null,
    metaDescription: input.metaDescription || null,
    deletedAt: null
  }
}

export const serviceRepository = {
  settings(keys: string[]) {
    return prisma.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
  },
  async list(input: { page: number; pageSize: number; search?: string }) {
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { serviceCode: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { fields: true, tickets: true } }
        }
      }),
      prisma.service.count({ where })
    ])
    return { items, pagination: { ...input, total, totalPages: Math.ceil(total / input.pageSize) } }
  },
  find(id: string) {
    return prisma.service.findFirst({ where: { id, deletedAt: null }, include: serviceInclude })
  },
  findPublicBySlug(slug: string) {
    return prisma.service.findFirst({
      where: { slug, active: true, deletedAt: null, category: { active: true, deletedAt: null } },
      include: {
        category: { select: { name: true, slug: true } },
        fields: {
          where: { active: true, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { options: { where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } }
        }
      }
    })
  },
  async publicList(input: { search?: string; category?: string; featured?: boolean; limit?: number }) {
    return prisma.service.findMany({
      where: {
        active: true,
        deletedAt: null,
        category: { active: true, deletedAt: null, ...(input.category ? { slug: input.category } : {}) },
        ...(input.featured != null ? { featured: input.featured } : {}),
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { shortDescription: { contains: input.search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      take: input.limit ?? 60,
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      include: { category: { select: { name: true, slug: true } } }
    })
  },
  publicCategories() {
    return prisma.serviceCategory.findMany({
      where: { active: true, deletedAt: null, services: { some: { active: true, deletedAt: null } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { name: true, slug: true, description: true, icon: true }
    })
  },
  sitemap() {
    return prisma.service.findMany({
      where: { active: true, deletedAt: null, category: { active: true, deletedAt: null } },
      select: { slug: true, updatedAt: true }
    })
  },
  create(userData: ServiceInput, serviceCode: string) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.service.create({ data: { ...serviceScalars(userData), serviceCode } })
      for (const field of userData.fields) {
        await tx.serviceFormField.create({
          data: {
            serviceId: item.id,
            key: field.key,
            label: field.label,
            description: field.description || null,
            placeholder: field.placeholder || null,
            type: field.type,
            required: field.required,
            active: field.active,
            sortOrder: field.sortOrder,
            validationConfig: field.validationConfig || undefined,
            options: { create: field.options.map(({ id: _id, ...option }) => option) }
          }
        })
      }
      return tx.service.findUniqueOrThrow({ where: { id: item.id }, include: serviceInclude })
    })
  },
  update(id: string, input: ServiceInput) {
    return prisma.$transaction(async (tx) => {
      await tx.service.update({ where: { id }, data: { ...serviceScalars(input), slug: undefined } })
      const existing = await tx.serviceFormField.findMany({ where: { serviceId: id }, select: { id: true } })
      const incomingIds = input.fields.flatMap((field) => (field.id ? [field.id] : []))
      await tx.serviceFormField.updateMany({
        where: { serviceId: id, id: { notIn: incomingIds } },
        data: { active: false, deletedAt: new Date() }
      })
      for (const field of input.fields) {
        const data = {
          key: field.key,
          label: field.label,
          description: field.description || null,
          placeholder: field.placeholder || null,
          type: field.type,
          required: field.required,
          active: field.active,
          sortOrder: field.sortOrder,
          validationConfig: field.validationConfig || undefined,
          deletedAt: null
        }
        const stored = field.id
          ? await tx.serviceFormField.update({ where: { id: field.id }, data })
          : await tx.serviceFormField.create({ data: { ...data, serviceId: id } })
        const optionIds = field.options.flatMap((option) => (option.id ? [option.id] : []))
        await tx.serviceFormFieldOption.updateMany({
          where: { fieldId: stored.id, id: { notIn: optionIds } },
          data: { active: false }
        })
        for (const option of field.options) {
          const optionData = {
            value: option.value,
            label: option.label,
            sortOrder: option.sortOrder,
            active: option.active
          }
          if (option.id)
            await tx.serviceFormFieldOption.update({ where: { id: option.id }, data: optionData })
          else await tx.serviceFormFieldOption.create({ data: { ...optionData, fieldId: stored.id } })
        }
      }
      void existing
      return tx.service.findUniqueOrThrow({ where: { id }, include: serviceInclude })
    })
  },
  remove(id: string) {
    return prisma.service.update({ where: { id }, data: { active: false, deletedAt: new Date() } })
  }
}
