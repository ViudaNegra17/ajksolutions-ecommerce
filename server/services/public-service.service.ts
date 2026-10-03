import type { Prisma, Service } from '@prisma/client'
import type { PublicServiceCard, PublicServiceDetail } from '#shared/types/services'
import { serviceRepository } from '../repositories/service.repository'
import { apiError } from '../utils/api-error'
import { calculateProductPrice } from './price.service'

type PublicRow = Awaited<ReturnType<typeof serviceRepository.publicList>>[number]

function settingMap(rows: Array<{ key: string; value: Prisma.JsonValue }>) {
  return Object.fromEntries(rows.map((item) => [item.key, item.value]))
}

function modalities(service: Pick<Service, 'remoteAvailable' | 'onsiteAvailable' | 'homeServiceAvailable'>) {
  return [
    service.remoteAvailable ? 'Remoto' : null,
    service.onsiteAvailable ? 'En taller' : null,
    service.homeServiceAvailable ? 'A domicilio' : null
  ].filter((value): value is string => Boolean(value))
}

function card(row: PublicRow, settings: Record<string, Prisma.JsonValue>): PublicServiceCard {
  const currency = String(settings.currency || 'USD')
  const defaultRate = String(settings['tax.defaultRate'] || '0')
  const amount =
    row.priceMode === 'QUOTE' || !row.price
      ? null
      : calculateProductPrice({
          price: row.price,
          taxRate: row.taxRate ?? defaultRate,
          priceIncludesTax: row.priceIncludesTax
        }).total.toFixed(2)
  return {
    code: row.serviceCode,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    image: row.imageUrl,
    category: row.category,
    price: { mode: row.priceMode, amount, currency, includesTax: row.priceIncludesTax },
    modalities: modalities(row),
    estimatedDuration: row.estimatedDuration,
    featured: row.featured
  }
}

export const publicServiceService = {
  async list(input: { search?: string; category?: string; featured?: boolean } = {}) {
    const [items, categories, settingsRows] = await Promise.all([
      serviceRepository.publicList(input),
      serviceRepository.publicCategories(),
      serviceRepository.settings(['currency', 'tax.defaultRate'])
    ])
    const settings = settingMap(settingsRows)
    return { items: items.map((item) => card(item, settings)), categories }
  },
  async get(slug: string): Promise<PublicServiceDetail> {
    const [row, settingsRows] = await Promise.all([
      serviceRepository.findPublicBySlug(slug),
      serviceRepository.settings(['currency', 'tax.defaultRate'])
    ])
    if (!row) throw apiError(404, 'SERVICE_NOT_FOUND', 'El servicio no existe o no está publicado.')
    const base = card(row as PublicRow, settingMap(settingsRows))
    return {
      ...base,
      description: row.description,
      warranty: row.warranty,
      requiresDevice: row.requiresDevice,
      allowAttachments: row.allowAttachments,
      formFields: row.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        type: field.type,
        required: field.required,
        validationConfig: field.validationConfig as Record<string, number> | null,
        options: field.options.map((option) => ({ id: option.id, value: option.value, label: option.label }))
      })),
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription
    }
  },
  async homeFeatured() {
    const [items, settingsRows] = await Promise.all([
      serviceRepository.publicList({ featured: true, limit: 3 }),
      serviceRepository.settings(['currency', 'tax.defaultRate'])
    ])
    return items.map((item) => card(item, settingMap(settingsRows)))
  },
  sitemap: serviceRepository.sitemap
}
