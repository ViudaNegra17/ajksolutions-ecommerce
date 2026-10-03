import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import type { CategoryInput } from '#shared/schemas/category.schema'
import type { BrandInput } from '#shared/schemas/brand.schema'
import type { SupplierInput } from '#shared/schemas/supplier.schema'
import type { AttributeInput } from '#shared/schemas/attribute.schema'
import type { ProductInput } from '#shared/schemas/product.schema'
import { createWithUniqueSlug } from '../utils/unique-slug'
import { isAttributeValueShapeValid } from '#shared/utils/catalog-integrity'
import {
  attributeRepository,
  brandRepository,
  categoryRepository,
  productRepository,
  supplierRepository
} from '../repositories/catalog.repository'
import { auditService } from './audit.service'

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function nullable(value: string | null | undefined) {
  return value || null
}

async function ensureCategoryParent(id: string | null | undefined, parentId: string | null | undefined) {
  if (!parentId) return
  if (id === parentId)
    throw apiError(422, 'CATEGORY_SELF_PARENT', 'Una categoría no puede ser su propio padre.')
  let cursor: string | null = parentId
  const visited = new Set<string>()
  while (cursor) {
    if (cursor === id || visited.has(cursor))
      throw apiError(422, 'CATEGORY_CYCLE', 'La relación produciría un ciclo en la jerarquía.')
    visited.add(cursor)
    const parent = await categoryRepository.find(cursor)
    if (!parent) throw apiError(422, 'CATEGORY_PARENT_NOT_FOUND', 'La categoría padre no existe.')
    cursor = parent.parentId
  }
}

function validateAttributeValue(
  definition: Awaited<ReturnType<typeof productRepository.categoryDefinition>>,
  input: ProductInput
) {
  if (!definition)
    throw apiError(422, 'CATEGORY_NOT_FOUND', 'La categoría no existe, está inactiva o fue eliminada.')
  const assigned = new Map(definition.attributes.map((item) => [item.attributeId, item]))
  const values = new Map(input.attributeValues.map((value) => [value.attributeId, value]))
  if (values.size !== input.attributeValues.length)
    throw apiError(422, 'PRODUCT_ATTRIBUTE_DUPLICATE', 'Un atributo no puede enviarse más de una vez.')

  for (const item of definition.attributes) {
    const value = values.get(item.attributeId)
    if (!item.required) continue
    const valid =
      value &&
      ((item.attribute.type === 'TEXT' && Boolean(value.textValue?.trim())) ||
        (item.attribute.type === 'NUMBER' && value.numberValue != null) ||
        (item.attribute.type === 'BOOLEAN' && value.booleanValue != null) ||
        (item.attribute.type === 'SELECT' && value.optionIds.length === 1) ||
        (item.attribute.type === 'MULTISELECT' && value.optionIds.length > 0))
    if (!valid)
      throw apiError(422, 'PRODUCT_ATTRIBUTE_REQUIRED', `El atributo ${item.attribute.name} es obligatorio.`)
  }

  for (const value of input.attributeValues) {
    const item = assigned.get(value.attributeId)
    if (!item)
      throw apiError(
        422,
        'PRODUCT_ATTRIBUTE_NOT_ASSIGNED',
        'Uno de los atributos no pertenece a la categoría.'
      )
    const allowedOptions = new Set(item.attribute.options.map((option) => option.id))
    const hasDuplicateOption = new Set(value.optionIds).size !== value.optionIds.length
    const hasUnknownOption = value.optionIds.some((optionId) => !allowedOptions.has(optionId))
    if (hasDuplicateOption || hasUnknownOption) {
      throw apiError(422, 'PRODUCT_ATTRIBUTE_OPTION_INVALID', 'Una opción no pertenece al atributo indicado.')
    }
    if (!isAttributeValueShapeValid(item.attribute.type, value))
      throw apiError(
        422,
        'PRODUCT_ATTRIBUTE_TYPE_INVALID',
        `El valor de ${item.attribute.name} no corresponde a su tipo.`
      )
  }

  const variantDefinitions = definition.attributes.filter((item) => item.attribute.variant)
  const allowedVariantOptions = new Map(
    variantDefinitions.flatMap((item) =>
      item.attribute.options.map((option) => [option.id, item.attributeId] as const)
    )
  )
  const expectedVariantAttributes = new Set(variantDefinitions.map((item) => item.attributeId))
  for (const variant of input.variants) {
    const selectedAttributes = variant.optionIds.map((optionId) => allowedVariantOptions.get(optionId))
    const hasUnknownOption = selectedAttributes.some((attributeId) => !attributeId)
    const hasDuplicateAttribute = new Set(selectedAttributes).size !== selectedAttributes.length
    const hasIncompleteCombination = selectedAttributes.length !== expectedVariantAttributes.size
    if ([hasUnknownOption, hasDuplicateAttribute, hasIncompleteCombination].some(Boolean)) {
      throw apiError(
        422,
        'INVALID_VARIANT_OPTIONS',
        'Cada variante debe usar una opción activa de cada atributo de variante de la categoría.'
      )
    }
  }
}

async function validateProductReferences(input: ProductInput, productId?: string) {
  if (input.brandId && !(await brandRepository.findActive(input.brandId)))
    throw apiError(422, 'BRAND_NOT_FOUND', 'La marca no existe, está inactiva o fue eliminada.')

  const supplierIds = input.supplierProducts.map((item) => item.supplierId)
  if (!(await productRepository.suppliersAreActive(supplierIds)))
    throw apiError(422, 'SUPPLIER_NOT_ACTIVE', 'Un proveedor no existe, está inactivo o fue eliminado.')

  const supplierKeys = input.supplierProducts.map(
    (item) => `${item.supplierId}:${item.variantId || 'simple'}`
  )
  if (new Set(supplierKeys).size !== supplierKeys.length)
    throw apiError(
      422,
      'SUPPLIER_PRODUCT_DUPLICATE',
      'El proveedor ya está asociado al mismo producto o variante.'
    )

  const supplierRelationIds = input.supplierProducts.flatMap((item) => (item.id ? [item.id] : []))
  if (
    (!productId && supplierRelationIds.length) ||
    (productId && !(await productRepository.supplierRelationsBelongToProduct(productId, supplierRelationIds)))
  )
    throw apiError(422, 'SUPPLIER_PRODUCT_MISMATCH', 'Una relación de proveedor no pertenece al producto.')

  const referencedVariantIds = [
    ...input.variants.flatMap((variant) => (variant.id ? [variant.id] : [])),
    ...input.supplierProducts.flatMap((item) => (item.variantId ? [item.variantId] : []))
  ]
  if (!productId && referencedVariantIds.length)
    throw apiError(
      422,
      'VARIANT_PRODUCT_MISMATCH',
      'Un producto nuevo no puede referenciar variantes existentes.'
    )
  if (productId && !(await productRepository.variantsBelongToProduct(productId, referencedVariantIds)))
    throw apiError(422, 'VARIANT_PRODUCT_MISMATCH', 'Una variante no pertenece al producto.')
}

export const categoryService = {
  list: categoryRepository.list,
  tree: categoryRepository.tree,
  async get(id: string) {
    const item = await categoryRepository.find(id)
    if (!item) throw apiError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: CategoryInput) {
    await ensureCategoryParent(null, input.parentId)
    try {
      const item = await createWithUniqueSlug(input.name, 180, (slug) =>
        categoryRepository.create({
          ...input,
          slug,
          description: nullable(input.description),
          imageUrl: nullable(input.imageUrl),
          icon: nullable(input.icon),
          parentId: nullable(input.parentId)
        })
      )
      await auditService.record(event, {
        userId,
        action: 'CATEGORY_CREATED',
        entity: 'Category',
        entityId: item.id,
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async update(event: H3Event, userId: string, id: string, input: CategoryInput) {
    const old = await this.get(id)
    await ensureCategoryParent(id, input.parentId)
    try {
      const item = await categoryRepository.update(id, {
        ...input,
        slug: old.slug,
        description: nullable(input.description),
        imageUrl: nullable(input.imageUrl),
        icon: nullable(input.icon),
        parentId: nullable(input.parentId)
      })
      await auditService.record(event, {
        userId,
        action: 'CATEGORY_UPDATED',
        entity: 'Category',
        entityId: id,
        oldValues: auditJson(old),
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const usage = await categoryRepository.usage(id)
    if (usage?._count.children)
      throw apiError(409, 'CATEGORY_HAS_CHILDREN', 'Mueve o elimina primero las subcategorías.')
    const item = await categoryRepository.update(id, { active: false, deletedAt: new Date() })
    await auditService.record(event, {
      userId,
      action: 'CATEGORY_DELETED',
      entity: 'Category',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  }
}

export const brandService = {
  list: brandRepository.list,
  async get(id: string) {
    const item = await brandRepository.find(id)
    if (!item) throw apiError(404, 'BRAND_NOT_FOUND', 'La marca no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: BrandInput) {
    try {
      const item = await createWithUniqueSlug(input.name, 180, (slug) =>
        brandRepository.create({
          ...input,
          slug,
          description: nullable(input.description),
          logoUrl: nullable(input.logoUrl),
          websiteUrl: nullable(input.websiteUrl)
        })
      )
      await auditService.record(event, {
        userId,
        action: 'BRAND_CREATED',
        entity: 'Brand',
        entityId: item.id,
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async update(event: H3Event, userId: string, id: string, input: BrandInput) {
    const old = await this.get(id)
    try {
      const item = await brandRepository.update(id, {
        ...input,
        slug: old.slug,
        description: nullable(input.description),
        logoUrl: nullable(input.logoUrl),
        websiteUrl: nullable(input.websiteUrl)
      })
      await auditService.record(event, {
        userId,
        action: 'BRAND_UPDATED',
        entity: 'Brand',
        entityId: id,
        oldValues: auditJson(old),
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const item = await brandRepository.update(id, { active: false, deletedAt: new Date() })
    await auditService.record(event, {
      userId,
      action: 'BRAND_DELETED',
      entity: 'Brand',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  }
}

export const supplierService = {
  list: supplierRepository.list,
  async get(id: string) {
    const item = await supplierRepository.find(id)
    if (!item) throw apiError(404, 'SUPPLIER_NOT_FOUND', 'El proveedor no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: SupplierInput) {
    try {
      const item = await supplierRepository.create(input)
      await auditService.record(event, {
        userId,
        action: 'SUPPLIER_CREATED',
        entity: 'Supplier',
        entityId: item.id,
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async update(event: H3Event, userId: string, id: string, input: SupplierInput) {
    const old = await this.get(id)
    try {
      const item = await supplierRepository.update(id, {
        ...input,
        email: input.email || null,
        website: input.website || null
      })
      await auditService.record(event, {
        userId,
        action: 'SUPPLIER_UPDATED',
        entity: 'Supplier',
        entityId: id,
        oldValues: auditJson(old),
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const item = await supplierRepository.update(id, { active: false, deletedAt: new Date() })
    await auditService.record(event, {
      userId,
      action: 'SUPPLIER_DELETED',
      entity: 'Supplier',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  }
}

export const attributeService = {
  list: attributeRepository.list,
  async get(id: string) {
    const item = await attributeRepository.find(id)
    if (!item) throw apiError(404, 'ATTRIBUTE_NOT_FOUND', 'El atributo no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: AttributeInput) {
    try {
      const item = await createWithUniqueSlug(input.name, 180, (slug) =>
        attributeRepository.create({ ...input, slug })
      )
      await auditService.record(event, {
        userId,
        action: 'ATTRIBUTE_CREATED',
        entity: 'Attribute',
        entityId: item.id,
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async update(event: H3Event, userId: string, id: string, input: AttributeInput) {
    const old = await this.get(id)
    try {
      const item = await attributeRepository.update(id, {
        ...input,
        slug: old.slug
      })
      await auditService.record(event, {
        userId,
        action: 'ATTRIBUTE_UPDATED',
        entity: 'Attribute',
        entityId: id,
        oldValues: auditJson(old),
        newValues: auditJson(item)
      })
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const item = await attributeRepository.update(id, {
      name: old.name,
      active: false,
      slug: old.slug,
      type: old.type,
      unit: old.unit,
      filterable: old.filterable,
      variant: old.variant,
      sortOrder: old.sortOrder,
      options: old.options.map((option) => ({
        id: option.id,
        value: option.value,
        label: option.label,
        sortOrder: option.sortOrder,
        active: option.active
      })),
      categories: old.categories.map((category) => ({
        categoryId: category.categoryId,
        required: category.required,
        sortOrder: category.sortOrder
      }))
    })
    await auditService.record(event, {
      userId,
      action: 'ATTRIBUTE_UPDATED',
      entity: 'Attribute',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  }
}

export const productService = {
  list: productRepository.list,
  async taxSettings() {
    const settings = await productRepository.taxSettings()
    return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  },
  async get(id: string) {
    const item = await productRepository.find(id)
    if (!item) throw apiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.')
    return item
  },
  async create(event: H3Event, userId: string, input: ProductInput) {
    if (input.taxRate == null) {
      const settings = await this.taxSettings()
      input = { ...input, taxRate: String(settings['tax.defaultRate'] ?? '0.00') }
    }
    const definition = await productRepository.categoryDefinition(input.categoryId)
    validateAttributeValue(definition, input)
    await validateProductReferences(input)
    try {
      const item = await createWithUniqueSlug(input.name, 250, (slug) =>
        productRepository.create(input, slug)
      )
      await auditService.record(event, {
        userId,
        action: 'PRODUCT_CREATED',
        entity: 'Product',
        entityId: item.id,
        newValues: auditJson(item)
      })
      for (const supplierProduct of item.supplierProducts) {
        await auditService.record(event, {
          userId,
          action: 'SUPPLIER_PRODUCT_CREATED',
          entity: 'SupplierProduct',
          entityId: supplierProduct.id,
          newValues: auditJson(supplierProduct)
        })
      }
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async update(event: H3Event, userId: string, id: string, input: ProductInput) {
    if (input.taxRate == null) {
      const settings = await this.taxSettings()
      input = { ...input, taxRate: String(settings['tax.defaultRate'] ?? '0.00') }
    }
    const old = await this.get(id)
    const definition = await productRepository.categoryDefinition(input.categoryId)
    validateAttributeValue(definition, input)
    await validateProductReferences(input, id)
    try {
      const item = await productRepository.update(id, input, old.slug)
      await auditService.record(event, {
        userId,
        action: 'PRODUCT_UPDATED',
        entity: 'Product',
        entityId: id,
        oldValues: auditJson(old),
        newValues: auditJson(item)
      })
      if (old.priceMode !== item.priceMode || old.price?.toString() !== item.price?.toString()) {
        await auditService.record(event, {
          userId,
          action: 'PRODUCT_PRICE_CHANGED',
          entity: 'Product',
          entityId: id,
          oldValues: auditJson({ priceMode: old.priceMode, price: old.price?.toString() || null }),
          newValues: auditJson({ priceMode: item.priceMode, price: item.price?.toString() || null })
        })
      }
      if (old.active !== item.active)
        await auditService.record(event, {
          userId,
          action: item.active ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED',
          entity: 'Product',
          entityId: id
        })
      for (const supplierProduct of item.supplierProducts) {
        const previous = old.supplierProducts.find((relation) => relation.id === supplierProduct.id)
        await auditService.record(event, {
          userId,
          action: previous ? 'SUPPLIER_PRODUCT_UPDATED' : 'SUPPLIER_PRODUCT_CREATED',
          entity: 'SupplierProduct',
          entityId: supplierProduct.id,
          oldValues: previous ? auditJson(previous) : undefined,
          newValues: auditJson(supplierProduct)
        })
      }
      return item
    } catch (error) {
      return throwDatabaseError(error)
    }
  },
  async remove(event: H3Event, userId: string, id: string) {
    const old = await this.get(id)
    const item = await productRepository.softDelete(id)
    await auditService.record(event, {
      userId,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: id,
      oldValues: auditJson(old),
      newValues: auditJson(item)
    })
    return item
  }
}
