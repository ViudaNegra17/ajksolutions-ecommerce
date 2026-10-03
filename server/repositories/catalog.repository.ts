import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { nextCommercialCode } from './code.repository'
import type { SupplierInput } from '#shared/schemas/supplier.schema'
import type { AttributeInput } from '#shared/schemas/attribute.schema'
import type { ProductInput } from '#shared/schemas/product.schema'

type PageInput = { page: number; pageSize: number; search: string; active?: string }
type ProductPageInput = PageInput & {
  categoryId?: string
  brandId?: string
  supplierId?: string
  featured?: string
  priceMode?: 'FIXED' | 'CONTACT' | ''
  stock?: 'with' | 'without' | ''
}

const pagination = (input: PageInput) => ({ skip: (input.page - 1) * input.pageSize, take: input.pageSize })
const pageResult = <T>(items: T[], total: number, input: PageInput) => ({
  items,
  pagination: {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize)
  }
})

export const categoryRepository = {
  async list(input: PageInput) {
    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(input.active ? { active: input.active === 'true' } : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        ...pagination(input),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true, products: true } }
        }
      }),
      prisma.category.count({ where })
    ])
    return pageResult(items, total, input)
  },
  tree(activeOnly = false) {
    return prisma.category.findMany({
      where: { deletedAt: null, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true, active: true }
    })
  },
  find(id: string) {
    return prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { attributes: { include: { attribute: true } } }
    })
  },
  usage(id: string) {
    return prisma.category.findUnique({
      where: { id },
      select: { _count: { select: { children: true, products: true } } }
    })
  },
  create(data: Prisma.CategoryUncheckedCreateInput) {
    return prisma.category.create({ data })
  },
  update(id: string, data: Prisma.CategoryUncheckedUpdateInput) {
    return prisma.category.update({ where: { id }, data })
  }
}

export const brandRepository = {
  async list(input: PageInput) {
    const where: Prisma.BrandWhereInput = {
      deletedAt: null,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(input.active ? { active: input.active === 'true' } : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.brand.findMany({
        where,
        ...pagination(input),
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } }
      }),
      prisma.brand.count({ where })
    ])
    return pageResult(items, total, input)
  },
  find(id: string) {
    return prisma.brand.findFirst({ where: { id, deletedAt: null } })
  },
  findActive(id: string) {
    return prisma.brand.findFirst({ where: { id, active: true, deletedAt: null } })
  },
  create(data: Prisma.BrandCreateInput) {
    return prisma.brand.create({ data })
  },
  update(id: string, data: Prisma.BrandUpdateInput) {
    return prisma.brand.update({ where: { id }, data })
  }
}

export const supplierRepository = {
  async list(input: PageInput) {
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { supplierCode: { contains: input.search, mode: 'insensitive' } },
              { taxId: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(input.active ? { active: input.active === 'true' } : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.supplier.findMany({
        where,
        ...pagination(input),
        orderBy: { name: 'asc' },
        include: { _count: { select: { supplierProducts: true } } }
      }),
      prisma.supplier.count({ where })
    ])
    return pageResult(items, total, input)
  },
  find(id: string) {
    return prisma.supplier.findFirst({ where: { id, deletedAt: null } })
  },
  countActive(ids: string[]) {
    return prisma.supplier.count({
      where: { id: { in: ids }, active: true, deletedAt: null }
    })
  },
  create(input: SupplierInput) {
    return prisma.$transaction(async (tx) =>
      tx.supplier.create({
        data: {
          ...input,
          supplierCode: await nextCommercialCode(tx, 'supplier'),
          email: input.email || null,
          website: input.website || null
        }
      })
    )
  },
  update(id: string, data: Prisma.SupplierUpdateInput) {
    return prisma.supplier.update({ where: { id }, data })
  }
}

export const attributeRepository = {
  async list(input: PageInput) {
    const where: Prisma.AttributeWhereInput = {
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(input.active ? { active: input.active === 'true' } : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.attribute.findMany({
        where,
        ...pagination(input),
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          categories: { include: { category: { select: { id: true, name: true } } } }
        }
      }),
      prisma.attribute.count({ where })
    ])
    return pageResult(items, total, input)
  },
  find(id: string) {
    return prisma.attribute.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } }, categories: true }
    })
  },
  create(input: AttributeInput & { slug: string }) {
    return prisma.attribute.create({
      data: {
        name: input.name,
        slug: input.slug,
        type: input.type,
        unit: input.unit || null,
        filterable: input.filterable,
        variant: input.variant,
        active: input.active,
        sortOrder: input.sortOrder,
        options: { create: input.options },
        categories: {
          create: input.categories.map((item) => ({
            categoryId: item.categoryId,
            required: item.required,
            sortOrder: item.sortOrder
          }))
        }
      },
      include: { options: true, categories: true }
    })
  },
  update(id: string, input: AttributeInput & { slug: string }) {
    return prisma.$transaction(async (tx) => {
      await tx.categoryAttribute.deleteMany({ where: { attributeId: id } })
      const existingIds = input.options.flatMap((option) => (option.id ? [option.id] : []))
      await tx.attributeOption.updateMany({
        where: { attributeId: id, id: { notIn: existingIds } },
        data: { active: false }
      })
      for (const option of input.options) {
        const data = {
          value: option.value,
          label: option.label,
          sortOrder: option.sortOrder,
          active: option.active
        }
        if (option.id) {
          const updated = await tx.attributeOption.updateMany({
            where: { id: option.id, attributeId: id },
            data
          })
          if (updated.count !== 1)
            throw apiError(422, 'ATTRIBUTE_OPTION_MISMATCH', 'Una opción no pertenece al atributo.')
        } else await tx.attributeOption.create({ data: { ...data, attributeId: id } })
      }
      return tx.attribute.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          type: input.type,
          unit: input.unit || null,
          filterable: input.filterable,
          variant: input.variant,
          active: input.active,
          sortOrder: input.sortOrder,
          categories: {
            create: input.categories.map((item) => ({
              categoryId: item.categoryId,
              required: item.required,
              sortOrder: item.sortOrder
            }))
          }
        },
        include: { options: true, categories: true }
      })
    })
  }
}

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  attributeValues: { include: { attribute: true, options: { include: { option: true } } } },
  variants: {
    where: { deletedAt: null },
    include: {
      attributeValues: { include: { option: { include: { attribute: true } } } },
      inventoryStocks: true
    }
  },
  supplierProducts: { include: { supplier: { select: { id: true, name: true, supplierCode: true } } } },
  inventoryStocks: { include: { location: true } }
} as const

async function createVariant(
  tx: Prisma.TransactionClient,
  productId: string,
  variant: ProductInput['variants'][number]
) {
  const options = await tx.attributeOption.findMany({
    where: { id: { in: variant.optionIds }, active: true },
    include: { attribute: true }
  })
  if (
    options.length !== new Set(variant.optionIds).size ||
    new Set(options.map((option) => option.attributeId)).size !== options.length
  ) {
    throw apiError(
      422,
      'INVALID_VARIANT_OPTIONS',
      'Las opciones de la variante son inválidas o repiten un atributo.'
    )
  }
  const combinationKey = options
    .map((option) => option.id)
    .sort()
    .join(':')
  const data = {
    name:
      variant.name ||
      options
        .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder)
        .map((option) => option.label)
        .join(' / '),
    priceOverride: variant.priceOverride || null,
    active: variant.active,
    combinationKey
  }
  const existing = variant.id
    ? await tx.productVariant.findUnique({
        where: { productId_id: { productId, id: variant.id } },
        select: { id: true }
      })
    : await tx.productVariant.findUnique({
        where: { productId_combinationKey: { productId, combinationKey } },
        select: { id: true }
      })
  if (variant.id && !existing) {
    throw apiError(422, 'VARIANT_PRODUCT_MISMATCH', 'La variante no pertenece al producto.')
  }
  if (existing) {
    await tx.variantAttributeValue.deleteMany({ where: { variantId: existing.id } })
    return tx.productVariant.update({
      where: { productId_id: { productId, id: existing.id } },
      data: {
        ...data,
        deletedAt: null,
        attributeValues: {
          create: options.map((option) => ({ attributeId: option.attributeId, optionId: option.id }))
        }
      }
    })
  }
  const variantCode = await nextCommercialCode(tx, 'variant')
  return tx.productVariant.create({
    data: {
      ...data,
      productId,
      variantCode,
      sku: `SKU-${variantCode}`,
      attributeValues: {
        create: options.map((option) => ({ attributeId: option.attributeId, optionId: option.id }))
      }
    }
  })
}

function productCore(input: ProductInput, slug: string) {
  return {
    barcode: input.barcode || null,
    name: input.name,
    slug,
    shortDescription: input.shortDescription || null,
    description: input.description || null,
    productType: input.productType,
    priceMode: input.priceMode,
    price: input.priceMode === 'CONTACT' ? null : input.price,
    priceIncludesTax: input.priceIncludesTax,
    taxRate: input.taxRate || null,
    brandId: input.brandId || null,
    categoryId: input.categoryId,
    manageStock: input.productType === 'DIGITAL' ? false : input.manageStock,
    active: input.active,
    featured: input.featured,
    warranty: input.warranty || null,
    weight: input.productType === 'DIGITAL' ? null : input.weight || null,
    metaTitle: input.metaTitle || null,
    metaDescription: input.metaDescription || null
  }
}

export const productRepository = {
  taxSettings() {
    return prisma.setting.findMany({
      where: { key: { in: ['tax.defaultRate', 'tax.pricesIncludeTaxDefault'] } },
      select: { key: true, value: true }
    })
  },
  categoryDefinition(categoryId: string) {
    return prisma.category.findFirst({
      where: { id: categoryId, active: true, deletedAt: null },
      include: {
        attributes: {
          where: { attribute: { active: true } },
          include: { attribute: { include: { options: { where: { active: true } } } } }
        }
      }
    })
  },
  async hasSkuConflict(skus: string[], productId?: string) {
    const [product, variant] = await Promise.all([
      prisma.product.findFirst({
        where: { sku: { in: skus }, ...(productId ? { id: { not: productId } } : {}) },
        select: { id: true }
      }),
      prisma.productVariant.findFirst({
        where: { sku: { in: skus }, ...(productId ? { productId: { not: productId } } : {}) },
        select: { id: true }
      })
    ])
    return Boolean(product || variant)
  },
  async variantsBelongToProduct(productId: string, variantIds: string[]) {
    if (variantIds.length === 0) return true
    const count = await prisma.productVariant.count({
      where: { id: { in: variantIds }, productId, deletedAt: null }
    })
    return count === new Set(variantIds).size
  },
  async suppliersAreActive(supplierIds: string[]) {
    if (supplierIds.length === 0) return true
    const uniqueIds = [...new Set(supplierIds)]
    return (await supplierRepository.countActive(uniqueIds)) === uniqueIds.length
  },
  async supplierRelationsBelongToProduct(productId: string, relationIds: string[]) {
    if (relationIds.length === 0) return true
    const uniqueIds = [...new Set(relationIds)]
    const count = await prisma.supplierProduct.count({
      where: { id: { in: uniqueIds }, productId }
    })
    return count === uniqueIds.length
  },
  async list(input: ProductPageInput) {
    const stockFilter =
      input.stock === 'with'
        ? { some: { quantityOnHand: { gt: 0 } } }
        : input.stock === 'without'
          ? { none: { quantityOnHand: { gt: 0 } } }
          : undefined
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(input.search
        ? {
            OR: [
              { productCode: { contains: input.search, mode: 'insensitive' } },
              { barcode: { contains: input.search, mode: 'insensitive' } },
              { sku: { contains: input.search, mode: 'insensitive' } },
              { name: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(input.active ? { active: input.active === 'true' } : {}),
      ...(input.featured ? { featured: input.featured === 'true' } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.supplierId
        ? { supplierProducts: { some: { supplierId: input.supplierId, active: true } } }
        : {}),
      ...(input.priceMode ? { priceMode: input.priceMode } : {}),
      ...(stockFilter ? { inventoryStocks: stockFilter } : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        ...pagination(input),
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          inventoryStocks: { select: { quantityOnHand: true, quantityReserved: true } },
          supplierProducts: { where: { active: true }, select: { supplierStock: true } }
        }
      }),
      prisma.product.count({ where })
    ])
    return pageResult(
      items.map((item) => ({
        ...item,
        ownStock: item.inventoryStocks.reduce(
          (sum, stock) => sum + stock.quantityOnHand - stock.quantityReserved,
          0
        ),
        supplierStock: item.supplierProducts.reduce((sum, supplier) => sum + supplier.supplierStock, 0)
      })),
      total,
      input
    )
  },
  find(id: string) {
    return prisma.product.findFirst({ where: { id, deletedAt: null }, include: productInclude })
  },
  async create(input: ProductInput, slug: string) {
    return prisma.$transaction(async (tx) => {
      const productCode = await nextCommercialCode(tx, 'product')
      const product = await tx.product.create({
        data: {
          ...productCore(input, slug),
          productCode,
          sku: `SKU-${productCode}`,
          images: { create: input.images },
          attributeValues: {
            create: input.attributeValues.map((value) => ({
              attributeId: value.attributeId,
              textValue: value.textValue || null,
              numberValue: value.numberValue || null,
              booleanValue: value.booleanValue,
              options: {
                create: value.optionIds.map((optionId) => ({
                  attributeId: value.attributeId,
                  optionId
                }))
              }
            }))
          }
        }
      })
      for (const variant of input.variants) await createVariant(tx, product.id, variant)
      for (const supplier of input.supplierProducts.filter((item) => !item.variantId)) {
        await tx.supplierProduct.create({
          data: {
            supplierId: supplier.supplierId,
            productId: product.id,
            supplierSku: supplier.supplierSku || null,
            supplierCost: supplier.supplierCost || null,
            supplierStock: supplier.supplierStock,
            supplierUrl: supplier.supplierUrl || null,
            leadTimeDays: supplier.leadTimeDays,
            active: supplier.active,
            lastCheckedAt: new Date()
          }
        })
      }
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude })
    })
  },
  async update(id: string, input: ProductInput, slug: string) {
    return prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.productAttributeValue.deleteMany({ where: { productId: id } })
      const retainedIds = input.variants.flatMap((variant) => (variant.id ? [variant.id] : []))
      await tx.productVariant.updateMany({
        where: { productId: id, id: { notIn: retainedIds } },
        data: { active: false, deletedAt: new Date() }
      })
      await tx.product.update({
        where: { id },
        data: {
          ...productCore(input, slug),
          images: { create: input.images },
          slug: undefined,
          attributeValues: {
            create: input.attributeValues.map((value) => ({
              attributeId: value.attributeId,
              textValue: value.textValue || null,
              numberValue: value.numberValue || null,
              booleanValue: value.booleanValue,
              options: {
                create: value.optionIds.map((optionId) => ({
                  attributeId: value.attributeId,
                  optionId
                }))
              }
            }))
          }
        }
      })
      for (const variant of input.variants) await createVariant(tx, id, variant)
      const retainedSupplierIds = input.supplierProducts.flatMap((item) => (item.id ? [item.id] : []))
      await tx.supplierProduct.updateMany({
        where: { productId: id, id: { notIn: retainedSupplierIds } },
        data: { active: false }
      })
      for (const supplier of input.supplierProducts) {
        const data = {
          supplierId: supplier.supplierId,
          productId: id,
          variantId: supplier.variantId || null,
          supplierSku: supplier.supplierSku || null,
          supplierCost: supplier.supplierCost || null,
          supplierStock: supplier.supplierStock,
          supplierUrl: supplier.supplierUrl || null,
          leadTimeDays: supplier.leadTimeDays,
          active: supplier.active,
          lastCheckedAt: new Date()
        }
        if (supplier.id) await tx.supplierProduct.update({ where: { id: supplier.id }, data })
        else await tx.supplierProduct.create({ data })
      }
      return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude })
    })
  },
  softDelete(id: string) {
    return prisma.product.update({ where: { id }, data: { active: false, deletedAt: new Date() } })
  }
}
