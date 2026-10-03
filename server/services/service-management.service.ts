import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import type { ServiceCategoryInput } from '#shared/schemas/service-category.schema'
import type { ServiceInput } from '#shared/schemas/service.schema'
import { wouldCreateServiceCategoryCycle } from '#shared/utils/service-categories'
import { createWithUniqueSlug } from '../utils/unique-slug'
import { nextCommercialCode } from '../repositories/code.repository'
import { serviceCategoryRepository, serviceRepository } from '../repositories/service.repository'
import { apiError } from '../utils/api-error'
import { prisma } from '../utils/prisma'
import { auditService } from './audit.service'

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function ensureParent(id: string | null, parentId: string | null | undefined) {
  if (!parentId) return
  if (id === parentId)
    throw apiError(422, 'SERVICE_CATEGORY_SELF_PARENT', 'La categoría no puede ser su padre.')
  const ancestors: string[] = []
  let cursor: string | null = parentId
  while (cursor) {
    ancestors.push(cursor)
    if (wouldCreateServiceCategoryCycle(id, parentId, ancestors)) {
      throw apiError(422, 'SERVICE_CATEGORY_CYCLE', 'La jerarquía produciría un ciclo.')
    }
    const parent = await serviceCategoryRepository.find(cursor)
    if (!parent) throw apiError(422, 'SERVICE_CATEGORY_PARENT_NOT_FOUND', 'La categoría padre no existe.')
    if (cursor === parentId && !parent.active)
      throw apiError(422, 'SERVICE_CATEGORY_PARENT_NOT_ACTIVE', 'La categoría padre no está activa.')
    cursor = parent.parentId
  }
}

function normalizeCategory(input: ServiceCategoryInput, slug: string) {
  return {
    ...input,
    slug,
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    icon: input.icon || null,
    parentId: input.parentId || null,
    deletedAt: null
  }
}

async function validateServiceInput(input: ServiceInput, existingId?: string) {
  if (!(await serviceCategoryRepository.findActive(input.categoryId))) {
    throw apiError(422, 'SERVICE_CATEGORY_NOT_ACTIVE', 'La categoría no existe o no está activa.')
  }
  if (!existingId) return
  const existing = await serviceRepository.find(existingId)
  if (!existing) throw apiError(404, 'SERVICE_NOT_FOUND', 'El servicio no existe.')
  const fields = new Map(existing.fields.map((field) => [field.id, field]))
  for (const field of input.fields) {
    if (field.id && !fields.has(field.id)) {
      throw apiError(422, 'SERVICE_FIELD_MISMATCH', 'Un campo no pertenece al servicio.')
    }
    if (!field.id) continue
    const options = new Set(fields.get(field.id)!.options.map((option) => option.id))
    if (field.options.some((option) => option.id && !options.has(option.id))) {
      throw apiError(422, 'SERVICE_OPTION_MISMATCH', 'Una opción no pertenece al campo indicado.')
    }
  }
}

export const serviceCategoryManagementService = {
  list: serviceCategoryRepository.list,
  async get(id: string) {
    const item = await serviceCategoryRepository.find(id)
    if (!item) throw apiError(404, 'SERVICE_CATEGORY_NOT_FOUND', 'La categoría no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: ServiceCategoryInput) {
    await ensureParent(null, input.parentId)
    const item = await createWithUniqueSlug(input.name, 180, (slug) =>
      serviceCategoryRepository.create(normalizeCategory(input, slug))
    )
    await auditService.record(event, {
      userId,
      action: 'SERVICE_CATEGORY_CREATED',
      entity: 'ServiceCategory',
      entityId: item.id,
      newValues: auditJson(item)
    })
    return item
  },
  async update(event: H3Event, userId: string, id: string, input: ServiceCategoryInput) {
    const old = await this.get(id)
    await ensureParent(id, input.parentId)
    const item = await serviceCategoryRepository.update(id, normalizeCategory(input, old.slug))
    await auditService.record(event, {
      userId,
      action: 'SERVICE_CATEGORY_UPDATED',
      entity: 'ServiceCategory',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const usage = await serviceCategoryRepository.usage(id)
    if (usage?._count.children) {
      throw apiError(409, 'SERVICE_CATEGORY_HAS_CHILDREN', 'Mueve o elimina primero las subcategorías.')
    }
    const item = await serviceCategoryRepository.update(id, { active: false, deletedAt: new Date() })
    await auditService.record(event, {
      userId,
      action: 'SERVICE_CATEGORY_DELETED',
      entity: 'ServiceCategory',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  }
}

export const serviceManagementService = {
  list: serviceRepository.list,
  async get(id: string) {
    const item = await serviceRepository.find(id)
    if (!item) throw apiError(404, 'SERVICE_NOT_FOUND', 'El servicio no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: ServiceInput) {
    await validateServiceInput(input)
    const serviceCode = await prisma.$transaction((tx) => nextCommercialCode(tx, 'service'))
    const item = await createWithUniqueSlug(input.name, 250, (slug) =>
      serviceRepository.create({ ...input, slug }, serviceCode)
    )
    await auditService.record(event, {
      userId,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: item.id,
      newValues: auditJson({ serviceCode: item.serviceCode, name: item.name, priceMode: item.priceMode })
    })
    return item
  },
  async update(event: H3Event, userId: string, id: string, input: ServiceInput) {
    const old = await this.get(id)
    const normalized = { ...input, slug: old.slug }
    await validateServiceInput(normalized, id)
    const item = await serviceRepository.update(id, normalized)
    await auditService.record(event, {
      userId,
      action:
        old.price?.toString() !== item.price?.toString() || old.priceMode !== item.priceMode
          ? 'SERVICE_PRICE_CHANGED'
          : 'SERVICE_UPDATED',
      entity: 'Service',
      entityId: id,
      oldValues: auditJson({ name: old.name, priceMode: old.priceMode, price: old.price?.toString() }),
      newValues: auditJson({ name: item.name, priceMode: item.priceMode, price: item.price?.toString() })
    })
    return item
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const item = await serviceRepository.remove(id)
    await auditService.record(event, {
      userId,
      action: 'SERVICE_DELETED',
      entity: 'Service',
      entityId: id,
      oldValues: auditJson({ serviceCode: old.serviceCode, name: old.name }),
      newValues: auditJson({ active: false, deletedAt: item.deletedAt?.toISOString() })
    })
    return item
  }
}
