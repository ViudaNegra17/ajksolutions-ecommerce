import 'dotenv/config'
import { describe, expect, it } from 'vitest'
import { bannerSchema } from '#shared/schemas/banner.schema'
import { promotionSchema } from '#shared/schemas/promotion.schema'
import {
  dashboardRange,
  isScheduleActive,
  orderMetricPolicy,
  ownStockAvailable
} from '../../server/services/operations.service'

describe('Fase 7: políticas operativas', () => {
  it('calcula 30 días desde medianoche en la zona operativa', () => {
    const range = dashboardRange('30d', new Date('2026-09-04T15:00:00.000Z'), 'America/Guayaquil')
    expect(range.from.toISOString()).toBe('2026-08-06T05:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-09-04T15:00:00.000Z')
  })

  it('excluye CANCELLED y diferencia valor, confirmado y entregado', () => {
    expect(orderMetricPolicy('NEW')).toEqual({
      orderValue: true,
      confirmedValue: false,
      deliveredValue: false
    })
    expect(orderMetricPolicy('CONFIRMED').confirmedValue).toBe(true)
    expect(orderMetricPolicy('DELIVERED')).toEqual({
      orderValue: true,
      confirmedValue: true,
      deliveredValue: true
    })
    expect(orderMetricPolicy('CANCELLED')).toEqual({
      orderValue: false,
      confirmedValue: false,
      deliveredValue: false
    })
  })

  it('calcula stock propio disponible y excluye DIGITAL', () => {
    expect(ownStockAvailable({ productType: 'PHYSICAL', quantityOnHand: 5, quantityReserved: 3 })).toBe(2)
    expect(ownStockAvailable({ productType: 'DIGITAL', quantityOnHand: 0, quantityReserved: 0 })).toBeNull()
  })

  it('aplica scheduling a contenido activo', () => {
    const now = new Date('2026-09-04T12:00:00Z')
    expect(isScheduleActive({ active: true, deletedAt: null, startsAt: null, endsAt: null }, now)).toBe(true)
    expect(isScheduleActive({ active: false, deletedAt: null, startsAt: null, endsAt: null }, now)).toBe(
      false
    )
    expect(
      isScheduleActive({ active: true, deletedAt: null, startsAt: new Date('2026-09-05'), endsAt: null }, now)
    ).toBe(false)
    expect(
      isScheduleActive({ active: true, deletedAt: null, startsAt: null, endsAt: new Date('2026-09-03') }, now)
    ).toBe(false)
    expect(isScheduleActive({ active: true, deletedAt: now, startsAt: null, endsAt: null }, now)).toBe(false)
  })

  it('rechaza fechas invertidas y URLs peligrosas', () => {
    expect(
      bannerSchema.safeParse({
        title: 'Banner',
        imageUrl: 'https://example.com/banner.jpg',
        placement: 'HOME_HERO',
        ctaLabel: 'Abrir',
        ctaUrl: 'javascript:alert(1)',
        startsAt: '2026-09-05',
        endsAt: '2026-09-04'
      }).success
    ).toBe(false)
    expect(
      promotionSchema.safeParse({
        name: 'Oferta',
        badge: 'Oferta',
        startsAt: '2026-09-05',
        endsAt: '2026-09-04'
      }).success
    ).toBe(false)
  })
})
