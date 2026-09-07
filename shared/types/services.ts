import type { ServiceFormFieldType, ServicePriceMode, TicketPriority, TicketStatus } from '@prisma/client'

export type PublicServiceOption = { id: string; value: string; label: string }
export type PublicServiceField = {
  id: string
  key: string
  label: string
  description: string | null
  placeholder: string | null
  type: ServiceFormFieldType
  required: boolean
  validationConfig: Record<string, number> | null
  options: PublicServiceOption[]
}
export type PublicServiceCard = {
  code: string
  name: string
  slug: string
  shortDescription: string | null
  image: string | null
  category: { name: string; slug: string }
  price: { mode: ServicePriceMode; amount: string | null; currency: string; includesTax: boolean }
  modalities: string[]
  estimatedDuration: string | null
  featured: boolean
}
export type PublicServiceDetail = PublicServiceCard & {
  description: string | null
  warranty: string | null
  requiresDevice: boolean
  allowAttachments: boolean
  formFields: PublicServiceField[]
  metaTitle: string | null
  metaDescription: string | null
}
export type PublicTicketResult = {
  ticketCode: string
  status: TicketStatus
  whatsappUrl: string
  handoffToken: string | null
}
export type AdminTicketSummary = {
  id: string
  ticketCode: string
  createdAt: string
  customer: string
  service: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  assignedTo: string | null
}
