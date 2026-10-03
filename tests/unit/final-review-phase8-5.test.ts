import { describe, expect, it, vi } from 'vitest'
import { productSchema } from '../../shared/schemas/product.schema'
import { warrantyChoice, warrantyText } from '../../shared/utils/product-warranty'
import { createWithUniqueSlug } from '../../server/utils/unique-slug'

const base = {
  name: 'Producto',
  categoryId: '11111111-1111-4111-8111-111111111111',
  priceMode: 'CONTACT',
  price: null
}
describe('Fase 8.5: validación comercial', () => {
  it('acepta barcode vacío/manual y rechaza más de 100 caracteres', () => {
    expect(productSchema.parse(base).barcode).toBeNull()
    expect(productSchema.parse({ ...base, barcode: '  000123  ' }).barcode).toBe('000123')
    expect(productSchema.safeParse({ ...base, barcode: 'A'.repeat(101) }).success).toBe(false)
  })
  it('normaliza garantía estándar, limpia personalizada y conserva legacy', () => {
    expect(warrantyChoice('Garantía del fabricante')).toBe('CUSTOM')
    expect(warrantyChoice('12 meses')).toBe('12_MONTHS')
    expect(warrantyChoice(null)).toBe('NONE')
    expect(warrantyText('CUSTOM', '  Garantía del fabricante  ')).toBe('Garantía del fabricante')
    expect(
      productSchema.parse({ ...base, warrantyChoice: '12_MONTHS', warrantyCustom: 'Texto anterior' }).warranty
    ).toBe('12 meses')
    expect(productSchema.parse({ ...base, warrantyChoice: 'NONE', warranty: 'Anterior' }).warranty).toBeNull()
    expect(productSchema.parse({ ...base, warranty: 'Garantía legacy' }).warranty).toBe('Garantía legacy')
    expect(productSchema.safeParse({ ...base, warrantyChoice: 'CUSTOM', warrantyCustom: ' ' }).success).toBe(
      false
    )
  })
  it('valida kg y fuerza peso digital NULL ante un payload manipulado', () => {
    expect(productSchema.parse({ ...base, weight: 1.125 }).weight).toBe('1.125')
    expect(productSchema.safeParse({ ...base, weight: -1 }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, weight: '1.1234' }).success).toBe(false)
    expect(
      productSchema.parse({ ...base, productType: 'DIGITAL', manageStock: false, weight: 99 }).weight
    ).toBeNull()
  })
  it('reintenta solo colisiones de slug, nunca conflictos de barcode', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['slug'] } })
      .mockImplementation(async (slug: string) => slug)
    expect(await createWithUniqueSlug('Cámara', 180, create)).toBe('camara-2')
    const barcode = vi.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['barcode'] } })
    await expect(createWithUniqueSlug('Cámara', 180, barcode)).rejects.toMatchObject({ code: 'P2002' })
    expect(barcode).toHaveBeenCalledTimes(1)
  })
})
