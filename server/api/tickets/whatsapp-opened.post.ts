import { whatsappOpenedSchema } from '#shared/schemas/ticket.schema'
import { ticketService } from '../../services/ticket.service'
import { enforcePublicAbuseRateLimit } from '../../utils/public-abuse-rate-limit'

export default defineEventHandler(async (event) => {
  enforcePublicAbuseRateLimit(event, 'handoff')
  const { ticketCode, handoffToken } = await parseValidatedBody(event, whatsappOpenedSchema)
  await ticketService.markWhatsAppOpened(event, ticketCode, handoffToken)
  setResponseStatus(event, 204)
  return null
})
