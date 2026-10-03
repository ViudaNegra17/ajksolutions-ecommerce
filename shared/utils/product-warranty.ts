export const warrantyOptions = [
  { value: 'NONE', label: 'Sin garantía' },
  { value: '30_DAYS', label: '30 días' },
  { value: '90_DAYS', label: '90 días' },
  { value: '6_MONTHS', label: '6 meses' },
  { value: '12_MONTHS', label: '12 meses' },
  { value: 'CUSTOM', label: 'Personalizada' }
] as const
export type WarrantyChoice = (typeof warrantyOptions)[number]['value']

export function warrantyChoice(value: string | null | undefined): WarrantyChoice {
  if (!value?.trim()) return 'NONE'
  return (
    warrantyOptions.find((option) => option.value !== 'CUSTOM' && option.label === value.trim())?.value ??
    'CUSTOM'
  )
}

export function warrantyText(choice: WarrantyChoice, custom?: string | null): string | null {
  if (choice === 'NONE') return null
  if (choice === 'CUSTOM') return custom?.trim() || null
  return warrantyOptions.find((option) => option.value === choice)!.label
}
