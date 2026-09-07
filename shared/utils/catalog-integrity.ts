export function normalizeSku(value: string): string {
  return value.trim().toUpperCase()
}

export function variantBelongsToProduct(
  productId: string,
  variant: { productId: string } | null | undefined
): boolean {
  return variant != null && variant.productId === productId
}

type AttributeValueShape = {
  textValue?: string | null
  numberValue?: string | null
  booleanValue?: boolean | null
  optionIds: string[]
}

export function isAttributeValueShapeValid(
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT',
  value: AttributeValueShape
): boolean {
  const hasText = Boolean(value.textValue?.trim())
  const hasNumber = value.numberValue != null
  const hasBoolean = value.booleanValue != null
  const hasOptions = value.optionIds.length > 0
  if (type === 'TEXT') return !hasNumber && !hasBoolean && !hasOptions
  if (type === 'NUMBER') return !hasText && !hasBoolean && !hasOptions
  if (type === 'BOOLEAN') return !hasText && !hasNumber && !hasOptions
  if (type === 'SELECT') return !hasText && !hasNumber && !hasBoolean && value.optionIds.length <= 1
  return !hasText && !hasNumber && !hasBoolean
}
